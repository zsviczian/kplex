/** Validates the independently built files copied into a static publication. */

export const RUNTIME_PACK_MAX_BYTES = 16 * 1024 * 1024;

const requiredFiles = [
  "runtime/demo.js", "runtime/compass.js", "runtime/compass.css",
  "LICENSES/K-Plex.txt", "LICENSES/React.txt", "LICENSES/ReactDOM.txt", "LICENSES/Scheduler.txt", "LICENSES/Source.txt",
];

const runtimePath = /^runtime\/(?:compass\.css|(?:compass|demo|chunk(?:-[a-zA-Z0-9]+)?)\.js(?:\.LEGAL\.txt)?)$/;
const releaseVersion = /^\d+\.\d+\.\d+$/;
const sha256 = /^[0-9a-f]{64}$/;

export type RuntimeFile = Readonly<{path: string; bytes: number; sha256: string; text: string}>;
export type RuntimePack = Readonly<{schema: 1; version: string; files: readonly RuntimeFile[]}>;
export type PublicationDigest = (bytes: Uint8Array<ArrayBuffer>) => Promise<string>;
type PackFailure = "format" | "version" | "limit" | "integrity";

export class RuntimePackError extends Error {
  readonly reason: PackFailure;

  /** Keep file content and paths out of author-facing validation errors. */
  constructor(reason: PackFailure) {
    super(reason);
    this.reason = reason;
  }
}

/** Reject malformed, oversized, incompatible, duplicate or incomplete local runtime packs. */
export async function readRuntimePack(raw: unknown, expectedVersion: string, digest: PublicationDigest, signal?: AbortSignal): Promise<RuntimePack> {
  if (!raw || typeof raw !== "object" || !("schema" in raw) || raw.schema !== 1
    || !("version" in raw) || typeof raw.version !== "string" || !releaseVersion.test(raw.version)
    || !("files" in raw) || !Array.isArray(raw.files)) throw new RuntimePackError("format");
  if (raw.version !== expectedVersion) throw new RuntimePackError("version");
  if (raw.files.length > 40) throw new RuntimePackError("limit");
  const encoder = new TextEncoder(), names = new Set<string>(), paths = new Set<string>(), files: RuntimeFile[] = [];
  let total = 0;
  for (const input of raw.files as unknown[]) {
    signal?.throwIfAborted();
    if (!input || typeof input !== "object" || !("path" in input) || typeof input.path !== "string"
      || !("text" in input) || typeof input.text !== "string" || !("bytes" in input) || !Number.isSafeInteger(input.bytes)
      || !("sha256" in input) || typeof input.sha256 !== "string" || !sha256.test(input.sha256)) throw new RuntimePackError("format");
    const {path, text} = input;
    const folded = path.toLowerCase();
    if ((!runtimePath.test(path) && !requiredFiles.includes(path)) || names.has(folded)) throw new RuntimePackError("format");
    if (text.length > RUNTIME_PACK_MAX_BYTES) throw new RuntimePackError("limit");
    const bytes = encoder.encode(text);
    total += bytes.byteLength;
    if (total > RUNTIME_PACK_MAX_BYTES) throw new RuntimePackError("limit");
    if (!bytes.byteLength || input.bytes !== bytes.byteLength || await digest(bytes) !== input.sha256) throw new RuntimePackError("integrity");
    names.add(folded);
    paths.add(path);
    files.push({path, text, bytes: bytes.byteLength, sha256: input.sha256});
  }
  if (!requiredFiles.every(path => paths.has(path))) throw new RuntimePackError("format");
  signal?.throwIfAborted();
  return {schema: 1, version: raw.version, files: files.sort((left, right) => left.path < right.path ? -1 : Number(left.path > right.path))};
}

/** Bootstrap a publication from the same page at any static hosting base path. */
export const publicationShell = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob:; media-src 'self' blob:; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'">
  <title>K-Plex</title>
  <link rel="stylesheet" href="./runtime/compass.css">
</head>
<body class="kplex-publication-demo">
  <div data-kplex-demo></div>
  <script type="module" src="./runtime/demo.js"></script>
</body>
</html>
`;
