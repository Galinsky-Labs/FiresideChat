export type PriorityReviewRole="HOST"|"COHOST"|"OFFICIAL_PRODUCER"|"GUEST"|"NETWORK_ONLY";
export type ReviewOutcome="PENDING_SOURCE_REVIEW"|"VERIFIED_WITH_EPISODES"|"PRECISE_SOURCE_BLOCKER";
export interface PriorityOfficialShowReview {
 officialName:string; showTitle:string; officialIdentityKey:string|null;
 role:PriorityReviewRole|null; identitySourceUrl:string|null;
 roleSourceUrl:string|null; canonicalFeedUrl:string|null; lastObservedOn:string|null;
 hostedFrom:string|null; hostedUntil:string|null; importedEpisodeCount:number;
 blockerCode:string|null; blockerEvidenceUrl:string|null; blockerReason:string|null;
 outcome:ReviewOutcome;
}
const names=/^[^\u0000-\u001f\u007f]{3,200}$/;
function https(value:unknown):boolean{
 if(typeof value!=="string"||value.length>2048)return false;
 try{const u=new URL(value);return u.protocol==="https:"&&!!u.hostname&&!u.username&&!u.password&&!u.hash&&!u.search&&!u.port&&u.href===value;}catch{return false;}
}
function day(value:unknown):boolean{
 if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const d=new Date(value+"T00:00:00.000Z");return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;
}
export function validatePriorityReview(record:PriorityOfficialShowReview):void {
 if(!record||!names.test(record.officialName)||!names.test(record.showTitle)||
   !["PENDING_SOURCE_REVIEW","VERIFIED_WITH_EPISODES","PRECISE_SOURCE_BLOCKER"].includes(record.outcome)||
   !Number.isSafeInteger(record.importedEpisodeCount)||record.importedEpisodeCount<0)
   throw new Error("INVALID_PRIORITY_RECORD");
 if(record.outcome==="PENDING_SOURCE_REVIEW"){
   if(record.importedEpisodeCount!==0||record.role!==null||record.blockerCode!==null)
     throw new Error("PENDING_MUST_NOT_ASSERT_CREDIT");
   return;
 }
 if(!day(record.lastObservedOn)||!record.officialIdentityKey||
   !/^(BIOGUIDE:[A-Z][0-9]{6}|PRESIDENT:[A-Z0-9_-]{2,48})$/.test(record.officialIdentityKey)||
   !https(record.identitySourceUrl))throw new Error("OFFICIAL_IDENTITY_UNVERIFIED");
 if(record.outcome==="VERIFIED_WITH_EPISODES"){
   if(!["HOST","COHOST","OFFICIAL_PRODUCER"].includes(String(record.role))||
     !https(record.roleSourceUrl)||!https(record.canonicalFeedUrl)||
     !day(record.hostedFrom)||(record.hostedUntil!==null&&(!day(record.hostedUntil)||record.hostedUntil<record.hostedFrom!))||
     record.importedEpisodeCount===0)
     throw new Error("MISSING_VERIFIED_ROLE_FEED_OR_EPISODES");
   if(record.blockerCode!==null||record.blockerReason!==null||record.blockerEvidenceUrl!==null)
     throw new Error("INCONSISTENT_VERIFIED_REVIEW");
   return;
 }
 if(!record.blockerCode||!/^[A-Z][A-Z0-9_]{2,60}$/.test(record.blockerCode)||
   typeof record.blockerReason!=="string"||record.blockerReason.trim().length<20||
   !https(record.blockerEvidenceUrl)||record.importedEpisodeCount!==0)
   throw new Error("SOURCE_BLOCKER_NOT_PRECISE");
 if(record.role!==null){
   if(!["HOST","COHOST","OFFICIAL_PRODUCER"].includes(record.role)||
     !https(record.roleSourceUrl)||!day(record.hostedFrom)||
     (record.hostedUntil!==null&&(!day(record.hostedUntil)||record.hostedUntil<record.hostedFrom!)))
      throw new Error("BLOCKED_ROLE_REQUIRES_CITATION");
 } else if(record.roleSourceUrl!==null||record.hostedFrom!==null||record.hostedUntil!==null)
   throw new Error("BLOCKED_ROLE_REQUIRES_CITATION");
}
/** One named official may legitimately host multiple shows; never key on name alone. */
export function priorityReviewKey(record:PriorityOfficialShowReview):string {
 return (record.officialIdentityKey??record.officialName.toLowerCase())+"|"+record.showTitle.toLowerCase();
}
