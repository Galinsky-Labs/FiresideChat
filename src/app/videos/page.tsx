import Link from "next/link";
import { db } from "@/lib/db";
import { VideoChatCard } from "@/components/video-chat-card";

export const dynamic = "force-dynamic";

const allowed = ["ALL", "PERSONAL_CHAT", "LIVESTREAM", "Q_AND_A", "BEHIND_THE_SCENES"] as const;
const labels = ["All video", "Personal chats", "Livestreams", "Q&As", "Behind the scenes"];

export default async function VideosPage({ searchParams }: {
  searchParams: Promise<{ format?: string }>;
}) {
  const { format } = await searchParams;
  const selected = allowed.find((item) => item === format) ?? "ALL";
  const videos = await db.videoChat.findMany({
    where: { active: true, ...(selected === "ALL" ? {} : { format: selected }) },
    include: { person: true },
    orderBy: { publishedAt: "desc" },
    take: 100,
  });
  return (
    <div className="detail-page">
      <section className="search-hero">
        <p className="eyebrow">Fireside conversations</p>
        <h1>More than podcasts.</h1>
        <p className="lede">Personal chats, livestreams, Q&As and behind-the-scenes conversations, directly from public servants.</p>
      </section>
      <nav className="video-filter" aria-label="Video formats">
        {allowed.map((value, index) => (
          <Link key={value} aria-current={selected === value ? "page" : undefined}
            href={value === "ALL" ? "/videos" : `/videos?format=${value}`}>{labels[index]}</Link>
        ))}
      </nav>
      {videos.length ? <div className="video-chat-grid">{videos.map((video) => <VideoChatCard key={video.id} video={video} />)}</div>
        : <div className="empty-state"><strong>No verified videos in this category yet.</strong><span>Only verified original publisher videos are listed.</span></div>}
    </div>
  );
}
