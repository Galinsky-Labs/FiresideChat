import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { preflightHostReviewJsonl } from "../src/lib/host-review-batch";
import { submitHostCandidate } from "../src/lib/host-review-store";

async function main() {
  const [mode,filename,extra]=process.argv.slice(2);
  if ((mode!=="--dry-run"&&mode!=="--apply")||!filename||extra||!filename.endsWith(".jsonl"))
    throw new Error("Usage: tsx scripts/stage-host-review-batch.ts --dry-run|--apply source.jsonl");
  const path=resolve(filename);
  const meta=await stat(path);
  if (!meta.isFile() || meta.size>2_000_000) throw new Error("Input must be a JSONL file under 2 MB");
  const records=preflightHostReviewJsonl(await readFile(path,"utf8"));
  // Dry run is the default operator workflow and never opens the database.
  if (mode==="--dry-run") { console.log("VALID_PENDING_CANDIDATES",records.length); return; }
  if (!process.env.DATABASE_URL || process.env.HOST_REVIEW_BATCH_APPLY!=="yes" || process.env.GITHUB_ACTIONS==="true")
    throw new Error("Batch apply requires an explicit operator flag, a configured database and a non-CI runtime");
  let staged=0, duplicates=0;
  for (const record of records) {
    try {await submitHostCandidate(record,"BATCH");staged++;}
    catch(e){
      if (e && typeof e==="object" && "code" in e && e.code==="P2002") {duplicates++;continue;}
      throw e;
    }
  }
  console.log("STAGED_PENDING",staged,"UNCHANGED_DUPLICATES",duplicates);
}
main().catch(error=>{console.error("Host review staging failed:", error instanceof Error?error.message:"Unknown error");process.exitCode=1;});
