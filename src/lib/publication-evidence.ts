/**
 * FC-P08: classify how a verified official's program is actually published.
 * Non-RSS (video-only or website-only) programs remain archive/discovery
 * records with source provenance; they are never turned into fabricated RSS
 * episode imports.
 */
export type PublicationPlatform = "RSS" | "VIDEO" | "WEBSITE";
export type PublicationEvidence = {
  personId: string;
  showId: string;
  platform: PublicationPlatform;
  sourceUrl: string;
  hostVerified: boolean;
  mediaPublished: boolean;
  canonicalFeedUrl?: string;
};
export type PublicationStatus =
  | "NEEDS_REVIEW"
  | "NO_PUBLISHED_EPISODES"
  | "RSS_READY"
  | "NON_RSS_ARCHIVE"
  | "FEED_UNRESOLVED";
export type PublicationClassification = { status: PublicationStatus; ingestable: boolean };

const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[?::1\]?$)|\.local$|\.internal$/i;

export function isSafePublicUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password &&
      !!url.hostname && !PRIVATE_HOST.test(url.hostname);
  } catch {
    return false;
  }
}

export function classifyPublication(e: PublicationEvidence): PublicationClassification {
  if (!e.personId || !e.showId || !isSafePublicUrl(e.sourceUrl) || !e.hostVerified)
    return { status: "NEEDS_REVIEW", ingestable: false };
  if (!e.mediaPublished) return { status: "NO_PUBLISHED_EPISODES", ingestable: false };
  if (e.platform === "RSS")
    return e.canonicalFeedUrl && isSafePublicUrl(e.canonicalFeedUrl)
      ? { status: "RSS_READY", ingestable: true }
      : { status: "FEED_UNRESOLVED", ingestable: false };
  return { status: "NON_RSS_ARCHIVE", ingestable: false };
}
