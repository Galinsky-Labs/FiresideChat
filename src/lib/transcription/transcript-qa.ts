/**
 * FC-P14: transcript integrity checks applied before any transcript is stored.
 * The goal is to keep officials' words exactly as the source published them,
 * while refusing structurally broken timing data and unsupported attributions.
 */
export type TimedSegment = { startSeconds: number; endSeconds: number; text: string };
export type TranscriptSourceKind = "PUBLISHER" | "GENERATED";
export type SegmentIssueCode =
  | "EMPTY_TEXT"
  | "NON_FINITE_TIME"
  | "NEGATIVE_TIME"
  | "END_BEFORE_START"
  | "OUT_OF_ORDER"
  | "OVERLAP"
  | "BEYOND_DURATION";
export type SegmentIssue = { index: number; code: SegmentIssueCode };
export type SegmentQaResult = {
  segments: TimedSegment[];
  issues: SegmentIssue[];
  dropped: number;
};

const OVERLAP_TOLERANCE_SECONDS = 0.5;
const DURATION_TOLERANCE_SECONDS = 30;

/**
 * Unicode-normalize and collapse whitespace without altering words, accents or
 * punctuation. Control characters (other than whitespace) are removed.
 */
export function normalizeTranscriptText(value: string): string {
  return value
    .normalize("NFC")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/[​⁠﻿]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Validate and repair timed segments. Invalid segments are dropped (never
 * invented), out-of-order segments are stably re-sorted, and small overlaps are
 * reported but kept because many publisher caption files overlap by design.
 */
export function validateSegments(
  input: readonly TimedSegment[],
  durationSeconds?: number | null,
): SegmentQaResult {
  const issues: SegmentIssue[] = [];
  const kept: Array<TimedSegment & { index: number }> = [];
  const limit = durationSeconds && durationSeconds > 0
    ? durationSeconds + DURATION_TOLERANCE_SECONDS
    : null;

  input.forEach((segment, index) => {
    const text = normalizeTranscriptText(segment.text ?? "");
    if (!text) { issues.push({ index, code: "EMPTY_TEXT" }); return; }
    if (!Number.isFinite(segment.startSeconds) || !Number.isFinite(segment.endSeconds)) {
      issues.push({ index, code: "NON_FINITE_TIME" }); return;
    }
    if (segment.startSeconds < 0 || segment.endSeconds < 0) {
      issues.push({ index, code: "NEGATIVE_TIME" }); return;
    }
    if (segment.endSeconds < segment.startSeconds) {
      issues.push({ index, code: "END_BEFORE_START" }); return;
    }
    if (limit !== null && segment.startSeconds > limit) {
      issues.push({ index, code: "BEYOND_DURATION" }); return;
    }
    kept.push({ index, startSeconds: segment.startSeconds, endSeconds: segment.endSeconds, text });
  });

  for (let i = 1; i < kept.length; i++) {
    if (kept[i].startSeconds < kept[i - 1].startSeconds) {
      issues.push({ index: kept[i].index, code: "OUT_OF_ORDER" });
    }
  }
  kept.sort((a, b) => a.startSeconds - b.startSeconds || a.index - b.index);
  for (let i = 1; i < kept.length; i++) {
    if (kept[i].startSeconds < kept[i - 1].endSeconds - OVERLAP_TOLERANCE_SECONDS) {
      issues.push({ index: kept[i].index, code: "OVERLAP" });
    }
  }

  return {
    segments: kept.map(({ startSeconds, endSeconds, text }) => ({ startSeconds, endSeconds, text })),
    issues,
    dropped: input.length - kept.length,
  };
}

/** Matches a leading "Name:" or "NAME NAME:" speaker label. */
const SPEAKER_LABEL = /^([A-Z][A-Za-z.'\- ]{1,48}):\s+/;

/**
 * Speaker names are kept only when the transcript source itself supplied them
 * (publisher transcripts). Generated transcripts must never attribute words to
 * a named person, so any leading label is stripped from generated text.
 */
export function enforceSpeakerEvidence(
  segments: readonly TimedSegment[],
  source: TranscriptSourceKind,
): { segments: TimedSegment[]; strippedLabels: number } {
  if (source === "PUBLISHER") return { segments: segments.map((s) => ({ ...s })), strippedLabels: 0 };
  let strippedLabels = 0;
  const cleaned = segments.map((segment) => {
    const match = segment.text.match(SPEAKER_LABEL);
    if (!match) return { ...segment };
    strippedLabels += 1;
    return { ...segment, text: segment.text.slice(match[0].length) };
  });
  return { segments: cleaned, strippedLabels };
}

const SOURCE_PRIORITY: Record<TranscriptSourceKind, number> = { PUBLISHER: 2, GENERATED: 1 };

/** A source-based transcript always outranks a generated one; never the reverse. */
export function mayReplaceTranscript(
  existing: TranscriptSourceKind | null | undefined,
  incoming: TranscriptSourceKind,
): boolean {
  if (!existing) return true;
  return SOURCE_PRIORITY[incoming] >= SOURCE_PRIORITY[existing];
}

export type PreparedTranscript = {
  fullText: string;
  segments: TimedSegment[];
  report: { issues: SegmentIssue[]; dropped: number; strippedLabels: number };
};

/**
 * Prepare a parsed transcript for storage. Throws when nothing usable remains,
 * so callers record a failure rather than storing an empty transcript.
 */
export function prepareTranscriptForStorage(
  parsed: { fullText: string; segments: readonly TimedSegment[] },
  source: TranscriptSourceKind,
  durationSeconds?: number | null,
): PreparedTranscript {
  const qa = validateSegments(parsed.segments, durationSeconds);
  const speakers = enforceSpeakerEvidence(qa.segments, source);
  let fullText = normalizeTranscriptText(parsed.fullText);
  if (source === "GENERATED" && speakers.strippedLabels > 0) {
    fullText = normalizeTranscriptText(speakers.segments.map((s) => s.text).join(" "));
  }
  if (!fullText && speakers.segments.length > 0) {
    fullText = normalizeTranscriptText(speakers.segments.map((s) => s.text).join(" "));
  }
  if (!fullText) throw new Error("Transcript contained no usable text");
  return {
    fullText,
    segments: speakers.segments,
    report: { issues: qa.issues, dropped: qa.dropped, strippedLabels: speakers.strippedLabels },
  };
}
