type VideoSource = { platform: "YOUTUBE" | "INSTAGRAM" | "OTHER"; platformVideoId: string; sourceUrl: string };

export function validateVideoSource(video: VideoSource): string {
  let url: URL;
  try { url = new URL(video.sourceUrl); } catch { throw new Error("Invalid video URL"); }
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Video URL must use HTTPS");
  const hostname = url.hostname.toLowerCase();
  if (video.platform === "YOUTUBE") {
    const id = hostname === "youtu.be" ? url.pathname.slice(1) :
      (hostname === "www.youtube.com" || hostname === "youtube.com") &&
      url.pathname === "/watch" ? url.searchParams.get("v") : null;
    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id) || id !== video.platformVideoId)
      throw new Error("Invalid YouTube video source");
    return id;
  }
  if (video.platform === "INSTAGRAM") {
    if (!["instagram.com", "www.instagram.com"].includes(hostname))
      throw new Error("Invalid Instagram host");
    const match = url.pathname.match(/^\/(?:reel|p|tv)\/([A-Za-z0-9_-]+)\/?$/);
    if (!match || match[1] !== video.platformVideoId) throw new Error("Invalid Instagram video source");
    return match[1];
  }
  if (video.platformVideoId.length < 3 || !/^[a-z0-9.-]+$/i.test(hostname))
    throw new Error("Invalid external video source");
  return video.platformVideoId;
}

export function youtubeEmbedUrl(video: VideoSource): string | null {
  if (video.platform !== "YOUTUBE") return null;
  const id = validateVideoSource(video);
  return "https://www.youtube-nocookie.com/embed/" + id;
}
