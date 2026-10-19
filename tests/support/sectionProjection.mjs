/**
 * Late publication and repeated-link regressions over the production section/index owners.
 * The caller supplies its existing finite native doubles; this helper owns only two temporary
 * fixture paths and an independent GraphIndex. No semantic or parser behavior is substituted.
 */
import assert from "node:assert/strict";

/** Exercise materialization/retirement, preamble multiplicity and bounded host lookups. */
export async function runSectionProjectionCases({
  GraphIndex, TFile, app, plugin, files, contents, caches, resolvedLinks, unresolvedLinks,
  rootFolder, cacheLinks, buildCentralSectionExpansion, projectCentralSectionExpansion,
}) {
  const sourcePath = "Section projection lifecycle.md", ghostPath = "Section projection ghost.md";
  assert(!files.has(sourcePath) && !files.has(ghostPath));
  const body = ["[[Note Y]]", "# First", ...Array(120).fill("[[Note Y]]"),
    "[[Section projection ghost]]", "# Second", "[[Note Y]]", "[[Note F]]"].join("\n");
  const source = new TFile(sourcePath, 50001);
  source.stat.size = body.length;
  source.parent = rootFolder;
  rootFolder.children.push(source);
  files.set(sourcePath, source);
  contents.set(sourcePath, body);
  caches.set(sourcePath, { frontmatter: {}, tags: [], links: cacheLinks(body) });
  resolvedLinks[sourcePath] = { "Note Y.md": 122, "Note F.md": 1 };
  unresolvedLinks[sourcePath] = { "Section projection ghost": 1 };
  const index = new GraphIndex(plugin, app);
  const originalResolver = app.metadataCache.getFirstLinkpathDest;
  const originalRead = app.vault.cachedRead;
  let reads = 0, lookups = 0;
  /** Count only the synchronous presentation interval; setup/rebuild reads remain separate. */
  function project(expansion) {
    reads = 0; lookups = 0;
    app.vault.cachedRead = function (...args) { reads++; return originalRead.apply(this, args); };
    app.metadataCache.getFirstLinkpathDest = function (...args) { lookups++; return originalResolver.apply(this, args); };
    try {
      const result = projectCentralSectionExpansion(plugin, index, expansion);
      assert.equal(reads, 0, "Projection must not read Markdown");
      assert(lookups <= 3, `Resolve at most once per distinct lexical target, got ${lookups}`);
      return result;
    } finally {
      app.vault.cachedRead = originalRead;
      app.metadataCache.getFirstLinkpathDest = originalResolver;
    }
  }
  /** Count genuine ordinary-link placements, excluding section-outline and structural evidence. */
  function ordinary(expansion, heading, target) {
    const page = heading ? expansion.sections.find(section => section.page.name === heading)?.page
      : expansion.centerNeighborhood.center;
    assert(page);
    const explanation = [...expansion.explanations.values()].find(item => item.sourcePath === page.path
      && item.decisions.some(decision => decision.evidence.declaredTargetPath === target));
    return explanation?.decisions.filter(decision => ["obsidian-link", "unresolved-link"].includes(decision.evidence.sourceKind)) ?? [];
  }
  /** Real source replacement publishes current resolved/unresolved maps through the compiler. */
  async function materialize(present) {
    if (present) {
      const file = new TFile(ghostPath, 50002);
      file.parent = rootFolder;
      rootFolder.children.push(file);
      files.set(ghostPath, file);
      contents.set(ghostPath, "A newly materialized target.");
      caches.set(ghostPath, { frontmatter: {}, tags: [], links: [] });
      resolvedLinks[ghostPath] = {}; unresolvedLinks[ghostPath] = {};
      resolvedLinks[sourcePath][ghostPath] = 1;
      unresolvedLinks[sourcePath] = {};
    } else {
      rootFolder.children = rootFolder.children.filter(file => file.path !== ghostPath);
      files.delete(ghostPath); contents.delete(ghostPath); caches.delete(ghostPath);
      delete resolvedLinks[ghostPath]; delete unresolvedLinks[ghostPath];
      delete resolvedLinks[sourcePath][ghostPath];
      unresolvedLinks[sourcePath] = { "Section projection ghost": 1 };
    }
    assert.equal(await index.rebuild(), true);
  }
  try {
    await index.rebuild();
    const expansion = await buildCentralSectionExpansion(plugin, index, index.get(sourcePath));
    assert(expansion);
    let current = project(expansion);
    assert.equal(ordinary(current, null, "Note Y.md").length, 1);
    assert.equal(ordinary(current, "First", "Note Y.md").length, 120);
    assert.equal(ordinary(current, "Second", "Note Y.md").length, 1);
    assert.equal(new Set(ordinary(current, "First", "Note Y.md").map(item => item.evidence.line)).size, 120);
    assert.equal(ordinary(current, "First", "Section projection ghost").length, 1);

    await materialize(true);
    current = project(expansion);
    assert.equal(ordinary(current, "First", ghostPath).length, 1);
    const first = current.sections.find(section => section.page.name === "First");
    assert.equal(first.neighborhood.children.find(item => item.page.transient?.actualPath === ghostPath)?.page.file, files.get(ghostPath));
    const materializedExpansion = await buildCentralSectionExpansion(plugin, index, index.get(sourcePath));
    assert(materializedExpansion);
    await materialize(false);
    current = project(materializedExpansion);
    assert.equal(ordinary(current, "First", "Section projection ghost").length, 1,
      "Path aliases must not duplicate a physical occurrence after target deletion");
    assert.equal(ordinary(current, "First", ghostPath).length, 0);
    await materialize(true);
    current = project(materializedExpansion);
    assert.equal(ordinary(current, "First", ghostPath).length, 1);
    const rebound = current.sections.find(section => section.page.name === "First").neighborhood.children
      .find(item => item.page.transient?.actualPath === ghostPath);
    assert.equal(rebound?.page.file, files.get(ghostPath), "Recreated target must bind its current native identity");
  } finally {
    app.vault.cachedRead = originalRead;
    app.metadataCache.getFirstLinkpathDest = originalResolver;
    index.destroy();
    rootFolder.children = rootFolder.children.filter(file => ![sourcePath, ghostPath].includes(file.path));
    for (const path of [sourcePath, ghostPath]) {
      files.delete(path); contents.delete(path); caches.delete(path);
      delete resolvedLinks[path]; delete unresolvedLinks[path];
    }
  }
}
