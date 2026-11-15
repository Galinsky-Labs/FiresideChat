> Current PR registry: `registry/prs.json` is the single source for Boardroom and Engine Room. Earlier references below to `registry/roadmap.json` are superseded. Preserve the approved scope and acceptance requirements. See `registry/PR_FORMAT.md`.

> **Canonical PR roadmap:** [`registry/roadmap.json`](../registry/roadmap.json). Historical complete development specifications remain below; new PRs and counts must be entered only in the canonical file.

# FiresideChat — complete original and expanded development plan, podcast census, transcript recovery, and independent-account handoff

**Repository:** neophilism/FiresideChat  
**As-of planning baseline:** October 10, 2026. Source: the October 5 original 11-step MVP roadmap, October 8–10 podcast, transcript, production and congressional census decisions, and the October 10 instruction for an exhaustive, independently actionable development plan.  
**Status discipline:** the presence of code, a registered RSS URL or this document is not evidence that the live production app actually has the episodes/transcripts or successfully runs unattended.

## 1. Product charter — nonpartisan, person-centered congressional podcast archive

FiresideChat is a public podcast listening and transcript-research platform for **every qualifying podcast** hosted, co-hosted or officially produced on behalf of a present/former member of the U.S. Congress or a U.S. president. Build a continuously expanding historical archive, including **former** members, not a hand-curated short showcase. An official can host multiple shows and one show can have multiple qualifying hosts. Person profiles remain the primary navigation anchor across changing series, publisher networks, and offices.

**Inclusion:** verified host, verified co-host or verifiably officially produced for that official. **Do not include** a show merely because a public official appeared as a guest. There is no partisan inclusion or exclusion test. Congressional and presidential historical rosters must be systematically searched; finding a name in a podcast-search result is only a lead, never verified eligibility.

**Separate editorial category:** Washington, DC **shadow senators** can have explicitly labeled pages or podcast entries where approved (e.g. Michael D. Brown); they are **not counted as voting or otherwise qualifying members of Congress** in the canonical former/current congressional denominator. Keep category distinction in model and UI.

**Core audience flows:** watch current archive counters, browse and search people/podcasts/episodes, listen in a persistent bottom audio player, play chronological back catalogs, search transcripts and click timecoded quotes to jump to audio, see official-source provenance and accurate transcript availability; find historical and ended shows as well as active ones. Do not require user accounts, commentary/discussion boards, or unnecessary social-network functionality to consume the MVP. Administrative accounts remain private.

**Homepage and aesthetic:** premium recognizable public-service archive, not partisan advocacy. Homepage counters labeled **Voices of Congress**, **Episodes**, **Hours Straight From The Source** are computed from actual indexed database records, not static decoration. The “New across the archive” section should feature one Democratic and one Republican current/recent example when eligible content exists, using a documented reproducible selection rule; do not falsify party identity or select episodes merely for a visual pair. Portrait direction: nearly black-and-white faces with a subtle pink tint; desaturated Capitol sunset; a saturated Old Glory flag; neutral near-black-and-white jackets/ties; consistent pose/facing, recognizable likeness, accessible alt text. Human approval remains required for photographs, rights and face accuracy; media is not a condition for transcript ingestion.

**Scope exclusions:** commentary/rating of political positions, invented statements, falsely attributed transcripts, private feeds/paywalled acquisition, downloading audio in violation of access or licensing conditions, unauthorized impersonation, accounts for listening, and claims of completeness without census evidence. The system must remain transparent that it is independent of and not endorsed by listed officials.

## 2. Codebase inventory, exact boundaries, and independently verified starting point

The existing app is **Next.js 16 / TypeScript / React / PostgreSQL / Prisma**, with local Docker PostgreSQL and a Render web-preview configuration. Existing entry points:
- src/data/podcast-registry.ts — curated verified show+host relationship registry, canonical feeds, source notes and inactive show status.
- src/data/person-profiles.ts — person/profile, portraits and public biography presentation.
- prisma/schema.prisma and migrations — Person, Podcast, PodcastPerson, Episode, Transcript, TranscriptSegment and IngestionRun records; PersonKind includes HOUSE, SENATE, SHADOW_SENATE, PRESIDENT.
- src/lib/feeds/* and scripts/ingest-feeds.ts — idempotent RSS/Atom ingestion, conditional GET, URL safety, publisher transcripts, retry and run state.
- src/lib/transcription/*, scripts/backfill-transcripts.ts, scripts/transcribe-missing.ts — publisher feed/website transcript recovery, FFmpeg segmented speech-to-text fallback, retry and budget controls.
- scripts/sync-archive.ts and src/lib/transcription/recovery-scheduler.ts — feed maintenance + publisher-first transcript recovery + opt-in generated fallback; on free Render preview a best-effort background worker runs approximately every 20 minutes while awake.
- scripts/discover-former-podcasts.py, scripts/resolve-priority-podcast-feeds.py, .github/workflows/former-congress-podcast-census.yml — historical source discovery and unverified candidate output.
- src/app/{people,podcasts,episodes,search}/* and src/components/player/* — public browsing, persistent player and timestamp transcript UI.
- src/app/admin/*, src/lib/operational-health.ts, scripts/archive-status.ts — private health operations.
- README.md; docs/{operations,former-member-census,podcast-registry,podcast-expansion-2026-10,rss-ingestion}.md; .env.example; package.json; GitHub Actions workflows and tests.

**Point-in-time source observations, not promises about current live production:** the October 10 operations documentation reports **10,208 episodes**, **978 complete transcripts**, **1,881 episodes with linked pending source URLs**, and **7,349 without RSS transcript reference**. These sum to 10,208 but are not exhaustive proof that all source websites have been searched. Earlier reports cited around 37 active feeds; refresh the actual counts from the running database. A former-member census snapshot contained **12,231 historical roster entries** and prioritized **2,716 potentially podcast-era candidates**; the rest must remain in the census, not receive false “no podcast” verdicts.

**Collision/state watch on 2026-10-10:** PR #46 (improved former-member census/false-positive detection) was OPEN; PR #47 (publisher and episode-site transcript backfill) and PR #48 (free-Render background feed+transcript maintenance) were MERGED. Always check real GitHub state, branches, CI, current deployment and Neon data before implementation. Never redo already merged features or start a conflicting PR.

**Known outside constraints:** paid Render cron provisioning previously returned HTTP 402 payment required; the app currently uses a best-effort web-process worker plus a GitHub Actions wake workflow. That may allow free recovery but is **not a guaranteed durable scheduling service**; actual deployment, job execution, failure rate and data freshness must be measured. Generated OpenAI transcription is OFF by default because the API requires an available key and incurs charges. Do not enable paid audio processing or change Render plans without explicit authorization.

## 3. Preserve original eleven MVP work units (MVP-01 .. MVP-11)

These are the product's original October 5 work stages, not a declaration that GitHub PR #1..#11 map one-to-one or remain undone. Inspect the code and actual PR history before marking any unit complete.

### MVP-01 — Application and PostgreSQL data foundation
**Deliver:** reproducible Next.js/React/TypeScript, Prisma migrations/seed, local and hosted PostgreSQL, validated secrets, CI, health and deployment baseline. **Acceptance:** fresh checkout installs, migrates and seeds reliably; live/ready differentiated; restart/redeploy does not erase episodes or transcripts. **Dependencies:** none.

### MVP-02 — Verified politician and podcast registry
**Deliver:** persistent person IDs, canonical show identity, role/period relationships, verification sources, current/former status and ended shows. **Acceptance:** multiple shows per person, multiple hosts per show, duplicate identities/slug collisions and verified source associations tested; guest-only excluded. **Dependencies:** MVP-01.

### MVP-03 — RSS/Atom ingestion and automatic episode updates
**Deliver:** stable feed URLs, conditional requests, GUID/enclosure dedupe, paging/history where available, retries, source runs, publication timestamps and audio enclosure metadata. **Acceptance:** re-ingesting feeds produces zero duplicates, a failed feed does not abort others, earlier episodes retained when feed truncates. **Dependencies:** MVP-01, MVP-02.

### MVP-04 — Homepage and podcast directory
**Deliver:** polished site, person/show discovery, accurate derived archive counters, archive “new” section and search introduction. **Acceptance:** counters reflect queries, no stale hardcoded totals, keyboard and responsive navigation. **Dependencies:** MVP-01–03.

### MVP-05 — Persistent bottom audio player
**Deliver:** explicit playback selection, transport controls, resume, page navigation continuity, seek and deep-link timestamps. **Acceptance:** navigating while playing does not restart the stream; playback pauses or reports unsupported media appropriately; accessible mobile/keyboard controls. **Dependencies:** MVP-03–04.

### MVP-06 — Person pages and episode browsing
**Deliver:** person → shows → episodes chronological archive, searchable/browsable historic programs, portrait biography, source attribution and chronological filters. **Acceptance:** multi-show person presents all eligible series; ended shows remain available; pagination does not drop older episodes. **Dependencies:** MVP-02–05.

### MVP-07 — Publisher transcript ingestion
**Deliver:** read publicly accessible RSS Podcasting 2.0 transcript links and publisher-provided VTT, SRT, text, HTML, JSON formats; preserve source and timestamps; retry failures. **Acceptance:** tests for canonical and malformed transcript formats, duplicate imports and publisher replacement; never substitute episode description for a transcript. **Dependencies:** MVP-03.

### MVP-08 — Automatic transcription when publisher transcripts are absent
**Deliver:** durable provider-adapter speech-to-text fallback for eligible, accessible audio after free published-source lookup; chunk long episodes, cost budgets, retries, provenance and failure states. **Acceptance:** a realistic audio test yields retained readable transcript and valid time offsets; no metered request before user-approved spend/key; unknown audio/unavailable source receives explicit failure reason. **Dependencies:** MVP-07; authorized compute/provider gate.

### MVP-09 — Full-text transcript search and timestamp playback
**Deliver:** phrase and token search, safe snippets, source/episode/person filters, transcript segments and jump-to-playback. **Acceptance:** quote found only in transcript (not description) can be queried, clicked, played at the right time, and source distinguished as publisher or generated. **Dependencies:** MVP-05, MVP-07–08.

### MVP-10 — Private admin and source-health console
**Deliver:** authenticated operations, feed failures, staleness, transcription status, alert and manual repair queue, published-source verification. **Acceptance:** unconfigured dashboard not public; no secret leakage; operators can distinguish never-tried vs blocked vs failed vs complete without changing actual evidence. **Dependencies:** MVP-01–09.

### MVP-11 — Production hardening and deployment
**Deliver:** Neon/PostgreSQL migrations, Render/web hosting, long-running ingestion arrangement, monitoring, backups, accessibility and public endpoint acceptance. **Acceptance:** repeated scheduled updates actually populate live site, restore rehearsal succeeds, audio/player/transcript search smoke across current and historical official; costs/limitations visible and no synthetic episodes represented as genuine. **Dependencies:** MVP-01–10.

## 4. New completeness requirement: exhaustive host, show, episode and transcript coverage

The original eleven-stage MVP is insufficient to meet the **explicit October 9–10 instruction to include every qualifying current/former member and president**. This new program uses work IDs **FC-P01..FC-P20**. These IDs are approved product-scope decomposition for implementation, not GitHub PR numbers. Work is sequential where specified and independently parallelizable otherwise; keep additions separate from historic MVP work. Count only reviewed, implemented-and-tested changes, never mere documentation.

### FC-P01 — Current production truth and master coverage inventory
**Prerequisites:** MVP-01–03, credentials if available.
**Implement:** read live counts/feeds/status, deployed commit, canonical registry, historical census artifacts, missing transcripts and current PRs. Pin reproducible snapshot of registry/DB run date and content; separate committed and deployed coverage.
**Acceptance:** machine-readable report of current officials by class, qualified people, verified candidate shows, active/inactive ingestable feeds, episodes, transcript-by-source states, stale/blocked feeds and job schedule. Do not call historic screenshots live evidence.

### FC-P02 — Complete officeholder identity universe
**Prerequisites:** FC-P01.
**Implement:** source current/historical U.S. Congress roster (BioGuide keyed) and former members, presidents including former presidents, offices/terms, DC shadow senators as an explicitly labeled parallel type, deduplicate name variants and historical transitions. Preserve ALL historical roster rows even if clearly pre-podcast. Validate counts and roster update dates.
**Acceptance:** every roster person has an explicit discovery classification and identity provenance, including NOT_YET_SEARCHED; no voting-member count inflated by shadow category; same person in House and Senate not duplicated.

### FC-P03 — Multi-source podcast discovery across every eligible official
**Prerequisites:** FC-P02.
**Implement:** automatically search Apple Podcasts and other permitted public directories, official member/office/publisher pages, network listings, video/audio archives, older brand names and aliases; search titles, summaries, creator/publisher relationships and episode metadata, not just literal name/title; shard, checkpoint and rate-limit. Prioritize plausible podcast-era former officials without recording older ones as negative.
**Acceptance:** repeatable, complete roster audit with per-person searched time/method, candidates, confidence and explicit search failures; handle name collisions, show network links, and slow/rejected directory queries. Candidate matching does not automatically enroll a podcast.

### FC-P04 — Host/cohost/official-production verification queue
**Prerequisites:** FC-P03.
**Implement:** record each candidate show's evidence URL(s), officeholder identity, role, host date ranges, publisher statements, verification time, feed candidate and review state. Require source-backed approval/rejection with reviewer audit. Multiple officials on one show allowed. A guest appearance must not enter qualifying registry.
**Acceptance:** tests for guests, network-only credits, similarly named officials, officials becoming hosts after a show begins, and shared multi-host episodes. Manual queue has no unreviewed entries auto-enabled for import.

### FC-P05 — Historical/ambiguous feed and changed-host disambiguation
**Prerequisites:** FC-P04.
**Implement:** exact feed-specific resolution for shared publisher feeds, repurposed feeds, canceled/rebranded shows, multi-show networks and host-period restrictions. Record feed snapshots/identifiers and episode-level eligibility filters. Concrete candidate examples previously identified: Claire McCaskill, Peter Roskam, Obama-era series, and network/shows with changing hosts. Do not guess an RSS URL.
**Acceptance:** no unrelated network episodes shown under the officeholder; inactive show can be ingested for full back catalog; migration/change-of-feed preserves history.

### FC-P06 — Priority missing public-official catalog review
**Prerequisites:** FC-P03–05.
**Implement:** verify and audit all earlier named gaps, including Ron Paul, Matt Gaetz (distinct programs when legitimate), Adam Kinzinger, Heidi Heitkamp, Jon Tester, Hillary Clinton, Bill Clinton, Tulsi Gabbard, Joe Scarborough, Sean Duffy, Sherrod Brown, and other candidate politicians identified by census. Check GitHub registry first; do not create duplicate entries or assume an earlier PR deployed.
**Acceptance:** each candidate has verified active/archived show and imported episodes, or a precise recorded source/qualification blocker; not just a listing in code.

### FC-P07 — First-pass full archive ingestion for all verified shows
**Prerequisites:** FC-P04–06, MVP-03.
**Implement:** run bounded batch seed/ingest for every approved canonical show, including inactive shows; find oldest feeds/page windows and episode archives where publisher truncates RSS. Maintain per-feed backfill cursor, timestamps, ingest stats and replay after crash. Do not skip failed podcast because several others succeed.
**Acceptance:** all eligible show feeds attempted and each retained episode record has working source/enclosure status; count new/updated/skipped/errors; no duplicates on retry; a publisher feed's visible historical items can be independently reconciled to archived IDs.

### FC-P08 — Video-only shows and atypical podcast publication
**Prerequisites:** FC-P04–07.
**Implement:** source-specific adapter for legitimately public video/audio episodes, mixed podcast channels and downloadable episode media when they qualify as an actual recurring podcast. Mark feedless episodes clearly and preserve provenance/source/link. Do not indiscriminately ingest congressional speeches, TV interviews or guest appearances as podcasts.
**Acceptance:** demonstrate one legitimate feedless or video-only hosted series with correct episode-level filtering, rights, player fallback and transcript option.

### FC-P09 — Feed identity, history and anti-truncation hardening
**Prerequisites:** FC-P07–08.
**Implement:** GUID collisions, feed redirects, replaced enclosures, ownership/host changes, late edits and deletions/availability. Store source history and last seen; retain historical episodes when publisher RSS rolls off. Bound network/SQL writes for huge back catalogs.
**Acceptance:** simulated migration and truncation do not erase archived metadata/transcript references or attribute future episodes to former hosts incorrectly; re-ingest idempotent.

### FC-P10 — Full publisher-transcript bulk recovery
**Prerequisites:** MVP-07, FC-P07.
**Implement:** process every publicly supplied feed transcript URL, including JSON/VTT/SRT/text/HTML and supported equivalents; durable queue, source attribution, retries/backoff, saved segments, flags for empty/invalid content. Work in a bounded background queue and avoid multi-hour web startup.
**Acceptance:** backlog shrinks across scheduled cycles; supported transcripts enter full-text search and episode pages; classify URLs that require login/removed/forbidden, do not falsely mark complete or replace genuine publisher text with AI.

### FC-P11 — Additional online transcript discovery before generation
**Prerequisites:** FC-P10.
**Implement:** inspect show/episode official websites and legally accessible other published transcripts, explicitly labeled transcript links, publicly available caption files or licensed publisher archives; validate show/episode match (title, date, duration, context) rather than importing a similarly named program. Track negative search with last-searched date and error.
**Acceptance:** test true positives, off-site unrelated scripts, 403/paywall and zero-length false positives. One successful source yields a durable imported transcript with provenance; no episode description or generic page HTML misrepresented as transcript.

### FC-P12 — Reliable automatic speech-to-text fallback
**Prerequisites:** FC-P10–11, MVP-08, authorized provider/compute budget.
**Implement:** invoke automated transcription for episodes with accessible audio after available public transcripts are exhausted. Support robust bounded FFmpeg chunking, codec probing, timestamp-offset merge, language and accuracy review, idempotent leasing, resumable partial segments and provider-independent abstraction where economically justified. Evaluate an affordable local/offline worker alternative if it can run without unapproved compute purchases.
**Acceptance:** long episodes split safely below provider limits; interrupted work never bills a duplicate chunk without an idempotency/safety decision; final transcript searchable and correctly timestamped; recording access failures and inability to pay are honest explicit states. **Do not enable a paid OpenAI API transcription wave without credentials and cost approval.**

### FC-P13 — Cost planning and full backlog throughput
**Prerequisites:** FC-P01, FC-P10–12.
**Implement:** calculate backlog length by total accessible audio hours and provider/source availability; estimate actual prices from configured vendor rates or executable local-worker estimates; attempt cheap publisher sources first; schedule older episodes fairly, with a recent-episode freshness lane. Enforce per-day/month audio-minute/billing budgets and per-show fairness.
**Acceptance:** operator can preview expected batch cost, duration, source rate and completion time; an approval-controlled budget cap cannot be silently exceeded by parallel jobs or retries. “All episodes” gets an honest queued/attempted/complete/unavailable report even before paid processing is authorized.

### FC-P14 — Transcript integrity, correction and timestamp QA
**Prerequisites:** FC-P10–13.
**Implement:** full-text normalization, speaker labels only with supported evidence, segment overlap/order/offset checks, human corrections and immutable provenance of publisher vs generated vs editor revision. Provide correction requests without allowing anonymous silent edits to officials' words.
**Acceptance:** a regression fixture includes a long episode, broken VTT, multilingual segments and timestamp chunks; source-based transcript retains highest priority, provenance is visible, fabricated quotes/speaker names prevented.

### FC-P15 — Search that spans the entire verified historical archive
**Prerequisites:** MVP-09, FC-P07, FC-P10–14.
**Implement:** PostgreSQL-backed full-text/search indexing and relevant tests across people, podcast metadata, episode text and timestamped transcript segments, stable pagination, normalization and safe snippets. Add filters for official/person, show, office type, party (when sourced), years and publisher/generated availability; preserve source-based relevance and neutral ranking.
**Acceptance:** known exact phrase appears in search result and clicks to the corresponding timestamp; historical out-of-feed episodes remain queryable, unrelated people's shows do not contaminate results, query performance measured against entire live-sized corpus.

### FC-P16 — Complete listening experience and accessible historical browsing
**Prerequisites:** MVP-04–06, FC-P07–09, FC-P15.
**Implement:** persistent player, episode-detail transcript, show/host breadcrumbs, deep links, playback-resume, mobile/keyboard accessibility, old-to-new and new-to-old dates and citation/source URL. Keep optional representative portraits consistent with locked near-B&W/CAPITOL/Old Glory direction.
**Acceptance:** mixed current, former, presidential, shadow and historic shows browse correctly; audio navigation and seek do not reset unexpectedly; unresolved/expired audio has a helpful status and legitimate original-source link.

### FC-P17 — Protected editorial and operations dashboard
**Prerequisites:** MVP-10, FC-P01–15.
**Implement:** separate queues for unreviewed hosts, missing feeds, crawl errors, outdated episodes, unverified show mapping, publisher transcript pending, web transcript pending, generated STT blocked by budget, failures, source broken links and missing portraits. Display verified current historical coverage and source dates. Permission-control edits and preserve review trail.
**Acceptance:** newly discovered show cannot enter production without evidence; retry/review actions are idempotent and audited; public users cannot see private admin or tokens.

### FC-P18 — Durable automation and operating cost model
**Prerequisites:** MVP-11, FC-P07, FC-P10–13, FC-P17.
**Implement:** use a real durable scheduled worker/queue for hourly or daily due-feed checks and ongoing transcript backlog; on the existing Render free preview keep explicitly labeled best-effort 20-minute wake-up behavior while waiting for budget/hosting; avoid paid cron assumed available after an HTTP 402. Limit concurrent workers and resumption races, use leased jobs/heartbeat and stale-claim recovery.
**Acceptance:** show two consecutive actual unattended ingestion cycles updating database and public pages, with run provenance; start/restart and multiple wake signals do not double-pay or double-import; if scheduler cannot run reliably in free tier report the limitation and documented no-cost workaround.

### FC-P19 — Operations, monitoring and Engine Room integration
**Prerequisites:** FC-P01, FC-P17–18.
**Implement:** deploy health/live and health/ready correctly, source freshness by show, most recent completed feed/transcript sync, “never synced”, total episodes, available/missing/generate queues and cost-blockers, exceptions/alerts. Map milestones and PRs to an accurate Engine Room plan source rather than inferring progress from observed PR numbers.
**Acceptance:** real newest episode and transcript appear with timestamp in public search and Engine Room; operational failure sends degraded/unknown signals, not healthy. Explicit distinction between merged, deployed, ingested and publicly discoverable.

### FC-P20 — Exhaustive archival coverage acceptance and handoff closure
**Prerequisites:** all FC-P stages relevant to authorized source access and transcript compute.
**Implement:** freeze dated census of entire official current/former/presidential universe, candidate review, feed eligibility, public old/new episode history and transcript source availability; independently sample across current/former/party/time/show/publisher, and summarize every blocked show. Publish full-archive coverage methodology without asserting all former members ever had podcasts. Sign off access, rights, privacy, production backups, operational recovery and documented costs.
**Acceptance:** no qualifying verified show left unseeded without a recorded issue; 100% of known verified shows have either successfully imported eligible episodes or explicit source failure/rights reason; all available free publisher/site transcripts processed to a terminal documented state, and other accessible episodes are completed or queued for **authorized** generation. Missing/blocked data remains visible, never presented as full coverage. Reviewer can reproduce per-person and per-show audit from source files/DB.

## 5. Data contracts, special editorial cases, and migrations

**Person identity:** stable bioguide ID when present, office/term range, type, full name/aliases, historical/current transition, source URL, party as an evidenced time-dependent attribute when displayed. Keep one logical human across House/Senate/presidency; presidents who served in Congress must not be duplicated. Shadow Senate classification separate.

**Candidate and review:** person ID, candidate podcast directory/publisher IDs, canonical feed URL candidates, evidence URLs, role kind, host start/end if limited, reviewer, reviewed time, inclusion/exclusion reason, discovery search coverage and next retry. Add database persistence or a versioned tracked roster; merely storing short-lived GitHub Actions artifacts will not suffice for exhaustive long-term review.

**Podcast/show:** stable show slug/ID, one or more eligible person relationships (with time bounds if appropriate), exact feed URL, publisher, active ingestion flag separate from publishing active/inactive, source verification date, redirect/repurposing history, ingest cursor, retry state and known incomplete archive windows.

**Episode:** stable show+GUID or evidence-backed canonical alternate, publication and last-modified time, eligibility interval, audio URL/media status, episode link, source, optional transcript URL; do not delete old episodes because publisher feed shortens. A given person must not be credited for an episode outside their hosted date range.

**Transcript:** distinct statuses for publisher-supplied, publicly found elsewhere, generated, reviewed/corrected, queued, unavailable, unavailable due to access/rights, failed, and budget-blocked; language, source link, checksum/revision, timestamped segments, model/version/cost where generated. Migrate current PUBLISHER/GENERATED enums without losing existing records or breaking reader paths. Never replace publisher-provided transcript with a weaker generated version silently.

**Integrity:** migration tests for existing 10k+ episode-sized tables, primary key/dedupe, multi-show host relationships, normalized title and language, request URL SSRF defense, pubSub/new-host change, full-text search indexes and retried job leasing.

## 6. Tests, reproducible local workflow and known commands

Read and follow current package.json, not memory. Baseline commands already in the repo:

    npm install
    npm run dev:setup
    npm run registry:validate
    npm run ingest:feeds
    npm run backfill:transcripts -- --publisher-limit=200 --discovery-limit=30
    npm run sync:archive
    npm run archive:status
    npm test
    npm run lint
    npm run typecheck
    npm run build
    npm run smoke:mvp

The initial local development sequence requires Docker PostgreSQL, or an independently configured database URL. Production uses DATABASE_URL and optionally DIRECT_URL (do not commit connection strings). Speech-to-text also needs server-side approved API key/compute and TRANSCRIPTION_ENABLED opt-in.

Test groups required per milestone: source inclusion/exclusion (guests, cohosts, official productions), current/former roster matching, shadow distinction, shared feeds with host-period restrictions, inactive historical shows, duplicate GUID and feed migration, pagination/truncation, unsafe redirects/IP/private URLs, malformed XML/DOCTYPE, older episode archival, diverse transcript formats, transcript websites with misleading anchors, generated 15-minute-chunk offset assembly, provider retry/429/budget caps, stale claim takeover and double-charge prevention, cross-role admin denial, source citation/quote fidelity, mobile/accessibility/perf, complete backup/restore.

**Paid-provider fixtures must be deterministic in CI.** A paid smoke check must use a separately approved small budget and actual enabled environment, not a mocked provider presented as a live integration.

## 7. Launch, upkeep, and operating constraints

**Production dependencies:** hosted PostgreSQL/Neon, Render (or an already authorized web service), GitHub workflows for discovery/wake, reliable transcript-media fetching, admin login secret and future optional STT provider. Verify connected credentials and service ownership rather than assume they are installed or expose secrets. Keep existing preview URL and service names from repo settings; do not create duplicate services unasked.

**No new paid service by default:** Render paid cron was previously blocked on billing (HTTP 402). Leave the existing no-charge preview and background/wake workaround operational, with honest uptime limitations. If sustained reliable background transcription requires paid compute, isolate the blocked item and continue free publisher transcript/import work. Never auto-enable metered OpenAI speech-to-text from a planning file or without user-approved spend.

**Pre-release evidence:** deployed commit matches reviewed release; Neon migration/seed complete; multiple actual RSS feeds refreshed; oldest and newest episodic backfill representative; real publisher transcript and one opted-in live STT check (when authorized); search query-to-audio seek works; archive counters sourced from DB, person/host verification complete for tested samples, production /admin secured; robots/canonical/cross-device/player acceptance; accessibility/security and backup restore exercised. Engine Room displays deployed verified state separately from roadmap completion.

**Monitoring:** alert if new eligible shows are unreviewed beyond policy window, feeds never synced/stale, publisher backlog not decreasing, generated transcript cost cap near limit, transcripts misattributed, audio source expired, census monthly run failed, DB readiness failing, Render sleeping/wake failures or public player errors.

## 8. Agent execution order, parallelism, and self-contained handoff

1. Fetch main, this plan, README, package.json, Prisma schema, source docs and all open PRs/checks, plus current Render/Neon state if tools are connected. Re-evaluate status of PR #46 and the deployed state of merged #47/#48. **Do not assume the older point-in-time counts still apply.**
2. Prioritize immediately (a) source census completeness/host identity and genuine RSS fixes; (b) mass backfill of free publisher and publicly available transcript sources; (c) durable free scheduled operations; (d) authorized optional STT backlog; (e) scale, polish and production signoff. These can proceed in safe parallel lanes after data contracts are stable.
3. Create small PRs corresponding to FC-P units or sub-work. Pin exact prerequisite upstream/own PRs; migrations include rollback or safe forward-only transition and seeded regression data; zero new hidden spend. For each PR require green npm test, lint, typecheck and build plus relevant live smoke and source provenance tests. Chain/merge checks-passing, conflict-free work as permitted. Stop only for real credentials/billing, permission, failing gate or material product ambiguity.
4. Update a persistent implementation/status ledger: milestone ID, source date, specific GitHub PR(s), merged commit, test run, deployed commit, status of live ingest, blocker and next ready unit. An absent PR is PLANNED, not 100%. Protect the verified-registry review process.
5. For each merge, confirm actual deployed behavior where applicable: registry seed, due-feed import, transcript backfill status, search visibility, public player, observability. An episode in a local fixture does not count as a production archived episode.
6. Work even when some API/cron/transcription costs are blocked: census, feed verification, free transcript sources, dedupe and UI tests remain unblocked. Record minimal required user action for unavoidable paid API/compute/hosting gate.
7. Send future account to docs/DEVELOPMENT_PLAN.md FIRST. Retain user-approved product constraints above as authoritative and keep all subsequent changes in the repository, not only ChatGPT memory.

## 9. Certification definitions

**First public MVP:** original MVP-01..11 reproducibly operate on the deployed site with real podcasts and audio, at least one real full text transcript and working timestamped playback; billing/cron constraints transparently documented.

**Coverage-grade archive:** FC-P01..20 implemented and evidenced or individually blocked by an accurately described external source/rights/budget constraint, all current/former/presidential roster members audited with honest searched/not-searched classifications, all verified qualifying shows entered and reconciled with actual episode data, available published transcripts imported, fallback transcription pipeline operating for authorized accessible recordings, and refresh continuously tracked.

**Independent account handoff:** canonical plan, correct credential-free operational instructions, verified live state, numbered item-to-PR mapping, current open issues and authoritative next-ready unit all committed. This document supplies intent; current GitHub and operational evidence determine what remains to implement.

**Never equate the number of indexed episodes, portraits, transcript URLs, or original PR milestones with “every eligible congressional podcast has been captured.”** Accuracy of roster, host eligibility, archive history, transcription completeness and continual updating must be independently demonstrated.

### FC-P21 — Congressional podcast production services inquiries (October 10, 2026)

**Scope addition, not retroactive original MVP:** Add a discoverable /podcast-production page with a clear link in public site navigation and on the homepage, aimed at current members of Congress who do not yet operate a podcast. The independent production service may respond to authorized congressional offices. Do not imply official congressional endorsement or that a submission commits a contract.

**Deliver:** Accessible House/Senate officeholder + state/district + contact name/role + official office email + phone + preferred show format + message + explicit authority/no-current-podcast/contact-consent input. Store a durable case record in the existing Neon/PostgreSQL database, encrypt contact and message fields at rest with AES-256-GCM using a separate server secret, apply server-side field bounds, origin/CSRF and abuse checks, and treat office identity as self-reported pending separate verification. Encrypt transport using platform HTTPS; do not call this end-to-end encryption: the service receives form plaintext to process the request.

**Notifications:** Send a new-inquiry email to phillip.galinsky@gmail.com through a server-side approved transactional mail provider. Use a durable, deduplicated, retryable outbox. An unavailable API key/sender must not lose a request; log only non-sensitive delivery diagnostics. The email includes public officeholder identity and a private-admin link, not the submitted message or contact address.

**Engine Room:** An authenticated server-to-server, least-privilege read-only API returns number of distinct self-reported congressional offices and recent public officeholder identities, never contact email, phone or private message. Engine Room renders a large vivid red alert on dashboard and Alerts; the alert points to private FiresideChat admin records. Do not count a duplicate request as an additional unique office, or claim a self-report is a verified congressional identity. Cross-service bearer token is stored in both Render services as a non-logged secret; use a scoped endpoint and deny anonymous read.

**Acceptance:** Valid House/Senate submission persists; wrong contact domain/unauthorized/CSRF/bot/rate-exceeded cases rejected; browser success independent of email-provider transient outage; encrypted storage round-trips and tampering fails closed; unauthenticated read returns denial; private/admin access authenticated; pending mail retries without blind duplicate sends; Engine Room displays count and names with red contrast and indicates unverified nature; deploy/migrate on original services; verified click → Neon → email received → Engine Room alert after provisioning keys. Record remaining mail-provider or business-identity verification gates honestly.

**Applicability:** [Inquiry data-flow security review](E2EESA_INQUIRY_SECURITY.md). Implementation follows component-scoped E2EESA terminology and protected data flow review; server-held private-key storage is **server-side encryption**, NOT end-to-end encrypted communication or audited standard conformance.
