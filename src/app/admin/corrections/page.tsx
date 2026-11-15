import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Transcript corrections", robots: { index: false, follow: false } };
type Props = { searchParams: Promise<{ updated?: string; error?: string }> };

/** FC-P14: editors review correction requests; nothing changes without a decision here. */
export default async function CorrectionsPage({ searchParams }: Props) {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  const params = await searchParams;
  const [pending, recent] = await Promise.all([
    db.transcriptCorrectionRequest.findMany({
      where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, take: 50,
      include: { episode: { select: { id: true, title: true, podcast: { select: { title: true } } } } },
    }),
    db.transcriptCorrectionRequest.findMany({
      where: { status: { not: "PENDING" } }, orderBy: { reviewedAt: "desc" }, take: 20,
      select: { id: true, status: true, reviewedAt: true, episodeId: true, startSeconds: true, reviewNote: true },
    }),
  ]);
  return (
    <div className="detail-page admin-page">
      <section className="section-block admin-section">
        <p className="section-label">Private editorial</p>
        <h1>Transcript correction requests</h1>
        <p>Requests never change a transcript by themselves. Accepting writes the segment and an immutable revision record, and fails if the segment text changed since the request.</p>
        {params.updated ? <p role="status">Decision recorded.</p> : null}
        {params.error ? <p role="alert">Not applied: {params.error.replace(/[^a-z_]/g, "")}.</p> : null}
        <p><Link href="/admin">← Operations overview</Link> · <Link href="/admin/queues">All queues</Link></p>
      </section>
      <section className="section-block admin-section">
        <h2>{pending.length} pending</h2>
        {pending.map((r) => (
          <article key={r.id} className="admin-card">
            <h3><Link href={`/episodes/${r.episode.id}#transcript`}>{r.episode.title}</Link> · {r.episode.podcast.title} · {Math.floor(r.startSeconds)}s</h3>
            <p><strong>Current:</strong> {r.originalText}</p>
            <p><strong>Proposed:</strong> {r.proposedText}</p>
            <p><strong>Reason:</strong> {r.reason}</p>
            {r.evidenceUrl ? <p><a href={r.evidenceUrl} rel="noreferrer nofollow" target="_blank">Evidence source</a></p> : <p>No evidence link supplied.</p>}
            <form method="post" action="/api/admin/corrections">
              <input type="hidden" name="requestId" value={r.id} />
              <input type="hidden" name="revision" value={r.revision} />
              <label>Final text (optional; defaults to proposed)<textarea name="finalText" rows={2} maxLength={2000} /></label>
              <label>Editor note (required)<input name="note" required minLength={5} maxLength={1000} /></label>
              <button type="submit" name="decision" value="ACCEPTED">Accept correction</button>
              <button type="submit" name="decision" value="REJECTED">Reject</button>
            </form>
          </article>
        ))}
      </section>
      <section className="section-block admin-section">
        <h2>Recent decisions</h2>
        <ul>{recent.map((r) => <li key={r.id}>{r.reviewedAt?.toISOString()} · {r.status} · <Link href={`/episodes/${r.episodeId}#transcript`}>episode</Link> at {Math.floor(r.startSeconds)}s · {r.reviewNote}</li>)}</ul>
      </section>
    </div>
  );
}
