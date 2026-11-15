import { estimatedSeconds } from "./budget";

/**
 * FC-P13: preview the transcription backlog, its cost and completion time, and
 * pick a fair batch. Pure functions: callers supply database rows and rates.
 */
export type BacklogEpisode = {
  id: string;
  podcastId: string;
  publishedAt: Date;
  durationSeconds: number | null;
  /** COMPLETE = has transcript; others are mapped by the caller. */
  state: "COMPLETE" | "PUBLIC_SOURCE_PENDING" | "QUEUED_FOR_GENERATION" | "ATTEMPTED_FAILED" | "UNAVAILABLE";
};

export type BacklogPlanInput = {
  episodes: readonly BacklogEpisode[];
  now: Date;
  /** Vendor price per audio minute in USD (0 for a local worker). */
  ratePerMinuteUsd: number;
  dailyCapMinutes: number;
  monthlyCapMinutes: number;
  usedTodayMinutes: number;
  usedThisMonthMinutes: number;
  /** Episodes newer than this many days get a freshness lane. */
  freshnessDays: number;
  /** Fraction of each batch reserved for the freshness lane (0..1). */
  freshnessShare: number;
  generationAuthorized: boolean;
};

/**
 * Fair order: recent episodes first (freshness lane, newest first), then the
 * historical backlog round-robin across shows, oldest first within each show,
 * so one large archive cannot starve every other official's show.
 */
export function orderEpisodesFairly<T extends Pick<BacklogEpisode, "id" | "podcastId" | "publishedAt">>(
  episodes: readonly T[],
  now: Date,
  freshnessDays: number,
  freshnessShare = 0.25,
): T[] {
  const cutoff = now.getTime() - freshnessDays * 86_400_000;
  const fresh = episodes.filter((e) => e.publishedAt.getTime() >= cutoff)
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime() || a.id.localeCompare(b.id));
  const byShow = new Map<string, T[]>();
  for (const e of episodes) {
    if (e.publishedAt.getTime() >= cutoff) continue;
    const list = byShow.get(e.podcastId) ?? [];
    list.push(e);
    byShow.set(e.podcastId, list);
  }
  const queues = [...byShow.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([, list]) => list.sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime() || a.id.localeCompare(b.id)));
  const historical: T[] = [];
  for (let round = 0; queues.some((q) => q.length > round); round++)
    for (const q of queues) if (q[round]) historical.push(q[round]);

  // Interleave so the freshness lane gets about `freshnessShare` of slots.
  const share = Math.min(1, Math.max(0, freshnessShare));
  const result: T[] = [];
  let f = 0;
  let h = 0;
  while (f < fresh.length || h < historical.length) {
    const freshDue = f < Math.ceil((result.length + 1) * share);
    if (f < fresh.length && (freshDue || h >= historical.length)) result.push(fresh[f++]);
    else result.push(historical[h++]);
  }
  return result;
}

const minutes = (seconds: number) => Math.round((seconds / 60) * 10) / 10;
const usd = (value: number) => Math.round(value * 100) / 100;

export function planTranscriptionBacklog(input: BacklogPlanInput) {
  const counts = { COMPLETE: 0, PUBLIC_SOURCE_PENDING: 0, QUEUED_FOR_GENERATION: 0, ATTEMPTED_FAILED: 0, UNAVAILABLE: 0 };
  let knownSeconds = 0;
  let unknownDurations = 0;
  const generationQueue: BacklogEpisode[] = [];
  for (const e of input.episodes) {
    counts[e.state] += 1;
    if (e.state === "QUEUED_FOR_GENERATION" || e.state === "ATTEMPTED_FAILED") {
      generationQueue.push(e);
      if (e.durationSeconds && e.durationSeconds > 0) knownSeconds += e.durationSeconds;
      else unknownDurations += 1;
    }
  }
  const backlogSeconds = generationQueue.reduce((sum, e) => sum + estimatedSeconds(e.durationSeconds), 0);
  const remainingToday = Math.max(0, Math.min(
    input.dailyCapMinutes - input.usedTodayMinutes,
    input.monthlyCapMinutes - input.usedThisMonthMinutes,
  ));
  const ordered = orderEpisodesFairly(generationQueue, input.now, input.freshnessDays, input.freshnessShare);
  const batch: Array<{ id: string; podcastId: string; estimatedMinutes: number }> = [];
  let batchSeconds = 0;
  if (input.generationAuthorized) {
    for (const e of ordered) {
      const s = estimatedSeconds(e.durationSeconds);
      if (batchSeconds + s > remainingToday * 60) continue;
      batchSeconds += s;
      batch.push({ id: e.id, podcastId: e.podcastId, estimatedMinutes: minutes(s) });
    }
  }
  // The binding constraint for sustained throughput is the lower of the daily
  // cap and the monthly cap spread over 30 days.
  const sustainedMinutesPerDay = Math.min(input.dailyCapMinutes, input.monthlyCapMinutes / 30);
  const backlogMinutes = backlogSeconds / 60;
  return {
    planUnit: "FC-P13",
    generatedAt: input.now.toISOString(),
    generationAuthorized: input.generationAuthorized,
    episodes: { total: input.episodes.length, ...counts },
    backlog: {
      episodes: generationQueue.length,
      knownAudioHours: Math.round((knownSeconds / 3600) * 100) / 100,
      unknownDurationEpisodes: unknownDurations,
      estimatedAudioMinutes: minutes(backlogSeconds),
      estimatedCostUsd: usd(backlogMinutes * input.ratePerMinuteUsd),
      ratePerMinuteUsd: input.ratePerMinuteUsd,
      estimatedDaysAtCaps: sustainedMinutesPerDay > 0 ? Math.ceil(backlogMinutes / sustainedMinutesPerDay) : null,
    },
    budget: {
      dailyCapMinutes: input.dailyCapMinutes,
      monthlyCapMinutes: input.monthlyCapMinutes,
      usedTodayMinutes: input.usedTodayMinutes,
      usedThisMonthMinutes: input.usedThisMonthMinutes,
      remainingTodayMinutes: remainingToday,
    },
    nextBatch: {
      episodes: batch.length,
      estimatedAudioMinutes: minutes(batchSeconds),
      estimatedCostUsd: usd((batchSeconds / 60) * input.ratePerMinuteUsd),
      shows: new Set(batch.map((b) => b.podcastId)).size,
      items: batch.slice(0, 50),
    },
    notes: [
      "Unknown durations are estimated at 90 minutes.",
      "Public publisher and website transcripts are attempted before any generated transcription.",
      input.generationAuthorized
        ? "Batch respects the remaining daily and monthly audio-minute caps."
        : "Generated transcription is not authorized; nothing will be billed. Counts show the honest queue.",
    ],
  };
}
