import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { generateLargeVault, renderLargeNode, renderNode, verifyLargeVault } from "../scripts/testing/generate-large-vault.mjs";

test("a generated fixture is deterministic, fixture-derived and verifies its inventory", () => {
  const root = mkdtempSync(join(tmpdir(), "kplex-large-fixture-test-"));
  try {
    const first = join(root, "first");
    const second = join(root, "second");
    const manifest = generateLargeVault(first, 13);
    const again = generateLargeVault(second, 13);
    assert.equal(manifest.syntheticNotes, 13);
    assert.equal(manifest.referenceNotes, 13);
    assert.equal(manifest.markdownFiles, 26);
    assert.equal(manifest.largeMarkdownFiles, 3);
    assert.equal(manifest.largeFileFraction, 3 / 26);
    assert.equal(manifest.largeTargetBytes, 950_000);
    assert.equal(manifest.largeMarkdownBytes, 3 * 950_000);
    assert.equal(manifest.ordinaryHubLinks, 13 * 4);
    assert.equal(manifest.ordinarySharedUrlLinks, 13 * 3);
    assert.equal(manifest.largeAdditionalNoteLinks, 3 * 100);
    assert.equal(manifest.largeAdditionalUrlLinks, 3 * 100);
    assert.equal(manifest.explicitRelationshipDeclarations, 65);
    assert.equal(manifest.contentSha256, again.contentSha256);
    assert.deepEqual(verifyLargeVault(first), manifest);
    const note = readFileSync(join(first, "Nodes/000/Scale-000000.md"), "utf8");
    assert.equal(note, renderNode(0, 13));
    assert(note.includes('Parent: "[[Scale-000001]]"'));
    assert(note.includes("Previous::"));
    assert(note.includes("Shared note hubs:"));
    assert(note.includes("Shared web resources:"));
    const large = readFileSync(join(first, "Nodes/000/Scale-000002.md"), "utf8");
    assert.equal(large, renderLargeNode(2, 13));
    assert.equal(Buffer.byteLength(large), 950_000);
    assert(large.includes("## Very long paragraph"));
    assert(large.includes("## Large fenced code block\n~~~json"));
    assert(large.includes("## Dense real links"));
    assert(large.includes("[[Scale-000002]]"));
    assert(large.includes("https://example.com/kplex-scale/shared/"));
    assert(readFileSync(join(first, "Reference/Note A.md"), "utf8").includes("Parent:"));
    assert.throws(() => generateLargeVault(first, 13), /refusing to overwrite/);
    const manifestPath = join(first, "fixture-manifest.json");
    writeFileSync(manifestPath, `${JSON.stringify({ ...manifest, largeMarkdownFiles: 0 })}\n`);
    assert.throws(() => verifyLargeVault(first), /Large-file or link counts differ/);
    writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`);
    writeFileSync(join(first, "Nodes/000/Scale-000000.md"), `${note}changed`);
    assert.throws(() => verifyLargeVault(first), /Synthetic note differs/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("generation requires an explicit absolute output and bounded size", () => {
  assert.throws(() => generateLargeVault("relative/output", 13), /absolute output/);
  assert.throws(() => generateLargeVault("/tmp/unused-kplex-test", 9), /integer from 10/);
});
