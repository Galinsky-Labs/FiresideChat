import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { HostEvidenceAndReviewForms, NewHostCandidateForm } from "@/components/host-review-forms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Host verification queue", robots: { index: false, follow: false } };
type Props = { searchParams: Promise<{page?:string;status?:string;error?:string;updated?:string}> };
const day = (date:Date|null)=>date?.toISOString().slice(0,10) ?? "unknown";

/** Source-led private review records; never public podcast enrollment. */
export default async function HostReviewsPage({searchParams}:Props) {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  const params=await searchParams;
  const statuses=["PENDING","NEEDS_EVIDENCE","VERIFIED","EXCLUDED_GUEST","REJECTED"] as const;
  const selected=statuses.find(s=>s===params.status);
  const where=selected?{status:selected}:{};
  const requested = Number(params.page ?? "1");
  const page = Number.isSafeInteger(requested) && requested>=1 && requested<=10000 ? requested : 1;
  const perPage=25;
  const [total, reviews, groups] = await Promise.all([
    db.hostReviewCandidate.count({where}),
    db.hostReviewCandidate.findMany({where,orderBy:[{createdAt:"desc"},{id:"desc"}],
      skip:(page-1)*perPage,take:perPage,
      include:{evidence:{orderBy:{observedOn:"desc"}},audit:{orderBy:{revision:"desc"},take:5}}}),
    db.hostReviewCandidate.groupBy({by:["status"],_count:{_all:true}}),
  ]);
  return <div className="detail-page admin-page">
    <section className="search-hero admin-hero">
      <p className="eyebrow">Private editorial review</p><h1>Official podcast host verification</h1>
      <p>Review candidates against source evidence. Queue status does not itself authorize podcast publication or episode attribution.</p>
      <Link href="/admin">Back to operations</Link>
      {params.updated==="1"?<p role="status">The private review record was saved.</p>:null}
      {params.error?<p role="alert">Review update was not saved. Reload the current candidate revision, check required evidence and try a valid operation.</p>:null}
    </section>
    <section className="section-block admin-section"><h2>{total} candidates for this view</h2>
      <nav aria-label="Review status filters">
        <Link href="/admin/host-reviews">All candidates</Link>
        {statuses.map(s=><p key={s}><Link href={"/admin/host-reviews?status="+s}>{s.replaceAll("_"," ")}
          {" "}({groups.find(g=>g.status===s)?._count._all ?? 0})</Link></p>)}
      </nav>
      <p>Shared administrator authentication proves a private review session, not the human operator identity.</p>
      <NewHostCandidateForm />
      {reviews.map(row=><article className="studio-admin-card" key={row.id}>
        <header><strong>{row.officialName} ({row.officialKey}) / {row.showTitle}</strong>
          <span>{row.status.replaceAll("_"," ")} / revision {row.revision}</span></header>
        <p>Claimed role: {row.proposedRole}. Dates: {day(row.hostStartOn)} to {day(row.hostEndOn)}.</p>
        <p>Official identity: <a href={row.identitySourceUrl} target="_blank" rel="noopener noreferrer">Source link</a></p>
        {row.feedCandidateUrl?<p>Candidate feed (not approved): <a href={row.feedCandidateUrl} target="_blank" rel="noopener noreferrer">Feed lead</a></p>:null}
        {row.evidence.map(e=><div key={e.id}>
          <p>{e.kind} / observed {day(e.observedOn)}</p>
          <blockquote>{e.excerpt}</blockquote>
          <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer">Check publisher source</a>
        </div>)}
        {row.evidence.length===0?<p>No evidence submitted.</p>:null}
        <p>Audit: {row.audit.map(a=>a.action+" revision "+a.revision).join("; ") || "None recorded"}</p>
        {row.reviewNote?<p>Reviewer rationale: {row.reviewNote}</p>:null}
      {row.status==="PENDING"||row.status==="NEEDS_EVIDENCE" ? <HostEvidenceAndReviewForms candidateId={row.id} revision={row.revision} role={row.proposedRole} starts={row.hostStartOn?.toISOString().slice(0,10) ?? ""} ends={row.hostEndOn?.toISOString().slice(0,10) ?? ""} /> : null}
      </article>)}
      {reviews.length===0?<p>No candidates on this page.</p>:null}
      <p>{page>1?<Link href={"/admin/host-reviews?"+(selected?"status="+selected+"&":"")+"page="+(page-1)}>Previous</Link>:null}
        {" "}Page {page} of {Math.max(1,Math.ceil(total/perPage))}{" "}
        {page*perPage<total?<Link href={"/admin/host-reviews?"+(selected?"status="+selected+"&":"")+"page="+(page+1)}>Next</Link>:null}</p>
    </section>
  </div>;
}
