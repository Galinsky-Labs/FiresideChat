import test from "node:test";
import assert from "node:assert/strict";
import { validatePriorityReview, priorityReviewKey, type PriorityOfficialShowReview } from "../src/lib/priority-catalog-review";
const pending:PriorityOfficialShowReview={
 officialName:"Synthetic Public Official",showTitle:"Synthetic Show",officialIdentityKey:null,role:null,
 identitySourceUrl:null,roleSourceUrl:null,canonicalFeedUrl:null,lastObservedOn:null,
 hostedFrom:null,hostedUntil:null,importedEpisodeCount:0,blockerCode:null,
 blockerEvidenceUrl:null,blockerReason:null,outcome:"PENDING_SOURCE_REVIEW",
};
test("source-research candidates carry no invented host verification",()=>{
 assert.doesNotThrow(()=>validatePriorityReview(pending));
 assert.throws(()=>validatePriorityReview({...pending,role:"HOST"}),/PENDING_MUST_NOT_ASSERT_CREDIT/);
 assert.notEqual(priorityReviewKey(pending),priorityReviewKey({...pending,showTitle:"Another Distinct Show"}));
});
test("host/source/RSS, dated period and actual imported episodes are all required",()=>{
 const v:PriorityOfficialShowReview={...pending,outcome:"VERIFIED_WITH_EPISODES",
 officialIdentityKey:"BIOGUIDE:A123456",role:"HOST",
 identitySourceUrl:"https://bioguide.congress.gov/sample",roleSourceUrl:"https://publisher.example/host",
 canonicalFeedUrl:"https://publisher.example/show/feed",lastObservedOn:"2026-10-19",
 hostedFrom:"2024-01-01",hostedUntil:null,importedEpisodeCount:1};
 assert.doesNotThrow(()=>validatePriorityReview(v));
 for(const change of [{role:"GUEST"},{role:"NETWORK_ONLY"},{importedEpisodeCount:0},
  {canonicalFeedUrl:null},{hostedFrom:null},{hostedUntil:"2023-01-01"},{roleSourceUrl:"http://unsafe/feed"}]){
   assert.throws(()=>validatePriorityReview({...v,...change} as PriorityOfficialShowReview));
 }
});
test("precise source blocker requires independent evidence, not generic unknown",()=>{
 const blocked:PriorityOfficialShowReview={...pending,outcome:"PRECISE_SOURCE_BLOCKER",officialIdentityKey:"BIOGUIDE:A123456",
  identitySourceUrl:"https://bioguide.congress.gov/sample",lastObservedOn:"2026-10-19",
  blockerCode:"PUBLISHER_RSS_UNAVAILABLE",blockerEvidenceUrl:"https://publisher.example/unsupported",
  blockerReason:"Publisher lists a series without a current publicly accessible audio feed."};
 assert.doesNotThrow(()=>validatePriorityReview(blocked));
 assert.throws(()=>validatePriorityReview({...blocked,blockerEvidenceUrl:null}),/SOURCE_BLOCKER_NOT_PRECISE/);
 assert.throws(()=>validatePriorityReview({...blocked,blockerReason:"missing"}),/SOURCE_BLOCKER_NOT_PRECISE/);
});

test("source blockers cannot smuggle unproved host claims or guest credits",()=>{
 const base:PriorityOfficialShowReview={...pending,outcome:"PRECISE_SOURCE_BLOCKER",
  officialIdentityKey:"BIOGUIDE:A123456",identitySourceUrl:"https://bioguide.congress.gov/source",
  lastObservedOn:"2026-10-19",blockerCode:"RSS_UNAVAILABLE",
  blockerEvidenceUrl:"https://publisher.example/no-feed",
  blockerReason:"Primary publisher confirms the RSS is currently missing."};
 assert.throws(()=>validatePriorityReview({...base,role:"HOST"}),/BLOCKED_ROLE_REQUIRES_CITATION/);
 assert.throws(()=>validatePriorityReview({...base,role:"GUEST",roleSourceUrl:"https://publisher.example/guest",hostedFrom:"2026-01-01"}),/BLOCKED_ROLE_REQUIRES_CITATION/);
 assert.doesNotThrow(()=>validatePriorityReview({...base,role:"HOST",
  roleSourceUrl:"https://publisher.example/host",hostedFrom:"2025-01-01"}));
});
