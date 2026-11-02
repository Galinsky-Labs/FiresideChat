# FC-P04 review-queue source and security analysis

Scope: `HostReviewCandidate`, `HostReviewEvidence`, `HostReviewAudit`, `src/lib/host-review*`, `/admin/host-reviews` and `/api/admin/host-reviews`. This is an AI-assisted source review; **no independent human security audit, field source verification or live deployment acceptance is claimed**.

## Trust boundaries

1. Directory search, RSS descriptions, network affiliations, similarly named politicians and publisher excerpts are all untrusted leads. They must never create a `PodcastPerson` relationship or trigger feed import.
2. The only web mutation entry point is the admin-session checked, same-origin, bounded POST route. An admitted request may submit a pending candidate, append a citation, amend an unapproved claim or record a specific review decision. Unauthenticated requests are rejected before form parsing.
3. PostgreSQL persists candidate claims, immutable-by-API source records and revisioned audit history. All related writes use transactions; stale reviewers are rejected by optimistic revision comparisons.
4. A verified queue status remains a **review decision**, not a published official show or proof that every episode belonged to that host. Publisher/identity source and date ranges must be adjudicated before any later explicit registry import.

## Threat analysis and checks

| Threat | Mitigation | Relevant regression |
|---|---|---|
| Guest appearance or network-only credit promoted as official podcast | Role-specific citation evidence required before VERIFY; guest exclusion separately sourced | `tests/host-review.test.ts` role/guest/network negatives |
| Two officials with similar display names | BioGuide/presidential stable identity keys; no name-only joins | `candidateKey` and same-name negative test |
| Former guest becoming host later, historical episode falsely included | Source-backed host start/end dates; per-episode inclusive range filtering | `hostPeriodIncludes` and `approvedHostsForEpisode` tests |
| One show with several genuine cohosts | Separate official-key records; dedupe only within same official | Multi-host episode attribution test |
| Forged or duplicate evidence URL and offsite links | Strict HTTPS/canonical URL, no username, port, query or fragment; no server fetch | URL and duplicate-record validation |
| Reviewer overwrites another reviewer or attempts a stale reply | Expected revision and transactional `updateMany` compare-and-set; event recorded only within successful transaction | Ephemeral PostgreSQL integration test |
| CSRF and unauthorized API use | Existing secure, HttpOnly, SameSite admin session plus strict Origin equality on POST | Source inspection; live adversarial test still pending |
| Unverified candidate inadvertently visible in public catalog | Separate queue tables, no automatic joins or podcast import; source-backed terminal decisions | Integration assertion that `PodcastPerson` count is unchanged |
| Bulk staging of untrusted leads | Whole-batch validation before any write, bounded JSONL, explicit opt-in and pending-only status, no CI apply | `tests/host-review-batch.test.ts` |
| SQL injection, XSS and unsafe source URL fetching | Parameterized Prisma, escaped React rendering, HTTPS-only links, no URL fetch | Source review; independent penetration testing not performed |

## Explicit limits and follow-up

* The current administrator credential is shared, so audit actor label identifies the authenticated administration session, not an individual human. A future per-operator identity model is needed for forensic attribution. Do not claim otherwise.
* A syntactically valid HTTPS citation and a human-confirmed checkbox do not prove truth: real publisher content and the referenced official's identity must be inspected by editorial operators before a valid final decision.
* The queue has no connection to the full BioGuide census denominator, no automatic publisher lookup and no production verified-feed import. Those separate work units remain outstanding; no completeness claims are warranted here.
* Existing deployment / production migrations, private admin access, live source review, restore readiness and replay tests are unverified until independently observed. CI tests run against a disposable PostgreSQL service, not production.
* Verify the exact head SHA, database migration, `npm test`, lint, typecheck, build and the repository's public smoke check before marking this implementation ready; observe GitHub merge gates separately from green tests.

## Measured request-body repair

Source review found that the previous route checked only the declared Content-Length before `formData()`, so an omitted or misleading header did not bound parsing. The route now calls a bounded stream reader only after authentication/origin admission. Actual bytes and chunks, a monotonic total deadline and cancellation gate form decoding; copied bytes prevent a stream producer from changing captured data. Duplicate names, file fields, unsupported media types and excess fields are denied. Error output is fixed and private/no-store. Existing domain validation, store transactions and revision/audit controls are unchanged.

Five focused native request-stream groups pass (valid text forms; missing/misleading size; duplicate/file/field/media rejection; cancellation/stall; chunk flooding and delayed timer delivery). Hosted lint/typecheck/build, the expanded npm test suite and exact-head PR checks remain required. No live admin session, production migration or editorial verification is claimed.
