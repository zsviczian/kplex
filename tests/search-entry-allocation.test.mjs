/**
 * Compare bundled production search entries with the previous independent vocabulary algorithm.
 * Dense URL publication must avoid ordinary title-cache work while retaining canonical pages,
 * ordered case-sensitive alias deduplication, explicit overrides and native note display fields.
 */
import assert from "node:assert/strict";
import { buildSync } from "esbuild";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const directory = mkdtempSync(join(tmpdir(), "kplex-search-entry-"));
process.once("exit", () => rmSync(directory, { recursive: true, force: true }));
const obsidianDirectory = join(directory, "node_modules", "obsidian");
mkdirSync(obsidianDirectory, { recursive: true });
writeFileSync(join(obsidianDirectory, "index.js"), `
module.exports = { Platform: { isMobile: false, isIosApp: false }, TFile: class {}, TFolder: class {}, normalizePath: path => path };
`);
const output = join(directory, "graph-index.cjs");
buildSync({ entryPoints: ["src/index/GraphIndex.ts"], outfile: output, bundle: true,
  platform: "node", format: "cjs", external: ["obsidian"] });
const { GraphIndex } = createRequire(import.meta.url)(output);

/** Instantiate only search/title owners; constructing a live repository would introduce timers and storage. */
function fixture(settings = {}) {
  const index = Object.create(GraphIndex.prototype);
  index.presentationSettings = { renderAlias: true, nameFields: "aliases", nodeTitleScript: "", ...settings };
  index.titleCache = new Map([["unrelated", { signature: "untouched", title: "Untouched" }]]);
  index.app = { metadataCache: { getFileCache: file => file.cache ?? null } };
  let calls = 0;
  index.titleFor = function (page) {
    calls += 1;
    return GraphIndex.prototype.titleFor.call(this, page);
  };
  return { index, calls: () => calls };
}

/** Stable plain pages retain reference identity, and supplied native metadata is consulted only for notes. */
function page(url = "https://Example.test/SomePath", aliases = []) {
  return { path: url ?? "Notes/Mixed Case.md", url, name: "Visible Label", aliases, mtime: 1,
    file: url ? null : { stat: { mtime: 1 }, cache: { frontmatter: { Display: "Configured Title" } } } };
}

/** The prior Set-first vocabulary algorithm, supplied an independently selected title. */
function legacyEntry(page, title, name = page.name, aliases = page.aliases) {
  const alternatives = new Set([name, ...aliases]);
  alternatives.delete(title);
  return { page, name: title.toLowerCase(), aliases: [...alternatives].map(value => value.toLowerCase()),
    path: page.path.toLowerCase() };
}

/** URL labels have no configured note-title interpretation; current versus explicit policy differs for name overrides. */
test("URL search entries match previous vocabulary with aliases and explicit name/policy overrides", () => {
  const f = fixture({ nameFields: "Display" });
  const originalCache = [...f.index.titleCache];
  const aliasInputs = [[], ["Visible Label"], ["First", "first", "First", "Visible Label", "", "Last"],
    ["VISIBLE LABEL", "Visible Label", "visible label"]];
  for (const aliases of aliasInputs) {
    const current = page(undefined, aliases);
    for (const settings of [undefined, f.index.presentationSettings, { ...f.index.presentationSettings, renderAlias: false }]) {
      for (const name of [undefined, "Override", "Visible Label", ""]) {
        const suppliedName = name === undefined ? current.name : name;
        for (const overrideAliases of [undefined, [], ["Override", "override", "Override", "Visible Label", ""]]) {
          const selectedAliases = overrideAliases ?? current.aliases;
          const title = settings ? suppliedName : current.name;
          const actual = f.index.makeSearchEntry(current, settings, name, overrideAliases);
          assert.deepEqual(actual, legacyEntry(current, title, suppliedName, selectedAliases));
          assert.equal(actual.page, current, "Search entries retain the canonical page reference");
        }
      }
    }
  }
  assert.equal(f.calls(), 0, "URL search never invokes the ordinary note title owner");
  assert.deepEqual([...f.index.titleCache], originalCache, "URL vocabulary neither warms nor replaces live title cache entries");
});

/** Ordered exact-case deduplication precedes lowercasing, so case variants remain distinct ranking inputs. */
test("case variants and empty names retain the previous alternate vocabulary", () => {
  const f = fixture();
  const current = page(undefined, ["Alias", "alias", "Alias", "Visible Label", "visible label", "", "Last"]);
  assert.deepEqual(f.index.makeSearchEntry(current).aliases, ["alias", "alias", "visible label", "", "last"]);
  const empty = { ...current, name: "", aliases: [] };
  assert.deepEqual(f.index.makeSearchEntry(empty), legacyEntry(empty, ""));
  assert.deepEqual(f.index.makeSearchEntry(empty, undefined, "Override", []), legacyEntry(empty, "", "Override", []));
});

/** The measured dense shape has distinct URL/origin labels and no aliases; its title-cache cost stays zero by count. */
test("twenty thousand URL and origin entries avoid title-cache population", () => {
  const f = fixture();
  for (let i = 0; i < 10_000; i += 1) {
    for (const path of [`https://perf-${i}.example/path/${i}`, `https://perf-${i}.example`]) {
      const current = { ...page(path), name: path };
      assert.deepEqual(f.index.makeSearchEntry(current), legacyEntry(current, path));
    }
  }
  assert.equal(f.calls(), 0);
  assert.equal(f.index.titleCache.size, 1, "Only the pre-existing unrelated cache entry remains");
});

/** Ordinary notes retain cached alias/field display policy; proposed policy bypasses the current title cache as before. */
test("ordinary note search preserves current title owner and configured proposed-policy fields", () => {
  const f = fixture();
  const current = page(null, ["First Alias", "first alias", "First Alias"]);
  assert.deepEqual(f.index.makeSearchEntry(current), legacyEntry(current, "First Alias"));
  assert.equal(f.calls(), 1);
  assert.equal(f.index.titleCache.get(current.path).title, "First Alias");
  const previousCache = [...f.index.titleCache];
  const explicit = { ...f.index.presentationSettings, nameFields: "Display" };
  assert.deepEqual(f.index.makeSearchEntry(current, explicit, "Proposed Name"),
    legacyEntry(current, "Configured Title", "Proposed Name"));
  assert.equal(f.calls(), 1, "Proposed policy does not read or warm the current note title cache");
  assert.deepEqual([...f.index.titleCache], previousCache);
  const disabled = { ...explicit, renderAlias: false };
  assert.deepEqual(f.index.makeSearchEntry(current, disabled, "Proposed Name", []),
    legacyEntry(current, "Proposed Name", "Proposed Name", []));
  const unnamed = { ...current, name: "", aliases: [] };
  assert.deepEqual(f.index.makeSearchEntry(unnamed, disabled), legacyEntry(unnamed, ""));
});

/** Current note titles come from native fields/page aliases independently of supplied alternate search vocabulary. */
test("current note policies retain known alias, configured-field and fallback titles across overrides", () => {
  for (const [settings, aliases, expectedTitle] of [
    [{}, ["First Alias", "first alias"], "First Alias"],
    [{ renderAlias: false }, ["First Alias"], "Visible Label"],
    [{ nameFields: "Display" }, ["First Alias"], "Configured Title"],
    [{ nameFields: "Unknown, Display" }, [], "Configured Title"],
    [{ nameFields: "Unknown" }, ["First Alias"], "Visible Label"],
    [{}, ["", "  Trimmed Alias  ", "Other"], "Trimmed Alias"],
    [{}, [], "Visible Label"],
  ]) {
    const f = fixture(settings), current = page(null, aliases);
    let expectedCalls = 0;
    for (const name of [undefined, "Override", ""]) {
      for (const selectedAliases of [undefined, [], ["Override", "override", "Override", expectedTitle]]) {
        assert.deepEqual(f.index.makeSearchEntry(current, undefined, name, selectedAliases),
          legacyEntry(current, expectedTitle, name ?? current.name, selectedAliases ?? aliases));
        assert.equal(f.calls(), ++expectedCalls, "Current ordinary-note vocabulary delegates to the established title owner");
      }
    }
  }
});
