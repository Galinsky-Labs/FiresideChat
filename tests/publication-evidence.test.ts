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
