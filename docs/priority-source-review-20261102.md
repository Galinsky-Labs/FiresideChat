# FC-P06 source reconciliation — 2 November 2026 UTC

No production database, RSS import or transcript was changed. All named queue outcomes remain PENDING_SOURCE_REVIEW. Primary pages were read; directory search was not treated as proof of hosting.

## Existing records before adding a candidate

At source 28fb6caf2b21ee9221f3deaf125f8b5ab8d99dfe, src/data/podcast-registry.ts already contains ron-paul-liberty-report linked to ron-paul, and you-and-me-both-with-hillary-clinton linked to hillary-clinton. Its feed URLs and verification notes are existing repository assertions, not newly fetched or independently imported episode evidence. Do not create duplicate show rows from the pending backlog.

## Primary-source observations

- https://history.house.gov/People/Listing/P/PAUL,-Ronald-Ernest-(P000583)/ identifies Ronald Ernest Paul as a Texas Representative and links his BioGuide entry. It supports identity reconciliation to P000583, distinct from his son Rand Paul.
- https://ronpaulinstitute.org/programs/ identifies Ron Paul as host of Ron Paul Liberty Report and Daniel McAdams/Chris Rossini as cohosts. It supplies no exact host-period start/end or imported-episode receipt in this review.
- https://www.ronpaullibertyreport.com/about.html says the program launched in 2015 and identifies Daniel McAdams as cohost. A launch year is not an exact per-episode attribution window.
- https://www.iheartmedia.com/press/hillary-clinton-partners-iheartmedia-launch-new-iheartradio-original-podcast-you-and-me-both is dated 22 September 2020 and identifies Hillary Clinton as host of You and Me Both, with an announced 29 September launch. This is historical publisher evidence, not current publishing status, an exact final host window or imported episode coverage.

The Congress.gov Ron Paul and Hillary Clinton member-page fetches returned `Failed to fetch restricted URL` in the research tool. This is a retrieval limitation, not proof that the source or official record is missing. The House historian page was successfully read for Paul. Hillary's exact BioGuide identity still needs a readable primary identity record in this review.

## Executable directory boundary

The actual priority directory lookup now invokes its strict classifier before exposing feed/directory URLs, bounds the JSON response to 1 MiB and accepts only exact integer track IDs. Explicit ports, control/whitespace/backslash forms and empty query/fragment delimiters are rejected as unsafe metadata. No source is auto-verified or imported. Four Python classifier tests and syntax compilation pass locally; hosted full CI remains separate.

## Remaining work

Persist the reviewed census with audited admin authorization, confirm each official identity and exact role periods, validate the canonical feed directly, reconcile existing source rows and import actual eligible episodes before VERIFIED_WITH_EPISODES. Nine other named targets still need primary-source review. PR58 remains incomplete/draft; no missing RSS or external-blocker conclusion is inferred from an unfetched feed.
