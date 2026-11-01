import test from "node:test";
import assert from "node:assert/strict";
import { canPreserveLegacyEpisode, transcriptScopePredicate, eligibleOfficialIds, filterScopedFeed, validateFeedScope, type FeedScope } from "../src/lib/feed-scope";
import type { NormalizedEpisode,ParsedFeed } from "../src/lib/feeds/types";
const episode=(guid:string,day:string):NormalizedEpisode=>({
 guid,title:guid,description:null,publishedAt:new Date(day+"T12:00:00.000Z"),sourceUpdatedAt:null,
 durationSeconds:null,audioUrl:"https://audio.example/"+guid, audioMimeType:"audio/mpeg",
 episodeUrl:"https://publisher.example/"+guid,imageUrl:null,publisherTranscript:null,
});
const parsed:ParsedFeed={metadata:{title:"Public History Hour",websiteUrl:"https://publisher.example/show",description:null,imageUrl:null,language:null},
 episodes:[episode("network-a","2025-01-01"),episode("official-b","2025-03-01"),episode("later-c","2026-01-01")],skippedItems:0,duplicateItems:0};
const scope:FeedScope={podcastId:"podcast-1",feedUrl:"https://publisher.example/rss",publishedTitle:"Public History Hour",
 publishedWebsite:"https://publisher.example/show",status:"APPROVED",mode:"SHARED",
 reviewSourceUrl:"https://publisher.example/credits",reviewedOn:"2026-10-18",
 reviewNote:"Original publisher lists the specific official as host on this show.",
 hosts:[{officialId:"A123456",role:"HOST",fromDay:"2025-02-01",toDay:"2025-12-31"},
   {officialId:"B123456",role:"COHOST",fromDay:"2025-03-01",toDay:"2025-09-01"}],
 episodes:[{guid:"official-b",sourceUrl:"https://publisher.example/official-b",observedOn:"2026-10-18"}]};
test("shared multi-show network feed imports only individually sourced GUIDs inside host periods",()=>{
 assert.deepEqual(filterScopedFeed(parsed,scope.feedUrl,scope),{state:"ALLOWED",episodes:[parsed.episodes[1]],skipped:2});
 assert.deepEqual(eligibleOfficialIds(scope,parsed.episodes[1]),["A123456","B123456"]);
 assert.deepEqual(eligibleOfficialIds(scope,parsed.episodes[0]),[]);
});
test("changing or repurposing feed title and URL stops automated ingestion",()=>{
 assert.deepEqual(filterScopedFeed({...parsed,metadata:{...parsed.metadata,title:"A Different Show"}},scope.feedUrl,scope),
  {state:"BLOCKED",reason:"FEED_IDENTITY_CHANGED"});
 assert.deepEqual(filterScopedFeed(parsed,"https://publisher.example/new-rss",scope),
  {state:"BLOCKED",reason:"FEED_IDENTITY_CHANGED"});
 assert.equal(filterScopedFeed(parsed,scope.feedUrl,{...scope,status:"PENDING"}).state,"BLOCKED");
});
test("dedicated ended shows retain historical episodes only in verified host periods",()=>{
 const dedicated:FeedScope={...scope,mode:"DEDICATED",episodes:[]};
 const result=filterScopedFeed(parsed,dedicated.feedUrl,dedicated);
 assert.equal(result.state,"ALLOWED");
 if(result.state==="ALLOWED") assert.deepEqual(result.episodes.map(e=>e.guid),["official-b"]);
});
test("fake approval, malformed windows and duplicate episode proofs fail closed",()=>{
 assert.throws(()=>validateFeedScope({...scope,reviewSourceUrl:null}),/MISSING_APPROVAL_SOURCE/);
 assert.throws(()=>validateFeedScope({...scope,hosts:[{...scope.hosts[0],toDay:"2024-01-01"}]}),/INVALID_HOST_PERIOD/);
 assert.throws(()=>validateFeedScope({...scope,episodes:[...scope.episodes,...scope.episodes]}),/INVALID_EPISODE_APPROVAL/);
 assert.throws(()=>validateFeedScope({...scope,episodes:[]}),/SHARED_FEED_NEEDS_EPISODE_EVIDENCE/);
});

test("reviewed feed origin preserves matching legacy history without source substitution",()=>{
 const current=episode("official-b","2025-03-01");
 assert.equal(canPreserveLegacyEpisode({sourceFeedUrl:null,audioUrl:current.audioUrl,publishedAt:current.publishedAt},
   current,scope.feedUrl),true);
 assert.equal(canPreserveLegacyEpisode({sourceFeedUrl:"https://different.example/feed",audioUrl:current.audioUrl,
   publishedAt:current.publishedAt},current,scope.feedUrl),false);
 assert.equal(canPreserveLegacyEpisode({sourceFeedUrl:null,audioUrl:"https://different.example/audio",
   publishedAt:current.publishedAt},current,scope.feedUrl),false);
 assert.equal(canPreserveLegacyEpisode({sourceFeedUrl:scope.feedUrl,audioUrl:current.audioUrl,
   publishedAt:new Date("2024-01-01T00:00:00Z")},current,scope.feedUrl),false);
});

test("publisher transcript recovery cannot escape approved shared-feed GUID scope",()=>{
 assert.deepEqual(transcriptScopePredicate(scope),{
   sourceFeedUrl:scope.feedUrl,guid:{in:["official-b"]},
 });
 assert.deepEqual(transcriptScopePredicate({...scope,mode:"DEDICATED",episodes:[]}),{
   sourceFeedUrl:scope.feedUrl,
 });
 assert.throws(()=>transcriptScopePredicate({...scope,status:"PENDING"}),/TRANSCRIPT_SCOPE_UNAPPROVED/);
});

test("invalid episode timestamps never qualify for ingestion or attribution",()=>{
 const invalid={...parsed.episodes[1],publishedAt:new Date(NaN)};
 const result=filterScopedFeed({...parsed,episodes:[invalid]},scope.feedUrl,scope);
 assert.equal(result.state,"ALLOWED");
 if(result.state==="ALLOWED")assert.equal(result.episodes.length,0);
 assert.deepEqual(eligibleOfficialIds(scope,invalid),[]);
 assert.equal(canPreserveLegacyEpisode({sourceFeedUrl:null,audioUrl:invalid.audioUrl,publishedAt:invalid.publishedAt},invalid,scope.feedUrl),false);
});
