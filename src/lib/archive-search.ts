import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

/**
 * FC-P15: PostgreSQL full-text search over every timestamped transcript
 * segment in the archive, with neutral relevance ranking, stable pagination
 * and filters. Party is only a filter when the registry sources it.
 */
export const PERSON_KINDS = ["HOUSE", "SENATE", "PRESIDENT", "SHADOW_SENATE"] as const;
export const TRANSCRIPT_SOURCES = ["PUBLISHER", "GENERATED"] as const;
export const SEARCH_PAGE_SIZE = 20;
const SLUG = /^[a-z0-9][a-z0-9-]{0,120}$/;

export type ArchiveSearchFilters = {
  q: string;
  person: string | null;
  show: string | null;
  office: (typeof PERSON_KINDS)[number] | null;
  party: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  source: (typeof TRANSCRIPT_SOURCES)[number] | null;
  page: number;
};

function year(value: string | undefined): number | null {
  if (!value || !/^\d{4}$/.test(value)) return null;
  const n = Number(value);
  return n >= 1900 && n <= 2100 ? n : null;
}

export function parseSearchFilters(params: Record<string, string | undefined>): ArchiveSearchFilters {
  const q = (params.q ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  const page = Number.parseInt(params.page ?? "1", 10);
  let yearFrom = year(params.from);
  let yearTo = year(params.to);
  if (yearFrom && yearTo && yearFrom > yearTo) [yearFrom, yearTo] = [yearTo, yearFrom];
  const party = (params.party ?? "").trim();
  return {
    q,
    person: params.person && SLUG.test(params.person) ? params.person : null,
    show: params.show && SLUG.test(params.show) ? params.show : null,
    office: PERSON_KINDS.find((k) => k === params.office) ?? null,
    party: /^[A-Za-z][A-Za-z .-]{0,40}$/.test(party) ? party : null,
    yearFrom,
    yearTo,
    source: TRANSCRIPT_SOURCES.find((s) => s === params.source) ?? null,
    page: Number.isSafeInteger(page) && page >= 1 && page <= 500 ? page : 1,
  };
}

/** Query-string for a filter set, used for pagination links. */
export function searchHref(filters: ArchiveSearchFilters, page: number): string {
  const params = new URLSearchParams({ q: filters.q });
  if (filters.person) params.set("person", filters.person);
  if (filters.show) params.set("show", filters.show);
  if (filters.office) params.set("office", filters.office);
  if (filters.party) params.set("party", filters.party);
  if (filters.yearFrom) params.set("from", String(filters.yearFrom));
  if (filters.yearTo) params.set("to", String(filters.yearTo));
  if (filters.source) params.set("source", filters.source);
  if (page > 1) params.set("page", String(page));
  return "/search?" + params.toString();
}

/**
 * Split text into plain parts flagged when they match a query word. Rendered
 * as React text nodes, so publisher text can never inject markup.
 */
export function highlightParts(text: string, query: string, maxLength = 280): Array<{ text: string; match: boolean }> {
  const normalized = text.replace(/\s+/g, " ").trim();
  const terms = [...new Set(query.toLowerCase().replace(/["()]/g, " ").split(/\s+/)
    .filter((t) => t.length >= 2 && !["or", "and"].includes(t) && !t.startsWith("-")))];
  let start = 0;
  if (normalized.length > maxLength && terms.length) {
    const lower = normalized.toLowerCase();
    const hit = Math.min(...terms.map((t) => lower.indexOf(t)).filter((i) => i >= 0), Number.MAX_SAFE_INTEGER);
    if (hit !== Number.MAX_SAFE_INTEGER) start = Math.max(0, hit - Math.floor(maxLength / 3));
  }
  const end = Math.min(normalized.length, start + maxLength);
  const window = (start > 0 ? "…" : "") + normalized.slice(start, end) + (end < normalized.length ? "…" : "");
  if (!terms.length) return [{ text: window, match: false }];
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp("(" + escaped.join("|") + ")", "gi");
  return window.split(pattern).filter(Boolean).map((part) => ({
    text: part,
    match: terms.includes(part.toLowerCase()),
  }));
}

export function filterSql(filters: ArchiveSearchFilters): Prisma.Sql {
  const parts: Prisma.Sql[] = [];
  if (filters.show) parts.push(Prisma.sql`po."slug" = ${filters.show}`);
  if (filters.source) parts.push(Prisma.sql`t."source" = ${filters.source}::"TranscriptSource"`);
  if (filters.yearFrom) parts.push(Prisma.sql`e."publishedAt" >= ${new Date(Date.UTC(filters.yearFrom, 0, 1))}`);
  if (filters.yearTo) parts.push(Prisma.sql`e."publishedAt" < ${new Date(Date.UTC(filters.yearTo + 1, 0, 1))}`);
  if (filters.person || filters.office || filters.party) {
    const personParts: Prisma.Sql[] = [Prisma.sql`pp."podcastId" = e."podcastId"`];
    if (filters.person) personParts.push(Prisma.sql`p."slug" = ${filters.person}`);
    if (filters.office) personParts.push(Prisma.sql`p."kind" = ${filters.office}::"PersonKind"`);
    if (filters.party) personParts.push(Prisma.sql`p."party" ILIKE ${filters.party}`);
    parts.push(Prisma.sql`EXISTS (SELECT 1 FROM "PodcastPerson" pp JOIN "Person" p ON p."id" = pp."personId" WHERE ${Prisma.join(personParts, " AND ")})`);
  }
  return parts.length ? Prisma.sql`AND ${Prisma.join(parts, " AND ")}` : Prisma.empty;
}

type SegmentHit = { id: string; rank: number };

/**
 * Ranked, paginated segment search. Ties break on newest episode, then
 * segment start and id, so page boundaries are stable between requests.
 */
export async function searchTranscriptSegments(filters: ArchiveSearchFilters) {
  if (filters.q.length < 2) return { total: 0, ids: [] as string[] };
  const where = Prisma.sql`
    FROM "TranscriptSegment" s
    JOIN "Transcript" t ON t."id" = s."transcriptId"
    JOIN "Episode" e ON e."id" = t."episodeId"
    JOIN "Podcast" po ON po."id" = e."podcastId"
    WHERE to_tsvector('english', s."text") @@ websearch_to_tsquery('english', ${filters.q})
    ${filterSql(filters)}`;
  const offset = (filters.page - 1) * SEARCH_PAGE_SIZE;
  const [countRows, hits] = await Promise.all([
    db.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`SELECT COUNT(*)::bigint AS count ${where}`),
    db.$queryRaw<SegmentHit[]>(Prisma.sql`
      SELECT s."id", ts_rank(to_tsvector('english', s."text"), websearch_to_tsquery('english', ${filters.q})) AS rank
      ${where}
      ORDER BY rank DESC, e."publishedAt" DESC, s."startSeconds" ASC, s."id" ASC
      LIMIT ${SEARCH_PAGE_SIZE} OFFSET ${offset}`),
  ]);
  return { total: Number(countRows[0]?.count ?? 0), ids: hits.map((h) => h.id) };
}
