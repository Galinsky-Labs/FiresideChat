/**
 * FC-P20: reproducible per-show and per-person archive coverage audit with
 * explicit acceptance checks. It never presents partial coverage as complete
 * and never claims that every former member of Congress had a podcast.
 */
export type ShowObservation = {
  slug: string;
  title: string;
  personSlugs: string[];
  registryActive: boolean;
  publishingStatus: "ACTIVE" | "INACTIVE" | "UNKNOWN";
  inDatabase: boolean;
  episodes: number;
  lastSuccessfulCheckAt: Date | null;
  consecutiveFailures: number;
  lastError: string | null;
  transcripts: {
    complete: number;
    publisherPending: number;
    publisherFailedTerminal: number;
    webSearchPending: number;
    webSearchNegative: number;
    queuedForGeneration: number;
    generationFailed: number;
  };
};

export type ShowImportState =
  | "IMPORTED"
  | "IMPORTED_NO_EPISODES"
  | "SOURCE_FAILURE_RECORDED"
  | "NOT_SEEDED"
  | "INACTIVE_NOT_INGESTED"
  | "PENDING_FIRST_IMPORT";

export function showImportState(show: ShowObservation): ShowImportState {
  if (!show.inDatabase) return "NOT_SEEDED";
  if (!show.registryActive) return show.episodes > 0 ? "IMPORTED" : "INACTIVE_NOT_INGESTED";
  if (show.episodes > 0) return "IMPORTED";
  if (show.consecutiveFailures > 0 && show.lastError) return "SOURCE_FAILURE_RECORDED";
  if (show.lastSuccessfulCheckAt) return "IMPORTED_NO_EPISODES";
  return "PENDING_FIRST_IMPORT";
}

/** True when every free public transcript path for the show reached a documented terminal state. */
export function publicTranscriptsTerminal(show: ShowObservation): boolean {
  return show.transcripts.publisherPending === 0 && show.transcripts.webSearchPending === 0;
}

export type AcceptanceCheck = { id: string; description: string; passed: boolean; detail: string };

export function buildAcceptanceReport(input: {
  checkedAt: Date;
  people: ReadonlyArray<{ slug: string; fullName: string; kind: string; isCurrent: boolean }>;
  shows: readonly ShowObservation[];
  unresolvedCandidates: ReadonlyArray<{ person: string; show: string; reason: string }>;
  generationAuthorized: boolean;
}) {
  const shows = input.shows.map((show) => ({
    slug: show.slug,
    title: show.title,
    people: show.personSlugs,
    publishingStatus: show.publishingStatus,
    importState: showImportState(show),
    episodes: show.episodes,
    lastSuccessfulCheckAt: show.lastSuccessfulCheckAt?.toISOString() ?? null,
    lastError: show.lastError ? show.lastError.slice(0, 300) : null,
    transcripts: show.transcripts,
    publicTranscriptsTerminal: publicTranscriptsTerminal(show),
  }));
  const byState = (state: ShowImportState) => shows.filter((s) => s.importState === state).length;
  const sum = (key: keyof ShowObservation["transcripts"]) => input.shows.reduce((n, s) => n + s.transcripts[key], 0);
  const people = input.people.map((person) => {
    const own = shows.filter((s) => s.people.includes(person.slug));
    return {
      slug: person.slug,
      fullName: person.fullName,
      kind: person.kind,
      isCurrent: person.isCurrent,
      verifiedShows: own.length,
      importedShows: own.filter((s) => s.importState === "IMPORTED").length,
      episodes: own.reduce((n, s) => n + s.episodes, 0),
      completeTranscripts: own.reduce((n, s) => n + s.transcripts.complete, 0),
      blockedShows: own.filter((s) => s.importState !== "IMPORTED").map((s) => ({ slug: s.slug, state: s.importState })),
    };
  });
  const activeShows = shows.filter((s) => input.shows.find((o) => o.slug === s.slug)?.registryActive);
  const unexplained = activeShows.filter((s) => s.importState === "PENDING_FIRST_IMPORT" || s.importState === "NOT_SEEDED");
  const nonTerminal = shows.filter((s) => !s.publicTranscriptsTerminal);
  const checks: AcceptanceCheck[] = [
    {
      id: "SHOWS_IMPORTED_OR_EXPLAINED",
      description: "Every verified ingestable show has imported episodes or a recorded source failure.",
      passed: unexplained.length === 0,
      detail: unexplained.length ? `${unexplained.length} show(s) not yet imported: ${unexplained.slice(0, 10).map((s) => s.slug).join(", ")}` : "All verified ingestable shows accounted for.",
    },
    {
      id: "PUBLIC_TRANSCRIPTS_TERMINAL",
      description: "All publisher and website transcript sources reached a documented terminal state.",
      passed: nonTerminal.length === 0,
      detail: `${sum("publisherPending")} publisher and ${sum("webSearchPending")} website searches still pending across ${nonTerminal.length} show(s).`,
    },
    {
      id: "REMAINDER_QUEUED_FOR_AUTHORIZED_GENERATION",
      description: "Episodes without a public transcript are complete or queued for authorized generation.",
      passed: sum("queuedForGeneration") === 0,
      detail: input.generationAuthorized
        ? `${sum("queuedForGeneration")} episodes queued, ${sum("generationFailed")} failed generation.`
        : `${sum("queuedForGeneration")} episodes wait for generated transcription, which is not authorized (no credentials/budget approval).`,
    },
    {
      id: "CANDIDATES_RESOLVED",
      description: "Every discovered candidate show is verified or carries a recorded blocker.",
      passed: input.unresolvedCandidates.length === 0,
      detail: `${input.unresolvedCandidates.length} candidate(s) remain unresolved in the registry.`,
    },
  ];
  return {
    schemaVersion: 1,
    planUnit: "FC-P20",
    checkedAt: input.checkedAt.toISOString(),
    accepted: checks.every((c) => c.passed),
    statement: checks.every((c) => c.passed)
      ? "All acceptance checks pass for the verified registry at checkedAt. This covers verified shows only and does not assert that every former official hosted a podcast."
      : "Archive coverage is INCOMPLETE. Missing and blocked data is listed below; nothing here represents full coverage.",
    checks,
    totals: {
      people: input.people.length,
      verifiedShows: shows.length,
      imported: byState("IMPORTED"),
      importedNoEpisodes: byState("IMPORTED_NO_EPISODES"),
      sourceFailureRecorded: byState("SOURCE_FAILURE_RECORDED"),
      pendingFirstImport: byState("PENDING_FIRST_IMPORT"),
      inactiveNotIngested: byState("INACTIVE_NOT_INGESTED"),
      notSeeded: byState("NOT_SEEDED"),
      episodes: shows.reduce((n, s) => n + s.episodes, 0),
      completeTranscripts: sum("complete"),
    },
    blockedShows: shows.filter((s) => s.importState !== "IMPORTED"),
    unresolvedCandidates: input.unresolvedCandidates,
    people,
    shows,
  };
}
