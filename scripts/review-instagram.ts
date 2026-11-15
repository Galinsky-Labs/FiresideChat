import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL required");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
async function main() {
  const [action, id, format] = process.argv.slice(2);
  if (!action || action === "list") {
    const videos = await db.videoChat.findMany({
      where: { platform: "INSTAGRAM", active: false },
      include: { person: true }, orderBy: { publishedAt: "desc" }, take: 100,
    });
    for (const v of videos) console.log(JSON.stringify({
      id: v.id, publisher: v.person.fullName, sourceUrl: v.sourceUrl,
      title: v.title, description: v.description, proposedFormat: v.format,
    }));
    return;
  }
  if (!["approve", "reject"].includes(action) || !id) {
    throw new Error("Usage: npm run review:instagram -- list | approve <ID> <PERSONAL_CHAT|LIVESTREAM|Q_AND_A|BEHIND_THE_SCENES> | reject <ID>");
  }
  const video = await db.videoChat.findUnique({ where: { id } });
  if (!video || video.platform !== "INSTAGRAM" || video.active)
    throw new Error("Not an unpublished Instagram candidate");
  if (action === "reject") {
    await db.videoChat.delete({ where: { id } });
    console.log("Candidate rejected: " + video.sourceUrl);
    return;
  }
  const formats = ["PERSONAL_CHAT", "LIVESTREAM", "Q_AND_A", "BEHIND_THE_SCENES"] as const;
  if (!formats.some((value) => value === format)) throw new Error("Explicit approved format required");
  // Human reviewer must visit the source URL and confirm the publisher,
  // conversational format, ownership, and absence of campaign-only clips.
  await db.videoChat.update({ where: { id }, data: {
    active: true,
    format: format as typeof formats[number],
    verifiedAt: new Date(),
    verificationNote: video.verificationNote + " Editorial approval recorded after original-source review.",
  } });
  console.log("Published: " + video.sourceUrl);
}
main().catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await db.$disconnect(); });
