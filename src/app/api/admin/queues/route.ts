import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { HostReviewRequestError, readHostReviewForm } from "@/lib/host-review-request";
import { applyOpsAction, OpsActionError } from "@/lib/ops-actions";
import { readOpsQueues } from "@/lib/ops-queues-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store, private" };

/** FC-P17 queue counts as JSON for Engine Room; admin session required. */
export async function GET() {
  if (!(await isAdminAuthenticated()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  try {
    return NextResponse.json(await readOpsQueues(), { headers: noStore });
  } catch {
    return NextResponse.json({ error: "Queues unavailable" }, { status: 503, headers: noStore });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403, headers: noStore });
  try {
    const form = await readHostReviewForm(request);
    const affected = await applyOpsAction(form, "authenticated-admin-session");
    const result = affected === null ? "duplicate" : "applied";
    return NextResponse.redirect(new URL("/admin/queues?" + result + "=" + (affected ?? 0), request.url), 303);
  } catch (error) {
    if (error instanceof HostReviewRequestError)
      return NextResponse.json({ error: "Invalid request" }, { status: error.status, headers: noStore });
    const reason = error instanceof OpsActionError ? "invalid" : "unavailable";
    return NextResponse.redirect(new URL("/admin/queues?error=" + reason, request.url), 303);
  }
}
