import test from "node:test";
import assert from "node:assert/strict";
import { normalizeInstagramMedia, discoverInstagramVideos } from "./instagram-discovery";

const source = { id: "123", media_type: "VIDEO", permalink: "https://www.instagram.com/reel/ABC_123/", timestamp: "2026-11-08T15:00:00+0000", caption: "Live questions and answers\nMore details" };
test("normalizes verified original reel links without fetching media", () => {
  const video = normalizeInstagramMedia(source);
  assert.equal(video?.platformVideoId, "ABC_123");
  assert.equal(video?.format, "Q_AND_A");
  assert.equal(video?.sourceUrl, source.permalink);
});
test("rejects photos, lookalike domains, and unavailable dates", () => {
  assert.equal(normalizeInstagramMedia({ ...source, media_type: "IMAGE" }), null);
  assert.equal(normalizeInstagramMedia({ ...source, permalink: "https://instagram.com.evil.test/reel/ABC_123/" }), null);
  assert.equal(normalizeInstagramMedia({ ...source, timestamp: "not-a-date" }), null);
});
test("discovers a professional-account page using a bearer token, no secret in URL", async () => {
  let calls = 0;
  const fetcher = async (url: URL | RequestInfo, options?: RequestInit) => {
    calls++;
    const parsed = new URL(String(url));
    assert.equal(parsed.hostname, "graph.facebook.com");
    assert.equal(parsed.searchParams.get("access_token"), null);
    assert.equal(options?.headers && (options.headers as Record<string,string>).Authorization, "Bearer secret");
    return new Response(JSON.stringify({
      business_discovery: { username: "aoc", media: { data: [source] } },
    }), { status: 200 });
  };
  const videos = await discoverInstagramVideos("aoc", { accessToken: "secret", viewerIgUserId: "123456789", fetcher: fetcher as typeof fetch });
  assert.equal(calls, 1);
  assert.equal(videos.length, 1);
});
test("fails closed on publisher mismatch and API access failure", async () => {
  await assert.rejects(discoverInstagramVideos("aoc", {
    accessToken: "secret", viewerIgUserId: "123456789",
    fetcher: (async () => new Response(JSON.stringify({ business_discovery: { username: "imposter" } }), { status: 200 })) as typeof fetch,
  }), /identity mismatch/);
  await assert.rejects(discoverInstagramVideos("aoc", {
    accessToken: "secret", viewerIgUserId: "123456789",
    fetcher: (async () => new Response("access denied", { status: 403 })) as typeof fetch,
  }), /HTTP 403/);
});
