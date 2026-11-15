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
  searchParams?: Promise<{ correction?: string }>;
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

const CORRECTION_MESSAGES: Record<string, string> = {
  received: "Thank you. Your correction request was recorded for editor review; the transcript is unchanged until an editor accepts it.",
  invalid_timestamp: "Enter the time as m:ss or h:mm:ss.",
  no_segment: "No transcript line was found at that time.",
  unchanged_text: "The proposed text matches the current transcript.",
  invalid_text: "Enter the corrected wording (up to 2,000 characters).",
  invalid_reason: "Explain the correction in at least 10 characters.",
  invalid_evidence: "Evidence must be an https link.",
  too_many_pending: "This episode already has many pending requests; please try again later.",
};

export default async function EpisodePage({ params, searchParams }: Props) {
  const { id } = await params;
  const correctionNotice = CORRECTION_MESSAGES[(await searchParams)?.correction ?? ""] ??
    ((await searchParams)?.correction ? "The correction request could not be recorded." : null);
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
          revisions: { orderBy: { createdAt: "desc" }, take: 50 },
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

        {correctionNotice ? <p className="transcript-correction-notice" role="status">{correctionNotice}</p> : null}

        {episode.transcript && episode.transcript.revisions.length > 0 ? (
          <details className="transcript-revisions">
            <summary>
              {episode.transcript.revisions.length} editor correction{episode.transcript.revisions.length === 1 ? "" : "s"} to the{" "}
              {episode.transcript.source === "PUBLISHER" ? "publisher" : "generated"} transcript
            </summary>
            <ol>
              {episode.transcript.revisions.map((revision) => (
                <li key={revision.id}>
                  <time dateTime={revision.createdAt.toISOString()}>{revision.createdAt.toISOString().slice(0, 10)}</time>{" "}
                  at {Math.floor(revision.startSeconds / 60)}:{String(Math.floor(revision.startSeconds % 60)).padStart(2, "0")}:{" "}
                  <del>{revision.previousText}</del> → <ins>{revision.newText}</ins>
                  {revision.evidenceUrl ? <> (<a href={revision.evidenceUrl} rel="noreferrer nofollow" target="_blank">source</a>)</> : null}
                  {" "}— {revision.note}
                </li>
              ))}
            </ol>
          </details>
        ) : null}

        {episode.transcript && episode.transcript.segments.length > 0 ? (
          <details className="transcript-correction-form">
            <summary>Suggest a transcript correction</summary>
            <form method="post" action="/api/transcript-corrections">
              <input type="hidden" name="episodeId" value={episode.id} />
              <div aria-hidden="true" className="sr-only">
                <label>Leave blank<input name="website" tabIndex={-1} autoComplete="off" /></label>
              </div>
              <label>Time in the episode (m:ss)<input name="at" required pattern="[0-9]{1,2}(:[0-9]{1,2}){0,2}" placeholder="12:34" /></label>
              <label>Corrected wording<textarea name="proposedText" required maxLength={2000} rows={3} /></label>
              <label>Why is this a correction?<textarea name="reason" required minLength={10} maxLength={1000} rows={2} /></label>
              <label>Evidence link (optional, https)<input name="evidenceUrl" type="url" placeholder="https://" /></label>
              <p>Requests are reviewed by an editor. Nothing changes until it is accepted, and every accepted change is listed above.</p>
              <button type="submit">Send correction request</button>
            </form>
          </details>
        ) : null}
      </section>
    </div>
  );
}
