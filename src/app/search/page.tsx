import Link from "next/link";
import { EpisodeCard } from "@/components/episode-card";
import { IllustratedPortrait } from "@/components/illustrated-portrait";
import { db } from "@/lib/db";
import { feedAttributionForPodcast } from "@/lib/feed-scope-store";
import { archiveVisibleWhere } from "@/lib/feed-scope-store";
import { officeLabel } from "@/lib/presentation";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

function transcriptClock(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${minutes}:${String(secs).padStart(2, "0")}`;
}

function excerptAround(text: string, query: string, maxLength = 240) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;

  const match = normalized.toLowerCase().indexOf(query.toLowerCase());
  const start = Math.max(0, match >= 0 ? match - Math.floor(maxLength / 3) : 0);
  const end = Math.min(normalized.length, start + maxLength);
  return `${start > 0 ? "…" : ""}${normalized.slice(start, end)}${end < normalized.length ? "…" : ""}`;
}

export default async function SearchPage({ searchParams }: Props) {
  const { q: rawQuery } = await searchParams;
  const q = rawQuery?.trim() ?? "";

  if (q.length < 2) {
    return (
      <div className="detail-page">
        <section className="search-hero">
          <p className="eyebrow">Search the archive</p>
          <h1>Find the conversation.</h1>
          <form className="hero-search" action="/search">
            <input
              name="q"
              defaultValue={q}
              aria-label="Search"
              placeholder="Search people, shows, or episode topics"
            />
            <button type="submit">Search</button>
          </form>
        </section>
        <div className="empty-state">
          <strong>Enter at least two characters.</strong>
          <span>Search across public servants, shows, and episode metadata.</span>
        </div>
      </div>
    );
  }

  const publicEpisodeWhere=await archiveVisibleWhere();
  const [people, podcasts, episodes, transcriptSegments, plainTranscripts] =
    await Promise.all([
    db.person.findMany({
      where: { fullName: { contains: q, mode: "insensitive" } },
      orderBy: { fullName: "asc" },
      take: 20,
    }),
    db.podcast.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { feedDescription: { contains: q, mode: "insensitive" } },
        ],
      },
      include: { people: { include: { person: true } } },
      orderBy: { title: "asc" },
      take: 20,
    }),
    db.episode.findMany({
      where: {
        AND:[publicEpisodeWhere,{OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ]}],
      },
      include: {
        podcast: { include: { people: { include: { person: true } } } },
      },
      orderBy: { publishedAt: "desc" },
      take: 40,
    }),
    db.transcriptSegment.findMany({
      where: { text: { contains: q, mode: "insensitive" },
        transcript: { is: { episode: { is: publicEpisodeWhere } } } },
      include: {
        transcript: {
          include: {
            episode: {
              include: {
                podcast: {
                  include: { people: { include: { person: true } } },
                },
              },
            },
          },
        },
      },
      take: 40,
    }),
    db.transcript.findMany({
      where: {
        fullText: { contains: q, mode: "insensitive" },
        segments: { none: {} },
        episode: { is: publicEpisodeWhere },
      },
      include: {
        episode: {
          include: {
            podcast: {
              include: { people: { include: { person: true } } },
            },
          },
        },
      },
      orderBy: { episode: { publishedAt: "desc" } },
      take: 20,
    }),
  ]);

  // Resolve the actual source-reviewed episode host, not the first person linked to a shared show.
  const allEpisodeRows=[...episodes,...transcriptSegments.map(s=>s.transcript.episode),...plainTranscripts.map(t=>t.episode)];
  const podcastIds=[...new Set(allEpisodeRows.map(e=>e.podcastId))];
  const scopedPairs=await Promise.all(podcastIds.map(async id=>
    [id,await feedAttributionForPodcast(id)] as const));
  const scopeIndex=new Map(scopedPairs);
  const hostIds=[...new Set(allEpisodeRows.flatMap(e=>scopeIndex.get(e.podcastId)?.(e)??[]))];
  const attributedPeople=hostIds.length?await db.person.findMany({where:{id:{in:hostIds}}}):[];
  const byPerson=new Map(attributedPeople.map(p=>[p.id,p]));
  const creditedPerson=(episode:(typeof episodes)[number])=>{
    const scoped=scopeIndex.get(episode.podcastId);
    if(!scoped)return episode.podcast.people[0]?.person;
    return scoped(episode).map(id=>byPerson.get(id)).find(p=>p);
  };

  transcriptSegments.sort(
    (a, b) =>
      b.transcript.episode.publishedAt.getTime() -
      a.transcript.episode.publishedAt.getTime(),
  );

  return (
    <div className="detail-page">
      <section className="search-hero">
        <p className="eyebrow">Search the archive</p>
        <h1>Find the conversation.</h1>
        <form className="hero-search" action="/search">
          <input
            name="q"
            defaultValue={q}
            aria-label="Search"
            placeholder="Search people, shows, or episode topics"
          />
          <button type="submit">Search</button>
        </form>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="section-label">People</p>
            <h2>{people.length} matches</h2>
          </div>
        </div>
        <div className="people-results">
          {people.map((person) => (
            <Link className="person-result" href={`/people/${person.slug}`} key={person.id}>
              <IllustratedPortrait
                slug={person.slug}
                name={person.fullName}
                className="illustrated-portrait-search"
              />
              <span>
                <strong>{person.fullName}</strong>
                <small>{officeLabel(person.kind, person.isCurrent, person.state)}</small>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="section-label">Shows</p>
            <h2>{podcasts.length} matches</h2>
          </div>
        </div>
        <div className="search-show-results">
          {podcasts.map((podcast) => {
            return (
              <Link className="search-show-result" href={`/podcasts/${podcast.slug}`} key={podcast.id}>
                <strong>{podcast.title}</strong>
                <span>Public-service podcast archive</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="section-label">Inside the transcripts</p>
            <h2>{transcriptSegments.length + plainTranscripts.length} matches</h2>
          </div>
          <p className="section-explainer">
            Jump straight to the part of the conversation where your search
            term appears.
          </p>
        </div>

        {transcriptSegments.length + plainTranscripts.length > 0 ? (
          <div className="transcript-search-results">
            {transcriptSegments.map((segment) => {
              const episode = segment.transcript.episode;
              const person = creditedPerson(episode);
              return (
                <Link
                  className="transcript-search-result"
                  href={`/episodes/${episode.id}#segment-${segment.id}`}
                  key={segment.id}
                >
                  <span className="transcript-search-time">
                    {transcriptClock(segment.startSeconds)}
                  </span>
                  <span className="transcript-search-copy">
                    <strong>{episode.title}</strong>
                    <small>
                      {person?.fullName ?? "Public servant"} · {episode.podcast.title}
                    </small>
                    <p>{segment.text}</p>
                  </span>
                </Link>
              );
            })}
            {plainTranscripts.map((transcript) => {
              const episode = transcript.episode;
              const person = creditedPerson(episode);
              return (
                <Link
                  className="transcript-search-result"
                  href={`/episodes/${episode.id}#transcript`}
                  key={transcript.id}
                >
                  <span className="transcript-search-time">Text</span>
                  <span className="transcript-search-copy">
                    <strong>{episode.title}</strong>
                    <small>
                      {person?.fullName ?? "Public servant"} · {episode.podcast.title}
                    </small>
                    <p>{excerptAround(transcript.fullText, q)}</p>
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <strong>No transcript matches.</strong>
            <span>Episode titles and descriptions may still match below.</span>
          </div>
        )}
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="section-label">Episodes</p>
            <h2>{episodes.length} matches</h2>
          </div>
        </div>
        <div className="episode-list">
          {episodes.map((episode) => {
            const person = creditedPerson(episode);
            if (!person) return null;
            return (
              <EpisodeCard
                key={episode.id}
                episode={episode}
                podcast={episode.podcast}
                person={person}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
