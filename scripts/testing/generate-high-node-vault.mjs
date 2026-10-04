/**
 * Deterministic SI5 high-node/high-degree disposable vault fixture. Twenty thousand real notes
 * declare eighty thousand distinct placeholders and eight thousand URLs, with 259,000 source
 * link occurrences and a shared hub. Counts describe fixture input, never host graph/evidence
 * acceptance. Generation refuses existing output; verification compares every byte and inventory.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const KIND = "kplex-synthetic-high-node-vault";

/** Give real notes a stable, unique basename independent of operating-system enumeration. */
function noteName(index) { return `High-${String(index).padStart(6, "0")}`; }

/** Give each owner four disjoint unresolved targets, reused by its YAML/body declarations. */
function missingName(index, slot) { return `Missing-${String(index).padStart(6, "0")}-${slot}`; }

/** Validate explicit bounded fixture ownership before reading or creating any files. */
function assertTarget(output, count) {
  if (!output || !isAbsolute(output) || resolve(output) === "/") throw new Error("Provide an absolute non-root output directory");
  if (!Number.isSafeInteger(count) || count < 10 || count > 100_000) throw new Error("--files must be an integer from 10 to 100000");
}

/** Render link-bearing dormant fields, duplicate provenance, unique targets and shared-hub fan-in. */
export function renderHighNodeNote(index, count) {
  const ghosts = Array.from({ length: 4 }, /** Keep each source's unresolved namespace disjoint. */ (_, slot) => missingName(index, slot));
  const next = noteName((index + 1) % count), after = noteName((index + 7) % count);
  const hub = noteName(index === 0 ? 1 : 0);
  const yaml = ghosts.map(/** Spread dormant fields over 128 distinct property names. */ (ghost, slot) => `Dense dormant ${index % 32}-${slot}: "[[${ghost}]]"`);
  const body = [...ghosts, next, after, hub].map(/** Preserve separate body occurrences, including mirrored YAML targets. */ (name) => `[[${name}]]`).join(" · ");
  return ["---", `aliases: [High alias ${index}]`, `Parent: "[[${next}]]"`, ...yaml, "---",
    `# ${noteName(index)}`, "", body,
    ...(index < Math.round(count * 0.4) ? [`[High URL ${index}](https://example.com/kplex-high-node/${index})`] : []),
    ...(index < Math.round(count * 0.55) ? [`Dense inline ${index % 32}:: [[${ghosts[index % 4]}]]`] : []), ""].join("\n");
}

/** Hash paths and bytes with separators so deterministic fixture identity includes file placement. */
function addDigest(hash, path, content) { hash.update(path).update("\0").update(content).update("\0"); }

/** Describe known source occurrences separately from the graph/evidence counts measured in Obsidian. */
function counts(count) {
  const urls = Math.round(count * 0.4), inline = Math.round(count * 0.55);
  return { markdownFiles: count, distinctPlaceholderTargets: count * 4, distinctUrlTargets: urls,
    expectedDocumentPlaceholderUrlNodes: count * 5 + urls,
    sourceLinkOccurrences: count * 12 + urls + inline,
    dormantPropertyNames: Math.min(count, 32) * 4 + Math.min(inline, 32),
    hubIncomingSources: count - 1 };
}

/** Generate a new owned fixture only; never overwrite an existing vault or seed host caches. */
export function generateHighNodeVault(output, count = 20_000) {
  assertTarget(output, count);
  if (existsSync(output)) throw new Error(`Output already exists; refusing to overwrite: ${output}`);
  mkdirSync(join(output, "Nodes"), { recursive: true });
  const hash = createHash("sha256");
  let markdownBytes = 0;
  for (let index = 0; index < count; index += 1) {
    const path = `Nodes/${noteName(index)}.md`, content = renderHighNodeNote(index, count);
    writeFileSync(join(output, path), content); addDigest(hash, path, content);
    markdownBytes += Buffer.byteLength(content);
  }
  const manifest = { kind: KIND, version: 1, generator: "scripts/testing/generate-high-node-vault.mjs",
    ...counts(count), markdownBytes, contentSha256: hash.digest("hex"),
    countSemantics: "Source input counts; measured graph nodes/evidence may include structural nodes and host cache mirrors." };
  writeFileSync(join(output, "fixture-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}

/** Verify exact inventory, source bytes and every derived manifest count before using a fixture. */
export function verifyHighNodeVault(output) {
  assertTarget(output, 20_000);
  const manifest = JSON.parse(readFileSync(join(output, "fixture-manifest.json"), "utf8"));
  assertTarget(output, manifest.markdownFiles);
  if (manifest.kind !== KIND || manifest.version !== 1) throw new Error("Not a supported high-node fixture");
  const expectedPaths = Array.from({ length: manifest.markdownFiles }, /** Reconstruct exactly the generated basename inventory. */ (_, index) => noteName(index) + ".md");
  const rootEntries = readdirSync(output).sort();
  if (JSON.stringify(rootEntries) !== JSON.stringify(["Nodes", "fixture-manifest.json"]) ||
    JSON.stringify(readdirSync(join(output, "Nodes")).sort()) !== JSON.stringify(expectedPaths)) throw new Error("Fixture inventory differs");
  const hash = createHash("sha256"); let markdownBytes = 0;
  for (let index = 0; index < manifest.markdownFiles; index += 1) {
    const path = `Nodes/${expectedPaths[index]}`, content = readFileSync(join(output, path));
    if (!content.equals(Buffer.from(renderHighNodeNote(index, manifest.markdownFiles)))) throw new Error(`Fixture note differs: ${path}`);
    addDigest(hash, path, content); markdownBytes += content.length;
  }
  const expected = { ...counts(manifest.markdownFiles), markdownBytes, contentSha256: hash.digest("hex") };
  for (const [key, value] of Object.entries(expected)) if (manifest[key] !== value) throw new Error(`Fixture manifest differs: ${key}`);
  return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    /** Read one explicit CLI option; generation never defaults to a user vault. */
    const value = flag => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
    const manifest = args.includes("--verify") ? verifyHighNodeVault(value("--verify"))
      : generateHighNodeVault(value("--out"), value("--files") === undefined ? 20_000 : Number(value("--files")));
    console.log(JSON.stringify(manifest));
  } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
