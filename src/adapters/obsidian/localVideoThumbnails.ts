/** Own the plugin's one local-video decoder and finite session-only frame cache. Filenames are
 * native file handles, not graph IDs. Each live subscriber owns an object URL through its own
 * document, and all such URLs share the one accounted encoded Blob for a file incarnation. */
import type {TFile, Vault} from "obsidian";
import type {LocalVideoThumbnailLease, LocalVideoThumbnailLoader} from "../../application/localVideoThumbnail";
import {decodeLocalVideoFrame, LOCAL_VIDEO_FRAME_LIMITS, type LocalVideoFrame} from "./localVideoFrame";

export const LOCAL_VIDEO_THUMBNAIL_LIMITS = {
  entries: 32,
  queue: 16,
  bytes: 8 * 1024 * 1024,
  retryMs: 60_000,
} as const;
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "m4v", "mkv", "ogv", "avi", "mpeg", "mpg", "3gp", "wmv", "mts", "m2ts"]);

type Subscriber = {
  document: Document;
  urlOwner: typeof URL;
  current: () => boolean;
  onRetired: () => void;
  resolve: (value: string | null) => void;
  url: string | null;
};
type Entry = {
  file: TFile;
  path: string;
  mtime: number;
  size: number;
  subscribers: Set<Subscriber>;
  frame: Blob | null;
  retryAt: number;
};

/** A refused lease owns neither a subscriber nor a decoder retry. */
function refusedLease(): LocalVideoThumbnailLease {
  return {promise: Promise.resolve(null), release: /** There is no retain to release. */ () => undefined};
}

/** Local media uses its own cancellation and cache policy, independent of remote image consent. */
export class LocalVideoThumbnails implements LocalVideoThumbnailLoader<TFile, Document> {
  private readonly entries = new Map<TFile, Entry>();
  private readonly queue: Entry[] = [];
  private active: {entry: Entry; document: Document; abort: AbortController} | null = null;
  private bytes = 0;
  private decodeStarts = 0;
  private cacheHits = 0;
  private oversized = 0;
  private disposed = false;
  private lastPreference = false;

  /** The native vault supplies local resource URLs only when an eligible job has a live consumer. */
  constructor(private readonly vault: Pick<Vault, "getFileByPath" | "getResourcePath">,
    private readonly enabled: () => boolean, private readonly decode = decodeLocalVideoFrame,
    private readonly clock: () => number = Date.now) {}

  /** Read the setting synchronously to fence deferred React callbacks. */
  permitted(): boolean {return !this.disposed && this.enabled();}

  /** Observe one accepted setting change without making media part of graph or snapshot policy. */
  syncPreference(): boolean {
    const next = this.permitted();
    if (next === this.lastPreference) return false;
    this.lastPreference = next;
    if (!next) this.clear();
    return true;
  }

  /** Classify likely video files without any vault or media resource access. Native decoding
   * decides which codecs and containers actually produce a thumbnail. */
  eligible(file: TFile): boolean {return VIDEO_EXTENSIONS.has(file.extension.toLowerCase());}

  /** Measure plugin-owned work and encoded retention without exposing file or document identities. */
  stats() {
    let cached = 0, liveUrls = 0;
    for (const entry of this.entries.values()) {
      if (entry.frame) cached++;
      for (const subscriber of entry.subscribers) if (subscriber.url) liveUrls++;
    }
    return {active: Number(Boolean(this.active)), queued: this.queue.length, cached, retainedBytes: this.bytes,
      liveUrls, decodeStarts: this.decodeStarts, cacheHits: this.cacheHits, oversized: this.oversized};
  }

  /** Acquire one actually visible occurrence. Identical live and cached files share the frame
   * even when their consumers have different owning documents. */
  acquire(file: TFile, path: string, document: Document, current: () => boolean, onRetired: () => void): LocalVideoThumbnailLease {
    const view = document.defaultView;
    if (!this.permitted() || !this.eligible(file) || !view || view.closed || document.hidden
      || !current() || file.path !== path || this.vault.getFileByPath(path) !== file) return refusedLease();

    let entry = this.entries.get(file);
    if (entry && (!this.fileCurrent(entry) || entry.retryAt && entry.retryAt <= this.clock())) {
      this.retire(entry);
      entry = undefined;
    }
    if (entry?.retryAt) return refusedLease();
    if (!entry) {
      // Leave room when an active job needs to change its decoding window.
      if (this.queue.length + Number(Boolean(this.active)) >= LOCAL_VIDEO_THUMBNAIL_LIMITS.queue
        || !this.makeRoom(LOCAL_VIDEO_THUMBNAIL_LIMITS.entries - 1, 0)) return refusedLease();
      entry = {file, path, mtime: file.stat.mtime, size: file.stat.size, subscribers: new Set(), frame: null, retryAt: 0};
      this.entries.set(file, entry);
      this.queue.push(entry);
    }
    let resolve!: Subscriber["resolve"];
    const promise = new Promise<string | null>(/** Resolve when the live URL is known or retired. */ complete => {resolve = complete;});
    const subscriber: Subscriber = {document, urlOwner: view.URL, current, onRetired, resolve, url: null};
    const captured = entry;
    captured.subscribers.add(subscriber);
    if (captured.frame) {
      this.cacheHits++;
      this.touch(captured);
      this.publish(captured, subscriber);
    } else this.pump();
    return {promise, release: /** Only this occurrence releases its document URL. */ () => {
      if (!captured.subscribers.has(subscriber)) return;
      this.removeSubscriber(captured, subscriber);
      if (!captured.subscribers.size && !captured.frame) this.retire(captured);
      else this.retireUnownedDecoder(captured);
    }};
  }

  /** Every native content and location change revokes the exact frame, including equal-stat writes. */
  invalidate(file: TFile): void {
    const entry = this.entries.get(file);
    if (entry) this.retire(entry);
  }

  /** Disable or unload without leaving cache entries or object URLs behind. */
  clear(): void {for (const entry of [...this.entries.values()]) this.retire(entry);}

  /** Retire the owner permanently before plugin teardown releases its canvases. */
  dispose(): void {this.disposed = true;this.clear();}

  /** Vault identities and file revisions remain authoritative through all media awaits. */
  private fileCurrent(entry: Entry): boolean {
    return entry.file.path === entry.path && this.vault.getFileByPath(entry.path) === entry.file
      && entry.file.stat.mtime === entry.mtime && entry.file.stat.size === entry.size;
  }

  /** Hidden, migrated and closing documents cannot extend native media ownership. */
  private subscriberCurrent(subscriber: Subscriber): boolean {
    const view = subscriber.document.defaultView;
    return this.permitted() && Boolean(view && !view.closed && !subscriber.document.hidden && subscriber.current());
  }

  /** Touch successful entries only. Pending requests retain their arrival order in the queue. */
  private touch(entry: Entry): void {
    this.entries.delete(entry.file);
    this.entries.set(entry.file, entry);
  }

  /** A fresh thumbnail cannot evict a Blob still published in another canvas. */
  private makeRoom(maxEntries: number, addedBytes: number): boolean {
    if (this.entries.size <= maxEntries && this.bytes + addedBytes <= LOCAL_VIDEO_THUMBNAIL_LIMITS.bytes) return true;
    for (const entry of this.entries.values()) {
      if (!entry.subscribers.size && this.active?.entry !== entry) this.retire(entry);
      if (this.entries.size <= maxEntries && this.bytes + addedBytes <= LOCAL_VIDEO_THUMBNAIL_LIMITS.bytes) return true;
    }
    return false;
  }

  /** Revoke the URL through the same browser object even after document destruction. */
  private removeSubscriber(entry: Entry, subscriber: Subscriber): void {
    entry.subscribers.delete(subscriber);
    try {
      if (subscriber.url) subscriber.urlOwner.revokeObjectURL(subscriber.url);
    } catch {
      // The captured realm may already have released its URLs during teardown.
    } finally {
      subscriber.url = null;
      subscriber.resolve(null);
    }
  }

  /** Remove an entry and its accounted bytes before notifying surviving render subscriptions. */
  private retire(entry: Entry): void {
    if (this.entries.get(entry.file) !== entry) return;
    this.entries.delete(entry.file);
    const queued = this.queue.indexOf(entry);
    if (queued >= 0) this.queue.splice(queued, 1);
    const releasedBytes = entry.frame?.size ?? 0;
    entry.frame = null;
    if (this.active?.entry === entry) this.active.abort.abort();
    const subscribers = [...entry.subscribers];
    for (const subscriber of subscribers) this.removeSubscriber(entry, subscriber);
    this.bytes -= releasedBytes;
    for (const subscriber of subscribers) subscriber.onRetired();
  }

  /** If the decoding document retires, yield the one decoder so another live owner can retry. */
  private retireUnownedDecoder(entry: Entry): void {
    if (!this.active || this.active.entry !== entry) return;
    const document = this.active.document;
    const owned = [...entry.subscribers].some(subscriber => subscriber.document === document && this.subscriberCurrent(subscriber));
    if (!owned) this.active.abort.abort();
  }

  /** Publish a URL only to the same eligible subscriber, sharing the accounted Blob by reference. */
  private publish(entry: Entry, subscriber: Subscriber): void {
    try {
      if (entry.frame && this.fileCurrent(entry) && this.subscriberCurrent(subscriber)) {
        subscriber.url = subscriber.urlOwner.createObjectURL(entry.frame);
        subscriber.resolve(subscriber.url);
        return;
      }
    } catch {
      // An unavailable owning window retains its attachment icon.
    }
    this.removeSubscriber(entry, subscriber);
  }

  /** Start the next actually occupied entry. Queue draining never opens or enumerates Vault files. */
  private pump(): void {
    if (this.active || !this.permitted()) return;
    while (this.queue.length) {
      const entry = this.queue.shift()!;
      const owner = [...entry.subscribers].find(subscriber => this.subscriberCurrent(subscriber));
      if (!owner || !this.fileCurrent(entry)) {this.retire(entry);continue;}
      const abort = new AbortController();
      this.active = {entry, document: owner.document, abort};
      void this.run(entry, owner.document, abort);
      return;
    }
  }

  /** Hold one native decoder through its final cleanup. A retired decoding document can hand a
   * cancelled still-visible job to a different document, with one new ordinary queue admission. */
  private async run(entry: Entry, document: Document, abort: AbortController): Promise<void> {
    let result: LocalVideoFrame = {status: "unavailable"};
    try {
      const resource = this.vault.getResourcePath(entry.file);
      this.decodeStarts++;
      result = await this.decode(document, resource, abort.signal);
    } catch {
      // Native loader errors are an attachment-icon fallback.
    } finally {
      this.active = null;
    }
    if (this.entries.get(entry.file) === entry) {
      if (!this.fileCurrent(entry) || ![...entry.subscribers].some(subscriber => this.subscriberCurrent(subscriber))) this.retire(entry);
      else if (abort.signal.aborted || result.status === "cancelled") {
        this.queue.unshift(entry);
      } else if (result.status === "ready" && result.blob.size > 0 && result.blob.size <= LOCAL_VIDEO_FRAME_LIMITS.bytes
        && this.makeRoom(LOCAL_VIDEO_THUMBNAIL_LIMITS.entries, result.blob.size)) {
        entry.frame = result.blob;
        this.bytes += result.blob.size;
        this.touch(entry);
        for (const subscriber of entry.subscribers) this.publish(entry, subscriber);
      } else {
        if (result.status === "oversized") this.oversized++;
        entry.retryAt = this.clock() + LOCAL_VIDEO_THUMBNAIL_LIMITS.retryMs;
        for (const subscriber of entry.subscribers) this.removeSubscriber(entry, subscriber);
        this.touch(entry);
      }
    }
    this.pump();
  }
}
