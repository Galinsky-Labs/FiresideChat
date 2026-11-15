import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes } from "node:crypto";
import {
  CorrectionError, parseCorrectionDecision, parseCorrectionRequest, parseTimestamp, segmentAt,
} from "../src/lib/transcript-corrections";

const base = { episodeId: "cmepisode0001", at: "12:34", proposedText: "We reached a quorum.", reason: "The audio clearly says quorum, not forum." };
const code = (fn: () => unknown, expected: string) =>
  assert.throws(fn, (e: unknown) => e instanceof CorrectionError && e.code === expected);

test("FC-P14 correction requests are validated and normalized", () => {
  assert.deepEqual(parseCorrectionRequest({ ...base, evidenceUrl: "https://house.gov/record" }), {
    episodeId: "cmepisode0001", atSeconds: 754, proposedText: "We reached a quorum.",
    reason: "The audio clearly says quorum, not forum.", evidenceUrl: "https://house.gov/record",
  });
  assert.equal(parseTimestamp("1:01:15"), 3675);
  assert.equal(parseTimestamp("75"), 75);
  code(() => parseTimestamp("1:75"), "INVALID_TIMESTAMP");
  code(() => parseCorrectionRequest({ ...base, at: "soon" }), "INVALID_TIMESTAMP");
  code(() => parseCorrectionRequest({ ...base, reason: "typo" }), "INVALID_REASON");
  code(() => parseCorrectionRequest({ ...base, proposedText: "  " }), "INVALID_TEXT");
  code(() => parseCorrectionRequest({ ...base, evidenceUrl: "javascript:alert(1)" }), "INVALID_EVIDENCE");
  code(() => parseCorrectionRequest({ ...base, evidenceUrl: "http://example.com" }), "INVALID_EVIDENCE");
  code(() => parseCorrectionRequest({ ...base, website: "http://spam" }), "SPAM");
  code(() => parseCorrectionRequest({ ...base, episodeId: "../../etc" }), "INVALID_EPISODE");
});

test("FC-P14 the corrected segment is the one containing the timestamp", () => {
  const segments = [{ id: "a", startSeconds: 0, endSeconds: 5 }, { id: "b", startSeconds: 5, endSeconds: 9 }, { id: "c", startSeconds: 20, endSeconds: 25 }];
  assert.equal(segmentAt(segments, 6)?.id, "b");
  assert.equal(segmentAt(segments, 5)?.id, "b");
  assert.equal(segmentAt(segments, 12), null);
});

test("FC-P14 editor decisions require a note, a revision and an explicit verdict", () => {
  assert.deepEqual(parseCorrectionDecision({ requestId: "cmrequest0001", revision: "0", decision: "ACCEPTED", note: "Checked audio at 12:34." }),
    { requestId: "cmrequest0001", revision: 0, decision: "ACCEPTED", note: "Checked audio at 12:34.", finalText: null });
  code(() => parseCorrectionDecision({ requestId: "cmrequest0001", revision: "0", decision: "APPLY", note: "Checked audio." }), "INVALID_DECISION");
  code(() => parseCorrectionDecision({ requestId: "cmrequest0001", revision: "-1", decision: "REJECTED", note: "Checked audio." }), "INVALID_DECISION");
  code(() => parseCorrectionDecision({ requestId: "cmrequest0001", revision: "0", decision: "REJECTED", note: "" }), "INVALID_REASON");
});

test("FC-P14 the public route never edits text and the admin route is protected", async () => {
  const fs = await import("node:fs/promises");
  const [pub, admin] = await Promise.all([
    fs.readFile("src/app/api/transcript-corrections/route.ts", "utf8"),
    fs.readFile("src/app/api/admin/corrections/route.ts", "utf8"),
  ]);
  assert.match(pub, /submitCorrectionRequest/);
  assert.doesNotMatch(pub, /decideCorrectionRequest|transcriptSegment/);
  assert.match(pub, /Invalid request origin/);
  assert.match(admin, /export async function POST\(request: NextRequest\) \{\n\s+if \(!\(await isAdminAuthenticated\(\)\)\)/);
});

const disposableCI = process.env.GITHUB_ACTIONS === "true" &&
  /^postgresql:\/\/postgres:postgres@localhost:5432\/fireside_chat\?schema=public$/.test(process.env.DATABASE_URL ?? "");

test("FC-P14 request -> editor accept writes text and an immutable revision; stale requests cannot overwrite", { skip: !disposableCI }, async () => {
  const { db } = await import("../src/lib/db");
  const { submitCorrectionRequest, decideCorrectionRequest } = await import("../src/lib/transcript-corrections-store");
  const tag = randomBytes(5).toString("hex");
  const podcast = await db.podcast.create({ data: { slug: "ci-corr-" + tag, title: "CI corrections", rssUrl: `https://example.org/corr-${tag}.xml` } });
  try {
    const episode = await db.episode.create({ data: { podcastId: podcast.id, guid: tag, title: "CI", publishedAt: new Date(), audioUrl: "https://example.org/a.mp3" } });
    const transcript = await db.transcript.create({ data: { episodeId: episode.id, source: "PUBLISHER", fullText: "Opening. We reached a forum. Closing." } });
    await db.transcriptSegment.createMany({ data: [
      { transcriptId: transcript.id, startSeconds: 0, endSeconds: 750, text: "Opening." },
      { transcriptId: transcript.id, startSeconds: 750, endSeconds: 760, text: "We reached a forum." },
    ] });
    const form = { episodeId: episode.id, at: "12:34", proposedText: "We reached a quorum.", reason: "Audio says quorum, not forum." };
    const first = await submitCorrectionRequest(form);
    const second = await submitCorrectionRequest({ ...form, proposedText: "We reached a forum today." });
    // Submitting changed nothing.
    assert.equal((await db.transcriptSegment.findFirstOrThrow({ where: { transcriptId: transcript.id, startSeconds: 750 } })).text, "We reached a forum.");

    const decision = { requestId: first, revision: "0", decision: "ACCEPTED", note: "Verified against audio." };
    await decideCorrectionRequest(decision, "ci-editor");
    const seg = await db.transcriptSegment.findFirstOrThrow({ where: { transcriptId: transcript.id, startSeconds: 750 } });
    assert.equal(seg.text, "We reached a quorum.");
    assert.equal((await db.transcript.findUniqueOrThrow({ where: { id: transcript.id } })).fullText, "Opening. We reached a quorum. Closing.");
    const revisions = await db.transcriptRevision.findMany({ where: { transcriptId: transcript.id } });
    assert.equal(revisions.length, 1);
    assert.deepEqual([revisions[0].previousText, revisions[0].newText, revisions[0].actorRef], ["We reached a forum.", "We reached a quorum.", "ci-editor"]);

    // Replaying the same decision is refused (revision CAS).
    await assert.rejects(() => decideCorrectionRequest(decision, "ci-editor"), (e: unknown) => e instanceof CorrectionError && e.code === "STALE_REQUEST");
    // The second request was made against older text: accepting it must not silently overwrite.
    await assert.rejects(() => decideCorrectionRequest({ requestId: second, revision: "0", decision: "ACCEPTED", note: "Trying stale one." }, "ci-editor"),
      (e: unknown) => e instanceof CorrectionError && e.code === "SEGMENT_CHANGED");
    assert.equal((await db.transcriptCorrectionRequest.findUniqueOrThrow({ where: { id: second } })).status, "PENDING");
    await decideCorrectionRequest({ requestId: second, revision: "0", decision: "REJECTED", note: "Superseded by earlier fix." }, "ci-editor");
    assert.equal(await db.transcriptRevision.count({ where: { transcriptId: transcript.id } }), 1);
  } finally {
    await db.podcast.delete({ where: { id: podcast.id } });
  }
});
