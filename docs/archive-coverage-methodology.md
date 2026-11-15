# Archive coverage methodology (FC-P20)

FiresideChat archives podcasts that are hosted, co-hosted or officially produced by current or former members of Congress and presidents. Guest appearances never qualify on their own. Most former members never hosted a podcast; this archive does **not** claim otherwise, and coverage is measured only against shows verified in `src/data/podcast-registry.ts`.

## Reproducing the audit

```bash
npm run coverage:acceptance   # per-show and per-person audit + acceptance checks (read-only)
npm run archive:status        # FC-P01 inventory of registry vs. configured database
npm run transcription:plan    # FC-P13 transcript backlog, cost and throughput preview
```

Each command reads the committed registry and the database configured by `DATABASE_URL`. Run them against the production database and keep the dated JSON as the snapshot; a local run describes only the local database. Administrators can also fetch the live inventory at `/api/admin/coverage-inventory` and the queues at `/api/admin/queues`.

## States

Per show (`showImportState`): `IMPORTED`, `IMPORTED_NO_EPISODES`, `SOURCE_FAILURE_RECORDED` (failing feed with a recorded error), `PENDING_FIRST_IMPORT`, `INACTIVE_NOT_INGESTED`, `NOT_SEEDED`.

Per show transcripts: complete; publisher transcript pending or terminally failed; website search pending or negative (FC-P11 records why); queued for generation; generation failed.

Registry candidates stay unresolved until FC-P04 host review and FC-P05 feed review record evidence or a precise blocker (FC-P06).

## Acceptance checks

1. `SHOWS_IMPORTED_OR_EXPLAINED`: every verified ingestable show has episodes or a recorded source failure.
2. `PUBLIC_TRANSCRIPTS_TERMINAL`: every publisher and website transcript source reached a terminal state.
3. `REMAINDER_QUEUED_FOR_AUTHORIZED_GENERATION`: nothing waits on generated transcription. While paid speech-to-text is not authorized, this check fails honestly.
4. `CANDIDATES_RESOLVED`: no registry candidate is left without a verdict.

`accepted` is true only when all four pass. Otherwise the report says coverage is incomplete and lists every blocked show.

## Not covered by automation (owner sign-off)

Independent sampling across current/former, party, era, show and publisher; rights and privacy review; production backups and recovery drills; documented operating costs. These remain open sign-off items and are not marked complete by any script. External human security review is deferred per owner policy (see AGENTS.md) and is not claimed.
