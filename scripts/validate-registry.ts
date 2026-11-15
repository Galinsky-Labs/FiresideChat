import { podcastRegistry } from "../src/data/podcast-registry";
import { verifiedVideos, validateVideoRegistry } from "../src/data/video-registry";

function assertUnique(values: string[], label: string) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }

  if (duplicates.size > 0) {
    throw new Error(
      `Duplicate ${label}: ${Array.from(duplicates).sort().join(", ")}`,
    );
  }
}

const peopleBySlug = new Set(podcastRegistry.people.map((person) => person.slug));

assertUnique(
  podcastRegistry.people.map((person) => person.slug),
  "person slugs",
);
assertUnique(
  podcastRegistry.podcasts.map((podcast) => podcast.slug),
  "podcast slugs",
);
assertUnique(
  podcastRegistry.podcasts.map((podcast) => podcast.rssUrl),
  "RSS URLs",
);

for (const podcast of podcastRegistry.podcasts) {
  if (!podcast.rssUrl.startsWith("https://")) {
    throw new Error(`${podcast.slug} must use an HTTPS RSS URL`);
  }

  if (!podcast.verificationUrl.startsWith("https://")) {
    throw new Error(`${podcast.slug} is missing an HTTPS verification URL`);
  }

  const verifiedAt = new Date(`${podcast.verifiedAt}T00:00:00Z`);
  if (Number.isNaN(verifiedAt.getTime())) {
    throw new Error(`${podcast.slug} has an invalid verifiedAt date`);
  }

  if (podcast.people.length === 0) {
    throw new Error(`${podcast.slug} has no associated public servant`);
  }

  for (const relationship of podcast.people) {
    if (!peopleBySlug.has(relationship.personSlug)) {
      throw new Error(
        `${podcast.slug} references unknown person ${relationship.personSlug}`,
      );
    }
  }
}

validateVideoRegistry(verifiedVideos);
for (const video of verifiedVideos) {
  if (!peopleBySlug.has(video.personSlug)) {
    throw new Error("Video references unknown public servant " + video.personSlug);
  }
}
console.log(
  `Registry valid: ${podcastRegistry.people.length} people, ${podcastRegistry.podcasts.length} ingestable podcasts, ${podcastRegistry.candidates.length} candidates, ${verifiedVideos.length} verified videos.`,
);
