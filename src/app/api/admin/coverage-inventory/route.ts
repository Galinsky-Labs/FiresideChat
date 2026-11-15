import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { readCoverageInventory } from "@/lib/coverage-inventory-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store, private" };

/** FC-P01 live snapshot of the deployed database; admin session required. */
export async function GET() {
  if (!(await isAdminAuthenticated()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  try {
    return NextResponse.json(await readCoverageInventory(), { headers: noStore });
  } catch {
    return NextResponse.json({ error: "Coverage inventory unavailable" }, { status: 503, headers: noStore });
  }
}
