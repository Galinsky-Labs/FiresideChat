import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes } from "node:crypto";
import {
  chunkIdempotencyKey, memoryLedger, mergeChunkTranscripts, transcribeChunksIdempotently,
} from "../src/lib/transcription/chunk-ledger";
import {
  effectiveUsageSeconds, estimatedSeconds, generatedTranscriptionState, remainingBudgetSeconds,
} from "../src/lib/transcription/budget";

const chunks = [0, 900, 1800, 2700].map((start) => ({ startSeconds: start, endSeconds: start + 900, path: `/tmp/c${start}.mp3` }));
const keyFor = (chunk: { startSeconds: number; endSeconds: number }) =>
  chunkIdempotencyKey({ episodeId: "ep1", audioUrl: "https://cdn.example/ep1.mp3", provider: "test", model: "m", chunk });

test("FC-P12 a long episode is split into provider-sized chunks and merged on the episode timeline", async () => {
  const ledger = memoryLedger();
  const { transcript, billed, reused } = await transcribeChunksIdempotently(chunks, keyFor, ledger, async (chunk) => ({
    text: `part ${chunk.startSeconds}`, language: "en",
    segments: [{ startSeconds: 1, endSeconds: 5, text: `part ${chunk.startSeconds}` }],
  }));
  assert.equal(billed, 4);
  assert.equal(reused, 0);
  assert.deepEqual(transcript.segments.map((s) => s.startSeconds), [1, 901, 1801, 2701]);
  assert.equal(transcript.fullText, "part 0\n\npart 900\n\npart 1800\n\npart 2700");
});

test("FC-P12 an interrupted job never bills an already-recorded chunk again", async () => {
  const ledger = memoryLedger();
  const billedStarts: number[] = [];
  const failing = async (chunk: { startSeconds: number }) => {
    if (chunk.startSeconds === 1800) throw new Error("worker restarted");
    billedStarts.push(chunk.startSeconds);
    return { text: "t" + chunk.startSeconds, language: "en", segments: [] };
  };
  await assert.rejects(() => transcribeChunksIdempotently(chunks, keyFor, ledger, failing), /worker restarted/);
  assert.equal(ledger.entries.size, 2);
  const resumed: number[] = [];
  const result = await transcribeChunksIdempotently(chunks, keyFor, ledger, async (chunk) => {
    resumed.push(chunk.startSeconds);
    return { text: "t" + chunk.startSeconds, language: "en", segments: [] };
  });
  assert.deepEqual(billedStarts, [0, 900]);
  assert.deepEqual(resumed, [1800, 2700]);
  assert.equal(result.reused, 2);
  assert.equal(result.billed, 2);
});

test("FC-P12 idempotency keys are deterministic and boundary-specific", () => {
  assert.equal(keyFor(chunks[0]), keyFor({ ...chunks[0] }));
  assert.notEqual(keyFor(chunks[0]), keyFor(chunks[1]));
  assert.notEqual(keyFor(chunks[0]), chunkIdempotencyKey({ episodeId: "ep1", audioUrl: "https://cdn.example/ep1.mp3", provider: "test", model: "other", chunk: chunks[0] }));
});

test("FC-P12 merged segments are clamped to their chunk", () => {
  const merged = mergeChunkTranscripts([
    { startSeconds: 900, endSeconds: 1800, text: "b", language: null, segments: [{ startSeconds: 880, endSeconds: 1000, text: "b" }] },
    { startSeconds: 0, endSeconds: 900, text: "a", language: "es", segments: [{ startSeconds: 0, endSeconds: 2, text: "a" }] },
  ]);
  assert.equal(merged.language, "es");
  assert.deepEqual(merged.segments, [
    { startSeconds: 0, endSeconds: 2, text: "a" },
    { startSeconds: 1780, endSeconds: 1801, text: "b" },
  ]);
});

test("FC-P12 inability to run or pay is an explicit state", () => {
  assert.equal(generatedTranscriptionState({ enabled: false, hasCredentials: true, remainingSeconds: 100 }), "DISABLED_BY_OPERATOR");
  assert.equal(generatedTranscriptionState({ enabled: true, hasCredentials: false, remainingSeconds: 100 }), "MISSING_CREDENTIALS");
  assert.equal(generatedTranscriptionState({ enabled: true, hasCredentials: true, remainingSeconds: 0 }), "BUDGET_EXHAUSTED");
  assert.equal(generatedTranscriptionState({ enabled: true, hasCredentials: true, remainingSeconds: 1 }), "READY");
});

test("FC-P13 budget uses the most conservative usage so retries cannot hide spend", () => {
  assert.equal(effectiveUsageSeconds({ attemptedSeconds: 600, billedSeconds: 900, inFlightSeconds: 300 }), 1200);
  assert.equal(effectiveUsageSeconds({ attemptedSeconds: 3000, billedSeconds: 900, inFlightSeconds: 0 }), 3000);
  const day = { attemptedSeconds: 0, billedSeconds: 10_000, inFlightSeconds: 0 };
  assert.equal(remainingBudgetSeconds({ dailyCapSeconds: 10_800, monthlyCapSeconds: 108_000, day, month: day }), 800);
  assert.equal(remainingBudgetSeconds({ dailyCapSeconds: 10_800, monthlyCapSeconds: 5_000, day, month: day }), 0);
  assert.equal(estimatedSeconds(null), 5400);
});

const disposableCI = process.env.GITHUB_ACTIONS === "true" &&
  /^postgresql:\/\/postgres:postgres@localhost:5432\/fireside_chat\?schema=public$/.test(process.env.DATABASE_URL ?? "");

test("FC-P12 Prisma chunk ledger records each billed chunk once and counts billed seconds", { skip: !disposableCI }, async () => {
  const { db } = await import("../src/lib/db");
  const { prismaChunkLedger, usageSince } = await import("../src/lib/transcription/stt-store");
  const tag = randomBytes(6).toString("hex");
  const podcast = await db.podcast.create({ data: { slug: "ci-stt-" + tag, title: "CI STT " + tag, rssUrl: "https://example.org/" + tag + ".xml" } });
  try {
    const episode = await db.episode.create({ data: { podcastId: podcast.id, guid: tag, title: "CI", publishedAt: new Date(), audioUrl: "https://example.org/a.mp3" } });
    const ledger = prismaChunkLedger(episode.id, "test", "m");
    const key = "ci-" + tag;
    const since = new Date(Date.now() - 1000);
    const before = await usageSince(db, since, since);
    await ledger.save(key, { startSeconds: 0, endSeconds: 900 }, { text: "x", language: "en", segments: [] });
    await ledger.save(key, { startSeconds: 0, endSeconds: 900 }, { text: "y", language: "en", segments: [] });
    assert.equal((await ledger.load(key))?.text, "x");
    const after = await usageSince(db, since, since);
    assert.equal(after.billedSeconds - before.billedSeconds, 900);
  } finally {
    await db.podcast.delete({ where: { id: podcast.id } });
  }
});
