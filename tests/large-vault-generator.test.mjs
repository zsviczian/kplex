/** Validate disposable scale fixture identity, bounded generation and corruption detection. */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { generateHighNodeVault, renderHighNodeNote, verifyHighNodeVault } from "../scripts/testing/generate-high-node-vault.mjs";
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

/** Verify the high-node workload independently of host runtime node/evidence measurements. */
test("high-node fixture has disjoint ghosts, dense dormant provenance and stable verified bytes", () => {
  const root = mkdtempSync(join(tmpdir(), "kplex-high-node-fixture-test-"));
  try {
    const first = join(root, "first"), second = join(root, "second");
    const manifest = generateHighNodeVault(first, 20);
    assert.equal(manifest.distinctPlaceholderTargets, 80);
    assert.equal(manifest.distinctUrlTargets, 8);
    assert.equal(manifest.expectedDocumentPlaceholderUrlNodes, 108);
    assert.equal(manifest.sourceLinkOccurrences, 259);
    assert.equal(manifest.hubIncomingSources, 19);
    assert.equal(manifest.contentSha256, generateHighNodeVault(second, 20).contentSha256);
    assert.deepEqual(verifyHighNodeVault(first), manifest);
    const note = readFileSync(join(first, "Nodes/High-000003.md"), "utf8");
    assert.equal(note, renderHighNodeNote(3, 20));
    assert(note.includes('Dense dormant 3-0: "[[Missing-000003-0]]"'));
    assert(note.includes("Dense inline 3:: [[Missing-000003-3]]"));
    assert(note.includes("[[High-000000]]"));
    assert.throws(() => generateHighNodeVault(first, 20), /refusing to overwrite/);
    const path = join(first, "fixture-manifest.json");
    writeFileSync(path, JSON.stringify({ ...manifest, sourceLinkOccurrences: 0 }));
    assert.throws(() => verifyHighNodeVault(first), /Fixture manifest differs/);
    writeFileSync(path, JSON.stringify(manifest));
    writeFileSync(join(first, "Nodes/High-000003.md"), note + "changed");
    assert.throws(() => verifyHighNodeVault(first), /Fixture note differs/);
    assert.throws(() => generateHighNodeVault("relative/output", 20), /absolute/);
    assert.throws(() => generateHighNodeVault(join(root, "invalid"), 9), /integer/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
