/** SI4a production replay/semantic owner tests; public host doubles never replace storage/compiler logic. */
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { M, replayFixture, settings, presentation, runtime, policy, hostOracle, semanticView, collect } from "./support/cachedSourceFixture.mjs";
import { titleFixture } from "./support/urlTitleFixture.mjs";
import { centerGateSettings, currentNeighborhoodView, fullCenterIndex } from "./support/requestedCenterGateFixture.mjs";
import { loadPortableModules } from "./support/portableTypeScript.mjs";
const { exports: { RelationType } } = loadPortableModules(["src/core/graph/relations.ts"]);

/** Persist all neutral facts once; policies must never go through this helper. */
async function acquire(f, ids) {
  for (const id of ids) {
    const result = await f.acquisition.acquire(f.files.get(id), M.parseBodyMetadata(f.text.get(id)));
    assert.equal(result.current, true); assert.equal(result.reason, "storage-unavailable");
  }
}

/** A complete owner fixture includes both endpoints, dormant properties, host counts and URL/tag lifetimes. */
function mixedFixture() {
  const f = replayFixture();
  f.add("A.md", "DormantInline:: [[B]]\nFriends:: [[B]]\nStyle:: #person\nType:: Inline type\n[Readable](https://example.com/path)\n", {
    Friends: "[[Alias B]] [[B]]", Dormant: "[[Never visible]]", Image: "[[picture.png]]", When: "2026-09-29",
    aliases: ["A alias", "Another alias"], Type: "[[Research]]", tags: ["project/alpha"],
  });
  f.metadata.get("A.md").hostTags = ["#project/alpha", "#project/alpha"];
  f.add("B.md", "Opposes:: [[A]]\nNext:: [[A]]\n[Other label](https://example.com/other)", { Parent: "[[A]]", Style: "#project" });
  f.add("Daily/2026-09-29.md", "");
  f.add("picture.png", "");
  for (const [name, path] of [["B", "B.md"], ["Alias B", "B.md"], ["A", "A.md"]]) f.resolutions.set(name, path);
  f.app.metadataCache.resolvedLinks["A.md"] = { "B.md": 2, "picture.png": 1 };
  f.app.metadataCache.resolvedLinks["B.md"] = { "A.md": 2 };
  f.app.metadataCache.unresolvedLinks["A.md"] = { "body missing": 1 };
  f.app.dateFields.add("When");
  return { f, ids: ["A.md", "B.md", "Daily/2026-09-29.md"] };
}

test("live full compiler equals validated source-owner replay across ontology/image/inference policies without IO or writes", async () => {
  const { f, ids } = mixedFixture();
  try {
    await acquire(f, ids);
    const heads = await Promise.all(ids.map(id => f.repository.inspect(id)));
    const before = f.acquisition.getCounters();
    const variants = [settings,
      { ...settings, hierarchy: { ...settings.hierarchy, parents: ["Parent", "Dormant", "DormantInline"] } },
      { ...settings, hierarchy: { ...settings.hierarchy, leftFriends: [], rightFriends: ["Friends", "Opposes"] } },
      { ...settings, nodeImageProperty: "Image", thumbnailProperty: "Image" },
      { ...settings, inferAllLinksAsFriends: true, inverseInfer: true },
      { ...settings, datePropertyRelations: "left", hierarchy: { ...settings.hierarchy, parents: ["Parent", "When"] } },
      { ...settings, datePropertyRelations: "left", hierarchy: { ...settings.hierarchy, hidden: ["Hidden", "When"] } },
    ];
    const oracles = [];
    for (const variant of variants) oracles.push(await hostOracle(f, ids, variant));
    f.app.vault.read = f.app.vault.cachedRead = async () => assert.fail("Cached replay must not read Markdown");
    f.repository.replace = async () => assert.fail("A policy cannot write a source head");
    f.acquisition.parse = async () => assert.fail("Cached replay cannot parse Markdown");
    for (let index = 0; index < variants.length; index++) {
      const result = await f.acquisition.prepareCachedSemantics([...ids, ids[0], ids[0]], policy({ revision: `policy:${index}`, settings: variants[index] }), presentation, runtime());
      assert.equal(result.outcome, "ready", JSON.stringify(result));
      assert.deepEqual(semanticView(result.compilation), semanticView(oracles[index]), `policy ${index} must preserve every semantic field and occurrence`);
      assert.equal(result.coverage, "source-owners"); assert.equal(result.policyRevision, `policy:${index}`);
      assert.equal(result.sources.length, ids.length); assert.equal(result.work.length, ids.length);
      for (const work of result.work) { assert.equal(work.familyVisits, 4); assert(work.maxBatchRecords <= 256); assert(work.maxBatchEstimatedBytes <= 256 * 1024); }
      for (let owner = 0; owner < ids.length; owner++) {
        assert.deepEqual(result.sources[owner].head, heads[owner].head);
        assert.equal(result.sources[owner].sequence, heads[owner].sequence);
      }
      const sourceRevision = result.sources[0].head.sourceRevision;
      assert([...result.compilation.declarations()].filter(d => d.contribution.sourceId === ids[0] && d.sourceKind !== "tag-tree")
        .every(d => d.contribution.revision === sourceRevision));
    }
    assert.deepEqual(f.acquisition.getCounters(), before);
    assert.deepEqual(f.reads, []); assert.deepEqual(f.parses, []);
    assert(!oracles[0].node("Never visible"), "Dormant unresolved reference cannot seed search nodes");
    assert(oracles[1].node("Never visible"), "Selecting a dormant field materializes it through the canonical compiler");
  } finally { f.close(); }
});

test("dense source replays once per scope, shares one payload and preserves distinct lexical aliases/finality", async () => {
  const f = replayFixture();
  try {
    const text = "[[Alias]] [[Target]] " + "escaped \" \ud83d\ude42 ".repeat(35000);
    const file = f.add("dense.md", Array.from({ length: 800 }, (_, i) => `Dormant:: [[virtual-${i}]]`).join("\n"), { Friends: text });
    const image = f.add("target.png", ""); f.resolutions.set("Alias", image.path); f.resolutions.set("Target", image.path);
    await acquire(f, [file.path]);
    const captured = await f.acquisition.captureForReplay(file.path, presentation, runtime()); assert.equal(captured.outcome, "ready");
    const records = [];
    const replayed = await new M.CachedSourceReplay(f.repository).read(captured.request, runtime(), batch => { records.push(...batch.records); return true; });
    assert.equal(replayed.outcome, "ready"); assert.equal(replayed.value.work.familyVisits, 4);
    assert(replayed.value.work.chunks > 4); assert(replayed.value.work.maxBatchRecords <= 256);
    assert(replayed.value.work.maxBatchEstimatedBytes <= 256 * 1024); assert(replayed.value.work.retainedJoinBytes <= 8 * 1024 * 1024);
    const header = records.find(r => r.kind === "reference-value" && r.fieldName === "Friends"); assert(header);
    const payload = records.filter(r => r.kind === "reference-payload" && r.valueId === header.valueId);
    assert(payload.length > 1); assert.equal(payload.map(r=>r.text).join(""), text); assert.equal(payload.at(-1).final, true);
    const references = records.filter(r => r.kind === "reference-candidate" && r.valueId === header.valueId);
    assert.equal(references.length, 1); assert.equal(references[0].target.rawTarget, "Alias"); assert.equal(references[0].final, true);
    const lexical = (await f.facts(file.path, "values")).filter(r => r.kind === "reference-candidate" && r.valueId === header.valueId);
    assert.deepEqual(lexical.map(r=>r.rawTarget), ["Alias", "Target"], "Storage retains both genuine lexical spellings");
    const result = await f.acquisition.prepareCachedSemantics(Array(80).fill(file.path), policy(), presentation, runtime());
    assert.equal(result.outcome, "ready"); assert.equal(result.work.length, 1); assert.equal(result.work[0].familyVisits, 4);
    assert(!result.compilation.node("virtual-0"), "Dense dormant input cannot populate search");
    assert.equal((await f.acquisition.prepareCachedSemantics(Array.from({length:257},(_,i)=>String(i)), policy(), presentation, runtime())).reason, "missing",
      "Large owner scopes continue until the first genuine missing source");
  } finally { f.close(); }
});

test("cached semantic replay continues through more than one owner page without a prefix", async () => {
  const f = replayFixture();
  try {
    const ids = Array.from({ length: 257 }, (_, index) => `Owner-${index}.md`);
    for (const id of ids) f.add(id, "");
    await acquire(f, ids);
    let yields = 0;
    const result = await f.acquisition.prepareCachedSemantics(ids, policy(), presentation, runtime({ yield: async () => { yields++; } }));
    assert.equal(result.outcome, "ready", JSON.stringify(result));
    assert.equal(result.sources.length, ids.length); assert.equal(result.work.length, ids.length);
    assert.deepEqual(result.sources.map(stamp => stamp.head.sourceId), ids);
    assert(yields > 0, "Large owner preparation must cooperatively yield");

    let current = true, cancelYields = 0;
    const cancelled = await f.acquisition.prepareCachedSemantics(ids, policy(), presentation, runtime({
      isCurrent: () => current, yield: async () => { cancelYields++; current = false; },
    }));
    assert.equal(cancelled.outcome, "cancelled", JSON.stringify(cancelled));
    assert.equal(cancelled.reason, "cancelled");
    assert(!("sources" in cancelled) && !("compilation" in cancelled), "Cancelled continuation exposes no semantic prefix");
    assert.equal(cancelYields, 1, "Cancellation is observed at the first owner continuation yield");
  } finally { f.close(); }
});

test("missing/corrupt family data and postings reject private preparation without damaging the intact source", async () => {
  for (const fault of ["missing-chunk", "invalid-chunk", "missing-posting", "invalid-posting", "newer-format"]) {
    const f = replayFixture();
    try {
      f.add("A.md", "Friends:: [[B]]"); f.add("B.md", ""); await acquire(f, ["A.md", "B.md"]);
      const intact = await f.repository.inspect("B.md"), source = f.repository.memory.get("A.md");
      if (fault === "newer-format") source.head.formatVersion += 1;
      else {
        const values = fault.includes("posting") ? source.postings : source.chunks;
        const key = [...values.keys()].find(key => JSON.parse(key)[0] === "values"); assert(key);
        if (fault.startsWith("missing")) values.delete(key);
        else values.set(key, { ...values.get(key), [fault.includes("posting") ? "key" : "digest"]: "corrupt" });
      }
      const result = await f.acquisition.prepareCachedSemantics(["A.md"], policy(), presentation, runtime());
      assert.equal(result.outcome, "invalid-family", JSON.stringify(result));
      assert.equal(result.sourceId, "A.md"); assert(!("compilation" in result));
      assert.deepEqual((await f.repository.inspect("B.md")).head, intact.head);
    } finally { f.close(); }
  }
});

test("metadata readiness, source/host/policy revisions and cancellation never return partial semantics", async () => {
  for (const fault of ["pending-metadata", "dirty", "host", "date-environment", "policy", "cancelled", "tombstone", "evicted", "head", "memory-stale", "close"]) {
    const f = replayFixture();
    try {
      const file = f.add("A.md", "Friends:: [[B]]"); await acquire(f, [file.path]);
      let valid = true, revision = true, fired = false;
      const p = policy({ isCurrent: () => revision });
      if (fault === "pending-metadata") f.metadata.delete(file.path);
      if (fault === "dirty") f.app.vault.trigger("modify", file);
      if (fault === "tombstone") await f.repository.tombstone(file.path);
      if (fault === "evicted") { f.repository.memory.delete(file.path); f.repository.unsaved.add(file.path); }
      if (fault === "memory-stale") f.repository.memory.get(file.path).current = () => false;
      const result = await f.acquisition.prepareCachedSemantics([file.path], p, presentation, runtime({
        isCurrent: () => valid, sliceBudgetMs: 0,
        yield: async () => {
          if (fired) return; fired = true;
          if (fault === "host") f.app.metadataCache.trigger("resolved");
          if (fault === "date-environment") f.app.daily.folder = "Changed";
          if (fault === "policy") revision = false;
          if (fault === "cancelled") valid = false;
          if (fault === "head") f.repository.memory.set(file.path, { ...f.repository.memory.get(file.path), head: { ...f.repository.memory.get(file.path).head, sourceRevision: "replacement" } });
          if (fault === "close") f.acquisition.close();
        },
      }));
      assert.notEqual(result.outcome, "ready", fault); assert(!("compilation" in result));
      if (["pending-metadata", "dirty", "tombstone", "evicted"].includes(fault)) assert.equal(result.outcome, "pending-acquisition", fault);
      if (["host", "date-environment", "policy", "close", "head", "memory-stale"].includes(fault)) assert.equal(result.outcome, "stale", fault);
      if (fault === "cancelled") assert.equal(result.outcome, "cancelled");
    } finally { f.close(); }
  }
});

test("resolution joins reject missing, orphaned or mismatched lexical bindings even when each family validates", async () => {
  for (const fault of ["missing", "orphan", "spelling", "subpath"]) {
    const f = replayFixture();
    try {
      const file = f.add("A.md", "Friends:: [[B#section]]"); await acquire(f, [file.path]);
      const inspection = await f.repository.inspect(file.path), facts = {};
      for (const family of ["values", "metadata", "body-urls", "resolution"]) facts[family] = await f.facts(file.path, family);
      const reference = facts.resolution.find(r => r.kind === "reference-resolution"); assert(reference);
      if (fault === "missing") facts.resolution = [];
      if (fault === "orphan") reference.valueId = "orphan-value";
      if (fault === "spelling") reference.target.rawTarget = "Not the physical spelling";
      if (fault === "subpath") reference.target.subpath = "other";
      const written = await f.repository.replace({ sourceId: file.path, physical: inspection.head.physical,
        observation: inspection.head.observation, expected: inspection.expected,
        families: Object.fromEntries(Object.entries(facts).map(([family, records]) => [family, async emit => {
          for (const record of records) if (!await emit(record)) return false; return true;
        }])) });
      assert.equal(written.outcome, "unsaved");
      assert.equal((await f.repository.inspect(file.path)).reason, "ready", "Families individually validate");
      const result = await f.acquisition.prepareCachedSemantics([file.path], policy(), presentation, runtime());
      assert.equal(result.outcome, "invalid-family"); assert.equal(result.family, "resolution"); assert(!("compilation" in result));
    } finally { f.close(); }
  }
});

test("an incomplete dependency query discards partial owners and explicitly reports storage unavailability", async () => {
  const f = replayFixture();
  try {
    f.add("A.md", "Friends:: [[B]]"); f.add("B.md", "Friends:: [[A]]"); await acquire(f, ["A.md", "B.md"]);
    const reader = new M.CachedSourceSemanticReader(f.repository);
    const result = await reader.discover([{ kind: "field", key: "friends" }, { kind: "literal", key: "A" }], () => true);
    assert.equal(result.outcome, "storage-unavailable"); assert(!("sourceIds" in result));
    assert.equal((await reader.discover([{ kind: "family", key: "values" }], () => false)).outcome, "cancelled");
  } finally { f.close(); }
});

test("production GraphIndex semantic refresh matches fresh full oracle from source-local dependencies", async () => {
  const f = await titleFixture(f => {
    f.add("A.md", "# First\nDormantInline:: [[E]]\n# Second\nFriends:: [[D]]\n[Readable](https://example.com/path)\n", {
      Parent: "[[B]]", Dormant: "[[Dormant Ghost]]", Image: "[[image.png]]", Hidden: "[[H]]", When: "2026-09-29",
      aliases: ["Alpha Hub"], Type: "[[Research]]", Style: "#project",
    });
    f.add("B.md", "", { Children: ["[[A]]", "[[S]]"] });
    for (const name of ["C", "D", "E", "H", "S"]) f.add(`${name}.md`, "");
    const unrelated = f.add("Other/Unrelated.md", "");
    f.add("Daily/2026-09-29.md", "");
    f.add("image.png", "");
    const root = f.app.vault.getRoot();
    const other = new window.SourceTestFolder();
    other.path = other.name = "Other"; other.parent = root; other.children = [unrelated]; unrelated.parent = other;
    root.children = [...root.children.filter(file => file !== unrelated), other];
    f.app.vault.getRoot = () => root;
    f.app.dateFields.add("When");
    for (const file of f.files.values()) f.resolutions.set(file.basename, file.path);
    f.app.metadataCache.resolvedLinks["A.md"] = { "C.md": 1, "image.png": 1 };
  }, 4);
  let index;
  try {
    const ids = f.app.vault.getMarkdownFiles().map(file => file.path);
    const view = centerGateSettings({ showFolderNodes: false, maxItemCount: 50, renderSiblings: true });
    const semantic = { ...structuredClone(settings), indexingMode: "eager", thumbnailProperty: "Thumbnail", nodeImageProperty: "OtherImage" };
    const compilerPolicy = host => ({ hierarchy: structuredClone(host.hierarchy), thumbnailProperty: host.thumbnailProperty,
      nodeImageProperty: host.nodeImageProperty, inferAllLinksAsFriends: host.inferAllLinksAsFriends,
      datePropertyRelations: host.datePropertyRelations,
      inverseInfer: host.inverseInfer, showFullTagName: host.showFullTagName, tagStyleList: [...host.tagStyleList],
      maxLabelLength: host.baseNodeStyle?.maxLabelLength ?? host.maxLabelLength ?? 30 });
    const presentationPolicy = host => ({ noteTypeField: host.noteTypeField, primaryTagField: host.primaryTagField });
    const initial = await hostOracle(f, ids, semantic, presentationPolicy({ ...semantic, ...view }));
    index = await fullCenterIndex(M, f, initial, semantic, view);
    index.publishRestoredState(index.state);
    // This fixture exercises policy refresh after a genuine complete Eager graph, rather than
    // the newly shared local foreground path used before that full publication is ready.
    index.fullSnapshotFresh = true;
    index.rebuildSearchIndex();

    // The Node fixture has no IndexedDB, so provide only the new repository-local derivative port.
    // Its memberships are projected once from the already-acquired neutral families using the
    // production source-local key projector; settings requests cannot consult the legacy catalog.
    const localByKey = new Map(), stamps = new Map();
    const structuralOrder = new Map(); let structuralOrdinal = 0;
    for (const fact of f.structure) if (fact.kind === "entity" && fact.entity.kind === "document") {
      structuralOrder.set(fact.entity.physicalPath, structuralOrdinal++);
    }
    const setupSummaryKeys = new Map(ids.map(id => [id, new Set([M.sourceLocalDependencyKey("node", id)])]));
    for (const page of f.catalog.state.pages.values()) for (const row of JSON.parse(page.data)) {
      if (row.kind === "summary") {
        const [, sourceId] = JSON.parse(row.key);
        const keys = setupSummaryKeys.get(sourceId);
        if (keys) for (const key of row.keys) keys.add(key);
      } else if (row.kind === "source" && setupSummaryKeys.has(row.head.sourceId)) {
        stamps.set(row.head.sourceId, { head: row.head, sequence: row.head.sequence, saved: true });
      }
    }
    for (const id of ids) {
      assert(stamps.has(id), `setup source owner ${id}`);
      for (const key of setupSummaryKeys.get(id)) { const owners = localByKey.get(key) ?? []; owners.push(id); localByKey.set(key, owners); }
    }
    const localFence = { revision: 1, sequence: Math.max(...[...stamps.values()].map(stamp => stamp.sequence)) };
    const localPort = {
      // The Node host has no storage. Counts derive from the same frozen setup projection as
      // memberships and use its existing fence; actual ledger/count authentication is tested in IDB.
      lookupLocalDependencyCounts: async (keys, current) => current()
        ? { outcome: "ready", value: { fence: localFence,
          counts: keys.map(key => ({ key, owners: (localByKey.get(key) ?? []).length })), work: { keys: keys.length } } }
        : { outcome: "cancelled", reason: "cancelled" },
      lookupLocalDependencies: async (keys, current) => {
        if (!current()) return { outcome: "cancelled", reason: "cancelled" };
        const selectedIds = [...new Set(keys.flatMap(key => localByKey.get(key) ?? []))]
          .sort((left, right) => structuralOrder.get(left) - structuralOrder.get(right));
        return { outcome: "ready", value: { fence: localFence, sources: selectedIds.map(id => stamps.get(id)),
          orders: selectedIds.map(id => structuralOrder.get(id)), markdownOrders: selectedIds.map(id => f.ordinals.get(id)),
          work: { keys: keys.length, rows: selectedIds.length } } };
      },
      validateLocalDependencies: async (fence, selected, current) => {
        if (!current()) return "cancelled";
        if (JSON.stringify(fence) !== JSON.stringify(localFence)) return "superseded";
        return (await f.port.validateSelections(selected, current)).reason;
      },
    };
    const durableRepository = new Proxy(f.repository, { get(target, key) {
      if (key in localPort) { const value = localPort[key]; return typeof value === "function" ? value.bind(localPort) : value; }
      if (key in f.port) { const value = f.port[key]; return typeof value === "function" ? value.bind(f.port) : value; }
      const value = target[key]; return typeof value === "function" ? value.bind(target) : value;
    } });
    f.acquisition.repository = durableRepository;
    f.acquisition.localDependenciesReady = true;
    f.acquisition.localDependencyAuthorityReady = true;
    index.sourceAcquisition.close();
    index.sourceAcquisition = f.acquisition;
    index.plugin.settings.lastActivePath = "A.md";
    const releaseDemand = index.acquireSemanticDemand("A.md");
    const expansion = await M.buildCentralSectionExpansion(index.plugin, index, index.get("A.md"));
    assert(expansion, "Production fixture must cache heading ranges before settings-only projection");
    const before = index.getSemanticPreparationDiagnostics();
    const sourceBefore = f.acquisition.getCounters();

    const clean = value => JSON.parse(JSON.stringify(value, (key, field) => key === "id" || key === "revision" ? undefined : field));
    const expansionView = idx => {
      const projected = M.projectCentralSectionExpansion(idx.plugin, idx, expansion);
      const neighborhood = value => Object.fromEntries(["parents", "children", "leftFriends", "rightFriends", "siblings"].map(role =>
        [role, value[role].map(item => ({ path: item.page.path, role: item.role, relationType: item.relationType,
          direction: item.linkDirection, definition: item.typeDefinition }))]));
      return { center: neighborhood(projected.centerNeighborhood), sections: projected.sections.map(section => ({
        id: section.id, parentId: section.parentId, children: [...section.childIds], neighborhood: neighborhood(section.neighborhood),
      })) };
    };
    const routeView = idx => ({
      neighborhood: currentNeighborhoodView(idx, "A.md"),
      expansion: expansionView(idx),
      search: Object.fromEntries(["alpha", "dormant", "project", "https", "image"].map(query =>
        [query, idx.search(query, 30).map(page => page.path)])),
      title: idx.titleFor(idx.get("A.md")),
      pairs: Object.fromEntries(["B.md", "D.md", "E.md", "H.md", "Daily/2026-09-29.md", "Dormant Ghost", "C.md", "image.png", "Other/Unrelated.md"].map(target => [target, {
        evidence: clean(idx.evidenceBetween("A.md", target)), explanation: clean(idx.explainRelationship("A.md", target)),
        storage: idx.relationshipStorageCandidates("A.md", target),
      }])),
    });
    const oracleForCurrentSettings = async () => {
      const host = index.plugin.settings;
      const oracleApp = { ...f.app, vault: { ...f.app.vault, getName: () => "production-settings-full-oracle",
        getMarkdownFiles: originalGetMarkdownFiles, read: originalRead, cachedRead: originalCachedRead } };
      const oraclePlugin = { app: oracleApp, settings: structuredClone(host), getIndexSourceRevision: () => f.acquisition.hostRevision };
      const oracle = new M.GraphIndex(oraclePlugin, oracleApp);
      try {
        const builder = new M.GraphBuilder(oraclePlugin, oracleApp, new Map(), oracle.metadataParser, f.cache, () => true);
        const state = await builder.build({ acquireSources: false });
        assert(state, "Fresh full GraphBuilder oracle must complete");
        // A blank index now grants no full-graph authority. Publish the genuine completed live
        // builder result through its production boundary before comparing writable candidates.
        oracle.publishRestoredState(state);
        oracle.fullSnapshotFresh = true;
        // This oracle bypasses production source acquisition intentionally; mark its already-built
        // source authority ready so relationship-write candidate comparison remains meaningful.
        oracle.sourceAcquisition.localDependenciesReady = true;
        return oracle;
      } catch (error) { oracle.destroy(); throw error; }
    };
    const assertOracle = async label => {
      // Foreground refresh now closes direct incidence first. Equality with a full-build oracle
      // includes the separately tracked optional ordinary-parent sibling pass after it settles.
      await index.workScheduler.checkpoint(4);
      assert.equal(index.hasPendingSemanticPreparation(), false, `${label}: ${JSON.stringify(index.getSemanticPreparationDiagnostics())}`);
      const oracle = await oracleForCurrentSettings();
      try {
        assert.deepEqual(routeView(index), routeView(oracle), label);
        assert.equal(index.isSemanticWriteReady("A.md", "B.md"), true, `${label}: current maintenance scope must admit writes`);
      } finally { oracle.destroy(); }
    };

    const originalGetMarkdownFiles = f.app.vault.getMarkdownFiles;
    const originalRebuild = f.discovery.rebuild;
    const originalAcquire = f.acquisition.acquire;
    const originalParse = f.acquisition.parse;
    const originalRead = f.app.vault.read;
    const originalCachedRead = f.app.vault.cachedRead;
    const forbid = name => async () => assert.fail(`Settings refresh must not call ${name}`);
    f.discovery.rebuild = forbid("dependency rebuild");
    f.acquisition.acquire = forbid("source acquisition");
    f.acquisition.parse = forbid("Markdown parse");
    f.app.vault.read = forbid("vault.read");
    f.app.vault.cachedRead = forbid("vault.cachedRead");
    f.app.vault.getMarkdownFiles = () => assert.fail("Settings refresh must not enumerate Markdown inventory");
    try {
      index.plugin.settings.hierarchy.parents = [...index.plugin.settings.hierarchy.parents, "Dormant"];
      index.invalidateSemanticPolicy(); await index.refreshSemanticSettings();
      await assertOracle("dormant frontmatter activation");

      index.plugin.settings.hierarchy.parents = index.plugin.settings.hierarchy.parents.filter(field => field !== "Dormant");
      index.invalidateSemanticPolicy(); await index.refreshSemanticSettings();
      await assertOracle("dormant frontmatter removal");

      index.plugin.settings.hierarchy.parents = [...index.plugin.settings.hierarchy.parents, "DormantInline"];
      index.invalidateSemanticPolicy(); await index.refreshSemanticSettings();
      await assertOracle("dormant inline activation");

      index.plugin.settings.hierarchy.parents = index.plugin.settings.hierarchy.parents.filter(field => field !== "DormantInline");
      index.invalidateSemanticPolicy(); await index.refreshSemanticSettings();
      await assertOracle("dormant inline removal");

      index.plugin.settings.hierarchy.parents = [...index.plugin.settings.hierarchy.parents, "DormantInline"];
      index.invalidateSemanticPolicy(); await index.refreshSemanticSettings();
      await assertOracle("dormant inline reactivation");

      index.plugin.settings.hierarchy.parents = [...index.plugin.settings.hierarchy.parents, "Dormant"];
      index.invalidateSemanticPolicy(); await index.refreshSemanticSettings();
      await assertOracle("dormant frontmatter reactivation");

      index.plugin.settings.hierarchy.leftFriends = index.plugin.settings.hierarchy.leftFriends.filter(field => field !== "Friends");
      index.plugin.settings.hierarchy.rightFriends = [...index.plugin.settings.hierarchy.rightFriends, "Friends"];
      index.invalidateSemanticPolicy(); await index.refreshSemanticSettings();
      await assertOracle("role move");

      index.plugin.settings.hierarchy.rightFriends = index.plugin.settings.hierarchy.rightFriends.filter(field => field !== "Friends");
      index.plugin.settings.hierarchy.leftFriends = [...index.plugin.settings.hierarchy.leftFriends, "Friends"];
      index.invalidateSemanticPolicy(); await index.refreshSemanticSettings();
      await assertOracle("reverse role move");

      index.plugin.settings.inferAllLinksAsFriends = true;
      index.invalidateSemanticPolicy(); await index.refreshSemanticSettings();
      await assertOracle("forward inference toggle");

      index.plugin.settings.hierarchy.parents = [...index.plugin.settings.hierarchy.parents, "When"];
      index.plugin.settings.datePropertyRelations = "left";
      index.invalidateSemanticPolicy(); await index.refreshSemanticSettings();
      await assertOracle("configured date ontology from cached facts");
      const dateRelation = index.get("A.md").neighbours.get("Daily/2026-09-29.md");
      assert.equal(M.classifyRelation(dateRelation, "parent", true), RelationType.DEFINED);
      index.plugin.settings.datePropertyRelations = "right";
      index.invalidateSemanticPolicy(); await index.refreshSemanticSettings();
      await assertOracle("configured date role remains above a changed fallback");
      index.plugin.settings.hierarchy.parents = index.plugin.settings.hierarchy.parents.filter(field => field !== "When");
      for (const role of ["parent", "child", "left", "right", "previous", "next"]) {
        index.plugin.settings.datePropertyRelations = role;
        index.invalidateSemanticPolicy(); await index.refreshSemanticSettings();
        await assertOracle(`default Date ${role} from cached facts`);
        assert.equal(M.classifyRelation(index.get("A.md").neighbours.get("Daily/2026-09-29.md"), role, true), RelationType.DEFINED);
      }

      index.plugin.settings.inverseInfer = true;
      index.invalidateSemanticPolicy(); await index.refreshSemanticSettings();
      await assertOracle("inverse inference toggle");

      index.plugin.settings.thumbnailProperty = "Image";
      index.invalidateSemanticPolicy(); await index.refreshSemanticSettings();
      await assertOracle("thumbnail selector");

      index.plugin.settings.nodeImageProperty = "Image";
      index.invalidateSemanticPolicy(); await index.refreshSemanticSettings();
      await assertOracle("node image selector");

      // SI1 remains presentation-only even after a semantic scope has replaced the complete graph
      // around the visible center. Exact raw degrees were captured with that scope, so every sort
      // mode can switch without another semantic publication or body/source work.
      const beforeSort = index.getSemanticPreparationDiagnostics();
      for (const nodeSortOrder of ["name-asc", "name-desc", "modified-asc", "modified-desc", "created-asc", "created-desc", "connections-asc", "connections-desc"]) {
        index.plugin.settings.nodeSortOrder = nodeSortOrder;
        await index.refreshPresentationSettings();
        await assertOracle(`post-semantic ${nodeSortOrder} sort`);
      }
      assert.equal(index.getSemanticPreparationDiagnostics().published, beforeSort.published);

      // Navigating a second visible Plex prepares that center under the same policy rather than
      // falling back to the old full graph or replaying every owner.
      const releaseSecond = index.acquireSemanticDemand("B.md");
      await index.refreshSemanticSettings();
      const navigationOracle = await oracleForCurrentSettings();
      try { assert.deepEqual(currentNeighborhoodView(index, "B.md"), currentNeighborhoodView(navigationOracle, "B.md"), "navigation scope"); }
      finally { navigationOracle.destroy(); releaseSecond(); }

      // A released current scope is now deliberately retained for reuse. A real host observation
      // retires that proof before this test holds a new preparation and cancels its demand lifetime.
      index.refreshVisibleHostMetadataPreviews("B.md");
      assert.equal(index.semanticScopes.has("B.md"), false, "Host observation retires retained B before fresh preparation");
      // Settle the independent visible A repair before holding B; otherwise its optional preview
      // can remain queued until the later source-invalidation assertion changes A's policy.
      await index.workScheduler.checkpoint(4);
      await index.refreshSemanticSettings();
      assert.equal(index.semanticScopes.has("B.md"), false, "Released B still requires fresh canonical preparation");
      // A released in-flight navigation demand cannot resurrect its scope after a newer center finishes.
      const navigationPrepare = f.acquisition.prepareRequestedNeighborhood.bind(f.acquisition);
      let unblockNavigation, enteredNavigation;
      const navigationEntered = new Promise(resolve => { enteredNavigation = resolve; });
      f.acquisition.prepareRequestedNeighborhood = async (...args) => {
        if (args[0].center.id === "B.md" && args[0].siblingClosure !== "selected") {
          enteredNavigation(); await new Promise(resolve => { unblockNavigation = resolve; });
        }
        return navigationPrepare(...args);
      };
      const oldNavigation = index.acquireSemanticDemand("B.md");
      await navigationEntered;
      const retiredTask = index.semanticPreparationTasks.get("B.md").task;
      oldNavigation();
      const latestNavigation = index.acquireSemanticDemand("C.md");
      await index.refreshSemanticSettings();
      unblockNavigation(); await retiredTask;
      const latestOracle = await oracleForCurrentSettings();
      try {
        assert.deepEqual(currentNeighborhoodView(index, "C.md"), currentNeighborhoodView(latestOracle, "C.md"));
        assert.equal(index.semanticScopes.has("B.md"), false, "Released navigation cannot publish its old scope");
      } finally { latestOracle.destroy(); latestNavigation(); f.acquisition.prepareRequestedNeighborhood = navigationPrepare; }

      // Three overlapping foreground policy requests may finish in any order, but only the final
      // revision is publishable. Hold those direct requests at the production acquisition boundary;
      // the winning publication's later optional selected-parent pass must remain free to settle.
      const livePrepareNeighborhood = f.acquisition.prepareRequestedNeighborhood.bind(f.acquisition);
      const blockers = [];
      let enteredResolve = [];
      f.acquisition.prepareRequestedNeighborhood = async (...args) => {
        if (args[0].siblingClosure === "selected") return livePrepareNeighborhood(...args);
        const ordinal = blockers.length;
        let release;
        const blocked = new Promise(resolve => { release = resolve; });
        blockers.push({ release });
        enteredResolve[ordinal]?.();
        await blocked;
        return livePrepareNeighborhood(...args);
      };
      const waitEntered = ordinal => new Promise(resolve => {
        if (blockers.length > ordinal) resolve();
        else enteredResolve[ordinal] = resolve;
      });
      const supersessionBefore = index.getSemanticPreparationDiagnostics();
      index.plugin.settings.inverseInfer = false;
      index.invalidateSemanticPolicy(); const s1 = index.refreshSemanticSettings(); await waitEntered(0);
      index.plugin.settings.inverseInfer = true;
      index.invalidateSemanticPolicy(); const s2 = index.refreshSemanticSettings(); await waitEntered(1);
      index.plugin.settings.inverseInfer = false;
      index.invalidateSemanticPolicy(); const s3 = index.refreshSemanticSettings(); await waitEntered(2);
      for (const blocker of blockers) blocker.release();
      await Promise.all([s1, s2, s3]);
      assert.equal(blockers.length, 3, "Only the three foreground policy requests are held");
      f.acquisition.prepareRequestedNeighborhood = livePrepareNeighborhood;
      const supersessionAfter = index.getSemanticPreparationDiagnostics();
      assert.equal(supersessionAfter.published, supersessionBefore.published + 1, "Only S3 may publish");
      assert(supersessionAfter.cancelled >= supersessionBefore.cancelled + 2, "S1 and S2 must be cancelled");
      await assertOracle("S1-S2-S3 final publication");

      // Invalidate the host after the production request has crossed an await. The old coherent
      // view stays readable, but write eligibility closes and the stale request cannot publish.
      let releaseAwait;
      let enteredAwait;
      const afterAwait = new Promise(resolve => { enteredAwait = resolve; });
      f.acquisition.prepareRequestedNeighborhood = async (...args) => {
        if (args[0].siblingClosure === "selected") return livePrepareNeighborhood(...args);
        enteredAwait();
        await new Promise(resolve => { releaseAwait = resolve; });
        return livePrepareNeighborhood(...args);
      };
      const coherentBeforeInvalidation = currentNeighborhoodView(index, "A.md");
      const sourceInvalidationBefore = index.getSemanticPreparationDiagnostics();
      index.plugin.settings.inverseInfer = true;
      index.invalidateSemanticPolicy();
      const staleRequest = index.refreshSemanticSettings();
      await afterAwait;
      f.app.vault.trigger("modify", f.files.get("A.md"));
      assert.equal(index.isSemanticWriteReady("A.md", "B.md"), false);
      assert.deepEqual(index.relationshipStorageCandidates("A.md", "B.md"), []);
      assert.deepEqual(currentNeighborhoodView(index, "A.md"), coherentBeforeInvalidation, "Last coherent view remains visible while updating");
      releaseAwait();
      await staleRequest;
      f.acquisition.prepareRequestedNeighborhood = livePrepareNeighborhood;
      const sourceInvalidationAfter = index.getSemanticPreparationDiagnostics();
      assert.equal(sourceInvalidationAfter.published, sourceInvalidationBefore.published, "Source-invalidated work must not publish");
      assert.equal(index.hasPendingSemanticPreparation(), true);

      const after = index.getSemanticPreparationDiagnostics();
      assert(after.published >= before.published + 12);
      assert.equal(after.fullBuilds, before.fullBuilds);
      assert.deepEqual(f.acquisition.getCounters(), sourceBefore);

      const promotionBefore = f.acquisition.getMaintenanceRevision();
      const publishedBeforePromotion = after.published;
      f.acquisition.promoteUnknownFanout();
      assert.equal(f.acquisition.getMaintenanceRevision(), promotionBefore + 1, "Unknown fan-out promotion must advance GraphIndex's maintenance fence");
      assert.equal(index.isSemanticWriteReady("A.md", "B.md"), false, "Promoted uncertain maintenance rejects relationship writes");
      assert.deepEqual(index.relationshipStorageCandidates("A.md", "B.md"), [], "Promoted uncertain maintenance exposes no stale write candidates");
      assert.equal(index.getSemanticPreparationDiagnostics().published, publishedBeforePromotion, "Promotion itself cannot publish stale semantic work");
    } finally {
      f.app.vault.getMarkdownFiles = originalGetMarkdownFiles;
      f.discovery.rebuild = originalRebuild;
      f.acquisition.acquire = originalAcquire;
      f.acquisition.parse = originalParse;
      f.app.vault.read = originalRead;
      f.app.vault.cachedRead = originalCachedRead;
      releaseDemand();
    }
  } finally {
    index?.destroy();
    f.close();
  }
});

test("SI4 production settings route owns revisioned cached preparation without adding a second parser/resolver", async () => {
  const [main, index, replay, semantic] = await Promise.all(["src/main.ts", "src/index/GraphIndex.ts", "src/index/SourceReplay.ts", "src/index/CachedSourceSemantics.ts"].map(file => readFile(file, "utf8")));
  assert.match(main, /if \(effects.semanticInvalidation\) this.index.invalidateSemanticPolicy\(\)/);
  assert.match(main, /if \(effects.semanticInvalidation\) await this.index.refreshSemanticSettings\(\)/);
  assert(!/scheduleRebuild\("settings"\)/.test(main));
  assert.equal(M.ObsidianSourceAcquisition.prototype.prepareCachedSemantics, undefined, "Historical selected-owner wrapper is fixture-only");
  assert.equal(M.ObsidianSourceAcquisition.prototype.contributorDiscovery, undefined, "Global catalog construction has no shipped adapter entry point");
  assert.match(index, /prepareRequestedNeighborhood/);
  assert.match(index, /hasSemanticDependencies/);
  assert(!/bootstrapSemanticDependencies|hasContributorCatalog/.test(index + main));
  assert(!/CachedSourceSemanticReader|prepareCachedSemantics/.test(main));
  assert(!/cachedRead|\.vault\.(read|cachedRead)|parseBodyMetadata|parseBodyMetadataAsync|extractLinkReferences|resolveObsidianReferenceTarget/.test(replay + semantic));
  assert.match(semantic, /NormalizedSourceScopePreparer/); assert.match(replay, /acceptSourceBatch/);
});

test("opaque source/target IDs are never converted into paths and selected aliases retain lexical provenance", async () => {
  const f = replayFixture();
  try {
    const file = f.add("source.md", "Friends:: [[Alias#part]]"); f.add("target.png", ""); f.resolutions.set("Alias", "target.png");
    await acquire(f, [file.path]);
    const snapshot = await f.repository.inspect(file.path), facts = {};
    const source = { ...M.entityFactForFile(file).entity, id: "opaque/source\u0000id" };
    const targetFact = M.entityFactForFile(f.files.get("target.png"));
    const target = { ...targetFact.entity, id: "opaque/target\u0000id" };
    const sourceFact = { ...M.entityFactForFile(file), source, entity: source };
    for (const family of ["values", "metadata", "body-urls", "resolution"]) facts[family] = await f.facts(file.path, family);
    for (const record of facts.resolution) if (record.kind === "reference-resolution" && record.target) record.target.entity = target;
    const stored = await f.repository.replace({ sourceId: file.path, physical: snapshot.head.physical, observation: snapshot.head.observation,
      expected: snapshot.expected, families: Object.fromEntries(Object.entries(facts).map(([family, records]) => [family, async emit => {
        for (const record of records) if (!await emit(record)) return false; return true;
      }])) });
    assert.equal(stored.outcome, "unsaved");
    const request = { sourceId: file.path, host: { source, physical: snapshot.head.physical, observation: snapshot.head.observation,
      isCurrent: () => true, structure: emit => emit(sourceFact), presentation: async () => true,
      hostLink: () => assert.fail("No host-link fixture"), bodyUrl: () => assert.fail("No body URL fixture") } };
    const entities = new Map([[source.id, sourceFact], [target.id, { ...targetFact, source: target, entity: target }]]);
    f.app.metadataCache.getFirstLinkpathDest = () => assert.fail("Cached lexical bindings cannot be resolved again");
    const result = await new M.CachedSourceSemanticReader(f.repository).prepare([request], policy(), { entity: ref => entities.get(ref.id) }, runtime());
    assert.equal(result.outcome, "ready");
    assert.deepEqual([...result.compilation.nodes.keys()].sort(), [source.id, target.id].sort());
    const declaration = [...result.compilation.declarations()][0];
    assert.equal(declaration.sourceId, source.id); assert.equal(declaration.targetId, target.id);
    assert.equal(declaration.rawValue, "[[Alias#part]]");
    assert.equal(result.compilation.node(target.id).file.path, "target.png");
  } finally { f.close(); }
});

test("historical property URL bindings canonicalize on replay without rewriting lexical source facts", async () => {
  const f = replayFixture();
  try {
    const raw = "https://Obsidian.md/Slug?Case=Value#Part", canonical = "https://obsidian.md/Slug?Case=Value#Part";
    const file = f.add("Owner.md", "Resource:: " + raw, { Website: raw });
    await acquire(f, [file.path]);
    const snapshot = await f.repository.inspect(file.path), facts = {};
    for (const family of ["values", "metadata", "body-urls", "resolution"]) facts[family] = await f.facts(file.path, family);
    for (const record of facts.resolution) if (record.target?.entity.kind === "url") {
      record.target.entity = { ...record.target.entity, id: raw, semanticPath: raw };
    }
    const replaced = await f.repository.replace({ sourceId: file.path, physical: snapshot.head.physical, observation: snapshot.head.observation,
      expected: snapshot.expected, families: Object.fromEntries(Object.entries(facts).map(([family, records]) => [family, async emit => {
        for (const record of records) if (!await emit(record)) return false; return true;
      }])) });
    assert.equal(replaced.outcome, "unsaved");
    const head = await f.repository.inspect(file.path), before = f.acquisition.getCounters();
    const oracle = await hostOracle(f, [file.path], settings);
    f.app.vault.read = f.app.vault.cachedRead = async () => assert.fail("URL replay must not read Markdown");
    f.repository.replace = async () => assert.fail("URL normalization cannot rewrite neutral source heads");
    f.app.metadataCache.getFirstLinkpathDest = () => assert.fail("Stored lexical URL bindings need no resolver call");
    const result = await f.acquisition.prepareCachedSemantics([file.path], policy(), presentation, runtime());
    assert.equal(result.outcome, "ready", JSON.stringify(result));
    assert.deepEqual(semanticView(result.compilation), semanticView(oracle));
    assert.equal(result.compilation.node(canonical).url, canonical);
    assert(!result.compilation.node(raw));
    const declarations = [...result.compilation.declarations()].filter(item => item.sourceKind === "property-url");
    assert.equal(declarations.length, 2);
    assert(declarations.every(item => item.rawValue === raw));
    assert(declarations.some(item => item.fieldName === "Website" && item.line === undefined));
    assert(declarations.some(item => item.fieldName === "Resource" && typeof item.line === "number"));
    assert(result.compilation.node("https://obsidian.md").neighbours.get(canonical).isChild);
    assert.deepEqual(await f.repository.inspect(file.path), head);
    assert.deepEqual(f.acquisition.getCounters(), before);
    assert.deepEqual(await f.facts(file.path, "resolution"), facts.resolution);
  } finally { f.close(); }
});

test("section expansion preserves property URL provenance above and below headings using canonical targets", async () => {
  const f = replayFixture(); let index;
  try {
    const file = f.add("Owner.md", "Prelude:: https://Obsidian.md/Prelude\n# First\nResource:: https://Obsidian.md/First\n[Body](https://Obsidian.md/Body#Case)\n# Second\nResource:: https://Obsidian.md/Second",
      { Website: "https://Obsidian.md/Frontmatter" });
    const semantic = { ...settings, indexingMode: "eager" }, view = centerGateSettings({ renderSiblings: false });
    const compilation = await hostOracle(f, [file.path], semantic);
    index = await fullCenterIndex(M, f, compilation, semantic, view);
    index.publishRestoredState(index.state); index.fullSnapshotFresh = true;
    const expansion = await M.buildCentralSectionExpansion(index.plugin, index, index.get(file.path));
    assert(expansion);
    const urls = neighborhood => neighborhood.children.filter(item => item.page.url).map(item => item.page.url).sort();
    assert.deepEqual(urls(expansion.centerNeighborhood), ["https://obsidian.md/Frontmatter", "https://obsidian.md/Prelude"]);
    assert.deepEqual(urls(expansion.sections[0].neighborhood), ["https://obsidian.md/Body#Case", "https://obsidian.md/First"]);
    assert.deepEqual(urls(expansion.sections[1].neighborhood), ["https://obsidian.md/Second"]);
    const first = [...expansion.explanations.values()].flatMap(item => item.decisions).find(item =>
      item.evidence.sourceKind === "property-url" && item.evidence.fieldName === "Resource" && item.evidence.line === 3);
    assert(first); assert.equal(first.evidence.rawValue, "https://Obsidian.md/First");
    f.app.vault.cachedRead = async () => assert.fail("Section reprojection must not reread Markdown");
    const projected = M.projectCentralSectionExpansion(index.plugin, index, expansion);
    assert.deepEqual(urls(projected.centerNeighborhood), urls(expansion.centerNeighborhood));
    for (let n = 0; n < expansion.sections.length; n++) assert.deepEqual(urls(projected.sections[n].neighborhood), urls(expansion.sections[n].neighborhood));
  } finally { index?.destroy(); f.close(); }
});

test("private source scopes do not import old-policy synthetic nodes and preserve shared URL origin ownership", async () => {
  const { f, ids } = mixedFixture();
  try {
    await acquire(f, ids);
    const both = await f.acquisition.prepareCachedSemantics(ids, policy(), presentation, runtime()); assert.equal(both.outcome, "ready");
    const one = await f.acquisition.prepareCachedSemantics(["B.md"], policy(), presentation, runtime()); assert.equal(one.outcome, "ready");
    assert(one.compilation.node("https://example.com"));
    assert(!one.compilation.node("https://example.com/path"));
    assert(!one.compilation.node("tag:project/alpha"));
    assert(!one.compilation.node("Never visible"));
    assert([...one.compilation.declarations()].every(item => item.contribution.sourceId === "B.md"));
    const contributions = new Set([...both.compilation.declarations()].filter(item => item.sourceKind === "body-url").map(item => item.contribution.sourceId));
    assert.deepEqual([...contributions].sort(), ["A.md", "B.md"]);
  } finally { f.close(); }
});

test("complete normalized folder/tag structure can be supplied without manufacturing topology from stored parent paths", async () => {
  const f = replayFixture();
  try {
    f.add("A.md", "Friends:: [[B]]"); f.add("B.md", ""); f.resolutions.set("B", "B.md");
    f.metadata.get("A.md").hostTags = ["#project/nested"];
    await acquire(f, ["A.md", "B.md"]);
    const { collect } = await import("./support/cachedSourceFixture.mjs");
    const cr = { isCurrent: () => true, sourceRevision: () => f.acquisition.hostRevision, checkpoint: async () => true };
    const structure = await collect(new M.ObsidianStructuralSourceCollector(f.app, cr));
    const entities = new Map(structure.filter(record => record.kind === "entity").map(record => [record.entity.id, record]));
    const requests = [];
    for (const id of ["A.md", "B.md"]) {
      const captured = await f.acquisition.captureForReplay(id, presentation, runtime()); assert.equal(captured.outcome, "ready");
      requests.push({ ...captured.request, host: { ...captured.request.host, structure: async emit => {
        if (id === "A.md") for (const record of structure) if (!await emit(record)) return false;
        return true;
      } } });
    }
    // Full compiler receives the canonical full structural input plus the live per-owner facts.
    const full = new M.NormalizedGraphCompiler(settings, runtime());
    const records = [...structure], host = M.createObsidianMetadataSourceHost(f.app);
    for (const id of ["A.md", "B.md"]) {
      const file = f.files.get(id), metadata = M.mergeFileMetadata(f.metadata.get(id), M.parseBodyMetadata(f.text.get(id)));
      records.push(...await collect(new M.ObsidianHostLinkSourceCollector(f.app, cr, id)));
      records.push(...await collect(new M.ObsidianMetadataSourceCollector(host, cr, file, metadata, presentation, "metadata")));
      records.push(...await collect(new M.ObsidianReferenceSourceCollector({ metadataCache: f.app.metadataCache, resolvedLinkCount: host.resolvedLinkCount }, cr, file, metadata)));
      records.push(...await collect(new M.ObsidianMetadataSourceCollector(host, cr, file, metadata, presentation, "relations")));
    }
    const boundary = { generation: M.sourceGeneration("full-topology"), snapshotRevision: M.sourceSnapshotRevision("full-topology") };
    const read = full.beginRead(boundary);
    assert.equal(await full.acceptBatch(read, { boundary, sequence: 0, final: true, records }), true);
    assert.equal(full.completeRead(read, boundary), true);
    const oracle = await full.finish(); assert(oracle);
    const replayed = await new M.CachedSourceSemanticReader(f.repository).prepare(requests, policy(), { entity: ref => entities.get(ref.id) }, runtime());
    assert.equal(replayed.outcome, "ready"); assert.deepEqual(semanticView(replayed.compilation), semanticView(oracle));
    assert(replayed.compilation.node("folder:/"));
  } finally { f.close(); }
});


test("replayed normalized reference and field-name facts preserve exact live provenance and payload finality", async () => {
  const f = replayFixture();
  try {
    const file = f.add("A.md", "Friends:: [[Alias#part]] [[Target#part]]\nText [Dormant inline:: [[Target]]]\n(Plain field:: literal value)\n", {
      Friends: "[[Alias#part]] [[Target#part]]", "Dormant frontmatter": "[[Unresolved]]", Plain: "unchanged",
    });
    f.add("Target.md", ""); f.resolutions.set("Alias", "Target.md"); f.resolutions.set("Target", "Target.md");
    await acquire(f, [file.path]);
    const cr = { isCurrent: () => true, sourceRevision: () => f.acquisition.hostRevision, checkpoint: async () => true };
    const host = M.createObsidianMetadataSourceHost(f.app);
    const metadata = M.mergeFileMetadata(f.metadata.get(file.path), M.parseBodyMetadata(f.text.get(file.path)));
    const live = [
      ...await collect(new M.ObsidianMetadataSourceCollector(host, cr, file, metadata, presentation, "metadata")),
      ...await collect(new M.ObsidianReferenceSourceCollector({ metadataCache: f.app.metadataCache, resolvedLinkCount: host.resolvedLinkCount }, cr, file, metadata)),
    ];
    const captured = await f.acquisition.captureForReplay(file.path, presentation, runtime()); assert.equal(captured.outcome, "ready");
    const replayed = [];
    const result = await new M.CachedSourceReplay(f.repository).read(captured.request, runtime(), batch => { replayed.push(...batch.records); return true; });
    assert.equal(result.outcome, "ready");
    const facts = (records, kind) => records.filter(record => record.kind === kind).map(record => {
      const { sourceRevision, ...fact } = record; return fact;
    });
    for (const kind of ["field-name", "reference-value", "reference-payload", "reference-candidate"]) {
      assert.deepEqual(facts(replayed, kind), facts(live, kind), kind + " must match without dropping provenance coordinates or physical value IDs");
    }
    const locations = facts(replayed, "field-name").filter(record => record.provenance?.surface === "inline");
    assert(locations.length >= 2); assert(locations.every(record => Number.isInteger(record.provenance.location.end)));
  } finally { f.close(); }
});

/** Count host work rather than elapsed time: increasing owner count must increase work linearly. */
test("cached semantic validity work grows with owners and rejects mutation during final continuation", async () => {
  let previous = 0;
  for (const count of [128, 256, 512, 1024]) {
    const f = replayFixture();
    try {
      const ids = Array.from({ length: count }, (_, i) => `Owner-${i}.md`);
      for (const id of ids) f.add(id, "");
      await acquire(f, ids);
      const capture = f.acquisition.captureForReplay.bind(f.acquisition);
      let checks = 0;
      f.acquisition.captureForReplay = async (...args) => {
        const result = await capture(...args);
        if (result.outcome === "ready") {
          const current = result.request.host.isCurrent;
          result.request = { ...result.request, host: { ...result.request.host, isCurrent: () => { checks++; return current(); } } };
        }
        return result;
      };
      const start = performance.now();
      const result = await f.acquisition.prepareCachedSemantics(ids, policy(), presentation, runtime());
      assert.equal(result.outcome, "ready");
      assert(checks < 160 * count, `${count}: ${checks} host checks`);
      if (previous) assert(checks <= previous * 2.05, "Doubling owners must not quadruple validity work");
      previous = checks;
      console.log(JSON.stringify({ r3Validity: { owners: count, checks, elapsedMs: performance.now() - start, memory: result.memory } }));
      // Mutate an already checked owner's metadata during the repository's last awaited fence.
      const validate = f.repository.validateSelections.bind(f.repository);
      f.repository.validateSelections = async (...args) => {
        const selected = await validate(...args);
        f.metadata.set(ids[0], { frontmatter: { changed: true }, links: [] });
        return selected;
      };
      const rejected = await f.acquisition.prepareCachedSemantics(ids, policy(), presentation, runtime());
      assert.equal(rejected.reason, "stale"); assert(!("compilation" in rejected));
    } finally { f.close(); }
  }
});

/** Aggregate guards must reject a pathological selection even when each item is individually valid. */
test("cached scope rejects excessive retained owner metadata before replaying or exposing a prefix", async () => {
  const f = replayFixture();
  try {
    f.add("A.md", ""); await acquire(f, ["A.md"]);
    const captured = await f.acquisition.captureForReplay("A.md", presentation, runtime());
    assert.equal(captured.outcome, "ready");
    const largeIdentity = "x".repeat(400_000);
    const owners = Array.from({ length: 1100 }, (_, i) => ({ ...captured.request, sourceId: `owner-${i}`,
      host: { ...captured.request.host, source: { ...captured.request.host.source, id: `owner-${i}` },
        physical: { ...captured.request.host.physical, identity: largeIdentity } } }));
    const reader = new M.CachedSourceSemanticReader(f.repository);
    const result = await reader.prepare(owners, policy(), { entity: () => assert.fail("Budget must close before compilation") }, runtime());
    assert.equal(result.reason, "decode-budget"); assert(!("compilation" in result));
  } finally { f.close(); }
});
