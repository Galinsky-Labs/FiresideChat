/** FC-P04: persistent review queue contracts. No queue entry changes the published podcast registry. */
export const ROLE_TYPES = ["HOST", "COHOST", "OFFICIAL_PRODUCER", "GUEST", "UNKNOWN"] as const;
export const EVIDENCE_TYPES = ["HOST_CREDIT", "COHOST_CREDIT", "OFFICIAL_PRODUCTION", "NETWORK_ONLY", "GUEST_APPEARANCE", "OTHER"] as const;
export const REVIEW_DECISIONS = ["VERIFY", "EXCLUDE_GUEST", "REQUEST_EVIDENCE", "REJECT"] as const;
export type Role = (typeof ROLE_TYPES)[number];
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];
export type ReviewStatus = "PENDING" | "NEEDS_EVIDENCE" | "VERIFIED" | "EXCLUDED_GUEST" | "REJECTED";
export type CandidateInput = {
  officialKey: string; officialName: string; identitySourceUrl: string;
  showKey: string; showTitle: string; proposedRole: Role;
  feedCandidateUrl: string | null; hostStartOn: string | null; hostEndOn: string | null;
};
export type EvidenceInput = {
  kind: EvidenceType; sourceUrl: string; excerpt: string; observedOn: string;
};
export class HostReviewError extends Error {
  constructor(readonly code: string) { super(code); this.name = "HostReviewError"; }
}
const fail = (code: string): never => { throw new HostReviewError(code); };
function asText(value: unknown, max: number, min = 0): string {
  if (typeof value !== "string") return fail("INVALID_TEXT");
  const text = value.trim();
  if (text.length < min || text.length > max || /[\u0000-\u001f\u007f]/.test(text)) return fail("INVALID_TEXT");
  return text;
}
export function sourceUrl(raw: unknown, optional = false): string | null {
  if (optional && (raw === null || raw === undefined || raw === "")) return null;
  const text = asText(raw, 2048, 10);
  try {
    const url = new URL(text);
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password ||
        url.port || url.hash || url.search || url.origin === "null" || url.href !== text) return fail("INVALID_SOURCE_URL");
    return text;
  } catch (error) {
    if (error instanceof HostReviewError) throw error;
    return fail("INVALID_SOURCE_URL");
  }
}
export function day(raw: unknown, optional = false): string | null {
  if (optional && (raw === null || raw === undefined || raw === "")) return null;
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return fail("INVALID_DAY");
  const timestamp = new Date(raw + "T00:00:00.000Z");
  if (!Number.isFinite(timestamp.getTime()) || timestamp.toISOString().slice(0, 10) !== raw) return fail("INVALID_DAY");
  return raw;
}
export function parseCandidate(input: Record<string, unknown>): CandidateInput {
  const officialKey = asText(input.officialKey, 64, 8);
  if (!/^(BIOGUIDE:[A-Z][0-9]{6}|PRESIDENT:[A-Z0-9_-]{2,48})$/.test(officialKey)) return fail("INVALID_OFFICIAL_IDENTITY");
  const showKey = asText(input.showKey, 120, 1);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(showKey)) return fail("INVALID_SHOW_KEY");
  const role = asText(input.proposedRole, 32);
  if (!ROLE_TYPES.some(x => x === role)) return fail("INVALID_ROLE");
  const hostStartOn = day(input.hostStartOn, true);
  const hostEndOn = day(input.hostEndOn, true);
  if (hostEndOn && (!hostStartOn || hostEndOn < hostStartOn)) return fail("INVALID_HOST_PERIOD");
  return {
    officialKey, officialName: asText(input.officialName, 150, 3),
    identitySourceUrl: sourceUrl(input.identitySourceUrl) as string,
    showKey, showTitle: asText(input.showTitle, 200, 3),
    proposedRole: role as Role, feedCandidateUrl: sourceUrl(input.feedCandidateUrl, true),
    hostStartOn, hostEndOn,
  };
}
/** Distinct official identifiers prevent similarly named politicians from being conflated. */
export function candidateKey(candidate: CandidateInput): string {
  return [candidate.officialKey, candidate.showKey, candidate.hostStartOn ?? "undated"].join("|");
}
export function parseEvidence(input: Record<string, unknown>): EvidenceInput {
  const kind = asText(input.kind, 32);
  if (!EVIDENCE_TYPES.some(x => x === kind)) return fail("INVALID_EVIDENCE_KIND");
  return { kind: kind as EvidenceType, sourceUrl: sourceUrl(input.sourceUrl) as string,
    excerpt: asText(input.excerpt, 1600, 12), observedOn: day(input.observedOn) as string };
}
const matchingEvidence: Record<"HOST" | "COHOST" | "OFFICIAL_PRODUCER", EvidenceType> = {
  HOST: "HOST_CREDIT", COHOST: "COHOST_CREDIT", OFFICIAL_PRODUCER: "OFFICIAL_PRODUCTION",
};
export function decideReview(candidate: CandidateInput, evidence: readonly EvidenceInput[],
    decision: ReviewDecision, note: string, reviewedOn: string): Exclude<ReviewStatus, "PENDING"> {
  const explanation = asText(note, 2000, 20);
  if (!explanation) return fail("MISSING_REVIEW_RATIONALE");
  const today = day(reviewedOn) as string;
  if (!REVIEW_DECISIONS.includes(decision)) return fail("INVALID_DECISION");
  const timely = evidence.filter(e => day(e.observedOn)! <= today && Boolean(sourceUrl(e.sourceUrl)));
  if (decision === "VERIFY") {
    if (!candidate.hostStartOn || !["HOST", "COHOST", "OFFICIAL_PRODUCER"].includes(candidate.proposedRole))
      return fail("ROLE_OR_PERIOD_UNVERIFIED");
    const required = matchingEvidence[candidate.proposedRole as keyof typeof matchingEvidence];
    if (!timely.some(e => e.kind === required)) return fail("NO_MATCHING_ROLE_EVIDENCE");
    return "VERIFIED";
  }
  if (decision === "EXCLUDE_GUEST") {
    if (!timely.some(e => e.kind === "GUEST_APPEARANCE")) return fail("NO_GUEST_EVIDENCE");
    const roleKind = matchingEvidence[candidate.proposedRole as keyof typeof matchingEvidence];
    if (roleKind && timely.some(e => e.kind === roleKind)) return fail("CONFLICTING_ROLE_EVIDENCE");
    return "EXCLUDED_GUEST";
  }
  if (decision === "REQUEST_EVIDENCE") return "NEEDS_EVIDENCE";
  if (timely.length === 0) return fail("NO_REJECTION_EVIDENCE");
  return "REJECTED";
}
/** Endpoints can gate per-episode attribution; shared multi-host shows yield one check per official. */
export function hostPeriodIncludes(candidate: CandidateInput, status: ReviewStatus, publishedOn: string): boolean {
  const episodeDay = day(publishedOn) as string;
  return status === "VERIFIED" && Boolean(candidate.hostStartOn) &&
    episodeDay >= candidate.hostStartOn! && (!candidate.hostEndOn || episodeDay <= candidate.hostEndOn);
}

/** Read-only date-bound projection. It does not mutate PodcastPerson or make feeds public. */
export function approvedHostsForEpisode(
  reviews: readonly { candidate: CandidateInput; status: ReviewStatus }[],
  showKey: string, publishedOn: string,
): string[] {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(showKey)) return fail("INVALID_SHOW_KEY");
  day(publishedOn);
  const eligible = new Set<string>();
  for (const review of reviews) {
    if (review.candidate.showKey !== showKey) continue;
    if (hostPeriodIncludes(review.candidate, review.status, publishedOn)) eligible.add(review.candidate.officialKey);
  }
  return [...eligible].sort();
}
