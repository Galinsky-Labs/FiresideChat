import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { instagramEmbedUrl, youtubeEmbedUrl } from "@/lib/video-sources";

export const dynamic = "force-dynamic";

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = await db.videoChat.findFirst({ where: { id, active: true }, include: { person: true } });
  if (!video) notFound();
  // Embed official publisher links only; do not scrape or rehost media.
  const embed = youtubeEmbedUrl(video) ?? instagramEmbedUrl(video);
  return (
    <div className="detail-page">
      <section className="search-hero">
        <p className="eyebrow">{video.publisherName} · {video.platform}</p>
        <h1>{video.title}</h1>
        <p className="lede">{video.description}</p>
        <p><Link href={`/people/${video.person.slug}`}>More from {video.person.fullName}</Link></p>
      </section>
      {embed ? <div className="video-player"><iframe title={video.title} src={embed}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin" allowFullScreen loading="lazy" /></div> : null}
      <p><a className="text-link" href={video.sourceUrl} target="_blank" rel="noopener noreferrer">Watch at original publisher →</a></p>
      <p className="section-explainer">Source: {video.publisherName}. Inclusion verified {video.verifiedAt.toISOString().slice(0, 10)}. {video.verificationNote}</p>
      {video.transcriptText ? <section className="section-block"><h2>Transcript</h2><p className="video-transcript">{video.transcriptText}</p></section> : null}
    </div>
  );
}
