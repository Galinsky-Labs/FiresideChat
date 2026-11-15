-- CreateEnum
CREATE TYPE "CorrectionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "TranscriptCorrectionRequest" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "startSeconds" DOUBLE PRECISION NOT NULL,
    "originalText" TEXT NOT NULL,
    "proposedText" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidenceUrl" TEXT,
    "status" "CorrectionStatus" NOT NULL DEFAULT 'PENDING',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "reviewNote" TEXT,
    "reviewerRef" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranscriptCorrectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptRevision" (
    "id" TEXT NOT NULL,
    "transcriptId" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "startSeconds" DOUBLE PRECISION NOT NULL,
    "previousText" TEXT NOT NULL,
    "newText" TEXT NOT NULL,
    "correctionRequestId" TEXT NOT NULL,
    "actorRef" TEXT NOT NULL,
    "evidenceUrl" TEXT,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranscriptRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TranscriptCorrectionRequest_status_createdAt_idx" ON "TranscriptCorrectionRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "TranscriptCorrectionRequest_episodeId_status_idx" ON "TranscriptCorrectionRequest"("episodeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TranscriptRevision_correctionRequestId_key" ON "TranscriptRevision"("correctionRequestId");

-- CreateIndex
CREATE INDEX "TranscriptRevision_transcriptId_startSeconds_idx" ON "TranscriptRevision"("transcriptId", "startSeconds");

-- AddForeignKey
ALTER TABLE "TranscriptCorrectionRequest" ADD CONSTRAINT "TranscriptCorrectionRequest_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptRevision" ADD CONSTRAINT "TranscriptRevision_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "Transcript"("id") ON DELETE CASCADE ON UPDATE CASCADE;

