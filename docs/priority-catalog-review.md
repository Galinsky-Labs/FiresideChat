# FC-P06 — named public-official podcast source-review queue

Every row below is an **unverified research target**, not a confirmed host, working feed or catalog import. Names originate from the approved FC-P06 backlog; biographies, series and RSS links must be confirmed from original sources. Do not mark `VERIFIED_WITH_EPISODES` unless exact stable official ID, publisher host/production citation, canonical RSS source, dated role window and actual imported episode count are evidenced. `PRECISE_SOURCE_BLOCKER` requires the official's anchored identity, a source URL, observation date, specific code and at least 20 characters of explanation. No row here currently claims that evidence. See `src/lib/priority-catalog-review.ts` and `tests/priority-catalog-review.test.ts` for fail-closed rules.

## Backlog targets (all require primary-source review)

Ron Paul; Matt Gaetz (review distinct shows separately); Adam Kinzinger; Heidi Heitkamp; Jon Tester; Hillary Clinton; Bill Clinton; Tulsi Gabbard; Joe Scarborough; Sean Duffy; Sherrod Brown.

Earlier priority-directory targets include Peter Roskam, Claire McCaskill, Cori Bush/Jamaal Bowman, John Kasich, Tim Hutchinson, Steve Pearce, Jon Porter, Denver Riggleman, Patrick Murphy, Marjorie Taylor Greene and George Santos. Existing directory IDs in `scripts/resolve-priority-podcast-feeds.py` are **unverified discovery leads**, not host evidence.

For every candidate, research identity first, inspect current repository registry to prevent duplicates, then publisher producer/host statements, then exact show feed and dated episodes. Distinguish a regular host or official producer from a guest/owner/network affiliate. An older show may be inactive but still have a preserved archive. Preserve primary source links and the blocker reason when unavailable; never guess RSS or report a pass from an empty database.

## Status (2026-11-15)

Merged as **partial** FC-P06 work: the fail-closed review contract, the persisted pending queue and the directory preflight are in CI. The acceptance criterion (each named candidate has either a verified show with imported episodes or a precise recorded source blocker) is **not yet met**: the build sandbox used for this merge had no outbound access to publisher, BioGuide or directory hosts, so no candidate was moved out of `PENDING_SOURCE_REVIEW`. The next step is primary-source research per candidate, recorded through the FC-P04 host review queue (`/admin/host-reviews`) and the FC-P05 feed scope review (`/admin/feed-scopes`).
