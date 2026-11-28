/** Bounded, same-site resource loading for one static publication. */
import {PUBLICATION_MANIFEST_MAX_BYTES, type PublicationManifest} from "../core/plex/publication";

type ResourceOwner = Pick<Window, "fetch" | "crypto">;

/** Read actual decoded bytes with a hard bound, including chunked HTTP responses. */
async function readBytes(owner: ResourceOwner, url: URL, limit: number, signal?: AbortSignal): Promise<Uint8Array<ArrayBuffer>> {
  const response = await owner.fetch(url, {credentials: "omit", redirect: "error", signal});
  const reader = response.body?.getReader();
  if (!response.ok || !reader || Number(response.headers.get("Content-Length")) > limit) {
    await reader?.cancel();
    throw new Error("Publication resource unavailable");
  }
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > limit) throw new Error("Publication resource exceeds its declared size");
      chunks.push(chunk.value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/** Read the bounded manifest before the portable schema validator admits it. */
export async function fetchManifest(owner: ResourceOwner, url: URL, signal?: AbortSignal): Promise<unknown> {
  return JSON.parse(new TextDecoder("utf-8", {fatal: true}).decode(await readBytes(owner, url, PUBLICATION_MANIFEST_MAX_BYTES, signal)));
}

/** Scope immutable resource descriptors and asset paths to this exact mount/publication. */
export function publicationResources(owner: ResourceOwner, publicationUrl: URL, manifest: PublicationManifest) {
  const siteURL = new URL("./", publicationUrl);
  const byPath = new Map(manifest.resources.map(resource => [resource.path, resource]));
  const assetPaths = new Set([...byPath.keys()].filter(path => path.startsWith("assets/")));
  /** Verify byte length and content before a note, search index or theme can affect the reader. */
  async function bytes(path: string, signal: AbortSignal): Promise<Uint8Array<ArrayBuffer>> {
    const descriptor = byPath.get(path);
    const url = new URL(path, siteURL);
    if (!descriptor || url.origin !== siteURL.origin || url.pathname !== `${siteURL.pathname}${path}` || !owner.crypto.subtle) {
      throw new Error("Publication resource unavailable");
    }
    const value = await readBytes(owner, url, descriptor.bytes, signal);
    if (value.byteLength !== descriptor.bytes) throw new Error("Publication resource size mismatch");
    const digest = await owner.crypto.subtle.digest("SHA-256", value);
    signal.throwIfAborted();
    const checksum = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
    if (checksum !== descriptor.sha256) throw new Error("Publication resource checksum mismatch");
    return value;
  }
  return {siteURL, assetPaths, bytes, has: (path: string) => byPath.has(path),
    /** Decode public text as UTF-8 without accepting malformed replacement data. */
    async text(path: string, signal: AbortSignal): Promise<string> {
      return new TextDecoder("utf-8", {fatal: true}).decode(await bytes(path, signal));
    },
  };
}

export type PublicationResources = ReturnType<typeof publicationResources>;
