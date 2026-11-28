/** Assemble a complete, deterministic static site before handing one immutable ZIP to the host. */
import {
  isPublicationPath, publicationSearchPath, publicationThemePath, PUBLICATION_MAX_BYTES, PUBLICATION_MANIFEST_MAX_BYTES,
  readPublicationManifest, type PublicationManifest, type PublicationResource,
} from "../../core/plex/publication";
import {publicationShell, type PublicationDigest, type RuntimePack} from "./runtimePack";
import {buildPublicationSearch, type PublicationSearchRow} from "../../core/plex/publicationSearch";

export type StaticFile = Readonly<{path: string; bytes: Uint8Array<ArrayBuffer>}>;
type SiteContent = Omit<PublicationManifest, "version" | "runtimeVersion" | "resources" | "fullText">;

/** Generate a complete fresh package with a verified manifest covering every output except itself. */
export async function assemblePublicationSite(
  content: SiteContent, notesAndAssets: readonly StaticFile[], runtime: RuntimePack,
  options: Readonly<{digest: PublicationDigest; current: () => boolean; signal: AbortSignal; theme?: string; search?: readonly PublicationSearchRow[]}>,
): Promise<{manifest: PublicationManifest; files: readonly StaticFile[]}> {
  const encoder = new TextEncoder();
  const entries = new Map<string, Uint8Array<ArrayBuffer>>();
  let bytes = 0;
  /** Reject duplicate names and accumulated byte overflow before keeping another file. */
  const put = (path: string, data: Uint8Array<ArrayBuffer>): void => {
    if (!isPublicationPath(path) || entries.has(path)) throw new Error("Invalid or duplicate publication path");
    bytes += data.byteLength;
    if (data.byteLength > 32 * 1024 * 1024 || bytes > PUBLICATION_MAX_BYTES) throw new Error("Publication exceeds package limit");
    entries.set(path, data);
  };
  /** Recheck export ownership after any asynchronous hashing or content work. */
  const checked = (): void => {
    options.signal.throwIfAborted();
    if (!options.current()) throw new Error("Publication review changed");
  };
  checked();
  put("index.html", encoder.encode(publicationShell));
  put(".nojekyll", new Uint8Array());
  for (const file of runtime.files) put(file.path, encoder.encode(file.text));
  for (const file of notesAndAssets) {
    if (!file.path.startsWith("notes/") && !file.path.startsWith("assets/")) throw new Error("Invalid publication content path");
    put(file.path, file.bytes);
  }
  if (options.theme !== undefined) put(publicationThemePath, encoder.encode(options.theme));
  if (options.search !== undefined) {
    const approved = new Set(content.nodes.map(node => node.id)), seen = new Set<string>();
    const search = options.search.map(({id, text}) => {
      if (!approved.has(id) || seen.has(id) || text.length > 100_000) throw new Error("Invalid public search row");
      seen.add(id);
      return {id, text};
    });
    put(publicationSearchPath, encoder.encode(JSON.stringify(buildPublicationSearch(search))));
  }
  const resources: PublicationResource[] = [];
  const files: StaticFile[] = [];
  for (const path of [...entries.keys()].sort()) {
    checked();
    const data = entries.get(path)!;
    resources.push({path, bytes: data.byteLength, sha256: await options.digest(data)});
    files.push({path, bytes: data});
  }
  checked();
  const manifest = readPublicationManifest({...content, version: 2, runtimeVersion: runtime.version, fullText: options.search !== undefined, resources});
  const manifestBytes = encoder.encode(JSON.stringify(manifest) + "\n");
  if (manifestBytes.byteLength > PUBLICATION_MANIFEST_MAX_BYTES || bytes + manifestBytes.byteLength > PUBLICATION_MAX_BYTES) throw new Error("Publication exceeds package limit");
  files.push({path: "publication.json", bytes: manifestBytes});
  return {manifest, files};
}

/** CRC-32 for classic ZIP store entries. The table is built only on explicit export. */
function crcTable(): Uint32Array {
  return Uint32Array.from({length: 256}, (_, byte) => {
    let crc = byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc & 1 ? 0xedb88320 : 0) ^ crc >>> 1;
    return crc >>> 0;
  });
}

/** Write uncompressed ZIP parts with deterministic timestamps and no intermediate data copies. */
export async function zipPublication(
  files: readonly StaticFile[], signal: AbortSignal, current: () => boolean, yieldWork: () => Promise<void>,
): Promise<readonly Uint8Array<ArrayBuffer>[]> {
  if (!files.length || files.length > 40_000) throw new Error("Invalid publication archive count");
  const encoder = new TextEncoder(), table = crcTable(), names = new Set<string>();
  const parts: Uint8Array<ArrayBuffer>[] = [], directory: Uint8Array<ArrayBuffer>[] = [];
  let offset = 0, directorySize = 0, slicedBytes = 0;
  for (const {path, bytes} of files) {
    signal.throwIfAborted();
    if (!current()) throw new Error("Publication review changed");
    if ((!isPublicationPath(path) && path !== "publication.json") || names.has(path)) throw new Error("Invalid or duplicate archive path");
    names.add(path);
    const name = encoder.encode(path);
    if (offset + bytes.byteLength + 30 + name.length > PUBLICATION_MAX_BYTES) throw new Error("Publication archive exceeds byte limit");
    let crc = 0xffffffff;
    for (let index = 0; index < bytes.length; index++) {
      crc = table[(crc ^ bytes[index]) & 0xff] ^ crc >>> 8;
      if (++slicedBytes < 524_288) continue;
      slicedBytes = 0;
      await yieldWork();
      signal.throwIfAborted();
      if (!current()) throw new Error("Publication review changed");
    }
    const local = new Uint8Array(30 + name.length), central = new Uint8Array(46 + name.length);
    const data = new DataView(local.buffer), entry = new DataView(central.buffer);
    data.setUint32(0, 0x04034b50, true);
    data.setUint16(4, 20, true);
    data.setUint16(12, 0x21, true);
    data.setUint32(14, (crc ^ 0xffffffff) >>> 0, true);
    data.setUint32(18, bytes.length, true);
    data.setUint32(22, bytes.length, true);
    data.setUint16(26, name.length, true);
    local.set(name, 30);
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(4, 20, true);
    central.set(local.subarray(4, 28), 6);
    entry.setUint32(42, offset, true);
    central.set(name, 46);
    directory.push(central);
    directorySize += central.length;
    parts.push(local, bytes);
    offset += local.length + bytes.length;
  }
  if (!names.has("publication.json") || !names.has("index.html")) throw new Error("Incomplete publication archive");
  if (offset + directorySize + 22 > PUBLICATION_MAX_BYTES) throw new Error("Publication archive exceeds byte limit");
  const end = new Uint8Array(22), footer = new DataView(end.buffer);
  footer.setUint32(0, 0x06054b50, true);
  footer.setUint16(8, files.length, true);
  footer.setUint16(10, files.length, true);
  footer.setUint32(12, directorySize, true);
  footer.setUint32(16, offset, true);
  return parts.concat(directory, end);
}
