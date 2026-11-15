import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { HostReviewRequestError, readHostReviewForm } from "@/lib/host-review-request";
import { CorrectionError } from "@/lib/transcript-corrections";
import { decideCorrectionRequest } from "@/lib/transcript-corrections-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store, private" };

/** FC-P14 editor decision; accepted corrections are written with an immutable revision. */
export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403, headers: noStore });
  try {
    await decideCorrectionRequest(await readHostReviewForm(request), "authenticated-admin-session");
    return NextResponse.redirect(new URL("/admin/corrections?updated=1", request.url), 303);
  } catch (error) {
    if (error instanceof HostReviewRequestError)
      return NextResponse.json({ error: "Invalid request" }, { status: error.status, headers: noStore });
    const code = error instanceof CorrectionError ? error.code.toLowerCase() : "unavailable";
    return NextResponse.redirect(new URL("/admin/corrections?error=" + code, request.url), 303);
  }
}
