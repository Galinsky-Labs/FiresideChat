import { performance } from 'node:perf_hooks';

export class HostReviewRequestError extends Error {
  readonly status: 400 | 408 | 413 | 415;
  constructor(status: 400 | 408 | 413 | 415) {
    super('Host review request rejected'); this.name = 'HostReviewRequestError'; this.status = status;
  }
}
const MAX_BYTES = 16384;
const MAX_CHUNKS = 4096;
/** Auth and same-origin checks must precede this bounded, non-fetching parser. */
export async function readHostReviewForm(request: Request, timeoutMs = 5000): Promise<Record<string, string>> {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 10 || timeoutMs > 5000)
    throw new HostReviewRequestError(400);
  const type = request.headers.get('content-type') ?? '';
  const media = type.split(';', 1)[0]!.trim().toLowerCase();
  if (!['application/x-www-form-urlencoded', 'multipart/form-data'].includes(media))
    throw new HostReviewRequestError(415);
  const length = request.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || !Number.isSafeInteger(Number(length))))
    throw new HostReviewRequestError(400);
  if (length !== null && Number(length) > MAX_BYTES) throw new HostReviewRequestError(413);
  if (!request.body || request.signal.aborted) throw new HostReviewRequestError(408);
  const deadline = performance.now() + timeoutMs;
  const reader = request.body.getReader();
  let total = 0, chunks = 0, finished = false;
  const parts: Uint8Array[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancelled!: () => void;
  const interrupted = new Promise<never>((_resolve, reject) => {
    cancelled = () => reject(new HostReviewRequestError(408));
    request.signal.addEventListener('abort', cancelled, { once: true });
    timer = setTimeout(cancelled, timeoutMs);
  });
  const timely = () => {
    if (request.signal.aborted || performance.now() >= deadline) throw new HostReviewRequestError(408);
  };
  try {
    for (;;) {
      timely();
      const item = await Promise.race([reader.read(), interrupted]);
      timely();
      if (item.done) { finished = true; break; }
      if (!(item.value instanceof Uint8Array)) throw new HostReviewRequestError(400);
      chunks++;
      total += item.value.byteLength;
      if (total > MAX_BYTES || chunks > MAX_CHUNKS) throw new HostReviewRequestError(413);
      // Own the measured bytes; a producer cannot replace them while the next read waits.
      parts.push(new Uint8Array(item.value));
    }
    if (length !== null && Number(length) !== total) throw new HostReviewRequestError(400);
    const body = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) { body.set(part, offset); offset += part.byteLength; }
    timely();
    const form = await new Response(body, { headers: { 'content-type': type } }).formData();
    timely();
    const data: Record<string, string> = Object.create(null) as Record<string, string>;
    let count = 0;
    for (const [key, value] of form.entries()) {
      if (++count > 24 || typeof value !== 'string' || Object.hasOwn(data, key))
        throw new HostReviewRequestError(400);
      data[key] = value;
    }
    return data;
  } catch (error) {
    if (error instanceof HostReviewRequestError) throw error;
    throw new HostReviewRequestError(400);
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener('abort', cancelled);
    if (!finished) void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
