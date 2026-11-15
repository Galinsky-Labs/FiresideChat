import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import type { ChunkLedger, ChunkTranscript } from "./chunk-ledger";
import { estimatedSeconds, type BudgetUsage } from "./budget";

type Tx = Prisma.TransactionClient;

/** Prisma-backed FC-P12 ledger: a billed chunk is written before moving on. */
export function prismaChunkLedger(episodeId: string, provider: string, model: string): ChunkLedger {
  return {
    async load(idempotencyKey) {
      const row = await db.transcriptionChunk.findUnique({ where: { idempotencyKey } });
      if (!row) return null;
      return { text: row.text, language: row.language, segments: row.segments as ChunkTranscript["segments"] };
    },
    async save(idempotencyKey, chunk, result) {
      try {
        await db.transcriptionChunk.create({
          data: {
            episodeId, idempotencyKey, provider, model,
            startSeconds: chunk.startSeconds,
            endSeconds: chunk.endSeconds,
            billedSeconds: Math.max(0, chunk.endSeconds - chunk.startSeconds),
            language: result.language,
            text: result.text,
            segments: result.segments as unknown as Prisma.InputJsonValue,
          },
        });
      } catch (error) {
        // A concurrent worker already recorded this exact chunk.
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
      }
    },
  };
}

export async function usageSince(client: Tx | typeof db, since: Date, staleBefore: Date): Promise<BudgetUsage> {
  const [attempted, billed, inFlight] = await Promise.all([
    client.episode.aggregate({
      where: { transcriptionLastAttemptAt: { gte: since } },
      _sum: { durationSeconds: true },
    }),
    client.transcriptionChunk.aggregate({
      where: { createdAt: { gte: since } },
      _sum: { billedSeconds: true },
    }),
    client.episode.findMany({
      where: {
        transcriptStatus: "PROCESSING",
        transcriptionLastAttemptAt: { gte: since > staleBefore ? since : staleBefore },
      },
      select: { durationSeconds: true },
    }),
  ]);
  return {
    attemptedSeconds: attempted._sum.durationSeconds ?? 0,
    billedSeconds: billed._sum.billedSeconds ?? 0,
    inFlightSeconds: inFlight.reduce((sum, e) => sum + estimatedSeconds(e.durationSeconds), 0),
  };
}

/** Serializes budget checks + claims across every web worker and CLI run. */
export const TRANSCRIPTION_BUDGET_LOCK = 7_314_002_026;
