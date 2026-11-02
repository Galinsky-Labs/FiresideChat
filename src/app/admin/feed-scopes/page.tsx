import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { FeedScopeActions, NewFeedScopeForm } from "@/components/feed-scope-forms";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Historical feed review",robots:{index:false,follow:false}};
type Props={searchParams:Promise<{page?:string;status?:string;updated?:string;error?:string}>};
const date=(d:Date|null)=>d?.toISOString().slice(0,10)??"unspecified";

export default async function FeedScopeReviewPage({searchParams}:Props){
 if(!(await isAdminAuthenticated()))redirect("/admin/login");
 const params=await searchParams;
 const statuses=["PENDING","APPROVED","REJECTED"] as const;
 const status=statuses.find(v=>v===params.status);
 const requested=Number(params.page??"1");
 const page=Number.isSafeInteger(requested)&&requested>0&&requested<10000?requested:1;
 const perPage=20;
 const where=status?{status}:{};
 const [podcasts,rows,total,groups]=await Promise.all([
   db.podcast.findMany({orderBy:{title:"asc"},select:{id:true,title:true,rssUrl:true},take:1000}),
   db.feedScopeRecord.findMany({where,orderBy:[{createdAt:"desc"},{id:"desc"}],
     skip:(page-1)*perPage,take:perPage,
     include:{podcast:{select:{title:true,rssUrl:true}},hosts:true,episodes:true,audit:{orderBy:{revision:"desc"},take:8}}}),
   db.feedScopeRecord.count({where}),
   db.feedScopeRecord.groupBy({by:["status"],_count:{_all:true}}),
 ]);
 return <div className="detail-page admin-page">
  <section className="search-hero admin-hero">
   <p className="eyebrow">Private editorial review</p><h1>Historical feed identity and role changes</h1>
   <p>Multiple feeds and multiple roles can refer to a show. Never infer host credit or an episode from publisher networks, names or a shared feed alone.</p>
   <Link href="/admin">Back to operations</Link>
   {params.updated==="1"?<p role="status">Private source review recorded.</p>:null}
   {params.error?<p role="alert">The submitted change was not recorded. Recheck evidence and the current revision.</p>:null}
  </section>
  <section className="section-block admin-section">
   <NewFeedScopeForm podcasts={podcasts}/>
  </section>
  <section className="section-block admin-section">
   <h2>Review ledger: {total} candidates in this view</h2>
   <nav aria-label="Review filters">
    <Link href="/admin/feed-scopes">All</Link>
    {statuses.map(s=><p key={s}><Link href={"/admin/feed-scopes?status="+s}>{s} ({groups.find(g=>g.status===s)?._count._all??0})</Link></p>)}
   </nav>
   {rows.map(row=><article className="studio-admin-card" key={row.id}>
    <header><strong>{row.podcast.title}: {row.publishedTitle}</strong>
     <span>{row.mode} / {row.status} / revision {row.revision}</span></header>
    <p>Proposed source: <a href={row.feedUrl} target="_blank" rel="noopener noreferrer">Review RSS/Atom source</a></p>
    <p>Configured current feed: <a href={row.podcast.rssUrl} target="_blank" rel="noopener noreferrer">Current source</a></p>
    <p>Publisher snapshot: {row.publishedWebsite?"known":"not recorded"}</p>
    {row.reviewSourceUrl?<p>Decision source: <a href={row.reviewSourceUrl} target="_blank" rel="noopener noreferrer">Original publisher citation</a></p>:null}
    {row.reviewNote?<p>Reviewer rationale: {row.reviewNote}</p>:null}
    <h3>Host periods ({row.hosts.length})</h3>
    {row.hosts.map(h=><p key={h.id}>{h.personId} / {h.role}, {date(h.fromOn)} - {date(h.toOn)}.
      {" "}<a href={h.sourceUrl} target="_blank" rel="noopener noreferrer">Host credit source</a></p>)}
    <h3>Approved episode GUID candidates ({row.episodes.length})</h3>
    {row.episodes.slice(0,30).map(e=><p key={e.id}>{e.guid} / <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer">Episode source</a></p>)}
    {row.episodes.length>30?<p>Showing first 30 cited GUIDs. Consult the database for complete source list.</p>:null}
    <p>Audit: {row.audit.map(a=>a.event+" revision "+a.revision).join("; ")||"No audit events"}</p>
    <FeedScopeActions id={row.id} revision={row.revision} status={row.status} currentFeedUrl={row.podcast.rssUrl}/>
   </article>)}
   {rows.length===0?<p>No candidates in this view.</p>:null}
   <p>{page>1?<Link href={"/admin/feed-scopes?"+(status?"status="+status+"&":"")+"page="+(page-1)}>Previous</Link>:null}
    {" "}Page {page} of {Math.max(1,Math.ceil(total/perPage))}{" "}
    {page*perPage<total?<Link href={"/admin/feed-scopes?"+(status?"status="+status+"&":"")+"page="+(page+1)}>Next</Link>:null}</p>
  </section>
 </div>;
}
