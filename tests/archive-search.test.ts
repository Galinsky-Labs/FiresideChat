import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes } from "node:crypto";
import { highlightParts, parseSearchFilters, searchHref } from "../src/lib/archive-search";

test("FC-P15 filters are validated, clamped and round-trip into stable page links", () => {
  const f = parseSearchFilters({ q: '  "rural  broadband" ', office: "SENATE", source: "PUBLISHER", from: "2024", to: "2019", page: "3", person: "jane-doe", show: "bad slug!", party: "Democratic" });
  assert.equal(f.q, '"rural broadband"');
  assert.equal(f.office, "SENATE");
  assert.equal(f.source, "PUBLISHER");
  assert.deepEqual([f.yearFrom, f.yearTo], [2019, 2024]);
  assert.equal(f.page, 3);
  assert.equal(f.person, "jane-doe");
  assert.equal(f.show, null);
  const href = searchHref(f, 4);
  assert.deepEqual(parseSearchFilters(Object.fromEntries(new URL("https://x.example" + href).searchParams)), { ...f, page: 4 });
  const bad = parseSearchFilters({ q: "x".repeat(500), office: "KING", source: "WIKI", from: "1800", page: "-1", party: "<script>" });
  assert.equal(bad.q.length, 200);
  assert.deepEqual([bad.office, bad.source, bad.yearFrom, bad.page, bad.party], [null, null, null, 1, null]);
});

test("FC-P15 snippets highlight terms as plain text and never pass markup through", () => {
  const parts = highlightParts("<b>Farm</b> bill and the farm bureau", "farm");
  assert.deepEqual(parts.filter((p) => p.match).map((p) => p.text), ["Farm", "farm"]);
  assert.ok(parts.map((p) => p.text).join("").includes("<b>"), "markup stays literal text for React to escape");
  const long = "intro ".repeat(200) + "the exact phrase appears here " + "outro ".repeat(200);
  const window = highlightParts(long, '"exact phrase"').map((p) => p.text).join("");
  assert.ok(window.startsWith("…") && window.includes("exact phrase"));
});

const disposableCI = process.env.GITHUB_ACTIONS === "true" &&
  /^postgresql:\/\/postgres:postgres@localhost:5432\/fireside_chat\?schema=public$/.test(process.env.DATABASE_URL ?? "");

test("FC-P15 exact phrase finds the timestamped segment, historical episodes stay searchable, other people's shows do not leak", { skip: !disposableCI }, async () => {
  const { db } = await import("../src/lib/db");
  const { searchTranscriptSegments } = await import("../src/lib/archive-search");
  const tag = randomBytes(5).toString("hex");
  const phrase = `zephyr${tag} quorum`;
  const mk = async (name: string, kind: "HOUSE" | "SENATE") => {
    const person = await db.person.create({ data: { slug: `ci-${name}-${tag}`, fullName: `CI ${name}`, kind } });
    const podcast = await db.podcast.create({ data: { slug: `ci-show-${name}-${tag}`, title: `CI show ${name}`, rssUrl: `https://example.org/${name}-${tag}.xml`, active: false } });
    await db.podcastPerson.create({ data: { podcastId: podcast.id, personId: person.id, role: "HOST" } });
    return { person, podcast };
  };
  const a = await mk("a", "SENATE");
  const b = await mk("b", "HOUSE");
  try {
    // Historical, out-of-feed (inactive podcast) episode from 2009.
    const ep = await db.episode.create({ data: { podcastId: a.podcast.id, guid: "a" + tag, title: "Old", publishedAt: new Date("2009-05-01"), audioUrl: "https://example.org/a.mp3" } });
    const tr = await db.transcript.create({ data: { episodeId: ep.id, source: "PUBLISHER", fullText: "..." } });
    await db.transcriptSegment.createMany({ data: [
      { transcriptId: tr.id, startSeconds: 10, endSeconds: 15, text: "Opening remarks." },
      { transcriptId: tr.id, startSeconds: 754, endSeconds: 760, text: `We finally reached a ${phrase} on the floor.` },
    ] });
    const epB = await db.episode.create({ data: { podcastId: b.podcast.id, guid: "b" + tag, title: "Other", publishedAt: new Date("2024-01-01"), audioUrl: "https://example.org/b.mp3" } });
    const trB = await db.transcript.create({ data: { episodeId: epB.id, source: "GENERATED", fullText: "..." } });
    await db.transcriptSegment.create({ data: { transcriptId: trB.id, startSeconds: 5, endSeconds: 8, text: `Unrelated ${phrase} mention.` } });

    const base = parseSearchFilters({ q: `"${phrase}"` });
    const all = await searchTranscriptSegments(base);
    assert.equal(all.total, 2);
    const onlyA = await searchTranscriptSegments({ ...base, person: a.person.slug });
    assert.equal(onlyA.total, 1);
    const seg = await db.transcriptSegment.findUniqueOrThrow({ where: { id: onlyA.ids[0] } });
    assert.equal(seg.startSeconds, 754);
    assert.equal((await searchTranscriptSegments({ ...base, office: "HOUSE" })).total, 1);
    assert.equal((await searchTranscriptSegments({ ...base, source: "PUBLISHER", yearTo: 2010 })).total, 1);
    assert.equal((await searchTranscriptSegments({ ...base, yearFrom: 2011 })).ids[0], (await searchTranscriptSegments({ ...base, person: b.person.slug })).ids[0]);
    assert.equal((await searchTranscriptSegments(parseSearchFilters({ q: `"quorum zephyr${tag}"` }))).total, 0);
  } finally {
    await db.podcast.deleteMany({ where: { id: { in: [a.podcast.id, b.podcast.id] } } });
    await db.person.deleteMany({ where: { id: { in: [a.person.id, b.person.id] } } });
  }
});
