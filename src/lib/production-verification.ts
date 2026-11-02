/** FC-P04: source-backed relationship triage; does not grant production authority. */
export type VerificationCandidate = {
 personId:string;showId:string;relationship:"HOST"|"COHOST"|"OFFICIAL_PRODUCER"|"GUEST"|"UNKNOWN";
 sourceUrl?:string;observedAt?:string;reviewerConfirmed:boolean;
};
export type VerificationResult={status:"VERIFIED"|"EXCLUDED_GUEST"|"NEEDS_REVIEW";reason:string};
function validSource(url:unknown):boolean{
 if(typeof url!=="string"||url.length>2048)return false;
 try{const u=new URL(url);return u.protocol==="https:"&&Boolean(u.hostname)&&!u.username&&!u.password&&
     !u.search&&!u.hash&&u.port===""&&u.origin!=="null"&&url===u.href;}catch{return false}
}
function validDay(value:unknown):boolean{
 if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const parsed=new Date(value+"T00:00:00.000Z");
 return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;
}
export function classifyProductionCandidate(input:VerificationCandidate):VerificationResult{
 if(!input||typeof input.personId!=="string"||typeof input.showId!=="string"||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(input.personId)||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(input.showId))return {status:"NEEDS_REVIEW",reason:"missing-subject"};
 if(input.relationship==="GUEST")return {status:"EXCLUDED_GUEST",reason:"guest-only"};
 if(!["HOST","COHOST","OFFICIAL_PRODUCER"].includes(input.relationship)||input.reviewerConfirmed!==true)
   return {status:"NEEDS_REVIEW",reason:"unverified-role"};
 if(!validSource(input.sourceUrl)||!validDay(input.observedAt))
   return {status:"NEEDS_REVIEW",reason:"missing-source-evidence"};
 return {status:"VERIFIED",reason:"source-backed-host-role"};
}
