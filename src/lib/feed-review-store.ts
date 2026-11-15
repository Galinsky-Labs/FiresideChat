import { db } from "@/lib/db";
import { approveFeedCandidate, FeedReviewError, parseEpisodeEvidence, parseHostEvidence,
  parseReviewCandidate, parseReviewDecision, reviewId, reviewRevision } from "@/lib/feed-review";
import type { FeedScope } from "@/lib/feed-scope";

const actorRef="authenticated-admin-session";
const at=(iso:string|null)=>iso?new Date(iso+"T00:00:00.000Z"):null;
const iso=(value:Date|null)=>value?.toISOString().slice(0,10)??null;
function params(input:Record<string,unknown>){
 return {scopeId:reviewId(input.scopeId),revision:reviewRevision(input.revision)};
}
function expectPending(row:{revision:number;status:string}|null,expected:number){
 if(!row||row.revision!==expected||row.status!=="PENDING")throw new FeedReviewError("STALE_OR_CLOSED_FEED_REVIEW");
}
/** A publisher/host proposal always enters PENDING, never APPROVED. */
export async function submitFeedScope(input:Record<string,unknown>):Promise<string>{
 const c=parseReviewCandidate(input);
 return db.$transaction(async tx=>{
   const podcast=await tx.podcast.findUnique({where:{id:c.podcastId},select:{id:true}});
   if(!podcast)throw new FeedReviewError("UNKNOWN_PODCAST");
   const record=await tx.feedScopeRecord.create({data:{...c,status:"PENDING"}});
   await tx.feedScopeAudit.create({data:{scopeId:record.id,revision:0,actorRef,event:"SUBMITTED",
     note:"Submitted feed identity proposal; ingestion and attribution remain unapproved."}});
   return record.id;
 });
}
export async function attachFeedHost(input:Record<string,unknown>):Promise<void>{
 const {scopeId,revision}=params(input),c=parseHostEvidence(input);
 await db.$transaction(async tx=>{
   const record=await tx.feedScopeRecord.findUnique({where:{id:scopeId}});
   expectPending(record,revision);
   const person=await tx.person.findUnique({where:{id:c.personId},select:{id:true}});
   if(!person)throw new FeedReviewError("UNKNOWN_OFFICIAL");
   const updated=await tx.feedScopeRecord.updateMany({
     where:{id:scopeId,revision,status:"PENDING"},data:{revision:{increment:1}},
   });
   if(updated.count!==1)throw new FeedReviewError("STALE_OR_CLOSED_FEED_REVIEW");
   await tx.feedScopeHost.create({data:{scopeId,personId:c.personId,role:c.role,
     fromOn:at(c.fromOn)!,toOn:at(c.toOn),sourceUrl:c.sourceUrl,observedOn:at(c.observedOn)!}});
   await tx.feedScopeAudit.create({data:{scopeId,revision:revision+1,actorRef,event:"HOST_EVIDENCE_ADDED",
     note:"Host role/source period submitted: "+c.role+" "+c.sourceUrl}});
 });
}
export async function attachFeedEpisode(input:Record<string,unknown>):Promise<void>{
 const {scopeId,revision}=params(input),c=parseEpisodeEvidence(input);
 await db.$transaction(async tx=>{
   const record=await tx.feedScopeRecord.findUnique({where:{id:scopeId}});
   expectPending(record,revision);
   const updated=await tx.feedScopeRecord.updateMany({
     where:{id:scopeId,revision,status:"PENDING"},data:{revision:{increment:1}},
   });
   if(updated.count!==1)throw new FeedReviewError("STALE_OR_CLOSED_FEED_REVIEW");
   await tx.feedScopeEpisode.create({data:{scopeId,guid:c.guid,sourceUrl:c.sourceUrl,observedOn:at(c.observedOn)!}});
   await tx.feedScopeAudit.create({data:{scopeId,revision:revision+1,actorRef,event:"EPISODE_EVIDENCE_ADDED",
     note:"Episode publisher page independently attributed to this exact show: "+c.sourceUrl}});
 });
}
export async function decideFeedScope(input:Record<string,unknown>):Promise<void>{
 const {scopeId,revision}=params(input),decision=parseReviewDecision(input);
 await db.$transaction(async tx=>{
   const record=await tx.feedScopeRecord.findUnique({
     where:{id:scopeId},include:{hosts:true,episodes:true},
   });
   expectPending(record,revision);
   if(!record)throw new FeedReviewError("UNKNOWN_FEED_SCOPE");
   // The submitted date and cited host observations cannot post-date a reviewer decision.
   if(record.hosts.some(h=>iso(h.observedOn)!>decision.reviewedOn))
     throw new FeedReviewError("FUTURE_HOST_EVIDENCE");
   const scope:FeedScope={
     podcastId:record.podcastId,feedUrl:record.feedUrl,publishedTitle:record.publishedTitle,
     publishedWebsite:record.publishedWebsite,mode:record.mode,status:record.status,
     reviewSourceUrl:record.reviewSourceUrl,reviewNote:record.reviewNote,reviewedOn:iso(record.reviewedOn),
     hosts:record.hosts.map(h=>({officialId:h.personId,role:h.role,
       fromDay:iso(h.fromOn)!,toDay:iso(h.toOn)})),
     episodes:record.episodes.map(e=>({guid:e.guid,sourceUrl:e.sourceUrl,observedOn:iso(e.observedOn)!})),
   };
   approveFeedCandidate(scope,decision.decision,decision.reviewSourceUrl,decision.reviewNote,decision.reviewedOn);
   const updated=await tx.feedScopeRecord.updateMany({
     where:{id:scopeId,revision,status:"PENDING"},
     data:{revision:{increment:1},status:decision.decision,reviewSourceUrl:decision.reviewSourceUrl,
       reviewNote:decision.reviewNote,reviewedOn:at(decision.reviewedOn),reviewerRef:actorRef},
   });
   if(updated.count!==1)throw new FeedReviewError("STALE_OR_CLOSED_FEED_REVIEW");
   await tx.feedScopeAudit.create({data:{scopeId,revision:revision+1,actorRef,
     event:decision.decision, note:decision.reviewNote}});
 });
}
/** Explicit operator action changes the active feed only after an approved source review. */
export async function activateReviewedFeed(input:Record<string,unknown>):Promise<void>{
 const {scopeId,revision}=params(input);
 const expectedCurrentUrl=typeof input.expectedCurrentUrl==="string"?input.expectedCurrentUrl:"";
 await db.$transaction(async tx=>{
   const record=await tx.feedScopeRecord.findUnique({where:{id:scopeId}});
   if(!record||record.status!=="APPROVED"||record.revision!==revision)
     throw new FeedReviewError("FEED_NOT_APPROVED");
   const podcast=await tx.podcast.findUnique({where:{id:record.podcastId}});
   if(!podcast||podcast.rssUrl!==expectedCurrentUrl)
     throw new FeedReviewError("FEED_CHANGED_SINCE_REVIEW");
   // Replaying activation for the same canonical source is harmless and does not reset the ETag.
   if(podcast.rssUrl===record.feedUrl)return;
   const lock=await tx.feedScopeRecord.updateMany({
     where:{id:scopeId,revision,status:"APPROVED"},data:{revision:{increment:1}},
   });
   if(lock.count!==1)throw new FeedReviewError("STALE_OR_CLOSED_FEED_REVIEW");
   // The original episodes are retained under their original GUIDs and source provenance.
   const changed=await tx.podcast.updateMany({where:{
     id:record.podcastId,rssUrl:expectedCurrentUrl,
   },data:{
     rssUrl:record.feedUrl,feedEtag:null,feedLastModified:null,resolvedFeedUrl:null,
     nextRetryAt:null,consecutiveFailures:0,lastError:null,
   }});
   if(changed.count!==1)throw new FeedReviewError("FEED_CHANGED_SINCE_REVIEW");
   await tx.feedScopeAudit.create({data:{scopeId,revision:revision+1,
     actorRef,event:"ACTIVATED",note:"Approved source activated; historical episodes retained. Previous feed: "+expectedCurrentUrl},
   });
 });
}
