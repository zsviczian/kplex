/**
 * SI4 selected-title proof, intentionally no title-reader implementation. Production full-builder
 * and fresh GraphIndex expectations characterize canonical selection, source/live ownership and
 * missing observation/order premises. Explicit host/storage doubles are not native or IDB evidence.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { C, catalogFixture } from "./support/contributorCatalogFixture.mjs";
import { M, replayFixture, settings, presentation, runtime, policy, collect } from "./support/cachedSourceFixture.mjs";
import { centerGateSettings, fullCenterIndex } from "./support/requestedCenterGateFixture.mjs";
import { seedTitleBodies, fullTitleIndex, fullTitle, nestedTitleOwners, guardTitleReuse, buildTitleCatalog } from "./support/selectedTitleFixture.mjs";

/** Canonical selection cases are asserted through the real full build, never a replacement selector. */
const cases = [
  { name: "renderAlias false bypasses aliases and configured scalars", fm: { aliases: ["Alias"], Title: "Chosen" }, options: { renderAlias: false, nameFields: "Title, aliases" }, expected: "Candidate" },
  { name: "empty configured fields fall back to the bound base name", fm: { aliases: ["Alias"] }, options: { nameFields: " , , " }, expected: "Candidate" },
  { name: "plural aliases flatten in canonical order without deduplicating", fm: { aliases: [" ", [" First ", ["First", 4, "Second"]]], alias: "Ignored" }, expected: "First", aliases: ["First", "First", "Second"] },
  { name: "null plural aliases permit singular fallback", fm: { aliases: null, alias: [" Singular "] }, expected: "Singular", aliases: ["Singular"] },
  { name: "empty plural aliases suppress singular fallback", fm: { aliases: [], alias: "Ignored", Title: "Next" }, options: { nameFields: "alias,Title" }, expected: "Next", aliases: [] },
  { name: "non-nullish numeric plural aliases suppress singular fallback", fm: { aliases: 0, alias: "Ignored" }, expected: "Candidate", aliases: [] },
  { name: "capitalized raw Aliases is not the canonical alias source", fm: { Aliases: ["Ignored"], Title: "Next" }, options: { nameFields: "ALIASES,Title" }, expected: "Next", aliases: [] },
  { name: "a scalar alias containing commas is not split", fm: { aliases: " Alpha, Beta " }, expected: "Alpha, Beta", aliases: ["Alpha, Beta"] },
  { name: "nested scalar arrays skip nonstrings and choose depth-first text", fm: { Title: [false, 1, null, {}, [" ", [" Deep "]], "Later"] }, options: { nameFields: "Title" }, expected: "Deep" },
  { name: "ordinary scalar strings are trimmed", fm: { Title: " Chosen " }, options: { nameFields: "Title" }, expected: "Chosen" },
  { name: "numbers booleans and objects do not stringify into a title", fm: { Title: 12, Flag: true, Object: { value: "No" }, Last: " Yes " }, options: { nameFields: "Title,Flag,Object,Last" }, expected: "Yes" },
  { name: "first normalized matching key wins in object encounter order", fm: { "Display Name": "First", "display-name": "Second" }, options: { nameFields: "display-name" }, expected: "First" },
  { name: "unusable first normalized match suppresses a usable duplicate", fm: { "Display Name": [false, " "], "display-name": "Ignored", Other: "Next" }, options: { nameFields: "display-name,Other" }, expected: "Next" },
  { name: "reversing duplicate raw key order changes the selected text", fm: { "display-name": "Second", "Display Name": "First" }, options: { nameFields: "Display Name" }, expected: "Second" },
  { name: "only the exact lowercase position key is excluded", fm: { position: "Ignored", Position: "Allowed" }, options: { nameFields: "position" }, expected: "Allowed" },
  { name: "exact lowercase position alone cannot supply a title", fm: { position: "Ignored" }, options: { nameFields: "position" }, expected: "Candidate" },
  { name: "raw-key surrounding whitespace becomes hyphens rather than disappearing", fm: { " Title ": "Ignored", Title: "Selected" }, options: { nameFields: " Title " }, expected: "Selected" },
  { name: "no selected property is different from a nontext selected property but both fall back", fm: {}, options: { nameFields: "Missing" }, expected: "Candidate" },
  { name: "inline fields do not supply configured title properties", fm: {}, body: "Title:: Inline display", options: { nameFields: "Title" }, expected: "Candidate" },
];
for (const item of cases) {
  test(`selected-title canonical: ${item.name}`, async () => {
    const f = replayFixture();
    try {
      f.add("Candidate.md", item.body ?? "", item.fm);
      await seedTitleBodies(f);
      const result = await fullTitle(f, "Candidate.md", item.options);
      assert.equal(result.title, item.expected);
      if (item.aliases) assert.deepEqual(result.aliases, item.aliases);
      assert.deepEqual(f.reads, []); assert.deepEqual(f.parses, []);
    } finally { f.close(); }
  });
}

test("selected-title dormant scalar and field-order changes require live inputs, not new source heads", async () => {
  const f = replayFixture();
  try {
    const file = f.add("Candidate.md", "", { aliases: ["Alias"], Dormant: "Scalar display", Other: ["Other display"] });
    await seedTitleBodies(f);
    assert.equal((await f.acquisition.acquire(file, f.legacy.get(file.path).body)).current, true);
    const values = await f.facts(file.path, "values");
    const metadata = await f.facts(file.path, "metadata");
    assert(!JSON.stringify(values).includes("Scalar display"), "Non-reference title scalar is deliberately not mirrored");
    assert(metadata.some(fact => fact.kind === "field-name" && fact.fieldName === "Dormant"));
    const expected = [
      [{ nameFields: "aliases,Dormant" }, "Alias"],
      [{ nameFields: "Dormant,aliases" }, "Scalar display"],
      [{ nameFields: "Other,Dormant" }, "Other display"],
      [{ nameFields: "Dormant,Other" }, "Scalar display"],
      [{ nameFields: "Dormant", renderAlias: false }, "Candidate"],
    ];
    const check = guardTitleReuse(f);
    for (const [options, title] of expected) {
      const capture = await f.acquisition.captureForReplay(file.path, presentation, runtime());
      assert.equal(capture.outcome, "ready");
      assert.equal((await fullTitle(f, file.path, options)).title, title);
    }
    check();
  } finally { f.close(); }
});

test("selected-title nodeTitleScript remains inert even for a throwing or side-effecting script", async () => {
  const f = replayFixture();
  try {
    f.add("Candidate.md", "", { Title: "Safe" }); await seedTitleBodies(f);
    globalThis.selectedTitleScriptRuns = 0;
    const result = await fullTitle(f, "Candidate.md", { nameFields: "Title",
      nodeTitleScript: "globalThis.selectedTitleScriptRuns++; throw new Error('must not execute');" });
    assert.equal(result.title, "Safe"); assert.equal(globalThis.selectedTitleScriptRuns, 0);
  } finally { delete globalThis.selectedTitleScriptRuns; f.close(); }
});

test("selected-title missing metadata produces facade fallback but pending replay, not certified absence", async () => {
  const f = replayFixture();
  try {
    const file = f.add("Candidate.md", ""); await seedTitleBodies(f);
    assert.equal((await f.acquisition.acquire(file, f.legacy.get(file.path).body)).current, true);
    f.metadata.delete(file.path);
    assert.equal((await fullTitle(f, file.path, { nameFields: "Title" })).title, "Candidate");
    const check = guardTitleReuse(f);
    const capture = await f.acquisition.captureForReplay(file.path, presentation, runtime());
    assert.equal(capture.outcome, "pending-acquisition"); assert.equal(capture.reason, "pending-metadata");
    assert(!("request" in capture)); check();
  } finally { f.close(); }
});

test("selected-title nonnull empty startup cache is accepted without a parse-completion observation", async () => {
  const f = replayFixture();
  try {
    const file = f.add("Candidate.md", ""); f.metadata.set(file.path, { links: [] });
    await seedTitleBodies(f);
    const before = await f.acquisition.captureForReplay(file.path, presentation, runtime());
    assert.equal(before.outcome, "pending-acquisition"); assert.equal(before.reason, "unsaved");
    assert.equal((await f.acquisition.acquire(file, f.legacy.get(file.path).body)).current, true);
    const after = await f.acquisition.captureForReplay(file.path, presentation, runtime());
    assert.equal(after.outcome, "ready", "This is existing replay readiness, NOT source-bound title absence proof");
    assert.equal((await fullTitle(f, file.path, { nameFields: "Title" })).title, "Candidate");
  } finally { f.close(); }
});

test("selected-title host-double edit can be reacquired before metadata completion; ready is not a completion seal", async () => {
  const f = replayFixture();
  try {
    const file = f.add("Candidate.md", "", { Title: "Old cache" }); await seedTitleBodies(f);
    assert.equal((await f.acquisition.acquire(file, f.legacy.get(file.path).body)).current, true);
    const old = await f.acquisition.captureForReplay(file.path, presentation, runtime());
    const oldCache = f.metadata.get(file.path);
    file.stat.mtime++; f.text.set(file.path, "---\nTitle: New cache\n---\n");
    f.app.vault.trigger("modify", file);
    assert.equal(old.request.host.isCurrent(), false);
    assert.equal((await f.acquisition.captureForReplay(file.path, presentation, runtime())).reason, "unsaved");
    await seedTitleBodies(f);
    assert.equal((await f.acquisition.acquire(file, f.legacy.get(file.path).body)).current, true);
    assert.equal(f.metadata.get(file.path), oldCache, "The host double has not delivered changed(file,data,cache)");
    const after = await f.acquisition.captureForReplay(file.path, presentation, runtime());
    assert.equal(after.outcome, "ready");
    assert.equal((await fullTitle(f, file.path, { nameFields: "Title" })).title, "Old cache");
    f.metadata.set(file.path, { frontmatter: { Title: "New cache" }, links: [] });
    f.app.metadataCache.trigger("changed", file, f.text.get(file.path), f.metadata.get(file.path));
    assert.equal(after.request.host.isCurrent(), false);
    assert.equal((await f.acquisition.captureForReplay(file.path, presentation, runtime())).reason, "unsaved");
    assert.equal((await fullTitle(f, file.path, { nameFields: "Title" })).title, "New cache");
  } finally { f.close(); }
});

test("selected-title host-double in-place scalar mutation is invisible to cache-identity/environment checks", async () => {
  const f = replayFixture();
  try {
    const file = f.add("Candidate.md", "", { Title: "Before" }); await seedTitleBodies(f);
    assert.equal((await f.acquisition.acquire(file, f.legacy.get(file.path).body)).current, true);
    const capture = await f.acquisition.captureForReplay(file.path, presentation, runtime());
    assert.equal(capture.outcome, "ready");
    const index = await fullTitleIndex(f, { nameFields: "Title" });
    try {
      const page = index.state.pages.get(file.path);
      assert.equal(index.titleFor(page), "Before");
      f.metadata.get(file.path).frontmatter.Title = "After";
      assert.equal(capture.request.host.isCurrent(), true, "Adversarial host trace; no claim about native event ordering");
      assert.equal(index.titleFor(page), "Before", "Memoization signature is not selected-property evidence");
      assert.equal((await fullTitle(f, file.path, { nameFields: "Title" })).title, "After");
    } finally { index.destroy(); }
  } finally { f.close(); }
});

/** Invalidation is present and useful; do not confuse a missing completion premise with no fences. */
const invalidations = [
  ["cache replacement", (f, file) => f.metadata.set(file.path, structuredClone(f.metadata.get(file.path)))],
  ["metadata changed", (f, file) => f.app.metadataCache.trigger("changed", file, f.text.get(file.path), f.metadata.get(file.path))],
  ["global resolved", f => f.app.metadataCache.trigger("resolved")],
  ["physical revision", (_f, file) => { file.stat.mtime++; }],
  ["exact file replacement", (f, file) => f.files.set(file.path, new window.SourceTestFile(file.path))],
];
for (const [name, mutate] of invalidations) {
  test(`selected-title existing capture fences ${name}`, async () => {
    const f = replayFixture();
    try {
      const file = f.add("Candidate.md", "", { Title: "Title" }); await seedTitleBodies(f);
      assert.equal((await f.acquisition.acquire(file, f.legacy.get(file.path).body)).current, true);
      const capture = await f.acquisition.captureForReplay(file.path, presentation, runtime());
      assert.equal(capture.outcome, "ready"); assert.equal(capture.request.host.isCurrent(), true);
      mutate(f, file); assert.equal(capture.request.host.isCurrent(), false);
    } finally { f.close(); }
  });
}

test("selected-title replay capture rejects demand cancellation at its final awaited digest", async () => {
  const f = replayFixture();
  try {
    const file = f.add("Candidate.md", "", { Title: "Title" }); await seedTitleBodies(f);
    assert.equal((await f.acquisition.acquire(file, f.legacy.get(file.path).body)).current, true);
    let current = true, digests = 0;
    const digest = f.repository.observationDigest.bind(f.repository);
    f.repository.observationDigest = async value => { const result = await digest(value); digests++; current = false; return result; };
    const check = guardTitleReuse(f);
    const capture = await f.acquisition.captureForReplay(file.path, presentation, runtime({ isCurrent: () => current }));
    assert.equal(digests, 1); assert.equal(capture.outcome, "cancelled"); assert(!("request" in capture)); check();
  } finally { f.close(); }
});

test("selected-title selector eagerly enumerates the entire frontmatter even when the first key wins", async () => {
  const f = replayFixture();
  try {
    f.add("Candidate.md", "", { Title: "Chosen" }); await seedTitleBodies(f);
    const index = await fullTitleIndex(f, { nameFields: "Title" });
    try {
      let unselectedReads = 0;
      Object.defineProperty(f.metadata.get("Candidate.md").frontmatter, "Unselected", {
        enumerable: true, get() { unselectedReads++; return "Not needed"; },
      });
      assert.equal(index.titleFor(index.state.pages.get("Candidate.md")), "Chosen");
      assert.equal(unselectedReads, 1, "An output-length cap cannot bound Object.entries input work");
    } finally { index.destroy(); }
  } finally { f.close(); }
});

test("selected-title candidate alias belongs to its own source, not just the owner of an incoming relation", async () => {
  const f = replayFixture();
  try {
    const owner = f.add("Owner.md", "", { Friends: "[[Candidate]]" });
    const candidate = f.add("Candidate.md", "", { aliases: ["Candidate alias"] });
    f.resolutions.set("Candidate", candidate.path); await seedTitleBodies(f);
    for (const file of [owner, candidate]) assert.equal((await f.acquisition.acquire(file, f.legacy.get(file.path).body)).current, true);
    const expected = await fullTitle(f, candidate.path);
    assert.equal(expected.title, "Candidate alias");
    const check = guardTitleReuse(f);
    for (const [ids, title] of [[[owner.path], "Candidate"], [[owner.path, candidate.path], expected.title]]) {
      const replay = await f.acquisition.prepareCachedSemantics(ids, policy(), presentation, runtime());
      assert.equal(replay.outcome, "ready");
      const index = await fullCenterIndex(M, f, replay.compilation, settings, centerGateSettings());
      try { assert.equal(index.titleFor(index.state.pages.get(candidate.path)), title); }
      finally { index.destroy(); }
    }
    check();
  } finally { f.close(); }
});

test("selected-title current tag policy and URL-origin support come from canonical synthetic facts", async () => {
  const f = replayFixture();
  try {
    f.add("Candidate.md", "[Path label](https://example.com/path)\n[Origin label](https://example.com)");
    f.metadata.get("Candidate.md").hostTags = ["#project/nested"];
    await seedTitleBodies(f);
    for (const [showFullTagName, title] of [[true, "project/nested"], [false, "nested"]]) {
      const index = await fullTitleIndex(f, { showFullTagName });
      try {
        const tag = [...index.state.pages.values()].find(page => page.isTag && page.path.endsWith("project/nested"));
        assert(tag); assert.equal(index.titleFor(tag), title);
        assert.equal(index.titleFor(index.state.pages.get("https://example.com/path")), "Path label");
        assert.equal(index.titleFor(index.state.pages.get("https://example.com")), "Origin label");
      } finally { index.destroy(); }
    }
  } finally { f.close(); }
});

test("selected-title complete catalog URL support can disagree with full-build source encounter order", async () => {
  const f = replayFixture();
  try {
    const { first, second, url } = nestedTitleOwners(f); await seedTitleBodies(f);
    const expected = await fullTitle(f, url);
    assert.equal(expected.title, "First label");
    const { catalog, discovery, structure } = await buildTitleCatalog(f, C, catalogFixture, collect, presentation, runtime);
    const endpoint = { id: url, kind: "url", state: "materialized", semanticPath: url };
    const result = await discovery.discover({ kind: "neighborhood", endpoints: [endpoint] });
    assert.equal(result.outcome, "ready", JSON.stringify(result));
    assert.equal(result.coverage, "complete-direct-contributors");
    assert.deepEqual(result.sourceIds, [second.path, first.path], "This is the production writer/discovery order");
    const rows = [...catalog.state.pages.values()].flatMap(page => JSON.parse(page.data)).filter(row => row.kind === "source");
    assert.deepEqual(rows.sort((a, b) => a.order - b.order).map(row => row.source.id), result.sourceIds);
    assert.deepEqual(structure.filter(fact => fact.kind === "entity" && fact.entity.kind === "document").map(fact => fact.entity.id), result.sourceIds);
    const check = guardTitleReuse(f);
    for (const [ids, title] of [[result.sourceIds, "Second label"], [[first.path, second.path], expected.title]]) {
      const replay = await f.acquisition.prepareCachedSemantics(ids, policy(), presentation, runtime());
      assert.equal(replay.outcome, "ready");
      const index = await fullCenterIndex(M, f, replay.compilation, settings, centerGateSettings());
      try { assert.equal(index.titleFor(index.state.pages.get(url)), title); }
      finally { index.destroy(); }
    }
    check();
  } finally { f.close(); }
});
