import "dotenv/config";
import { db } from "../src/lib/db";
import { planTranscriptionBacklog, type BacklogEpisode } from "../src/lib/transcription/backlog-plan";
import { effectiveUsageSeconds } from "../src/lib/transcription/budget";
import { usageSince } from "../src/lib/transcription/stt-store";

function positiveNumber(value: string | undefined, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** FC-P13: print a read-only backlog/cost/throughput preview. Never bills. */
async function main() {
  const now = new Date();
  const externalMax = positiveNumber(process.env.EXTERNAL_TRANSCRIPT_MAX_ATTEMPTS, 3);
  const generatedMax = positiveNumber(process.env.TRANSCRIPTION_MAX_ATTEMPTS, 3);
  const rows = await db.episode.findMany({
    where: { podcast: { active: true } },
    select: {
      id: true, podcastId: true, publishedAt: true, durationSeconds: true, audioUrl: true,
      transcriptStatus: true, transcriptionAttempts: true, episodeUrl: true,
      publisherTranscriptUrl: true, publisherTranscriptAttempts: true, transcriptDiscoveryAttempts: true,
      transcript: { select: { id: true } },
    },
  });
  const episodes: BacklogEpisode[] = rows.map((r) => {
    let state: BacklogEpisode["state"];
    if (r.transcript) state = "COMPLETE";
    else if (!r.audioUrl) state = "UNAVAILABLE";
    else if ((r.publisherTranscriptUrl && r.publisherTranscriptAttempts < externalMax) ||
      (r.episodeUrl && r.transcriptDiscoveryAttempts < externalMax)) state = "PUBLIC_SOURCE_PENDING";
    else if (r.transcriptionAttempts >= generatedMax) state = "UNAVAILABLE";
    else if (r.transcriptionAttempts > 0) state = "ATTEMPTED_FAILED";
    else state = "QUEUED_FOR_GENERATION";
    return { id: r.id, podcastId: r.podcastId, publishedAt: r.publishedAt, durationSeconds: r.durationSeconds, state };
  });
  const startOfDay = new Date(now); startOfDay.setUTCHours(0, 0, 0, 0);
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const stale = new Date(now.getTime() - 4 * 3600_000);
  const [day, month] = await Promise.all([usageSince(db, startOfDay, stale), usageSince(db, startOfMonth, stale)]);
  const plan = planTranscriptionBacklog({
    episodes, now,
    ratePerMinuteUsd: positiveNumber(process.env.TRANSCRIPTION_RATE_PER_MINUTE_USD, 0.006),
    dailyCapMinutes: positiveNumber(process.env.TRANSCRIPTION_DAILY_MAX_MINUTES, 180),
    monthlyCapMinutes: positiveNumber(process.env.TRANSCRIPTION_MONTHLY_MAX_MINUTES, 1800),
    usedTodayMinutes: Math.round(effectiveUsageSeconds(day) / 60),
    usedThisMonthMinutes: Math.round(effectiveUsageSeconds(month) / 60),
    freshnessDays: positiveNumber(process.env.TRANSCRIPTION_FRESHNESS_DAYS, 30),
    freshnessShare: 0.25,
    generationAuthorized: process.env.TRANSCRIPTION_ENABLED === "true" && Boolean(process.env.OPENAI_API_KEY),
  });
  console.log(JSON.stringify(plan, null, 2));
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await db.$disconnect(); });
