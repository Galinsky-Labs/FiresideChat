import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EpisodeCard } from "@/components/episode-card";
import { VideoChatCard } from "@/components/video-chat-card";
import { IllustratedPortrait } from "@/components/illustrated-portrait";
import { profileForSlug } from "@/data/person-profiles";
import { db } from "@/lib/db";
import { officeLabel } from "@/lib/presentation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const person = await db.person.findUnique({
    where: { slug },
    select: { fullName: true },
  });
  const profile = profileForSlug(slug);

  return {
    title: person?.fullName ?? "Public servant",
    description:
      profile?.summary ??
      (person
        ? `Listen to ${person.fullName}'s podcast archive on Fireside Chat.`
        : undefined),
  };
}

export default async function PersonPage({ params }: Props) {
  const { slug } = await params;
  const person = await db.person.findUnique({
    where: { slug },
    include: {
      videos: {
        where: { active: true },
        orderBy: { publishedAt: "desc" },
        take: 50,
      },
      podcasts: {
        include: {
          podcast: {
            include: {
              episodes: {
                orderBy: { publishedAt: "desc" },
                take: 30,
              },
            },
          },
        },
      },
    },
  });

  if (!person) notFound();

  const profile = profileForSlug(person.slug);

  return (
    <div className="detail-page">
      <section className="person-hero person-hero-editorial">
        <IllustratedPortrait
          slug={person.slug}
          name={person.fullName}
          className="illustrated-portrait-hero"
          large
        />
        <div>
          <p className="eyebrow">
            {officeLabel(person.kind, person.isCurrent, person.state)}
          </p>
          <h1>{person.fullName}</h1>
          {profile ? (
            <>
              <p className="person-strapline">{profile.strapline}</p>
              <p className="lede compact-lede">{profile.summary}</p>
            </>
          ) : (
            <p className="lede compact-lede">
              Hear {person.fullName} directly, in full-length conversations
              rather than clips or commentary.
            </p>
          )}
        </div>
      </section>

      {profile ? (
        <>
          <section className="section-block editorial-profile-section">
            <div className="profile-story-grid">
              <div>
                <p className="section-label">The story</p>
                <h2>Why this career matters.</h2>
              </div>
              <div className="profile-essay">
                {profile.biography.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>

            <blockquote className="civic-question">
              <span>The civic question</span>
              <p>{profile.civicQuestion}</p>
            </blockquote>
          </section>

          <section className="section-block legislative-record-section">
            <div className="section-heading legislative-heading">
              <div>
                <p className="section-label">
                  {profile.recordLabel ?? "Legislative record"}
                </p>
                <h2>What changed—or what they tried to change.</h2>
              </div>
              <p className="section-explainer">
                Status matters here. Enacted laws, chamber passage,
                institution-building, oversight and unfinished campaigns are
                labeled separately rather than blurred together.
              </p>
            </div>

            <div className="achievement-grid">
              {profile.achievements.map((achievement) => (
                <article className="achievement-card" key={achievement.title}>
                  <span className="achievement-eyebrow">
                    {achievement.eyebrow}
                  </span>
                  <h3>{achievement.title}</h3>
                  <p>{achievement.body}</p>
                  <a
                    className="achievement-source"
                    href={achievement.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {achievement.sourceLabel} ↗
                  </a>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {person.videos.length > 0 ? (
        <section className="section-block">
          <div className="section-heading"><div>
            <p className="section-label">In their own words</p>
            <h2>Personal video conversations</h2>
          </div></div>
          <div className="video-chat-grid">
            {person.videos.map((video) => (
              <VideoChatCard key={video.id} video={{ ...video, person }} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="section-label">Shows</p>
            <h2>Podcast archive</h2>
          </div>
        </div>
        <div className="person-shows">
          {person.podcasts.map(({ podcast, role }) => (
            <div className="person-show" key={podcast.id}>
              <div>
                <span className="role-badge">{role.replaceAll("_", " ")}</span>
                <h3>
                  <Link href={`/podcasts/${podcast.slug}`}>{podcast.title}</Link>
                </h3>
                <p>{podcast.feedDescription ?? podcast.description}</p>
              </div>
              <Link className="text-link" href={`/podcasts/${podcast.slug}`}>
                Open show →
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="section-label">Listen</p>
            <h2>Recent episodes</h2>
          </div>
        </div>
        <div className="episode-list">
          {person.podcasts.flatMap(({ podcast }) =>
            podcast.episodes.map((episode) => (
              <EpisodeCard
                key={episode.id}
                episode={episode}
                podcast={podcast}
                person={person}
              />
            )),
          )}
        </div>
      </section>
    </div>
  );
}
