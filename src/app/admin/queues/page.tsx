import type { Metadata } from "next";
import Link from "next/link";
import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { summarizeQueues } from "@/lib/ops-queues";
import { readOpsQueues } from "@/lib/ops-queues-store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Editorial and operations queues", robots: { index: false, follow: false } };
type Props = { searchParams: Promise<{ applied?: string; duplicate?: string; error?: string }> };

/** FC-P17: every work queue in one protected view; counts only, no private details. */
export default async function OpsQueuesPage({ searchParams }: Props) {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  const params = await searchParams;
  const [{ checkedAt, staleHours, generation, queues }, failingFeeds, recentActions] = await Promise.all([
    readOpsQueues(),
    db.podcast.findMany({
      where: { active: true, OR: [{ consecutiveFailures: { gt: 0 } }, { lastSuccessfulCheckAt: null }] },
      orderBy: { title: "asc" }, take: 25,
      select: { id: true, title: true, slug: true, consecutiveFailures: true, lastError: true, lastSuccessfulCheckAt: true },
    }),
    db.opsAction.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  const summary = summarizeQueues(queues);
  const nonce = () => randomBytes(16).toString("hex");
  return (
    <div className="detail-page admin-page">
      <section className="section-block admin-section">
        <p className="section-label">Private operations</p>
        <h1>Editorial and operations queues</h1>
        <p>Checked {checkedAt.toISOString()} · stale window {staleHours}h · generated transcription: <strong>{generation}</strong></p>
        <p>{summary.actionNeeded} items need editorial action · {summary.watching} being processed automatically · {summary.clearQueues} queues clear</p>
        {params.applied !== undefined ? <p role="status">Action applied ({Number(params.applied) || 0} rows).</p> : null}
        {params.duplicate !== undefined ? <p role="status">That request was already applied; nothing changed.</p> : null}
        {params.error ? <p role="alert">The action was not applied ({params.error === "invalid" ? "invalid request" : "temporarily unavailable"}).</p> : null}
        <p><Link href="/admin">← Operations overview</Link> · <Link href="/admin/host-reviews">Host reviews</Link> · <Link href="/admin/feed-scopes">Feed scopes</Link></p>
      </section>
      <section className="section-block admin-section">
        <table className="admin-table">
          <thead><tr><th scope="col">Queue</th><th scope="col">Count</th><th scope="col">Status</th><th scope="col">Meaning</th></tr></thead>
          <tbody>
            {queues.map((q) => (
              <tr key={q.key}><th scope="row">{q.label}</th><td>{q.count}</td><td>{q.severity}</td><td>{q.explanation}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="section-block admin-section">
        <h2>Feeds needing attention</h2>
        {failingFeeds.length === 0 ? <p>No failing or never-synced active feeds.</p> : (
          <table className="admin-table">
            <thead><tr><th scope="col">Show</th><th scope="col">Failures</th><th scope="col">Last success</th><th scope="col">Retry</th></tr></thead>
            <tbody>
              {failingFeeds.map((feed) => (
                <tr key={feed.id}>
                  <th scope="row"><Link href={`/podcasts/${feed.slug}`}>{feed.title}</Link></th>
                  <td>{feed.consecutiveFailures}</td>
                  <td>{feed.lastSuccessfulCheckAt?.toISOString().slice(0, 10) ?? "never"}</td>
                  <td>
                    <form method="post" action="/api/admin/queues">
                      <input type="hidden" name="action" value="clear-feed-backoff" />
                      <input type="hidden" name="podcastId" value={feed.id} />
                      <input type="hidden" name="nonce" value={nonce()} />
                      <button type="submit">Clear retry backoff</button>
                    </form>
                    <form method="post" action="/api/admin/queues">
                      <input type="hidden" name="action" value="requeue-web-discovery" />
                      <input type="hidden" name="podcastId" value={feed.id} />
                      <input type="hidden" name="nonce" value={nonce()} />
                      <button type="submit">Re-search transcripts</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section className="section-block admin-section">
        <h2>Recent operator actions</h2>
        {recentActions.length === 0 ? <p>None recorded.</p> : (
          <ul>{recentActions.map((a) => <li key={a.id}>{a.createdAt.toISOString()} · {a.action} · {a.affected} rows · {a.actorRef}</li>)}</ul>
        )}
      </section>
    </div>
  );
}
