import assert from "node:assert/strict";
import test from "node:test";
import { buildAcceptanceReport, showImportState, type ShowObservation } from "../src/lib/archive-acceptance";

const t0 = { complete: 0, publisherPending: 0, publisherFailedTerminal: 0, webSearchPending: 0, webSearchNegative: 0, queuedForGeneration: 0, generationFailed: 0 };
const show = (over: Partial<ShowObservation>): ShowObservation => ({
  slug: "s", title: "S", personSlugs: ["p1"], registryActive: true, publishingStatus: "ACTIVE", inDatabase: true,
  episodes: 10, lastSuccessfulCheckAt: new Date("2026-11-01"), consecutiveFailures: 0, lastError: null, transcripts: { ...t0, complete: 10 }, ...over,
});
const people = [{ slug: "p1", fullName: "One", kind: "SENATE", isCurrent: true }, { slug: "p2", fullName: "Two", kind: "HOUSE", isCurrent: false }];

test("FC-P20 import states distinguish imported, recorded failure, pending and unseeded", () => {
  assert.equal(showImportState(show({})), "IMPORTED");
  assert.equal(showImportState(show({ episodes: 0, consecutiveFailures: 2, lastError: "HTTP 404" })), "SOURCE_FAILURE_RECORDED");
  assert.equal(showImportState(show({ episodes: 0, lastSuccessfulCheckAt: null })), "PENDING_FIRST_IMPORT");
  assert.equal(showImportState(show({ episodes: 0 })), "IMPORTED_NO_EPISODES");
  assert.equal(showImportState(show({ inDatabase: false })), "NOT_SEEDED");
  assert.equal(showImportState(show({ registryActive: false, episodes: 0 })), "INACTIVE_NOT_INGESTED");
});

test("FC-P20 incomplete coverage is never presented as complete", () => {
  const report = buildAcceptanceReport({
    checkedAt: new Date("2026-11-15T00:00:00Z"), people, generationAuthorized: false,
    shows: [
      show({ slug: "ok", personSlugs: ["p1"] }),
      show({ slug: "pending", personSlugs: ["p2"], episodes: 0, lastSuccessfulCheckAt: null, transcripts: t0 }),
      show({ slug: "queue", personSlugs: ["p1"], transcripts: { ...t0, complete: 4, publisherPending: 1, queuedForGeneration: 5 } }),
    ],
    unresolvedCandidates: [{ person: "Someone", show: "Maybe Show", reason: "unverified" }],
  });
  assert.equal(report.accepted, false);
  assert.match(report.statement, /INCOMPLETE/);
  const failed = report.checks.filter((c) => !c.passed).map((c) => c.id);
  assert.deepEqual(failed, ["SHOWS_IMPORTED_OR_EXPLAINED", "PUBLIC_TRANSCRIPTS_TERMINAL", "REMAINDER_QUEUED_FOR_AUTHORIZED_GENERATION", "CANDIDATES_RESOLVED"]);
  assert.match(report.checks[2].detail, /not authorized/);
  assert.deepEqual(report.blockedShows.map((s) => s.slug), ["pending"]);
  const p1 = report.people.find((p) => p.slug === "p1")!;
  assert.deepEqual([p1.verifiedShows, p1.importedShows, p1.episodes, p1.completeTranscripts], [2, 2, 20, 14]);
  assert.deepEqual(report.people.find((p) => p.slug === "p2")!.blockedShows, [{ slug: "pending", state: "PENDING_FIRST_IMPORT" }]);
});

test("FC-P20 acceptance passes only when every check passes, and still disclaims universal coverage", () => {
  const report = buildAcceptanceReport({
    checkedAt: new Date(), people, generationAuthorized: true, unresolvedCandidates: [],
    shows: [show({}), show({ slug: "failed", episodes: 0, consecutiveFailures: 3, lastError: "Feed removed by publisher", transcripts: t0 })],
  });
  assert.equal(report.accepted, true);
  assert.match(report.statement, /does not assert that every former official hosted a podcast/);
  assert.equal(report.totals.sourceFailureRecorded, 1);
});
