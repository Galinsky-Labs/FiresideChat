import "dotenv/config";
import { spawn } from "node:child_process";

type StepResult = {
  name: string;
  exitCode: number;
};

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function runStep(name: string, script: string): Promise<StepResult> {
  return new Promise((resolve, reject) => {
    console.log("\n=== " + name + " ===");
    const child = spawn(npmCommand, ["run", script], {
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ name, exitCode: code ?? 1 });
    });
  });
}

async function main() {
  const startedAt = new Date();
  const results: StepResult[] = [];

  results.push(await runStep("Feed ingestion", "ingest:feeds"));

  if (process.env.INSTAGRAM_SYNC_ENABLED === "true") {
    results.push(await runStep("Authorized Instagram discovery", "ingest:instagram"));
  }

  results.push(await runStep("Publisher and episode-page transcript recovery", "backfill:transcripts"));

  results.push(
    await runStep("Generated transcript fallback", "transcribe:missing"),
  );

  const failed = results.filter((result) => result.exitCode !== 0);
  const summary = {
    startedAt: startedAt.toISOString(),
    completedAt: new Date().toISOString(),
    results,
    ok: failed.length === 0,
  };

  console.log("\n=== Archive maintenance summary ===");
  console.log(JSON.stringify(summary, null, 2));

  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
