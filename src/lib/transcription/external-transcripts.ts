import { db } from "@/lib/db";
import { fetchPublisherTranscript } from "@/lib/feeds/publisher-transcript";
import type { ParsedPublisherTranscript } from "@/lib/feeds/publisher-transcript";
import { discoverEpisodePageTranscriptDetailed } from "./episode-page-discovery";
import { prepareTranscriptForStorage } from "./transcript-qa";

const MAX_ERROR_LENGTH = 1_500;
const DEFAULT_PUBLISHER_LIMIT = 80;
const DEFAULT_DISCOVERY_LIMIT = 15;
const RETRY_MINUTES = 180;

function positiveInt(value: string | undefined, fallback: number) {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function errorMessage(error: unknown) {
  return (error instanceof Error ? error.message : String(error)).slice(0, MAX_ERROR_LENGTH);
}

export type ExternalRecoveryResult = {
  publisher: { selected: number; recovered: number; failed: number; skipped: number };
  discovery: { selected: number; recovered: number; missed: number; failed: number; skipped: number };
};

async function saveExternalTranscript(
  episodeId: string,
  result: ParsedPublisherTranscript,
  discoveredFrom?: { url: string; mimeType: string | null },
  durationSeconds?: number | null,
) {
  // FC-P14: drop structurally invalid segments and refuse empty transcripts.
  const prepared = prepareTranscriptForStorage(result, "PUBLISHER", durationSeconds);
  result = { fullText: prepared.fullText, segments: prepared.segments };
  await db.$transaction(async (tx) => {
    const episode = await tx.episode.findUnique({
      where: { id: episodeId },
      include: { transcript: true },
    });
    if (!episode) return;
    const transcript = await tx.transcript.upsert({
      where: { episodeId },
      create: {
        episodeId,
        source: "PUBLISHER",
        fullText: result.fullText,
      },
      update: {
        source: "PUBLISHER",
        fullText: result.fullText,
      },
    });
    await tx.transcriptSegment.deleteMany({
      where: { transcriptId: transcript.id },
    });
    for (let i = 0; i < result.segments.length; i += 500) {
      await tx.transcriptSegment.createMany({
        data: result.segments.slice(i, i + 500).map((segment) => ({
          transcriptId: transcript.id,
          ...segment,
        })),
      });
    }
    await tx.episode.update({
      where: { id: episodeId },
      data: {
        transcriptStatus: "COMPLETE",
        ...(discoveredFrom ? {
          publisherTranscriptUrl: discoveredFrom.url,
          publisherTranscriptMimeType: discoveredFrom.mimeType,
          publisherTranscriptLastError: null,
        } : {
          publisherTranscriptLastError: null,
        }),
      },
    });
  }, { timeout: 40_000 });
}

async function workerPool<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next];
      next += 1;
      await fn(item);
    }
  }));
}

export async function backfillExternalTranscripts(options: {
  publisherLimit?: number; discoveryLimit?: number; concurrency?: number;
} = {}): Promise<ExternalRecoveryResult> {
  const publisherLimit = options.publisherLimit ??
    positiveInt(process.env.PUBLISHER_BACKFILL_PER_RUN, DEFAULT_PUBLISHER_LIMIT);
  const discoveryLimit = options.discoveryLimit ??
    positiveInt(process.env.TRANSCRIPT_DISCOVERY_PER_RUN, DEFAULT_DISCOVERY_LIMIT);
  const maxAttempts = positiveInt(process.env.EXTERNAL_TRANSCRIPT_MAX_ATTEMPTS, 3);
  const concurrency = Math.min(5, options.concurrency ?? 3);
  const retryBefore = new Date(Date.now() - RETRY_MINUTES * 60_000);
  const result: ExternalRecoveryResult = {
    publisher: { selected: 0, recovered: 0, failed: 0, skipped: 0 },
    discovery: { selected: 0, recovered: 0, missed: 0, failed: 0, skipped: 0 },
  };

  const publisher = await db.episode.findMany({
    where: {
      publisherTranscriptUrl: { not: null },
      OR: [
        { transcript: { is: null } },
        { transcript: { is: { source: "GENERATED" } } },
      ],
      publisherTranscriptAttempts: { lt: maxAttempts },
      AND: [{
        OR: [
          { publisherTranscriptLastAttemptAt: null },
          { publisherTranscriptLastAttemptAt: { lte: retryBefore } },
        ],
      }],
    },
    orderBy: [{ publisherTranscriptAttempts: "asc" }, { publishedAt: "desc" }],
    take: publisherLimit,
  });
  result.publisher.selected = publisher.length;

  await workerPool(publisher, concurrency, async (episode) => {
    const claimed = await db.episode.updateMany({
      where: {
        id: episode.id,
        publisherTranscriptAttempts: episode.publisherTranscriptAttempts,
        OR: [
          { publisherTranscriptLastAttemptAt: null },
          { publisherTranscriptLastAttemptAt: { lte: retryBefore } },
        ],
      },
      data: {
        publisherTranscriptAttempts: { increment: 1 },
        publisherTranscriptLastAttemptAt: new Date(),
        publisherTranscriptLastError: null,
      },
    });
    if (claimed.count !== 1) { result.publisher.skipped += 1; return; }
    try {
      if (!episode.publisherTranscriptUrl) return;
      const parsed = await fetchPublisherTranscript({
        url: episode.publisherTranscriptUrl,
        mimeType: episode.publisherTranscriptMimeType,
      });
      await saveExternalTranscript(episode.id, parsed, undefined, episode.durationSeconds);
      result.publisher.recovered += 1;
    } catch (error) {
      result.publisher.failed += 1;
      const message = errorMessage(error);
      await db.episode.update({
        where: { id: episode.id },
        data: { publisherTranscriptLastError: message },
      });
      console.warn("Publisher transcript recovery failed:", episode.id, message);
    }
  });

  const discovery = await db.episode.findMany({
    where: {
      episodeUrl: { not: null },
      transcript: { is: null },
      transcriptDiscoveryAttempts: { lt: maxAttempts },
      AND: [
        {
          OR: [
            { publisherTranscriptUrl: null },
            { publisherTranscriptAttempts: { gte: maxAttempts } },
          ],
        },
        {
          OR: [
            { transcriptDiscoveryLastAttemptAt: null },
            { transcriptDiscoveryLastAttemptAt: { lte: retryBefore } },
          ],
        },
      ],
    },
    orderBy: [{ transcriptDiscoveryAttempts: "asc" }, { publishedAt: "desc" }],
    take: discoveryLimit,
  });
  result.discovery.selected = discovery.length;

  await workerPool(discovery, concurrency, async (episode) => {
    const claimed = await db.episode.updateMany({
      where: {
        id: episode.id,
        transcriptDiscoveryAttempts: episode.transcriptDiscoveryAttempts,
        OR: [
          { transcriptDiscoveryLastAttemptAt: null },
          { transcriptDiscoveryLastAttemptAt: { lte: retryBefore } },
        ],
      },
      data: {
        transcriptDiscoveryAttempts: { increment: 1 },
        transcriptDiscoveryLastAttemptAt: new Date(),
        transcriptDiscoveryLastError: null,
      },
    });
    if (claimed.count !== 1) { result.discovery.skipped += 1; return; }
    try {
      if (!episode.episodeUrl) return;
      const { found, rejections } = await discoverEpisodePageTranscriptDetailed(episode.episodeUrl, {
        title: episode.title,
        description: episode.description,
        durationSeconds: episode.durationSeconds,
        episodeUrl: episode.episodeUrl,
      });
      if (!found) {
        // A successful negative discovery is terminal until an editor resets this
        // field; do not repeatedly crawl the same page on every maintenance run.
        // FC-P11: record what was searched and why candidates were refused.
        const reasons = [...new Set(rejections)];
        await db.episode.update({
          where: { id: episode.id },
          data: {
            transcriptDiscoveryAttempts: maxAttempts,
            transcriptDiscoveryLastError: reasons.length
              ? "NO_MATCHING_TRANSCRIPT: rejected " + reasons.join(", ")
              : "NO_TRANSCRIPT_FOUND",
          },
        });
        result.discovery.missed += 1;
        return;
      }
      await saveExternalTranscript(episode.id, found.transcript, {
        url: found.url, mimeType: found.mimeType,
      }, episode.durationSeconds);
      result.discovery.recovered += 1;
    } catch (error) {
      const message = errorMessage(error);
      result.discovery.failed += 1;
      await db.episode.update({
        where: { id: episode.id },
        data: { transcriptDiscoveryLastError: message },
      });
      console.warn("Episode transcript discovery failed:", episode.id, message);
    }
  });
  return result;
}
