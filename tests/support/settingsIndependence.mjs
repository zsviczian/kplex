/** Production-method SI0/SI1/SI2 regressions using the indexing harness's host/cache doubles. */
import assert from "node:assert/strict";

export async function runSettingsIndependence(c) {
  const { GraphIndex, GraphBuilder, KplexPlugin, settingsModule, policy, sanitize, app, settings,
    index, warmRecord, caches, obsidianTestApi, canonicalGraph, computeIndexSettingsSignature } = c;
  let cases = 0;
  async function scenario(name, run) {
    try { await run(); cases++; }
    catch (error) { console.error(`Settings independence scenario failed: ${name}`); error.message = `Settings independence ${name}: ${error.message}`; throw error; }
  }
  const legacy = (overrides = {}) => JSON.stringify({ schema: 1, hierarchy: settings.hierarchy,
    inferAllLinksAsFriends: settings.inferAllLinksAsFriends, inverseInfer: settings.inverseInfer,
    showFullTagName: settings.showFullTagName, noteTypeField: settings.noteTypeField,
    primaryTagField: settings.primaryTagField, tagStyleList: settings.tagStyleList,
    maxLabelLength: settings.baseNodeStyle.maxLabelLength, ...overrides });
  const bodies = new Map(index.fieldCache);
  const loadBodies = async (requests) => new Map(requests.flatMap(({ path, mtime }) => {
    const entry = bodies.get(path);
    return entry?.mtime === mtime ? [[path, entry.body]] : [];
  }));
  const alive = [];
  function owner(next = structuredClone(settings), signature = computeIndexSettingsSignature(settings), kind = "active") {
    next.pinnedNodes ??= []; next.lastActivePath ??= "";
    const p = new KplexPlugin();
    p.app = app; p.settings = next; p.savedSettingsPolicy = policy.captureSettingsPolicy(next);
    p.getIndexSourceRevision = () => 0;
    p.scheduled = 0; p.scheduleRebuild = () => { p.scheduled++; };
    p.index = new GraphIndex(p, app);
    const idx = p.index;
    const meta = { ...warmRecord.meta, settingsSignature: signature, key: kind,
      ...(kind === "checkpoint" ? { completedMarkdownPaths: [...index.semanticFingerprints.keys()] } : {}) };
    idx.indexedDb.readSnapshotCatalog = async () => ({ available: true, active: kind === "active" ? meta : null,
      checkpoint: kind === "checkpoint" ? meta : null, invalidActive: false, invalidCheckpoint: false });
    idx.indexedDb.getBodies = loadBodies;
    idx.indexedDb.snapshotUsesChunks = () => true;
    idx.indexedDb.getPages = async (_generation, paths) => new Map(warmRecord.pages.filter((page) => paths.includes(page.path)).map((page) => [page.path, page]));
    idx.indexedDb.iterateSnapshotPages = async (_meta, consume, current) => {
      for (const page of warmRecord.pages) { if (!current()) return false; consume(page); }
      return current();
    };
    idx.indexedDb.iterateSnapshotEvidence = async (_meta, consume, current) => {
      for (const item of warmRecord.evidence) { if (!current()) return false; consume(item); }
      return current();
    };
    idx.scheduleOrphanCleanup = () => {}; idx.scheduleSnapshotPersist = () => {};
    alive.push(idx);
    return p;
  }
  async function restore(p, seeds = ["Note A.md"]) {
    await p.index.restoreIndexedDbSnapshot(seeds);
    return p.index.waitForSnapshotHydration();
  }
  /** Count actual semantic entry points and body acquisition, not only coordinator intentions. */
  async function zeroSemanticWork(p, run) {
    const calls = { rebuild: 0, progressive: 0, patch: 0, builderPatch: 0, read: 0, cachedRead: 0, pluginRebuild: 0, parse: 0 };
    const restores = [];
    for (const [object, method, key] of [
      [p.index, "rebuild", "rebuild"], [p.index, "rebuildProgressively", "progressive"],
      [p.index, "patchMarkdownPaths", "patch"], [GraphBuilder.prototype, "patchMarkdownFiles", "builderPatch"],
      [app.vault, "read", "read"], [app.vault, "cachedRead", "cachedRead"],
      [p, "rebuildIndex", "pluginRebuild"], [p.index.metadataParser, "parse", "parse"],
    ]) {
      const original = object[method];
      object[method] = function (...args) { calls[key]++; return original.apply(this, args); };
      restores.push(() => { object[method] = original; });
    }
    try { await run(); assert.deepEqual(calls, { rebuild: 0, progressive: 0, patch: 0, builderPatch: 0, read: 0, cachedRead: 0, pluginRebuild: 0, parse: 0 }); }
    finally { restores.reverse().forEach((undo) => undo()); }
  }
  try {
    await scenario("immutable classifier and signature-only semantics", async () => {
      const original = structuredClone(settings), before = policy.captureSettingsPolicy(original);
      original.tagStyleList.reverse(); original.baseNodeStyle.maxLabelLength = 11;
      original.noteTypeStyles.Secret = { backgroundColor: "#001122ff" };
      const effects = policy.classifySettingsChange(before, policy.captureSettingsPolicy(original));
      assert.equal(effects.semanticInvalidation, false); assert.equal(effects.presentationFacets, true);
      assert.equal(effects.searchTerms, false); assert(effects.changedKeys.includes("tagStyleList"));
      assert.equal(computeIndexSettingsSignature(original), computeIndexSettingsSignature(settings));
      const decoded = JSON.parse(computeIndexSettingsSignature(settings));
      assert.equal(decoded.signatureVersion, 2); assert(!("noteTypeField" in decoded));
      assert(!("exclusions" in decoded.hierarchy));
      for (const key of ["inferAllLinksAsFriends", "inverseInfer", "thumbnailProperty", "nodeImageProperty"]) {
        const changed = structuredClone(settings);
        changed[key] = typeof changed[key] === "boolean" ? !changed[key] : "private-selector";
        assert.equal(policy.classifySettingsChange(before, policy.captureSettingsPolicy(changed)).semanticInvalidation, true, key);
        const compared = policy.compareIndexSettingsSignature(computeIndexSettingsSignature(settings), changed);
        assert.equal(compared.compatible, false); assert(compared.changedKeys.includes(key));
      }
      const changed = structuredClone(settings); changed.hierarchy.leftFriends.push("Private field");
      const decision = policy.compareIndexSettingsSignature(legacy(), changed);
      assert.equal(decision.reason, "semantic-settings-changed"); assert.deepEqual(decision.changedKeys, ["hierarchy.leftFriends"]);
    });
    await scenario("recognized old shapes and conservative unknown input", async () => {
      for (const raw of [legacy(), legacy({ excalibrainFilepath: "" }), legacy({ excalibrainFilepath: "Legacy Drawing.md" })]) {
        const compared = policy.compareIndexSettingsSignature(raw, settings);
        assert.equal(compared.compatible, true); assert.equal(compared.reason, "signature-format-changed");
      }
      const before = JSON.stringify(settings);
      for (const raw of [null, "{", "null", "[]", "{}", legacy({ schema: 9 }), legacy({ tagStyleList: [42] }),
        legacy({ extra: "private" }), JSON.stringify({ ...JSON.parse(computeIndexSettingsSignature(settings)), signatureVersion: 999 })]) {
        const result = policy.compareIndexSettingsSignature(raw, settings);
        assert.equal(result.compatible, false); assert.equal(result.reason, "signature-format-unknown");
      }
      assert.equal(JSON.stringify(settings), before);
      assert.equal(policy.compareIndexSettingsSignature(legacy(), { ...settings, thumbnailProperty: "custom" }).compatible, false);
    });
    await scenario("diagnostic history and clipboard sanitize private keys twice", async () => {
      const entry = { at: 1, stage: "restore", reason: "semantic-settings-changed",
        changedKeys: ["private-property", "hierarchy.leftFriends", "tagStyleList", { private: true }], rawSignature: legacy() };
      const sanitized = sanitize(Array.from({ length: 30 }, () => entry));
      assert.equal(sanitized.length, 20); assert.deepEqual(sanitized[0].changedKeys, ["hierarchy.leftFriends", "tagStyleList"]);
      const p = owner(); p.index.indexDiagnostics = [entry];
      const report = c.createIndexDiagnosticsReport(p.index, () => ({ upToDate: false, phase: "loading-cache", indexedFiles: 0, totalFiles: 1 }), "test");
      assert(!report.includes("private-property")); assert(!report.includes("rawSignature"));
      assert(!report.includes("settingsSignature"));
    });
    for (const kind of ["active", "checkpoint"]) await scenario(`${kind} current presentation before first publication`, async () => {
      const fm = caches.get("Note A.md").frontmatter;
      fm.Palette = "[[Blue#Section|Alias]]"; fm.Theme = "#body";
      try {
        const next = structuredClone(settings);
        Object.assign(next, { showFullTagName: false, noteTypeField: "Palette", primaryTagField: "Theme", tagStyleList: ["#taxonomy", "#body"] });
        next.baseNodeStyle.maxLabelLength = 9;
        const p = owner(next, legacy(), kind);
        let observed = 0;
        p.index.subscribe(() => {
          const page = p.index.get("Note A.md");
          if (!page) return;
          observed++; assert.equal(page.noteType, "Blue"); assert.equal(page.maxLabelLength, 9); assert.equal(page.primaryStyleTag, "#body");
        });
        await zeroSemanticWork(p, async () => {
          assert.equal((await restore(p)).restored, true, JSON.stringify(p.index.getIndexDiagnostics()));
          assert(observed > 0);
          assert.equal(p.index.get("tag:taxonomy/body/leaf").name, "leaf");
          assert(p.index.search("leaf", 30).some((page) => page.path === "tag:taxonomy/body/leaf"));
          assert.equal(p.index.getPresentationStatus(p.index.get("Note A.md")).noteType, "ready");
          assert(p.index.getIndexDiagnostics().some((entry) => entry.reason === "presentation-settings-adapted"));
        });
      } finally { delete fm.Palette; delete fm.Theme; }
    });
    await scenario("equal-settings restored graph and search oracle", async () => {
      const p = owner(); assert.equal((await restore(p)).restored, true);
      assert.deepEqual(canonicalGraph(p.index), canonicalGraph(index));
      for (const query of ["note a", "project", "taxonomy", "folder", "https"]) {
        assert.deepEqual(p.index.search(query, 12).map((page) => page.path), index.search(query, 12).map((page) => page.path));
      }
    });
    await scenario("actual generic settings and style manager callbacks", async () => {
      const p = owner(); await restore(p);
      const tab = new settingsModule.KplexSettingTab(app, p);
      const page = p.index.get("Note A.md"), identity = p.index.pages;
      const evidence = p.index.state.evidence, relations = page.neighbours, relationCache = p.index.relationViewCache;
      let semantic = 0, presentation = 0;
      p.index.subscribe(() => semantic++); p.index.subscribePresentation(() => presentation++);
      const priorSearch = p.index.searchEntries;
      await zeroSemanticWork(p, async () => {
        await tab.setControlValue("baseLinkStyle.strokeWidth", 3);
        assert.equal(p.index.searchEntries, priorSearch, "Pure styling must retain search entries");
        p.settings.baseNodeStyle.maxLabelLength = 12; await p.saveSettings(false);
        await tab.setControlValue("showFullTagName", false);
        await tab.setControlValue("nameFields", "aliases");
        await tab.setControlValue("renderAlias", false);
        assert.equal(p.index.titleFor(page), "Note A");
        assert(p.index.search("Alpha Hub", 12).includes(page), "Aliases stay alternate search terms");
        await tab.setControlValue("noteTypeField", "tags");
        await tab.setControlValue("primaryTagField", "tags");
        tab.openLegacyTagStyleEditor("#project");
        await obsidianTestApi.Modal.latest.onSave("#body", { backgroundColor: "#102030ff" }, "#project");
        assert.deepEqual(p.settings.tagStyleList, ["#body", "#person"]);
        assert.equal(page.primaryStyleTag, "#body-tag");
        assert.equal(policy.compareIndexSettingsSignature(warmRecord.meta.settingsSignature, p.settings).compatible, true);
        tab.openLegacyTagStyleEditor("#body"); await obsidianTestApi.Modal.latest.onDelete("#body");
        assert.deepEqual(p.settings.tagStyleList, ["#person"]);
        tab.openLegacyTagStyleEditor(""); await obsidianTestApi.Modal.latest.onSave("#body", { fontSize: 20 }, null);
        assert.deepEqual(p.settings.tagStyleList, ["#person", "#body"]);
        await tab.setControlValue("tagStyleList", ["#body", "#person"]);
        tab.openNoteTypeStyleEditor(null); await obsidianTestApi.Modal.latest.onSave("fixture", { fontSize: 24 }, null);
        assert.equal(p.settings.noteTypeStyles.fixture.fontSize, 24);
      });
      assert.equal(p.scheduled, 0); assert.equal(semantic, 0); assert(presentation >= 8);
      assert.equal(p.index.pages, identity); assert.equal(p.index.get(page.path), page);
      assert.equal(p.index.state.evidence, evidence); assert.equal(page.neighbours, relations); assert.equal(p.index.relationViewCache, relationCache);
    });
    await scenario("compatible appearance import uses the same classifier", async () => {
      // Real persisted settings have already passed migration (including role precedence sorting).
      const normalized = settingsModule.migrateAndMergeSettings(structuredClone(settings));
      const p = owner(normalized, computeIndexSettingsSignature(normalized)); await p.index.rebuild();
      await zeroSemanticWork(p, async () => {
        p.settings = settingsModule.importExcaliBrainGraphSettings({
          ...structuredClone(p.settings), showFullTagName: false, tagStyleList: ["#body"],
          baseNodeStyle: { ...p.settings.baseNodeStyle, maxLabelLength: 8 },
        }, p.settings);
        await p.saveSettings(true);
      });
      assert.equal(p.scheduled, 0); assert.equal(p.index.get("tag:taxonomy/body/leaf").name, "leaf");
    });
    for (const key of ["hierarchy.parents", "inferAllLinksAsFriends", "inverseInfer", "thumbnailProperty", "nodeImageProperty"]) {
      await scenario(`semantic control ${key}`, async () => {
        const p = owner(); await restore(p);
        const tab = new settingsModule.KplexSettingTab(app, p);
        await tab.setControlValue(key, key.startsWith("hierarchy.") ? "Private ontology" :
          typeof p.settings[key] === "boolean" ? !p.settings[key] : "Private image property");
        assert.equal(p.scheduled, 1);
        assert.equal(policy.compareIndexSettingsSignature(warmRecord.meta.settingsSignature, p.settings).compatible, false);
      });
    }
    await scenario("unknown active signature safely rejected", async () => {
      const p = owner(structuredClone(settings), "not-json");
      assert.equal((await restore(p)).restored, false); assert.equal(p.index.size, 0);
      assert(p.index.getIndexDiagnostics().some((entry) => entry.reason === "signature-format-unknown"));
    });
    await scenario("retired exclusion preserves graph and plans only upgrade reconciliation", async () => {
      const p = owner(structuredClone(settings), legacy({ excalibrainFilepath: "Note A.md" }));
      const restored = await restore(p);
      assert.equal(restored.restored, true); assert.equal(restored.fresh, false);
      assert(p.index.restoredModifiedMarkdownPaths.includes("Note A.md"));
      assert(p.index.getIndexDiagnostics().some((entry) => entry.reason === "retired-policy-reconcile"));
      assert(!p.index.getIndexDiagnostics().some((entry) => entry.reason === "semantic-settings-changed"));
      assert.equal((await p.index.reconcileRestoredSnapshot()).reconciled, true);
      assert.deepEqual(canonicalGraph(p.index), canonicalGraph(index));
    });
    await scenario("SI2 production fingerprint ignores ontology/image policy and detects dormant references", async () => {
      const file = app.vault.getFileByPath("Note A.md"), original = caches.get(file.path);
      const next = structuredClone(settings);
      next.hierarchy.parents = ["Dormant SI2"]; next.hierarchy.rightFriends = ["Dormant Inline SI2"];
      next.thumbnailProperty = "New image SI2"; next.nodeImageProperty = "Dormant SI2";
      const makeBuilder = current => new GraphBuilder({ ...c.plugin, settings: current }, app, new Map(),
        index.metadataParser, index.indexedDb, () => true);
      const before = makeBuilder(settings), after = makeBuilder(next);
      const body = c.parseBodyMetadata("Dormant Inline SI2:: [[Note B]]");
      try {
        caches.set(file.path, { ...original, frontmatter: { ...original.frontmatter,
          "Dormant SI2": "[[Note C]]", "Unrelated SI2": 1 } });
        const signature = before.semanticSourceSignature(file, body);
        assert.equal(after.semanticSourceSignature(file, body), signature);
        assert.equal(await after.semanticSourceSignatureCooperative(file, body), signature);
        caches.get(file.path).frontmatter["Unrelated SI2"] = { arbitrary: [1, 2, 3] };
        assert.equal(before.semanticSourceSignature(file, body), signature);
        caches.get(file.path).frontmatter["Dormant SI2"] = "[[Note B]]";
        assert.notEqual(before.semanticSourceSignature(file, body), signature);
        assert.equal(before.semanticSourceSignature(file, body), after.semanticSourceSignature(file, body));
      } finally { caches.set(file.path, original); }
    });
    await scenario("SI2 neutral unassigned reference collection", async () => {
      const metadata = c.mergeFileMetadata({ frontmatter: { "Unassigned Ref": "[[Note C]]" } },
        c.parseBodyMetadata("Unassigned Inline:: [[Note B]]"));
      const runtime = { isCurrent: () => true, sourceRevision: () => 0, checkpoint: async () => true };
      const file = app.vault.getFileByPath("Note A.md");
      const host = { metadataCache: app.metadataCache, resolvedLinkCount: () => 0 };
      const records = [];
      const collector = new c.ReferenceCollector(host, runtime, file, metadata);
      assert.equal(await collector.collectBatches((batch) => { records.push(...batch.records); return true; }), true);
      assert.deepEqual(records.filter((record) => record.kind === "reference-value").map((record) => record.fieldName),
        ["Unassigned Ref", "Unassigned Inline"]);
      assert.equal(records.filter((record) => record.kind === "reference-candidate").length, 2);
      assert.equal(records.some((record) => "configuredFieldName" in record || "role" in record || "image" in record), false);
    });
    await scenario("missing cache is pending, never a Markdown fallback", async () => {
      const p = owner(); await restore(p); p.index.indexedDb.getBodies = async () => new Map();
      await zeroSemanticWork(p, async () => {
        p.settings.noteTypeField = "uncached-inline-selector"; await p.saveSettings();
        assert.equal(p.index.get("Note A.md").noteType, null);
        assert.equal(p.index.getPresentationStatus(p.index.get("Note A.md")).noteType, "pending");
      });
    });
    await scenario("expanded sections reproject presentation without body acquisition", async () => {
      const p = owner(); await restore(p);
      const page = p.index.get("Note A.md");
      const expanded = await c.buildCentralSectionExpansion(p, p.index, page);
      assert(expanded);
      const originalType = expanded.centerNeighborhood.center.noteType;
      await zeroSemanticWork(p, async () => {
        p.settings.noteTypeField = "tags"; await p.saveSettings();
        const projected = c.projectCentralSectionExpansion(p, p.index, expanded);
        assert.equal(projected.centerNeighborhood.center.noteType, "fixture");
        assert.equal(projected.projectionSource, expanded.projectionSource);
        assert.equal(expanded.centerNeighborhood.center.noteType, originalType);
      });
    });
    for (const mode of ["mtime-change", "file-detached"]) await scenario(`${mode} during cached preparation`, async () => {
      const p = owner(); await restore(p);
      const page = p.index.get("Note A.md"), file = page.file, oldMtime = file.stat.mtime;
      const getFile = app.vault.getFileByPath;
      let entered, release;
      const barrier = new Promise((resolve) => { entered = resolve; });
      const blocked = new Promise((resolve) => { release = resolve; });
      p.index.indexedDb.getBodies = async (requests) => { entered(); await blocked; return loadBodies(requests); };
      try {
        await zeroSemanticWork(p, async () => {
          p.settings.noteTypeField = "never-cached";
          const refresh = p.index.refreshPresentationSettings();
          await barrier;
          if (mode === "mtime-change") file.stat.mtime++;
          else app.vault.getFileByPath = (path) => path === file.path ? null : getFile.call(app.vault, path);
          release(); await refresh;
          assert.equal(page.noteType, null);
          assert.equal(p.index.getPresentationStatus(page).noteType, "pending");
        });
      } finally { release?.(); file.stat.mtime = oldMtime; app.vault.getFileByPath = getFile; }
    });
    for (const mode of ["supersession", "unload", "source-change"]) await scenario(`${mode} during awaited preparation`, async () => {
      const p = owner(); await restore(p);
      const page = p.index.get("Note A.md"), oldType = page.noteType;
      let release, entered;
      const barrier = new Promise((resolve) => { entered = resolve; });
      const blocked = new Promise((resolve) => { release = resolve; });
      p.index.indexedDb.getBodies = async (requests) => { entered(); await blocked; return loadBodies(requests); };
      p.settings.noteTypeField = "never-cached";
      const first = p.index.refreshPresentationSettings();
      await barrier; assert.equal(page.noteType, oldType, "Prepared values must stay private across await");
      if (mode === "unload") p.index.destroy();
      else if (mode === "supersession") {
        p.settings.noteTypeField = "tags";
        p.index.indexedDb.getBodies = loadBodies;
        await p.index.refreshPresentationSettings();
      } else {
        p.index.publicationRevision++;
        p.settings.noteTypeField = "tags";
      }
      release(); await first;
      assert.equal(page.noteType, mode === "unload" ? oldType : "fixture");
    });
  } finally { alive.forEach((idx) => idx.destroy()); }
  console.log(`Settings independence: ${cases} production scenarios passed (signatures, controls/managers/import, restore, zero-work, privacy, lifetime).`);
}
