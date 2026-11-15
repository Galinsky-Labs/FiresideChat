-- FC-P04: candidate review is private and never enrolls a show or relationship automatically.
CREATE TYPE "HostReviewRole" AS ENUM ('HOST', 'COHOST', 'OFFICIAL_PRODUCER', 'GUEST', 'UNKNOWN');
CREATE TYPE "HostReviewEvidenceKind" AS ENUM ('HOST_CREDIT', 'COHOST_CREDIT', 'OFFICIAL_PRODUCTION', 'NETWORK_ONLY', 'GUEST_APPEARANCE', 'OTHER');
CREATE TYPE "HostReviewStatus" AS ENUM ('PENDING', 'NEEDS_EVIDENCE', 'VERIFIED', 'EXCLUDED_GUEST', 'REJECTED');
CREATE TYPE "HostReviewAction" AS ENUM ('SUBMITTED', 'EVIDENCE_ADDED', 'CLAIM_AMENDED', 'VERIFIED', 'EXCLUDED_GUEST', 'NEEDS_EVIDENCE', 'REJECTED');

CREATE TABLE "HostReviewCandidate" (
  "id" TEXT NOT NULL,
  "identityKey" TEXT NOT NULL,
  "officialKey" TEXT NOT NULL,
  "officialName" TEXT NOT NULL,
  "identitySourceUrl" TEXT NOT NULL,
  "showKey" TEXT NOT NULL,
  "showTitle" TEXT NOT NULL,
  "proposedRole" "HostReviewRole" NOT NULL,
  "feedCandidateUrl" TEXT,
  "hostStartOn" DATE,
  "hostEndOn" DATE,
  "status" "HostReviewStatus" NOT NULL DEFAULT 'PENDING',
  "revision" INTEGER NOT NULL DEFAULT 0,
  "reviewNote" TEXT,
  "reviewerRef" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HostReviewCandidate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HostReviewCandidate_period_check" CHECK ("hostEndOn" IS NULL OR ("hostStartOn" IS NOT NULL AND "hostEndOn" >= "hostStartOn")),
  CONSTRAINT "HostReviewCandidate_revision_check" CHECK ("revision" >= 0)
);
CREATE UNIQUE INDEX "HostReviewCandidate_identityKey_key" ON "HostReviewCandidate"("identityKey");
CREATE INDEX "HostReviewCandidate_status_createdAt_idx" ON "HostReviewCandidate"("status", "createdAt");
CREATE INDEX "HostReviewCandidate_officialKey_showKey_idx" ON "HostReviewCandidate"("officialKey", "showKey");

CREATE TABLE "HostReviewEvidence" (
  "id" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "kind" "HostReviewEvidenceKind" NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "excerpt" TEXT NOT NULL,
  "observedOn" DATE NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HostReviewEvidence_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "HostReviewEvidence_candidateId_kind_sourceUrl_observedOn_key"
 ON "HostReviewEvidence"("candidateId", "kind", "sourceUrl", "observedOn");
CREATE INDEX "HostReviewEvidence_candidateId_createdAt_idx" ON "HostReviewEvidence"("candidateId", "createdAt");
ALTER TABLE "HostReviewEvidence" ADD CONSTRAINT "HostReviewEvidence_candidateId_fkey"
 FOREIGN KEY ("candidateId") REFERENCES "HostReviewCandidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "HostReviewAudit" (
  "id" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "action" "HostReviewAction" NOT NULL,
  "revision" INTEGER NOT NULL,
  "actorRef" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HostReviewAudit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "HostReviewAudit_candidateId_revision_key" ON "HostReviewAudit"("candidateId", "revision");
ALTER TABLE "HostReviewAudit" ADD CONSTRAINT "HostReviewAudit_candidateId_fkey"
 FOREIGN KEY ("candidateId") REFERENCES "HostReviewCandidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
