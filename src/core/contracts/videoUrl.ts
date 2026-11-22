/** Shared bounded YouTube identity extraction from a standard-parser URL projection. It performs
 * no URL rewriting, graph canonicalization, metadata lookup or network work. */
export type ParsedVideoUrl = Readonly<{protocol: string; hostname: string; pathname: string;
  searchParams: Readonly<{get: (name: string) => string | null}>}>;

/** Return the validated video ID and format hint for the existing explicitly allowed hosts. */
export function youtubeVideo(target: ParsedVideoUrl): Readonly<{id: string; portrait: boolean}> | null {
  if (target.protocol !== "https:" && target.protocol !== "http:") return null;
  const host = target.hostname.toLowerCase();
  if (!["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtube-nocookie.com"].includes(host)) return null;
  const segments = target.pathname.split("/").filter(Boolean);
  const id = host === "youtu.be" ? segments[0]
    : ["embed", "shorts", "live"].includes(segments[0]) ? segments[1] : target.searchParams.get("v");
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? {id, portrait: segments[0] === "shorts"} : null;
}

/** Keep all remote candidates on the literal image host, with a finite quality fallback sequence. */
export function youtubeThumbnailUrls(id: string): readonly string[] {
  return /^[A-Za-z0-9_-]{11}$/.test(id) ? [
    `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${id}/hq720.jpg`,
    `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
    `https://i.ytimg.com/vi/${id}/default.jpg`,
  ] : [];
}
