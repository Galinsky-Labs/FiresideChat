import { normalizeTranscriptText } from "@/lib/transcription/transcript-qa";

/**
 * FC-P14: validation for public transcript correction requests and editor
 * decisions. A request is a proposal only; no anonymous input edits text.
 */
export class CorrectionError extends Error {
  constructor(public readonly code:
    | "INVALID_EPISODE" | "INVALID_TIMESTAMP" | "INVALID_TEXT" | "UNCHANGED_TEXT"
    | "INVALID_REASON" | "INVALID_EVIDENCE" | "SPAM" | "NO_SEGMENT" | "TOO_MANY_PENDING"
    | "INVALID_DECISION" | "STALE_REQUEST" | "SEGMENT_CHANGED") {
    super(code);
  }
}

const ID = /^[a-z0-9]{8,40}$/i;
export const MAX_PENDING_PER_EPISODE = 25;

/** Accepts "75", "1:15" or "1:01:15". */
export function parseTimestamp(value: unknown): number {
  if (typeof value !== "string" || !/^\d{1,2}(?::\d{1,2}){0,2}$/.test(value.trim()))
    throw new CorrectionError("INVALID_TIMESTAMP");
  const parts = value.trim().split(":").map(Number);
  if (parts.slice(1).some((n) => n >= 60)) throw new CorrectionError("INVALID_TIMESTAMP");
  const seconds = parts.reduce((total, n) => total * 60 + n, 0);
  if (parts.length === 1 && seconds >= 60 * 60 * 24) throw new CorrectionError("INVALID_TIMESTAMP");
  return seconds;
}

function text(value: unknown, min: number, max: number, code: CorrectionError["code"]): string {
  if (typeof value !== "string") throw new CorrectionError(code);
  const normalized = normalizeTranscriptText(value);
  if (normalized.length < min || normalized.length > max) throw new CorrectionError(code);
  return normalized;
}

function evidence(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 2048) throw new CorrectionError("INVALID_EVIDENCE");
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || !url.hostname.includes("."))
      throw new CorrectionError("INVALID_EVIDENCE");
    return url.toString();
  } catch {
    throw new CorrectionError("INVALID_EVIDENCE");
  }
}

export type CorrectionRequestInput = {
  episodeId: string;
  atSeconds: number;
  proposedText: string;
  reason: string;
  evidenceUrl: string | null;
};

export function parseCorrectionRequest(form: Record<string, string>): CorrectionRequestInput {
  // Honeypot field hidden from people; automated submitters tend to fill it.
  if (form.website) throw new CorrectionError("SPAM");
  if (!ID.test(form.episodeId ?? "")) throw new CorrectionError("INVALID_EPISODE");
  return {
    episodeId: form.episodeId,
    atSeconds: parseTimestamp(form.at),
    proposedText: text(form.proposedText, 1, 2000, "INVALID_TEXT"),
    reason: text(form.reason, 10, 1000, "INVALID_REASON"),
    evidenceUrl: evidence(form.evidenceUrl),
  };
}

/** The segment being corrected is the one whose time span contains the timestamp. */
export function segmentAt<T extends { startSeconds: number; endSeconds: number }>(segments: readonly T[], at: number): T | null {
  let best: T | null = null;
  for (const segment of segments) {
    if (segment.startSeconds <= at + 0.5 && at < Math.max(segment.endSeconds, segment.startSeconds + 1)) {
      if (!best || segment.startSeconds > best.startSeconds) best = segment;
    }
  }
  return best;
}

export type CorrectionDecision = {
  requestId: string;
  revision: number;
  decision: "ACCEPTED" | "REJECTED";
  note: string;
  /** Editors may refine the proposed wording before accepting. */
  finalText: string | null;
};

export function parseCorrectionDecision(form: Record<string, string>): CorrectionDecision {
  if (!ID.test(form.requestId ?? "")) throw new CorrectionError("INVALID_DECISION");
  const revision = Number(form.revision);
  if (!Number.isSafeInteger(revision) || revision < 0) throw new CorrectionError("INVALID_DECISION");
  if (form.decision !== "ACCEPTED" && form.decision !== "REJECTED") throw new CorrectionError("INVALID_DECISION");
  return {
    requestId: form.requestId,
    revision,
    decision: form.decision,
    note: text(form.note, 5, 1000, "INVALID_REASON"),
    finalText: form.finalText ? text(form.finalText, 1, 2000, "INVALID_TEXT") : null,
  };
}
