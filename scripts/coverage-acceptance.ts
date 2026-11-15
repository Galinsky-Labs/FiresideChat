import "dotenv/config";
import { podcastRegistry } from "../src/data/podcast-registry";
import { db } from "../src/lib/db";
import { buildAcceptanceReport, type ShowObservation } from "../src/lib/archive-acceptance";

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/** FC-P20: print the reproducible per-person / per-show acceptance audit (read-only). */
async function main() {
  const externalMax = positiveInteger(process.env.EXTERNAL_TRANSCRIPT_MAX_ATTEMPTS, 3);
  const generatedMax = positiveInteger(process.env.TRANSCRIPTION_MAX_ATTEMPTS, 3);
  const noTranscript = { transcript: { is: null } } as const;
  const group = (where: object) => db.episode.groupBy({ by: ["podcastId"], where, _count: { _all: true } });
  const [podcasts, episodes, complete, publisherPending, publisherFailed, webPending, webNegative, generationFailed] = await Promise.all([
    db.podcast.findMany({ select: { id: true, slug: true, lastSuccessfulCheckAt: true, consecutiveFailures: true, lastError: true } }),
    group({}),
    group({ transcript: { isNot: null } }),
    group({ ...noTranscript, publisherTranscriptUrl: { not: null }, publisherTranscriptAttempts: { lt: externalMax } }),
    group({ ...noTranscript, publisherTranscriptUrl: { not: null }, publisherTranscriptAttempts: { gte: externalMax } }),
    group({ ...noTranscript, episodeUrl: { not: null }, transcriptDiscoveryAttempts: { lt: externalMax } }),
    group({ ...noTranscript, episodeUrl: { not: null }, transcriptDiscoveryAttempts: { gte: externalMax } }),
    group({ ...noTranscript, transcriptionAttempts: { gte: generatedMax } }),
  ]);
  const idx = (rows: Array<{ podcastId: string; _count: { _all: number } }>) =>
    new Map(rows.map((r) => [r.podcastId, r._count._all]));
  const [ep, done, pubP, pubF, webP, webN, genF] = [episodes, complete, publisherPending, publisherFailed, webPending, webNegative, generationFailed].map(idx);
  const bySlug = new Map(podcasts.map((p) => [p.slug, p]));
  const shows: ShowObservation[] = podcastRegistry.podcasts.map((show) => {
    const row = bySlug.get(show.slug);
    const id = row?.id ?? "";
    const total = ep.get(id) ?? 0;
    const pending = (pubP.get(id) ?? 0) + (webP.get(id) ?? 0);
    const transcripts = {
      complete: done.get(id) ?? 0,
      publisherPending: pubP.get(id) ?? 0,
      publisherFailedTerminal: pubF.get(id) ?? 0,
      webSearchPending: webP.get(id) ?? 0,
      webSearchNegative: webN.get(id) ?? 0,
      generationFailed: genF.get(id) ?? 0,
      queuedForGeneration: 0,
    };
    transcripts.queuedForGeneration = Math.max(0, total - transcripts.complete - pending - transcripts.generationFailed);
    return {
      slug: show.slug, title: show.title, personSlugs: show.people.map((p) => p.personSlug),
      registryActive: show.active, publishingStatus: show.publishingStatus, inDatabase: Boolean(row),
      episodes: total, lastSuccessfulCheckAt: row?.lastSuccessfulCheckAt ?? null,
      consecutiveFailures: row?.consecutiveFailures ?? 0, lastError: row?.lastError ?? null, transcripts,
    };
  });
  const report = buildAcceptanceReport({
    checkedAt: new Date(),
    people: podcastRegistry.people,
    shows,
    unresolvedCandidates: podcastRegistry.candidates.map((c) => ({ person: c.person, show: c.show, reason: c.reason })),
    generationAuthorized: process.env.TRANSCRIPTION_ENABLED === "true" && Boolean(process.env.OPENAI_API_KEY),
  });
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await db.$disconnect(); });
