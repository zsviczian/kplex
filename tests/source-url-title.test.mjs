/**
 * SI4 URL-title ordering proof against the actual full GraphBuilder and fresh GraphIndex.titleFor.
 * Portable storage coordinates are explicit doubles; separate real Chromium tests own durability.
 * There is no substitute label selector and no weakening of the original v2 counterexample.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { C, catalogFixture, head, ref, rowsFor } from "./support/contributorCatalogFixture.mjs";
import { M, replayFixture, settings, runtime, policy } from "./support/cachedSourceFixture.mjs";
import { seedTitleBodies, fullTitle, nestedTitleOwners } from "./support/selectedTitleFixture.mjs";
import { titleFixture, bindTitleCatalog, titleUrl, urlRef, guardUrlTitle, rejectedTitle, reframeTitleCatalog } from "./support/urlTitleFixture.mjs";

/** Read the real full-builder title before turning on settings-only work guards. */
async function titleVariants(f, url = titleUrl) {
  const variants = [{}, { renderAlias: false }, { nameFields: "Title,ALIASES" },
    { nodeTitleScript: "throw new Error('must not execute')", nameFields: "Title" },
    { inferAllLinksAsFriends: true, inverseInfer: true }];
  return Promise.all(variants.map(async options => ({ options, expected: await fullTitle(f, url, options) })));
}

/** v3 stores the new coordinate, but must never change the ordinary relation contributor order. */
test("v3 resolves the real nested/root label counterexample without changing structural order", async () => {
  const f = await titleFixture();
  try {
    const expected = await titleVariants(f);
    const check = guardUrlTitle(f);
    const relation = await f.discovery.discover({ kind: "neighborhood", endpoints: [urlRef()] });
    assert.deepEqual(relation.sourceIds, ["Root.md", "Nested/First.md"]);
    assert.equal(relation.markdownOrder, undefined);
    const ordered = await f.discovery.discoverUrlTitle(urlRef());
    assert.equal(ordered.outcome, "ready");
    assert.deepEqual(ordered.sourceIds, ["Nested/First.md", "Root.md"]);
    assert.deepEqual(ordered.markdownOrder, [0, 1]);
    for (const { options, expected: full } of expected) {
      const result = await f.makeReader().prepare(urlRef(), policy({ settings: { ...settings, ...options } }), runtime());
      assert.equal(result.outcome, "ready", JSON.stringify(result));
      assert.equal(result.coverage, "complete-url-title-input");
      assert.equal(result.input.name, "First label"); assert.equal(result.input.name, full.title);
      assert.deepEqual(full.aliases, ["First label", "Second label"]); assert.equal(result.input.url, titleUrl);
      assert.deepEqual(result.work, { sourceReplays: 2, familyVisits: 8 });
      assert(!("compilation" in result)); assert(!("preparation" in result));
    }
    check();
  } finally { f.close(); }
});

/** The existing full compiler's accepted batches are observed, not replaced or locally recompiled. */
test("full-builder phases keep all host links before per-file metadata/references/Date/body URLs", async () => {
  const f = replayFixture(), trace = [];
  const accept = M.NormalizedGraphCompiler.prototype.acceptBatch;
  try {
    const { first, second } = nestedTitleOwners(f);
    f.metadata.get(first.path).frontmatter = { aliases: ["File alias"], Friends: titleUrl, When: "2026-09-30" };
    f.metadata.get(second.path).frontmatter = { aliases: ["Other alias"] };
    f.app.dateFields.add("When");
    f.app.metadataCache.resolvedLinks[first.path] = { [second.path]: 1 };
    f.app.metadataCache.resolvedLinks[second.path] = { [first.path]: 1 };
    await seedTitleBodies(f);
    M.NormalizedGraphCompiler.prototype.acceptBatch = async function(read, batch, before) {
      trace.push(...batch.records); return accept.call(this, read, batch, before);
    };
    assert.equal((await fullTitle(f, titleUrl)).title, "First label");
    const positions = kind => trace.flatMap((record, index) => record.kind === kind ? [index] : []);
    assert(positions("entity").length > 0 && positions("obsidian-link").length === 2);
    assert(Math.max(...positions("obsidian-link")) < Math.min(...positions("semantic-metadata")));
    const local = trace.filter(record => record.source.id === first.path);
    const index = kind => local.findIndex(record => record.kind === kind);
    assert(index("semantic-metadata") < index("reference-value"));
    assert(index("reference-value") < index("date-property"));
    assert(index("date-property") < index("body-url"));
    assert.deepEqual(trace.filter(record => record.kind === "body-url").map(record => record.source.id), [first.path, second.path]);
  } finally { M.NormalizedGraphCompiler.prototype.acceptBatch = accept; f.close(); }
});

const duplicateCases = [
  ["later-line labels cannot repair the first bare occurrence", `${titleUrl}\n[Ignored later](${titleUrl})`, undefined, "Second label"],
  ["the last same-line duplicate label wins in the parser", `[Earlier](${titleUrl}) [Last on line](${titleUrl})`, "Last on line", "Last on line"],
  ["an empty same-line duplicate erases an earlier label", `[Earlier](${titleUrl}) [](${titleUrl})`, undefined, "Second label"],
  ["whitespace-only labels do not win", `[   ](${titleUrl})`, undefined, "Second label"],
  ["a label equal to the URL is not meaningful", `[${titleUrl}](${titleUrl})`, titleUrl, "Second label"],
  ["the first distinct URL keeps its earlier meaningful label", `[First retained](${titleUrl})\n[Ignored later](${titleUrl})`, "First retained", "First retained"],
];
for (const [name, body, label, expected] of duplicateCases) {
  test(`canonical URL input: ${name}`, async () => {
    const f = await titleFixture(f => { const { first } = nestedTitleOwners(f); f.text.set(first.path, body); });
    try {
      assert.deepEqual(M.parseBodyMetadata(body).urls.map(item => item.label), [label]);
      const full = await fullTitle(f, titleUrl); assert.equal(full.title, expected);
      const check = guardUrlTitle(f);
      const result = await f.makeReader().prepare(urlRef(), policy(), runtime());
      assert.equal(result.outcome, "ready", JSON.stringify(result)); assert.equal(result.input.name, full.title); check();
    } finally { f.close(); }
  });
}

test("origin-title support includes all child-path owners and its independent meaningful label", async () => {
  const origin = "https://example.com";
  const f = await titleFixture(f => {
    f.add("A.md", `[Path label](${titleUrl})`);
    f.add("B.md", `[Other path](${origin}/other)`);
    f.add("C.md", `[Independent origin](${origin})`);
    f.add("Unrelated.md", "No URL here");
  });
  try {
    const full = await fullTitle(f, origin); assert.equal(full.title, "Independent origin");
    const check = guardUrlTitle(f);
    const result = await f.makeReader().prepare(urlRef(origin), policy(), runtime());
    assert.equal(result.outcome, "ready", JSON.stringify(result)); assert.equal(result.input.name, full.title);
    assert.deepEqual(result.certificate.contributors.sources.map(stamp => stamp.head.sourceId), ["A.md", "B.md", "C.md"]);
    assert.equal(result.work.familyVisits, 12); check();
  } finally { f.close(); }
});

test("origin-only and policy-selected property URLs use the canonical fallback, never a child label", async () => {
  for (const property of [false, true]) {
    const url = property ? titleUrl : "https://example.com";
    const f = await titleFixture(f => f.add("A.md", property ? "" : `[Not the origin label](${titleUrl})`, property ? { Friends: titleUrl } : {}));
    try {
      const full = await fullTitle(f, url); assert.equal(full.title, url);
      const check = guardUrlTitle(f);
      const result = await f.makeReader().prepare(urlRef(url), policy(), runtime());
      assert.equal(result.outcome, "ready", JSON.stringify(result)); assert.equal(result.input.name, full.title); check();
    } finally { f.close(); }
  }
});

test("old v2 roots retain relation discovery but cannot certify positive or negative URL titles", async () => {
  const f = await titleFixture(nestedTitleOwners, 2);
  try {
    const check = guardUrlTitle(f);
    assert.equal((await f.discovery.discover({ kind: "neighborhood", endpoints: [urlRef()] })).outcome, "ready");
    for (const endpoint of [urlRef(), urlRef("https://absent.example")]) {
      rejectedTitle(await f.makeReader().prepare(endpoint, policy(), runtime()), "dependency-pending");
    }
    check();
  } finally { f.close(); }
});

test("unknown, pathless and non-URL requests cannot become fabricated URL names", async () => {
  const f = await titleFixture();
  try {
    const check = guardUrlTitle(f);
    for (const endpoint of [ref("A.md"), { id: "opaque-url", kind: "url", state: "materialized" },
      { ...urlRef(), physicalPath: "A.md" }, { ...urlRef(), state: "unresolved" }]) {
      rejectedTitle(await f.makeReader().prepare(endpoint, policy(), runtime()), "unsupported-scope");
    }
    rejectedTitle(await f.makeReader().prepare(urlRef("https://absent.example"), policy(), runtime()), "missing"); check();
  } finally { f.close(); }
});

for (const [name, values] of [["missing", [undefined, 1]], ["duplicate", [0, 0]], ["negative", [-1, 1]],
  ["fractional", [0.5, 1]], ["incomplete range", [0, 2]], ["nonfinite", [Infinity, 1]]]) {
  test(`catalog acquisition rejects ${name} Markdown ordinals before root activation`, async () => {
    const f = await titleFixture();
    try {
      const old = structuredClone(f.catalog.state.root);
      const host = { ...f.host, collect: async emit => {
        let i = 0;
        for (const fact of f.structure) if (!(await emit(fact,
          fact.kind === "entity" && fact.entity.kind === "document" ? values[i++] : undefined))) return false;
        return true;
      } };
      const d = new C.SourceContributorDiscovery(f.port, host, runtime());
      rejectedTitle(await d.rebuild(), "dependency-invalid");
      assert.deepEqual(f.catalog.state.root, old);
    } finally { f.close(); }
  });
}

for (const fault of ["missing", "duplicate", "out-of-range", "fractional", "extra"]) {
  test(`authenticated but malformed v3 ${fault} ordinal rows fail closed`, async () => {
    const f = await titleFixture();
    try {
      const changed = await reframeTitleCatalog(C, f.catalog.state.root, [...f.catalog.state.pages.values()], rows => {
        const selected = rows.filter(row => row.kind === "source");
        if (fault === "missing") delete selected[0].markdownOrdinal;
        if (fault === "duplicate") selected[0].markdownOrdinal = selected[1].markdownOrdinal;
        if (fault === "out-of-range") selected[0].markdownOrdinal = selected.length;
        if (fault === "fractional") selected[0].markdownOrdinal = 0.25;
        if (fault === "extra") selected[0].title = "Untrusted mirror";
        return rows;
      }, f.port.observationDigest);
      f.catalog.state.root = changed.root;
      f.catalog.state.pages = new Map(changed.pages.map(page => [JSON.stringify([page.slot, page.bucket, page.index]), page]));
      const check = guardUrlTitle(f);
      rejectedTitle(await f.makeReader().prepare(urlRef(), policy(), runtime()), "dependency-invalid"); check();
    } finally { f.close(); }
  });
}

test("missing committed negative bucket pages are not URL absence or surviving support", async () => {
  const f = await titleFixture();
  try {
    const bucket = C.sourceDependencyBucket(C.contributorKey("node", titleUrl));
    const page = [...f.catalog.state.pages.values()].find(page => page.bucket === bucket && page.generation === f.catalog.state.root.build.generation);
    assert(page); f.catalog.state.pages.delete(JSON.stringify([page.slot, page.bucket, page.index]));
    let absent = 0;
    while (C.sourceDependencyBucket(C.contributorKey("node", `https://missing.example/${absent}`)) !== bucket) absent++;
    const check = guardUrlTitle(f);
    for (const endpoint of [urlRef(), urlRef(`https://missing.example/${absent}`)]) {
      rejectedTitle(await f.makeReader().prepare(endpoint, policy(), runtime()), "dependency-invalid");
    }
    check();
  } finally { f.close(); }
});

test("opaque SourceIds retain their own ordinals; hot URL support is never truncated", async () => {
  const url = urlRef(), sources = Array.from({ length: 257 }, (_, ordinal) => {
    const sourceId = `opaque-owner-${ordinal}`, source = ref(`node-${ordinal}`, "document", `files/${ordinal}.md`);
    return { sourceId, source, head: head(sourceId, source, ordinal + 1), records: [
      { kind: "body-url", source, sourceRevision: "r", target: { entity: url, rawTarget: titleUrl, resolvedBy: "url" } },
    ] };
  });
  for (const size of [2, 257]) {
    const selected = sources.slice(0, size), f = catalogFixture(selected);
    const rows = rowsFor(selected);
    for (const row of rows) if (row.kind === "source") row.markdownOrdinal = size - 1 - row.order;
    await f.seal();
    const changed = await reframeTitleCatalog(C, f.state.root, [...f.state.pages.values()], () => rows, f.repository.observationDigest, 3);
    f.state.root = changed.root;
    f.state.pages = new Map(changed.pages.map(page => [JSON.stringify([page.slot, page.bucket, page.index]), page]));
    const result = await f.discovery.discoverUrlTitle(url);
    if (size === 2) {
      assert.equal(result.outcome, "ready", JSON.stringify(result));
      assert.deepEqual(result.sourceIds, ["opaque-owner-1", "opaque-owner-0"]); assert.deepEqual(result.markdownOrder, [0, 1]);
    } else rejectedTitle(result, "backpressure");
  }
});

for (const fence of ["demand", "policy", "host", "source-head", "root"]) {
  test(`URL-title final revalidation closes ${fence} supersession`, async () => {
    const f = await titleFixture();
    try {
      let current = true;
      const p = policy(), d = f.discovery;
      const wrapped = { discoverUrlTitle: endpoint => d.discoverUrlTitle(endpoint), isHostCurrent: () => d.isHostCurrent(),
        revalidate: async certificate => {
          if (fence === "source-head") f.catalog.state.heads.set("Root.md", { ...f.catalog.state.heads.get("Root.md"), sequence: 999 });
          if (fence === "root") f.catalog.state.root.build.generation += "replaced";
          const result = await d.revalidate(certificate);
          if (fence === "demand") current = false;
          if (fence === "policy") p.revision = "policy:2";
          if (fence === "host") f.app.vault.trigger("modify", f.files.get("Root.md"));
          return result;
        } };
      rejectedTitle(await f.makeReader(wrapped).prepare(urlRef(), p, runtime({ isCurrent: () => current })));
      assert.equal(f.repository.readers.size, 0);
    } finally { f.close(); }
  });
}

test("demand cancellation during a selected family returns no input and releases every lease", async () => {
  const f = await titleFixture();
  try {
    let current = true;
    const read = f.port.readSelected;
    f.port.readSelected = (id, matches, work, isCurrent) => read(id, matches, reader => work({ ...reader,
      visit: async (...args) => { const result = await reader.visit(...args); current = false; return result; },
    }), isCurrent);
    const check = guardUrlTitle(f);
    rejectedTitle(await f.makeReader().prepare(urlRef(), policy(), runtime({ isCurrent: () => current })), "cancelled"); check();
  } finally { f.close(); }
});

/** Production host collection attaches Markdown order without changing structural emission. */
test("host acquisition emits structural facts with a distinct complete Markdown coordinate", async () => {
  const f = replayFixture();
  try {
    nestedTitleOwners(f);
    const d = f.acquisition.contributorDiscovery(runtime()), records = [];
    assert.equal(d.host.markdownOrderVersion, 1);
    assert.equal(await d.host.collect(async (fact, ordinal) => { records.push({ fact, ordinal }); return true; }), true);
    assert.deepEqual(records.filter(({ fact }) => fact.kind === "entity" && fact.entity.kind === "document")
      .map(({ fact, ordinal }) => [fact.entity.physicalPath, ordinal]), [["Root.md", 1], ["Nested/First.md", 0]]);
    for (const { fact, ordinal } of records) if (fact.kind !== "entity" || fact.entity.kind !== "document") assert.equal(ordinal, undefined);
  } finally { f.close(); }
});

for (const fault of ["duplicate", "reordered", "shared-array", "substituted", "missing", "non-document"]) {
  test(`host acquisition rejects ${fault} Markdown membership/order`, async () => {
    const f = replayFixture();
    try {
      const { first, second } = nestedTitleOwners(f);
      const get = f.app.vault.getMarkdownFiles, shared = get(); let calls = 0;
      f.app.vault.getMarkdownFiles = () => {
        const files = get(); calls++;
        if (fault === "shared-array") return calls === 1 ? shared : shared.reverse();
        if (fault === "duplicate") return [first, first];
        if (fault === "missing") return [first];
        if (fault === "non-document") return [first, { ...second }];
        if (calls === 1) return files;
        return fault === "reordered" ? files.reverse() : [first, new window.SourceTestFile(second.path)];
      };
      const d = f.acquisition.contributorDiscovery(runtime());
      let complete = false;
      try { complete = await d.host.collect(async () => true); }
      catch (error) { assert.equal(error.reason, "host-catalog-stale"); }
      assert.equal(complete, false);
    } finally { f.close(); }
  });
}

test("large Markdown ordinal acquisition yields cooperatively and cancels before any structural emission", async () => {
  const f = replayFixture();
  try {
    for (let i = 0; i < 300; i++) f.add(`Note-${i}.md`, "");
    let current = true, yields = 0, emitted = 0;
    const rt = runtime({ isCurrent: () => current, yield: async () => { yields++; current = false; } });
    const d = f.acquisition.contributorDiscovery(rt);
    assert.equal(await d.host.collect(async () => { emitted++; return true; }), false);
    assert.equal(yields, 1); assert.equal(emitted, 0);
  } finally { f.close(); }
});

for (const mutation of ["insert", "delete", "rename"]) {
  test(`${mutation} fences old URL-title order and explicit reacquisition matches a fresh full title`, async () => {
    let layout;
    let f = await titleFixture(input => { layout = nestedTitleOwners(input); });
    try {
      const old = f.makeReader();
      assert.equal((await old.prepare(urlRef(), policy(), runtime())).input.name, "First label");
      const { first, second, root, folder } = layout;
      if (mutation === "insert") {
        const inserted = f.add("Inserted.md", `[Inserted label](${titleUrl})`);
        // New encounter order is host-owned; it need not be path or structural order.
        f.files.clear(); f.files.set(inserted.path, inserted); f.files.set(first.path, first); f.files.set(second.path, second);
        root.children.push(inserted); f.app.vault.trigger("create", inserted);
      } else if (mutation === "delete") {
        f.files.delete(first.path); folder.children = []; f.app.vault.trigger("delete", first);
      } else {
        const oldPath = first.path;
        f.files.delete(oldPath); first.path = "Nested/Renamed.md"; first.name = "Renamed.md"; first.basename = "Renamed";
        f.files.set(first.path, first); f.text.set(first.path, f.text.get(oldPath)); f.metadata.set(first.path, f.metadata.get(oldPath));
        f.app.vault.trigger("rename", first, oldPath);
      }
      const get = f.app.vault.getMarkdownFiles, counters = f.acquisition.getCounters(); let scans = 0;
      f.app.vault.getMarkdownFiles = () => { scans++; throw new Error("No settings-time inventory refresh"); };
      rejectedTitle(await old.prepare(urlRef(), policy(), runtime()));
      assert.equal(scans, 0); assert.deepEqual(f.acquisition.getCounters(), counters);
      f.app.vault.getMarkdownFiles = get;
      f = await bindTitleCatalog(f);
      const full = await fullTitle(f, titleUrl);
      assert.equal(full.title, mutation === "insert" ? "Inserted label" : "Second label");
      const check = guardUrlTitle(f);
      const result = await f.makeReader().prepare(urlRef(), policy(), runtime());
      assert.equal(result.outcome, "ready", JSON.stringify(result)); assert.equal(result.input.name, full.title);
      assert.deepEqual(result.certificate.contributors.markdownOrder, [...f.ordinals.values()]);
      const ids = result.certificate.contributors.sources.map(stamp => stamp.head.sourceId);
      if (mutation !== "insert") assert(!ids.includes("Nested/First.md"));
      if (mutation === "rename") assert(ids.includes("Nested/Renamed.md"));
      check();
    } finally { f.close(); }
  });
}
