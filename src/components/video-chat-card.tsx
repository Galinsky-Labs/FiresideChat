import Link from "next/link";
import { formatDate } from "@/lib/presentation";

export type VideoCardItem = {
  id: string;
  title: string;
  description: string | null;
  publishedAt: Date;
  platform: "YOUTUBE" | "INSTAGRAM" | "OTHER";
  format: "PERSONAL_CHAT" | "LIVESTREAM" | "Q_AND_A" | "BEHIND_THE_SCENES";
  sourceUrl: string;
  publisherName: string;
  person: { slug: string; fullName: string };
};

const formatLabels = {
  PERSONAL_CHAT: "Personal chat",
  LIVESTREAM: "Livestream",
  Q_AND_A: "Q&A",
  BEHIND_THE_SCENES: "Behind the scenes",
};

export function VideoChatCard({ video }: { video: VideoCardItem }) {
  return (
    <article className="video-chat-card">
      <div className="episode-kicker">
        <Link href={`/people/${video.person.slug}`}>{video.person.fullName}</Link>
        <span>·</span>
        <span>{formatLabels[video.format]}</span>
      </div>
      <h3><Link href={`/videos/${video.id}`}>{video.title}</Link></h3>
      {video.description ? <p>{video.description}</p> : null}
      <div className="episode-meta">
        <time dateTime={video.publishedAt.toISOString()}>{formatDate(video.publishedAt)}</time>
        <span>{video.platform === "YOUTUBE" ? "YouTube" : video.platform === "INSTAGRAM" ? "Instagram" : "Original publisher"}</span>
      </div>
      <Link className="text-link" href={`/videos/${video.id}`}>Watch conversation →</Link>
    </article>
  );
}
