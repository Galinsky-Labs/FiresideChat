import { readFile } from "node:fs/promises";
import { withTranscriptionChunks } from "./ffmpeg-audio";
import { chunkIdempotencyKey, memoryLedger, transcribeChunksIdempotently } from "./chunk-ledger";
import type { ChunkLedger, ChunkTranscript } from "./chunk-ledger";

const OPENAI_TRANSCRIPT_URL = "https://api.openai.com/v1/audio/transcriptions";
const DEFAULT_TIMEOUT_MS = 120_000;

export type GeneratedTranscript = {
  fullText: string;
  language: string | null;
  segments: Array<{
    startSeconds: number;
    endSeconds: number;
    text: string;
  }>;
};

type OpenAITranscriptResponse = {
  text?: unknown;
  language?: unknown;
  segments?: unknown;
};

function safeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function normalizeOpenAITranscript(
  payload: OpenAITranscriptResponse,
): GeneratedTranscript {
  const fullText =
    typeof payload.text === "string" ? payload.text.trim() : "";
  if (!fullText) {
    throw new Error("Transcription provider returned no text");
  }

  const segments = Array.isArray(payload.segments)
    ? payload.segments.flatMap((entry) => {
        if (!entry || typeof entry !== "object") return [];
        const record = entry as Record<string, unknown>;
        const startSeconds = safeNumber(record.start);
        const endSeconds = safeNumber(record.end);
        const text =
          typeof record.text === "string" ? record.text.trim() : "";

        if (
          startSeconds === null ||
          endSeconds === null ||
          endSeconds < startSeconds ||
          !text
        ) {
          return [];
        }

        return [{ startSeconds, endSeconds, text }];
      })
    : [];

  return {
    fullText,
    language:
      typeof payload.language === "string" && payload.language.trim()
        ? payload.language.trim()
        : null,
    segments,
  };
}

export const OPENAI_PROVIDER = "openai";

async function transcribeChunkWithOpenAI(path: string, options: {
  apiKey: string; model: string; timeoutMs?: number;
}): Promise<ChunkTranscript> {
  const source = await readFile(path);
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(source)], { type: "audio/mpeg" }), "podcast-segment.mp3");
  form.append("model", options.model);
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");
  const response = await fetch(OPENAI_TRANSCRIPT_URL, {
    method: "POST",
    headers: { Authorization: "Bearer " + options.apiKey },
    body: form,
    signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  });
  if (!response.ok) {
    const errorBody = (await response.text()).slice(0, 1_000);
    throw new Error("Transcription provider returned HTTP " + response.status + ": " + errorBody);
  }
  const parsed = normalizeOpenAITranscript(
    (await response.json()) as OpenAITranscriptResponse);
  return { text: parsed.fullText, language: parsed.language, segments: parsed.segments };
}

export async function transcribeAudioWithOpenAI(options: {
  audioUrl: string;
  audioMimeType: string | null;
  apiKey: string;
  model?: string;
  maxBytes?: number;
  timeoutMs?: number;
  userAgent?: string;
  /** FC-P12: reuse already-billed chunks after an interruption. */
  episodeId?: string;
  ledger?: ChunkLedger;
}): Promise<GeneratedTranscript> {
  const model = options.model ?? "whisper-1";
  const ledger = options.ledger ?? memoryLedger();
  // OpenAI's audio transcription endpoint has a 25 MiB upload ceiling.
  // Lossy 32kbps, mono, 15-minute chunks stay well below that limit,
  // even when the original episode is hundreds of megabytes.
  return withTranscriptionChunks(options.audioUrl, {
    maxBytes: options.maxBytes ?? 350 * 1024 * 1024,
  }, async (chunks) => {
    const { transcript } = await transcribeChunksIdempotently(
      chunks,
      (chunk) => chunkIdempotencyKey({
        episodeId: options.episodeId ?? "", audioUrl: options.audioUrl,
        provider: OPENAI_PROVIDER, model, chunk,
      }),
      ledger,
      (chunk) => transcribeChunkWithOpenAI(chunk.path, { apiKey: options.apiKey, model, timeoutMs: options.timeoutMs }),
    );
    return transcript;
  });
}
