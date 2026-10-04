/** Discovery-driven compiler equality. Catalog IO is an explicit portable port, not durable IDB evidence. */
import assert from "node:assert/strict";
import test from "node:test";
import { catalogFixture } from "./support/contributorCatalogFixture.mjs";
import { M, replayFixture, settings, presentation, runtime, policy, hostOracle, semanticView } from "./support/cachedSourceFixture.mjs";

/** Acquire actual source facts, then index their canonical replay through the portable catalog port. */
async function fixture() {
  const f = replayFixture();
  f.add("A.md", "DormantInline:: [[B]]\nFriends:: [[B]]\nType:: Inline type\n", {
    Friends: "[[Alias B]] [[B]]", Dormant: "[[Never visible]]", Image: "[[picture.png]]", When: "2026-09-29",
    aliases: ["A alias", "Another alias"], Type: "[[Research]]", tags: ["project/alpha"],
  });
  f.metadata.get("A.md").hostTags = ["#project/alpha", "#project/alpha"];
  f.add("B.md", "Opposes:: [[A]]\nNext:: [[A]]", { Parent: "[[A]]", Style: "#project" });
  f.add("C.md", "[Third-party page](https://example.com/path)", { Friends: "[[A]]" });
  f.metadata.get("C.md").hostTags = ["#project/beta"];
  f.add("Daily/2026-09-29.md", "");
  f.add("picture.png", "");
  for (const [name, path] of [["B", "B.md"], ["Alias B", "B.md"], ["A", "A.md"]]) f.resolutions.set(name, path);
  f.app.metadataCache.resolvedLinks["A.md"] = { "B.md": 2, "picture.png": 1 };
  f.app.metadataCache.resolvedLinks["B.md"] = { "A.md": 2 };
  f.app.metadataCache.unresolvedLinks["A.md"] = { "body missing": 1 };
  f.app.dateFields.add("When");
  const ids = ["A.md", "B.md", "C.md", "Daily/2026-09-29.md"];
  const sources = [], structure = [...f.files.values()].map(M.entityFactForFile);
  for (const [index, id] of ids.entries()) {
    assert.equal((await f.acquisition.acquire(f.files.get(id), M.parseBodyMetadata(f.text.get(id)))).current, true);
    const captured = await f.acquisition.captureForReplay(id, presentation, runtime());
    assert.equal(captured.outcome, "ready");
    const records = [];
    const replay = await new M.CachedSourceReplay(f.repository).read(captured.request, runtime(), batch => { records.push(...batch.records); return true; });
    assert.equal(replay.outcome, "ready");
    // Setup deliberately runs an independent canonical replay oracle and the new fused producer.
    // This is not measured bootstrap work; policy-only assertions below begin after setup.
    const summarized = await M.summarizeContributorOwner(f.repository, captured.request, runtime());
    assert.equal(summarized.outcome, "ready"); assert.equal(summarized.value.work.familyVisits, 4);
    // Sequence is a catalog-port fixture coordinate only. The compiler uses the actual production
    // memory repository and its real unsaved stamps; no production storage gate is represented here.
    sources.push({ sourceId: id, source: captured.request.host.source, head: { ...replay.stamp.head, sequence: index + 1 },
      summary: summarized.value.summary, records });
    structure.push(...records.filter(record => record.kind === "tag-tree"));
  }
  const catalog = catalogFixture(sources, structure); await catalog.seal();
  return { f, ids, sources, catalog };
}

test("finite complete scope: discovery → once-per-owner preparation equals full compiler under five policies", async () => {
  const { f, ids, sources, catalog } = await fixture();
  try {
    const request = { kind: "neighborhood", endpoints: sources.map(source => source.source) };
    const variants = [settings,
      { ...settings, hierarchy: { ...settings.hierarchy, parents: ["Parent", "Dormant", "DormantInline"] } },
      { ...settings, hierarchy: { ...settings.hierarchy, leftFriends: [], rightFriends: ["Friends", "Opposes"] } },
      { ...settings, inferAllLinksAsFriends: true, inverseInfer: true },
      { ...settings, nodeImageProperty: "Image", thumbnailProperty: "Image" },
    ];
    const oracles = [];
    for (const variant of variants) oracles.push(await hostOracle(f, ids, variant));
    const before = JSON.stringify([catalog.state.root, [...catalog.state.pages], [...catalog.state.heads]]);
    const counters = f.acquisition.getCounters(), writes = catalog.state.writes;
    f.app.vault.read = f.app.vault.cachedRead = async () => assert.fail("Discovery/preparation must not read Markdown");
    f.repository.replace = async () => assert.fail("Policy reinterpretation cannot rewrite source heads");
    f.acquisition.parse = async () => assert.fail("Policy reinterpretation cannot parse Markdown");
    for (const [index, variant] of variants.entries()) {
      const discovered = await catalog.discovery.discover(request);
      assert.equal(discovered.outcome, "ready", JSON.stringify(discovered));
      assert.deepEqual(discovered.sourceIds, ids);
      const prepared = await f.acquisition.prepareCachedSemantics(discovered.sourceIds,
        policy({ revision: "discovered-policy:" + index, settings: variant }), presentation, runtime());
      assert.equal(prepared.outcome, "ready", JSON.stringify(prepared));
      // The accepted view retains exact IDs, materialization, directed roles, source-kind,
      // lexical provenance and declaration multiplicity. Only attempt-local evidence IDs/revisions differ.
      assert.deepEqual(semanticView(prepared.compilation), semanticView(oracles[index]), "policy " + index);
      assert.equal(prepared.work.length, ids.length);
      assert.equal(new Set(prepared.sources.map(value => value.head.sourceId)).size, ids.length);
      assert(prepared.work.every(value => value.familyVisits === 4));
      assert.equal(await catalog.discovery.revalidate(discovered), "ready");
      assert.equal(JSON.stringify([catalog.state.root, [...catalog.state.pages], [...catalog.state.heads]]), before);
      assert.equal(catalog.state.writes, writes);
    }
    assert.deepEqual(f.acquisition.getCounters(), counters); assert.deepEqual(f.reads, []); assert.deepEqual(f.parses, []);
    assert(!oracles[0].node("Never visible")); assert(oracles[1].node("Never visible"));
    const opposite = await catalog.discovery.discover({ kind: "pair", endpoints: sources.slice(0, 2).map(value => value.source) });
    assert.equal(opposite.outcome, "ready");
    assert.deepEqual(opposite.sourceIds, ["A.md", "B.md", "C.md"], "Opposite declarations and incoming third party remain in the cover");
  } finally { f.close(); }
});

test("canonical third-party URL origin and tag ancestor dependencies do not depend on endpoint documents", async () => {
  const { f, sources, catalog } = await fixture();
  try {
    const url = sources[2].records.find(record => record.kind === "body-url" && record.origin);
    assert(url, "Canonical URL normalization provides the origin");
    const found = await catalog.discovery.discover({ kind: "pair", endpoints: [url.origin.entity, url.target.entity] });
    assert.equal(found.outcome, "ready", JSON.stringify(found)); assert.deepEqual(found.sourceIds, ["C.md"]);
    const tags = sources.flatMap(source => source.records).filter(record => record.kind === "tag-tree");
    assert(tags.length);
    const tag = tags[0].source;
    const ancestor = { ...tag, id: "opaque-parent-tag", semanticPath: "tag:project" };
    const tagged = await catalog.discovery.discover({ kind: "pair", endpoints: [ancestor, tag] });
    assert.equal(tagged.outcome, "ready", JSON.stringify(tagged));
    assert.deepEqual(tagged.sourceIds, ["A.md", "C.md"], "Conservative tag-family cover includes other descendant declarations");
    assert(tagged.hostFacts.some(value => value.fact.kind === "tag-tree"));
  } finally { f.close(); }
});
