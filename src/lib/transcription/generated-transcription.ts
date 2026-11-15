import { db } from "@/lib/db";
import { transcribeAudioWithOpenAI } from "./openai-transcription";
import { prepareTranscriptForStorage } from "./transcript-qa";

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
  const [dailyUsage, monthlyUsage] = await Promise.all([
    db.episode.aggregate({
      where: { transcriptionLastAttemptAt: { gte: startOfDay } },
      _sum: { durationSeconds: true },
    }),
    db.episode.aggregate({
      where: { transcriptionLastAttemptAt: { gte: startOfMonth } },
      _sum: { durationSeconds: true },
    }),
  ]);
  const dailyLimit = positiveInteger(process.env.TRANSCRIPTION_DAILY_MAX_MINUTES, 180) * 60;
  const monthlyLimit = positiveInteger(process.env.TRANSCRIPTION_MONTHLY_MAX_MINUTES, 1800) * 60;
  let budgetLeft = Math.max(0, Math.min(
    dailyLimit - (dailyUsage._sum.durationSeconds ?? 0),
    monthlyLimit - (monthlyUsage._sum.durationSeconds ?? 0),
  ));
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
    take: Math.min(100, Math.max(limit * 5, limit)),
  });
  const episodes = candidates.filter((episode) => {
    const estimatedSeconds = episode.durationSeconds && episode.durationSeconds > 0
      ? episode.durationSeconds : 90 * 60;
    if (estimatedSeconds > budgetLeft) return false;
    budgetLeft -= estimatedSeconds;
    return true;
  }).slice(0, limit);

  const result: GeneratedTranscriptionRun = {
    enabled: true,
    selected: episodes.length,
    completed: 0,
    failed: 0,
    skipped: 0,
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

    // Claim with a compare-and-swap: multiple web workers must not pay to
    // transcribe the same audio simultaneously.
    const claim = await db.episode.updateMany({
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
    if (claim.count !== 1) {
      result.skipped += 1;
      continue;
    }

    try {
      const transcript = await transcribeAudioWithOpenAI({
        audioUrl: episode.audioUrl,
        audioMimeType: episode.audioMimeType,
        apiKey,
        model: process.env.TRANSCRIPTION_MODEL ?? "whisper-1",
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

      // FC-P14: generated text never carries speaker names and broken timing is dropped.
      const prepared = prepareTranscriptForStorage(transcript, "GENERATED", episode.durationSeconds);
      const row = await db.transcript.upsert({
        where: { episodeId: episode.id },
        create: {
          episodeId: episode.id,
          source: "GENERATED",
          language: transcript.language ?? "en",
          fullText: prepared.fullText,
        },
        update: {
          source: "GENERATED",
          language: transcript.language ?? "en",
          fullText: prepared.fullText,
        },
      });

      await db.transcriptSegment.deleteMany({
        where: { transcriptId: row.id },
      });
      if (prepared.segments.length > 0) {
        await db.transcriptSegment.createMany({
          data: prepared.segments.map((segment) => ({
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
