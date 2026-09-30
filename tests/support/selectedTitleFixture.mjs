/**
 * Selected-title proof fixtures: real full GraphBuilder and GraphIndex, with only native files/cache
 * and body storage doubled. No local title selector or synthetic full-graph oracle is implemented.
 */
import assert from "node:assert/strict";
import { M, settings } from "./cachedSourceFixture.mjs";
import { centerGateSettings } from "./requestedCenterGateFixture.mjs";

/** Seed parsed body-cache inputs before observations; settings-only guard starts after this setup. */
export async function seedTitleBodies(f) {
  for (const file of f.files.values()) {
    if (file.extension !== "md") continue;
    await f.cache.putBody(file.path, file.stat.mtime, M.parseBodyMetadata(f.text.get(file.path)));
  }
}

/** Build all current host sources in production order and bind a fresh, independently owned index. */
export async function fullTitleIndex(f, overrides = {}) {
  const app = { ...f.app, vault: { ...f.app.vault, getName: () => "selected-title-full-oracle" } };
  const plugin = { app, settings: { ...settings, ...centerGateSettings(overrides) },
    getIndexSourceRevision: () => f.acquisition.hostRevision };
  const index = new M.GraphIndex(plugin, app);
  try {
    const builder = new M.GraphBuilder(plugin, app, new Map(), index.metadataParser, f.cache, () => true);
    const state = await builder.build({ acquireSources: false });
    assert(state, "Production full build must complete, not silently fall back to a partial oracle");
    index.state = state;
    return index;
  } catch (error) { index.destroy(); throw error; }
}

/** Read through the real public title facade; each expectation owns and destroys a fresh full index. */
export async function fullTitle(f, path, overrides = {}) {
  const index = await fullTitleIndex(f, overrides);
  try {
    const page = index.state.pages.get(path);
    assert(page, `The full builder must bind ${path}`);
    return { title: index.titleFor(page), name: page.name, aliases: [...page.aliases] };
  } finally { index.destroy(); }
}

/** Admit a nested host whose structural-document order differs from its Markdown inventory order. */
export function nestedTitleOwners(f) {
  const first = f.add("Nested/First.md", "[First label](https://example.com/path)");
  const second = f.add("Root.md", "[Second label](https://example.com/path)");
  const root = f.app.vault.getRoot(), folder = new window.SourceTestFolder();
  folder.path = folder.name = "Nested"; folder.parent = root; folder.children = [first];
  first.parent = folder; root.children = [folder, second];
  f.app.vault.getRoot = () => root;
  return { first, second, root, folder, url: "https://example.com/path" };
}

/** A valid cached read must never hide forbidden acquisition calls behind a fail-closed exception. */
export function guardTitleReuse(f) {
  const before = f.acquisition.getCounters();
  let forbidden = 0;
  /** Count even a caught exception so a pending response cannot masquerade as a zero-work read. */
  const fail = () => { forbidden++; throw new Error("Settings-only title inputs must reuse sources"); };
  f.app.vault.read = f.app.vault.cachedRead = fail;
  f.acquisition.acquire = f.acquisition.parse = f.repository.replace = fail;
  /** Check both host IO and the source repository's original accounting. */
  return () => {
    assert.equal(forbidden, 0); assert.deepEqual(f.reads, []); assert.deepEqual(f.parses, []);
    assert.deepEqual(f.acquisition.getCounters(), before);
    assert.equal(f.repository.readers.size, 0, "Every selected read releases its lease");
  };
}

/**
 * Exercise the production catalog WRITER and discovery over actual memory-family reads. Only saved
 * sequence/lease coordinates and page storage are doubled, as in the portable neighborhood suite;
 * this proves encounter order, not durable storage, journal closure or native MetadataCache timing.
 */
export async function buildTitleCatalog(f, modules, catalogFactory, collect, presentation, runtime) {
  const sources = [], requests = new Map(), actual = new Map();
  for (const file of f.app.vault.getMarkdownFiles()) {
    assert.equal((await f.acquisition.acquire(file, f.legacy.get(file.path).body)).current, true);
    const captured = await f.acquisition.captureForReplay(file.path, presentation, runtime());
    assert.equal(captured.outcome, "ready");
    const summary = await M.summarizeContributorOwner(f.repository, captured.request, runtime());
    assert.equal(summary.outcome, "ready");
    actual.set(file.path, summary.stamp); requests.set(file.path, captured.request);
    sources.push({ sourceId: file.path, source: captured.request.host.source,
      head: { ...summary.stamp.head, sequence: sources.length + 1 } });
  }
  assert(sources.length);
  const structure = await collect(new M.ObsidianStructuralSourceCollector(f.app, {
    isCurrent: () => true, sourceRevision: () => f.acquisition.hostRevision, checkpoint: async () => true,
  }));
  const catalog = catalogFactory(sources, structure);
  const bySource = new Map(sources.map(source => [source.sourceId, source]));
  /** Translate only the explicit saved-envelope coordinates; leave physical facts/content intact. */
  const coordinate = stamp => {
    const sequence = bySource.get(stamp.head.sourceId).head.sequence;
    return { head: { ...stamp.head, sequence }, sequence, saved: true };
  };
  const port = { ...catalog.repository,
    readSelected: async (id, matches, work, current) => {
      const result = await f.repository.readSelected(id, stamp => matches(coordinate(stamp)),
        reader => work({ ...reader, ...coordinate(reader) }), current);
      return result.outcome === "ready" ? { ...result, stamp: coordinate(result.stamp) } : result;
    },
    validateSelections: async (stamps, current) => {
      const result = await catalog.repository.validateSelections(stamps);
      return result.reason !== "ready" ? result
        : f.repository.validateSelections(stamps.map(stamp => actual.get(stamp.head.sourceId)), current);
    },
  };
  const first = requests.values().next().value.host.observation;
  /** Host lifetime is checked by every actual capture; only the catalog token is fixture-owned. */
  const current = () => [...requests.values()].every(request => request.host.isCurrent());
  const host = { ...catalog.host, stamp: { epoch: first.epoch, revision: first.revision, token: "title-order-fixture" },
    isCurrent: current, validate: current, capture: async fact => requests.get(fact.entity.physicalPath) };
  const discovery = new modules.SourceContributorDiscovery(port, host, runtime());
  const built = await discovery.rebuild();
  assert.equal(built.outcome, "ready", JSON.stringify(built));
  assert.equal(built.sources, sources.length);
  assert.equal(built.familyVisits, 4 * sources.length);
  return { catalog, discovery, requests, structure, port };
}
