import { validateVideoSource } from "./video-sources";

export type InstagramMedia = {
  id: string;
  media_type: string;
  media_product_type?: string;
  permalink?: string;
  caption?: string;
  timestamp?: string;
};
export type DiscoveredVideo = {
  platform: "INSTAGRAM";
  platformVideoId: string;
  sourceUrl: string;
  title: string;
  description: string;
  publishedAt: Date;
  format: "PERSONAL_CHAT" | "LIVESTREAM" | "Q_AND_A" | "BEHIND_THE_SCENES";
};

/** Screening only. A person must approve editorial eligibility before publication. */
export function normalizeInstagramMedia(media: InstagramMedia): DiscoveredVideo | null {
  if (media.media_type !== "VIDEO" || !media.permalink || !media.timestamp) return null;
  const publishedAt = new Date(media.timestamp);
  if (Number.isNaN(publishedAt.getTime())) return null;
  let shortcode: string;
  try {
    const parsed = new URL(media.permalink);
    const match = parsed.pathname.match(/^\/(?:reel|p|tv)\/([A-Za-z0-9_-]+)\/?$/);
    if (!["www.instagram.com", "instagram.com"].includes(parsed.hostname) || !match) return null;
    shortcode = match[1];
  } catch { return null; }
  const original = new URL(media.permalink);
  const sourceUrl = "https://www.instagram.com" + original.pathname.replace(/\/?$/, "/");
  validateVideoSource({ platform: "INSTAGRAM", platformVideoId: shortcode, sourceUrl });
  const description = (media.caption ?? "").trim().slice(0, 4000);
  const firstLine = description.split(/\r?\n/).find((line) => line.trim())?.trim();
  const title = (firstLine || "Instagram video").slice(0, 180);
  const format = /\b(q\s*(?:&|and)\s*a|questions? (?:and|&) answers?)\b/i.test(description)
    ? "Q_AND_A"
    : /\b(livestream|instagram live|went live|live conversation)\b/i.test(description)
      ? "LIVESTREAM" : "PERSONAL_CHAT";
  return { platform: "INSTAGRAM", platformVideoId: shortcode, sourceUrl, title, description, publishedAt, format };
}

type GraphResult = {
  business_discovery?: {
    username?: string;
    media?: { data?: InstagramMedia[]; paging?: { cursors?: { after?: string } } };
  };
  error?: { message?: string; code?: number };
};
export type InstagramConfig = {
  accessToken: string;
  viewerIgUserId: string;
  graphVersion?: string;
  maxPages?: number;
  fetcher?: typeof fetch;
};
function safeIdentifier(id: string) {
  if (!/^\d{5,30}$/.test(id)) throw new Error("Invalid authorized Instagram account ID");
  return id;
}
function safeHandle(handle: string) {
  const normalized = handle.replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(normalized)) throw new Error("Invalid Instagram handle");
  return normalized;
}

/** Business Discovery only: never scrape login pages or download third-party media. */
export async function discoverInstagramVideos(handle: string, config: InstagramConfig): Promise<DiscoveredVideo[]> {
  const username = safeHandle(handle);
  const viewer = safeIdentifier(config.viewerIgUserId);
  const version = config.graphVersion ?? "v26.0";
  if (!/^v\d{1,2}\.\d{1,2}$/.test(version)) throw new Error("Invalid Graph API version");
  if (!config.accessToken) throw new Error("Missing authorized Meta access token");
  const fetcher = config.fetcher ?? fetch;
  const videos = new Map<string, DiscoveredVideo>();
  let after: string | undefined;
  const pages = Math.min(Math.max(config.maxPages ?? 2, 1), 5);
  for (let page = 0; page < pages; page++) {
    const media = "media.limit(50)" + (after ? ".after(" + after + ")" : "") +
      "{id,media_type,media_product_type,permalink,caption,timestamp}";
    const fields = "business_discovery.username(" + username + "){username," + media + "}";
    const url = new URL("https://graph.facebook.com/" + version + "/" + viewer);
    url.searchParams.set("fields", fields);
    const response = await fetcher(url, {
      headers: { Authorization: "Bearer " + config.accessToken, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error("Instagram Business Discovery HTTP " + response.status);
    const body = await response.json() as GraphResult;
    if (body.error) throw new Error("Instagram Business Discovery error " + (body.error.code ?? "unknown"));
    if (body.business_discovery?.username?.toLowerCase() !== username)
      throw new Error("Instagram publisher identity mismatch: " + username);
    const results = body.business_discovery?.media?.data ?? [];
    for (const item of results) {
      const result = normalizeInstagramMedia(item);
      if (result) videos.set(result.platformVideoId, result);
    }
    const cursor = body.business_discovery?.media?.paging?.cursors?.after;
    // Cursor must be treated strictly as an opaque Graph API cursor, not a URL.
    if (!cursor || cursor === after || results.length === 0 || cursor.length > 500 || !/^[a-zA-Z0-9_=-]+$/.test(cursor)) break;
    after = cursor;
  }
  return [...videos.values()];
}
