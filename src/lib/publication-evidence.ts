/** FC-P08: non-RSS shows remain discovery candidates, not fabricated episode imports. */
export type PublicationEvidence={personId:string;showId:string;platform:"RSS"|"VIDEO"|"WEBSITE";sourceUrl:string;hostVerified:boolean;mediaPublished:boolean; canonicalFeedUrl?:string};
export function classifyPublication(e:PublicationEvidence){
 const safe=(v:string)=>{try{const u=new URL(v);return u.protocol==="https:"&&!u.username&&!u.password}catch{return false}};
 if(!e.personId || !e.showId || !safe(e.sourceUrl)||!e.hostVerified) return {status:"NEEDS_REVIEW",ingestable:false};
 if(!e.mediaPublished)return {status:"NO_PUBLISHED_EPISODES",ingestable:false};
 if(e.platform==="RSS"&&e.canonicalFeedUrl&&safe(e.canonicalFeedUrl))return {status:"RSS_READY",ingestable:true};
 if(e.platform==="VIDEO"||e.platform==="WEBSITE") return {status:"NON_RSS_ARCHIVE",ingestable:false};
 return {status:"FEED_UNRESOLVED",ingestable:false};
}
