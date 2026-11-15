import { NextRequest, NextResponse } from "next/server";
import { HostReviewRequestError, readHostReviewForm } from "@/lib/host-review-request";
import { CorrectionError } from "@/lib/transcript-corrections";
import { submitCorrectionRequest } from "@/lib/transcript-corrections-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store, private" };
const ID = /^[a-z0-9]{8,40}$/i;

/** FC-P14 public correction request: recorded for editor review, never applied directly. */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403, headers: noStore });
  let episodeId = "";
  try {
    const form = await readHostReviewForm(request);
    episodeId = ID.test(form.episodeId ?? "") ? form.episodeId : "";
    await submitCorrectionRequest(form);
    return NextResponse.redirect(new URL(`/episodes/${episodeId}?correction=received#transcript`, request.url), 303);
  } catch (error) {
    if (error instanceof HostReviewRequestError)
      return NextResponse.json({ error: "Invalid request" }, { status: error.status, headers: noStore });
    const code = error instanceof CorrectionError ? error.code.toLowerCase() : "unavailable";
    if (!episodeId) return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: noStore });
    return NextResponse.redirect(new URL(`/episodes/${episodeId}?correction=${code}#transcript`, request.url), 303);
  }
}
