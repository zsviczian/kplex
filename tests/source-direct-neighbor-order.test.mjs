/**
 * SI4 direct-neighbor encounter-order proof. Fresh full GraphBuilder and GraphIndex remain the
 * semantic/sorting oracle. V4 exercises the private authenticated phase-order reader through the
 * existing canonical compiler; v2/v3 cases remain counterexamples. Equal title keys are supplied
 * explicitly. Native MetadataCache timing/currentness remains outside this portable evidence.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { M, settings, runtime, policy, collect } from "./support/cachedSourceFixture.mjs";
import { ref } from "./support/contributorCatalogFixture.mjs";
import { loadPortableModules } from "./support/portableTypeScript.mjs";
import { titleFixture } from "./support/urlTitleFixture.mjs";
import { fullTitleIndex } from "./support/selectedTitleFixture.mjs";
import { fullCenterIndex, centerGateSettings } from "./support/requestedCenterGateFixture.mjs";
import { guardDegreeReuse } from "./support/candidateDegreeFixture.mjs";

const { exports: { LinkDirection } } = loadPortableModules(["src/core/graph/relations.ts"]);

const roles = ["parent", "child", "left", "right", "previous", "next"];
const orders = ["name-asc", "name-desc", "modified-asc", "modified-desc", "created-asc", "created-desc", "connections-asc", "connections-desc"];

/** Supply the assumed equal comparator input, without reading or implementing presentation metadata. */
function equalTitle() { return "Tie"; }

/** Exact unresolved endpoint input; neither SourceId nor a physical path is derived from its ID. */
function ghost(id) { return { id, kind: "unresolved", state: "unresolved", semanticPath: id }; }

/** Fixture-only native resolution setup, performed before acquisition and every no-IO guard. */
function resolveFiles(f) {
  for (const file of f.files.values()) f.resolutions.set(file.basename, file.path);
}

/**
 * Snapshot the actual center map, public direct-role lists and canonical pair decisions. Keep raw
 * order separate from within-pair evidence order. No sibling lists, top-N or alternate classifier.
 */
function observeCenter(index, center) {
  index.titleFor = equalTitle;
  const page = index.get(center.semanticPath);
  assert(page, `The full/cached compiler must actually materialize ${center.semanticPath}`);
  const raw = [...page.neighbours].map(
    /** Copy flags, not a graph or retained mutable page reference. */
    ([path, { target, ...flags }]) => ({ path, ...flags, degree: target.neighbours.size }),
  );
  const views = Object.fromEntries(roles.map(
    /** GraphIndex owns both classification and the final stable sort. */
    role => [role, index.neighbours(page, role).map(/** Extract the already-sorted production result. */ item => item.page.path)],
  ));
  const decisions = new Map(index.state.evidence.from(page.path).map(
    /** Precedence is queried from the canonical owner, not inferred from the final role flags. */
    ({ targetPath, evidence }) => [targetPath, M.applyOntologyPrecedence(evidence)],
  ));
  return { raw, views, decisions };
}

/** Return exact raw-map iteration order, including hidden/structural entries, for assertions only. */
function rawPaths(observation) { return observation.raw.map(/** Keep raw map order unchanged. */ item => item.path); }

/**
 * Capture original family payloads and existing acquisition coordinates before settings-only work.
 * Separate fixtures have independent lifecycle/head nonces; those are deliberately not equated.
 */
async function neutralInputs(f) {
  const sources = new Map();
  for (const id of f.requests.keys()) {
    const families = {};
    for (const family of ["metadata", "values", "resolution", "body-urls"]) families[family] = await f.facts(id, family);
    sources.set(id, families);
  }
  const sourceRows = new Map();
  for (const page of f.catalog.state.pages.values()) for (const row of JSON.parse(page.data)) {
    if (row.kind === "source") sourceRows.set(row.head.sourceId, {
      source: row.source, order: row.order, markdownOrdinal: row.markdownOrdinal,
    });
  }
  return { sources, structure: f.structure, sourceRows };
}

/**
 * Run independently owned production full and cached indexes once. An optional explicit request
 * permutation is a diagnostic input to the unchanged canonical replay, NOT an authenticated order
 * result. Never use the cached selection as the full oracle's input. All fixtures/readers retire.
 */
async function compareOrder(configure, options = {}) {
  const { center = ref("Center.md"), version = 4, semantic = settings, view = {}, inspectInputs = false,
    diagnosticSources } = options;
  const f = await titleFixture(configure, version);
  let full, cached, ordered, diagnostic, check;
  try {
    const presentation = centerGateSettings({ showFolderNodes: false, ...view });
    full = await fullTitleIndex(f, { ...semantic, ...presentation });
    const fullResult = observeCenter(full, center);
    const inputs = inspectInputs ? await neutralInputs(f) : undefined;
    check = guardDegreeReuse(f);
    const entities = { entity: /** Resolve only the exact supplied entity identity. */ input => f.entities.get(input.id) };
    const result = await new M.CachedRequestedNeighborhoodReader(f.port, f.discovery, f.capture, entities)
      .prepare({ kind: "neighborhood", center }, policy({ settings: semantic }), runtime());
    assert.equal(result.outcome, "ready", JSON.stringify(result));
    cached = await fullCenterIndex(M, f, result.preparation.compilation, semantic, presentation);
    const cachedResult = observeCenter(cached, center);
    let orderedResult;
    if (version === 4) {
      const prepared = await new M.CachedRequestedDirectOrderReader(f.port, f.discovery, f.capture, entities,
        { isCurrent: /** Portable tests explicitly stand in for the still-missing native host-order proof. */ () => true })
        .prepare({ kind: "direct-order", center }, policy({ settings: semantic }), runtime());
      assert.equal(prepared.outcome, "ready", JSON.stringify(prepared));
      ordered = await fullCenterIndex(M, f, prepared.preparation.compilation, semantic, presentation);
      orderedResult = observeCenter(ordered, center);
      const withoutDegree = snapshot => snapshot.raw.map(({ degree: _degree, ...item }) => item);
      assert.deepEqual(withoutDegree(orderedResult), withoutDegree(fullResult), "V4 raw direct-neighbor order must match the fresh full builder");
      assert.deepEqual(orderedResult.views, fullResult.views, "Equal-key visible lists must preserve the full builder's stable encounter order");
    }
    let diagnosticResult;
    if (diagnosticSources) {
      // This deliberately does not mint/widen any certificate or claim selected-head finality.
      const requests = diagnosticSources.map(
        /** Supply a named original request, never manufacture ownership from a NodeId. */
        id => {
          const request = f.requests.get(id); assert(request); return request;
        });
      const prepared = await new M.CachedSourceSemanticReader(f.port)
        .prepare(requests, policy({ settings: semantic }), entities, runtime(), f.structure);
      assert.equal(prepared.outcome, "ready", JSON.stringify(prepared));
      diagnostic = await fullCenterIndex(M, f, prepared.compilation, semantic, presentation);
      diagnosticResult = observeCenter(diagnostic, center);
    }
    return { full: fullResult, cached: cachedResult, ordered: orderedResult, diagnostic: diagnosticResult, inputs };
  } finally {
    diagnostic?.destroy(); ordered?.destroy(); cached?.destroy(); full?.destroy();
    try { check?.(); } finally { f.close(); }
  }
}

test("direct-order production path stays non-ready without a native host-order finality capability", async () => {
  const f = await titleFixture(hostBeforeMarkdown, 4);
  try {
    const coordinate = await f.discovery.discoverDirectOrder({ kind: "neighborhood", endpoints: [ref("Center.md")] });
    assert.notEqual(coordinate.outcome, "ready"); assert.equal(coordinate.reason, "host-catalog-stale");
    assert(!("resolvedSourceIds" in coordinate)); assert(!("unresolvedSourceIds" in coordinate));
    const result = await new M.CachedRequestedDirectOrderReader(f.port, f.discovery, f.capture,
      { entity: input => f.entities.get(input.id) }).prepare({ kind: "direct-order", center: ref("Center.md") }, policy(), runtime());
    assert.notEqual(result.outcome, "ready"); assert.equal(result.reason, "host-catalog-stale");
    assert(!("preparation" in result)); assert(!("certificate" in result));
  } finally { f.close(); }
});

test("v4 direct-order certifies a relation-free center without inventing a source-order prefix", async () => {
  const result = await compareOrder(
    /** A lone document has structural identity/folder facts but no selected relationship contributor. */
    f => { f.add("Center.md", ""); resolveFiles(f); });
  assert.deepEqual(result.ordered.raw, result.full.raw);
  for (const role of roles) assert.deepEqual(result.ordered.views[role], result.full.views[role]);
});

/** A's later Markdown declaration and B's earlier global-host declaration have equal target degrees. */
function hostBeforeMarkdown(f) {
  const a = f.add("A.md", "", { Children: "[[Center]]" });
  const b = f.add("B.md", ""); f.add("Center.md", ""); resolveFiles(f);
  assert.equal(a.stat.mtime, b.stat.mtime, "The modified comparator receives equal inputs");
  assert.equal(a.stat.ctime, b.stat.ctime, "The created comparator receives equal inputs");
  f.app.metadataCache.resolvedLinks["B.md"] = { "Center.md": 1 };
}

for (const nodeSortOrder of orders) {
  test(`full host-before-Markdown encounter survives equal ${nodeSortOrder} keys`,
    /** Test every production comparator's stable fallback; no expected sorter is substituted. */
    async () => {
      const result = await compareOrder(hostBeforeMarkdown, { view: { nodeSortOrder },
        diagnosticSources: ["A.md", "B.md", "Center.md"] });
      assert.deepEqual(rawPaths(result.full), ["folder:/", "B.md", "A.md"]);
      assert.deepEqual(result.full.views.parent, ["B.md", "A.md"]);
      assert.deepEqual(result.cached.views.parent, ["A.md", "B.md"]);
      assert.deepEqual(result.diagnostic.views.parent, ["A.md", "B.md"], "Markdown order alone does not repair global phases");
      for (const snapshot of [result.full, result.cached]) {
        assert.deepEqual(snapshot.raw.filter(/** The center's structural parent is not a tied document candidate. */ item => item.path !== "folder:/")
          .map(/** Observe actual production target-map cardinalities. */ item => item.degree), [2, 2]);
      }
    });
}

for (const version of [2, 3]) for (const family of ["resolved", "unresolved"]) {
  test(`v${version} ${family} outer-map permutations lose order with identical acquired payloads`,
    /** Independently clean static fixtures; this does not claim silent native host mutations occur. */
    async () => {
      const center = family === "resolved" ? ref("Center.md") : ghost("Ghost");
      /** Change only the whole-map owner enumeration, not any owner-local record or inventory. */
      function configure(ownerOrder) {
        return /** Install only this fixture's explicit host-owner permutation. */ f => {
          f.add("A.md", ""); f.add("B.md", "");
          if (family === "resolved") f.add("Center.md", "");
          for (const owner of ownerOrder) f.app.metadataCache[`${family}Links`][owner] = { [center.semanticPath]: 1 };
        };
      }
      const ab = await compareOrder(configure(["A.md", "B.md"]), { center, version, inspectInputs: true });
      const ba = await compareOrder(configure(["B.md", "A.md"]), { center, version, inspectInputs: true });
      assert.deepEqual(ab.inputs, ba.inputs, "Original source payloads, structural facts and v3 ordinals do not encode the missing permutation");
      assert.deepEqual(ab.full.views.parent, ["A.md", "B.md"]);
      assert.deepEqual(ba.full.views.parent, ["B.md", "A.md"]);
      assert.deepEqual(ab.cached.views.parent, ["A.md", "B.md"]);
      assert.deepEqual(ba.cached.views.parent, ["A.md", "B.md"]);
    });
}

test("resolved global phase precedes every unresolved owner, not just that owner's unresolved links",
  /** An outgoing unresolved and incoming resolved link share the center's lateral tie list. */
  async () => {
    const result = await compareOrder(
      /** Center precedes B in both inventories; the host subphase order remains independent. */
      f => {
        f.add("Center.md", ""); f.add("B.md", "");
        f.app.metadataCache.unresolvedLinks["Center.md"] = { Ghost: 1 };
        f.app.metadataCache.resolvedLinks["B.md"] = { "Center.md": 1 };
      }, { semantic: { ...settings, inferAllLinksAsFriends: true } });
    assert.deepEqual(result.full.views.left, ["B.md", "Ghost"]);
    assert.deepEqual(result.cached.views.left, ["Ghost", "B.md"]);
  });

for (const family of ["resolved", "unresolved"]) {
  test(`one owner's ${family} target enumeration is preserved by original-family replay`,
    /** Numeric-looking unresolved keys also follow the host's actual own-property enumeration. */
    async () => {
      const result = await compareOrder(
        /** Fixture properties are inserted deliberately; no lexical or filename sort is used. */
        f => {
          f.add("Center.md", "");
          if (family === "resolved") {
            f.add("A.md", ""); f.add("B.md", "");
            f.app.metadataCache.resolvedLinks["Center.md"] = { "B.md": 3, "A.md": 1 };
          } else f.app.metadataCache.unresolvedLinks["Center.md"] = { "10": 1, "2": 1, Z: 1 };
        }, { inspectInputs: true });
      const expected = family === "resolved" ? ["B.md", "A.md"] : ["2", "10", "Z"];
      assert.deepEqual(result.full.views.child, expected);
      assert.deepEqual(result.cached.views.child, expected);
      assert.deepEqual(result.inputs.sources.get("Center.md").resolution.filter(/** Select original aggregate records, not reference bindings. */ item => item.kind === "host-link")
        .map(/** Preserve the acquisition's own target enumeration. */ item => item.target), expected);
    });
}

test("configured-field reconciliation reorders declarations inside a pair, never pair births",
  /** Physical Later is first, although the policy gives Earlier the first evidence position. */
  async () => {
    const semantic = { ...settings, hierarchy: { ...settings.hierarchy, children: ["Earlier", "Later", "Earlier"] } };
    const result = await compareOrder(
      /** Duplicate exact assignments must retain multiplicity without adding neighbor entries. */
      f => {
        f.add("Center.md", "", { Later: ["[[B]]", "[[B]]", "[[A]]"], Earlier: "[[B]]" });
        f.add("A.md", ""); f.add("B.md", ""); resolveFiles(f);
      }, { semantic });
    for (const snapshot of [result.full, result.cached]) {
      assert.deepEqual(snapshot.views.child, ["B.md", "A.md"]);
      assert.deepEqual(snapshot.decisions.get("B.md").map(/** Expose within-pair configured-field order separately from raw map order. */ item => item.evidence.fieldName), ["Earlier", "Earlier", "Later"]);
      assert.equal(snapshot.raw.filter(/** Count entries for one exact target. */ item => item.path === "B.md").length, 1);
    }
  });

test("a later frontmatter winner does not move an earlier conflicting inline pair",
  /** YAML on the opposite endpoint suppresses inline role evidence, not its original pair position. */
  async () => {
    const result = await compareOrder(
      /** A's inline pair is born before B; Center supplies the eventual winning role last. */
      f => {
        f.add("A.md", "Friends:: [[Center]]\nFriends:: [[Center]]");
        f.add("B.md", "", { Children: "[[Center]]" });
        f.add("Center.md", "", { Parent: "[[A]]" }); resolveFiles(f);
      });
    for (const snapshot of [result.full, result.cached]) {
      assert.deepEqual(snapshot.views.parent, ["A.md", "B.md"]);
      const decisions = snapshot.decisions.get("A.md");
      assert.equal(decisions.filter(/** Retain conflicting inline multiplicity even after suppression. */ item => item.evidence.sourceKind === "inline-ontology" && !item.active).length, 2);
      assert.equal(decisions.filter(/** Observe the opposite endpoint's winning declaration. */ item => item.evidence.sourceKind === "frontmatter-ontology" && item.active).length, 1);
    }
  });

test("opposite hidden evidence can establish birth order but supplies no reverse relation",
  /** A later ordinary declaration shares the early hidden pair; HiddenOnly has no reverse evidence. */
  async () => {
    const result = await compareOrder(
      /** The center's explicit A declaration is last, but A's unordered pair already exists. */
      f => {
        f.add("A.md", "", { Hidden: "[[Center]]" });
        f.add("HiddenOnly.md", "", { Hidden: "[[Center]]" });
        f.add("B.md", "", { Children: "[[Center]]" });
        f.add("Center.md", "", { Parent: "[[A]]", Hidden: "[[LocalHidden]]" });
        f.add("LocalHidden.md", ""); resolveFiles(f);
      });
    for (const snapshot of [result.full, result.cached]) {
      assert.deepEqual(rawPaths(snapshot), ["folder:/", "A.md", "B.md", "LocalHidden.md"]);
      assert.deepEqual(snapshot.views.parent, ["A.md", "B.md"]);
      assert(!snapshot.decisions.has("HiddenOnly.md"));
      assert.equal(snapshot.raw.find(/** Inspect the center-owned hidden entry, not its nonexistent inverse. */ item => item.path === "LocalHidden.md").isHidden, true);
      assert(!Object.values(snapshot.views).flat().includes("LocalHidden.md"));
    }
  });

for (const inferAllLinksAsFriends of [false, true]) for (const inverseInfer of [false, true]) {
  test(`reciprocal pairs retain their first encounter under inference ${inferAllLinksAsFriends}/${inverseInfer}`,
    /** Both directions use one unordered pair, regardless of aggregate occurrence counts. */
    async () => {
      const semantic = { ...settings, inferAllLinksAsFriends, inverseInfer };
      const result = await compareOrder(
        /** Actual outer-map order differs from the acquired owners' structural order. */
        f => {
          f.add("A.md", ""); f.add("B.md", ""); f.add("Center.md", "");
          f.app.metadataCache.resolvedLinks["B.md"] = { "Center.md": 7 };
          f.app.metadataCache.resolvedLinks["A.md"] = { "Center.md": 2 };
          f.app.metadataCache.resolvedLinks["Center.md"] = { "A.md": 3, "B.md": 4 };
        }, { semantic });
      assert.deepEqual(result.full.views.left, ["B.md", "A.md"]);
      assert.deepEqual(result.cached.views.left, ["A.md", "B.md"]);
      for (const snapshot of [result.full, result.cached]) for (const path of ["A.md", "B.md"]) {
        assert.equal(snapshot.raw.filter(/** Duplicate aggregate occurrences must not duplicate the neighbor. */ item => item.path === path).length, 1);
        assert.equal(snapshot.decisions.get(path).length, 2);
        assert.equal(snapshot.raw.find(/** Read the actual combined direction for the exact reciprocal target. */ item => item.path === path).direction, LinkDirection.BOTH);
      }
    });
}

for (const showInferredNodes of [false, true]) {
  test(`image-only suppression preserves a surviving pair's birth, with inferred visibility ${showInferredNodes}`,
    /** Removing the first host declaration is not removing/reinserting a still-supported bucket. */
    async () => {
      const result = await compareOrder(
        /** B is born before A in host maps; its surviving explicit declaration occurs after A. */
        f => {
          f.add("Center.md", "", { Image: ["[[B]]", "[[Gone]]"], Children: ["[[A]]", "[[B]]"] });
          for (const name of ["A", "B", "Gone", "Inferred"]) f.add(`${name}.md`, "");
          resolveFiles(f);
          f.app.metadataCache.resolvedLinks["Center.md"] = { "B.md": 1, "A.md": 1, "Gone.md": 1, "Inferred.md": 1 };
        }, { semantic: { ...settings, nodeImageProperty: "Image" }, view: { showInferredNodes } });
      const expected = ["B.md", "A.md", ...(showInferredNodes ? ["Inferred.md"] : [])];
      for (const snapshot of [result.full, result.cached]) {
        assert.deepEqual(snapshot.views.child, expected);
        assert.deepEqual(rawPaths(snapshot), ["folder:/", "B.md", "A.md", "Inferred.md"]);
        assert.deepEqual(snapshot.decisions.get("B.md").map(/** Show that image suppression removed the earlier host declaration. */ item => item.evidence.sourceKind), ["frontmatter-ontology"]);
        assert(!snapshot.decisions.has("Gone.md"));
      }
    });
}

test("structural folder order is sufficient for folder children, independently of v3 Markdown order",
  /** Structural records must stay in their own committed sequence when Markdown owners are reordered. */
  async () => {
    const result = await compareOrder(
      /** The root's physical children are B,A; the Markdown inventory explicitly returns A,B. */
      f => {
        const b = f.add("B.md", ""), a = f.add("A.md", "");
        f.app.vault.getMarkdownFiles = /** Supply an explicit host inventory distinct from structure. */ () => [a, b];
      }, { center: ref("folder:/", "container", ""), inspectInputs: true });
    assert.deepEqual(result.full.views.child, ["B.md", "A.md"]);
    assert.deepEqual(result.cached.views.child, ["B.md", "A.md"]);
    assert.equal(result.inputs.sourceRows.get("B.md").order, 0);
    assert.equal(result.inputs.sourceRows.get("B.md").markdownOrdinal, 1);
  });

test("structural tag memberships retain file encounter and duplicate evidence without duplicate neighbors",
  /** Canonical tag expansion/deduplication, not a replacement tag classifier, supplies both maps. */
  async () => {
    const result = await compareOrder(
      /** Repeated leaf memberships are genuine separate declarations with one neighbor per file. */
      f => {
        f.add("B.md", ""); f.add("A.md", "");
        f.metadata.get("B.md").hostTags = ["#project/nested", "#project/nested"];
        f.metadata.get("A.md").hostTags = ["#project/nested"];
      }, { center: ref("tag:project/nested", "tag") });
    for (const snapshot of [result.full, result.cached]) {
      assert.deepEqual(snapshot.views.child, ["B.md", "A.md"]);
      assert.deepEqual(rawPaths(snapshot), ["tag:project", "B.md", "A.md"]);
      assert.equal(snapshot.decisions.get("B.md").length, 2);
      assert.equal(snapshot.decisions.get("tag:project").length, 1);
    }
  });

test("v3 Markdown order can repair a Markdown-only diagnostic, but structural source order cannot",
  /** This is a sufficiency characterization for one family, not a new authenticated replay route. */
  async () => {
    const result = await compareOrder(
      /** Stack-based structural traversal encounters the root owner before the nested owner. */
      f => {
        const a = f.add("Nested/A.md", "Previous:: [[Center]]");
        const b = f.add("B.md", "Previous:: [[Center]]"), center = f.add("Center.md", "");
        resolveFiles(f);
        const root = f.app.vault.getRoot(), folder = new window.SourceTestFolder();
        folder.path = folder.name = "Nested"; folder.parent = root; folder.children = [a]; a.parent = folder;
        root.children = [folder, b, center]; f.app.vault.getRoot = /** Expose the deliberately nested structural fixture. */ () => root;
      }, { diagnosticSources: ["Nested/A.md", "B.md", "Center.md"], inspectInputs: true });
    assert.deepEqual(result.full.views.next, ["Nested/A.md", "B.md"]);
    assert.deepEqual(result.cached.views.next, ["B.md", "Nested/A.md"]);
    assert.deepEqual(result.diagnostic.views.next, ["Nested/A.md", "B.md"]);
    assert.equal(result.inputs.sourceRows.get("Nested/A.md").markdownOrdinal, 0);
    assert.equal(result.inputs.sourceRows.get("B.md").order, 0);
  });

test("the full host collector's terminal digest detects an outer-order-only change",
  /** Controlled input mutation proves collector behavior only, not native host event ordering. */
  async () => {
    // Use acquisition solely for the standard host fixture and its explicit cleanup ownership.
    const f = await titleFixture(
      /** Keep counts/targets identical before and after replacing the outer object. */
      f => {
        f.add("A.md", ""); f.add("B.md", ""); f.add("Center.md", "");
        f.app.metadataCache.resolvedLinks = { "B.md": { "Center.md": 1 }, "A.md": { "Center.md": 1 } };
      });
    try {
      const collector = new M.ObsidianHostLinkSourceCollector(f.app, {
        isCurrent: /** Keep this controlled collection alive. */ () => true,
        sourceRevision: /** Hold revision fixed to isolate the original-order digest. */ () => f.acquisition.hostRevision,
        checkpoint: /** Permit the existing cooperative collector to progress. */ async () => true,
      });
      const seen = [];
      assert.equal(await collector.collectBatches(
        /** Observe the actual emitted normalized stream before its final digest validation. */
        batch => { seen.push(...batch.records); return true; }), true);
      assert.deepEqual(seen.map(/** Observe emitted owner order without sorting. */ record => record.source.id), ["B.md", "A.md"]);
      f.app.metadataCache.resolvedLinks = { "A.md": { "Center.md": 1 }, "B.md": { "Center.md": 1 } };
      assert.equal(await collector.finalize(), null, "A source/head revision is not an original global-order observation");
      const fresh = await collect(new M.ObsidianHostLinkSourceCollector(f.app, {
        isCurrent: /** Keep this controlled collection alive. */ () => true,
        sourceRevision: /** Hold revision fixed to isolate the original-order digest. */ () => f.acquisition.hostRevision,
        checkpoint: /** Permit the existing cooperative collector to progress. */ async () => true,
      }));
      assert.deepEqual(fresh.map(/** Preserve the fresh collector's actual sequence. */ record => record.source.id), ["A.md", "B.md"]);
    } finally { f.close(); }
  });

for (const activateDormant of [false, true]) {
  test(`only policy-selected declarations establish pair birth; dormant active=${activateDormant}`,
    /** A coordinate for a raw value is not automatically a coordinate for an emitted pair. */
    async () => {
      const semantic = { ...settings, hierarchy: { ...settings.hierarchy,
        children: ["Children", ...(activateDormant ? ["Dormant"] : [])] } };
      const result = await compareOrder(
        /** Dormant B is physically earlier; otherwise inline B follows the selected frontmatter A. */
        f => {
          f.add("Center.md", "Children:: [[B]]", { Dormant: "[[B]]", Children: "[[A]]" });
          f.add("A.md", ""); f.add("B.md", ""); resolveFiles(f);
        }, { semantic });
      const expected = activateDormant ? ["B.md", "A.md"] : ["A.md", "B.md"];
      assert.deepEqual(result.full.views.child, expected);
      assert.deepEqual(result.cached.views.child, expected);
    });
}

test("one Markdown owner's references, Dates and body URLs retain their separate original phases",
  /** Date normalization and URL emission stay with their actual production collectors and parser. */
  async () => {
    const result = await compareOrder(
      /** A property wins the first pair, then Date, then first-retained body URLs in parser order. */
      f => {
        f.add("Center.md", "[B](https://example.com/b) [A](https://example.com/a)\n[Again](https://example.com/b)",
          { When: "2026-09-30", Children: "[[A]]" });
        f.add("A.md", ""); resolveFiles(f); f.app.dateFields.add("When");
      });
    const expected = ["A.md", "Daily/2026-09-30.md", "https://example.com/b", "https://example.com/a"];
    for (const snapshot of [result.full, result.cached]) {
      assert.deepEqual(snapshot.views.child, expected);
      assert.equal(snapshot.decisions.get("https://example.com/b").length, 1, "The canonical parser retains the first raw URL occurrence");
    }
  });

test("URL-origin direct children follow first canonical body occurrence, not lexical URL order",
  /** Generated origin edges share the body record coordinate with their deterministic child emission. */
  async () => {
    const result = await compareOrder(
      /** Repeat one URL without generating another origin pair or a label-based sorting oracle. */
      f => f.add("Owner.md", "[B](https://example.com/b) [A](https://example.com/a)\n[B again](https://example.com/b)"),
      { center: ref("https://example.com", "url") });
    for (const snapshot of [result.full, result.cached]) {
      assert.deepEqual(snapshot.views.child, ["https://example.com/b", "https://example.com/a"]);
      assert.deepEqual(rawPaths(snapshot), ["https://example.com/b", "https://example.com/a"]);
      assert.equal(snapshot.decisions.get("https://example.com/b").length, 1);
    }
  });
