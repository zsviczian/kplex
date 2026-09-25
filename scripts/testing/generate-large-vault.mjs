import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SEED_ROOT = join(PROJECT_ROOT, "tests/fixtures/excalibrain-indexing/Vault");
const MARKER = "kplex-synthetic-large-vault";
const VERSION = 2;
const OFFSETS = [1, 7, 31, 127, 997];
const ROLES = ["Parent", "Child", "Friend", "opposes", "Next"];
const LARGE_NOTE_BYTES = 950_000;
const LARGE_FILE_FRACTION = 0.1;
const LARGE_LINK_PAIRS = 100;

function walkMarkdown(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walkMarkdown(path) : entry.isFile() && path.endsWith(".md") ? [path] : [];
  }).sort();
}

function nodeName(index) {
  return `Scale-${String(index).padStart(6, "0")}`;
}

function nodePath(index) {
  return `Nodes/${String(Math.floor(index / 100)).padStart(3, "0")}/${nodeName(index)}.md`;
}

function target(index, offset, count) {
  return nodeName((index + offset) % count);
}

function renderLegacyNode(index, count) {
  const name = nodeName(index);
  const relations = ROLES.map((role, position) => `${role}: "[[${target(index, OFFSETS[position], count)}]]"`);
  const group = String(Math.floor(index / 100)).padStart(3, "0");
  const paragraphs = [
    `# ${name}`,
    "",
    `Synthetic K-Plex scale note ${index}. This file models the frontmatter ontology, aliases, hierarchical tags and Markdown links used by the compatibility fixture.`,
    "",
    `Ordinary link to [[${target(index, 1709, count)}|another scale note]] for inferred-link parsing.`,
  ];
  if (index % 10 === 0) paragraphs.push("", `Previous:: [[${target(index, 2111, count)}]]`);
  if (index % 100 === 0) paragraphs.push("", `External reference: [Scale source](https://example.com/kplex-scale/${name}).`);
  return [
    "---",
    "aliases:",
    `  - Synthetic alias ${String(index).padStart(6, "0")}`,
    "tags:",
    "  - scale",
    `  - scale/group/${group}`,
    `Note type: "#${index % 5 === 0 ? "project" : "person"}"`,
    ...relations,
    "---",
    ...paragraphs,
    "",
  ].join("\n");
}

function hubIndices(count) {
  return [0, 1, 2, 3].map((slot) => Math.floor(slot * count / 4));
}

function sharedUrl(index, offset = 0) {
  return `https://example.com/kplex-scale/shared/${String((index + offset) % 48).padStart(2, "0")}`;
}

export function renderNode(index, count) {
  const hubs = hubIndices(count);
  const hubLinks = hubs.map((hub, position) => `[[${nodeName(hub)}|Hub ${position + 1}]]`).join(" · ");
  const urls = [0, 13, 29].map((offset, position) => `[Shared URL ${position + 1}](${sharedUrl(index, offset)})`).join(" · ");
  return `${renderLegacyNode(index, count)}\nShared note hubs: ${hubLinks}.\nShared web resources: ${urls}.\n`;
}

function repeatedAscii(pattern, length) {
  return pattern.repeat(Math.ceil(length / pattern.length)).slice(0, length);
}

export function renderLargeNode(index, count, targetBytes = LARGE_NOTE_BYTES) {
  const realLinks = Array.from({ length: LARGE_LINK_PAIRS }, (_, position) => {
    const targetIndex = (index + position * 127 + 17) % count;
    return `- [[${nodeName(targetIndex)}|Related note ${position}]] and [shared resource](${sharedUrl(index, position)})`;
  }).join("\n");
  const sections = [
    renderNode(index, count),
    "\n## Very long paragraph\n",
    repeatedAscii(`Long prose for ${nodeName(index)}. This plain text stresses scanning a single long Markdown paragraph without adding relationships. `, 430_000),
    "\n\n## Large fenced code block\n~~~json\n",
    repeatedAscii(`{"synthetic":"[[${nodeName(index)}]]","ignoredUrl":"${sharedUrl(index)}","payload":"code only"} `, 330_000),
    "\n~~~\n\n## Dense real links\n",
    realLinks,
    "\n\n## Long closing paragraph\n",
  ];
  const prefix = sections.join("");
  if (Buffer.byteLength(prefix) > targetBytes - 2) throw new Error("Large-note structure exceeds its target size");
  // Padding content is ASCII; the final newline makes the exact byte count deterministic.
  return `${prefix}${repeatedAscii(`Closing prose for ${nodeName(index)}. `, targetBytes - Buffer.byteLength(prefix) - 1)}\n`;
}

function largeNoteIndices(count, referenceCount) {
  const largeCount = Math.round((count + referenceCount) * LARGE_FILE_FRACTION);
  return new Set(Array.from({ length: largeCount }, (_, slot) => Math.floor((slot + 0.5) * count / largeCount)));
}

function updateDigest(hash, path, bytes) {
  hash.update(path).update("\0").update(bytes).update("\0");
}

function expectedPaths(count) {
  const generated = Array.from({ length: count }, (_, index) => nodePath(index));
  const seed = walkMarkdown(SEED_ROOT).map((path) => `Reference/${relative(SEED_ROOT, path).split(sep).join("/")}`);
  return { generated, seed, all: [...generated, ...seed].sort() };
}

function assertOutputPath(output) {
  if (!output || !isAbsolute(output)) throw new Error("Provide an absolute output directory; no default vault is used");
  if (output === "/" || output === dirname(output)) throw new Error("Refusing a filesystem root");
}

export function generateLargeVault(output, count = 20_000) {
  assertOutputPath(output);
  if (!Number.isSafeInteger(count) || count < 10 || count > 100_000) throw new Error("--files must be an integer from 10 to 100000");
  if (existsSync(output)) throw new Error(`Output already exists; refusing to overwrite: ${output}`);
  const paths = expectedPaths(count);
  const largeIndices = largeNoteIndices(count, paths.seed.length);
  const hash = createHash("sha256");
  let markdownBytes = 0;
  let largeMarkdownBytes = 0;
  mkdirSync(output, { recursive: true });
  for (let index = 0; index < count; index += 1) {
    const relativePath = nodePath(index);
    const path = join(output, relativePath);
    const content = largeIndices.has(index) ? renderLargeNode(index, count) : renderNode(index, count);
    const bytes = Buffer.from(content);
    if (largeIndices.has(index) && bytes.length !== LARGE_NOTE_BYTES) throw new Error(`Large note has unexpected size: ${relativePath}`);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, bytes);
    updateDigest(hash, relativePath, bytes);
    markdownBytes += bytes.length;
    if (largeIndices.has(index)) largeMarkdownBytes += bytes.length;
  }
  for (const path of walkMarkdown(SEED_ROOT)) {
    const relativePath = `Reference/${relative(SEED_ROOT, path).split(sep).join("/")}`;
    const destination = join(output, relativePath);
    const bytes = readFileSync(path);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, bytes);
    updateDigest(hash, relativePath, bytes);
    markdownBytes += bytes.length;
  }
  const manifest = {
    kind: MARKER,
    version: VERSION,
    generator: "scripts/testing/generate-large-vault.mjs",
    sourceFixture: "tests/fixtures/excalibrain-indexing/Vault",
    syntheticNotes: count,
    referenceNotes: paths.seed.length,
    markdownFiles: paths.all.length,
    largeMarkdownFiles: largeIndices.size,
    largeFileFraction: largeIndices.size / paths.all.length,
    largeTargetBytes: LARGE_NOTE_BYTES,
    markdownBytes,
    largeMarkdownBytes,
    ordinaryHubLinks: count * hubIndices(count).length,
    ordinarySharedUrlLinks: count * 3,
    largeAdditionalNoteLinks: largeIndices.size * LARGE_LINK_PAIRS,
    largeAdditionalUrlLinks: largeIndices.size * LARGE_LINK_PAIRS,
    explicitRelationshipDeclarations: count * ROLES.length,
    additionalInlineDeclarations: Math.ceil(count / 10),
    contentSha256: hash.digest("hex"),
  };
  writeFileSync(join(output, "fixture-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export function verifyLargeVault(output) {
  assertOutputPath(output);
  const root = realpathSync(output);
  const manifest = JSON.parse(readFileSync(join(root, "fixture-manifest.json"), "utf8"));
  if (manifest.kind !== MARKER || (manifest.version !== 1 && manifest.version !== VERSION)) throw new Error("Not a supported K-Plex synthetic fixture");
  if (!Number.isSafeInteger(manifest.syntheticNotes) || manifest.syntheticNotes < 10 || manifest.syntheticNotes > 100_000) throw new Error("Invalid synthetic note count");
  const paths = expectedPaths(manifest.syntheticNotes);
  const actual = walkMarkdown(root).map((path) => relative(root, path).split(sep).join("/"));
  if (JSON.stringify(actual) !== JSON.stringify(paths.all)) throw new Error("Markdown file inventory differs from the fixture manifest");
  if (manifest.markdownFiles !== paths.all.length || manifest.referenceNotes !== paths.seed.length || manifest.explicitRelationshipDeclarations !== manifest.syntheticNotes * ROLES.length) throw new Error("Fixture counts differ from the manifest");
  const largeIndices = manifest.version === VERSION ? largeNoteIndices(manifest.syntheticNotes, paths.seed.length) : new Set();
  const hash = createHash("sha256");
  let markdownBytes = 0;
  let largeMarkdownBytes = 0;
  for (let index = 0; index < manifest.syntheticNotes; index += 1) {
    const relativePath = nodePath(index);
    const actualBytes = readFileSync(join(root, relativePath));
    const expected = manifest.version === 1 ? renderLegacyNode(index, manifest.syntheticNotes)
      : largeIndices.has(index) ? renderLargeNode(index, manifest.syntheticNotes) : renderNode(index, manifest.syntheticNotes);
    if (!actualBytes.equals(Buffer.from(expected))) throw new Error(`Synthetic note differs: ${relativePath}`);
    if (largeIndices.has(index) && actualBytes.length !== LARGE_NOTE_BYTES) throw new Error(`Large note has unexpected size: ${relativePath}`);
    updateDigest(hash, relativePath, actualBytes);
    markdownBytes += actualBytes.length;
    if (largeIndices.has(index)) largeMarkdownBytes += actualBytes.length;
  }
  for (const path of paths.seed) {
    const original = join(SEED_ROOT, path.slice("Reference/".length));
    const actualBytes = readFileSync(join(root, path));
    if (!actualBytes.equals(readFileSync(original))) throw new Error(`Reference fixture differs: ${path}`);
    updateDigest(hash, path, actualBytes);
    markdownBytes += actualBytes.length;
  }
  if (hash.digest("hex") !== manifest.contentSha256) throw new Error("Fixture content SHA-256 differs from the manifest");
  if (manifest.version === VERSION && (
    manifest.largeMarkdownFiles !== largeIndices.size ||
    manifest.largeFileFraction !== largeIndices.size / paths.all.length ||
    manifest.largeTargetBytes !== LARGE_NOTE_BYTES ||
    manifest.markdownBytes !== markdownBytes ||
    manifest.largeMarkdownBytes !== largeMarkdownBytes ||
    manifest.ordinaryHubLinks !== manifest.syntheticNotes * hubIndices(manifest.syntheticNotes).length ||
    manifest.ordinarySharedUrlLinks !== manifest.syntheticNotes * 3 ||
    manifest.largeAdditionalNoteLinks !== largeIndices.size * LARGE_LINK_PAIRS ||
    manifest.largeAdditionalUrlLinks !== largeIndices.size * LARGE_LINK_PAIRS
  )) throw new Error("Large-file or link counts differ from the manifest");
  return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const value = (flag) => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
    const output = value("--out") ?? value("--verify");
    const manifest = args.includes("--verify") ? verifyLargeVault(output) : generateLargeVault(output, value("--files") === undefined ? 20_000 : Number(value("--files")));
    console.log(`${args.includes("--verify") ? "Verified" : "Generated"} ${output}: ${manifest.markdownFiles} Markdown files, ${manifest.largeMarkdownFiles ?? 0} near-1MB files, ${manifest.explicitRelationshipDeclarations} explicit declarations, SHA-256 ${manifest.contentSha256}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
