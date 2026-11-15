-- Existing episodes remain explicitly unverified for reviewed feed scopes.
ALTER TABLE "Episode" ADD COLUMN "sourceFeedUrl" TEXT;
CREATE INDEX "Episode_podcastId_sourceFeedUrl_idx" ON "Episode"("podcastId", "sourceFeedUrl");
