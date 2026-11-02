import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Operations",
  robots: { index: false, follow: false },
};

function dateTime(value: Date | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(value);
}

function statusLabel(
  podcast: {
    lastSuccessfulCheckAt: Date | null;
    consecutiveFailures: number;
    nextRetryAt: Date | null;
  },
  staleCutoff: Date,
  now: Date,
) {
  if (podcast.consecutiveFailures > 0) return "Failing";
  if (!podcast.lastSuccessfulCheckAt) return "Never synced";
  if (podcast.lastSuccessfulCheckAt < staleCutoff) return "Stale";
  if (podcast.nextRetryAt && podcast.nextRetryAt > now) return "Backoff";
  return "Healthy";
}

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  const staleHoursRaw = Number.parseInt(
    process.env.ADMIN_STALE_FEED_HOURS ?? "36",
    10,
  );
  const staleHours =
    Number.isInteger(staleHoursRaw) && staleHoursRaw > 0 ? staleHoursRaw : 36;
  const [clockRows, podcasts, transcriptGroups, recentRuns, failedTranscriptions, pendingPublisher, pendingDiscovery] =
    await Promise.all([
      db.$queryRaw<Array<{ now: Date }>>`SELECT NOW() AS now`,
      db.podcast.findMany({
        where: { active: true },
        orderBy: { title: "asc" },
        include: { _count: { select: { episodes: true } } },
      }),
      db.episode.groupBy({
        by: ["transcriptStatus"],
        _count: { _all: true },
      }),
      db.ingestionRun.findMany({
        orderBy: { startedAt: "desc" },
        take: 25,
        include: {
          podcast: { select: { title: true, slug: true } },
        },
      }),
      db.episode.findMany({
        where: {
          transcriptStatus: "FAILED",
          publisherTranscriptUrl: null,
        },
        orderBy: { transcriptionLastAttemptAt: "desc" },
        take: 25,
        include: {
          podcast: { select: { title: true, slug: true } },
        },
      }),
      db.episode.count({
        where: { publisherTranscriptUrl: { not: null }, transcript: { is: null } },
      }),
      db.episode.count({
        where: { episodeUrl: { not: null }, publisherTranscriptUrl: null, transcript: { is: null } },
      }),
    ]);

  const now = clockRows[0]?.now;
  if (!now) throw new Error("Database clock query returned no rows");
  const staleBefore = new Date(now.getTime() - staleHours * 60 * 60 * 1000);

  const feedRows = podcasts.map((podcast) => ({
    ...podcast,
    health: statusLabel(podcast, staleBefore, now),
  }));
  const unhealthy = feedRows.filter((podcast) => podcast.health !== "Healthy");
  const transcriptCounts = new Map(
    transcriptGroups.map((group) => [
      group.transcriptStatus,
      group._count._all,
    ]),
  );
  const totalEpisodes = [...transcriptCounts.values()].reduce(
    (sum, count) => sum + count,
    0,
  );
  const completeTranscripts = transcriptCounts.get("COMPLETE") ?? 0;
  const coverage =
    totalEpisodes > 0
      ? Math.round((completeTranscripts / totalEpisodes) * 100)
      : 0;

  return (
    <div className="detail-page admin-page">
      <section className="search-hero admin-hero">
        <div className="admin-hero-heading">
          <div>
            <p className="eyebrow">Private operations</p>
            <h1>Archive control room.</h1>
          </div>
          <form action="/api/admin/logout" method="post">
            <button className="admin-logout" type="submit">
              Sign out
            </button>
          </form>
        </div>

        <div className="admin-stat-grid">
          <article>
            <strong>{podcasts.length}</strong>
            <span>Active feeds</span>
          </article>
          <article>
            <strong>{unhealthy.length}</strong>
            <span>Feeds needing attention</span>
          </article>
          <article>
            <strong>{coverage}%</strong>
            <span>Transcript coverage</span>
          </article>
          <article>
            <strong>{failedTranscriptions.length}</strong>
            <span>Recent transcript failures</span>
          </article>
        </div>
      </section>

      <section className="section-block admin-section">
        <div className="section-heading"><div><p className="section-label">Studio business</p><h2>Congressional podcast production inquiries</h2></div>
          <Link href="/admin/production-inquiries">View private requests and contact details →</Link>
          <Link href="/admin/feed-scopes">Review historical feed identities and source scope →</Link>
        </div>
      </section>

      <section className="section-block admin-section">
        <div className="section-heading">
          <div>
            <p className="section-label">Source health</p>
            <h2>Every active show.</h2>
          </div>
          <p className="section-explainer">
            A feed is considered stale after {staleHours} hours without a
            successful check.
          </p>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Show</th>
                <th>Status</th>
                <th>Episodes</th>
                <th>Last success</th>
                <th>Failures</th>
                <th>Retry</th>
              </tr>
            </thead>
            <tbody>
              {feedRows.map((podcast) => (
                <tr key={podcast.id}>
                  <td>
                    <Link href={`/podcasts/${podcast.slug}`}>{podcast.title}</Link>
                    {podcast.lastError ? (
                      <small className="admin-row-error">{podcast.lastError}</small>
                    ) : null}
                  </td>
                  <td>
                    <span
                      className={`admin-health admin-health-${podcast.health
                        .toLowerCase()
                        .replaceAll(" ", "-")}`}
                    >
                      {podcast.health}
                    </span>
                  </td>
                  <td>{podcast._count.episodes.toLocaleString()}</td>
                  <td>{dateTime(podcast.lastSuccessfulCheckAt)}</td>
                  <td>{podcast.consecutiveFailures}</td>
                  <td>{podcast.nextRetryAt ? dateTime(podcast.nextRetryAt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section-block admin-section">
        <div className="section-heading">
          <div>
            <p className="section-label">Transcript pipeline</p>
            <h2>Coverage and failures.</h2>
          </div>
        </div>

        <div className="admin-transcript-grid">
          <article>
            <strong>{pendingPublisher.toLocaleString()}</strong>
            <span>Publisher links awaiting recovery</span>
          </article>
          <article>
            <strong>{pendingDiscovery.toLocaleString()}</strong>
            <span>Episodes eligible for website discovery</span>
          </article>
          {(
            ["COMPLETE", "AVAILABLE", "QUEUED", "PROCESSING", "MISSING", "FAILED"] as const
          ).map((status) => (
              <article key={status}>
                <strong>{(transcriptCounts.get(status) ?? 0).toLocaleString()}</strong>
                <span>{status.toLowerCase()}</span>
              </article>
            ),
          )}
        </div>

        {failedTranscriptions.length > 0 ? (
          <div className="admin-failure-list">
            {failedTranscriptions.map((episode) => (
              <article key={episode.id}>
                <div>
                  <strong>{episode.title}</strong>
                  <span>{episode.podcast.title}</span>
                </div>
                <div>
                  <span>{episode.transcriptionAttempts} attempts</span>
                  <span>{dateTime(episode.transcriptionLastAttemptAt)}</span>
                </div>
                <p>{episode.transcriptionLastError ?? "No failure message recorded."}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>No generated-transcript failures.</strong>
            <span>The fallback pipeline has no unresolved failed episodes.</span>
          </div>
        )}
      </section>

      <section className="section-block admin-section">
        <div className="section-heading">
          <div>
            <p className="section-label">Recent ingestion</p>
            <h2>Last 25 feed runs.</h2>
          </div>
        </div>

        <div className="admin-run-list">
          {recentRuns.map((run) => (
            <article key={run.id}>
              <div>
                <strong>{run.podcast.title}</strong>
                <span>{dateTime(run.startedAt)}</span>
              </div>
              <span className={`admin-run-status admin-run-${run.status.toLowerCase()}`}>
                {run.status}
              </span>
              <span>
                +{run.episodesCreated} new · {run.episodesUpdated} updated
              </span>
              {run.error ? <p>{run.error}</p> : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
