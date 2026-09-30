/**
 * SI4 direct-neighbor encounter-order characterization against the production full GraphBuilder,
 * binder, evidence owner and fresh GraphIndex. Existing host doubles supply static inputs only;
 * these tests do not certify native event ordering, cached list readiness or a replacement sorter.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { M, replayFixture, settings } from "./support/cachedSourceFixture.mjs";
import { fullTitleIndex, seedTitleBodies } from "./support/selectedTitleFixture.mjs";
import { titleFixture } from "./support/urlTitleFixture.mjs";

const tiedPresentation = { showFolderNodes: false, nodeSortOrder: "name-asc" };
const sortOrders = ["name-asc", "name-desc", "modified-asc", "modified-desc",
  "created-asc", "created-desc", "connections-asc", "connections-desc"];

/** Supply exact fixture host resolutions from the explicitly created native file facets. */
function resolveFixtureNames(f) {
  for (const file of f.files.values()) f.resolutions.set(file.basename, file.path);
}

/** Read actual public direct-role lists without sorting, deduplicating or projecting siblings. */
function directPaths(index, center, role) {
  const page = index.get(center);
  assert(page, `Missing full-build center: ${center}`);
  return index.neighbours(page, role).map(item => item.page.path);
}

/** Require the actual facade's selected title input to tie, rather than inventing a title selector. */
function assertTiedTitles(index, paths) {
  for (const path of paths) {
    const page = index.get(path);
    assert(page, `Missing full-build candidate: ${path}`);
    assert.equal(index.titleFor(page), "Tie");
  }
}

/** Build through every full production phase and release the index, acquisition and fixture timers. */
async function inspectFull(configure, overrides, inspect) {
  const f = replayFixture();
  let index;
  try {
    configure(f);
    resolveFixtureNames(f);
    await seedTitleBodies(f);
    index = await fullTitleIndex(f, { ...tiedPresentation, ...overrides });
    await inspect(index, f);
  } finally {
    index?.destroy();
    f.close();
  }
}

/** Opposite whole-map source orders have equal per-owner facts and equal Markdown inventories. */
for (const version of [2, 3]) test(`host source permutation is not recoverable from v${version} owner facts`, async () => {
  const fixtures = [];
  try {
    for (const order of [["A.md", "B.md"], ["B.md", "A.md"]]) {
      const f = await titleFixture(f => {
        f.add("A.md", "", { aliases: ["Tie"] });
        f.add("B.md", "", { aliases: ["Tie"] });
        f.add("Center.md", "");
        resolveFixtureNames(f);
        for (const source of order) f.app.metadataCache.resolvedLinks[source] = { "Center.md": 1 };
      }, version);
      fixtures.push(f);
    }
    const [ab, ba] = fixtures;
    assert.deepEqual(ab.app.vault.getMarkdownFiles().map(file => file.path),
      ba.app.vault.getMarkdownFiles().map(file => file.path));
    if (version === 3) assert.deepEqual([...ab.ordinals], [...ba.ordinals]);
    // Compare real neutral family payloads, not independent epochs, random identities or root bytes.
    for (const path of ["A.md", "B.md", "Center.md"]) {
      for (const family of ["values", "body-urls", "metadata", "resolution"]) {
        assert.deepEqual(await ab.facts(path, family), await ba.facts(path, family), `${path}:${family}`);
      }
    }
    for (const [position, f] of fixtures.entries()) {
      const expected = position === 0 ? ["A.md", "B.md"] : ["B.md", "A.md"];
      for (const nodeSortOrder of sortOrders) {
        const index = await fullTitleIndex(f, { ...tiedPresentation, nodeSortOrder });
        try {
          assertTiedTitles(index, expected);
          assert.equal(index.get("A.md").neighbours.size, index.get("B.md").neighbours.size);
          assert.equal(index.get("A.md").file.stat.mtime, index.get("B.md").file.stat.mtime);
          assert.equal(index.get("A.md").file.stat.ctime, index.get("B.md").file.stat.ctime);
          assert.deepEqual(directPaths(index, "Center.md", "parent"), expected, nodeSortOrder);
        } finally { index.destroy(); }
      }
    }
  } finally { for (const f of fixtures) f.close(); }
});

/** Source storage does preserve target encounter order inside an individual host-link owner. */
test("stored host target sequence retains the owner's local full-build order", async () => {
  const f = await titleFixture(f => {
    f.add("Center.md", "");
    f.add("A.md", "", { aliases: ["Tie"] });
    f.add("B.md", "", { aliases: ["Tie"] });
    resolveFixtureNames(f);
    f.app.metadataCache.resolvedLinks["Center.md"] = { "B.md": 1, "A.md": 1 };
  });
  let index;
  try {
    const links = (await f.facts("Center.md", "resolution")).filter(record => record.kind === "host-link");
    assert.deepEqual(links.map(record => [record.state, record.target, record.count]),
      [["resolved", "B.md", 1], ["resolved", "A.md", 1]]);
    index = await fullTitleIndex(f, tiedPresentation);
    assertTiedTitles(index, ["A.md", "B.md"]);
    assert.deepEqual(directPaths(index, "Center.md", "child"), ["B.md", "A.md"]);
  } finally { index?.destroy(); f.close(); }
});

/** A directional hidden declaration reserves the unordered pair before any center perspective exists. */
test("opposite hidden first insertion precedes the center's first visible witness", async () => {
  await inspectFull(f => {
    f.add("A.md", "", { Hidden: "[[Center]]", aliases: ["Tie"] });
    f.add("B.md", "", { Children: "[[Center]]", aliases: ["Tie"] });
    f.add("Center.md", "", { Parent: "[[A]]" });
  }, {}, index => {
    assertTiedTitles(index, ["A.md", "B.md"]);
    assert.deepEqual(directPaths(index, "Center.md", "parent"), ["A.md", "B.md"]);
    assert.equal(index.get("A.md").neighbours.get("Center.md").isHidden, true);
    assert.equal(index.get("Center.md").neighbours.get("A.md").isHidden, false);
    const forward = index.state.evidence.between("A.md", "Center.md");
    const reverse = index.state.evidence.between("Center.md", "A.md");
    assert.equal(forward.filter(item => item.role === "hidden").length, 1);
    assert.equal(reverse.filter(item => item.role === "hidden").length, 0);
  });
});

/** Configured reference ordering reconciles declaration buckets without moving first-inserted pairs. */
test("configured field ordering does not reorder physical first-pair encounters", async () => {
  await inspectFull(f => {
    f.add("Center.md", "", { Second: "[[B]]", First: ["[[A]]", "[[B]]"] });
    f.add("A.md", "", { aliases: ["Tie"] });
    f.add("B.md", "", { aliases: ["Tie"] });
  }, { hierarchy: { ...settings.hierarchy, children: ["First", "Second"] } }, index => {
    assertTiedTitles(index, ["A.md", "B.md"]);
    assert.deepEqual(directPaths(index, "Center.md", "child"), ["B.md", "A.md"]);
    const declarations = index.state.evidence.declarationsForPair("Center.md", "B.md");
    assert.deepEqual(declarations.map(item => item.fieldName), ["First", "Second"]);
  });
});

/** Exercise full phase order and canonical inference/visibility as stable subsequences, not a new classifier. */
test("resolved, unresolved, property, inline, Date and body-URL phases retain direct order", async () => {
  const ordinary = ["B.md", "Tie", "Daily/2026-09-30.md", "https://example.test/item"];
  const explicit = ["A.md", "Inline.md"];
  const all = ["B.md", "Tie", ...explicit, "Daily/2026-09-30.md", "https://example.test/item"];
  for (const [overrides, role, expected] of [
    [{}, "child", all],
    [{ showInferredNodes: false }, "child", explicit],
    [{ inferAllLinksAsFriends: true }, "left", ordinary],
    [{ inverseInfer: true }, "parent", ordinary],
  ]) {
    await inspectFull(f => {
      f.add("Center.md", "Children:: [[Inline]]\n[Tie](https://example.test/item)",
        { Children: "[[A]]", Due: "2026-09-30" });
      for (const path of ["A.md", "B.md", "Inline.md", "Daily/2026-09-30.md"]) f.add(path, "", { aliases: ["Tie"] });
      f.app.dateFields.add("Due");
      f.app.metadataCache.resolvedLinks["Center.md"] = { "B.md": 1 };
      f.app.metadataCache.unresolvedLinks["Center.md"] = { Tie: 1 };
    }, overrides, index => {
      assertTiedTitles(index, all);
      assert.deepEqual(directPaths(index, "Center.md", role), expected);
      if (overrides.inferAllLinksAsFriends || overrides.inverseInfer) {
        assert.deepEqual(directPaths(index, "Center.md", "child"), explicit);
      }
      assert.equal([...index.get("Center.md").neighbours.keys()][0], "folder:/");
    });
  }
});

/** Final image-only suppression drops empty buckets but cannot move a bucket with surviving ontology. */
test("image suppression preserves an earlier host position only while its pair survives", async () => {
  for (const retainOntology of [true, false]) {
    await inspectFull(f => {
      f.add("Center.md", "", { Image: "[[A]]", Children: retainOntology ? ["[[B]]", "[[A]]"] : "[[B]]" });
      f.add("A.md", "", { aliases: ["Tie"] });
      f.add("B.md", "", { aliases: ["Tie"] });
      f.app.metadataCache.resolvedLinks["Center.md"] = { "A.md": 1, "B.md": 1 };
    }, { thumbnailProperty: "Image" }, index => {
      assertTiedTitles(index, ["A.md", "B.md"]);
      assert.deepEqual(directPaths(index, "Center.md", "child"), retainOntology ? ["A.md", "B.md"] : ["B.md"]);
      const declarations = index.state.evidence.declarationsForPair("Center.md", "A.md");
      assert.equal(declarations.some(item => item.sourceKind === "obsidian-link"), false);
      assert.equal(declarations.length, retainOntology ? 1 : 0);
      assert.equal(index.get("Center.md").neighbours.has("A.md"), retainOntology);
    });
  }
});

/** Reciprocal declarations, repeated occurrences and retained suppressed evidence do not reinsert a pair. */
test("reciprocal and suppressed declarations retain multiplicity and both directed positions", async () => {
  await inspectFull(f => {
    f.add("A.md", "Parent:: [[Center]]", { Children: "[[Center]]", aliases: ["Tie"] });
    f.add("B.md", "", { Children: "[[Center]]", aliases: ["Tie"] });
    f.add("Center.md", "Parent:: [[A]]\nParent:: [[A]]", { Parent: ["[[A]]", "[[A]]"] });
  }, {}, index => {
    assertTiedTitles(index, ["A.md", "B.md"]);
    assert.deepEqual(directPaths(index, "Center.md", "parent"), ["A.md", "B.md"]);
    assert.equal([...index.get("Center.md").neighbours.keys()].filter(path => path === "A.md").length, 1);
    assert.equal([...index.get("A.md").neighbours.keys()].filter(path => path === "Center.md").length, 1);
    for (const [source, target] of [["Center.md", "A.md"], ["A.md", "Center.md"]]) {
      const evidence = index.state.evidence.between(source, target);
      assert.equal(evidence.length, 5);
      const suppressed = M.applyOntologyPrecedence(evidence).filter(decision => !decision.active);
      assert.equal(suppressed.length, 1);
      assert.equal(suppressed[0].evidence.declaredByPath, "A.md");
      assert.equal(suppressed[0].evidence.sourceKind, "inline-ontology");
    }
  });
});

/** The structural collector's insertion order is the direct folder-center oracle, not lexical paths. */
test("folder-center tied children preserve the structural encounter sequence", async () => {
  await inspectFull(f => {
    f.add("B.md", "", { aliases: ["Tie"] });
    f.add("A.md", "", { aliases: ["Tie"] });
  }, { showFolderNodes: true }, index => {
    assertTiedTitles(index, ["A.md", "B.md"]);
    assert.deepEqual(directPaths(index, "folder:/", "child"), ["B.md", "A.md"]);
    for (const path of ["A.md", "B.md"]) {
      assert.deepEqual(index.state.evidence.declarationsForPair("folder:/", path).map(item => item.sourceKind), ["file-tree"]);
    }
  });
});

/** Third-party URL-origin membership follows Markdown/body encounters, not structural document order. */
test("URL-origin tied children follow body encounters after structural document reordering", async () => {
  await inspectFull(f => {
    f.add("B.md", "[Tie](https://example.test/b)");
    f.add("A.md", "[Tie](https://example.test/a)");
    const root = f.app.vault.getRoot();
    root.children.reverse();
    f.app.vault.getRoot = () => root;
  }, {}, index => {
    const expected = ["https://example.test/b", "https://example.test/a"];
    assertTiedTitles(index, expected);
    assert.deepEqual(directPaths(index, "https://example.test", "child"), expected);
    for (const target of expected) {
      const declarations = index.state.evidence.declarationsForPair("https://example.test", target);
      assert.equal(declarations.length, 1);
      assert.equal(declarations[0].sourceKind, "url-origin");
    }
  });
});
