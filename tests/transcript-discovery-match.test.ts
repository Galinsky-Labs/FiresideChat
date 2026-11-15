import assert from "node:assert/strict";
import test from "node:test";
import { assessTranscriptMatch } from "../src/lib/transcription/transcript-match";
import { discoverEpisodePageTranscriptDetailed } from "../src/lib/transcription/episode-page-discovery";

const filler = (n: number, seed = "budget") =>
  Array.from({ length: n }, (_, i) => `${seed}${i % 37} hearing committee testimony`).join(" ");
const episode = {
  title: "Rural Broadband Funding with the Farm Bureau",
  description: "We talk about rural broadband funding and the farm bill with guests from the state farm bureau and local cooperatives across the district this week.",
  durationSeconds: 1800,
  episodeUrl: "https://podcast.example.gov/episodes/rural-broadband",
};

test("FC-P11 accepts a real on-site transcript", () => {
  const text = "Welcome back. Today rural broadband funding is our topic. " + filler(400);
  assert.deepEqual(
    assessTranscriptMatch(episode, { fullText: text, segments: [] }, "https://podcast.example.gov/t/rural.txt"),
    { accepted: true },
  );
});

test("FC-P11 rejects empty, short and paywalled pages", () => {
  const at = "https://podcast.example.gov/t";
  assert.deepEqual(assessTranscriptMatch(episode, { fullText: "   ", segments: [] }, at), { accepted: false, reason: "EMPTY" });
  assert.deepEqual(assessTranscriptMatch(episode, { fullText: "Transcript coming soon.", segments: [] }, at), { accepted: false, reason: "TOO_SHORT" });
  assert.deepEqual(
    assessTranscriptMatch(episode, { fullText: "Subscribe now to read the full transcript of this episode. " + filler(60), segments: [] }, at),
    { accepted: false, reason: "PAYWALL_OR_LOGIN" },
  );
});

test("FC-P11 never imports the episode description as a transcript", () => {
  const notes = episode.description + " " + episode.description;
  assert.deepEqual(
    assessTranscriptMatch(episode, { fullText: notes + " " + notes, segments: [] }, "https://podcast.example.gov/t"),
    { accepted: false, reason: "DESCRIPTION_ONLY" },
  );
});

test("FC-P11 rejects an off-site script for a similarly named program", () => {
  const unrelated = "Late night comedy sketch script. " + filler(300, "comedy");
  assert.deepEqual(
    assessTranscriptMatch(episode, { fullText: unrelated, segments: [] }, "https://scripts.other-site.example/ep1"),
    { accepted: false, reason: "OFF_SITE_UNRELATED" },
  );
  const matching = "Rural broadband funding with the farm bureau. " + filler(300);
  assert.deepEqual(
    assessTranscriptMatch(episode, { fullText: matching, segments: [] }, "https://transcripts.partner.example/ep1"),
    { accepted: true },
  );
});

test("FC-P11 rejects timed transcripts that cannot belong to this episode length", () => {
  const text = filler(200);
  const short = [{ startSeconds: 0, endSeconds: 300 }];
  const long = [{ startSeconds: 0, endSeconds: 7200 }];
  const at = "https://podcast.example.gov/t.vtt";
  assert.deepEqual(assessTranscriptMatch(episode, { fullText: text, segments: short }, at), { accepted: false, reason: "DURATION_MISMATCH" });
  assert.deepEqual(assessTranscriptMatch(episode, { fullText: text, segments: long }, at), { accepted: false, reason: "DURATION_MISMATCH" });
  assert.deepEqual(assessTranscriptMatch(episode, { fullText: text, segments: [{ startSeconds: 0, endSeconds: 1790 }] }, at), { accepted: true });
});

function mockFetch(routes: Record<string, () => Response>) {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const route = routes[url];
    return route ? route() : new Response("not found", { status: 404 });
  }) as typeof fetch;
  return () => { globalThis.fetch = original; };
}

test("FC-P11 discovery records 403 and description-only rejections, then finds the real link", async () => {
  const page = '<html><a href="/paywalled.txt">Read transcript</a><a href="/notes.txt">Transcript</a><a href="/real.txt">Full transcript</a></html>';
  const restore = mockFetch({
    [episode.episodeUrl]: () => new Response(page, { headers: { "content-type": "text/html" } }),
    "https://podcast.example.gov/paywalled.txt": () => new Response("forbidden", { status: 403 }),
    "https://podcast.example.gov/notes.txt": () => new Response(episode.description + " " + episode.description + " " + episode.description, { headers: { "content-type": "text/plain" } }),
    "https://podcast.example.gov/real.txt": () => new Response("Rural broadband today. " + filler(300), { headers: { "content-type": "text/plain" } }),
  });
  try {
    const outcome = await discoverEpisodePageTranscriptDetailed(episode.episodeUrl, episode);
    assert.equal(outcome.found?.url, "https://podcast.example.gov/real.txt");
    assert.deepEqual(outcome.rejections, ["FETCH_FAILED", "DESCRIPTION_ONLY"]);
  } finally {
    restore();
  }
});

test("FC-P11 discovery returns a negative result rather than generic page HTML", async () => {
  const page = "<html><main><p>" + episode.description + "</p></main></html>";
  const restore = mockFetch({
    [episode.episodeUrl]: () => new Response(page, { headers: { "content-type": "text/html" } }),
  });
  try {
    const outcome = await discoverEpisodePageTranscriptDetailed(episode.episodeUrl, episode);
    assert.equal(outcome.found, null);
  } finally {
    restore();
  }
});
