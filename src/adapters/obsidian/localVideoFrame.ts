/** Generate one small image from an Obsidian local media URL in its consuming document.
 * Native media loading owns the input bytes. The adapter bounds drawable dimensions,
 * encoded output and lifetime and retires the media source on every terminal path. */
export const LOCAL_VIDEO_FRAME_LIMITS = {
  pixels: 1920 * 1080,
  edge: 256,
  bytes: 256 * 1024,
  timeoutMs: 6000,
} as const;

export type LocalVideoFrame = Readonly<{status: "ready"; blob: Blob}>
  | Readonly<{status: "oversized" | "unavailable" | "cancelled"}>;

/** Accept only Obsidian's local resource schemes or an exact local WebView origin. */
function isLocalResource(value: string, view: Window): boolean {
  try {
    const url = new URL(value);
    return ["app:", "file:", "capacitor:", "ionic:"].includes(url.protocol)
      || url.hostname === "localhost" && url.origin === view.location.origin;
  } catch {
    return false;
  }
}

/** Seek and encode a paused frame. Abort and timeout release the decoder and settle the lease
 * immediately, including when canvas encoding has already scheduled a late callback. */
export function decodeLocalVideoFrame(owner: Document, resource: string, signal: AbortSignal): Promise<LocalVideoFrame> {
  const view = owner.defaultView;
  if (signal.aborted) return Promise.resolve({status: "cancelled"});
  if (!view || view.closed || owner.hidden || !isLocalResource(resource, view)) return Promise.resolve({status: "unavailable"});
  return new Promise(resolve => {
    const helpers = owner.win as Window & {createFragment: typeof createFragment};
    const fragment = helpers.createFragment();
    if (fragment.ownerDocument !== owner) {resolve({status: "unavailable"});return;}
    const video = fragment.createEl("video"), canvas = fragment.createEl("canvas");
    const events = ["loadedmetadata", "loadeddata", "canplay", "seeked", "error"] as const;
    let timer = 0, settled = false, sampled = false, encoding = false;

    /** Removing src and calling load closes the native paused media pipeline. */
    const finish = (result: LocalVideoFrame): void => {
      if (settled) return;
      settled = true;
      view.clearTimeout(timer);
      signal.removeEventListener("abort", cancel);
      for (const event of events) video.removeEventListener(event, advance);
      try {
        video.removeAttribute("src");
        video.load();
      } catch {
        // A closed owning document already released its native pipeline.
      } finally {
        canvas.width = 0;
        canvas.height = 0;
        resolve(result);
      }
    };

    /** Explicit cancellation never publishes a result or incurs an unsupported-file cooldown. */
    const cancel = (): void => finish({status: "cancelled"});

    /** Verify the actual encoder response. Hosts without WebP can encode PNG instead. */
    const encode = (mime: "image/webp" | "image/png"): void => {
      try {
        canvas.toBlob(/** A retired canvas cannot publish its already-queued encoder callback. */ blob => {
          if (settled) return;
          if (blob && (blob.type === "image/webp" || blob.type === "image/png") && blob.size > 0
            && blob.size <= LOCAL_VIDEO_FRAME_LIMITS.bytes) finish({status: "ready", blob});
          else if (!blob && mime === "image/webp") encode("image/png");
          else finish({status: "unavailable"});
        }, mime, 0.8);
      } catch {
        finish({status: "unavailable"});
      }
    };

    /** Dimensions are checked before requesting any seek, including rotated and short clips. */
    const advance = (): void => {
      if (settled) return;
      if (video.error) {finish({status: "unavailable"});return;}
      if (encoding || video.readyState < video.HAVE_METADATA) return;
      try {
        if (!sampled) {
          const {videoWidth, videoHeight, duration} = video;
          if (!videoWidth || !videoHeight || !Number.isFinite(duration) || duration <= 0) {
            finish({status: "unavailable"});
            return;
          }
          if (videoWidth * videoHeight > LOCAL_VIDEO_FRAME_LIMITS.pixels) {
            finish({status: "oversized"});
            return;
          }
          const scale = Math.min(1, LOCAL_VIDEO_FRAME_LIMITS.edge / Math.max(videoWidth, videoHeight));
          canvas.width = Math.max(1, Math.round(videoWidth * scale));
          canvas.height = Math.max(1, Math.round(videoHeight * scale));
          sampled = true;
          const sample = Math.min(2, duration * 0.1);
          video.preload = "auto";
          if (sample > 0 && video.currentTime !== sample) video.currentTime = sample;
        }
        if (video.seeking || video.readyState < video.HAVE_CURRENT_DATA) return;
        const context = canvas.getContext("2d");
        if (!context) {finish({status: "unavailable"});return;}
        encoding = true;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        encode("image/webp");
      } catch {
        finish({status: "unavailable"});
      }
    };

    for (const event of events) video.addEventListener(event, advance);
    signal.addEventListener("abort", cancel, {once: true});
    timer = view.setTimeout(/** Some paused mobile elements emit neither a drawable frame nor an error. */ () => finish({status: "unavailable"}), LOCAL_VIDEO_FRAME_LIMITS.timeoutMs);
    try {
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      // Obsidian's custom app: resource origin must grant an ordinary CORS media load.
      video.crossOrigin = "anonymous";
      video.src = resource;
    } catch {
      finish({status: "unavailable"});
    }
  });
}
