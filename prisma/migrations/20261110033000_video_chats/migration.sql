CREATE TYPE "VideoFormat" AS ENUM ('PERSONAL_CHAT', 'LIVESTREAM', 'Q_AND_A', 'BEHIND_THE_SCENES');
CREATE TYPE "VideoPlatform" AS ENUM ('YOUTUBE', 'INSTAGRAM', 'OTHER');
CREATE TABLE "VideoChat" (
 "id" TEXT NOT NULL,
 "personId" TEXT NOT NULL,
 "title" TEXT NOT NULL,
 "description" TEXT,
 "platform" "VideoPlatform" NOT NULL,
 "format" "VideoFormat" NOT NULL,
 "platformVideoId" TEXT NOT NULL,
 "sourceUrl" TEXT NOT NULL,
 "verificationUrl" TEXT NOT NULL,
 "verificationNote" TEXT NOT NULL,
 "verifiedAt" TIMESTAMP(3) NOT NULL,
 "publisherName" TEXT NOT NULL,
 "publishedAt" TIMESTAMP(3) NOT NULL,
 "transcriptText" TEXT,
 "active" BOOLEAN NOT NULL DEFAULT true,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "VideoChat_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VideoChat_sourceUrl_key" ON "VideoChat"("sourceUrl");
CREATE UNIQUE INDEX "VideoChat_platform_platformVideoId_key" ON "VideoChat"("platform", "platformVideoId");
CREATE INDEX "VideoChat_personId_publishedAt_idx" ON "VideoChat"("personId", "publishedAt");
CREATE INDEX "VideoChat_active_publishedAt_idx" ON "VideoChat"("active", "publishedAt");
ALTER TABLE "VideoChat" ADD CONSTRAINT "VideoChat_personId_fkey"
 FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
