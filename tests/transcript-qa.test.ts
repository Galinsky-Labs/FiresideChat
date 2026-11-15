import assert from "node:assert/strict";
import test from "node:test";
import { parsePublisherTranscript } from "../src/lib/feeds/publisher-transcript";
import {
  enforceSpeakerEvidence, mayReplaceTranscript, normalizeTranscriptText,
  prepareTranscriptForStorage, validateSegments,
} from "../src/lib/transcription/transcript-qa";

test("FC-P14 long-episode fixture keeps every valid segment in order", () => {
  // Three hours of 5-second captions, supplied slightly out of order.
  const segments = Array.from({ length: 2160 }, (_, i) => ({
    startSeconds: i * 5, endSeconds: i * 5 + 5, text: `Segment ${i} of the floor debate.`,
  }));
  [segments[100], segments[101]] = [segments[101], segments[100]];
  const result = validateSegments(segments, 3 * 3600);
  assert.equal(result.segments.length, 2160);
  assert.equal(result.dropped, 0);
  assert.ok(result.issues.some((issue) => issue.code === "OUT_OF_ORDER"));
  for (let i = 1; i < result.segments.length; i++)
    assert.ok(result.segments[i].startSeconds >= result.segments[i - 1].startSeconds);
});

test("FC-P14 broken VTT fixture drops invalid cues instead of inventing timing", () => {
  const vtt = [
    "WEBVTT", "",
    "00:00:01.000 --> 00:00:04.000", "Good morning, everyone.", "",
    "00:00:09.000 --> 00:00:05.000", "End before start must not survive.", "",
    "not-a-time --> 00:00:10.000", "Malformed timing line.", "",
    "00:00:10.000 --> 00:00:14.000", "", "",
    "00:00:15.000 --> 00:00:19.000", "Thank you, Madam Chair.",
  ].join("\n");
  const parsed = parsePublisherTranscript(vtt, "text/vtt");
  const prepared = prepareTranscriptForStorage(parsed, "PUBLISHER", 60);
  assert.deepEqual(prepared.segments.map((s) => s.text), ["Good morning, everyone.", "Thank you, Madam Chair."]);
  assert.ok(!prepared.fullText.includes("End before start"));
  assert.ok(!prepared.fullText.includes("Malformed timing"));
  // QA of raw cues reports structural problems explicitly.
  const raw = validateSegments([
    { startSeconds: 9, endSeconds: 5, text: "x" },
    { startSeconds: -1, endSeconds: 2, text: "y" },
    { startSeconds: Number.NaN, endSeconds: 2, text: "z" },
    { startSeconds: 5000, endSeconds: 5001, text: "late" },
  ], 60);
  assert.deepEqual(raw.issues.map((i) => i.code), ["END_BEFORE_START", "NEGATIVE_TIME", "NON_FINITE_TIME", "BEYOND_DURATION"]);
  assert.equal(raw.segments.length, 0);
});

test("FC-P14 multilingual segments keep accents and words exactly", () => {
  const decomposed = "Buenos días, señora presidenta.";
  const result = validateSegments([
    { startSeconds: 0, endSeconds: 3, text: decomposed },
    { startSeconds: 3, endSeconds: 6, text: "  Thank   you.​ " },
  ]);
  assert.equal(result.segments[0].text, "Buenos días, señora presidenta.");
  assert.equal(result.segments[1].text, "Thank you.");
  assert.equal(normalizeTranscriptText("Línea\u0007 uno\n\ndos"), "Línea uno dos");
});

test("FC-P14 timestamp chunks report overlap but keep source text", () => {
  const result = validateSegments([
    { startSeconds: 0, endSeconds: 10, text: "First chunk." },
    { startSeconds: 5, endSeconds: 15, text: "Overlapping chunk." },
    { startSeconds: 14.8, endSeconds: 20, text: "Tolerated small overlap." },
  ]);
  assert.equal(result.segments.length, 3);
  assert.deepEqual(result.issues.map((i) => i.code), ["OVERLAP"]);
});

test("FC-P14 generated transcripts cannot attribute words to named speakers", () => {
  const segments = [
    { startSeconds: 0, endSeconds: 2, text: "Senator Smith: I will vote yes." },
    { startSeconds: 2, endSeconds: 4, text: "the vote is at noon: be there" },
  ];
  const generated = enforceSpeakerEvidence(segments, "GENERATED");
  assert.equal(generated.strippedLabels, 1);
  assert.equal(generated.segments[0].text, "I will vote yes.");
  assert.equal(generated.segments[1].text, "the vote is at noon: be there");
  assert.equal(enforceSpeakerEvidence(segments, "PUBLISHER").segments[0].text, "Senator Smith: I will vote yes.");
  const prepared = prepareTranscriptForStorage({ fullText: "Senator Smith: I will vote yes. the vote is at noon: be there", segments }, "GENERATED");
  assert.ok(!prepared.fullText.includes("Senator Smith:"));
});

test("FC-P14 source-based transcripts keep priority over generated text", () => {
  assert.equal(mayReplaceTranscript(null, "GENERATED"), true);
  assert.equal(mayReplaceTranscript("GENERATED", "PUBLISHER"), true);
  assert.equal(mayReplaceTranscript("PUBLISHER", "GENERATED"), false);
  assert.equal(mayReplaceTranscript("PUBLISHER", "PUBLISHER"), true);
});

test("FC-P14 refuses to store a transcript with no usable text", () => {
  assert.throws(() => prepareTranscriptForStorage({ fullText: " ​ ", segments: [] }, "PUBLISHER"), /no usable text/);
});
