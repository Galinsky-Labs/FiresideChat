import { createHash } from "node:crypto";

/**
 * FC-P12: provider-independent chunk bookkeeping for speech-to-text.
 * Each audio chunk gets a deterministic idempotency key; a chunk already
 * recorded in the ledger is reused instead of being billed again.
 */
export type ChunkBoundary = { startSeconds: number; endSeconds: number };
export type RelativeSegment = { startSeconds: number; endSeconds: number; text: string };
export type ChunkTranscript = {
  text: string;
  language: string | null;
  /** Segment times relative to the chunk start. */
  segments: RelativeSegment[];
};
export type StoredChunk = ChunkBoundary & ChunkTranscript & { idempotencyKey: string };

export interface ChunkLedger {
  load(idempotencyKey: string): Promise<ChunkTranscript | null>;
  /** Persist immediately after a provider bills a chunk. */
  save(idempotencyKey: string, chunk: ChunkBoundary, result: ChunkTranscript): Promise<void>;
}

export function chunkIdempotencyKey(input: {
  episodeId: string;
  audioUrl: string;
  provider: string;
  model: string;
  chunk: ChunkBoundary;
}): string {
  const round = (n: number) => Math.round(n * 1000) / 1000;
  return createHash("sha256")
    .update(JSON.stringify([
      "fc-stt-chunk-v1", input.episodeId, input.audioUrl, input.provider, input.model,
      round(input.chunk.startSeconds), round(input.chunk.endSeconds),
    ]))
    .digest("hex");
}

/** Shift chunk-relative segments onto the episode timeline in chunk order. */
export function mergeChunkTranscripts(chunks: ReadonlyArray<ChunkBoundary & ChunkTranscript>) {
  const ordered = [...chunks].sort((a, b) => a.startSeconds - b.startSeconds);
  const segments: RelativeSegment[] = [];
  let language: string | null = null;
  for (const chunk of ordered) {
    language ??= chunk.language;
    for (const segment of chunk.segments) {
      segments.push({
        startSeconds: segment.startSeconds + chunk.startSeconds,
        endSeconds: Math.min(segment.endSeconds + chunk.startSeconds, chunk.endSeconds + 1),
        text: segment.text,
      });
    }
  }
  return {
    fullText: ordered.map((c) => c.text.trim()).filter(Boolean).join("\n\n"),
    language,
    segments,
  };
}

/**
 * Run every chunk through the provider at most once per idempotency key.
 * Returns which chunks were billed now versus reused from the ledger.
 */
export async function transcribeChunksIdempotently<C extends ChunkBoundary>(
  chunks: readonly C[],
  keyFor: (chunk: C) => string,
  ledger: ChunkLedger,
  bill: (chunk: C) => Promise<ChunkTranscript>,
) {
  const results: Array<ChunkBoundary & ChunkTranscript> = [];
  let billed = 0;
  let reused = 0;
  for (const chunk of chunks) {
    const key = keyFor(chunk);
    const existing = await ledger.load(key);
    if (existing) {
      reused += 1;
      results.push({ startSeconds: chunk.startSeconds, endSeconds: chunk.endSeconds, ...existing });
      continue;
    }
    const result = await bill(chunk);
    billed += 1;
    await ledger.save(key, { startSeconds: chunk.startSeconds, endSeconds: chunk.endSeconds }, result);
    results.push({ startSeconds: chunk.startSeconds, endSeconds: chunk.endSeconds, ...result });
  }
  return { transcript: mergeChunkTranscripts(results), billed, reused };
}

/** An in-memory ledger for tests and dry runs. */
export function memoryLedger(): ChunkLedger & { entries: Map<string, ChunkTranscript> } {
  const entries = new Map<string, ChunkTranscript>();
  return {
    entries,
    async load(key) { return entries.get(key) ?? null; },
    async save(key, _chunk, result) { if (!entries.has(key)) entries.set(key, result); },
  };
}
