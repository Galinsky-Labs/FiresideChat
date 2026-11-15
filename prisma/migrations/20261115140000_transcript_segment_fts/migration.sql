-- FC-P15: full-text index over timestamped transcript segments.
-- The expression must match src/lib/archive-search.ts exactly.
CREATE INDEX IF NOT EXISTS "TranscriptSegment_text_fts_idx"
  ON "TranscriptSegment" USING GIN (to_tsvector('english', "text"));
