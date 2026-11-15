# Production operations

Fireside Chat has one maintenance command for the recurring archive update cycle:

```bash
npm run sync:archive
```

The command runs all three stages in order:

1. **Feed ingestion** — checks every due active RSS/Atom feed, inserts new episodes, refreshes metadata, and ingests publisher-provided transcripts.
2. **Existing-transcript recovery** — retry publisher RSS transcript URLs and inspect the episode's original website for a clearly labeled transcript download or embedded transcript.
3. **Generated transcript fallback** — attempts automatic transcription only when it is explicitly enabled and only for episodes that still have no publisher transcript.

The transcript stage still runs when an individual feed fails, so one bad source cannot prevent unrelated missing transcripts from progressing. The maintenance command exits non-zero when either stage reports failures, which lets a scheduler surface the run for attention.

## Recommended schedule

For the current low-cost deployment, run the maintenance command once per day:

```
npm run sync:archive
```

If the archive later needs faster freshness, the same command can be scheduled more frequently without changing the application architecture. RSS conditional requests and feed retry backoff reduce unnecessary transfer.

## Automatic transcript recovery on the Render preview

On the current free Render preview, a paid cron job is unavailable. The
production Next.js Node process therefore starts a bounded transcript recovery
worker about 15 seconds after startup and repeats approximately every 20 minutes
while the service is awake. The GitHub Actions workflow
`.github/workflows/wake-transcript-backfill.yml` requests the public liveness
endpoint twice an hour to wake sleeping instances. Render sleep and GitHub
scheduler delays mean this is **best effort**, not a strict real-time guarantee.

The free web worker also refreshes up to five stale/never-synced RSS feeds per cycle, aiming for a 24-hour feed freshness window. Leave `STARTUP_ARCHIVE_SYNC=false` in Render once this worker is deployed; the web service should not block its health checks on a full archive refresh at every wake-up.

The free worker attempts up to `PUBLISHER_BACKFILL_PER_RUN` (default 80) RSS
transcripts and `TRANSCRIPT_DISCOVERY_PER_RUN` (default 15) episode-page
lookups per cycle. It persists attempt counters, backoff and last errors so a
bad publisher URL cannot starve other shows indefinitely. It saves published
VTT, SRT, plain text, HTML, and Podcasting 2.0 JSON transcripts, including
timestamp segments when supplied.

To run or accelerate manually against the configured database:

```bash
npm run backfill:transcripts -- --publisher-limit=200 --discovery-limit=30
npm run archive:status
```

Metadata or an episode description is never substituted for a transcript.
Episode websites are inspected for explicit transcript links or transcript
sections only; search indexes and platform captions behind authentication are
not harvested. Successful imports are stored locally for fast full-text search.

### Discovery matching and transcript QA (FC-P11, FC-P14)

Before a web-discovered transcript is imported it must match the episode (`src/lib/transcription/transcript-match.ts`): empty, too-short (< 50 words), paywall/login pages, re-published show notes, off-site scripts that do not name the episode, and timed captions whose length cannot fit the episode are rejected. A negative search is terminal until reset and records `transcriptDiscoveryLastError` (`NO_TRANSCRIPT_FOUND` or `NO_MATCHING_TRANSCRIPT: rejected …`) together with `transcriptDiscoveryLastAttemptAt`.

Every stored transcript passes `prepareTranscriptForStorage` (`src/lib/transcription/transcript-qa.ts`): text is Unicode-normalized without altering words; cues that are empty, negative, non-finite, end before they start or start beyond the episode are dropped (never re-timed); out-of-order cues are re-sorted; overlaps are reported. Generated transcripts never carry speaker names; publisher-supplied labels are kept. Publisher transcripts always outrank generated ones.

## Generated transcription cost guard

Generated transcription is disabled by default and needs an OpenAI API account
with available credits. It requires both:

```bash
TRANSCRIPTION_ENABLED=true
OPENAI_API_KEY=...
```

The worker is additionally bounded by:

- `TRANSCRIPTION_MAX_EPISODES_PER_RUN`
- `TRANSCRIPTION_MAX_ATTEMPTS`
- `TRANSCRIPTION_RETRY_DELAY_MINUTES`
- `TRANSCRIPTION_MAX_AUDIO_BYTES` (the original downloaded source; FFmpeg compresses and segments every episode for the 25 MB upload ceiling)
- `TRANSCRIPTION_MAX_DURATION_SECONDS` (default four hours)
- `TRANSCRIPTION_DAILY_MAX_MINUTES` and `TRANSCRIPTION_MONTHLY_MAX_MINUTES` (bounded audio-duration attempts, with unknown lengths estimated conservatively)
- `TRANSCRIPTION_TIMEOUT_MS`

Publisher and discoverable episode-site transcripts are always attempted before the
metered fallback. A publisher URL that fails repeatedly does not permanently
block speech-to-text. The FFmpeg runtime is bundled via ffmpeg-static; each
transcription request handles a 15-minute mono MP3 segment, offsetting its
timestamps back into the original episode.

As of the October 10 audit, the database contained 10,208 episodes, 978
complete transcripts, 1,881 pending source URLs, and 7,349 episodes without
an RSS transcript reference. These are point-in-time figures, not a guarantee
of complete online source availability. Importing all 7,349 remaining
episodes via API would carry nontrivial costs; no metered audio is submitted
until `TRANSCRIPTION_ENABLED=true` and `OPENAI_API_KEY` are configured.

## Health endpoints

- `/api/health/live` — process liveness only; does not touch PostgreSQL.
- `/api/health/ready` — database readiness plus feed and archive diagnostics.
- `/api/health` — backward-compatible alias with the readiness diagnostics.

Use the liveness endpoint when the hosting platform only needs to know whether the web process is responsive. Use readiness when database reachability matters.

## Private operations dashboard

The private dashboard is available at `/admin` after these values are configured:

```bash
ADMIN_PASSWORD=...
ADMIN_SESSION_SECRET=...
```

The session secret should be a long random value independent of the login password. The dashboard shows feed failures, staleness, retry state, transcript coverage, generated-transcription failures, and recent ingestion runs.

## Command-line status

For a machine-readable production snapshot:

```bash
npm run archive:status
```

This reports active/healthy/stale/failing feeds, latest successful ingestion time, episode count, transcript coverage, and unresolved transcript failures.

## Failure response

When `sync:archive` exits non-zero:

1. Run `npm run archive:status`.
2. Open `/admin` and identify the failing feed or transcript job.
3. For feed failures, inspect the publisher URL and the stored last error before forcing a retry.
4. For generated-transcript failures, check audio size, source availability, retry count, and provider configuration.
5. Do not clear failure state merely to make monitoring green; resolve the underlying source or configuration problem first.


## One-time bootstrap / recovery sync

If a newly provisioned production database has the registry but no episodes yet, temporarily set:

```bash
STARTUP_ARCHIVE_SYNC=true
```

The next web-service startup will seed the registry and then run `npm run sync:archive`. Feed failures are surfaced in logs but do not prevent the web process from starting. After the bootstrap run completes, set `STARTUP_ARCHIVE_SYNC=false` again so normal deployments do not perform a full archive sync.
