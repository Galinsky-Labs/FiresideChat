import { isIP } from "node:net";
import type { FeedFetchOptions, FeedFetchResult } from "./types";

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_USER_AGENT =
  "FiresideChat/0.1 (+https://github.com/Galinsky-Labs/FiresideChat)";
const MAX_REDIRECTS = 5;

export class FeedFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeedFetchError";
  }
}

export function assertSafeFeedUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new FeedFetchError("Feed URL is invalid");
  }

  if (url.protocol !== "https:") {
    throw new FeedFetchError("Feed URL must use HTTPS");
  }
  if (url.username || url.password) {
    throw new FeedFetchError("Feed URL may not contain credentials");
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  const ipCandidate =
    hostname.startsWith("[") && hostname.endsWith("]")
      ? hostname.slice(1, -1)
      : hostname;
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    isIP(ipCandidate) !== 0
  ) {
    throw new FeedFetchError("Feed URL must use a public hostname");
  }

  return url;
}

function positiveInteger(value: number | undefined, fallback: number): number {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  return fallback;
}

async function readBodyWithLimit(
  response: Response,
  maxBytes: number,
): Promise<{ text: string; bytes: number }> {
  const declaredLength = Number.parseInt(
    response.headers.get("content-length") ?? "",
    10,
  );
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new FeedFetchError(
      `Feed exceeds the ${maxBytes.toLocaleString()} byte limit`,
    );
  }

  if (!response.body) return { text: "", bytes: 0 };

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new FeedFetchError(
        `Feed exceeds the ${maxBytes.toLocaleString()} byte limit`,
      );
    }
    chunks.push(value);
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return {
    text: new TextDecoder("utf-8", { fatal: false }).decode(body),
    bytes: total,
  };
}

export async function fetchFeed(
  input: string,
  options: FeedFetchOptions = {},
): Promise<FeedFetchResult> {
  const timeoutMs = positiveInteger(options.timeoutMs, DEFAULT_TIMEOUT_MS);
  const maxBytes = positiveInteger(options.maxBytes, DEFAULT_MAX_BYTES);
  const headers = new Headers({
    accept:
      "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.1",
    "user-agent": options.userAgent ?? DEFAULT_USER_AGENT,
  });

  if (options.etag) headers.set("if-none-match", options.etag);
  if (options.lastModified) {
    headers.set("if-modified-since", options.lastModified);
  }

  const signal = AbortSignal.timeout(timeoutMs);
  let currentUrl = assertSafeFeedUrl(input);

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    let response: Response;
    try {
      response = await fetch(currentUrl, {
        headers,
        redirect: "manual",
        signal,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new FeedFetchError(`Unable to fetch feed: ${message}`);
    }

    if (response.status >= 300 && response.status < 400 && response.status !== 304) {
      const location = response.headers.get("location");
      if (!location) {
        throw new FeedFetchError(
          `Feed returned redirect status ${response.status} without a location`,
        );
      }
      if (redirects === MAX_REDIRECTS) {
        throw new FeedFetchError(`Feed exceeded ${MAX_REDIRECTS} redirects`);
      }
      currentUrl = assertSafeFeedUrl(new URL(location, currentUrl).toString());
      await response.body?.cancel();
      continue;
    }

    const etag = response.headers.get("etag");
    const lastModified = response.headers.get("last-modified");

    if (response.status === 304) {
      return {
        status: "not-modified",
        httpStatus: 304,
        finalUrl: currentUrl.toString(),
        etag,
        lastModified,
        bytes: 0,
      };
    }

    if (!response.ok) {
      throw new FeedFetchError(
        `Feed returned HTTP ${response.status} ${response.statusText}`.trim(),
      );
    }

    const body = await readBodyWithLimit(response, maxBytes);
    return {
      status: "ok",
      httpStatus: response.status,
      finalUrl: currentUrl.toString(),
      etag,
      lastModified,
      bytes: body.bytes,
      xml: body.text,
    };
  }

  throw new FeedFetchError("Feed redirect handling failed");
}
