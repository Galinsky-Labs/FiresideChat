-- CreateTable
CREATE TABLE "TranscriptionChunk" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "startSeconds" DOUBLE PRECISION NOT NULL,
    "endSeconds" DOUBLE PRECISION NOT NULL,
    "billedSeconds" DOUBLE PRECISION NOT NULL,
    "language" TEXT,
    "text" TEXT NOT NULL,
    "segments" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranscriptionChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TranscriptionChunk_idempotencyKey_key" ON "TranscriptionChunk"("idempotencyKey");

-- CreateIndex
CREATE INDEX "TranscriptionChunk_episodeId_startSeconds_idx" ON "TranscriptionChunk"("episodeId", "startSeconds");

-- CreateIndex
CREATE INDEX "TranscriptionChunk_createdAt_idx" ON "TranscriptionChunk"("createdAt");

-- AddForeignKey
ALTER TABLE "TranscriptionChunk" ADD CONSTRAINT "TranscriptionChunk_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

