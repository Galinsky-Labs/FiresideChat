import { createHash } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

/**
 * FC-P17: idempotent, audited operator retries. A form carries a one-time
 * nonce; the same nonce/action/target can only ever apply once.
 */
export const OPS_ACTIONS = ["requeue-web-discovery", "clear-feed-backoff"] as const;
export type OpsActionName = (typeof OPS_ACTIONS)[number];
export class OpsActionError extends Error {
  constructor(public readonly code: "INVALID_ACTION" | "INVALID_TARGET" | "INVALID_NONCE" | "UNKNOWN_TARGET") {
    super(code);
  }
}

const ID = /^[a-z0-9]{8,40}$/i;
const NONCE = /^[a-f0-9]{32}$/;

export function parseOpsAction(input: Record<string, string>) {
  const action = OPS_ACTIONS.find((a) => a === input.action);
  if (!action) throw new OpsActionError("INVALID_ACTION");
  if (!ID.test(input.podcastId ?? "")) throw new OpsActionError("INVALID_TARGET");
  if (!NONCE.test(input.nonce ?? "")) throw new OpsActionError("INVALID_NONCE");
  return { action, podcastId: input.podcastId, nonce: input.nonce };
}

export function opsIdempotencyKey(action: OpsActionName, targetId: string, nonce: string): string {
  return createHash("sha256").update(["fc-ops-v1", action, targetId, nonce].join("\u0000")).digest("hex");
}

/** Returns the number of rows affected, or null when this exact request already ran. */
export async function applyOpsAction(input: Record<string, string>, actorRef: string): Promise<number | null> {
  const { action, podcastId, nonce } = parseOpsAction(input);
  const idempotencyKey = opsIdempotencyKey(action, podcastId, nonce);
  try {
    return await db.$transaction(async (tx) => {
      const podcast = await tx.podcast.findUnique({ where: { id: podcastId }, select: { id: true } });
      if (!podcast) throw new OpsActionError("UNKNOWN_TARGET");
      // Claim the key first: a concurrent duplicate fails here and changes nothing.
      const audit = await tx.opsAction.create({ data: { idempotencyKey, action, targetId: podcastId, actorRef, affected: 0 } });
      let affected = 0;
      if (action === "requeue-web-discovery") {
        // Only negative/failed searches without a transcript are re-opened.
        affected = (await tx.episode.updateMany({
          where: { podcastId, transcript: { is: null }, episodeUrl: { not: null }, transcriptDiscoveryAttempts: { gt: 0 } },
          data: { transcriptDiscoveryAttempts: 0, transcriptDiscoveryLastAttemptAt: null, transcriptDiscoveryLastError: null },
        })).count;
      } else {
        affected = (await tx.podcast.updateMany({
          // Clears only the retry backoff; history such as lastSuccessfulCheckAt is kept.
          where: { id: podcastId, active: true, nextRetryAt: { not: null } },
          data: { nextRetryAt: null },
        })).count;
      }
      await tx.opsAction.update({ where: { id: audit.id }, data: { affected } });
      return affected;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return null;
    throw error;
  }
}
