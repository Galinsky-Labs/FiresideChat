/**
 * FC-P12/FC-P13: honest generated-transcription state and budget arithmetic.
 * Paid speech-to-text never runs without an explicit operator switch,
 * credentials and remaining approved audio minutes.
 */
export type GeneratedTranscriptionState =
  | "DISABLED_BY_OPERATOR"
  | "MISSING_CREDENTIALS"
  | "BUDGET_EXHAUSTED"
  | "READY";

export function generatedTranscriptionState(input: {
  enabled: boolean;
  hasCredentials: boolean;
  remainingSeconds: number;
}): GeneratedTranscriptionState {
  if (!input.enabled) return "DISABLED_BY_OPERATOR";
  if (!input.hasCredentials) return "MISSING_CREDENTIALS";
  if (input.remainingSeconds <= 0) return "BUDGET_EXHAUSTED";
  return "READY";
}

export type BudgetUsage = {
  /** Sum of episode durations whose attempt began in the window (legacy measure). */
  attemptedSeconds: number;
  /** Seconds actually billed per the chunk ledger in the window. */
  billedSeconds: number;
  /** Estimated seconds for in-flight claims that have not finished billing. */
  inFlightSeconds: number;
};

/** Use the most conservative usage measure so retries cannot hide spend. */
export function effectiveUsageSeconds(usage: BudgetUsage): number {
  return Math.max(usage.attemptedSeconds, usage.billedSeconds + usage.inFlightSeconds);
}

export function remainingBudgetSeconds(input: {
  dailyCapSeconds: number;
  monthlyCapSeconds: number;
  day: BudgetUsage;
  month: BudgetUsage;
}): number {
  return Math.max(0, Math.min(
    input.dailyCapSeconds - effectiveUsageSeconds(input.day),
    input.monthlyCapSeconds - effectiveUsageSeconds(input.month),
  ));
}

/** Unknown durations are budgeted at 90 minutes so caps stay conservative. */
export const UNKNOWN_DURATION_ESTIMATE_SECONDS = 90 * 60;
export function estimatedSeconds(durationSeconds: number | null | undefined): number {
  return durationSeconds && durationSeconds > 0 ? durationSeconds : UNKNOWN_DURATION_ESTIMATE_SECONDS;
}
