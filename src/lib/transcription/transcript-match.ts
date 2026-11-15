/**
 * FC-P11: decide whether a transcript discovered on the web genuinely belongs
 * to a specific episode before it is imported. Rejections are explicit so the
 * negative search can be recorded instead of silently retried or, worse,
 * importing show notes or another program's script as a transcript.
 */
export type EpisodeContext = {
  title: string;
  description?: string | null;
  durationSeconds?: number | null;
  episodeUrl?: string | null;
};
export type CandidateTranscript = {
  fullText: string;
  segments: ReadonlyArray<{ startSeconds: number; endSeconds: number }>;
};
export type MatchRejection =
  | "EMPTY"
  | "TOO_SHORT"
  | "PAYWALL_OR_LOGIN"
  | "DESCRIPTION_ONLY"
  | "OFF_SITE_UNRELATED"
  | "DURATION_MISMATCH";
export type MatchDecision = { accepted: true } | { accepted: false; reason: MatchRejection };

export const MIN_TRANSCRIPT_WORDS = 50;

const PAYWALL = /\b(subscribe (?:now )?to (?:read|continue|unlock)|sign in to (?:read|view|continue)|log in to (?:read|view|continue)|members[- ]only|for (?:paid )?subscribers only|this content is (?:available|reserved) (?:only )?(?:to|for) (?:members|subscribers)|start your free trial|create a free account to continue)\b/i;
const STOP = new Set(["the", "and", "with", "from", "that", "this", "what", "about", "your", "have", "episode", "podcast", "part", "show"]);

function words(text: string): string[] {
  return text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/).filter(Boolean);
}

function significant(text: string): Set<string> {
  return new Set(words(text).filter((w) => w.length >= 4 && !STOP.has(w)));
}

/** Registrable-domain approximation: the last two DNS labels. */
function siteOf(url: string): string | null {
  try {
    const labels = new URL(url).hostname.toLowerCase().split(".").filter(Boolean);
    return labels.slice(-2).join(".");
  } catch {
    return null;
  }
}

function containment(small: Set<string>, large: Set<string>): number {
  if (small.size === 0) return 0;
  let hit = 0;
  for (const w of small) if (large.has(w)) hit += 1;
  return hit / small.size;
}

export function assessTranscriptMatch(
  episode: EpisodeContext,
  candidate: CandidateTranscript,
  transcriptUrl: string,
): MatchDecision {
  const text = candidate.fullText.trim();
  if (!text) return { accepted: false, reason: "EMPTY" };
  const tokens = words(text);

  if (PAYWALL.test(text) && tokens.length < 600) return { accepted: false, reason: "PAYWALL_OR_LOGIN" };
  if (tokens.length < MIN_TRANSCRIPT_WORDS) return { accepted: false, reason: "TOO_SHORT" };

  const description = episode.description?.trim() ?? "";
  if (description) {
    const descTokens = words(description);
    const descSet = significant(description);
    const textSet = significant(text);
    // Show notes re-published under a "transcript" heading: nearly every
    // significant word of the candidate already appears in the description and
    // its vocabulary is not substantially richer than the description's.
    if (descTokens.length >= 15 && textSet.size <= descSet.size * 1.5 &&
        containment(textSet, descSet) >= 0.8) {
      return { accepted: false, reason: "DESCRIPTION_ONLY" };
    }
  }

  const episodeSite = episode.episodeUrl ? siteOf(episode.episodeUrl) : null;
  const transcriptSite = siteOf(transcriptUrl);
  if (episodeSite && transcriptSite && episodeSite !== transcriptSite) {
    // Off-site transcripts must independently identify this episode.
    const titleSet = significant(episode.title);
    const head = significant(tokens.slice(0, 2_000).join(" "));
    if (titleSet.size === 0 || containment(titleSet, head) < 0.5) {
      return { accepted: false, reason: "OFF_SITE_UNRELATED" };
    }
  }

  const duration = episode.durationSeconds ?? 0;
  const lastEnd = candidate.segments.reduce((max, s) => Math.max(max, s.endSeconds), 0);
  if (duration > 0 && candidate.segments.length > 0) {
    if (lastEnd > duration * 1.15 + 60) return { accepted: false, reason: "DURATION_MISMATCH" };
    if (duration >= 600 && lastEnd < duration * 0.4) return { accepted: false, reason: "DURATION_MISMATCH" };
  }

  return { accepted: true };
}
