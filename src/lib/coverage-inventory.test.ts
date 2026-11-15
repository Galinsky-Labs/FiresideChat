import assert from "node:assert/strict";
import test from "node:test";
import { buildCoverageInventory } from "./coverage-inventory";

test("keeps congressional, presidential, and shadow counts distinct", () => {
  const report = buildCoverageInventory({
    checkedAt: new Date("2026-10-13T08:30:00Z"),
    deployedCommit: "a".repeat(40),
    staleAfterHours: 36,
    automaticFeedRefresh: true,
    generatedTranscription: false,
    registry: {
      people: [
        { slug: "house", kind: "HOUSE", isCurrent: true },
        { slug: "senate", kind: "SENATE", isCurrent: true },
        { slug: "president", kind: "PRESIDENT", isCurrent: true },
        { slug: "shadow", kind: "SHADOW_SENATE", isCurrent: true },
        { slug: "former", kind: "HOUSE", isCurrent: false },
      ],
      podcasts: [
        { active: true, publishingStatus: "ACTIVE", people: [{ personSlug: "house" }, { personSlug: "senate" }] },
        { active: true, publishingStatus: "INACTIVE", people: [{ personSlug: "house" }] },
      ],
      candidates: [{ show: "unverified" }],
    },
    database: {
      people: [{ kind: "HOUSE", isCurrent: true, count: 2 }, { kind: "SHADOW_SENATE", isCurrent: true, count: 1 }],
      feeds: [
        { active: true, publishingStatus: "ACTIVE", lastSuccessfulCheckAt: new Date("2026-10-13T07:00:00Z"), consecutiveFailures: 0, nextRetryAt: null },
        { active: true, publishingStatus: "INACTIVE", lastSuccessfulCheckAt: new Date("2026-10-10T07:00:00Z"), consecutiveFailures: 0, nextRetryAt: null },
        { active: true, publishingStatus: "UNKNOWN", lastSuccessfulCheckAt: null, consecutiveFailures: 0, nextRetryAt: null },
        { active: true, publishingStatus: "ACTIVE", lastSuccessfulCheckAt: new Date("2026-10-13T07:00:00Z"), consecutiveFailures: 2, nextRetryAt: new Date("2026-10-13T09:00:00Z") },
      ],
      transcriptStates: [{ value: "COMPLETE", count: 3 }, { value: "FAILED", count: 1 }],
      transcriptSources: [{ value: "PUBLISHER", count: 2 }, { value: "GENERATED", count: 1 }],
      durationSeconds: 7200,
      latestSuccessfulIngestionAt: new Date("2026-10-13T07:30:00Z"),
    },
  });

  assert.equal(report.registry.currentCongressionalPeople, 2);
  assert.equal(report.registry.currentShadowSenators, 1);
  assert.equal(report.registry.qualifiedPeople, 2);
  assert.deepEqual(report.database.feedHealth, { healthy: 1, stale: 1, failing: 1, neverSynced: 1, retryBlocked: 1, staleAfterHours: 36 });
  assert.equal(report.database.episodes, 4);
  assert.equal(report.database.episodeHours, 2);
  assert.equal(report.database.transcriptCoveragePercent, 75);
  assert.equal(report.schedule.generatedTranscription.enabled, false);
  assert.ok(report.limitations.every((value) => !value.includes("complete archive")));
});

test("rejects invalid snapshot boundaries", () => {
  const base = {
    checkedAt: new Date("invalid"), deployedCommit: null, staleAfterHours: 36, automaticFeedRefresh: false, generatedTranscription: false,
    registry: { people: [], podcasts: [], candidates: [] },
    database: { people: [], feeds: [], transcriptStates: [], transcriptSources: [], durationSeconds: 0, latestSuccessfulIngestionAt: null },
  } as const;
  assert.throws(() => buildCoverageInventory(base), /checkedAt/);
});
