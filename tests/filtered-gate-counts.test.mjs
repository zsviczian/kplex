/**
 * Semantic filtered-gate regression over the unchanged archived Note A/D/F fixture. Actual
 * GraphIndex classification, production scene layout and lens evaluation drive the result; fixed
 * semantic target sets and the original physical-side algorithm remain independent test oracles.
 * Native and physical-device validation are separate; owned emitted modules retire at process exit.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildSync } from "esbuild";

const directory = mkdtempSync(join(tmpdir(), "kplex-filtered-gates-"));
process.once("exit", /** Retire only this test's emitted module tree. */ () => rmSync(directory, { recursive: true, force: true }));
const host = join(directory, "node_modules/obsidian"); mkdirSync(host, { recursive: true });
writeFileSync(join(host, "index.js"), `
class TFile { constructor(path) { this.path=path; this.name=path.split('/').pop(); this.extension=this.name.split('.').pop(); this.basename=this.name.slice(0,-this.extension.length-1); this.stat={mtime:1,ctime:1,size:1}; } }
class TFolder {}
module.exports={TFile,TFolder,Platform:{isMobile:false,isIosApp:false},normalizePath:x=>x,
getAllTags:()=>[],getIcon:()=>null,PluginSettingTab:class{},Modal:class{},Notice:class{},Setting:class{},
AbstractInputSuggest:class{},Scope:class{},getLanguage:()=>"en"};
`);
const output = join(directory, "gates.cjs");
buildSync({ stdin: { resolveDir: process.cwd(), contents: `
export * from "./src/index/GraphIndex"; export * from "./src/index/GraphState";
export * from "./src/ui/filteredGateCounts"; export * from "./src/ui/layout";
export * from "./src/core/plex/shownGateCounts"; export * from "./src/settings";
export * from "./src/lens/GraphPredicate"; export * from "./src/lens/GraphLens";
export * from "./src/lens/SimplePlexFilter";
` }, outfile: output, bundle: true, format: "cjs", platform: "node", external: ["obsidian"] });
const require = createRequire(import.meta.url);
const { GraphIndex, createGraphState, projectFilteredGateCounts, buildScene, accumulateShownGateCounts,
  migrateAndMergeSettings, GraphPredicateEngine, compilePlexFilter, compileGraphLensDefinitions,
  matchesGraphLenses } = require(output);
const { TFile } = require(join(host, "index.js"));
const baseline = JSON.parse(readFileSync("tests/fixtures/excalibrain-indexing/graph-baseline.json", "utf8"));

/** Bind the accepted immutable semantic fixture to native identities without acquiring any sources. */
function fixture() {
  const previousWindow = globalThis.window;
  globalThis.window = { performance, setTimeout, clearTimeout, setInterval, clearInterval };
  const settings = migrateAndMergeSettings({ indexingMode: "eager", graphDepth: 2, showNeighborCount: true,
    showInferredNodes: true, showFolderNodes: true, showTagNodes: true, showURLNodes: true,
    showVirtualNodes: true, showAttachments: true, showPageNodes: true, maxItemCount: 300,
    hierarchy: { hidden: ["Hidden"], parents: ["Parent"], children: ["Child"], leftFriends: ["Friend"],
      rightFriends: ["Challenger"], previous: ["Previous"], next: ["Next"] } });
  const state = createGraphState();
  for (const record of baseline.graph.pages) {
    const page = { ...record, file: record.physicalPath ? new TFile(record.physicalPath) : null,
      neighbours: new Map(), mtime: record.physicalPath ? 1 : null };
    delete page.relations;
    state.pages.set(page.path, page); state.lowercasePathMap.set(page.path.toLowerCase(), page.path);
  }
  for (const record of baseline.graph.pages) for (const item of record.relations) {
    state.pages.get(record.path).neighbours.set(item.targetPath, { ...item, target: state.pages.get(item.actualTargetPath) });
  }
  for (const item of baseline.graph.declarations) state.evidence.addDeclaration(
    item.declaredByPath, item.declaredTargetPath, item.declaredRole, item.relationType, item.direction, item);
  const forbidden = /** Presentation projection may not acquire bodies, inventories or durable state. */ () => { throw Error("source acquisition forbidden"); };
  const app = { vault: { getName: () => "filtered-gate-fixture", getFileByPath: path => state.pages.get(path)?.file ?? null,
    getFiles: forbidden, getMarkdownFiles: forbidden, read: forbidden, cachedRead: forbidden },
    metadataCache: { getFileCache: () => null, resolvedLinks: {}, unresolvedLinks: {} }, saveLocalStorage() {} };
  let source = 0;
  const index = new GraphIndex({ app, settings, getIndexSourceRevision: () => source }, app);
  index.state = state; index.fullSnapshotFresh = true;
  index.indexedDb.open = forbidden; index.ensureOnDemandGateCounts = forbidden;
  index.sourceAcquisition.flush = forbidden; index.prepareSemanticNeighborhood = forbidden;
  const center = index.get("Note A.md");
  const engine = new GraphPredicateEngine(app);
  /** Reproduce Quick lens's real name condition while always retaining the center. */
  const matches = nodes => {
    const predicate = compilePlexFilter({ field: "node.label", operator: "contains", value: "note", showCrossLinks: true });
    return new Set(nodes.filter(node => node.role === "center" || engine.matches(predicate,
      { node: { page: node.page, label: node.label }, center })).map(node => node.page.path));
  };
  return { index, settings, state, center, engine, matches,
    advanceSource: /** Model an input revision without silently publishing new incidence. */ () => { source++; },
    close: /** Release the real index's timers/lifetimes and restore the previous host clock surface. */ () => { index.destroy(); globalThis.window = previousWindow; } };
}

/** Retain the pre-fix physical attachment interpretation solely to prove the exact bad population. */
function oldPhysicalShown(edges, matched, path) {
  let right = 0;
  for (const edge of edges) {
    if (!matched.has(edge.sourcePath) || !matched.has(edge.targetPath)) continue;
    const sides = edge.role === "parent" ? ["top", "bottom"] : edge.role === "child" ? ["bottom", "top"]
      : edge.role === "left" || edge.role === "previous" ? ["left", "right"] : ["right", "left"];
    if (edge.sourcePath === path && sides[0] === "right") right++;
    if (edge.targetPath === path && sides[1] === "right") right++;
  }
  return right;
}

/** Build the actual scene; Reflow retains matching relation buckets using the existing layout contract. */
function sceneFor(f, crossLinks, reflow = false) {
  const n = f.index.getNeighborhood(f.center.path);
  if (reflow) for (const key of ["parents", "children", "leftFriends", "rightFriends", "siblings"]) {
    n[key] = n[key].filter(item => f.engine.matches(compilePlexFilter({ field: "node.label", operator: "contains", value: "note" }),
      { node: { page: item.page, label: f.index.titleFor(item.page) }, center: f.center }));
  }
  return buildScene(n, f.index, f.settings, crossLinks, undefined, true);
}

test("original Note A/D/F fixture reproduces 3/1 physical routing and gives semantic right 1/1", /** Compare static independent semantic sets against real classification/layout. */ () => {
  const f = fixture();
  try {
    assert.match(readFileSync("tests/fixtures/excalibrain-indexing/Vault/Note F.md", "utf8"), /Previous:: \[\[Note D/);
    const scene = sceneFor(f, true), matched = f.matches(scene.nodes);
    assert.equal(f.index.gateStats(f.index.get("Note D.md")).right.visibleCount, 1);
    assert.equal(oldPhysicalShown(scene.edges, matched, "Note D.md"), 3, "unchanged archived fixture reproduces reported pre-fix ratio");
    const before = JSON.stringify([...f.state.pages].map(([path, page]) => [path, [...page.neighbours.keys()]]));
    const projection = projectFilteredGateCounts(scene.nodes, scene.edges, matched, f.index);
    assert.equal(projection.isCurrent(), true);
    assert.deepEqual(projection.counts.get("Note D.md"), { top: 0, bottom: 0, left: 2, right: 1 }, "D friends are A/C, next is F");
    assert.equal(projection.counts.get("Note F.md").left, 1, "F previous D belongs to left");
    const read = f.index.captureSemanticGateRead();
    assert.deepEqual([...read.read(f.index.get("Note D.md"), new Set(["Note A.md", "Note C.md", "Note F.md"]))],
      [["Note A.md", ["left"]], ["Note C.md", ["left"]], ["Note F.md", ["right"]]]);
    assert.equal(JSON.stringify([...f.state.pages].map(([path, page]) => [path, [...page.neighbours.keys()]])), before);
  } finally { f.close(); }
});

test("Keep layout/Reflow/cross-links retain scene scope; duplicate strokes cannot inflate gates", /** Exercise all projection combinations without changing semantic publication. */ () => {
  const f = fixture();
  try {
    const revision = f.index.getSemanticRevision();
    for (const reflow of [false, true]) for (const crossLinks of [false, true]) {
      const scene = sceneFor(f, crossLinks, reflow), matched = f.matches(scene.nodes);
      const edges = [...scene.edges, ...scene.edges, ...scene.edges.map(edge => ({ ...edge, sourcePath: edge.targetPath, targetPath: edge.sourcePath }))];
      const projection = projectFilteredGateCounts(scene.nodes, edges, matched, f.index);
      assert.equal(projection.counts.get("Note D.md").right, crossLinks ? 1 : 0);
      assert.equal(projection.counts.get("Note D.md").left, crossLinks ? 2 : 1);
      assert.equal(projection.counts.get("Note F.md").left, crossLinks ? 1 : 0);
      assert.equal(f.index.gateStats(f.index.get("Note D.md")).right.visibleCount, 1, "denominator is before scene/top-N filtering");
    }
    assert.equal(f.index.getSemanticRevision(), revision, "filtering changes no semantic state");
  } finally { f.close(); }
});

test("all-role sets deduplicate exact identity without lowercasing or mutating input", /** Distinguish gate targets from strokes, roles and display labels. */ () => {
  const input = [{ nodePath: "A", targetPath: "B", gates: ["left", "left"] },
    { nodePath: "A", targetPath: "B", gates: ["left", "right"] },
    { nodePath: "A", targetPath: "b", gates: ["left"] }, { nodePath: "A", targetPath: "B", gates: ["right"] }];
  const before = JSON.stringify(input);
  assert.deepEqual(accumulateShownGateCounts(["A", "empty"], input).get("A"), { top: 0, bottom: 0, left: 2, right: 1 });
  assert.deepEqual(accumulateShownGateCounts(["A", "empty"], input).get("empty"), { top: 0, bottom: 0, left: 0, right: 0 });
  assert.equal(JSON.stringify(input), before);
});

test("hidden/excluded/inferred endpoint membership shares denominator policy and independent fill", /** Check index visibility rather than trusting a stale scene stroke. */ () => {
  const f = fixture();
  try {
    const scene = sceneFor(f, true), matched = f.matches(scene.nodes), d = f.index.get("Note D.md");
    f.settings.excludeFilepaths = ["Note F.md"];
    assert.equal(projectFilteredGateCounts(scene.nodes, scene.edges, matched, f.index).counts.get(d.path).right, 0);
    assert.equal(f.index.gateStats(d).right.visibleCount, 0); assert.equal(f.index.gateStats(d).right.hasAny, true);
    f.settings.excludeFilepaths = [];
    d.neighbours.get("Note F.md").isHidden = true; f.index.relationViewCache = new WeakMap();
    assert.equal(projectFilteredGateCounts(scene.nodes, scene.edges, matched, f.index).counts.get(d.path).right, 0);
    assert.equal(f.index.gateStats(d).right.hasAny, false);
    d.neighbours.get("Note F.md").isHidden = false; f.index.relationViewCache = new WeakMap();
    f.settings.showInferredNodes = false;
    const a = f.index.get("Note A.md");
    assert.equal(projectFilteredGateCounts(scene.nodes, scene.edges, matched, f.index).counts.get(a.path).bottom, 1, "explicit C survives; inferred F/Y do not");
  } finally { f.close(); }
});

test("read epochs retire overlays after source/publication/visibility changes, then fresh incidence wins", /** Never mix a newer scene numerator with an older read lifetime. */ () => {
  const f = fixture();
  try {
    const scene = sceneFor(f, true), matched = f.matches(scene.nodes);
    const source = projectFilteredGateCounts(scene.nodes, scene.edges, matched, f.index);
    f.advanceSource(); assert.equal(source.isCurrent(), false);
    const policy = projectFilteredGateCounts(scene.nodes, scene.edges, matched, f.index);
    f.settings.showInferredNodes = false; assert.equal(policy.isCurrent(), false);
    const publication = projectFilteredGateCounts(scene.nodes, scene.edges, matched, f.index);
    f.index.publicationRevision++; assert.equal(publication.isCurrent(), false);
    const d = f.index.get("Note D.md"); d.neighbours.delete("Note F.md"); f.index.relationViewCache = new WeakMap();
    assert.equal(projectFilteredGateCounts(scene.nodes, scene.edges, matched, f.index).counts.get(d.path).right, 0);
    assert.equal(f.index.gateStats(d).right.visibleCount, 0);
  } finally { f.close(); }
});

test("section outline and sibling witness edges keep real provenance rather than fabricated adjacency", /** Transient projected denominators do not claim persistent-graph ratios. */ () => {
  const f = fixture();
  try {
    const scene = sceneFor(f, false), matched = new Set(scene.nodes.map(node => node.page.path));
    const a = scene.nodes.find(node => node.role === "center");
    const section = { ...a, page: { ...a.page, path: "section", transient: { kind: "section", sourcePath: a.page.path } } };
    const edges = [...scene.edges, { sourcePath: a.page.path, targetPath: "section", role: "child" }];
    matched.add("section");
    const projection = projectFilteredGateCounts([...scene.nodes, section], edges, matched, f.index);
    assert.equal(projection.counts.has("section"), false);
    assert.equal(projection.counts.get(a.page.path).bottom, projectFilteredGateCounts(scene.nodes, scene.edges, matched, f.index).counts.get(a.page.path).bottom);
    for (const edge of scene.edges.filter(edge => edge.id.startsWith("sibling-parent:"))) {
      const read = f.index.captureSemanticGateRead();
      assert.deepEqual(read.read(f.index.get(edge.sourcePath), new Set([edge.targetPath])).get(edge.targetPath), ["bottom"]);
    }
  } finally { f.close(); }
});

test("parent/child, symmetric challenger and previous/next classify each endpoint independently", /** Assert explicit fixture roles without deriving expected sides from the new helper. */ () => {
  const f = fixture();
  try {
    const read = f.index.captureSemanticGateRead();
    for (const [source, target, gate] of [["Note A.md", "Note B.md", "top"], ["Note B.md", "Note A.md", "bottom"],
      ["Note A.md", "Note C.md", "bottom"], ["Note C.md", "Note A.md", "top"],
      ["Note A.md", "Note E.md", "right"], ["Note E.md", "Note A.md", "right"],
      ["Note F.md", "Note E.md", "right"], ["Note E.md", "Note F.md", "left"]]) {
      assert.deepEqual(read.read(f.index.get(source), new Set([target])).get(target), [gate], `${source} → ${target}`);
    }
  } finally { f.close(); }
});

test("include/exclude and edge/evidence lenses use the existing endpoint survival convention", /** Compose production lens evaluation with semantic incidence, without a second evaluator. */ () => {
  const f = fixture();
  try {
    const scene = sceneFor(f, true);
    for (const [definitions, expectedLeft, expectedRight] of [
      [[{ scope: "node", mode: "include", expression: 'node.label.contains("Note")' },
        { scope: "node", mode: "exclude", expression: 'node.path == "Note F.md"' }], 2, 0],
      [[{ scope: "edge", mode: "include", expression: 'edge.role == "left"' }], 1, 0],
      [[{ scope: "evidence", mode: "include", expression: 'evidence.sourceKind == "inline-ontology" and evidence.active == true' }], 2, 0],
    ]) {
      const lenses = compileGraphLensDefinitions(definitions.map((item, i) => ({ id: String(i), name: String(i), enabled: true, ...item })));
      assert.deepEqual(lenses.errors, []);
      const matched = new Set(scene.nodes.filter(node => node.role === "center" || matchesGraphLenses(f.engine, f.index, lenses, {
        page: node.page, label: node.label, center: f.center,
        edge: { role: node.role, relationType: node.relationType, definition: node.typeDefinition,
          linkDirection: node.linkDirection, sourcePath: f.center.path, targetPath: node.page.path },
      })).map(node => node.page.path));
      const projected = projectFilteredGateCounts(scene.nodes, scene.edges, matched, f.index);
      assert.equal(projected.counts.get("Note D.md").left, expectedLeft, JSON.stringify(definitions));
      assert.equal(projected.counts.get("Note D.md").right, expectedRight, JSON.stringify(definitions));
    }
    const styles = compileGraphLensDefinitions([{ id: "s", name: "s", enabled: true, scope: "node", mode: "style", expression: 'node.label.contains("Note")', style: { node: { strokeWidth: 3 } } }]);
    assert.equal(styles.lenses.some(lens => lens.mode === "include" || lens.mode === "exclude"), false, "style-only settings leave globalFiltering false");
    for (const node of scene.nodes) assert.equal(matchesGraphLenses(f.engine, f.index, styles, { page: node.page, label: node.label, center: f.center }), true);
  } finally { f.close(); }
});

test("partial incidence and count-only proof stay separate; unavailable totals are never certified by scene membership", /** Simulate accepted finite publication contracts, forbidding all source work. */ () => {
  const f = fixture();
  try {
    const scene = sceneFor(f, true), matched = f.matches(scene.nodes), d = f.index.get("Note D.md");
    const proof = structuredClone(f.index.gateStats(d));
    d.neighbours = new Map([["Note A.md", d.neighbours.get("Note A.md")]]);
    f.index.preparedPageInfo.set(d, { completeRelations: false, settings: f.index.fullSemanticSettings,
      policyRevision: f.index.semanticPolicyRevision, gates: proof, gateCoverageSignature: f.index.semanticCoverageSignature(),
      gatePairRevision: f.index.relationshipPairRevision });
    f.index.relationViewCache = new WeakMap();
    const before = JSON.stringify(proof);
    const projection = projectFilteredGateCounts(scene.nodes, scene.edges, matched, f.index);
    assert.deepEqual(projection.counts.get(d.path), { top: 0, bottom: 0, left: 1, right: 0 });
    assert.equal(f.index.gateStats(d).right.visibleCount, 1);
    assert.equal(f.index.gateStats(d).right.complete, true, "count proof does not acquire missing F incidence");
    assert.equal(d.neighbours.size, 1); assert.equal(JSON.stringify(proof), before);
    f.index.indexingMode = "on-demand"; f.index.onDemandBaselineReady = true;
    f.index.onDemandUnavailableCounts.set(d.path, { sourceRevision: 0, hostRevision: f.index.hostPreview.observationRevision(),
      signature: f.index.semanticCoverageSignature(), revision: 0 });
    assert.equal(f.index.gateStats(d).right.countUnavailable, true);
    assert.equal(f.index.gateStats(d).right.complete, false);
    assert.equal(d.neighbours.size, 1, "neither membership nor unavailable gates trigger hydration");
  } finally { f.close(); }
});

test("top-N is a scene limit and camera/scroll geometry cannot change filtered membership", /** Preserve pre-top-N totals and count before viewport clipping. */ () => {
  const f = fixture();
  try {
    f.settings.maxItemCount = 1;
    const scene = sceneFor(f, true), matched = f.matches(scene.nodes);
    const first = projectFilteredGateCounts(scene.nodes, scene.edges, matched, f.index);
    const scrolled = scene.nodes.map(node => ({ ...node, y: node.y - 100_000 }));
    const next = projectFilteredGateCounts(scrolled, scene.edges, matched, f.index);
    assert.deepEqual([...first.counts], [...next.counts]);
    for (const node of scene.nodes) for (const [side, shown] of Object.entries(first.counts.get(node.page.path))) {
      assert(shown <= f.index.gateStats(node.page)[side].visibleCount, `${node.page.path}:${side} bounded by canonical visible set`);
    }
    assert.equal(f.index.gateStats(f.index.get("Note D.md")).right.visibleCount, 1);
  } finally { f.close(); }
});

test("endpoint classification follows its captured compilation policy, not the current global inference setting", /** A finite partial publication retains the same policy for denominator and shown membership. */ () => {
  const f = fixture();
  try {
    const d = f.index.get("Note D.md"), target = d.neighbours.get("Note F.md");
    target.isLeftFriend = true; target.leftFriendType = 1;
    f.index.preparedPageInfo.set(d, { completeRelations: true,
      settings: { ...f.index.fullSemanticSettings, inferAllLinksAsFriends: false }, policyRevision: f.index.semanticPolicyRevision });
    f.settings.inferAllLinksAsFriends = true; f.index.relationViewCache = new WeakMap();
    const read = f.index.captureSemanticGateRead();
    assert.deepEqual(read.read(d, new Set(["Note F.md"])).get("Note F.md"), ["left"]);
    assert.equal(f.index.gateStats(d).right.visibleCount, 0);
    assert.equal(f.index.gateStats(d).left.visibleCount, 3);
  } finally { f.close(); }
});
