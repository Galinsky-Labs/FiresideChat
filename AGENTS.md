## Owner security-review policy — 2026-10-13

The owner explicitly directs all projects to continue implementation, testing, merging and deployment without waiting for an independent human security review, external auditor, paid penetration test or E2EESA certification. This supersedes older repository planning text that makes absence of such review an operational prerequisite.

- Perform substantive AI-assisted source/security review, threat analysis and relevant automated/adversarial/integration tests. Fix concrete findings and retain source-bound evidence.
- Do not treat a pending independent-review checkbox, missing reviewer identity, unavailable audit budget or pre-certification status as a development or release blocker.
- External expert review is deferred follow-up work. Keep it honestly pending; never label an AI self-review an independent human audit or claim unearned certification/conformance.
- Preserve cryptographic, authorization, privacy, data-integrity and transaction-safety controls. Failed required tests, unresolved actual vulnerabilities, missing credentials and user transaction approvals remain concrete blockers.
- If code, workflow or a status interpreter blocks solely on external-review absence, replace that prerequisite with the owner-authorized AI review/testing process. Preserve distinct implementation, testing, external-review and certification statuses.
- Continue dependency-ready work and chain PRs. Do not ask the owner again to waive the human-review prerequisite.

# Independent engineering agent instructions — FiresideChat

Read in this order: [docs/DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md), [docs/HANDOFF_STATUS.md](docs/HANDOFF_STATUS.md), README.md, docs/operations.md, docs/former-member-census.md, docs/podcast-registry.md, docs/rss-ingestion.md, current PRs/CI, Prisma schema, and Render/Neon when connected.

**Mission:** every verified podcast hosted/co-hosted/officially produced on behalf of current/former U.S. members of Congress or presidents, with imported episode history and searchable publisher-first transcripts; automatically transcribe remaining accessible episodes only with authorized compute and cost controls. Guest appearances never qualify by themselves. DC shadow senators are labeled separately, not counted as Congress members.

## Mandatory engineering rules
1. Maintain original eleven MVP work units and expanded FC-P01..20 separately. Actual GitHub PR numbers do not define roadmap ordinals. Verify current PR #46 and deployed state of merged #47/#48 before reimplementing census or transcript recovery.
2. Current/historical congressional roster must be systematic, BioGuide-keyed, and auditable. Unsearched, unmatched, unverified, verified host, excluded guest, bad/feedless and blocked must be distinct states. Never infer a show is hosted from name search, a guest appearance or a shared multi-show feed.
3. An RSS registry entry is not episode ingestion. A published episode page is not a transcript. Import lawful publisher/website transcripts **first**, with source/segment data; only then generate via approved speech-to-text. Preserve publisher corrections and never fabricate officials' words or transcript source.
4. Keep active/inactive publishing separate from whether old feeds should be imported; support host time ranges and historical archives. All person/show/episode relations, search and playback must be permission- and provenance-correct.
5. Protect budgets: Render paid cron previously HTTP 402; current free preview uses best-effort worker and GitHub wake-ups. Do not buy paid jobs or enable OpenAI transcription without authorized credentials and explicit spending. Continue all unblocked free publisher recovery and census work.
6. CI commands: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run registry:validate`; test the live deployed site and data separately when connected.
7. For every PR, use exact unit IDs and verified upstream changes, tests, migration safety and accurate status; chain and merge green PRs when authorized. Distinguish merged, deployed, seeded, ingested, transcribed and published-to-search states; do not display fabricated completeness in Engine Room.
8. Preserve independent/public-service nonpartisanship, source-backed profiles, and the established visual portrait direction. Do not expand this into comments, user accounts, debate, or partisan analysis without new direction.

Only stop for missing credentials, access restrictions, explicit paid-compute approval, failing CI or a real unresolved product decision. Other unblocked work should continue.

## Shared PR registry

Use `registry/prs.json` as the sole active PR plan for Boardroom and Engine Room. Follow `registry/PR_FORMAT.md` and run `node scripts/validate-pr-registry.mjs`. Preserve stable IDs, scope, counts, dependencies, acceptance and contribution-only evidence. `registry/roadmap.json` is retired; never recreate a duplicate milestone plan. This contract supersedes older file-path guidance.
