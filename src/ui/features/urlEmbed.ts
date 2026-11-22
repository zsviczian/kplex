/** Parse explicitly opened web targets into safe embed URLs without fetching metadata or loading scripts. */
import {youtubeVideo} from "../../core/contracts/videoUrl";
export type UrlEmbed = Readonly<{ url: string; aspectRatio: number | null }>;

/** Normalize supported video links; ordinary HTTP(S) pages retain their full browser URL. */
export function urlEmbed(rawUrl: string): UrlEmbed | null {
  let target: URL;
  try { target = new URL(rawUrl); } catch { return null; }
  if (target.protocol !== "https:" && target.protocol !== "http:") return null;
  const host = target.hostname.toLowerCase();
  const segments = target.pathname.split("/").filter(Boolean);
  const youtube = youtubeVideo(target);
  if (youtube) {
    const video = new URL(`https://www.youtube.com/embed/${youtube.id}`);
    video.searchParams.set("playsinline", "1");
    const start = target.searchParams.get("start") ?? target.searchParams.get("t");
    if (start && /^\d+s?$/.test(start)) video.searchParams.set("start", start.replace(/s$/, ""));
    return { url: video.href, aspectRatio: youtube.portrait ? 9 / 16 : 16 / 9 };
  }
  if (["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(host)) {
    const id = [...segments].reverse().find(/** Vimeo embeds identify a video by its numeric path segment. */ (part) => /^\d+$/.test(part));
    if (id) {
      const video = new URL(`https://player.vimeo.com/video/${id}`);
      const privateHash = target.searchParams.get("h") ?? segments[segments.indexOf(id) + 1];
      if (privateHash && /^[a-f0-9]+$/i.test(privateHash)) video.searchParams.set("h", privateHash);
      return { url: video.href, aspectRatio: 16 / 9 };
    }
  }
  return { url: target.href, aspectRatio: null };
}
