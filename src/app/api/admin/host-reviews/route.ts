import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { HostReviewRequestError, readHostReviewForm } from "@/lib/host-review-request";
import { HostReviewError } from "@/lib/host-review";
import { addHostEvidence, amendHostClaim, reviewHostCandidate, submitHostCandidate } from "@/lib/host-review-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = {"Cache-Control":"no-store, private"};
export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({error:"Unauthorized"}, {status:401,headers:noStore});
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    return NextResponse.json({error:"Invalid request origin"}, {status:403,headers:noStore});
  try {
    const data = await readHostReviewForm(request);
    if (data.action === "submit") await submitHostCandidate(data);
    else if (data.action === "evidence") await addHostEvidence(data);
    else if (data.action === "review") await reviewHostCandidate(data);
    else if (data.action === "amend") await amendHostClaim(data);
    else throw new HostReviewError("INVALID_ACTION");
    return NextResponse.redirect(new URL("/admin/host-reviews?updated=1", request.url), 303);
  } catch (error) {
    if (error instanceof HostReviewRequestError)
      return NextResponse.json({error:"Invalid request"}, {status:error.status,headers:noStore});
    // No user-controlled text or database details enter the redirect.
    const conflict = error instanceof HostReviewError &&
      ["STALE_OR_CLOSED_CANDIDATE","CONCURRENT_REVIEW"].includes(error.code);
    const duplicate = error && typeof error === "object" && "code" in error && error.code === "P2002";
    const reason = conflict ? "stale" : duplicate ? "duplicate" : error instanceof HostReviewError ? "invalid" : "unavailable";
    return NextResponse.redirect(new URL("/admin/host-reviews?error=" + reason, request.url), 303);
  }
}
