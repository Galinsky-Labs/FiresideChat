import { db } from "@/lib/db";
import { validateFeedScope, type FeedScope } from "@/lib/feed-scope";
import type { Prisma } from "@/generated/prisma/client";

/** No persisted scope means the legacy feed remains in operation. Explicit scope records fail closed. */
export async function loadFeedScope(podcastId:string,feedUrl:string): Promise<FeedScope|null> {
  const record=await db.feedScopeRecord.findUnique({
    where:{podcastId_feedUrl:{podcastId,feedUrl}},
    include:{hosts:true,episodes:true},
  });
  if(!record)return null;
  const scope:FeedScope={
    podcastId:record.podcastId,feedUrl:record.feedUrl,publishedTitle:record.publishedTitle,
    publishedWebsite:record.publishedWebsite,mode:record.mode,status:record.status,
    reviewSourceUrl:record.reviewSourceUrl,reviewNote:record.reviewNote,
    reviewedOn:record.reviewedOn?.toISOString().slice(0,10)??null,
    hosts:record.hosts.map(h=>({
      officialId:h.personId,role:h.role,
      fromDay:h.fromOn.toISOString().slice(0,10),toDay:h.toOn?.toISOString().slice(0,10)??null,
    })),
    episodes:record.episodes.map(e=>({
      guid:e.guid,sourceUrl:e.sourceUrl,observedOn:e.observedOn.toISOString().slice(0,10),
    })),
  };
  validateFeedScope(scope);
  return scope;
}
function nextDay(date:string):Date {
  const d=new Date(date+"T00:00:00.000Z");d.setUTCDate(d.getUTCDate()+1);return d;
}
/** A reviewed feed prevents old unverified rows and unrelated network episodes being shown. */
export async function reviewedEpisodeWhere(
  podcastId:string,personId?:string,
):Promise<Prisma.EpisodeWhereInput> {
  const records=await db.feedScopeRecord.findMany({
    where:{podcastId},include:{hosts:true,episodes:true},
  });
  if(records.length===0)return {};
  const alternatives:Prisma.EpisodeWhereInput[]=[];
  for(const record of records) {
    if(record.status!=="APPROVED")continue;
    const scope=await loadFeedScope(podcastId,record.feedUrl);
    if(!scope || scope.status!=="APPROVED")continue;
    const hosts=personId?scope.hosts.filter(h=>h.officialId===personId):scope.hosts;
    if(hosts.length===0)continue;
    const hostDates:Prisma.EpisodeWhereInput[]=hosts.map(h=>({
      publishedAt:{gte:new Date(h.fromDay+"T00:00:00.000Z"),
        ...(h.toDay?{lt:nextDay(h.toDay)}:{})},
    }));
    const allowedGuids=scope.mode==="SHARED"?scope.episodes.map(e=>e.guid):null;
    if(allowedGuids?.length===0)continue;
    alternatives.push({
      sourceFeedUrl:record.feedUrl,
      ...(allowedGuids?{guid:{in:allowedGuids}}:{}),
      OR:hostDates,
    });
  }
  // A configured review with no valid approved scope cannot produce public episodes.
  if(alternatives.length===0)return {id:{in:[]}};
  return {OR:alternatives};
}

/** Global published episode filter for search, transcript search and archive browsing. */
export async function archiveVisibleWhere():Promise<Prisma.EpisodeWhereInput> {
 const records=await db.feedScopeRecord.findMany({include:{hosts:true,episodes:true}});
 if(records.length===0)return {};
 const reviewedIds=[...new Set(records.map(r=>r.podcastId))];
 const branches:Prisma.EpisodeWhereInput[]=[{podcastId:{notIn:reviewedIds}}];
 for(const record of records) {
   if(record.status!=="APPROVED"||record.hosts.length===0)continue;
   const hosts:Prisma.EpisodeWhereInput[]=record.hosts.map(h=>({
     publishedAt:{gte:h.fromOn,...(h.toOn?{lt:nextDay(h.toOn.toISOString().slice(0,10))}:{})},
   }));
   if(record.mode==="SHARED"&&record.episodes.length===0)continue;
   branches.push({
     podcastId:record.podcastId,sourceFeedUrl:record.feedUrl,
     ...(record.mode==="SHARED"?{guid:{in:record.episodes.map(e=>e.guid)}}:{}),
     OR:hosts,
   });
 }
 return {OR:branches};
}

/** Provide per-episode reviewed host IDs; unlike the first show contact, these match role periods. */
export async function feedAttributionForPodcast(podcastId:string):Promise<((episode:{
 guid:string;publishedAt:Date;sourceFeedUrl:string|null,
})=>string[])|null>{
 const records=await db.feedScopeRecord.findMany({where:{podcastId},include:{hosts:true,episodes:true}});
 if(records.length===0)return null;
 return episode=>{
   const date=episode.publishedAt.toISOString().slice(0,10);
   const ids=new Set<string>();
   for(const record of records){
     if(record.status!=="APPROVED"||record.feedUrl!==episode.sourceFeedUrl)continue;
     if(record.mode==="SHARED"&&!record.episodes.some(e=>e.guid===episode.guid))continue;
     for(const host of record.hosts){
       const from=host.fromOn.toISOString().slice(0,10),to=host.toOn?.toISOString().slice(0,10);
       if(date>=from&&(!to||date<=to))ids.add(host.personId);
     }
   }
   return [...ids].sort();
 };
}
