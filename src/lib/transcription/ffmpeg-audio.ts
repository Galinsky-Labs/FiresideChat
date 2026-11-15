import { spawn } from "node:child_process";
import { open, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import ffmpegStatic from "ffmpeg-static";

export type AudioChunk = { path: string; startSeconds: number; endSeconds: number };

export function parseSegmentIndex(csv: string, directory: string): AudioChunk[] {
  return csv.trim().split(/\r?\n/).filter(Boolean).map((line) => {
    const [name, start, end] = line.replaceAll('"', "").split(",");
    const startSeconds = Number(start);
    const endSeconds = Number(end);
    if (!/^chunk-\d{3,}\.mp3$/.test(name ?? "") ||
        !Number.isFinite(startSeconds) || !Number.isFinite(endSeconds) ||
        startSeconds < 0 || endSeconds <= startSeconds) {
      throw new Error("FFmpeg returned an invalid segment index");
    }
    return { path: join(directory, basename(name)), startSeconds, endSeconds };
  });
}

function allowedAudioUrl(value: string) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  if (
    !["https:", "http:"].includes(url.protocol) ||
    ["localhost", "0.0.0.0", "metadata.google.internal", "::1"].includes(host) ||
    host.endsWith(".local") || host.endsWith(".internal") ||
    /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) || /^172\.(1[6-9]|2[0-9]|3[01])\./.test(host)
  ) throw new Error("Audio URL must be publicly reachable");
  return url.toString();
}

async function downloadAudio(url: string, target: string, maxBytes: number, timeoutMs: number) {
  const response = await fetch(allowedAudioUrl(url), {
    headers: {
      "User-Agent": process.env.FEED_USER_AGENT ??
        "FiresideChat/1.0 (+https://github.com/Galinsky-Labs/FiresideChat)",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error("Episode audio returned HTTP " + response.status);
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (declared > maxBytes) throw new Error("Episode audio is larger than recovery size limit");
  if (!response.body) throw new Error("Episode audio returned no body");
  const handle = await open(target, "w", 0o600);
  let total = 0;
  try {
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error("Episode audio exceeded recovery size limit");
      }
      let offset = 0;
      while (offset < value.length) {
        const written = await handle.write(value, offset, value.length - offset);
        offset += written.bytesWritten;
      }
    }
  } finally {
    await handle.close();
  }
}

async function segmentAudio(ffmpeg: string, input: string, directory: string, timeoutMs: number) {
  const args = [
    "-hide_banner", "-loglevel", "error", "-nostdin",
    "-i", input, "-vn", "-ac", "1", "-ar", "16000",
    "-c:a", "libmp3lame", "-b:a", "32k",
    "-f", "segment", "-segment_time", "900",
    "-segment_list", join(directory, "index.csv"),
    "-segment_list_type", "csv", "-reset_timestamps", "1",
    join(directory, "chunk-%03d.mp3"),
  ];
  await new Promise<void>((resolve, reject) => {
    const child = spawn(ffmpeg, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Audio conversion timed out"));
    }, timeoutMs);
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr = (stderr + chunk.toString()).slice(-1500);
    });
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error("Audio conversion failed: " + stderr));
    });
  });
}

export async function withTranscriptionChunks<T>(
  audioUrl: string,
  options: { maxBytes: number; downloadTimeoutMs?: number; conversionTimeoutMs?: number },
  callback: (chunks: AudioChunk[]) => Promise<T>,
): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), "fireside-transcript-"));
  try {
    await downloadAudio(audioUrl, join(directory, "source.bin"),
      options.maxBytes, options.downloadTimeoutMs ?? 240_000);
    const ffmpeg = process.env.FFMPEG_PATH || ffmpegStatic || "ffmpeg";
    await segmentAudio(ffmpeg, join(directory, "source.bin"), directory,
      options.conversionTimeoutMs ?? 420_000);
    const chunks = parseSegmentIndex(
      await readFile(join(directory, "index.csv"), "utf8"), directory);
    if (!chunks.length) throw new Error("Audio conversion produced no usable segments");
    const maxSeconds = Number.parseInt(process.env.TRANSCRIPTION_MAX_DURATION_SECONDS ?? "14400", 10);
    if (maxSeconds > 0 && chunks.at(-1)!.endSeconds > maxSeconds + 15) {
      throw new Error("Episode duration exceeds configured transcription limit");
    }
    return await callback(chunks);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
