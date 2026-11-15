/** FC-P05: a changed feed/host needs explicit source review, not automatic trust. */
export type FeedClaim = {showId:string;canonicalUrl:string;proposedUrl:string;incumbentHostIds:string[];proposedHostIds:string[];sourceUrl?:string;reviewerApproved:boolean};
function valid(v:unknown){if(typeof v!=="string"||v.length>2048)return false;try{const u=new URL(v);return u.protocol==="https:"&&Boolean(u.hostname)&&!u.username&&!u.password&&!u.hash&&!u.search&&u.port===""&&u.href===v;}catch{return false}}
function hosts(v:unknown):string[]|null{if(!Array.isArray(v)||v.length<1||v.length>100||v.some(x=>typeof x!=="string"||!/^[A-Za-z0-9_-]{1,128}$/.test(x))||new Set(v).size!==v.length)return null;return [...v].sort()}
export function assessFeedChange(c:FeedClaim){
 if(!c||typeof c.showId!=="string"||!/^[A-Za-z0-9_-]{1,128}$/.test(c.showId)||!c.canonicalUrl||!c.proposedUrl)return {decision:"REVIEW",reason:"missing-identifiers"};
 if(!valid(c.canonicalUrl)||!valid(c.proposedUrl))return {decision:"REVIEW",reason:"invalid-feed-url"};
 const before=hosts(c.incumbentHostIds),after=hosts(c.proposedHostIds);
 if(!before||!after)return {decision:"REVIEW",reason:"unknown-hosts"};
 const changed=before.join("|")!==after.join("|")||c.canonicalUrl!==c.proposedUrl;
 if(!changed)return {decision:"UNCHANGED",reason:"same-hosts-and-feed"};
 if(c.reviewerApproved!==true||!valid(c.sourceUrl))return {decision:"REVIEW",reason:"changed-host-or-feed-needs-evidence"};
 return {decision:"APPROVED_CHANGE",reason:"explicit-source-reviewed"};
}
