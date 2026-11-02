import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IllustratedPortrait } from "@/components/illustrated-portrait";
import { PlayButton } from "@/components/player/play-button";
import { TranscriptSegments } from "@/components/transcript-segments";
import { db } from "@/lib/db";
import { reviewedEpisodeWhere, feedAttributionForPodcast } from "@/lib/feed-scope-store";
import { formatDate, formatDuration, officeLabel } from "@/lib/presentation";
import { portraitUrlForSlug } from "@/lib/portraits";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const episode = await db.episode.findUnique({
    where: { id },
    select: {
      title: true,
      description: true,
      podcastId: true,
      podcast: { select: { title: true } },
    },
  });

  const visible=episode && (await db.episode.count({
    where:{id,...await reviewedEpisodeWhere(episode.podcastId)},
  }))===1;
  return {
    title: visible ? episode?.title ?? "Episode" : "Episode",
    description: visible ? (
      episode?.description ??
      (episode ? `Listen to ${episode.title} from ${episode.podcast.title}.` : undefined)
    ) : undefined,
  };
}

export default async function EpisodePage({ params }: Props) {
  const { id } = await params;
  const episode = await db.episode.findUnique({
    where: { id },
    include: {
      podcast: {
        include: {
          people: { include: { person: true } },
        },
      },
      transcript: {
        include: {
          segments: { orderBy: { startSeconds: "asc" } },
        },
      },
    },
  });

  if (!episode) notFound();
  if ((await db.episode.count({where:{id:episode.id,
      ...await reviewedEpisodeWhere(episode.podcastId)}}))!==1) notFound();

  const attribution=await feedAttributionForPodcast(episode.podcastId);
  const person=attribution
    ? await db.person.findFirst({where:{id:{in:attribution(episode)}},orderBy:{id:"asc"}})
    : episode.podcast.people[0]?.person;
  if (!person) notFound();

  const duration = formatDuration(episode.durationSeconds);
  const playerEpisode = {
    id: episode.id,
    title: episode.title,
    audioUrl: episode.audioUrl,
    podcastTitle: episode.podcast.title,
    podcastSlug: episode.podcast.slug,
    personName: person.fullName,
    imageUrl: portraitUrlForSlug(person.slug) ?? episode.imageUrl,
  };

  return (
    <div className="detail-page">
      <section className="show-hero episode-detail-hero">
        <IllustratedPortrait
          slug={person.slug}
          name={person.fullName}
          className="illustrated-portrait-hero"
          large
        />
        <div className="episode-detail-copy">
          <p className="eyebrow">
            {officeLabel(person.kind, person.isCurrent, person.state)}
          </p>
          <div className="episode-detail-kicker">
            <Link href={`/people/${person.slug}`}>{person.fullName}</Link>
            <span>·</span>
            <Link href={`/podcasts/${episode.podcast.slug}`}>
              {episode.podcast.title}
            </Link>
          </div>
          <h1>{episode.title}</h1>
          <div className="episode-detail-meta">
            <time dateTime={episode.publishedAt.toISOString()}>
              {formatDate(episode.publishedAt)}
            </time>
            {duration ? <span>{duration}</span> : null}
          </div>
          <div className="episode-detail-play">
            <PlayButton episode={playerEpisode} />
            <span>Listen from the beginning</span>
          </div>
        </div>
      </section>

      {episode.description ? (
        <section className="section-block episode-description-section">
          <p className="section-label">Episode notes</p>
          <div className="episode-detail-description">{episode.description}</div>
        </section>
      ) : null}

      <section className="section-block transcript-section" id="transcript">
        <div className="section-heading">
          <div>
            <p className="section-label">Transcript</p>
            <h2>Read the conversation.</h2>
          </div>
          {episode.transcript ? (
            <span className="transcript-source">
              {episode.transcript.source === "PUBLISHER"
                ? "Publisher transcript"
                : "Generated transcript"}
            </span>
          ) : null}
        </div>

        {episode.transcript ? (
          episode.transcript.segments.length > 0 ? (
            <TranscriptSegments
              episode={playerEpisode}
              segments={episode.transcript.segments}
            />
          ) : (
            <div className="transcript-fulltext">
              {episode.transcript.fullText
                .split(/\n{2,}/)
                .filter(Boolean)
                .map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
            </div>
          )
        ) : (
          <div className="empty-state">
            <strong>
              {episode.transcriptStatus === "PROCESSING"
                ? "Transcript processing."
                : episode.transcriptStatus === "AVAILABLE"
                  ? "Publisher transcript queued for import."
                  : "Transcript recovery in progress."}
            </strong>
            <span>
              Fireside Chat checks publisher transcript links and the episode
              website before trying speech-to-text when configured.
            </span>
            {episode.publisherTranscriptUrl ? (
              <a
                className="text-link"
                href={episode.publisherTranscriptUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open the publisher transcript directly
              </a>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
