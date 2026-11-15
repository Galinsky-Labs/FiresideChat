import Link from "next/link";
import { EpisodeCard } from "@/components/episode-card";
import { ShowCard } from "@/components/show-card";
import { VideoChatCard } from "@/components/video-chat-card";
import { LiveArchiveStats } from "@/components/live-archive-stats";
import { getArchiveStats } from "@/lib/archive-stats";
import { db } from "@/lib/db";
import { selectHomepageEpisodes } from "@/lib/homepage-selection";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const episodeInclude = {
  podcast: {
    include: {
      people: { include: { person: true } },
    },
  },
} as const;

export default async function Home() {
  const [
    chronologicalEpisodes,
    podcasts,
    archiveStats,
    latestVideos,
  ] = await Promise.all([
    db.episode.findMany({
      orderBy: { publishedAt: "desc" },
      take: 250,
      include: episodeInclude,
    }),
    db.podcast.findMany({
      where: { active: true },
      orderBy: [{ lastEpisodeAt: "desc" }, { title: "asc" }],
      include: {
        people: { include: { person: true } },
        episodes: {
          orderBy: { publishedAt: "desc" },
          take: 3,
        },
      },
    }),
    getArchiveStats(),
    db.videoChat.findMany({
      where: { active: true },
      include: { person: true },
      orderBy: { publishedAt: "desc" },
      take: 6,
    }),
  ]);

  const latestEpisodes = selectHomepageEpisodes(chronologicalEpisodes, 6);

  return (
    <>
      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow">The public-service podcast archive</p>
          <h1>Hear them yourself.</h1>
          <p className="lede">
            Full conversations with current and former members of Congress and
            presidents — collected in one place, without commentary in between.
          </p>
          <form className="hero-search" action="/search">
            <input
              name="q"
              aria-label="Search Fireside Chat"
              placeholder="Search a person, show, or episode topic"
            />
            <button type="submit">Search archive</button>
          </form>
          <LiveArchiveStats initialStats={archiveStats} />
        </div>

        <aside className="civic-note">
          <span className="civic-seal" aria-hidden="true">FC</span>
          <p>
            <strong>Direct source.</strong> Fireside Chat preserves the complete
            programs politicians choose to make, so you can hear what they
            actually said in context.
          </p>
        </aside>
      </section>

      <section className="section-block latest-section">
        <div className="section-heading">
          <div>
            <p className="section-label">Latest</p>
            <h2>New across the archive</h2>
          </div>
        </div>

        {latestEpisodes.length > 0 ? (
          <div className="latest-grid">
            {latestEpisodes.map(({ episode, person, featured }) => (
              <EpisodeCard
                key={episode.id}
                featured={featured}
                episode={episode}
                podcast={episode.podcast}
                person={person}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>The archive is ready for its first sync.</strong>
            <span>Run <code>npm run ingest:feeds</code> and reload this page.</span>
          </div>
        )}
      </section>

      <section className="section-block" id="video-conversations">
        <div className="section-heading">
          <div>
            <p className="section-label">Beyond podcasts</p>
            <h2>Personal conversations</h2>
          </div>
          <Link className="text-link" href="/videos">Browse all videos →</Link>
        </div>
        {latestVideos.length ? (
          <div className="video-chat-grid">
            {latestVideos.map((video) => <VideoChatCard key={video.id} video={video} />)}
          </div>
        ) : (
          <p className="section-explainer">Verified personal chats and livestreams will appear here.</p>
        )}
      </section>

      <section className="section-block" id="shows">
        <div className="section-heading">
          <div>
            <p className="section-label">Directory</p>
            <h2>Shows from across public life</h2>
          </div>
          <p className="section-explainer">
            Current and former officeholders are presented under the same
            inclusion rule.
          </p>
        </div>

        <div className="show-grid">
          {podcasts.map((podcast) => (
            <ShowCard key={podcast.id} podcast={podcast} />
          ))}
        </div>
      </section>

      <section className="studio-home-cta" aria-labelledby="production-cta-title">
        <div><p className="section-label">For members of Congress</p><h2 id="production-cta-title">Thinking about starting a podcast?</h2>
          <p>Fireside Chat also helps congressional offices explore podcast production, from planning to launch.</p></div>
        <Link href="/podcast-production">Request production services →</Link>
      </section>
      <section className="principle-band">
        <p className="section-label">One simple principle</p>
        <h2>Less interpretation. More primary source.</h2>
        <p>
          Fireside Chat is independent and is not affiliated with or endorsed
          by the public officials whose publicly available podcasts it indexes.
        </p>
      </section>
    </>
  );
}
