import { db } from "@/lib/db";
import { candidateKey, decideReview, parseCandidate, parseEvidence, type CandidateInput,
  type EvidenceInput, type ReviewDecision, HostReviewError } from "@/lib/host-review";

const actorRef = "authenticated-admin-session";
const date = (value: string | null) => value ? new Date(value + "T00:00:00.000Z") : null;
const format = (value: Date | null): string | null => value?.toISOString().slice(0, 10) ?? null;
function note(value: unknown): string {
  if (typeof value !== "string" || value.trim().length < 20 || value.length > 2000 ||
      /[\u0000-\u001f\u007f]/.test(value)) throw new HostReviewError("INVALID_REVIEW_NOTE");
  return value.trim();
}
function id(value: unknown): string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(value)) throw new HostReviewError("INVALID_REVIEW_ID");
  return value;
}
function revision(value: unknown): number {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]{0,8})$/.test(value)) throw new HostReviewError("INVALID_REVIEW_REVISION");
  const n = Number(value);
  if (!Number.isSafeInteger(n)) throw new HostReviewError("INVALID_REVIEW_REVISION");
  return n;
}
export async function submitHostCandidate(input: Record<string, unknown>, origin: "ADMIN" | "BATCH" = "ADMIN"): Promise<string> {
  const candidate = parseCandidate(input);
  const evidence = input.sourceUrl ? parseEvidence(input) : null;
  // Role and source metadata remain unverified until authenticated operator decision.
  return db.$transaction(async (tx) => {
    const row = await tx.hostReviewCandidate.create({
      data: {
        identityKey: candidateKey(candidate), officialKey: candidate.officialKey,
        officialName: candidate.officialName, identitySourceUrl: candidate.identitySourceUrl,
        showKey: candidate.showKey, showTitle: candidate.showTitle, proposedRole: candidate.proposedRole,
        feedCandidateUrl: candidate.feedCandidateUrl, hostStartOn: date(candidate.hostStartOn),
        hostEndOn: date(candidate.hostEndOn), status: "PENDING",
      },
    });
    if (evidence) await tx.hostReviewEvidence.create({
      data: {candidateId: row.id, kind: evidence.kind, sourceUrl: evidence.sourceUrl,
        excerpt: evidence.excerpt, observedOn: date(evidence.observedOn)!},
    });
    await tx.hostReviewAudit.create({
      data: {candidateId: row.id, action:"SUBMITTED", revision:0, actorRef:origin==="BATCH"?"explicit-batch-import":actorRef,
        note: "Candidate entered into private source-review queue; not published."},
    });
    return row.id;
  });
}
export async function addHostEvidence(input: Record<string, unknown>): Promise<void> {
  const candidateId = id(input.candidateId);
  const expectedRevision = revision(input.revision);
  const evidence = parseEvidence(input);
  await db.$transaction(async (tx) => {
    const updated = await tx.hostReviewCandidate.updateMany({
      where: {id: candidateId, revision: expectedRevision, status: {in: ["PENDING","NEEDS_EVIDENCE"]}},
      data: {revision: {increment: 1}, status:"PENDING", reviewedAt:null, reviewerRef:null, reviewNote:null},
    });
    if (updated.count !== 1) throw new HostReviewError("STALE_OR_CLOSED_CANDIDATE");
    await tx.hostReviewEvidence.create({data: {
      candidateId, kind:evidence.kind, sourceUrl:evidence.sourceUrl,
      excerpt:evidence.excerpt, observedOn:date(evidence.observedOn)!,
    }});
    await tx.hostReviewAudit.create({data: {
      candidateId, action:"EVIDENCE_ADDED", revision:expectedRevision+1, actorRef,
      note:"Additional source evidence added: " + evidence.kind + " " + evidence.sourceUrl,
    }});
  });
}
/** Amend an unapproved candidate without rewriting its immutable source citations. */
export async function amendHostClaim(input: Record<string, unknown>): Promise<void> {
  const candidateId = id(input.candidateId);
  const expectedRevision = revision(input.revision);
  const reason = note(input.amendNote);
  await db.$transaction(async (tx) => {
    const row = await tx.hostReviewCandidate.findUnique({where:{id:candidateId}});
    if (!row || row.revision !== expectedRevision ||
        !["PENDING","NEEDS_EVIDENCE"].includes(row.status))
      throw new HostReviewError("STALE_OR_CLOSED_CANDIDATE");
    // Immutable official identity and show key must not be silently remapped.
    const candidate = parseCandidate({
      officialKey:row.officialKey, officialName:row.officialName, identitySourceUrl:row.identitySourceUrl,
      showKey:row.showKey, showTitle:row.showTitle, feedCandidateUrl:row.feedCandidateUrl,
      proposedRole:input.proposedRole, hostStartOn:input.hostStartOn, hostEndOn:input.hostEndOn,
    });
    const updated = await tx.hostReviewCandidate.updateMany({
      where:{id:candidateId,revision:expectedRevision,status:{in:["PENDING","NEEDS_EVIDENCE"]}},
      data:{identityKey:candidateKey(candidate),proposedRole:candidate.proposedRole,
        hostStartOn:date(candidate.hostStartOn),hostEndOn:date(candidate.hostEndOn),
        revision:{increment:1},status:"PENDING",reviewedAt:null,reviewerRef:null,reviewNote:null},
    });
    if (updated.count !== 1) throw new HostReviewError("CONCURRENT_REVIEW");
    await tx.hostReviewAudit.create({data:{
      candidateId, action:"CLAIM_AMENDED", revision:expectedRevision+1, actorRef,
      note:reason,
    }});
  });
}

export async function reviewHostCandidate(input: Record<string, unknown>): Promise<void> {
  const candidateId = id(input.candidateId);
  const expectedRevision = revision(input.revision);
  const explanation = note(input.reviewNote);
  if (!["VERIFY","EXCLUDE_GUEST","REQUEST_EVIDENCE","REJECT"].includes(String(input.decision)))
    throw new HostReviewError("INVALID_DECISION");
  const decision = input.decision as ReviewDecision;
  await db.$transaction(async (tx) => {
    const row = await tx.hostReviewCandidate.findUnique({
      where: {id:candidateId}, include:{evidence:true},
    });
    if (!row || row.revision !== expectedRevision || !["PENDING","NEEDS_EVIDENCE"].includes(row.status))
      throw new HostReviewError("STALE_OR_CLOSED_CANDIDATE");
    const candidate: CandidateInput = parseCandidate({
      officialKey:row.officialKey, officialName:row.officialName, identitySourceUrl:row.identitySourceUrl,
      showKey:row.showKey, showTitle:row.showTitle, proposedRole:row.proposedRole,
      feedCandidateUrl:row.feedCandidateUrl, hostStartOn:format(row.hostStartOn), hostEndOn:format(row.hostEndOn),
    });
    const evidence: EvidenceInput[] = row.evidence.map(e=>parseEvidence({
      kind:e.kind, sourceUrl:e.sourceUrl, excerpt:e.excerpt, observedOn:format(e.observedOn),
    }));
    const status = decideReview(candidate, evidence, decision, explanation, new Date().toISOString().slice(0,10));
    const updated = await tx.hostReviewCandidate.updateMany({
      where: {id:candidateId, revision:expectedRevision, status:{in:["PENDING","NEEDS_EVIDENCE"]}},
      data: {status, revision:{increment:1}, reviewedAt:new Date(),
        reviewerRef:actorRef, reviewNote:explanation},
    });
    if (updated.count !== 1) throw new HostReviewError("CONCURRENT_REVIEW");
    await tx.hostReviewAudit.create({data:{
      candidateId, action:status, revision:expectedRevision+1, actorRef, note:explanation,
    }});
  });
}
