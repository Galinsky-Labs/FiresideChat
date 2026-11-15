import { db } from "@/lib/db";
import {
  CorrectionError, MAX_PENDING_PER_EPISODE, parseCorrectionDecision, parseCorrectionRequest, segmentAt,
} from "@/lib/transcript-corrections";

/** Record a public correction request. The transcript itself is not changed. */
export async function submitCorrectionRequest(form: Record<string, string>): Promise<string> {
  const input = parseCorrectionRequest(form);
  return db.$transaction(async (tx) => {
    const episode = await tx.episode.findUnique({
      where: { id: input.episodeId },
      select: { id: true, transcript: { select: { segments: { select: { id: true, startSeconds: true, endSeconds: true, text: true } } } } },
    });
    if (!episode?.transcript) throw new CorrectionError("INVALID_EPISODE");
    const segment = segmentAt(episode.transcript.segments, input.atSeconds);
    if (!segment) throw new CorrectionError("NO_SEGMENT");
    if (segment.text === input.proposedText) throw new CorrectionError("UNCHANGED_TEXT");
    const pending = await tx.transcriptCorrectionRequest.count({ where: { episodeId: episode.id, status: "PENDING" } });
    if (pending >= MAX_PENDING_PER_EPISODE) throw new CorrectionError("TOO_MANY_PENDING");
    const row = await tx.transcriptCorrectionRequest.create({
      data: {
        episodeId: episode.id, segmentId: segment.id, startSeconds: segment.startSeconds,
        originalText: segment.text, proposedText: input.proposedText, reason: input.reason, evidenceUrl: input.evidenceUrl,
      },
    });
    return row.id;
  });
}

/**
 * Apply an authenticated editor decision. Accepting writes the new segment text
 * and an immutable revision row in one transaction, and only if the segment
 * still reads exactly what the requester saw (no silent overwrite of a newer
 * publisher import or another correction).
 */
export async function decideCorrectionRequest(form: Record<string, string>, actorRef: string): Promise<void> {
  const decision = parseCorrectionDecision(form);
  await db.$transaction(async (tx) => {
    const claimed = await tx.transcriptCorrectionRequest.updateMany({
      where: { id: decision.requestId, revision: decision.revision, status: "PENDING" },
      data: {
        status: decision.decision, revision: { increment: 1 },
        reviewNote: decision.note, reviewerRef: actorRef, reviewedAt: new Date(),
      },
    });
    if (claimed.count !== 1) throw new CorrectionError("STALE_REQUEST");
    if (decision.decision === "REJECTED") return;
    const request = await tx.transcriptCorrectionRequest.findUniqueOrThrow({ where: { id: decision.requestId } });
    const segment = await tx.transcriptSegment.findUnique({ where: { id: request.segmentId } });
    if (!segment || segment.text !== request.originalText) throw new CorrectionError("SEGMENT_CHANGED");
    const newText = decision.finalText ?? request.proposedText;
    const updated = await tx.transcriptSegment.updateMany({
      where: { id: segment.id, text: request.originalText },
      data: { text: newText },
    });
    if (updated.count !== 1) throw new CorrectionError("SEGMENT_CHANGED");
    const transcript = await tx.transcript.findUniqueOrThrow({ where: { id: segment.transcriptId }, select: { id: true, fullText: true } });
    if (transcript.fullText.includes(request.originalText)) {
      await tx.transcript.update({
        where: { id: transcript.id },
        data: { fullText: transcript.fullText.replace(request.originalText, newText) },
      });
    }
    await tx.transcriptRevision.create({
      data: {
        transcriptId: transcript.id, segmentId: segment.id, startSeconds: segment.startSeconds,
        previousText: request.originalText, newText, correctionRequestId: request.id,
        actorRef, evidenceUrl: request.evidenceUrl, note: decision.note,
      },
    });
  });
}
