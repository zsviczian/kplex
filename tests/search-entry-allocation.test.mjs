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
buildSync({ stdin: { resolveDir: process.cwd(), contents: 'export * from "./src/index/GraphIndex"; export * from "./src/ui/features/searchResultPresentation";' }, outfile: output, bundle: true,
  platform: "node", format: "cjs", external: ["obsidian"] });
const { GraphIndex, searchResultIconName } = createRequire(import.meta.url)(output);

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

/** Search icons refine explicit file/type facets and never infer semantic kind from an opaque ID. */
test("Find selects native type icons including common attachment subtypes", () => {
  for (const [kind, extension, expected] of [
    ["document", "md", "file-text"], ["container", undefined, "folder"], ["tag", undefined, "tags"],
    ["url", undefined, "globe"], ["unresolved", undefined, "file-question"],
    ["attachment", "PNG", "image"], ["attachment", "mp4", "video"], ["attachment", "mp3", "audio-lines"],
    ["attachment", "pdf", "file-text"], ["attachment", "canvas", "layout-dashboard"], ["attachment", "zip", "paperclip"],
    ["attachment", undefined, "paperclip"],
  ]) assert.equal(searchResultIconName({ kind, file: extension ? { extension } : undefined }), expected);
  assert.equal(searchResultIconName({ kind: "document", file: { extension: "png" } }), "file-text", "Extension does not override semantic type");
});

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

/** Search-only fixture: production ranking receives normalized vocabulary and exact native lookup ports. */
function searchFixture(entries) {
  const index = Object.create(GraphIndex.prototype);
  const pages = new Map(entries.map(entry => [entry.page.path, entry.page]));
  let lookups = 0;
  Object.assign(index, {plugin: {settings: {pinnedNodes: []}}, searchEntryPointPaths: [], searchCandidateCache: new Map(),
    retiredHostTagPaths: new Set(), effectiveSearchEntries: () => entries,
    app: {vault: {getFileByPath: path => {lookups++; return pages.get(path)?.file ?? null;}}},
    get: path => {lookups++; return pages.get(path);}, currentSearchFolder: () => true, isVisiblePage: () => true});
  return {index, pages, lookups: () => lookups};
}

/** Independent reference retains the previous character scan and stable full-sort result ordering. */
function referenceScore(text, query) {
  if (!query || text === query) return 0;
  if (text.startsWith(query)) return 20 + Math.min(80, text.length - query.length);
  const at = text.indexOf(query);
  if (at >= 0) return 120 + at * 4 + Math.min(120, text.length - query.length);
  let cursor = 0, first = -1, previous = -1, gaps = 0, boundaries = 0;
  for (let i = 0; i < text.length && cursor < query.length; i++) {
    if (text[i] !== query[cursor]) continue;
    if (first < 0) first = i;
    if (previous >= 0) gaps += Math.max(0, i - previous - 1);
    if (i === 0 || /[\s_\-/.]/.test(text[i - 1])) boundaries += 8;
    previous = i;cursor++;
  }
  return cursor === query.length ? 1000 + first * 5 + gaps * 12 + Math.max(0, text.length - query.length) - boundaries : null;
}

test('100k search entries retain complete prefix candidates but bound native eligibility to winning hits', () => {
  const entries = Array.from({length: 100_000}, (_, n) => {
    const path = `Notes/Entry-${n}.md`, file = {path};
    return {page: {path, file, name: 'Entry', aliases: []}, name: 'entry', aliases: [], path: path.toLowerCase()};
  });
  const f = searchFixture(entries), started = performance.now();
  assert.equal(f.index.search('entry', 24, 'vault').length, 24);
  assert.equal(f.lookups(), 24, 'Tied/worse matches never perform native lookups after the top 24 fill');
  assert.equal(f.index.searchCandidateCache.get('vault:entry').length, 100_000, 'Prefix narrowing must not truncate the searchable vocabulary');
  assert.deepEqual(f.index.search('entry-99999', 24, 'vault').map(page => page.path), ['Notes/Entry-99999.md']);
  console.log(JSON.stringify({searchEntries: entries.length, queryPairMs: performance.now() - started, nativeLookups: f.lookups()}));
});

test('optimized fuzzy ranking preserves aliases, paths, UTF-16 matching, stale identities and stable ties', () => {
  const names = ['Alpha', 'Alpha beta', 'beta Alpha', 'A long prefix path', 'A_B_C', 'Müller', '東京', '🧠Map', 'alpha.md'];
  const entries = Array.from({length: 1200}, (_, n) => {
    const name = names[n % names.length], path = `Archive/${n}/${name}.md`;
    const aliases = n % 5 === 0 ? ['First alias', 'ABC', 'Alpha'] : [];
    return {page: {path, file: {path}, name, aliases}, name: name.toLowerCase(), aliases: aliases.map(alias => alias.toLowerCase()), path: path.toLowerCase()};
  });
  const f = searchFixture(entries);for (let n = 0; n < 1200; n += 31) f.pages.delete(entries[n].page.path);
  for (const query of ['a', 'al', 'alp', 'alpha', 'abc', 'f a', 'archiv', 'ar99', 'mü', '東京', '🧠m', '\ud83e', 'no match']) {
    const expected = entries.map(entry => {
      const scores = [[entry.name, 0], ...entry.aliases.map(alias => [alias, 8]), [entry.path, 240]]
        .map(([text, weight]) => {const score = referenceScore(text, query);return score === null ? Infinity : score + weight;});
      return {page: entry.page, score: Math.min(...scores)};
    }).filter(row => Number.isFinite(row.score) && f.pages.has(row.page.path)).sort((a, b) => a.score - b.score).slice(0, 24).map(row => row.page.path);
    assert.deepEqual(f.index.search(query, 24, 'vault').map(page => page.path), expected, query);
  }
});
