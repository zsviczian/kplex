import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = mkdtempSync(join(tmpdir(), "kplex-core-contracts-"));
process.on("exit", () => rmSync(dir, { recursive: true, force: true }));
const modelPath = join(dir, "model.mjs");
const adapterPath = join(dir, "adapter.mjs");
await build({ entryPoints: [join(root, "src/core/graph/model.ts")], outfile: modelPath, bundle: true, platform: "node", format: "esm", target: "es2021" });
await build({ entryPoints: [join(root, "src/adapters/obsidian/graphContracts.ts")], outfile: adapterPath, bundle: true, platform: "node", format: "esm", target: "es2021" });
const { graphNodeViewFromLegacy, semanticIndexSettingsFromLegacy } = await import(pathToFileURL(adapterPath).href);

function page(overrides = {}) {
  return {
    path: "entity:alpha", name: "Unrelated display label", file: null, url: null,
    isFolder: false, isTag: false, mtime: null, neighbours: new Map(),
    aliases: ["Alias"], tags: ["#tag"], noteType: "Concept", primaryStyleTag: "#tag",
    styleTags: ["#tag"], maxLabelLength: 30, ...overrides,
  };
}

// Use a fresh Node process in a directory with no Obsidian module or window shim. A previous
// fixture's global host double must not make these runtime identity checks appear portable.
test("opaque IDs run in a clean process and preserve case, pathless and unrelated values", () => {
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", `
    import assert from "node:assert/strict";
    import { nodeId } from ${JSON.stringify(pathToFileURL(modelPath).href)};
    assert.equal(typeof globalThis.window, "undefined");
    for (const id of ["entity:alpha", "NOT A PATH", "Case:Node", "case:node", "folder:opaque"])
      assert.equal(nodeId(id), id);
    assert.notEqual(nodeId("Case:Node"), nodeId("case:node"));
  `], { cwd: dir, encoding: "utf8" });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("legacy mapper covers every node kind without deriving kind from an opaque ID", () => {
  const file = { name: "Note.md", extension: "md", path: "actual/Note.md", stat: { mtime: 99 } };
  const cases = [
    [page({ path: "url:opaque", file, mtime: 42 }), "document", "resolved"],
    [page({ path: "folder:opaque", file: { ...file, name: "image.png", extension: "png" } }), "attachment", "resolved"],
    [page({ file: { ...file, name: "Note.MD", extension: "MD" } }), "attachment", "resolved"],
    [page({ path: "entity:container", isFolder: true }), "container", "resolved"],
    [page({ path: "entity:tag", isTag: true }), "tag", "resolved"],
    [page({ path: "entity:web", url: "https://example.com" }), "url", "resolved"],
    [page({ path: "note.md" }), "unresolved", "unresolved"],
  ];
  for (const [legacy, kind, resolution] of cases) {
    const view = graphNodeViewFromLegacy(legacy);
    assert.equal(view.id, legacy.path);
    assert.equal(view.kind, kind);
    assert.equal(view.resolution, resolution);
    assert.equal(view.name, legacy.name);
    assert.equal(view.url, legacy.url);
    assert.equal(view.aliases, legacy.aliases, "bounded view should not clone each metadata array");
    assert.equal(view.tags, legacy.tags);
    assert.equal(view.styleTags, legacy.styleTags);
    assert.equal(view.noteType, legacy.noteType);
    assert.equal(view.primaryStyleTag, legacy.primaryStyleTag);
    assert.equal(view.maxLabelLength, legacy.maxLabelLength);
    assert.equal("neighbours" in view, false);
    assert.equal("isFolder" in view, false);
    if (legacy.file) {
      assert.deepEqual(view.file, { name: legacy.file.name, extension: legacy.file.extension, path: legacy.file.path, mtime: legacy.mtime });
      assert.notEqual(view.file, legacy.file);
      assert.equal("stat" in view.file, false);
    } else assert.equal("file" in view, false);
  }
  assert.notEqual(graphNodeViewFromLegacy(page({ path: "Case:Node" })).id,
    graphNodeViewFromLegacy(page({ path: "case:node" })).id);
});

test("semantic settings mapper preserves legacy values and excludes unrelated host/UI settings", () => {
  const settings = {
    hierarchy: { hidden: [], parents: ["Parent"], children: [], leftFriends: [], rightFriends: [], previous: [], next: [], exclusions: [], friends: ["Legacy"] },
    inferAllLinksAsFriends: false, inverseInfer: true, excalibrainFilepath: "legacy.md",
    showFullTagName: false, noteTypeField: "Note type", primaryTagField: "Tag",
    tagStyleList: ["#tag"], baseNodeStyle: {}, showFolderNodes: false,
    graphLenses: [{ id: "host-only" }], futureSetting: { keep: true },
  };
  const before = structuredClone(settings);
  const view = semanticIndexSettingsFromLegacy(settings);
  assert.deepEqual(view, {
    hierarchy: settings.hierarchy, inferAllLinksAsFriends: false, inverseInfer: true,
    excalibrainFilepath: "legacy.md", showFullTagName: false, noteTypeField: "Note type",
    primaryTagField: "Tag", tagStyleList: settings.tagStyleList, maxLabelLength: 30,
  });
  assert.equal(view.hierarchy, settings.hierarchy);
  assert.equal(view.tagStyleList, settings.tagStyleList);
  assert.deepEqual(settings, before, "mapping must not sanitize/mutate persisted settings");
  assert.equal(semanticIndexSettingsFromLegacy({ ...settings, baseNodeStyle: { maxLabelLength: 0 } }).maxLabelLength, 0);
});
