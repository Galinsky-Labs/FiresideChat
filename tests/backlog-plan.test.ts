import assert from "node:assert/strict";
import test from "node:test";
import { orderEpisodesFairly, planTranscriptionBacklog, type BacklogEpisode } from "../src/lib/transcription/backlog-plan";

const now = new Date("2026-11-15T00:00:00Z");
const day = 86_400_000;
const ep = (id: string, podcastId: string, daysAgo: number, durationSeconds: number | null = 1800,
  state: BacklogEpisode["state"] = "QUEUED_FOR_GENERATION"): BacklogEpisode =>
  ({ id, podcastId, publishedAt: new Date(now.getTime() - daysAgo * day), durationSeconds, state });

test("FC-P13 fair order: freshness lane plus per-show round-robin, oldest first", () => {
  const huge = Array.from({ length: 6 }, (_, i) => ep("big" + i, "a-big-show", 1000 + i));
  const small = [ep("s1", "b-small", 900), ep("s2", "b-small", 800)];
  const fresh = [ep("new1", "c-new", 2), ep("new2", "a-big-show", 5)];
  const ordered = orderEpisodesFairly([...huge, ...small, ...fresh], now, 30, 0.25).map((e) => e.id);
  assert.equal(ordered[0], "new1");
  // The small show is reached in the first historical round, not after the huge archive.
  assert.ok(ordered.indexOf("s1") < 4);
  assert.ok(ordered.indexOf("big5") < ordered.indexOf("big4"));
  assert.equal(new Set(ordered).size, 10);
});

test("FC-P13 batch never exceeds the remaining daily/monthly cap", () => {
  const episodes = Array.from({ length: 20 }, (_, i) => ep("e" + i, "p" + (i % 4), 100 + i, 3600));
  const plan = planTranscriptionBacklog({
    episodes, now, ratePerMinuteUsd: 0.006, dailyCapMinutes: 180, monthlyCapMinutes: 1800,
    usedTodayMinutes: 30, usedThisMonthMinutes: 0, freshnessDays: 30, freshnessShare: 0.25, generationAuthorized: true,
  });
  assert.equal(plan.budget.remainingTodayMinutes, 150);
  assert.equal(plan.nextBatch.episodes, 2);
  assert.ok(plan.nextBatch.estimatedAudioMinutes <= 150);
  assert.equal(plan.nextBatch.shows, 2);
  assert.equal(plan.backlog.estimatedAudioMinutes, 1200);
  assert.equal(plan.backlog.estimatedCostUsd, 7.2);
  assert.equal(plan.backlog.estimatedDaysAtCaps, 20);
});

test("FC-P13 monthly cap binds even when the daily cap has room", () => {
  const plan = planTranscriptionBacklog({
    episodes: [ep("a", "p", 100, 3600)], now, ratePerMinuteUsd: 0.006, dailyCapMinutes: 180, monthlyCapMinutes: 1800,
    usedTodayMinutes: 0, usedThisMonthMinutes: 1790, freshnessDays: 30, freshnessShare: 0.25, generationAuthorized: true,
  });
  assert.equal(plan.budget.remainingTodayMinutes, 10);
  assert.equal(plan.nextBatch.episodes, 0);
});

test("FC-P13 honest report before paid processing is authorized", () => {
  const plan = planTranscriptionBacklog({
    episodes: [ep("c", "p", 1, 600, "COMPLETE"), ep("q", "p", 50, null), ep("pub", "p", 3, 600, "PUBLIC_SOURCE_PENDING"),
      ep("f", "p", 40, 1200, "ATTEMPTED_FAILED"), ep("u", "p", 60, null, "UNAVAILABLE")],
    now, ratePerMinuteUsd: 0.006, dailyCapMinutes: 180, monthlyCapMinutes: 1800,
    usedTodayMinutes: 0, usedThisMonthMinutes: 0, freshnessDays: 30, freshnessShare: 0.25, generationAuthorized: false,
  });
  assert.equal(plan.nextBatch.episodes, 0);
  assert.deepEqual(plan.episodes, { total: 5, COMPLETE: 1, PUBLIC_SOURCE_PENDING: 1, QUEUED_FOR_GENERATION: 1, ATTEMPTED_FAILED: 1, UNAVAILABLE: 1 });
  assert.equal(plan.backlog.episodes, 2);
  assert.equal(plan.backlog.unknownDurationEpisodes, 1);
  assert.equal(plan.backlog.estimatedAudioMinutes, 110);
  assert.match(plan.notes.join(" "), /not authorized/);
});
