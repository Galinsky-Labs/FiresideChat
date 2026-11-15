import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { instagramSources } from "../src/data/instagram-sources";
import { discoverInstagramVideos } from "../src/lib/instagram-discovery";

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
const token = process.env.INSTAGRAM_GRAPH_ACCESS_TOKEN;
const viewerId = process.env.INSTAGRAM_GRAPH_VIEWER_IG_ID;
if (!url || !token || !viewerId) {
  console.error("Instagram sync not configured. Set DATABASE_URL, INSTAGRAM_GRAPH_ACCESS_TOKEN and INSTAGRAM_GRAPH_VIEWER_IG_ID.");
  process.exit(2);
}
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

async function main() {
  let staged = 0, existing = 0, failed = 0;
  for (const source of instagramSources) {
    try {
      const person = await db.person.findUnique({ where: { slug: source.personSlug } });
      if (!person) throw new Error("Unseeded person identity for " + source.personSlug);
      const videos = await discoverInstagramVideos(source.username, {
        accessToken: token!,
        viewerIgUserId: viewerId!,
        maxPages: Number(process.env.INSTAGRAM_DISCOVERY_MAX_PAGES || "2"),
      });
      for (const video of videos) {
        const previous = await db.videoChat.findUnique({
          where: { platform_platformVideoId: { platform: video.platform, platformVideoId: video.platformVideoId } },
        });
        if (previous) { existing++; continue; }
        await db.videoChat.create({
          data: {
            ...video, personId: person.id,
            publisherName: person.fullName,
            verificationUrl: video.sourceUrl,
            verificationNote: "Discovered through Meta Graph API Business Discovery from @" + source.username +
              "; editorial review required before publication.",
            verifiedAt: new Date(),
            active: false,
          },
        });
        staged++;
      }
      console.log("Instagram @" + source.username + ": " + videos.length + " video candidates discovered");
    } catch (error) {
      failed++;
      console.error("Instagram @" + source.username + " failed:", error instanceof Error ? error.message : String(error));
    }
  }
  console.log(JSON.stringify({ staged, existing, failed }));
  if (failed) process.exitCode = 1;
}
main().catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await db.$disconnect(); });
