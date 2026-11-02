import assert from "node:assert/strict";
import test from "node:test";
import { classifyProductionCandidate } from "../src/lib/production-verification";
const candidate={personId:"P123",showId:"show-a",relationship:"HOST" as const,sourceUrl:"https://example.org/show",observedAt:"2026-10-18",reviewerConfirmed:true};
test("requires source and reviewer",()=>{assert.equal(classifyProductionCandidate(candidate).status,"VERIFIED");assert.equal(classifyProductionCandidate({...candidate,reviewerConfirmed:false}).status,"NEEDS_REVIEW");assert.equal(classifyProductionCandidate({...candidate,sourceUrl:undefined}).status,"NEEDS_REVIEW");});
test("guest excluded and unknown never verified",()=>{assert.equal(classifyProductionCandidate({...candidate,relationship:"GUEST"}).status,"EXCLUDED_GUEST");assert.equal(classifyProductionCandidate({...candidate,relationship:"UNKNOWN"}).status,"NEEDS_REVIEW");});
test("rejects URL credentials, fragments, queries and active schemes",()=>{for(const sourceUrl of ["https://u:p@example.org/show","https://example.org/show?token=secret","https://example.org/#x","javascript:alert(1)","https://example.org\\@evil.test/"]){assert.equal(classifyProductionCandidate({...candidate,sourceUrl}).status,"NEEDS_REVIEW");}});
test("rejects impossible dates and invalid identifiers",()=>{assert.equal(classifyProductionCandidate({...candidate,observedAt:"2026-02-30"}).status,"NEEDS_REVIEW");assert.equal(classifyProductionCandidate({...candidate,showId:"../tenant"}).status,"NEEDS_REVIEW");});
