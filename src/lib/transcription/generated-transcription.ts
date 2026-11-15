import { db } from "@/lib/db";
import { OPENAI_PROVIDER, transcribeAudioWithOpenAI } from "./openai-transcription";
import { estimatedSeconds, remainingBudgetSeconds } from "./budget";
import { orderEpisodesFairly } from "./backlog-plan";
import { prismaChunkLedger, TRANSCRIPTION_BUDGET_LOCK, usageSince } from "./stt-store";

const DEFAULT_LIMIT = 2;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MINUTES = 60;
const MAX_ERROR_LENGTH = 2_000;

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function envBoolean(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

function errorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.slice(0, MAX_ERROR_LENGTH);
}

export type GeneratedTranscriptionRun = {
  enabled: boolean;
  selected: number;
  completed: number;
  failed: number;
  skipped: number;
  /** Candidates left queued because the approved audio-minute cap is used up. */
  budgetBlocked: number;
};

export async function transcribeMissingEpisodes(options: {
  limit?: number;
  force?: boolean;
} = {}): Promise<GeneratedTranscriptionRun> {
  const enabled = options.force || envBoolean(process.env.TRANSCRIPTION_ENABLED);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!enabled || !apiKey) {
    return {
      enabled: false,
      selected: 0,
      completed: 0,
      failed: 0,
      skipped: 0,
      budgetBlocked: 0,
    };
  }

  const limit =
    options.limit ??
    positiveInteger(process.env.TRANSCRIPTION_MAX_EPISODES_PER_RUN, DEFAULT_LIMIT);
  const maxAttempts = positiveInteger(
    process.env.TRANSCRIPTION_MAX_ATTEMPTS,
    DEFAULT_MAX_ATTEMPTS,
  );
  const retryMinutes = positiveInteger(
    process.env.TRANSCRIPTION_RETRY_DELAY_MINUTES,
    DEFAULT_RETRY_DELAY_MINUTES,
  );
  const retryBefore = new Date(Date.now() - retryMinutes * 60_000);

  const externalMaxAttempts = positiveInteger(
    process.env.EXTERNAL_TRANSCRIPT_MAX_ATTEMPTS, 3);
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const startOfMonth = new Date(Date.UTC(
    startOfDay.getUTCFullYear(), startOfDay.getUTCMonth(), 1));
  const dailyLimit = positiveInteger(process.env.TRANSCRIPTION_DAILY_MAX_MINUTES, 180) * 60;
  const monthlyLimit = positiveInteger(process.env.TRANSCRIPTION_MONTHLY_MAX_MINUTES, 1800) * 60;
  const staleProcessing = new Date(Date.now() - 4 * 60 * 60 * 1000);
  const candidates = await db.episode.findMany({
    where: {
      podcast: { active: true },
      transcript: { is: null },
      transcriptionAttempts: { lt: maxAttempts },
      AND: [
        {
          OR: [
            { publisherTranscriptUrl: null },
            { publisherTranscriptAttempts: { gte: externalMaxAttempts } },
          ],
        },
        {
          OR: [
            { episodeUrl: null },
            { transcriptDiscoveryAttempts: { gte: externalMaxAttempts } },
          ],
        },
        {
          OR: [
            { transcriptStatus: { in: ["MISSING", "FAILED"] } },
            {
              transcriptStatus: "PROCESSING",
              transcriptionLastAttemptAt: { lte: staleProcessing },
            },
          ],
        },
        {
          OR: [
            { transcriptionLastAttemptAt: null },
            { transcriptionLastAttemptAt: { lte: retryBefore } },
          ],
        },
      ],
    },
    orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
    take: 300,
  });
  // FC-P13: freshness lane plus per-show round-robin over the historical backlog.
  const episodes = orderEpisodesFairly(candidates, new Date(),
    positiveInteger(process.env.TRANSCRIPTION_FRESHNESS_DAYS, 30));

  const result: GeneratedTranscriptionRun = {
    enabled: true,
    selected: episodes.length,
    completed: 0,
    failed: 0,
    skipped: 0,
    budgetBlocked: 0,
  };

  for (const selected of episodes) {
    const episode = await db.episode.findUnique({
      where: { id: selected.id },
      include: { transcript: true },
    });

    if (!episode || episode.transcript?.source === "PUBLISHER" || episode.transcript) {
      result.skipped += 1;
      continue;
    }

    if (result.completed + result.failed >= limit) break;

    // FC-P13: the budget check and the claim happen under one advisory lock, so
    // parallel workers and retries cannot jointly exceed the approved caps.
    // The claim itself is a compare-and-swap: multiple web workers must not pay
    // to transcribe the same audio simultaneously.
    const claimed = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${TRANSCRIPTION_BUDGET_LOCK})`;
      const [day, month] = await Promise.all([
        usageSince(tx, startOfDay, staleProcessing),
        usageSince(tx, startOfMonth, staleProcessing),
      ]);
      const remaining = remainingBudgetSeconds({
        dailyCapSeconds: dailyLimit, monthlyCapSeconds: monthlyLimit, day, month,
      });
      if (estimatedSeconds(episode.durationSeconds) > remaining) return "BUDGET" as const;
      const claim = await tx.episode.updateMany({
        where: {
          id: episode.id,
          transcriptionAttempts: selected.transcriptionAttempts,
          transcriptStatus: selected.transcriptStatus,
          transcript: { is: null },
        },
        data: {
          transcriptStatus: "PROCESSING",
          transcriptionAttempts: { increment: 1 },
          transcriptionLastAttemptAt: new Date(),
          transcriptionLastError: null,
        },
      });
      return claim.count === 1 ? "CLAIMED" as const : "LOST" as const;
    });
    if (claimed === "BUDGET") {
      result.budgetBlocked += 1;
      continue;
    }
    if (claimed === "LOST") {
      result.skipped += 1;
      continue;
    }

    try {
      const model = process.env.TRANSCRIPTION_MODEL ?? "whisper-1";
      const transcript = await transcribeAudioWithOpenAI({
        episodeId: episode.id,
        ledger: prismaChunkLedger(episode.id, OPENAI_PROVIDER, model),
        audioUrl: episode.audioUrl,
        audioMimeType: episode.audioMimeType,
        apiKey,
        model,
        maxBytes: positiveInteger(
          process.env.TRANSCRIPTION_MAX_AUDIO_BYTES,
          350 * 1024 * 1024,
        ),
        timeoutMs: positiveInteger(
          process.env.TRANSCRIPTION_TIMEOUT_MS,
          120_000,
        ),
      });

      const latest = await db.episode.findUnique({
        where: { id: episode.id },
        include: { transcript: true },
      });

      if (
        !latest ||
        latest.transcript?.source === "PUBLISHER"
      ) {
        if (latest) {
          await db.episode.update({
            where: { id: latest.id },
            data: {
              transcriptStatus: latest.transcript ? "COMPLETE" : "FAILED",
            },
          });
        }
        result.skipped += 1;
        continue;
      }

      const row = await db.transcript.upsert({
        where: { episodeId: episode.id },
        create: {
          episodeId: episode.id,
          source: "GENERATED",
          language: transcript.language ?? "en",
          fullText: transcript.fullText,
        },
        update: {
          source: "GENERATED",
          language: transcript.language ?? "en",
          fullText: transcript.fullText,
        },
      });

      await db.transcriptSegment.deleteMany({
        where: { transcriptId: row.id },
      });
      if (transcript.segments.length > 0) {
        await db.transcriptSegment.createMany({
          data: transcript.segments.map((segment) => ({
            transcriptId: row.id,
            startSeconds: segment.startSeconds,
            endSeconds: segment.endSeconds,
            text: segment.text,
          })),
        });
      }

      await db.episode.update({
        where: { id: episode.id },
        data: {
          transcriptStatus: "COMPLETE",
          transcriptionLastError: null,
        },
      });
      result.completed += 1;
    } catch (error) {
      await db.episode.update({
        where: { id: episode.id },
        data: {
          transcriptStatus: "FAILED",
          transcriptionLastError: errorMessage(error),
        },
      });
      result.failed += 1;
    }
  }

  return result;
}
