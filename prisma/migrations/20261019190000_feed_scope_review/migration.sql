CREATE TYPE "FeedScopeMode" AS ENUM ('DEDICATED', 'SHARED');
CREATE TYPE "FeedScopeReview" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "FeedScopeEvent" AS ENUM ('SUBMITTED', 'EPISODE_EVIDENCE_ADDED', 'HOST_EVIDENCE_ADDED', 'APPROVED', 'REJECTED', 'ACTIVATED');

CREATE TABLE "FeedScopeRecord" (
  "id" TEXT NOT NULL,
  "podcastId" TEXT NOT NULL,
  "feedUrl" TEXT NOT NULL,
  "publishedTitle" TEXT NOT NULL,
  "publishedWebsite" TEXT,
  "mode" "FeedScopeMode" NOT NULL,
  "status" "FeedScopeReview" NOT NULL DEFAULT 'PENDING',
  "reviewSourceUrl" TEXT,
  "reviewNote" TEXT,
  "reviewerRef" TEXT,
  "reviewedOn" DATE,
  "revision" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FeedScopeRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FeedScopeRecord_revision_check" CHECK ("revision" >= 0)
);
CREATE UNIQUE INDEX "FeedScopeRecord_podcastId_feedUrl_key" ON "FeedScopeRecord"("podcastId","feedUrl");
CREATE INDEX "FeedScopeRecord_status_createdAt_idx" ON "FeedScopeRecord"("status","createdAt");
ALTER TABLE "FeedScopeRecord" ADD CONSTRAINT "FeedScopeRecord_podcastId_fkey"
 FOREIGN KEY ("podcastId") REFERENCES "Podcast"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "FeedScopeHost" (
  "id" TEXT NOT NULL,
  "scopeId" TEXT NOT NULL,
  "personId" TEXT NOT NULL,
  "role" "PodcastRole" NOT NULL,
  "fromOn" DATE NOT NULL,
  "toOn" DATE,
  "sourceUrl" TEXT NOT NULL,
  "observedOn" DATE NOT NULL,
  CONSTRAINT "FeedScopeHost_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FeedScopeHost_period_check" CHECK ("toOn" IS NULL OR "toOn" >= "fromOn")
);
CREATE UNIQUE INDEX "FeedScopeHost_scopeId_personId_role_fromOn_key" ON "FeedScopeHost"("scopeId","personId","role","fromOn");
CREATE INDEX "FeedScopeHost_scopeId_personId_idx" ON "FeedScopeHost"("scopeId","personId");
ALTER TABLE "FeedScopeHost" ADD CONSTRAINT "FeedScopeHost_scopeId_fkey"
 FOREIGN KEY ("scopeId") REFERENCES "FeedScopeRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "FeedScopeEpisode" (
  "id" TEXT NOT NULL,
  "scopeId" TEXT NOT NULL,
  "guid" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "observedOn" DATE NOT NULL,
  CONSTRAINT "FeedScopeEpisode_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FeedScopeEpisode_scopeId_guid_key" ON "FeedScopeEpisode"("scopeId","guid");
ALTER TABLE "FeedScopeEpisode" ADD CONSTRAINT "FeedScopeEpisode_scopeId_fkey"
 FOREIGN KEY ("scopeId") REFERENCES "FeedScopeRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "FeedScopeAudit" (
  "id" TEXT NOT NULL,
  "scopeId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "actorRef" TEXT NOT NULL,
  "event" "FeedScopeEvent" NOT NULL,
  "note" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FeedScopeAudit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FeedScopeAudit_scopeId_revision_key" ON "FeedScopeAudit"("scopeId","revision");
ALTER TABLE "FeedScopeAudit" ADD CONSTRAINT "FeedScopeAudit_scopeId_fkey"
 FOREIGN KEY ("scopeId") REFERENCES "FeedScopeRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
