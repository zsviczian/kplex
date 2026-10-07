/** Property URL provenance must survive full-index persistence independently of URL-only caches. */
import assert from "node:assert/strict";
import test from "node:test";
import { browserBundle } from "./support/browserTypeScript.mjs";

const bundle = await browserBundle([
  "src/index/IndexSnapshot.ts", "src/index/GraphState.ts", "src/types.ts",
], { obsidian: "exports.TFile=class TFile {}; exports.TFolder=class TFolder {};" });
let hostYields = 0;
/** The portable fixture supplies real task timers for the legacy host facade's cooperative yield. */
const scope = { setTimeout: (...args) => { hostYields++; return setTimeout(...args); }, clearTimeout };
new Function("window", bundle)(scope); const M = scope.sourceModules;

test("full semantic snapshot preserves frontmatter and inline property URL evidence and origin counts", async () => {
  const root = new (class { constructor() { this.path = ""; this.children = []; } })();
  const app = { vault: { getRoot: () => root, getFileByPath: () => null, getAbstractFileByPath: () => null } };
  const settings = { hierarchy: { hidden: [], parents: [], children: [], leftFriends: [], rightFriends: [], previous: [], next: [] },
    inferAllLinksAsFriends: false, inverseInfer: false, tagStyleList: [], baseNodeStyle: { maxLabelLength: 30 } };
  const state = M.createGraphState(), url = "https://obsidian.md/Slug";
  for (const path of ["Owner.md", "https://obsidian.md", url]) M.addPersistedPageToState(state, {
    path, filePath: null, name: path, url: path.startsWith("https:") ? path : null,
    isFolder: false, isTag: false, mtime: null, aliases: [], tags: [], noteType: null,
    primaryStyleTag: null, styleTags: [], maxLabelLength: 30,
  }, app);
  for (const provenance of [
    { sourceKind: "property-url", definition: "website", fieldName: "Website", rawValue: "https://Obsidian.md/Slug" },
    { sourceKind: "property-url", definition: "resource", fieldName: "Resource", rawValue: url, line: 4, start: 40, end: 64 },
  ]) state.evidence.addDeclaration("Owner.md", url, "child", M.RelationType.INFERRED, M.LinkDirection.FROM, provenance);
  state.evidence.addDeclaration("https://obsidian.md", url, "child", M.RelationType.INFERRED, M.LinkDirection.FROM, { sourceKind: "url-origin" });
  let checked = false; hostYields = 0;
  /** A real elapsed slice exercises task yielding even when this small semantic fixture runs quickly. */
  const current = () => {
    if (!checked) { checked = true; const until = performance.now() + 10; while (performance.now() < until) { /* Consume one real slice. */ } }
    return true;
  };
  assert.equal(await M.finalizeHydratedGraphStateCooperative(state, current, 1), true);
  assert.ok(hostYields > 0, "Finalization uses an actual host task without losing URL provenance");
  const saved = JSON.parse(JSON.stringify(M.serializeGraphState(state, app, settings)));
  assert.equal(M.isPersistedIndexSnapshot(saved), true);
  const restored = M.hydrateGraphState(saved, app);
  const roundtrip = JSON.parse(JSON.stringify(M.serializeGraphState(restored, app, settings)));
  assert.deepEqual(roundtrip.evidence, saved.evidence);
  assert.equal(restored.pages.get(url).url, url);
  assert.equal(restored.pages.get("https://obsidian.md").neighbours.get(url).isChild, true);
  assert.equal(restored.pages.get("Owner.md").neighbours.get(url).isChild, true);
  assert.equal(roundtrip.evidence.filter(item => item.sourceKind === "property-url").length, 2);
});
