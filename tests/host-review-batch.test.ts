import assert from "node:assert/strict";
import test from "node:test";
import { preflightHostReviewJsonl } from "../src/lib/host-review-batch";
const row={officialKey:"BIOGUIDE:A123456",officialName:"Synthetic Review Person",
  identitySourceUrl:"https://example.org/biography",showKey:"test-show",
  showTitle:"Synthetic Radio Show",proposedRole:"UNKNOWN",hostStartOn:"",
  hostEndOn:"",feedCandidateUrl:""};
test("batch preflight never auto-verifies source leads",()=>{
  const accepted=preflightHostReviewJsonl(JSON.stringify(row)+"\n");
  assert.equal(accepted.length,1);
  assert.equal(accepted[0].proposedRole,"UNKNOWN");
});
test("batch preflight rejects duplicate keys and fake names as identity",()=>{
  assert.throws(()=>preflightHostReviewJsonl([row,row].map(x=>JSON.stringify(x)).join("\n")),/DUPLICATE_BATCH_CANDIDATE/);
  assert.throws(()=>preflightHostReviewJsonl(JSON.stringify({...row,officialKey:"Synthetic Review Person"})),/INVALID_OFFICIAL_IDENTITY/);
});
test("bounded invalid records abort before any database mutation",()=>{
  assert.throws(()=>preflightHostReviewJsonl("not-json"),/INVALID_BATCH_JSON/);
  assert.throws(()=>preflightHostReviewJsonl("[]"),/INVALID_BATCH_RECORD/);
  assert.throws(()=>preflightHostReviewJsonl(Array.from({length:1001},()=>JSON.stringify(row)).join("\n")),/INVALID_BATCH_SIZE/);
});
