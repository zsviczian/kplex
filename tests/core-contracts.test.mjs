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
const predicatePath = join(dir, "predicate.mjs");
const lensPath = join(dir, "lens.mjs");
await build({ entryPoints: [join(root, "src/core/graph/model.ts")], outfile: modelPath, bundle: true, platform: "node", format: "esm", target: "es2021" });
await build({ entryPoints: [join(root, "src/adapters/obsidian/graphContracts.ts")], outfile: adapterPath, bundle: true, platform: "node", format: "esm", target: "es2021" });
await build({ entryPoints: [join(root, "src/core/plex/predicate.ts")], outfile: predicatePath, bundle: true, platform: "node", format: "esm", target: "es2021" });
await build({ entryPoints: [join(root, "src/core/plex/lens.ts")], outfile: lensPath, bundle: true, platform: "node", format: "esm", target: "es2021" });
await build({ entryPoints: [join(root, "src/core/plex/predicateParser.ts")], outfile: join(dir, "parser.mjs"), bundle: true, platform: "node", format: "esm", target: "es2021" });
const predicateAdapterPath = join(dir, "predicate-adapter.mjs");
await build({ entryPoints: [join(root, "src/adapters/obsidian/predicateContracts.ts")], outfile: predicateAdapterPath, bundle: true, platform: "node", format: "esm", target: "es2021" });
const predicateFacadePath = join(dir, "predicate-facade.mjs");
const lensFacadePath = join(dir, "lens-facade.mjs");
await build({ entryPoints: [join(root, "src/lens/GraphPredicate.ts")], outfile: predicateFacadePath, bundle: true, platform: "node", format: "esm", target: "es2021" });
await build({ entryPoints: [join(root, "src/lens/GraphLens.ts")], outfile: lensFacadePath, bundle: true, platform: "node", format: "esm", target: "es2021" });
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
    assert.equal(view.path, legacy.path);
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
      assert.deepEqual(view.file, { name: legacy.file.name, extension: legacy.file.extension, path: legacy.file.path, mtime: legacy.file.stat.mtime, basename: legacy.file.basename, ctime: legacy.file.stat.ctime, size: legacy.file.stat.size });
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

test("legacy search read maps ranked results to plain views without host reach-through", async () => {
  const { createLegacyGraphSearchRead } = await import(pathToFileURL(adapterPath).href);
  const first = page({ path: "Case:Node", name: "First", aliases: ["A"] });
  const second = page({ path: "entity:web", name: "Web", url: "https://example.com" });
  const third = page({ path: "Opaque:File", file: { name: "Different.md", extension: "md", path: "actual/Different.md", stat: { mtime: 3 } } });
  const calls = [];
  const graph = createLegacyGraphSearchRead({
    search(query, limit) { calls.push([query, limit]); return [second, first, third]; },
    titleFor(candidate) { return candidate === second ? "Configured web title" : "Configured first title"; },
  });
  const hits = graph.search("needle", 24);
  assert.deepEqual(calls, [["needle", 24]]);
  assert.deepEqual(hits.map((hit) => [hit.node.id, hit.label, hit.detail, hit.node.kind]), [
    ["entity:web", "Configured web title", "entity:web", "url"],
    ["Case:Node", "Configured first title", "Case:Node", "unresolved"],
    ["Opaque:File", "Configured first title", "Opaque:File", "document"],
  ]);
  assert.equal(hits[1].node.aliases, first.aliases, "mapping stays bounded rather than cloning metadata arrays");
  for (const hit of hits) {
    assert.equal("file" in hit.node && "stat" in hit.node.file, false);
    assert.equal("neighbours" in hit.node, false);
  }
});


test("C10 portable predicate is lazy, path-explicit, case-aware and host-free", async () => {
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", `
    import assert from "node:assert/strict";
    import * as p from ${JSON.stringify(pathToFileURL(predicatePath).href)};
    import * as parser from ${JSON.stringify(pathToFileURL(join(dir, 'parser.mjs')).href)};
    assert.equal(typeof globalThis.window, "undefined");
    const calls=[]; const values={Status:"Active", empty:null, list:["One","Two"]};
    const engine=new p.GraphPredicateEngine({getNoteProperty(node,key){calls.push([node.id,key]); return values[key];}});
    const node={id:"OPAQUE:Case",name:"Display",path:"Folder/Note.md",kind:"document",resolution:"resolved",url:null,aliases:[],tags:["#Project/Sub"],noteType:null,primaryStyleTag:null,styleTags:[],maxLabelLength:30,file:{name:"Note.md",extension:"md",path:"Folder/Note.md",mtime:7,basename:"Note",ctime:5,size:99}};
    const center={...node,id:"CENTER",path:"Other/Center.md",file:{...node.file,path:"Other/Center.md"}};
    const parse=(src)=>p.compileGraphPredicate(parser.parseGraphPredicateExpression(src));
    assert.equal(engine.matches(parse('note.Status.equals("active")'),{node:{node},center}),true);
    assert.deepEqual(calls,[["OPAQUE:Case","Status"]]);
    calls.length=0; assert.equal(engine.matches(parse('node.label == "Display" || note.unused == 1'),{node:{node,label:"Display"},center}),true); assert.equal(calls.length,0);
    assert.equal(engine.matches(parse('note.empty.exists()'),{node:{node},center}),false);
    assert.equal(engine.matches(parse('note.list.contains("two")'),{node:{node},center}),true);
    assert.equal(engine.matches(parse('file.inFolder("Folder")'),{node:{node},center}),true);
    assert.equal(engine.matches(parse('file.basename == "Note" && file.ctime == 5 && file.size == 99'),{node:{node},center}),true);
    assert.equal(engine.matches(parse('this.path == "Other/Center.md"'),{node:{node},center}),true);
    assert.equal(engine.matches(parse('node.path == "Folder/Note.md"'),{node:{node},center}),true);
    assert.equal(engine.matches(parse('node.path == "OPAQUE:Case"'),{node:{node},center}),false, "opaque id must not be inferred as path");
  `], { cwd: dir, encoding: "utf8" });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("C10 portable lenses preserve union, subtraction, style precedence and lazy evidence", async () => {
  const p = await import(pathToFileURL(predicatePath).href);
  const l = await import(pathToFileURL(lensPath).href);
  const parserOut = join(dir, "parser.mjs");
  const parser = await import(pathToFileURL(parserOut).href);
  const compile = (source) => p.compileGraphPredicate(parser.parseGraphPredicateExpression(source));
  const node={id:"node-id",name:"Alpha",kind:"document",resolution:"resolved",url:null,aliases:[],tags:[],noteType:null,primaryStyleTag:null,styleTags:[],maxLabelLength:30,file:{name:"Alpha.md",extension:"md",path:"Alpha.md",mtime:1}};
  const center={...node,id:"center-id",name:"Center",file:{...node.file,path:"Center.md"}};
  let evidenceCalls=0;
  const evidence={decisions(){evidenceCalls++; return [{active:false,suppressionReason:"precedence",evidence:{fieldName:"parent",rawValue:"Alpha"}}];}};
  const engine=new p.GraphPredicateEngine(); const candidate={node,label:"Alpha",center,edge:{sourcePath:"Center.md",targetPath:"Alpha.md"}};
  const lenses=[
    {scope:"node",mode:"include",predicate:compile('node.label.equals("alpha")')},
    {scope:"node",mode:"include",predicate:compile('node.label.equals("other")')},
    {scope:"node",mode:"exclude",predicate:compile('node.label.equals("blocked")')},
  ];
  assert.equal(l.matchesPortableLenses(engine,evidence,lenses,candidate),true); assert.equal(evidenceCalls,0);
  const evidenceLens={scope:"evidence",mode:"exclude",predicate:compile('evidence.active == false && evidence.suppressionReason.equals("precedence")')};
  assert.equal(l.matchesPortableLenses(engine,evidence,[...lenses,evidenceLens],candidate),false); assert.equal(evidenceCalls,1);
  const styles=[
    {scope:"node",mode:"style",predicate:compile('node.label.equals("alpha")'),style:{node:{strokeWidth:1,borderColor:"#111111"}}},
    {scope:"node",mode:"style",predicate:compile('node.label.equals("alpha")'),style:{node:{strokeWidth:3}}},
  ];
  assert.deepEqual(l.portableLensStyle(engine,evidence,styles,candidate,"node"),{strokeWidth:3,borderColor:"#111111"});
});

test("C10 preserves raw edge selectors, semantic paths and independent timestamps", async () => {
  const p = await import(pathToFileURL(predicatePath).href);
  const parser = await import(pathToFileURL(join(dir, "parser.mjs")).href);
  const engine = new p.GraphPredicateEngine();
  const node = graphNodeViewFromLegacy(page({ path: "Semantic/Note.md", mtime: 7,
    file: { name: "Physical.md", basename: "Physical", extension: "md", path: "Actual/Physical.md", stat: { mtime: 19, ctime: 5, size: 99 } } }));
  const center = graphNodeViewFromLegacy(page({ path: "https://example.com/center", url: "https://example.com/center", mtime: null }));
  const ghost = graphNodeViewFromLegacy(page({ path: "Absent/Ghost.md", mtime: null }));
  const matches = (expression, candidate = node, edge = {}) => engine.matches(p.compileGraphPredicate(parser.parseGraphPredicateExpression(expression)), { node: { node: candidate }, center, edge });
  for (const expression of ['node.mtime == 7', 'file.mtime == 19', 'file.path == "Semantic/Note.md"', 'this.path == "https://example.com/center"', 'this.mtime == null']) assert.equal(matches(expression), true, expression);
  assert.equal(matches('file.path == "Absent/Ghost.md" && node.mtime == null', ghost), true, "unbacked nodes preserve explicit semantic paths and null time");
  assert.equal(matches('file.name.exists()', ghost), false);
  for (const [relationType, kind] of [[1, 'defined'], [2, 'inferred']]) {
    for (const [linkDirection, direction] of [[1, 'to'], [2, 'from'], [3, 'both']]) {
      assert.equal(matches(`edge.relationType == ${relationType} && edge.kind == "${kind}" && edge.linkDirection == ${linkDirection} && edge.direction == "${direction}"`, node, { relationType, linkDirection }), true);
    }
  }
  assert.equal(matches('edge.linkDirection == null && !edge.direction.exists()', node, { linkDirection: null }), true);
  assert.equal(matches('edge.relationType == "defined"', node, { relationType: 1 }), false, "raw enums must not silently change to strings");
});

test("C10 path-only evidence candidates preserve fallback, override and self-pair semantics", async () => {
  const p = await import(pathToFileURL(predicatePath).href);
  const l = await import(pathToFileURL(lensPath).href);
  const ghost = graphNodeViewFromLegacy(page({ path: 'Absent/Ghost.md' }));
  const center = graphNodeViewFromLegacy(page({ path: 'https://example.com/center', url: 'https://example.com/center' }));
  const calls = [];
  const evidence = { decisions(a, b) { calls.push([a, b]); return [{ active: false, suppressionReason: 'priority', evidence: { fieldName: 'Parent', relationType: 1, direction: 2 } }]; } };
  const predicate = p.compileGraphPredicate(p.predicateCompare('eq', p.predicateProperty('evidence', 'active'), p.predicateLiteral(false)));
  const lens = { scope: 'evidence', mode: 'include', predicate };
  const candidate = { node: ghost, label: ghost.name, center };
  assert.equal(l.matchesPortableLenses(new p.GraphPredicateEngine(), evidence, [lens], candidate), true);
  assert.deepEqual(calls, [[center.path, ghost.path]]);
  calls.length = 0;
  assert.equal(l.matchesPortableLenses(new p.GraphPredicateEngine(), evidence, [lens], { ...candidate, edge: { sourcePath: 'Override/Source.md', targetPath: 'Override/Target.md' } }), true);
  assert.deepEqual(calls, [['Override/Source.md', 'Override/Target.md']]);
  calls.length = 0;
  assert.equal(l.matchesPortableLenses(new p.GraphPredicateEngine(), evidence, [lens], { ...candidate, node: center }), false);
  assert.equal(l.matchesPortableLenses(new p.GraphPredicateEngine(), evidence, [lens], { ...candidate, center: { ...center, path: undefined } }), false);
  assert.equal(calls.length, 0);
});

test("C10 predicate edge cases and parser dependencies run in a fresh host-free process", () => {
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", `
    import assert from 'node:assert/strict';
    import * as p from ${JSON.stringify(pathToFileURL(predicatePath).href)};
    import * as parser from ${JSON.stringify(pathToFileURL(join(dir, 'parser.mjs')).href)};
    import * as l from ${JSON.stringify(pathToFileURL(lensPath).href)};
    assert.equal(typeof globalThis.window, 'undefined');
    const values = { missing: undefined, nil: null, blank: '  ', zero: 0, bool: false, scalar: 'Alpha', list: ['One', 'Two'], empty: [] };
    const calls = [];
    const engine = new p.GraphPredicateEngine({ getNoteProperty(node, key) { calls.push([node.id, key]); return values[key]; } });
    const node = { id: 'OPAQUE:Case', name: 'Name', path: 'Folder/Name.md', kind: 'document', resolution: 'resolved', url: null, aliases: [], tags: ['#Project/Sub'], noteType: null, primaryStyleTag: null, styleTags: [], maxLabelLength: 30 };
    const compile = (src) => p.compileGraphPredicate(parser.parseGraphPredicateExpression(src));
    const ctx = { node: { node } };
    const rows = [
      ['!note.missing.exists()', true], ['note.nil == null', true], ['note.missing == null', false],
      ['!note.blank.exists()', true], ['note.zero.exists()', true], ['note.bool.exists()', true],
      ['!note.empty.exists()', true], ['note.scalar == "alpha"', false], ['note.scalar != "alpha"', true],
      ['note.scalar.equals("alpha")', true], ['!note.scalar.contains("beta")', true],
      ['note.scalar.startsWith("AL") && note.scalar.endsWith("ha")', true],
      ['note.list.contains("two")', true], ['!note.list.contains("three")', true],
      ['note.zero <= 1 && note.zero >= 0 && note.zero < 1 && !(note.zero > 1)', true],
      ['node.tags.hasTag("project")', true]
    ];
    for (const [source, expected] of rows) assert.equal(engine.matches(compile(source), ctx), expected, source);
    calls.length = 0;
    assert.equal(engine.matches(compile('node.name == "absent" && note.unused == 1'), ctx), false);
    assert.equal(engine.matches(compile('node.name == "Name" || note.unused == 1'), ctx), true);
    assert.deepEqual(calls, []);
    const dependent = compile('note.Status.equals("active") && this.name == "Center"');
    assert.equal(dependent.dependencies.usesFrontmatter, true);
    assert.deepEqual([...dependent.dependencies.noteProperties], ['Status']);
    assert.deepEqual([...dependent.dependencies.namespaces], ['note', 'this']);
    assert(parser.tryParseGraphPredicateExpression('note.Status ==').error);
    assert.equal(engine.matches(null, ctx), true);
    const evidence = { decisions() { throw Error('Unrequested evidence'); } };
    const styles = [{scope:'node',mode:'style',predicate:compile('node.name == "Name"'),style:{node:{strokeWidth:2}}}];
    assert.equal(l.matchesPortableLenses(engine, evidence, styles, {node,label:'Name'}), true);
    assert.equal(l.matchesPortableLenses(engine, evidence, [], {node,label:'Name'}), true);
    assert.deepEqual(l.portableLensStyle(engine,evidence,styles,{node,label:'Name'},'node'),{strokeWidth:2});
  `], { cwd: dir, encoding: "utf8" });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});


test("C10 host providers request only cached Markdown fields and plain pair decisions", async () => {
  const { createLegacyPropertyProvider, createLegacyEvidenceProvider } = await import(pathToFileURL(predicateAdapterPath).href);
  const file = { name: 'Physical.md', basename: 'Physical', path: 'Physical.md', extension: 'md', stat: { mtime: 4, ctime: 2, size: 42 } };
  const node = graphNodeViewFromLegacy(page({ path: 'Semantic.md', file, mtime: 1 }));
  let frontmatter = { Status: 'Active', status: 'Exact', nil: null, list: ['One', 'Two'] };
  const lookups = [], metadata = [];
  const properties = createLegacyPropertyProvider({
    vault: { getFileByPath(path) { lookups.push(path); return path === file.path ? file : null; } },
    metadataCache: { getFileCache(found) { metadata.push(found); return { frontmatter }; } },
  });
  assert.deepEqual(lookups, [], 'construction must not read a vault');
  assert.equal(properties.getNoteProperty(node, 'status'), 'Exact');
  assert.equal(properties.getNoteProperty(node, 'STATUS'), 'Active', 'exact key first, then legacy case-insensitive first match');
  assert.equal(properties.getNoteProperty(node, 'nil'), null);
  assert.equal(properties.getNoteProperty(node, 'list'), frontmatter.list);
  assert.equal(properties.getNoteProperty(node, 'missing'), undefined);
  assert(lookups.every(path => path === 'Physical.md'), 'file lookup uses explicit physical path, never opaque ID');
  assert(metadata.every(found => found === file));
  frontmatter = { Status: 'Changed' };
  assert.equal(properties.getNoteProperty(node, 'Status'), 'Changed', 'provider must read live metadata rather than a captured snapshot');
  const reads = metadata.length;
  assert.equal(properties.getNoteProperty({ ...node, kind: 'url' }, 'Status'), undefined);
  assert.equal(properties.getNoteProperty({ ...node, file: undefined }, 'Status'), undefined);
  assert.equal(properties.getNoteProperty({ ...node, file: { ...node.file, extension: 'png' } }, 'Status'), undefined);
  assert.equal(metadata.length, reads);
  const pairCalls = [];
  const decision = { evidence: { id: 'e1', sourcePath: 'Source.md', targetPath: 'Ghost.md', direction: 2, relationType: 1, role: 'parent', fieldName: 'Parent' }, active: false, suppressionReason: 'precedence' };
  const evidence = createLegacyEvidenceProvider({ explainRelationship(a, b) { pairCalls.push([a, b]); return { decisions: [decision] }; } });
  assert.deepEqual(pairCalls, []);
  const mapped = evidence.decisions('Source.md', 'Ghost.md');
  assert.deepEqual(pairCalls, [['Source.md', 'Ghost.md']]);
  assert.deepEqual(mapped, [decision]);
  assert.notEqual(mapped[0].evidence, decision.evidence, 'plain records cross the boundary without unsafe casts');
});


test("C10 idle production delegates avoid mapping candidates or requesting providers", async () => {
  const { GraphPredicateEngine } = await import(pathToFileURL(predicateFacadePath).href);
  const lens = await import(pathToFileURL(lensFacadePath).href);
  const engine = new GraphPredicateEngine({});
  const unread = new Proxy({}, { get() { throw Error('Idle candidate must not be read'); } });
  const source = { explainRelationship() { throw Error('Unrequested evidence'); } };
  const empty = lens.compileGraphLensDefinitions([]);
  assert.equal(engine.matches(null, { node: { page: unread } }), true);
  assert.equal(lens.matchesGraphLenses(engine, source, empty, unread), true);
  assert.deepEqual(lens.graphLensNodeStyle(engine, source, empty, unread), {});
  assert.deepEqual(lens.graphLensEdgeStyle(engine, source, empty, unread), {});
  const styleOnly = lens.compileGraphLensDefinitions([{ id: 'a', name: 'A', enabled: true, scope: 'node', mode: 'style', expression: 'node.name == "Name"', style: { node: { strokeWidth: 2 } } }]);
  assert.equal(lens.matchesGraphLenses(engine, source, styleOnly, unread), true);
  const visibilityOnly = lens.compileGraphLensDefinitions([{ id: 'a', name: 'A', enabled: true, scope: 'node', mode: 'include', expression: 'node.name == "Name"' }]);
  assert.deepEqual(lens.graphLensNodeStyle(engine, source, visibilityOnly, unread), {});
  assert.deepEqual(lens.graphLensEdgeStyle(engine, source, visibilityOnly, unread), {});
});
