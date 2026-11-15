import type { PublisherTranscriptReference } from "./types";

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

export type ParsedPublisherTranscript = {
  fullText: string;
  segments: Array<{
    startSeconds: number;
    endSeconds: number;
    text: string;
  }>;
};

function plainText(value: string): string {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function timestampSeconds(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  const parts = normalized.split(":");
  if (parts.length < 2 || parts.length > 3) return null;

  const values = parts.map(Number);
  if (values.some((part) => !Number.isFinite(part) || part < 0)) return null;

  const seconds = values.at(-1) ?? 0;
  const minutes = values.at(-2) ?? 0;
  const hours = values.length === 3 ? values[0] : 0;
  if (minutes >= 60 || seconds >= 60) return null;

  return hours * 3600 + minutes * 60 + seconds;
}

function parseTimedTranscript(body: string): ParsedPublisherTranscript {
  const segments: ParsedPublisherTranscript["segments"] = [];
  const normalized = body.replace(/\r\n?/g, "\n").replace(/^\uFEFF/, "");

  for (const block of normalized.split(/\n{2,}/)) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const timingIndex = lines.findIndex((line) => line.includes("-->"));
    if (timingIndex < 0) continue;

    const [rawStart, rawEndWithSettings] = lines[timingIndex].split("-->");
    if (!rawStart || !rawEndWithSettings) continue;

    const rawEnd = rawEndWithSettings.trim().split(/\s+/)[0];
    const startSeconds = timestampSeconds(rawStart);
    const endSeconds = timestampSeconds(rawEnd);
    if (
      startSeconds === null ||
      endSeconds === null ||
      endSeconds < startSeconds
    ) {
      continue;
    }

    const text = plainText(lines.slice(timingIndex + 1).join(" "));
    if (!text) continue;

    segments.push({ startSeconds, endSeconds, text });
  }

  if (segments.length === 0) {
    throw new Error("Timed transcript did not contain any readable cues");
  }

  return {
    fullText: segments.map((segment) => segment.text).join("\n"),
    segments,
  };
}


function htmlToText(html: string) {
  return html
    .replace(/<(script|style|nav|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<\s*br\b[^>]*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|section|article|li|h[1-6])\s*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, code: string) => {
      const point = Number(code);
      return point > 0 && point < 0x110000 && !(point >= 0xd800 && point <= 0xdfff)
        ? String.fromCodePoint(point) : "";
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseJsonTranscript(body: string): ParsedPublisherTranscript {
  const payload: unknown = JSON.parse(body);
  const root = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload as Record<string, unknown> : {};
  const entries = Array.isArray(payload) ? payload
    : Array.isArray(root.segments) ? root.segments
    : Array.isArray(root.transcript) ? root.transcript : [];
  const segments: ParsedPublisherTranscript["segments"] = [];
  for (const item of entries) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const entry = item as Record<string, unknown>;
    const text = entry.body ?? entry.text;
    const start = Number(entry.startTime ?? entry.start ?? NaN);
    const end = Number(entry.endTime ?? entry.end ?? NaN);
    if (typeof text === "string" && text.trim() && Number.isFinite(start) &&
        Number.isFinite(end) && start >= 0 && end >= start) {
      segments.push({ startSeconds: start, endSeconds: end, text: text.trim() });
    }
  }
  if (segments.length > 0) return {
    fullText: segments.map((segment) => segment.text).join("\n"), segments,
  };
  const text = root.text ?? root.fullText ?? root.transcript;
  if (typeof text === "string" && text.trim()) {
    return { fullText: htmlToText(text), segments: [] };
  }
  throw new Error("JSON publisher transcript contains no readable text");
}

export function parsePublisherTranscript(
  body: string,
  mimeType: string | null,
): ParsedPublisherTranscript {
  const normalizedType = mimeType?.split(";")[0]?.trim().toLowerCase() ?? "";
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Publisher transcript is empty");

  const looksTimed =
    trimmed.startsWith("WEBVTT") ||
    /\d{1,2}:\d{2}(?::\d{2})?[.,]\d{1,3}\s+-->/.test(trimmed);

  if (
    normalizedType.includes("vtt") ||
    normalizedType.includes("srt") ||
    normalizedType.includes("subrip") ||
    looksTimed
  ) {
    return parseTimedTranscript(trimmed.replace(/^WEBVTT[^\n]*\n?/, ""));
  }

  if (
    normalizedType === "application/json" ||
    normalizedType.endsWith("+json") ||
    /^\s*\{\s*"(?:segments|transcript|text|fullText)"\s*:/.test(trimmed)
  ) {
    return parseJsonTranscript(trimmed);
  }

  if (
    normalizedType === "text/html" ||
    /<(?:html|article|div|p)\b/i.test(trimmed)
  ) {
    const fullText = htmlToText(trimmed);
    if (!fullText) throw new Error("HTML publisher transcript contained no text");
    return { fullText, segments: [] };
  }

  if (
    !normalizedType ||
    normalizedType.startsWith("text/") ||
    normalizedType === "application/octet-stream"
  ) {
    const fullText = plainText(trimmed);
    if (!fullText) throw new Error("Publisher transcript is empty");
    return { fullText, segments: [] };
  }

  throw new Error(`Unsupported publisher transcript type: ${normalizedType}`);
}

export async function fetchPublisherTranscript(
  reference: PublisherTranscriptReference,
  options: {
    timeoutMs?: number;
    maxBytes?: number;
    userAgent?: string;
  } = {},
): Promise<ParsedPublisherTranscript> {
  const response = await fetch(reference.url, {
    headers: {
      Accept: "text/vtt, application/x-subrip, application/json, text/html, text/plain;q=0.9, */*;q=0.2",
      "User-Agent":
        options.userAgent ??
        process.env.FEED_USER_AGENT ??
        "FiresideChat/1.0 (+https://github.com/Galinsky-Labs/FiresideChat)",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Publisher transcript returned HTTP ${response.status}`);
  }

  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (declaredLength > maxBytes) {
    throw new Error("Publisher transcript exceeds the configured size limit");
  }

  if (!response.body) throw new Error("Publisher transcript has no body");
  const reader = response.body.getReader();
  let total = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("Publisher transcript exceeds the configured size limit");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const body = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  const responseType = response.headers.get("content-type");
  return parsePublisherTranscript(body, reference.mimeType ?? responseType);
}
