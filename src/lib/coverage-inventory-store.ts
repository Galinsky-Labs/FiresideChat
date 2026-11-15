import { podcastRegistry } from "@/data/podcast-registry";
import { buildCoverageInventory } from "@/lib/coverage-inventory";
import { db } from "@/lib/db";

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/** FC-P01: read the configured database and build the machine-readable coverage inventory. */
export async function readCoverageInventory() {
  const checkedAt = new Date();
  const staleAfterHours = positiveInteger(process.env.ADMIN_STALE_FEED_HOURS, 36);
  const [people, feeds, transcriptStates, transcriptSources, duration, latestRun] =
    await Promise.all([
      db.person.groupBy({
        by: ["kind", "isCurrent"],
        _count: { _all: true },
      }),
      db.podcast.findMany({
        select: {
          active: true,
          publishingStatus: true,
          lastSuccessfulCheckAt: true,
          consecutiveFailures: true,
          nextRetryAt: true,
        },
      }),
      db.episode.groupBy({
        by: ["transcriptStatus"],
        _count: { _all: true },
      }),
      db.transcript.groupBy({
        by: ["source"],
        _count: { _all: true },
      }),
      db.episode.aggregate({ _sum: { durationSeconds: true } }),
      db.ingestionRun.findFirst({
        where: { status: "SUCCEEDED" },
        orderBy: { completedAt: "desc" },
        select: { completedAt: true },
      }),
    ]);

  const commit = process.env.RENDER_GIT_COMMIT;
  const report = buildCoverageInventory({
    checkedAt,
    deployedCommit: commit && /^[a-f0-9]{40}$/.test(commit) ? commit : null,
    registry: podcastRegistry,
    database: {
      people: people.map((row) => ({
        kind: row.kind,
        isCurrent: row.isCurrent,
        count: row._count._all,
      })),
      feeds,
      transcriptStates: transcriptStates.map((row) => ({
        value: row.transcriptStatus,
        count: row._count._all,
      })),
      transcriptSources: transcriptSources.map((row) => ({
        value: row.source,
        count: row._count._all,
      })),
      durationSeconds: duration._sum.durationSeconds ?? 0,
      latestSuccessfulIngestionAt: latestRun?.completedAt ?? null,
    },
    staleAfterHours,
    automaticFeedRefresh: process.env.FEED_REFRESH_AUTOMATIC !== "false",
    generatedTranscription:
      process.env.TRANSCRIPTION_ENABLED === "true" &&
      Boolean(process.env.OPENAI_API_KEY),
  });

  return report;
}
