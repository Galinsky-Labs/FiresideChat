import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { db } from "../src/lib/db";
import { addHostEvidence, reviewHostCandidate, submitHostCandidate } from "../src/lib/host-review-store";

// Only the ephemeral PostgreSQL service started by repository CI may receive synthetic records.
// Never run this mutation fixture against a configured production database.
const disposableCI = process.env.GITHUB_ACTIONS === "true" &&
  /^postgresql:\/\/postgres:postgres@localhost:5432\/fireside_chat\?schema=public$/.test(process.env.DATABASE_URL ?? "");

test("authenticated review store contract: revision CAS, evidence audit and no podcast publication", {skip: !disposableCI}, async () => {
  const showKey = "ci-review-" + randomBytes(8).toString("hex");
  let id: string | undefined;
  const before = await db.podcastPerson.count();
  try {
    id = await submitHostCandidate({
      officialKey:"BIOGUIDE:A654321",officialName:"Synthetic Fixture Official",
      identitySourceUrl:"https://example.org/fictional-official",
      showKey,showTitle:"Synthetic Fixture Program",proposedRole:"HOST",
      hostStartOn:"2024-01-01",hostEndOn:"",feedCandidateUrl:"",
    });
    const pending = await db.hostReviewCandidate.findUniqueOrThrow({where:{id}});
    assert.equal(pending.status,"PENDING");
    await assert.rejects(reviewHostCandidate({candidateId:id,revision:"0",decision:"VERIFY",
      reviewNote:"A fabricated entry cannot be verified without publisher evidence."}),/NO_MATCHING_ROLE_EVIDENCE/);
    await addHostEvidence({candidateId:id,revision:"0",kind:"HOST_CREDIT",
      sourceUrl:"https://example.org/fictional-show",
      excerpt:"A deliberately synthetic publisher statement used only in ephemeral integration tests.",
      observedOn:"2026-10-18"});
    await assert.rejects(addHostEvidence({candidateId:id,revision:"0",kind:"NETWORK_ONLY",
      sourceUrl:"https://example.org/fictional-network",
      excerpt:"Synthetic network association only, not a verified role.",observedOn:"2026-10-18"}),/STALE_OR_CLOSED_CANDIDATE/);
    await reviewHostCandidate({candidateId:id,revision:"1",decision:"VERIFY",
      reviewNote:"Synthetic fixture is source tagged in the ephemeral CI database only."});
    const done=await db.hostReviewCandidate.findUniqueOrThrow({
      where:{id}, include:{evidence:true,audit:{orderBy:{revision:"asc"}}},
    });
    assert.equal(done.status,"VERIFIED");
    assert.equal(done.revision,2);
    assert.deepEqual(done.audit.map(a=>a.action),["SUBMITTED","EVIDENCE_ADDED","VERIFIED"]);
    assert.equal(done.evidence.length,1);
    await assert.rejects(reviewHostCandidate({candidateId:id,revision:"1",decision:"REJECT",
      reviewNote:"Stale operator should not overwrite the verified candidate."}),/STALE_OR_CLOSED_CANDIDATE/);
    assert.equal(await db.podcastPerson.count(),before,"Review status cannot enroll a public show");
  } finally {
    if (id) await db.$transaction(async tx=>{
      await tx.hostReviewAudit.deleteMany({where:{candidateId:id}});
      await tx.hostReviewEvidence.deleteMany({where:{candidateId:id}});
      await tx.hostReviewCandidate.deleteMany({where:{id}});
    });
  }
});
