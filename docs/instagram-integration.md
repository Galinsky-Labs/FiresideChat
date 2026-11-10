# Instagram Business Discovery integration

FiresideChat supports discovery of original videos and Reels from eligible Instagram professional accounts through Meta's **Instagram API with Facebook Login**. The first configured public figure is `@aoc`, mapped to the existing Alexandria Ocasio-Cortez person record. Other verified accounts can be added to `src/data/instagram-sources.ts` after confirming the handle belongs to the official publisher.

**What this can and cannot retrieve:** Business Discovery queries require a valid authorized Instagram professional account (Business or Creator) linked to a Facebook Page, a Meta app, appropriate approved permissions and access tokens. An ordinary login or an unrelated person's account password cannot substitute for these credentials. Meta does not provide unrestricted access to private profiles, deleted or ephemeral Instagram Live videos, or every historical video. Only available original public media returned by the authorized API can be staged. Instagram's oEmbed API is for display, not bulk metadata harvesting.

## Configuration

1. In the Meta developer dashboard, create/configure a Business app using Instagram API with Facebook Login. Connect a Facebook Page and its Instagram professional account **that you are authorized to manage**.
2. Obtain approved access for the required `instagram_basic` and `pages_read_engagement` permissions (and any other permissions Meta requires for Business Discovery for your particular app), including any App Review / advanced access required for accounts not owned by app testers. Obtain the appropriate valid Page access token.
3. Set these values in the production environment (not Git):
   - `INSTAGRAM_GRAPH_VIEWER_IG_ID`: numeric Instagram professional account ID associated with the authorized Page.
   - `INSTAGRAM_GRAPH_ACCESS_TOKEN`: authorized Page access token with required permissions.
   - `INSTAGRAM_DISCOVERY_MAX_PAGES=2` (bounded, 1–5 pages per verified handle).
   - `INSTAGRAM_SYNC_ENABLED=true` to include the step in `npm run sync:archive`.
4. Deploy current database migrations (`npm run db:deploy`) and seed the person registry (`npm run db:seed`).
5. Execute `npm run ingest:instagram` to discover and stage publicly available Instagram video candidates. This can run repeatedly and won't duplicate existing records. Only the server process handles access tokens; they are not exposed in client HTML, source URLs, or logging.

## Editorial review

The importer intentionally **stages new candidates as inactive** rather than automatically publishing all videos. Instagram media metadata alone cannot reliably identify conversational videos; a Reel could just be an ad, speech snippet, campaign message, or repost. A reviewer visits the original source URL and confirms it is a direct, publisher-hosted conversation and checks the appropriate category.

Use `npm run review:instagram -- list` to review pending videos, then:

- `npm run review:instagram -- approve VIDEO_ID PERSONAL_CHAT`
- `npm run review:instagram -- approve VIDEO_ID LIVESTREAM`
- `npm run review:instagram -- approve VIDEO_ID Q_AND_A`
- `npm run review:instagram -- approve VIDEO_ID BEHIND_THE_SCENES`
- `npm run review:instagram -- reject VIDEO_ID`

Approved videos appear in `/videos`, politician profiles, home listings and search. Video detail pages show the original Instagram embed (where Instagram permits it) and a clear link to the original post. Do not download, rehost, or copy Instagram video or screenshots. Automatic transcript extraction is not performed; only licensed/authorized transcripts should be indexed.

## Operations and limitations

- This is *Graph API polling*, not an unauthorized crawler. Schedule `sync:archive` using the existing maintenance process or your job runner.
- Limit API usage; handle Meta throttling and expired tokens by surfacing failures instead of silently inserting results.
- If the app credentials are not configured, `ingest:instagram` exits with a configuration error, and the standard archive sync skips Instagram unless `INSTAGRAM_SYNC_ENABLED=true`.
- Refresh/reissue Meta tokens before expiration, follow Meta permissions and data-retention rules, and be prepared for API or App Review changes.
- AOC's November 8 chat can appear only if its original post/video is still accessible through Meta Business Discovery or is separately verified and curated; we have **not** claimed to retrieve that Live replay.
- Original video formats are classified provisionally from captions; the final category is set when a reviewer approves the item.

## Verification

```bash
npm test
npm run typecheck
npm run build
npm run db:deploy
npm run db:seed
npm run ingest:instagram
npm run review:instagram -- list
```

The integration's unit tests mock the Graph API; a live end-to-end run needs authorized Meta credentials and the deployed database.