import test from "node:test";
import assert from "node:assert/strict";
import { approveFeedCandidate, parseEpisodeEvidence, parseHostEvidence, parseReviewCandidate, parseReviewDecision } from "../src/lib/feed-review";
import type { FeedScope } from "../src/lib/feed-scope";
const candidate={podcastId:"podcast-cuid",feedUrl:"https://publisher.example/feed",publishedTitle:"Historical Civic Voices",
 publishedWebsite:"https://publisher.example/show",mode:"SHARED" as const};
const host={personId:"person-cuid",role:"HOST",fromOn:"2025-01-01",toOn:"2025-12-31",
 sourceUrl:"https://publisher.example/credits",observedOn:"2026-10-18"};
const episode={guid:"e1",sourceUrl:"https://publisher.example/e1",observedOn:"2026-10-18"};
test("claim and original-source evidence parse without guessing feed links",()=>{
 assert.equal(parseReviewCandidate(candidate).mode,"SHARED");
 assert.equal(parseHostEvidence(host).role,"HOST");
 assert.equal(parseEpisodeEvidence(episode).guid,"e1");
 assert.throws(()=>parseReviewCandidate({...candidate,feedUrl:"https://publisher.example/feed?key=foo"}),/INVALID_REVIEW_SOURCE/);
 assert.throws(()=>parseHostEvidence({...host,toOn:"2024-01-01"}),/INVALID_HOST_PERIOD/);
});
test("review approval cannot be granted without actual host and specific shared-feed episode",()=>{
 const scope:FeedScope={...candidate,status:"PENDING",reviewSourceUrl:null,reviewNote:null,reviewedOn:null,hosts:[],episodes:[]};
 const parsed=parseReviewDecision({decision:"APPROVED",reviewSourceUrl:"https://publisher.example/credits",
   reviewNote:"Publisher credits explicitly show the correct presenter.",reviewedOn:"2026-10-19"});
 assert.throws(()=>approveFeedCandidate(scope,parsed.decision,parsed.reviewSourceUrl,parsed.reviewNote,parsed.reviewedOn),/NO_VERIFIED_HOST_PERIOD/);
 const withHost={...scope,hosts:[{officialId:"person-cuid",role:"HOST" as const,fromDay:"2025-01-01",toDay:null}]};
 assert.throws(()=>approveFeedCandidate(withHost,parsed.decision,parsed.reviewSourceUrl,parsed.reviewNote,parsed.reviewedOn),/SHARED_FEED_NEEDS_EPISODE_EVIDENCE/);
 const valid={...withHost,episodes:[episode]};
 assert.equal(approveFeedCandidate(valid,parsed.decision,parsed.reviewSourceUrl,parsed.reviewNote,parsed.reviewedOn).status,"APPROVED");
 assert.throws(()=>approveFeedCandidate({...valid,episodes:[{...episode,observedOn:"2099-01-01"}]},
  parsed.decision,parsed.reviewSourceUrl,parsed.reviewNote,parsed.reviewedOn),/FUTURE_EPISODE_EVIDENCE/);
});
