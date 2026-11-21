/** Saved-link visibility uses real visibility, predicates and lenses with finite cached pair facts. */
import assert from "node:assert/strict";
import test from "node:test";
import {plexViewModules, viewPage} from "./support/plexViewFixture.mjs";

const M = await plexViewModules(["src/ui/linkedNodeVisibility.ts", "src/lens/GraphPredicate.ts", "src/lens/GraphLens.ts", "src/lens/GraphPredicateParser.ts"]);

/** No body/source reader or mutation capability is available to this visibility probe. */
function fixture() {
  const settings = M.migrateAndMergeSettings({}), origin = viewPage("Origin.md"), target = viewPage("Target.md");
  for (const page of [origin, target]) page.file.stat = {mtime: 1, ctime: 1, size: 0};
  let rows = [{page: target, role: "child", relationType: 1, typeDefinition: "children", linkDirection: null}], predicate = null;
  let lenses = M.EMPTY_GRAPH_LENS_SET, reads = 0;
  const index = {plugin: {settings}, isVisiblePage: M.GraphIndex.prototype.isVisiblePage,
    neighbours: (page, role) => {assert.equal(page, origin); reads++; return rows.filter(row => row.role === role);},
    titleFor: page => page.name, explainRelationship: () => ({decisions: []})};
  const engine = new M.GraphPredicateEngine({vault: {getFileByPath: path => path === target.path ? target.file : origin.file},
    metadataCache: {getFileCache: file => ({frontmatter: {Status: file === target.file ? "draft" : "ready"}})}});
  return {origin, target, settings, index,
    rows: value => {rows = value;}, reads: () => reads,
    lens: definitions => {lenses = M.compileGraphLensDefinitions(definitions.map((definition, i) =>
      ({id: String(i), name: String(i), enabled: true, scope: "node", mode: "exclude", ...definition})));},
    filter: expression => {predicate = M.compileGraphPredicate(M.tryParseGraphPredicateExpression(expression).expression);},
    hidden: (center = origin) => M.linkedNodeHidden(index, settings, engine, predicate, lenses, origin, target, center)};
}

test("disabled node types warn for attachments, Markdown, URLs and placeholders without pair reads", () => {
  for (const [key, file, url] of [["showImageAttachments", {extension: "svg"}, null], ["showDocumentAttachments", {extension: "pdf"}, null],
    ["showMediaAttachments", {extension: "mp3"}, null], ["showOtherAttachments", {extension: "zip"}, null],
    ["showPageNodes", {extension: "md"}, null], ["showURLNodes", null, "https://example.com"], ["showVirtualNodes", null, null]]) {
    const f = fixture(); f.target.file = file; f.target.url = url;
    assert.equal(f.hidden(), false); f.settings[key] = false;
    assert.equal(f.hidden(), true, key); assert.equal(f.reads(), 0);
    assert.equal(f.hidden(f.target), false, "The current center remains displayed");
  }
});

test("include/exclude lenses and quick filters combine with live MetadataCache properties", () => {
  const f = fixture();
  f.lens([{expression: 'file.extension == "svg"', mode: "include"}]); assert.equal(f.hidden(), true);
  f.lens([{expression: 'node.label.contains("Target")'}]); assert.equal(f.hidden(), true);
  f.lens([{expression: 'note.Status == "draft"'}]); assert.equal(f.hidden(), true);
  f.lens([{expression: 'note.Status == "draft"', enabled: false}]); assert.equal(f.hidden(), false);
  f.lens([{expression: 'note.Status == "draft"', mode: "style", style: {node: {strokeWidth: 4}}}]); assert.equal(f.hidden(), false);
  f.filter('node.label.contains("Missing")'); assert.equal(f.hidden(), true);
  f.filter('node.label.contains("Target")'); assert.equal(f.hidden(), false);
  f.lens([{expression: 'this.path == "Origin.md"'}]); assert.equal(f.hidden(), true, "this is the real view center");
});

test("actual edge roles, ontology and multi-role admission match scene filtering", () => {
  const f = fixture();
  f.lens([{scope: "edge", expression: 'edge.definition == "children"'}]); assert.equal(f.hidden(), true);
  f.rows([{page: f.target, role: "previous", relationType: 1, typeDefinition: "before", linkDirection: null}]);
  f.lens([{scope: "edge", expression: 'edge.role == "left"'}]); assert.equal(f.hidden(), true, "Previous paints in Left");
  f.rows([{page: f.target, role: "child", relationType: 1, linkDirection: null},
    {page: f.target, role: "parent", relationType: 1, linkDirection: null}]);
  f.lens([{scope: "edge", expression: 'edge.role == "child"'}]); assert.equal(f.hidden(), false, "Parent occurrence remains visible");
});

test("pending publication and invalid selectors are not mistaken for hidden nodes; preferences stay intact", () => {
  const f = fixture(), before = JSON.stringify(f.settings);
  f.rows([]); f.lens([{expression: 'node.label.contains("Target")'}]);
  assert.equal(f.hidden(), false, "No published pair is not proof of filtering");
  f.lens([{expression: 'file.extension == "svg"', mode: "include"}, {expression: 'node.label.contains("Target")', mode: "include"}]);
  f.rows([{page: f.target, role: "child", relationType: 1, linkDirection: null}]); assert.equal(f.hidden(), false, "Include lenses are unioned");
  f.lens([{expression: 'node.kind == "'}]); assert.equal(f.hidden(), false, "Invalid lens follows fail-open rendering");
  assert.equal(JSON.stringify(f.settings), before);
});
