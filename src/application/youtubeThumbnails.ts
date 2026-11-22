/** Coalesced, bounded YouTube thumbnail requests owned solely by mounted image consumers.
 * The host supplies network access and exact live-consent callbacks. No request survives the last
 * subscriber into another quality attempt; settled bytes are discarded on final release. */
import {youtubeThumbnailUrls} from "../core/contracts/videoUrl";

export type ThumbnailBytes = Readonly<{bytes: ArrayBuffer; mime: string}>;
export type ThumbnailLoader = Readonly<{permitted: () => boolean; acquire: (id: string, current: () => boolean) => Readonly<{
  promise: Promise<ThumbnailBytes | null>; release: () => void}>}>;
type ThumbnailEntry = {subscribers: Map<object, () => boolean>; promise: Promise<ThumbnailBytes | null>; size: number};
export const YOUTUBE_THUMBNAIL_LIMITS = {entries: 32, requests: 32, imageBytes: 1024 * 1024, cacheBytes: 8 * 1024 * 1024} as const;

/** Share one finite fallback task per video while retaining independent caller cancellation. */
export class YoutubeThumbnails {
  private readonly entries = new Map<string, ThumbnailEntry>();
  private bytes = 0;
  /** Native requestUrl cannot be aborted; released consumers retain this permit until transport settles. */
  private activeRequests = 0;

  /** Receive the only I/O capability; opening the cache starts no network requests. */
  constructor(private readonly request: (url: string) => Promise<ThumbnailBytes | null>) {}

  /** Acquire a mounted consumer's lease. Invalid IDs, unavailable capacity or stale consent refuse
   * without a request. Callers release when hidden, replaced, unmounted or permission is revoked. */
  acquire(id: string, current: () => boolean): Readonly<{promise: Promise<ThumbnailBytes | null>; release: () => void}> {
    const candidates = youtubeThumbnailUrls(id);
    if (!current() || !candidates.length || !this.entries.has(id) && (this.entries.size >= YOUTUBE_THUMBNAIL_LIMITS.entries
      || this.activeRequests >= YOUTUBE_THUMBNAIL_LIMITS.requests)) {
      return {promise: Promise.resolve(null), release: /** A refused lease owns no retained resources. */ () => undefined};
    }
    const token = {};
    let entry = this.entries.get(id);
    if (!entry) {
      entry = {subscribers: new Map([[token, current]]), promise: Promise.resolve(null), size: 0};
      this.entries.set(id, entry);
      entry.promise = this.load(id, entry, candidates);
    } else entry.subscribers.set(token, current);
    const captured = entry;
    let released = false;
    return {promise: entry.promise, release: /** Final release retires pending fallback and cached bytes exactly once. */ () => {
      if (released) return;
      released = true;
      captured.subscribers.delete(token);
      if (!captured.subscribers.size && this.entries.get(id) === captured) {
        this.bytes -= captured.size;
        captured.size = 0;
        this.entries.delete(id);
      }
    }};
  }

  /** Try each supported quality once; revocation cannot start a subsequent request or retain bytes. */
  private async load(id: string, entry: ThumbnailEntry, candidates: readonly string[]): Promise<ThumbnailBytes | null> {
    /** A replaced cache entry and all retired subscribers independently revoke this task. */
    const current = (): boolean => this.entries.get(id) === entry && [...entry.subscribers.values()].some(/** Any live subscriber may keep the shared request admitted. */ valid => valid());
    for (const url of candidates) {
      if (!current() || this.activeRequests >= YOUTUBE_THUMBNAIL_LIMITS.requests) return null;
      let result: ThumbnailBytes | null;
      this.activeRequests += 1;
      try {result = await this.request(url);} catch {result = null;}
      finally {this.activeRequests -= 1;}
      if (!current()) return null;
      if (!result || !result.bytes.byteLength || result.bytes.byteLength > YOUTUBE_THUMBNAIL_LIMITS.imageBytes
        || result.mime !== "image/jpeg") continue;
      if (this.bytes + result.bytes.byteLength > YOUTUBE_THUMBNAIL_LIMITS.cacheBytes) return null;
      entry.size = result.bytes.byteLength;
      this.bytes += entry.size;
      return result;
    }
    return null;
  }
}
