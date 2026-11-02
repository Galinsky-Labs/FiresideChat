# FC-P05 review-decision type repair

Reviewed immutable PR56 head 4c79783881f2c27d92a765f664348fca3336ea41 and its current failed validate check. Local strict compilation of feed-review/scope/disambiguation and their tests reproduced four TS2345 errors in feed-review.test.ts: parsed review decision was inferred as string rather than APPROVED | REJECTED. Runtime validation already rejects other decisions.

An explicit return contract preserves that validated decision union for store/approval callers. It does not add a cast to accept arbitrary strings, skip a test, weaken an approval or change feed ingestion. All 13 focused compiled runtime tests pass, and the same strict TypeScript command now exits successfully with noEmitOnError. This is local focused evidence, not a hosted full-suite pass.

Command: TypeScript strict NodeNext compilation of src/lib/feed-scope.ts, src/lib/feed-review.ts, src/lib/feed-disambiguation.ts and tests/feed-{disambiguation,review,scope}.test.ts, followed by node --test compiled/tests/*.test.js. Compiled scratch output is not committed.

Full exact-head npm test, lint, typecheck, build, disposable database and rendered MVP CI must pass before merge. Live database migration, host/feed editorial source verification and deployment remain separate. No feed was fetched, source reviewed as fact, or production record changed by this repair.

## Measured feed-review form admission

Further source review found the same declared-size-only gap in POST /api/admin/feed-scopes. This route now reuses the exact immutable bounded parser/test source introduced on PR55 at a7d0026b58c0837731fe711c93b417fdea60c927. Authentication, origin checks and URL-encoded-only media policy remain ahead of parsing. Actual 16KiB/4096-chunk/five-second bounds, cancellation, duplicate-field and file rejection protect every store action; output remains fixed and private/no-store. No second parser implementation or broader feed-review media support is introduced. Five focused request-stream tests are included in npm test.
