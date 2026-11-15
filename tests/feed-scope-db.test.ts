import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { db } from "../src/lib/db";
import { attachFeedEpisode, attachFeedHost, decideFeedScope, submitFeedScope, activateReviewedFeed } from "../src/lib/feed-review-store";
import { loadFeedScope, reviewedEpisodeWhere } from "../src/lib/feed-scope-store";

// Always skip outside the exact GitHub Actions ephemeral PostgreSQL CI service.
const disposable=process.env.GITHUB_ACTIONS==="true" &&
  process.env.DATABASE_URL==="postgresql://postgres:postgres@localhost:5432/fireside_chat?schema=public";
test("feed source review persists evidence with revision CAS and never publishes by itself",{skip:!disposable},async t=>{
 const podcast=await db.podcast.findFirst({select:{id:true,rssUrl:true,feedEtag:true,feedLastModified:true,resolvedFeedUrl:true}});
 const person=await db.person.findFirst({select:{id:true}});
 if(!podcast||!person){t.skip("Seeded officials and shows unavailable");return;}
 const suffix=randomBytes(8).toString("hex");
 const feedUrl="https://publisher.example/"+suffix+"/feed";
 let id:string|undefined;
 try {
  id=await submitFeedScope({podcastId:podcast.id,feedUrl,publishedTitle:"Fictional Feed Verification Fixture",
   publishedWebsite:"https://publisher.example/fake",mode:"SHARED"});
  let row=await db.feedScopeRecord.findUniqueOrThrow({where:{id}});
  assert.equal(row.status,"PENDING");
  await attachFeedHost({scopeId:id,revision:"0",personId:person.id,role:"HOST",
   fromOn:"2025-01-01",toOn:"",sourceUrl:"https://publisher.example/fake/credits",observedOn:"2026-10-18"});
  await assert.rejects(attachFeedHost({scopeId:id,revision:"0",personId:person.id,role:"COHOST",
   fromOn:"2025-02-01",sourceUrl:"https://publisher.example/fake/credits",observedOn:"2026-10-18"}),/STALE_OR_CLOSED_FEED_REVIEW/);
  await attachFeedEpisode({scopeId:id,revision:"1",guid:"fixture-episode-"+suffix,
   sourceUrl:"https://publisher.example/fake/episode",observedOn:"2026-10-18"});
  await decideFeedScope({scopeId:id,revision:"2",decision:"APPROVED",
   reviewSourceUrl:"https://publisher.example/fake/show",
   reviewNote:"The synthetic publisher credits this known person and exact episode.",
   reviewedOn:"2026-10-19"});
  row=await db.feedScopeRecord.findUniqueOrThrow({where:{id}});
  assert.equal(row.status,"APPROVED");assert.equal(row.revision,3);
  const loaded=await loadFeedScope(podcast.id,feedUrl);
  assert.equal(loaded?.mode,"SHARED");assert.equal(loaded?.episodes.length,1);
  assert.deepEqual((await db.feedScopeAudit.findMany({where:{scopeId:id},orderBy:{revision:"asc"}}))
   .map(a=>a.event),["SUBMITTED","HOST_EVIDENCE_ADDED","EPISODE_EVIDENCE_ADDED","APPROVED"]);
  await assert.rejects(decideFeedScope({scopeId:id,revision:"3",decision:"REJECTED",
   reviewSourceUrl:"https://publisher.example/fake/other",
   reviewNote:"Stale operator cannot overwrite a recorded editorial result.",reviewedOn:"2026-10-19"}),/STALE_OR_CLOSED_FEED_REVIEW/);
  await assert.rejects(activateReviewedFeed({scopeId:id,revision:"3",
    expectedCurrentUrl:"https://wrong.example/feed"}),/FEED_CHANGED_SINCE_REVIEW/);
  const before=await db.podcast.findUniqueOrThrow({where:{id:podcast.id}});
  assert.equal(before.rssUrl,podcast.rssUrl,"A review alone never activates a feed");
  const oldEpisodeCount=await db.episode.count({where:{podcastId:podcast.id}});
  await activateReviewedFeed({scopeId:id,revision:"3",expectedCurrentUrl:podcast.rssUrl});
  const active=await db.podcast.findUniqueOrThrow({where:{id:podcast.id}});
  assert.equal(active.rssUrl,feedUrl,"Activation requires explicit operator action");
  assert.equal(active.feedEtag,null,"New feed must not use stale conditional GET headers");
  assert.equal(await db.episode.count({where:{podcastId:podcast.id}}),oldEpisodeCount,"Feed migration must retain historical episodes");
  const audit=await db.feedScopeAudit.findMany({where:{scopeId:id},orderBy:{revision:"asc"}});
  assert.deepEqual(audit.map(a=>a.event),["SUBMITTED","HOST_EVIDENCE_ADDED","EPISODE_EVIDENCE_ADDED","APPROVED","ACTIVATED"]);
  assert.equal((await db.feedScopeRecord.findUniqueOrThrow({where:{id}})).revision,4);
  await assert.rejects(activateReviewedFeed({scopeId:id,revision:"3",expectedCurrentUrl:feedUrl}),/FEED_NOT_APPROVED/);
  const visibility=await reviewedEpisodeWhere(podcast.id,person.id);
  assert.ok("OR" in visibility,"Public visibility must be explicitly scoped by reviewed feed");
 } finally {
  if(id)await db.$transaction(async tx=>{
    if(podcast)await tx.podcast.update({where:{id:podcast.id},data:{rssUrl:podcast.rssUrl,
      feedEtag:podcast.feedEtag,feedLastModified:podcast.feedLastModified,resolvedFeedUrl:podcast.resolvedFeedUrl}});
    await tx.feedScopeAudit.deleteMany({where:{scopeId:id}});
    await tx.feedScopeEpisode.deleteMany({where:{scopeId:id}});
    await tx.feedScopeHost.deleteMany({where:{scopeId:id}});
    await tx.feedScopeRecord.deleteMany({where:{id}});
  });
 }
});
