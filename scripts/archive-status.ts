import "dotenv/config";
import { readCoverageInventory } from "../src/lib/coverage-inventory-store";
import { db } from "../src/lib/db";

async function main() {
  const report = await readCoverageInventory();
  console.log(JSON.stringify(report, null, 2));
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
