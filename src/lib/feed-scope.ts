import type { NormalizedEpisode, ParsedFeed } from "./feeds/types";

export type FeedScopeMode = "DEDICATED" | "SHARED";
export type FeedScopeStatus = "PENDING" | "APPROVED" | "REJECTED";
export type ScopedHost = {officialId: string; role: "HOST"|"COHOST"|"OFFICIAL_PRODUCER"; fromDay: string; toDay: string|null};
export type ApprovedEpisode = {guid: string; sourceUrl: string; observedOn: string};
export type FeedScope = {
 podcastId: string; feedUrl: string; publishedTitle: string; publishedWebsite: string|null;
 mode: FeedScopeMode; status: FeedScopeStatus; reviewSourceUrl: string|null;
 reviewNote: string|null; reviewedOn: string|null; hosts: readonly ScopedHost[];
 episodes: readonly ApprovedEpisode[];
};
export type ScopeResult = {state:"BLOCKED";reason:string} | {state:"ALLOWED";episodes:NormalizedEpisode[];skipped:number};
const key=/^[a-zA-Z0-9_-]{1,128}$/;
function day(value:unknown):value is string {
 if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const d=new Date(value+"T00:00:00.000Z");return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;
}
function safeHttps(value:unknown):boolean {
 if(typeof value!=="string"||value.length>2048)return false;
 try {const u=new URL(value);return u.protocol==="https:"&&!!u.hostname&&!u.username&&!u.password&&!u.hash&&!u.search&&!u.port&&u.href===value;}catch{return false;}
}
function sameFeedIdentity(expected:FeedScope,actual:{feedUrl:string;title:string|null;websiteUrl:string|null}):boolean {
 return expected.feedUrl===actual.feedUrl && expected.publishedTitle===actual.title &&
   (expected.publishedWebsite===null||expected.publishedWebsite===actual.websiteUrl);
}
export function validateFeedScope(scope:FeedScope):void {
 if(!scope||!key.test(scope.podcastId)||!safeHttps(scope.feedUrl)||typeof scope.publishedTitle!=="string"||
   scope.publishedTitle.trim().length<3||scope.publishedTitle.length>200||!["DEDICATED","SHARED"].includes(scope.mode)||
   !["PENDING","APPROVED","REJECTED"].includes(scope.status)) throw new Error("INVALID_FEED_SCOPE");
 if(scope.publishedWebsite!==null&&!safeHttps(scope.publishedWebsite))throw new Error("INVALID_PUBLISHER_IDENTITY");
 if(!Array.isArray(scope.hosts)||scope.hosts.length>100||!Array.isArray(scope.episodes)||scope.episodes.length>10000)
   throw new Error("INVALID_SCOPE_COLLECTION");
 if(scope.status==="APPROVED"&&(!safeHttps(scope.reviewSourceUrl)||!day(scope.reviewedOn)||
   typeof scope.reviewNote!=="string"||scope.reviewNote.trim().length<20))throw new Error("MISSING_APPROVAL_SOURCE");
 const seenHosts=new Set<string>();
 for(const host of scope.hosts){
   if(!key.test(host.officialId)||!["HOST","COHOST","OFFICIAL_PRODUCER"].includes(host.role)||!day(host.fromDay)||
    (host.toDay!==null&&(!day(host.toDay)||host.toDay<host.fromDay)))throw new Error("INVALID_HOST_PERIOD");
   const identity=host.officialId+"|"+host.role+"|"+host.fromDay;
   if(seenHosts.has(identity))throw new Error("DUPLICATE_HOST_PERIOD");
   seenHosts.add(identity);
 }
 const seenEpisodes=new Set<string>();
 for(const e of scope.episodes){
   if(typeof e.guid!=="string"||!e.guid.trim()||e.guid.length>1024||!safeHttps(e.sourceUrl)||!day(e.observedOn)||
     seenEpisodes.has(e.guid))throw new Error("INVALID_EPISODE_APPROVAL");
   seenEpisodes.add(e.guid);
 }
 if(scope.status==="APPROVED"&&scope.hosts.length===0)throw new Error("NO_VERIFIED_HOST_PERIOD");
 if(scope.status==="APPROVED"&&scope.mode==="SHARED"&&scope.episodes.length===0)
   throw new Error("SHARED_FEED_NEEDS_EPISODE_EVIDENCE");
}
export function filterScopedFeed(parsed:ParsedFeed,actualUrl:string,scope:FeedScope):ScopeResult {
 validateFeedScope(scope);
 if(scope.status!=="APPROVED")return {state:"BLOCKED",reason:"FEED_SCOPE_NOT_APPROVED"};
 if(!sameFeedIdentity(scope,{feedUrl:actualUrl,title:parsed.metadata.title,websiteUrl:parsed.metadata.websiteUrl}))
   return {state:"BLOCKED",reason:"FEED_IDENTITY_CHANGED"};
 const allow=scope.mode==="SHARED"?new Set(scope.episodes.map(e=>e.guid)):null;
 const eligible=parsed.episodes.filter(e=>{
   if (!(e.publishedAt instanceof Date) || !Number.isFinite(e.publishedAt.getTime())) return false;
   if(allow&&!allow.has(e.guid))return false;
   const on=e.publishedAt.toISOString().slice(0,10);
   return scope.hosts.some(h=>on>=h.fromDay&&(!h.toDay||on<=h.toDay));
 });
 return {state:"ALLOWED",episodes:eligible,skipped:parsed.episodes.length-eligible.length};
}
/** Per-official attribution never relies on the first person attached to the show. */
export function eligibleOfficialIds(scope:FeedScope,episode:{guid:string;publishedAt:Date}):string[]{
 validateFeedScope(scope);if(scope.status!=="APPROVED")return [];
 if(scope.mode==="SHARED"&&!scope.episodes.some(e=>e.guid===episode.guid))return [];
 if (!(episode.publishedAt instanceof Date) || !Number.isFinite(episode.publishedAt.getTime())) return [];
 const on=episode.publishedAt.toISOString().slice(0,10);
 return [...new Set(scope.hosts.filter(h=>on>=h.fromDay&&(!h.toDay||on<=h.toDay)).map(h=>h.officialId))].sort();
}

/** Do not overwrite another feed's GUID; legacy rows may be tagged only if media and date agree exactly. */
export function canPreserveLegacyEpisode(previous:{
 sourceFeedUrl:string|null;audioUrl:string;publishedAt:Date;
},episode:Pick<NormalizedEpisode,"audioUrl"|"publishedAt">,approvedFeedUrl:string):boolean {
 if(!previous||!previous.publishedAt||!episode.publishedAt||!previous.audioUrl)return false;
 if(previous.sourceFeedUrl!==null&&previous.sourceFeedUrl!==approvedFeedUrl)return false;
 if (!Number.isFinite(previous.publishedAt.getTime()) || !Number.isFinite(episode.publishedAt.getTime())) return false;
 return previous.audioUrl===episode.audioUrl &&
   previous.publishedAt.getTime()===episode.publishedAt.getTime();
}

/** A reviewed podcast may only recover transcripts for its explicitly scoped source. */
export function transcriptScopePredicate(scope:FeedScope):{sourceFeedUrl:string;guid?:{in:string[]}}{
 validateFeedScope(scope);
 if(scope.status!=="APPROVED")throw new Error("TRANSCRIPT_SCOPE_UNAPPROVED");
 return {sourceFeedUrl:scope.feedUrl,
   ...(scope.mode==="SHARED"?{guid:{in:scope.episodes.map(e=>e.guid)}}:{})};
}
