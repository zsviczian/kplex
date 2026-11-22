/** Host-only thumbnail transport shared by current mounted canvases. URL-node visual resolution
 * supplies a candidate without I/O; only a consented viewport image acquires this bounded service.
 * Obsidian owns HTTP transport, while each image owns and revokes its own document's Blob URL. */
import {requestUrl} from "obsidian";
import {YoutubeThumbnails, YOUTUBE_THUMBNAIL_LIMITS, type ThumbnailLoader} from "../../application/youtubeThumbnails";
/** Shared leases coalesce repeated/timestamped links without merging their graph identities. */
export const youtubeThumbnails = new YoutubeThumbnails(/** Fetch only a statically bounded image candidate through native transport. */ async url => {
  const response = await requestUrl({url, method: "GET", throw: false});
  if (response.status !== 200 || !response.arrayBuffer.byteLength
    || response.arrayBuffer.byteLength > YOUTUBE_THUMBNAIL_LIMITS.imageBytes) return null;
  // Thumbnail endpoints are JPEGs. Reject error documents even when a proxy returns status 200.
  const bytes = new Uint8Array(response.arrayBuffer);
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return null;
  return {bytes: response.arrayBuffer, mime: "image/jpeg"};
});

/** Read live host consent before every fallback, including before React processes a settings save. */
export function youtubeThumbnailLoader(consent: () => boolean): ThumbnailLoader {
  return {permitted: consent, acquire: /** Combine each node's document lifetime with its host's current permission. */ (id, current) =>
    youtubeThumbnails.acquire(id, /** A queued rendering update cannot delay remote-request revocation. */ () => consent() && current())};
}
