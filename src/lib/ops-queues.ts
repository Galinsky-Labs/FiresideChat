import type { GeneratedTranscriptionState } from "@/lib/transcription/budget";

/**
 * FC-P17: the editorial/operations work queues. Each queue is a distinct
 * state; nothing here merges "unknown" with "verified" or "blocked".
 */
export type OpsQueueKey =
  | "unreviewedHosts"
  | "unverifiedShowMapping"
  | "unresolvedShowCandidates"
  | "crawlErrors"
  | "staleFeeds"
  | "neverSyncedFeeds"
  | "publisherTranscriptPending"
  | "webTranscriptPending"
  | "generatedBlocked"
  | "transcriptFailures"
  | "brokenSourceLinks"
  | "missingPortraits"
  | "videoCandidatesPending"
  | "transcriptCorrections";

export type OpsQueueCounts = Record<OpsQueueKey, number>;
export type OpsQueue = {
  key: OpsQueueKey;
  label: string;
  count: number;
  severity: "action" | "watch" | "clear";
  explanation: string;
};

const META: Record<OpsQueueKey, { label: string; action: boolean; explanation: string }> = {
  unreviewedHosts: { label: "Unreviewed hosts", action: true, explanation: "Host/co-host/official-production claims awaiting source evidence (FC-P04). Nothing here is public." },
  unverifiedShowMapping: { label: "Unverified show mapping", action: true, explanation: "Feed identity/scope proposals not yet approved (FC-P05); their episodes stay out of the public archive." },
  unresolvedShowCandidates: { label: "Missing feeds / unresolved candidates", action: true, explanation: "Registry candidates without a verified host relationship and canonical feed." },
  crawlErrors: { label: "Crawl errors", action: true, explanation: "Active feeds whose last fetch failed." },
  staleFeeds: { label: "Outdated feeds", action: false, explanation: "Active feeds not refreshed within the stale window." },
  neverSyncedFeeds: { label: "Never synced feeds", action: false, explanation: "Active feeds with no successful import yet." },
  publisherTranscriptPending: { label: "Publisher transcript pending", action: false, explanation: "Episodes with a publisher transcript URL still to be imported." },
  webTranscriptPending: { label: "Web transcript search pending", action: false, explanation: "Episodes whose episode page has not yet been searched for a transcript (FC-P11)." },
  generatedBlocked: { label: "Generated STT blocked", action: false, explanation: "Episodes that exhausted public sources and wait for authorized speech-to-text." },
  transcriptFailures: { label: "Transcript failures", action: true, explanation: "Episodes whose transcription attempt failed." },
  brokenSourceLinks: { label: "Broken source links", action: true, explanation: "Publisher transcript URLs that returned an error on the last attempt." },
  missingPortraits: { label: "Missing portraits", action: false, explanation: "Public servants without an approved portrait." },
  videoCandidatesPending: { label: "Video candidates pending", action: true, explanation: "Discovered video conversations staged inactive for editorial approval." },
  transcriptCorrections: { label: "Transcript correction requests", action: true, explanation: "Public correction proposals awaiting an editor decision (FC-P14); transcripts are unchanged until accepted." },
};

export const OPS_QUEUE_ORDER = Object.keys(META) as OpsQueueKey[];

export function buildOpsQueues(counts: OpsQueueCounts, generation: GeneratedTranscriptionState): OpsQueue[] {
  return OPS_QUEUE_ORDER.map((key) => {
    const meta = META[key];
    const count = Math.max(0, Math.trunc(counts[key] ?? 0));
    let explanation = meta.explanation;
    if (key === "generatedBlocked") explanation += " Current state: " + generation + ".";
    return {
      key,
      label: meta.label,
      count,
      severity: count === 0 ? "clear" : meta.action ? "action" : "watch",
      explanation,
    };
  });
}

/** A short public-safe summary: counts only, never tokens, contact details or private notes. */
export function summarizeQueues(queues: readonly OpsQueue[]) {
  return {
    actionNeeded: queues.filter((q) => q.severity === "action").reduce((sum, q) => sum + q.count, 0),
    watching: queues.filter((q) => q.severity === "watch").reduce((sum, q) => sum + q.count, 0),
    clearQueues: queues.filter((q) => q.severity === "clear").length,
  };
}
