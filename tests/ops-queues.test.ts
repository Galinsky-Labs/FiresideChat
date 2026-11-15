import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes } from "node:crypto";
import { buildOpsQueues, OPS_QUEUE_ORDER, summarizeQueues, type OpsQueueCounts } from "../src/lib/ops-queues";
import { OpsActionError, opsIdempotencyKey, parseOpsAction } from "../src/lib/ops-actions";

const zero = Object.fromEntries(OPS_QUEUE_ORDER.map((k) => [k, 0])) as OpsQueueCounts;

test("FC-P17 every required queue is separate and classified", () => {
  const queues = buildOpsQueues({ ...zero, unreviewedHosts: 3, staleFeeds: 2, generatedBlocked: 40 }, "DISABLED_BY_OPERATOR");
  assert.equal(queues.length, 14);
  for (const key of ["unreviewedHosts", "unresolvedShowCandidates", "crawlErrors", "staleFeeds", "unverifiedShowMapping",
    "publisherTranscriptPending", "webTranscriptPending", "generatedBlocked", "transcriptFailures", "brokenSourceLinks", "missingPortraits"])
    assert.ok(queues.some((q) => q.key === key), key);
  const byKey = new Map(queues.map((q) => [q.key, q]));
  assert.equal(byKey.get("unreviewedHosts")?.severity, "action");
  assert.equal(byKey.get("staleFeeds")?.severity, "watch");
  assert.equal(byKey.get("crawlErrors")?.severity, "clear");
  assert.match(byKey.get("generatedBlocked")!.explanation, /DISABLED_BY_OPERATOR/);
  assert.deepEqual(summarizeQueues(queues), { actionNeeded: 3, watching: 42, clearQueues: 11 });
});

test("FC-P17 operator actions validate input and derive deterministic idempotency keys", () => {
  const nonce = "a".repeat(32);
  assert.deepEqual(parseOpsAction({ action: "requeue-web-discovery", podcastId: "cm1234567890", nonce }),
    { action: "requeue-web-discovery", podcastId: "cm1234567890", nonce });
  for (const bad of [{ action: "drop-table", podcastId: "cm1234567890", nonce },
    { action: "clear-feed-backoff", podcastId: "x'; --", nonce },
    { action: "clear-feed-backoff", podcastId: "cm1234567890", nonce: "short" }])
    assert.throws(() => parseOpsAction(bad), OpsActionError);
  assert.equal(opsIdempotencyKey("clear-feed-backoff", "p1", nonce), opsIdempotencyKey("clear-feed-backoff", "p1", nonce));
  assert.notEqual(opsIdempotencyKey("clear-feed-backoff", "p1", nonce), opsIdempotencyKey("requeue-web-discovery", "p1", nonce));
});

test("FC-P17 queue API and page refuse anonymous visitors", async () => {
  const source = await import("node:fs/promises").then((fs) => Promise.all([
    fs.readFile("src/app/api/admin/queues/route.ts", "utf8"),
    fs.readFile("src/app/admin/queues/page.tsx", "utf8"),
  ]));
  assert.match(source[0], /export async function GET\(\) \{\n\s+if \(!\(await isAdminAuthenticated\(\)\)\)/);
  assert.match(source[0], /export async function POST\(request: NextRequest\) \{\n\s+if \(!\(await isAdminAuthenticated\(\)\)\)/);
  assert.match(source[0], /Invalid request origin/);
  assert.match(source[1], /if \(!\(await isAdminAuthenticated\(\)\)\) redirect\("\/admin\/login"\)/);
});

const disposableCI = process.env.GITHUB_ACTIONS === "true" &&
  /^postgresql:\/\/postgres:postgres@localhost:5432\/fireside_chat\?schema=public$/.test(process.env.DATABASE_URL ?? "");

test("FC-P17 a double-submitted retry applies once and is audited", { skip: !disposableCI }, async () => {
  const { db } = await import("../src/lib/db");
  const { applyOpsAction } = await import("../src/lib/ops-actions");
  const tag = randomBytes(5).toString("hex");
  const podcast = await db.podcast.create({ data: { slug: "ci-ops-" + tag, title: "CI ops", rssUrl: `https://example.org/ops-${tag}.xml` } });
  try {
    await db.episode.createMany({ data: [1, 2].map((n) => ({
      podcastId: podcast.id, guid: tag + n, title: "e" + n, publishedAt: new Date(), audioUrl: "https://example.org/a.mp3",
      episodeUrl: "https://example.org/e" + n, transcriptDiscoveryAttempts: 3, transcriptDiscoveryLastError: "NO_TRANSCRIPT_FOUND",
    })) });
    const form = { action: "requeue-web-discovery", podcastId: podcast.id, nonce: randomBytes(16).toString("hex") };
    const [first, second] = await Promise.all([applyOpsAction(form, "ci"), applyOpsAction(form, "ci")]);
    assert.deepEqual([first, second].sort(), [2, null].sort());
    assert.equal(await db.opsAction.count({ where: { targetId: podcast.id } }), 1);
    assert.equal(await db.episode.count({ where: { podcastId: podcast.id, transcriptDiscoveryAttempts: 0 } }), 2);
    assert.equal(await applyOpsAction(form, "ci"), null);
  } finally {
    await db.opsAction.deleteMany({ where: { targetId: podcast.id } });
    await db.podcast.delete({ where: { id: podcast.id } });
  }
});
