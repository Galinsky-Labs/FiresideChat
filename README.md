# Fireside Chat

Fireside Chat is a nonpartisan archive for podcasts **and verified direct-to-audience video conversations** by current and former members of the U.S. Congress and U.S. presidents. Personal chats, livestreams, Q&As and behind-the-scenes videos are catalogued alongside podcasts without treating them as RSS audio episodes.

The product is organized around public servants rather than shows. A person may host multiple podcasts over time, while their Fireside Chat page remains the durable home for episodes, transcripts, accomplishments, and eventually official contact information.

**Complete development and independent-account handoff plan:** [docs/DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md). It preserves the original 11-step MVP roadmap and adds 20 fully scoped work packages for the exhaustive current/former congressional and presidential podcast census, feed/episode backfill, online transcript recovery, optional authorized automatic transcription, and production monitoring.

**Critical distinction:** a verified show in the registry is not automatically an imported episode; an episode is not automatically transcribed. The plan requires auditable coverage of both. See [docs/operations.md](docs/operations.md) and [docs/former-member-census.md](docs/former-member-census.md) for operational details.

## MVP roadmap

1. Application and PostgreSQL data foundation
2. Verified politician/podcast registry
3. RSS/Atom ingestion and automatic episode updates
4. Homepage and podcast directory
5. Persistent bottom audio player
6. Person pages and episode browsing
7. Publisher transcript ingestion
8. Automatic transcription when publisher transcripts are absent
9. Full-text transcript search with timestamp playback
10. Private administration and source-health interface
11. Production hardening and deployment

## Local development

Requirements: Node.js 20.9+ and Docker.

```bash
npm install
npm run dev:setup
npm run ingest:feeds
npm run dev
```

Open http://localhost:3000. Health check: http://localhost:3000/api/health.

For local development and Codespaces, database commands default to the Docker Compose PostgreSQL instance when `DATABASE_URL` is not set. `dev:setup` waits until PostgreSQL is accepting connections before applying migrations, so a fresh container cannot race the database startup. Production still requires an explicit `DATABASE_URL`. If you want to use another local database, copy `.env.example` to `.env` and edit it before running setup.

Run validation independently with:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

With the built or development server running on port 3000, run the rendered MVP acceptance crawl with:

```bash
npm run smoke:mvp
```

The crawl verifies the homepage, People directory, a seeded person page, a seeded podcast page, search, and the database-backed health endpoint.

## Verified podcast registry

The curated registry lives in `src/data/podcast-registry.ts`. Every ingestable show carries a canonical RSS URL, a verified host relationship, provenance, and a verification date. See `docs/podcast-registry.md` for the inclusion and review policy.

## Video conversations

The curated `src/data/video-registry.ts` lists individually verified videos with canonical original-publisher links, platform-specific IDs, publication dates, format, and provenance. The `prisma/seed.ts` process idempotently inserts these records after seeding their public-servant identities. Run `npm run db:deploy && npm run db:seed` to apply the VideoChat migration and ingest the curated entries.

Visit `/videos` to filter by Personal Chat, Livestream, Q&A, and Behind the Scenes. Video entries appear on the homepage, their host's person page, and in site search (including any authorized transcript text entered in the database). YouTube originals have privacy-conscious embedded playback plus a link to the publisher; other platforms link directly to the original.

Only verify content from the original official/publisher-controlled account. Do not add third-party news clips, guest appearances, campaign ads, or deleted Instagram live videos without a verifiable original permalink. The registry is deliberately curated; automatic social-platform crawling and bulk imports are not implemented, and the platform's terms must be respected. The AOC seed entry is a verified behind-the-scenes video, not a claim that her Instagram livestream archive has been recovered.

## Instagram integration

Verified Instagram professional-account videos and Reels can be discovered through Meta's authorized Business Discovery API, without scraping or rehosting. Media is staged for editorial review before appearing publicly. The initial configured source is `@aoc`; no access token or Meta App permissions are bundled with the repository.

See [Instagram setup and review instructions](docs/instagram-integration.md). Operators configure credentials, run `npm run ingest:instagram` and then `npm run review:instagram -- list`; reviewed videos can be approved or rejected with the review command. Setting `INSTAGRAM_SYNC_ENABLED=true` enables discovery during `npm run sync:archive`. Archived/deleted Live streams are not automatically recoverable.

## Feed ingestion

`npm run ingest:feeds` fetches all active, due feeds and idempotently inserts or updates their episodes. It supports conditional HTTP requests, RSS 2.0 and Atom, bounded concurrency, per-feed run records, failure isolation, and retry backoff. See `docs/rss-ingestion.md` for commands and operational details.

## Production operations

Run the complete recurring archive maintenance cycle with:

```bash
npm run sync:archive
```

This checks all due feeds, ingests publisher transcripts, and then runs the generated-transcript fallback when that feature is explicitly enabled. Use `npm run archive:status` for a machine-readable health snapshot. See `docs/operations.md` for scheduling, admin access, health probes, transcription cost guards, and failure-response procedures.

## Editorial scope

The verified registry includes a podcast only when a current or former member of Congress, or a U.S. president, hosts it, co-hosts it, or the show is officially produced on their behalf. Guest appearances alone do not qualify.

Fireside Chat is independent and is not affiliated with or endorsed by the public officials whose publicly available podcasts it indexes.

## End-to-End Everywhere progress

The canonical [security/e2eesa-status.json](security/e2eesa-status.json) records standard implementation, complete testing and independent expert review separately. Engine Room reads it automatically from GitHub. All initial stages are pending; existing profile locks and approved decisions remain authoritative. Read [adoption and independent-account instructions](docs/E2EESA_ADOPTION.md), and run `python3 scripts/validate_e2eesa_status.py`. Record validation does not establish product security or certification.
