# FC-P05: historical feed changes, shared networks, and per-episode eligibility

Source-of-truth boundaries: the existing podcast registry in `src/data/podcast-registry.ts` is legacy source evidence, **not** a proof that a shared publisher/network feed's every episode belongs to a politician. The production database has an additive `FeedScopeRecord` source review table with linked `FeedScopeHost`, `FeedScopeEpisode` and `FeedScopeAudit` tables. The migration is in `prisma/migrations/20261019190000_feed_scope_review`. `Episode.sourceFeedUrl` records which approved source fed an episode (migration `20261019190500_episode_feed_provenance`). Existing episode rows remain intact and their provenance begins unknown; there is no destructive backfill and no replay of private feeds.

## Review workflow

1. From the authenticated **Archive operations -> Historical feed review**, select an existing podcast record and submit the **exact HTTPS source** and **publisher show title**, expected website if known, and whether the feed is dedicated or shared. It enters `PENDING`; it is not automatically consumed.
2. Examine primary publisher and official statements. Add each qualifying person by exact database ID, role (HOST/COHOST/OFFICIAL_PRODUCER), evidence URL, observation date and verified host start/end dates. This is a *claim*, not auto-acceptance. Guest-only and network-only mentions are not qualifying roles.
3. For shared/multi-show feeds, add independently cited **specific GUIDs** with source evidence for the precise series. No network-level enrollment. Each addition increments the review revision and appends a durable audit entry.
4. Review original evidence and approve or reject with a source URL and a detailed rationale, or leave pending. A shared feed cannot be approved without at least one cited episode and dated official host role. `reviewedOn` must be consistent with observation dates. Concurrent reviewers must reload the current revision.
5. **A reviewer-approved proposal is not active ingestion.** Only the separately displayed **Activate reviewed feed** action changes the canonical podcast RSS URL. It compares the expected current URL, resets conditional GET headers to force fresh validation, and retains all historical episode rows.
6. Re-ingest only authorized feed content. `ingestPodcastBySlug` checks reviewed scope and exact publisher identity before source-tagged ingestion. An unapproved configured scope does not ingest, and an unexpected redirect, title/website change, or reused GUID with conflicting original media/date fails closed. Historical feeds marked publishing-inactive remain importable when the separate `active` ingestion switch is true; ended is not the same as disabled.

The source observation and review are editorial, not cryptographic publisher attestation. The operator must inspect actual original sources; examples/test fixtures do not confer real verification. **No official's actual feed relationship, live source review, or archive completeness is asserted here.**

## Public attribution

A scope record changes the public episode-visibility predicate for that podcast. Pending/rejected scopes cannot release episode rows. Approved feed portions require matching stored `sourceFeedUrl`, source-bound GUIDs for SHARED feeds, and an approved person-specific role date interval. Multiple co-hosts remain separately attributed; previously imported episodes are retained but not published until their source provenance has been reconciled. Unrelated network episodes and outdated pre-host episodes must not be displayed under that official. Legacy podcasts **without** any scope record continue existing presentation behavior and must be systematically reviewed in the broader audit; this is not universal migration certification.

The first URL of a newly accepted feed might not yet have its original historical episode provenance: retention of old sources, source page discovery and safe replay require actual publisher snapshots and operator review. Never replace or delete historical rows to conceal this gap.

## CI and release evidence

`tests/feed-scope.test.ts`, `tests/feed-disambiguation.test.ts`, and `tests/feed-review.test.ts` cover source identity drift, missing evidence, role dates, overlapping hosts, and conflicting GUIDs. The database integration test `tests/feed-scope-db.test.ts` runs only with `GITHUB_ACTIONS=true` and exactly the known ephemeral PostgreSQL CI URL. It verifies transactional evidence, replay protection, and nonactivation; it does not access production. `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` and registry check are necessary current-head software gates; they are not proof that any new official content has been ingested or source-verified.

Feed activation is a compare-and-swap transaction on the approved review revision and the current canonical feed URL. The separate ACTIVATED audit event records the source switch without touching old episode rows. Replaying a completed activation with the current revision is idempotent and does not reset HTTP caching headers; stale replay with a preactivation revision is rejected.
