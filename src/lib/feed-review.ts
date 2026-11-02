import { validateFeedScope, type FeedScope } from "./feed-scope";

export class FeedReviewError extends Error {
  constructor(readonly code:string){super(code);this.name="FeedReviewError";}
}
function fail(code:string):never{throw new FeedReviewError(code);}
function text(value:unknown,min:number,max:number):string{
 if(typeof value!=="string")return fail("INVALID_REVIEW_TEXT");
 const s=value.trim();
 if(s.length<min||s.length>max||/[\u0000-\u001f\u007f]/.test(s))return fail("INVALID_REVIEW_TEXT");
 return s;
}
export function reviewId(value:unknown):string{
 const s=text(value,1,128);
 if(!/^[a-zA-Z0-9_-]+$/.test(s))return fail("INVALID_REVIEW_ID");
 return s;
}
export function reviewRevision(value:unknown):number{
 if(typeof value!=="string"||!/^(0|[1-9][0-9]{0,8})$/.test(value))return fail("INVALID_REVIEW_REVISION");
 const n=Number(value);if(!Number.isSafeInteger(n))return fail("INVALID_REVIEW_REVISION");
 return n;
}
export function reviewDate(value:unknown):string {
 if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return fail("INVALID_REVIEW_DAY");
 const d=new Date(value+"T00:00:00.000Z");
 if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==value)return fail("INVALID_REVIEW_DAY");
 return value;
}
export function reviewHttps(value:unknown):string{
 const s=text(value,10,2048);
 try{const u=new URL(s);if(u.protocol!=="https:"||!u.hostname||u.username||u.password||u.hash||u.search||u.port||u.href!==s)return fail("INVALID_REVIEW_SOURCE");}
 catch(e){if(e instanceof FeedReviewError)throw e;return fail("INVALID_REVIEW_SOURCE");}
 return s;
}
export function parseReviewCandidate(input:Record<string,unknown>) {
 const podcastId=reviewId(input.podcastId),feedUrl=reviewHttps(input.feedUrl);
 const publishedTitle=text(input.publishedTitle,3,200);
 const publishedWebsite=input.publishedWebsite?reviewHttps(input.publishedWebsite):null;
 const mode=input.mode;
 if(mode!=="DEDICATED"&&mode!=="SHARED")return fail("INVALID_REVIEW_MODE");
 return {podcastId,feedUrl,publishedTitle,publishedWebsite,mode};
}
export function parseHostEvidence(input:Record<string,unknown>) {
 const personId=reviewId(input.personId);
 const role=input.role;
 if(!["HOST","COHOST","OFFICIAL_PRODUCER"].includes(String(role)))return fail("INVALID_HOST_ROLE");
 const fromOn=reviewDate(input.fromOn);
 const toOn=input.toOn?reviewDate(input.toOn):null;
 if(toOn&&toOn<fromOn)return fail("INVALID_HOST_PERIOD");
 return {personId,role:role as "HOST"|"COHOST"|"OFFICIAL_PRODUCER",fromOn,toOn,
  sourceUrl:reviewHttps(input.sourceUrl),observedOn:reviewDate(input.observedOn)};
}
export function parseEpisodeEvidence(input:Record<string,unknown>) {
 const guid=text(input.guid,1,1024);
 return {guid,sourceUrl:reviewHttps(input.sourceUrl),observedOn:reviewDate(input.observedOn)};
}
export function parseReviewDecision(input:Record<string,unknown>): {
 decision:"APPROVED"|"REJECTED";reviewSourceUrl:string;reviewNote:string;reviewedOn:string;
} {
 const decision=input.decision;
 if(decision!=="APPROVED"&&decision!=="REJECTED")return fail("INVALID_REVIEW_DECISION");
 return {decision,reviewSourceUrl:reviewHttps(input.reviewSourceUrl),
  reviewNote:text(input.reviewNote,20,2000),reviewedOn:reviewDate(input.reviewedOn)};
}
export function approveFeedCandidate(
 scope:FeedScope,decision:"APPROVED"|"REJECTED",reviewSourceUrl:string,reviewNote:string,reviewedOn:string,
):FeedScope{
 reviewHttps(reviewSourceUrl);text(reviewNote,20,2000);reviewDate(reviewedOn);
 const current:FeedScope={...scope,status:decision,reviewSourceUrl,reviewNote,reviewedOn};
 if(decision==="APPROVED"){
   // Reject claims whose evidence was purportedly observed after editorial approval.
   for(const e of current.episodes)if(e.observedOn>reviewedOn)return fail("FUTURE_EPISODE_EVIDENCE");
   validateFeedScope(current);
 }
 return current;
}
