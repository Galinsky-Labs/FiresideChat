import { podcastRegistry } from "@/data/podcast-registry";
import { db } from "@/lib/db";
import { portraitUrlForSlug } from "@/lib/portraits";
import { generatedTranscriptionState, remainingBudgetSeconds } from "@/lib/transcription/budget";
import { usageSince } from "@/lib/transcription/stt-store";
import { buildOpsQueues, type OpsQueueCounts } from "@/lib/ops-queues";

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function readOpsQueues(now = new Date()) {
  const staleHours = positiveInteger(process.env.ADMIN_STALE_FEED_HOURS, 36);
  const staleCutoff = new Date(now.getTime() - staleHours * 3600_000);
  const externalMax = positiveInteger(process.env.EXTERNAL_TRANSCRIPT_MAX_ATTEMPTS, 3);
  const startOfDay = new Date(now); startOfDay.setUTCHours(0, 0, 0, 0);
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const staleProcessing = new Date(now.getTime() - 4 * 3600_000);
  const noTranscript = { transcript: { is: null } } as const;

  const [
    unreviewedHosts, unverifiedShowMapping, crawlErrors, staleFeeds, neverSyncedFeeds,
    publisherTranscriptPending, webTranscriptPending, generatedBlocked, transcriptFailures,
    brokenSourceLinks, people, videoCandidatesPending, day, month,
  ] = await Promise.all([
    db.hostReviewCandidate.count({ where: { status: { in: ["PENDING", "NEEDS_EVIDENCE"] } } }),
    db.feedScopeRecord.count({ where: { status: "PENDING" } }),
    db.podcast.count({ where: { active: true, consecutiveFailures: { gt: 0 } } }),
    db.podcast.count({ where: { active: true, consecutiveFailures: 0, lastSuccessfulCheckAt: { lt: staleCutoff } } }),
    db.podcast.count({ where: { active: true, consecutiveFailures: 0, lastSuccessfulCheckAt: null } }),
    db.episode.count({ where: { ...noTranscript, publisherTranscriptUrl: { not: null }, publisherTranscriptAttempts: { lt: externalMax } } }),
    db.episode.count({ where: { ...noTranscript, episodeUrl: { not: null }, transcriptDiscoveryAttempts: { lt: externalMax } } }),
    db.episode.count({ where: { ...noTranscript, podcast: { active: true }, transcriptStatus: { not: "FAILED" },
      AND: [
        { OR: [{ publisherTranscriptUrl: null }, { publisherTranscriptAttempts: { gte: externalMax } }] },
        { OR: [{ episodeUrl: null }, { transcriptDiscoveryAttempts: { gte: externalMax } }] },
      ] } }),
    db.episode.count({ where: { transcriptStatus: "FAILED" } }),
    db.episode.count({ where: { ...noTranscript, publisherTranscriptLastError: { not: null } } }),
    db.person.findMany({ select: { slug: true, portraitUrl: true } }),
    db.videoChat.count({ where: { active: false } }),
    usageSince(db, startOfDay, staleProcessing),
    usageSince(db, startOfMonth, staleProcessing),
  ]);

  const counts: OpsQueueCounts = {
    unreviewedHosts, unverifiedShowMapping,
    unresolvedShowCandidates: podcastRegistry.candidates.length,
    crawlErrors, staleFeeds, neverSyncedFeeds,
    publisherTranscriptPending, webTranscriptPending, generatedBlocked, transcriptFailures, brokenSourceLinks,
    missingPortraits: people.filter((p) => !p.portraitUrl && !portraitUrlForSlug(p.slug)).length,
    videoCandidatesPending,
  };
  const generation = generatedTranscriptionState({
    enabled: process.env.TRANSCRIPTION_ENABLED === "true",
    hasCredentials: Boolean(process.env.OPENAI_API_KEY),
    remainingSeconds: remainingBudgetSeconds({
      dailyCapSeconds: positiveInteger(process.env.TRANSCRIPTION_DAILY_MAX_MINUTES, 180) * 60,
      monthlyCapSeconds: positiveInteger(process.env.TRANSCRIPTION_MONTHLY_MAX_MINUTES, 1800) * 60,
      day, month,
    }),
  });
  return { checkedAt: now, staleHours, generation, queues: buildOpsQueues(counts, generation) };
}
