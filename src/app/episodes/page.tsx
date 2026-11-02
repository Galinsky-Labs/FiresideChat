import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EpisodeCard } from "@/components/episode-card";
import { db } from "@/lib/db";
import { archiveVisibleWhere } from "@/lib/feed-scope-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Episodes",
  description:
    "Browse the complete Fireside Chat episode archive, newest first.",
};

const PAGE_SIZE = 50;

type Props = {
  searchParams: Promise<{ page?: string }>;
};

export default async function EpisodesPage({ searchParams }: Props) {
  const query = await searchParams;
  const requestedPage = Number.parseInt(query.page ?? "1", 10);
  const pageNumber =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const visible=await archiveVisibleWhere();
  const where={AND:[{podcast:{active:true}},visible]};
  const totalEpisodes = await db.episode.count({where});
  const totalPages = Math.max(1, Math.ceil(totalEpisodes / PAGE_SIZE));
  if (pageNumber > totalPages && totalEpisodes > 0) notFound();

  const episodes = await db.episode.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    skip: (pageNumber - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      podcast: {
        include: {
          people: { include: { person: true } },
        },
      },
    },
  });

  return (
    <div className="detail-page">
      <section className="search-hero">
        <p className="eyebrow">Episode archive</p>
        <h1>Every conversation, newest first.</h1>
        <p className="lede compact-lede">
          Browse the complete episode archive across every active Fireside Chat
          show, then open any episode for its notes, transcript, and timestamp
          playback.
        </p>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="section-label">All episodes</p>
            <h2>{totalEpisodes.toLocaleString()} in the archive</h2>
          </div>
          {totalPages > 1 ? (
            <span className="page-count">
              Page {pageNumber} of {totalPages}
            </span>
          ) : null}
        </div>

        {episodes.length > 0 ? (
          <>
            <div className="episode-list">
              {episodes.map((episode) => {
                const person = episode.podcast.people[0]?.person;
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

            {totalPages > 1 ? (
              <nav className="pagination" aria-label="Episode archive pages">
                {pageNumber > 1 ? (
                  <Link href={`/episodes?page=${pageNumber - 1}`}>
                    ← Newer episodes
                  </Link>
                ) : (
                  <span />
                )}
                {pageNumber < totalPages ? (
                  <Link href={`/episodes?page=${pageNumber + 1}`}>
                    Older episodes →
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </>
        ) : (
          <div className="empty-state">
            <strong>The episode archive is waiting for its first sync.</strong>
            <span>Newly ingested episodes will appear here automatically.</span>
          </div>
        )}
      </section>
    </div>
  );
}
