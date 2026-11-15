import { validateVideoSource } from "@/lib/video-sources";
import { classifyPublication } from "@/lib/publication-evidence";

export type VerifiedVideo = {
  personSlug: string;
  title: string;
  description: string;
  platform: "YOUTUBE" | "INSTAGRAM" | "OTHER";
  format: "PERSONAL_CHAT" | "LIVESTREAM" | "Q_AND_A" | "BEHIND_THE_SCENES";
  platformVideoId: string;
  sourceUrl: string;
  verificationUrl: string;
  verificationNote: string;
  verifiedAt: string;
  publisherName: string;
  publishedAt: string;
};

// Curated primary-source entries only. Do not include unverified reposts,
// news clips, ads or a politician's guest appearances on third-party channels.
export const verifiedVideos: VerifiedVideo[] = [
  {
    personSlug: "alexandria-ocasio-cortez",
    title: "An Afternoon at Home with AOC",
    description: "A behind-the-scenes visit to communities and businesses in New York's 14th district.",
    platform: "YOUTUBE",
    format: "BEHIND_THE_SCENES",
    platformVideoId: "nhT-v9ZwJvc",
    sourceUrl: "https://www.youtube.com/watch?v=nhT-v9ZwJvc",
    verificationUrl: "https://www.youtube.com/watch?v=nhT-v9ZwJvc",
    verificationNote: "Published August 11, 2023 by the verified Alexandria Ocasio-Cortez YouTube account. Primary-source publisher verified from the original listing.",
    verifiedAt: "2026-11-09",
    publisherName: "Alexandria Ocasio-Cortez",
    publishedAt: "2023-08-11T00:00:00.000Z",
  },
];

export function validateVideoRegistry(videos: readonly VerifiedVideo[]) {
  const seen = new Set<string>();
  for (const video of videos) {
    const id = validateVideoSource(video);
    const key = video.platform + ":" + id;
    if (seen.has(key)) throw new Error("Duplicate video source: " + key);
    seen.add(key);
    if (!video.personSlug || !video.title || !video.publisherName ||
        !video.verificationUrl || !video.verificationNote ||
        !Number.isFinite(Date.parse(video.verifiedAt)) ||
        !Number.isFinite(Date.parse(video.publishedAt))) {
      throw new Error("Incomplete verified video: " + key);
    }
    // FC-P08: a verified primary-source video is a feedless archive item and
    // must never be routed into RSS episode ingestion.
    const publication = classifyPublication({
      personId: video.personSlug, showId: key, platform: "VIDEO",
      sourceUrl: video.sourceUrl, hostVerified: true, mediaPublished: true,
    });
    if (publication.status !== "NON_RSS_ARCHIVE" || publication.ingestable)
      throw new Error("Video must be classified as a non-RSS archive item: " + key);
  }
}
