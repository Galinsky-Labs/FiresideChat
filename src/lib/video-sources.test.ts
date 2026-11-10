import assert from "node:assert/strict";
import test from "node:test";
import { validateVideoSource, youtubeEmbedUrl } from "./video-sources";
import { validateVideoRegistry, verifiedVideos } from "../data/video-registry";

test("verified registry uses unique official-source IDs", () => {
  assert.doesNotThrow(() => validateVideoRegistry(verifiedVideos));
  assert.throws(() => validateVideoRegistry([...verifiedVideos, ...verifiedVideos]), /Duplicate/);
});
test("YouTube ID must match URL and be strictly valid", () => {
  const video = verifiedVideos[0];
  assert.equal(validateVideoSource(video), "nhT-v9ZwJvc");
  assert.equal(youtubeEmbedUrl(video), "https://www.youtube-nocookie.com/embed/nhT-v9ZwJvc");
  assert.throws(() => validateVideoSource({ ...video, sourceUrl: "https://evil.example/watch?v=nhT-v9ZwJvc" }));
  assert.throws(() => validateVideoSource({ ...video, platformVideoId: "other" }));
});
test("Instagram accepts only post/reel/tv permalinks", () => {
  assert.equal(validateVideoSource({
    platform: "INSTAGRAM", platformVideoId: "AbCd123",
    sourceUrl: "https://www.instagram.com/reel/AbCd123/"
  }), "AbCd123");
  assert.throws(() => validateVideoSource({
    platform: "INSTAGRAM", platformVideoId: "AbCd123",
    sourceUrl: "https://www.instagram.com/aoc/"
  }));
});
