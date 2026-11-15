import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validatePriorityReview, priorityReviewKey, type PriorityOfficialShowReview } from "../src/lib/priority-catalog-review";
test("every named candidate is persisted as unverified rather than falsely approved",()=>{
 const file=JSON.parse(readFileSync("docs/priority-review-queue.json","utf8")) as {candidates:PriorityOfficialShowReview[]};
 assert.ok(file.candidates.length>=11);
 const keys=new Set<string>();
 for(const candidate of file.candidates){
   assert.doesNotThrow(()=>validatePriorityReview(candidate));
   assert.equal(candidate.outcome,"PENDING_SOURCE_REVIEW");
   assert.equal(candidate.importedEpisodeCount,0);
   const key=priorityReviewKey(candidate);
   assert.equal(keys.has(key),false,"Catalog queue must not silently duplicate a show under one name");
   keys.add(key);
 }
});
