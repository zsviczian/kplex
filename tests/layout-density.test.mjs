/** Production density/profile migration and geometry checks; host shells are doubled, layout is real. */
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const temp = mkdtempSync(join(tmpdir(), "kplex-density-"));
process.on("exit", () => rmSync(temp, { recursive: true, force: true }));
await build({
  stdin: { contents: 'export * from "./src/settings"; export * from "./src/ui/layout"; export * from "./src/core/graph/settingsPolicy"; export * from "./src/core/plex/viewPresentation"; export { effectiveViewSettings } from "./src/ui/viewProfile";', resolveDir: process.cwd() },
  outfile: join(temp, "geometry.mjs"), bundle: true, platform: "node", format: "esm",
  plugins: [{ name: "obsidian-boundary", setup(builder) {
    builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: "obsidian", namespace: "double" }));
    builder.onLoad({ filter: /.*/, namespace: "double" }, () => ({ contents: `
      export class App {} export class Modal {} export class Notice {} export class Setting {} export class AbstractInputSuggest {}
      export class PluginSettingTab {} export const getIcon = () => null; export const getIconIds = () => [];
      export const getLanguage = () => "en"; export const Platform = {};
    `, loader: "js" }));
  } }],
});
const geometry = await import(pathToFileURL(join(temp, "geometry.mjs")));
const defaults = geometry.migrateAndMergeSettings(undefined);
/** Make a plain page that retains the actual production style/layout field names. */
function page(name) { return { path: `${name}.md`, name, file: { extension: "md" }, aliases: [], tags: [], styleTags: [], neighbours: new Map() }; }
/** Construct deterministic, named relation groups with enough rows to measure both spacing axes. */
function neighborhood(count = 12) {
  const list = (prefix, length) => Array.from({ length }, (_, n) => ({ page: page(`${prefix}${n}`), role: prefix === "P" ? "parent" : "child", relationType: 1, typeDefinition: "", linkDirection: 0 }));
  return { center: page("Center"), parents: list("P", count), children: list("C", count), leftFriends: list("L", 7), rightFriends: list("R", 7), siblings: list("S", 7) };
}
const index = { titleFor: p => p.name, neighbourCount: () => 0, gateStats: () => ({}), neighbours: () => [], visibleRelationshipsWithin: () => [] };
/** Compare physical whitespace rather than merely checking a different geometry snapshot. */
function gap(a, b, axis) { return Math.abs(a[axis] - b[axis]) - (a[axis === "x" ? "width" : "height"] + b[axis === "x" ? "width" : "height"]) / 2; }
/** Reject intersecting thought/expanded-box rectangles with a small floating-point tolerance. */
function noOverlap(nodes, label) {
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    assert(gap(nodes[i], nodes[j], "x") >= -1e-8 || gap(nodes[i], nodes[j], "y") >= -1e-8,
      `${label}: ${nodes[i].page.path}/${nodes[j].page.path}`);
  }
}
/** Keep the measured main scene sparse enough to isolate each axis from collision re-positioning. */
function sparse() { const n = neighborhood(10); return { ...n, parents: [], leftFriends: n.leftFriends.slice(0, 1), rightFriends: [], siblings: [] }; }

test("old defaults, split density and imports survive migration with one-to-three-column parents", () => {
  const old = { compactingFactor: 1.25, parentColumns: 3, childColumns: 7,
    layoutProfiles: { "tablet:leaf": { compactingFactor: 3.2, parentColumns: 3, childColumns: 6 } } };
  const migrated = geometry.migrateAndMergeSettings(old);
  assert.equal(migrated.horizontalCompactingFactor, 1.25); assert.equal(migrated.compactingFactor, 1.25);
  assert.equal(migrated.parentColumns, 3); assert.equal(migrated.childColumns, 7);
  assert.deepEqual(migrated.layoutProfiles["tablet:leaf"], { compactingFactor: 3.2, horizontalCompactingFactor: 3.2, parentColumns: 3, childColumns: 6 });
  assert.equal(migrated.layoutProfiles["desktop:leaf"].horizontalCompactingFactor, 1.25);
  assert.equal(defaults.layoutProfiles["mobile:sidepanel"].horizontalCompactingFactor, 2.85);
  const split = geometry.migrateAndMergeSettings({ ...old, horizontalCompactingFactor: 3.5,
    layoutProfiles: { "tablet:leaf": { ...old.layoutProfiles["tablet:leaf"], horizontalCompactingFactor: 1.1 } } });
  assert.equal(split.horizontalCompactingFactor, 3.5); assert.equal(split.layoutProfiles["tablet:leaf"].horizontalCompactingFactor, 1.1);
  assert.deepEqual(geometry.migrateAndMergeSettings(JSON.parse(JSON.stringify(split))), split);
  const imported = geometry.importExcaliBrainGraphSettings({ compactingFactor: 1.2, compactView: true, minLinkLength: 30 }, split);
  assert.equal(imported.compactingFactor, 1.2); assert.equal(imported.horizontalCompactingFactor, 1.2);
  assert.deepEqual(imported.layoutProfiles, split.layoutProfiles, "Foreign import must not overwrite K-Plex's local surface profiles");
  assert.equal(geometry.migrateAndMergeSettings({ minLinkLength: "broken" }).minLinkLength, 18);
});

test("axis changes are view-only and selected legacy profiles supply their own horizontal fallback", () => {
  const before = geometry.captureSettingsPolicy(defaults);
  for (const key of ["horizontalCompactingFactor", "compactingFactor", "compactView", "minLinkLength", "parentColumns", "childColumns"]) {
    const effects = geometry.classifySettingsChange(before, geometry.captureSettingsPolicy({ ...defaults, [key]: key === "compactView" ? true : defaults[key] + 0.5 }));
    assert.equal(effects.semanticInvalidation, false); assert.equal(effects.presentationFacets, false); assert.equal(effects.render, true);
  }
  const selected = geometry.selectLayoutProfile({ ...defaults, layoutProfiles: { "tablet:leaf": { compactingFactor: 3, parentColumns: 2, childColumns: 7 } } }, "leaf", { device: "tablet" });
  assert.deepEqual(selected, { compactingFactor: 3, horizontalCompactingFactor: 3, parentColumns: 2, childColumns: 7 });
});

test("effective surface settings preserve selected legacy axis fallback, inheritance and weak-cache identity", () => {
  const legacyProfile = { compactingFactor: 3.1, parentColumns: 2, childColumns: 7 };
  const settings = { ...defaults, horizontalCompactingFactor: 1.2, layoutProfiles: { "desktop:leaf": legacyProfile } };
  const environment = { device: "desktop" };
  const effective = geometry.effectiveViewSettings(settings, "leaf", environment);
  assert.equal(effective.horizontalCompactingFactor, 3.1); assert.equal(effective.compactingFactor, 3.1);
  assert.equal(geometry.effectiveViewSettings(settings, "leaf", environment), effective);
  settings.compactView = true; assert.equal(effective.compactView, true, "Global whitespace controls remain live inherited values");
  assert.equal(legacyProfile.horizontalCompactingFactor, undefined, "The reader must not migrate its caller-owned profile in place");
  settings.layoutProfiles["desktop:leaf"] = { ...legacyProfile, horizontalCompactingFactor: 1.8 };
  const next = geometry.effectiveViewSettings(settings, "leaf", environment);
  assert.notEqual(next, effective); assert.equal(next.horizontalCompactingFactor, 1.8);
  assert.equal(next.compactView, true); assert.equal(next.compactingFactor, 3.1);
});

test("normal compact-off equal-axis layout retains established default physical gaps", () => {
  const scene = geometry.buildScene(sparse(), index, defaults, false);
  const children = scene.nodes.filter(n => n.role === "child");
  assert(Math.abs(gap(children[0], children[1], "x") - 33.75) < 1e-8);
  assert(Math.abs(gap(children[0], children[5], "y") - 24.3) < 1e-8);
  assert(Math.abs(scene.nodes.find(n => n.role === "left").x + 228.375) < 1e-8);
});

test("horizontal density changes columns and labels while vertical density changes rows", () => {
  const scene = settings => geometry.buildScene(sparse(), index, settings, false);
  const looseH = scene({ ...defaults, horizontalCompactingFactor: 1 });
  const denseH = scene({ ...defaults, horizontalCompactingFactor: 4 });
  const looseV = scene({ ...defaults, compactingFactor: 1 });
  const denseV = scene({ ...defaults, compactingFactor: 4 });
  const firstChild = s => s.nodes.find(n => n.role === "child");
  assert.equal(firstChild(looseH).y, firstChild(denseH).y); assert(firstChild(looseH).x < firstChild(denseH).x);
  assert.equal(firstChild(looseV).x, firstChild(denseV).x); assert(firstChild(looseV).y > firstChild(denseV).y);
  assert.equal(geometry.effectiveLabelLimit({ ...defaults, compactingFactor: 4 }, 60), geometry.effectiveLabelLimit(defaults, 60));
  assert(geometry.effectiveLabelLimit({ ...defaults, horizontalCompactingFactor: 4 }, 60) < geometry.effectiveLabelLimit(defaults, 60));
});

test("compact view tightens ordinary gaps and minimum link length changes measurable whitespace", () => {
  const children = settings => geometry.buildScene(sparse(), index, settings, false).nodes.filter(n => n.role === "child");
  const regular = children(defaults), compact = children({ ...defaults, compactView: true });
  assert(gap(compact[0], compact[1], "x") < gap(regular[0], regular[1], "x"));
  assert(gap(compact[0], compact[5], "y") < gap(regular[0], regular[5], "y"));
  assert.deepEqual(compact.map(n => [n.width, n.height]), regular.map(n => [n.width, n.height]), "Compact view must not shrink thought padding");
  const short = children({ ...defaults, minLinkLength: 6 }), long = children({ ...defaults, minLinkLength: 40 });
  assert(Math.abs(gap(short[0], short[1], "x") - 24.3) < 1e-8);
  assert(Math.abs(gap(long[0], long[1], "x") - 57.375) < 1e-8);
  assert(gap(long[0], long[5], "y") > gap(short[0], short[5], "y"));
});

test("expanded child boxes share configured columns, density gaps, sibling scale and exact reserves", () => {
  const expandedIndex = { ...index, neighbours: () => neighborhood(13).children };
  for (const columns of [1, 3, 5, 7]) {
    const settings = { ...defaults, graphDepth: 2, childColumns: columns };
    const box = geometry.expandedMiniLayout(settings, 112, 13);
    assert.equal(box.columns, Math.min(3, columns)); assert.equal(box.rows, Math.ceil(13 / Math.min(3, columns)));
    assert(box.width / box.columns - box.columnGap >= 64);
    assert.equal(geometry.expandedChildReserve(page("P"), expandedIndex, settings, "Center.md"), box.topGap + box.viewportHeight);
    assert.equal(geometry.expandedNodeWidth({ page: page("P"), width: 112, role: "parent" }, expandedIndex, settings, "Center.md"), box.width);
    const scaled = geometry.expandedMiniLayout(settings, 112, 13, 0.5);
    assert.equal(geometry.expandedChildReserve(page("P"), expandedIndex, settings, "Center.md", 0.5), (box.topGap + box.viewportHeight) * 0.5);
    for (const key of ["width", "columnGap", "rowHeight", "topGap", "contentHeight", "viewportHeight"]) assert.equal(scaled[key], box[key] * 0.5);
  }
  const loose = geometry.expandedMiniLayout(defaults, 112, 8);
  assert(geometry.expandedMiniLayout({ ...defaults, compactView: true }, 112, 8).rowHeight < loose.rowHeight);
  assert(geometry.expandedMiniLayout({ ...defaults, minLinkLength: 40 }, 112, 8).topGap > loose.topGap);
});

/** Two heading clusters with actual ordinary and lateral relationship rows; no parser/index substitutes. */
function sectionFixture() {
  const center = sparse();
  const root = { id: "root", parentId: null, childIds: ["nested"], page: page("Heading"), neighborhood: neighborhood(15) };
  const nested = { id: "nested", parentId: "root", childIds: [], page: page("Nested"), neighborhood: neighborhood(8) };
  return { centerNeighborhood: center, sections: [root, nested] };
}

test("expanded scroll viewports and editable areas include actual child-box widths", () => {
  const n = neighborhood(30);
  const expandedIndex = { ...index, neighbours: () => neighborhood(9).children };
  const settings = { ...defaults, graphDepth: 2, horizontalCompactingFactor: 1, compactingFactor: 2 };
  const scene = geometry.buildScene(n, expandedIndex, settings, false);
  for (const [key, role] of [["parent", "parent"], ["child", "child"], ["left", "left"], ["right", "right"], ["sibling", "sibling"]]) {
    const bounds = scene.zoneViewports[key]; assert(bounds, `${key} must overflow this fixture`);
    const area = scene.zoneAreas[key];
    for (const node of scene.nodes.filter(item => item.role === role)) {
      const width = geometry.expandedNodeWidth(node, expandedIndex, settings, n.center.path);
      assert(bounds.left <= node.x - width / 2); assert(bounds.left + bounds.width >= node.x + width / 2);
      assert(area.left <= node.x - width / 2); assert(area.left + area.width >= node.x + width / 2);
    }
  }
});

test("section headings and clusters obey both density axes, spacing targets and exact column settings", () => {
  const expansion = sectionFixture();
  const scene = settings => geometry.buildSectionExpandedScene(expansion, index, settings, new Set(["root"]), false);
  const base = scene(defaults);
  const parentRows = base.nodes.filter(n => n.role === "parent" && n.page.path.startsWith("P"));
  // Two section clusters reuse paths; inspect the finite first cluster's first relation group.
  assert.equal(parentRows.slice(0, 15).filter(n => n.y === parentRows[0].y).length, 2);
  const one = scene({ ...defaults, parentColumns: 1, childColumns: 7 });
  const parents1 = one.nodes.filter(n => n.role === "parent" && n.page.path.startsWith("P"));
  assert.equal(parents1.slice(0, 15).filter(n => n.y === parents1[0].y).length, 1);
  const rows = one.nodes.filter(n => n.role === "child" && n.page.path.startsWith("C"));
  assert.equal(rows.slice(10, 25).filter(n => n.y === rows[10].y).length, 7);
  const heading = s => s.nodes.find(n => n.page.path === "Heading.md");
  const nested = s => s.nodes.find(n => n.page.path === "Nested.md");
  const horizontal = scene({ ...defaults, horizontalCompactingFactor: 4 });
  assert(nested(horizontal).x - heading(horizontal).x < nested(base).x - heading(base).x);
  const dense = scene({ ...defaults, compactView: true });
  assert(nested(dense).y - heading(dense).y < nested(base).y - heading(base).y);
  const spaced = scene({ ...defaults, minLinkLength: 40 });
  assert(nested(spaced).y - heading(spaced).y > nested(base).y - heading(base).y);
});

test("independent dense/sparse axes keep zone-clipped thoughts and expanded boxes separate", () => {
  const n = neighborhood(15);
  const children = neighborhood(9).children;
  const expandedIndex = { ...index, neighbours: () => children };
  for (const node of [n.center, ...Object.values(n).filter(Array.isArray).flat().map(item => item.page)]) node.name += " long meaningful knowledge title".repeat(8);
  for (const graphDepth of [1, 2]) for (const h of [0.75, 4]) for (const v of [0.75, 4]) for (const compactView of [false, true])
    for (const wrapNodeLabels of [false, true]) for (const minLinkLength of [6, 40]) for (const editor of [false, true]) {
    const settings = { ...defaults, graphDepth, horizontalCompactingFactor: h, compactingFactor: v, compactView, parentColumns: 2, childColumns: 7,
      wrapNodeLabels, minLinkLength, baseNodeStyle: { ...defaults.baseNodeStyle, maxLabelLength: 120, maxWidth: 800 } };
    const scene = geometry.buildScene(n, expandedIndex, settings, false, editor ? { width: 900, height: 600 } : undefined);
    const occupied = [...scene.nodes];
    if (graphDepth === 2) for (const node of scene.nodes) {
      if (node.role === "center") continue;
      const box = geometry.expandedMiniLayout(settings, node.width, children.length, node.role === "sibling" ? geometry.siblingScale(settings) : 1);
      occupied.push({ ...node, width: box.width, height: box.viewportHeight,
        y: node.y + node.height / 2 + box.topGap + box.viewportHeight / 2 });
    }
    const clipped = occupied.flatMap(node => {
      const panel = scene.zoneViewports[node.role];
      if (!panel) return [node];
      const top = Math.max(node.y - node.height / 2, panel.top), bottom = Math.min(node.y + node.height / 2, panel.top + panel.height);
      return bottom > top ? [{ ...node, y: (top + bottom) / 2, height: bottom - top }] : [];
    });
    noOverlap(clipped, `depth${graphDepth}/h${h}/v${v}/compact${compactView}/wrap${wrapNodeLabels}/gap${minLinkLength}/editor${editor}`);
  }
});


test("section clusters reserve actual wrapped row extents across independent axis and spacing extremes", () => {
  const expansion = sectionFixture();
  for (const section of expansion.sections) for (const items of [section.neighborhood.parents, section.neighborhood.children, section.neighborhood.leftFriends, section.neighborhood.rightFriends]) {
    for (const relation of items) relation.page.name += " detailed related knowledge".repeat(8);
  }
  for (const h of [0.75, 4]) for (const v of [0.75, 4]) for (const compactView of [false, true]) for (const minLinkLength of [6, 40]) {
    const settings = { ...defaults, horizontalCompactingFactor: h, compactingFactor: v, compactView, minLinkLength, parentColumns: 2, childColumns: 7,
      wrapNodeLabels: true, baseNodeStyle: { ...defaults.baseNodeStyle, maxLabelLength: 120, maxWidth: 800 } };
    const scene = geometry.buildSectionExpandedScene(expansion, index, settings, new Set(["root"]), false);
    noOverlap(scene.nodes.slice(12), `section/h${h}/v${v}/compact${compactView}/gap${minLinkLength}`);
  }
});


/** Read allocated horizontal margins independently from offscreen scroll-content positions. */
function areaSeams(scene) {
  const parent = scene.zoneAreas.parent, left = scene.zoneAreas.left, right = scene.zoneAreas.right, sibling = scene.zoneAreas.sibling;
  return { parentWidth: parent.width, right: right.left - parent.left - parent.width,
    left: parent.left - left.left - left.width, sibling: sibling.left - right.left - right.width };
}

test("parent columns one-to-three govern density-weighted lateral area boundaries", () => {
  const n = neighborhood(15);
  for (const parentColumns of [1, 2, 3]) for (const horizontalCompactingFactor of [1, 2, 3, 3.5, 4]) {
    const settings = { ...defaults, parentColumns, horizontalCompactingFactor };
    const scene = geometry.buildScene(n, index, settings, false);
    const seams = areaSeams(scene);
    const desired = geometry.lateralAreaGap(settings, seams.parentWidth);
    assert(Math.abs(seams.right - desired) < 1e-8, `right parent${parentColumns}/H${horizontalCompactingFactor}`);
    assert(Math.abs(seams.left - desired) < 1e-8);
    assert(Math.abs(seams.sibling - desired) < 1e-8);
    if (horizontalCompactingFactor < 3) assert(seams.right > 0);
    if (horizontalCompactingFactor === 3) assert.equal(seams.right, 0);
    if (horizontalCompactingFactor === 4) assert(Math.abs(seams.right + seams.parentWidth * 0.05) < 1e-8);
    const parents = scene.nodes.filter(node => node.role === "parent");
    assert.equal(parents.filter(node => node.y === parents[0].y).length, parentColumns);
  }
  const x = parentColumns => geometry.buildScene(n, index, { ...defaults, parentColumns }, false).nodes.find(node => node.role === "left").x;
  assert(x(1) > x(2)); assert(x(2) > x(3));
  const siblingsOnly = { ...n, rightFriends: [] };
  const scene = geometry.buildScene(siblingsOnly, index, { ...defaults, horizontalCompactingFactor: 3 }, false);
  assert(Math.abs(scene.zoneAreas.sibling.left - scene.zoneAreas.parent.left - scene.zoneAreas.parent.width) < 1e-8);
});

test("child columns, child titles, row count and vertical density never move lateral horizontal anchors", () => {
  const n = neighborhood(15);
  const expandedIndex = { ...index, neighbours: () => neighborhood(8).children };
  for (const graphDepth of [1, 2]) for (const parentColumns of [1, 2, 3]) for (const h of [1, 3, 4]) {
    let reference;
    for (const childColumns of [1, 2, 3, 5, 7]) for (const v of [0.75, 4]) for (const childCount of [0, 2, 30]) {
      const changed = { ...n, children: neighborhood(childCount).children };
      for (const relation of changed.children) relation.page.name += " a very wide child title".repeat(8);
      const settings = { ...defaults, graphDepth, parentColumns, childColumns, compactingFactor: v, horizontalCompactingFactor: h };
      const scene = geometry.buildScene(changed, expandedIndex, settings, false);
      const result = {
        positions: scene.nodes.filter(node => ["left", "right", "sibling"].includes(node.role)).map(node => [node.role, node.page.path, node.x]),
        bounds: ["parent", "left", "right", "sibling"].map(key => [key, scene.zoneAreas[key].left, scene.zoneAreas[key].width]),
      };
      reference ??= result;
      assert.deepEqual(result, reference, `depth${graphDepth}/parent${parentColumns}/H${h}/child${childColumns}/V${v}/count${childCount}`);
    }
  }
});

test("wide parent/mini/editor envelopes cap margin overlap to preserve actual thought bodies", () => {
  const n = neighborhood(12), expandedIndex = { ...index, neighbours: () => neighborhood(8).children };
  for (const relation of n.parents) relation.page.name += " long meaningful parent topic".repeat(20);
  for (const parentColumns of [1, 2, 3]) for (const graphDepth of [1, 2]) {
    const settings = { ...defaults, graphDepth, parentColumns, horizontalCompactingFactor: 4, wrapNodeLabels: true,
      baseNodeStyle: { ...defaults.baseNodeStyle, maxLabelLength: 240, maxWidth: 1000 } };
    const scene = geometry.buildScene(n, expandedIndex, settings, false, { width: 900, height: 600 });
    const seams = areaSeams(scene);
    assert(seams.right >= -seams.parentWidth * 0.05 - 1e-8);
    assert(seams.right <= 1e-8, "body-safe dense areas still touch or overlap");
    const parents = scene.nodes.filter(node => node.role === "parent");
    const right = scene.nodes.filter(node => node.role === "right");
    for (const parent of parents) for (const lateral of right) assert(gap(parent, lateral, "x") >= 4 - 1e-8);
    const center = scene.nodes.find(node => node.role === "center");
    for (const lateral of right) assert(gap(center, lateral, "x") >= 4 - 1e-8);
  }
});


test("section child columns repack below lateral strips without changing heading or lateral x", () => {
  const expansion = sectionFixture();
  for (const parentColumns of [1, 2, 3]) for (const h of [1, 3, 4]) {
    let reference;
    for (const childColumns of [1, 2, 3, 5, 7]) for (const v of [0.75, 4]) {
      const settings = { ...defaults, parentColumns, childColumns, horizontalCompactingFactor: h, compactingFactor: v };
      const scene = geometry.buildSectionExpandedScene(expansion, index, settings, new Set(["root"]), false);
      const positions = scene.nodes.filter(node => ["left", "right", "sibling"].includes(node.role) || ["Heading.md", "Nested.md"].includes(node.page.path))
        .map(node => [node.role, node.page.path, node.x]);
      reference ??= positions; assert.deepEqual(positions, reference, `parent${parentColumns}/H${h}/child${childColumns}`);
      noOverlap(scene.nodes.slice(12), `sectionchild${childColumns}`);
    }
  }
});


test("parent scroll boxes fit canonical expanded row pitches independently from child-column controls", () => {
  const n = neighborhood(30), expandedIndex = { ...index, neighbours: () => neighborhood(9).children };
  let reference;
  for (const childColumns of [1, 2, 3, 7]) {
    const settings = { ...defaults, graphDepth: 2, parentColumns: 3, childColumns, horizontalCompactingFactor: 4 };
    const scene = geometry.buildScene(n, expandedIndex, settings, false), panel = scene.zoneViewports.parent;
    assert(panel);
    const bounds = [panel.left, panel.width]; reference ??= bounds; assert.deepEqual(bounds, reference);
    assert.equal(panel.left, scene.zoneAreas.parent.left); assert.equal(panel.width, scene.zoneAreas.parent.width);
    const row = scene.nodes.filter(node => node.role === "parent").slice(0, 3);
    const { horizontal, spacing } = geometry.spacingPolicy(settings);
    const footprint = row.reduce((sum, node) => sum + geometry.expandedNodeWidth(node, expandedIndex, settings, n.center.path), 0) + 2 * 50 * horizontal * spacing;
    assert(footprint <= panel.width - 48 + 1e-8, "Filtered row pitches must fit inside the same padded parent viewport");
  }
});

/** Typography must survive legacy settings while keeping layout geometry large enough for the painted font. */
test("global font size migrates, stays presentation-only and grows node/expanded row geometry", () => {
  assert.equal(defaults.baseFontSize,12.4);
  assert.equal(geometry.migrateAndMergeSettings({baseFontSize:"broken"}).baseFontSize,12.4);
  assert.equal(geometry.migrateAndMergeSettings({baseFontSize:100}).baseFontSize,28);
  assert.equal(geometry.migrateAndMergeSettings({baseFontSize:0}).baseFontSize,8);
  assert.equal(geometry.nodeLabelFontSize(20,false,16),16);
  assert.equal(geometry.nodeLabelFontSize(30,true,12.4),21.599999999999998);
  const effects=geometry.classifySettingsChange(geometry.captureSettingsPolicy(defaults),geometry.captureSettingsPolicy({...defaults,baseFontSize:24}));
  assert.equal(effects.semanticInvalidation,false);assert.equal(effects.presentationFacets,false);assert.equal(effects.render,true);
  const base=geometry.buildScene(sparse(),index,defaults,false),large=geometry.buildScene(sparse(),index,{...defaults,baseFontSize:28},false);
  for(const node of large.nodes){assert(node.height>=geometry.nodeLabelFontSize(node.style.fontSize,node.role==="center",28)*1.15);}
  assert(large.nodes.find(n=>n.role==="child").height>base.nodes.find(n=>n.role==="child").height);
  assert(geometry.expandedMiniLayout({...defaults,baseFontSize:28},200,8).rowHeight>geometry.expandedMiniLayout(defaults,200,8).rowHeight);
  noOverlap(large.nodes,"large-font");
  const smallStyle=geometry.buildScene(sparse(),index,{...defaults,baseFontSize:28,wrapNodeLabels:true,baseNodeStyle:{...defaults.baseNodeStyle,fontSize:8},centralNodeStyle:{...defaults.centralNodeStyle,fontSize:8}},false);
  for(const node of smallStyle.nodes){assert(node.height>=geometry.nodeLabelFontSize(node.style.fontSize,node.role==="center",28)*2.3+8,"Clamped small style must fit both painted line boxes");}
  noOverlap(smallStyle.nodes,"small-style-large-base-font");
});
