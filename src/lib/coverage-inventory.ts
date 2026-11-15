export type PersonKind = "HOUSE" | "SENATE" | "SHADOW_SENATE" | "PRESIDENT";
export type PublishingStatus = "ACTIVE" | "INACTIVE" | "UNKNOWN";
export type TranscriptStatus = "MISSING" | "AVAILABLE" | "QUEUED" | "PROCESSING" | "COMPLETE" | "FAILED";
export type TranscriptSource = "PUBLISHER" | "GENERATED";

type RegistryPerson = Readonly<{ slug: string; kind: PersonKind; isCurrent: boolean }>;
type RegistryPodcast = Readonly<{ active: boolean; publishingStatus: PublishingStatus; people: readonly Readonly<{ personSlug: string }>[] }>;
type FeedObservation = Readonly<{
  active: boolean;
  publishingStatus: PublishingStatus;
  lastSuccessfulCheckAt: Date | null;
  consecutiveFailures: number;
  nextRetryAt: Date | null;
}>;
type CountRow<T extends string> = Readonly<{ value: T; count: number }>;

export type CoverageInventoryInput = Readonly<{
  checkedAt: Date;
  deployedCommit: string | null;
  registry: Readonly<{ people: readonly RegistryPerson[]; podcasts: readonly RegistryPodcast[]; candidates: readonly unknown[] }>;
  database: Readonly<{
    people: readonly Readonly<{ kind: PersonKind; isCurrent: boolean; count: number }>[];
    feeds: readonly FeedObservation[];
    transcriptStates: readonly CountRow<TranscriptStatus>[];
    transcriptSources: readonly CountRow<TranscriptSource>[];
    durationSeconds: number;
    latestSuccessfulIngestionAt: Date | null;
  }>;
  staleAfterHours: number;
  automaticFeedRefresh: boolean;
  generatedTranscription: boolean;
}>;

const PERSON_KINDS = ["HOUSE", "SENATE", "PRESIDENT", "SHADOW_SENATE"] as const;
const PUBLISHING_STATES = ["ACTIVE", "INACTIVE", "UNKNOWN"] as const;
const TRANSCRIPT_STATES = ["MISSING", "AVAILABLE", "QUEUED", "PROCESSING", "COMPLETE", "FAILED"] as const;
const TRANSCRIPT_SOURCES = ["PUBLISHER", "GENERATED"] as const;

function zeroRecord<const T extends readonly string[]>(keys: T): Record<T[number], number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<T[number], number>;
}

function currentByKind(rows: readonly Readonly<{ kind: PersonKind; isCurrent: boolean; count?: number }>[]) {
  const result = zeroRecord(PERSON_KINDS);
  for (const row of rows) if (row.isCurrent) result[row.kind] += row.count ?? 1;
  return result;
}

function counted<const T extends readonly string[]>(keys: T, rows: readonly CountRow<T[number]>[]) {
  const result = zeroRecord(keys);
  for (const row of rows) result[row.value] += row.count;
  return result;
}

export function buildCoverageInventory(input: CoverageInventoryInput) {
  const checkedAtMs = input.checkedAt.getTime();
  if (!Number.isFinite(checkedAtMs)) throw new TypeError("checkedAt must be valid");
  if (!Number.isInteger(input.staleAfterHours) || input.staleAfterHours <= 0) throw new TypeError("staleAfterHours must be positive");
  const staleCutoff = checkedAtMs - input.staleAfterHours * 3_600_000;
  const databaseFeedHealth = { healthy: 0, stale: 0, failing: 0, neverSynced: 0, retryBlocked: 0 };
  const databasePublishing = zeroRecord(PUBLISHING_STATES);
  for (const feed of input.database.feeds) {
    databasePublishing[feed.publishingStatus] += 1;
    if (!feed.active) continue;
    if (feed.nextRetryAt && feed.nextRetryAt.getTime() > checkedAtMs) databaseFeedHealth.retryBlocked += 1;
    if (feed.consecutiveFailures > 0) databaseFeedHealth.failing += 1;
    else if (!feed.lastSuccessfulCheckAt) databaseFeedHealth.neverSynced += 1;
    else if (feed.lastSuccessfulCheckAt.getTime() < staleCutoff) databaseFeedHealth.stale += 1;
    else databaseFeedHealth.healthy += 1;
  }

  const registryPublishing = zeroRecord(PUBLISHING_STATES);
  const qualifiedPeople = new Set<string>();
  for (const podcast of input.registry.podcasts) {
    registryPublishing[podcast.publishingStatus] += 1;
    for (const relationship of podcast.people) qualifiedPeople.add(relationship.personSlug);
  }
  const transcriptStates = counted(TRANSCRIPT_STATES, input.database.transcriptStates);
  const transcriptSources = counted(TRANSCRIPT_SOURCES, input.database.transcriptSources);
  const episodes = Object.values(transcriptStates).reduce((sum, value) => sum + value, 0);

  return {
    schemaVersion: 1,
    planUnit: "FC-P01",
    checkedAt: input.checkedAt.toISOString(),
    evidence: {
      committedRegistry: "src/data/podcast-registry.ts",
      database: "configured PostgreSQL at command execution",
      deployedCommit: input.deployedCommit,
    },
    registry: {
      people: input.registry.people.length,
      currentPeopleByClass: currentByKind(input.registry.people),
      currentCongressionalPeople: input.registry.people.filter((person) => person.isCurrent && (person.kind === "HOUSE" || person.kind === "SENATE")).length,
      currentShadowSenators: input.registry.people.filter((person) => person.isCurrent && person.kind === "SHADOW_SENATE").length,
      qualifiedPeople: qualifiedPeople.size,
      verifiedPodcasts: input.registry.podcasts.length,
      podcastsByPublishingState: registryPublishing,
      ingestableFeeds: input.registry.podcasts.filter((podcast) => podcast.active).length,
      unresolvedCandidates: input.registry.candidates.length,
    },
    database: {
      people: input.database.people.reduce((sum, row) => sum + row.count, 0),
      currentPeopleByClass: currentByKind(input.database.people),
      feeds: input.database.feeds.length,
      feedsByPublishingState: databasePublishing,
      feedHealth: { ...databaseFeedHealth, staleAfterHours: input.staleAfterHours },
      episodes,
      episodeHours: Math.round((input.database.durationSeconds / 3600) * 100) / 100,
      transcriptStates,
      transcriptSources,
      transcriptCoveragePercent: episodes > 0 ? Math.round((transcriptStates.COMPLETE / episodes) * 10_000) / 100 : 0,
      latestSuccessfulIngestionAt: input.database.latestSuccessfulIngestionAt?.toISOString() ?? null,
    },
    schedule: {
      webWorker: { enabled: input.automaticFeedRefresh, cadenceMinutes: 20, feedsPerCycle: 5, bestEffort: true },
      githubWake: { workflow: ".github/workflows/wake-transcript-backfill.yml", cadence: "twice-hourly", bestEffort: true },
      generatedTranscription: { enabled: input.generatedTranscription, metered: true },
    },
    limitations: [
      "Registry counts describe committed verified relationships, not successful ingestion.",
      "Database counts describe the configured database at checkedAt, not every eligible officeholder or show.",
      "The free web worker and GitHub wake schedule are best effort, not durable scheduling evidence.",
    ],
  } as const;
}
