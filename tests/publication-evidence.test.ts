import test from "node:test";
import assert from "node:assert/strict";
import {classifyPublication} from "../src/lib/publication-evidence";
const item={personId:"P123",showId:"show",platform:"VIDEO" as const,sourceUrl:"https://publisher.example/show",hostVerified:true,mediaPublished:true};
test("video-only host-verified shows remain non-RSS candidates",()=>assert.deepEqual(classifyPublication(item),{status:"NON_RSS_ARCHIVE",ingestable:false}));
test("RSS requires independently supplied safe canonical feed",()=>{
 assert.equal(classifyPublication({...item,platform:"RSS",canonicalFeedUrl:"https://publisher.example/rss"}).ingestable,true);
 assert.equal(classifyPublication({...item,platform:"RSS",canonicalFeedUrl:"http://localhost/feed"}).ingestable,false);
});
test("host identity and actual publications must be verified",()=>{
 assert.equal(classifyPublication({...item,hostVerified:false}).status,"NEEDS_REVIEW");
 assert.equal(classifyPublication({...item,mediaPublished:false}).status,"NO_PUBLISHED_EPISODES");
});
test("RSS without a resolved canonical feed is never ingestable",()=>{
 assert.deepEqual(classifyPublication({...item,platform:"RSS"}),{status:"FEED_UNRESOLVED",ingestable:false});
 assert.equal(classifyPublication({...item,platform:"RSS",canonicalFeedUrl:"https://user:pw@publisher.example/rss"}).ingestable,false);
});
test("website-only archives are non-RSS and private hosts need review",()=>{
 assert.equal(classifyPublication({...item,platform:"WEBSITE"}).status,"NON_RSS_ARCHIVE");
 assert.equal(classifyPublication({...item,sourceUrl:"https://192.168.1.5/show"}).status,"NEEDS_REVIEW");
});
test("every curated verified video classifies as a non-RSS archive item",async()=>{
 const {verifiedVideos,validateVideoRegistry}=await import("../src/data/video-registry");
 assert.ok(verifiedVideos.length>0);
 assert.doesNotThrow(()=>validateVideoRegistry(verifiedVideos));
});
