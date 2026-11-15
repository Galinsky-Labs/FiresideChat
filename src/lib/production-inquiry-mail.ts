import { db } from "@/lib/db";

const MAX_ATTEMPTS = 8;
const RETRY_DELAY_MINUTES = 20;
const INQUIRY_ADMIN_URL = "https://firesidechat.onrender.com/admin/production-inquiries";

function mailIsConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.PODCAST_INQUIRY_FROM_EMAIL);
}

function maxError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(0, 600);
}

export async function deliverInquiryEmail(id: string): Promise<"sent" | "deferred" | "failed"> {
  if (!mailIsConfigured()) return "deferred";

  const now = new Date();
  const before = new Date(now.getTime() - RETRY_DELAY_MINUTES * 60_000);
  // Claim atomically so web submission and background retries cannot both send.
  const claimed = await db.podcastProductionInquiry.updateMany({
    where: {
      id,
      emailAttempts: { lt: MAX_ATTEMPTS },
      OR: [
        { emailStatus: "PENDING" },
        { emailStatus: "FAILED", emailLastAttemptAt: { lte: before } },
        { emailStatus: "SENDING", emailLastAttemptAt: { lte: before } },
      ],
    },
    data: { emailStatus: "SENDING", emailLastAttemptAt: now, emailAttempts: { increment: 1 }, emailLastError: null },
  });
  if (claimed.count !== 1) return "deferred";

  const inquiry = await db.podcastProductionInquiry.findUnique({
    where: { id }, select: { id: true, memberName: true, chamber: true, state: true, district: true },
  });
  if (!inquiry) return "deferred";

  const office = inquiry.chamber === "HOUSE" ?
    "House district " + (inquiry.district ?? "?") + ", " + inquiry.state :
    "Senate, " + inquiry.state;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(9_000),
      headers: {
        Authorization: "Bearer " + process.env.RESEND_API_KEY,
        "Content-Type": "application/json",
        "Idempotency-Key": "fireside-production-inquiry-" + inquiry.id,
      },
      body: JSON.stringify({
        from: process.env.PODCAST_INQUIRY_FROM_EMAIL,
        to: ["phillip.galinsky@gmail.com"],
        subject: "Fireside Chat podcast production inquiry — " + inquiry.memberName,
        text: "A self-reported congressional office has requested podcast production services.\n\n" +
          "Officeholder: " + inquiry.memberName + "\nOffice: " + office +
          "\n\nView the protected inquiry and contact details after signing in:\n" +
          INQUIRY_ADMIN_URL + "\n\n" +
          "Identity has not yet been independently verified. The notification intentionally excludes the submitted contact address and private message.",
      }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Email provider returned HTTP " + response.status);
    await db.podcastProductionInquiry.update({
      where: { id }, data: { emailStatus: "SENT", emailSentAt: new Date(), emailLastError: null },
    });
    return "sent";
  } catch (error) {
    await db.podcastProductionInquiry.update({
      where: { id }, data: { emailStatus: "FAILED", emailLastError: maxError(error) },
    });
    return "failed";
  }
}

export async function retryInquiryEmails(maxItems = 8) {
  if (!mailIsConfigured()) return { configured: false, attempted: 0, sent: 0 };
  const before = new Date(Date.now() - RETRY_DELAY_MINUTES * 60_000);
  const pending = await db.podcastProductionInquiry.findMany({
    where: {
      emailAttempts: { lt: MAX_ATTEMPTS },
      OR: [
        { emailStatus: "PENDING" },
        { emailStatus: { in: ["FAILED", "SENDING"] }, emailLastAttemptAt: { lte: before } },
      ],
    },
    orderBy: { submittedAt: "asc" },
    take: Math.min(20, Math.max(1, maxItems)),
    select: { id: true },
  });
  let sent = 0;
  for (const inquiry of pending) {
    if (await deliverInquiryEmail(inquiry.id) === "sent") sent++;
  }
  return { configured: true, attempted: pending.length, sent };
}
