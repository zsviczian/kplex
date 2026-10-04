/**
 * URL-title proof fixtures. Production writer, replay, compiler and full GraphIndex own semantics;
 * portable catalog envelopes are explicit memory doubles. reframeTitleCatalog mutates storage
 * framing only for corruption/compatibility tests and is also run against real Chromium stores.
 */
import assert from "node:assert/strict";
import { C, catalogFixture } from "./contributorCatalogFixture.mjs";
import { M, replayFixture, presentation, runtime, collect } from "./cachedSourceFixture.mjs";
import { seedTitleBodies, nestedTitleOwners, guardTitleReuse, buildTitleCatalog } from "./selectedTitleFixture.mjs";

export const titleUrl = "https://example.com/path";
/** Exact URL facets are caller input, not derived from an opaque node identifier by the reader. */
export const urlRef = (url = titleUrl) => ({ id: url, kind: "url", state: "materialized", semanticPath: url });

/** Add accepted v3 Markdown order and current v4 host-owner order without changing source codecs. */
export async function titleFixture(configure = nestedTitleOwners, version = 4) {
  const f = replayFixture();
  try { configure(f); return await bindTitleCatalog(f, version); }
  catch (error) { f.close(); throw error; }
}

/** Explicit acquisition/reacquisition only; callers fence old capabilities before building again. */
export async function bindTitleCatalog(f, version = 4) {
  await seedTitleBodies(f);
  const base = await buildTitleCatalog(f, C, catalogFixture, collect, presentation, runtime);
  const ordinals = new Map([...f.app.vault.getMarkdownFiles()].map((file, ordinal) => [file.path, ordinal]));
  const host = { ...base.discovery.host, ...(version >= 3 ? { markdownOrderVersion: 1 } : {}),
    ...(version === 4 ? { hostLinkOwnerOrderVersion: 1,
      /** Use the production host-map oracle; only explicit acquisition owns this whole-map scan. */
      captureHostLinkOwnerOrder: async () => new M.ObsidianHostLinkSourceCollector(f.app, {
        isCurrent: () => true, sourceRevision: () => f.acquisition.hostRevision, checkpoint: async () => true,
      }).captureOwnerOrder(),
    } : {}),
    /** Only acquisition supplies the complete ordinal stream; query tests trap inventory APIs. */
    collect: async emit => {
      for (const fact of base.structure) {
        const ordinal = version >= 3 && fact.kind === "entity" && fact.entity.kind === "document"
          ? ordinals.get(fact.entity.physicalPath) : undefined;
        if (!(await emit(fact, ordinal))) return false;
      }
      return true;
    },
  };
  const discovery = new C.SourceContributorDiscovery(base.port, host, runtime());
  assert.equal((await discovery.rebuild()).outcome, "ready");
  const entities = new Map(base.structure.filter(fact => fact.kind === "entity").map(fact => [fact.entity.id, fact]));
  const capture = (id, rt) => f.acquisition.captureForReplay(id, presentation, rt);
  /** Keep the exact identity port independent of any existing graph or published URL label. */
  const makeReader = (d = discovery, c = capture) => new M.CachedRequestedUrlTitleReader(base.port, d, c,
    { entity: ref => entities.get(ref.id) });
  return { ...f, ...base, host, discovery, ordinals, entities, capture, makeReader };
}

/** Count caught forbidden calls too, and compare every catalog byte after a settings-only read. */
export function guardUrlTitle(f) {
  const check = guardTitleReuse(f);
  const before = JSON.stringify([f.catalog.state.root, [...f.catalog.state.heads], [...f.catalog.state.pages]]);
  const writes = f.catalog.state.writes;
  let forbidden = 0;
  /** A fail-closed result cannot hide a prohibited scan or eager derivative rebuild. */
  const fail = () => { forbidden++; throw new Error("Forbidden title acquisition"); };
  f.app.vault.getFiles = f.app.vault.getMarkdownFiles = f.app.vault.getRoot = f.discovery.rebuild = fail;
  return () => {
    check(); assert.equal(forbidden, 0); assert.equal(f.catalog.state.writes, writes);
    assert.equal(JSON.stringify([f.catalog.state.root, [...f.catalog.state.heads], [...f.catalog.state.pages]]), before);
  };
}

/** A rejected URL-title proof must return neither a partial input nor a coverage certificate. */
export function rejectedTitle(result, reason) {
  assert.notEqual(result.outcome, "ready", JSON.stringify(result));
  if (reason) assert.equal(result.reason, reason);
  assert(!("input" in result)); assert(!("certificate" in result)); assert(!("preparation" in result));
}

/**
 * Reframe deliberately edited rows with independent original commitments. Used to distinguish
 * schema rejection from checksum rejection and to construct genuine legacy v2 derivative roots.
 * No source/head/body records are transformed. This helper is self-contained for browser transfer.
 */
export async function reframeTitleCatalog(M, original, pages, transform, digest, version) {
  const root = JSON.parse(original.data);
  const rows = pages.filter(page => page.slot === root.build.slot && page.generation === root.build.generation)
    .flatMap(page => JSON.parse(page.data));
  const targetVersion = version ?? root.version;
  let changed = transform(rows);
  if (targetVersion < 4) changed = changed.filter(row => row.kind !== "host-order" && row.kind !== "host-order-rank");
  if (targetVersion < 3) changed = changed.map(row => {
    if (row.kind !== "source") return row;
    const { markdownOrdinal, ...legacy } = row; return legacy;
  });
  const buckets = Array.from({ length: M.SOURCE_DEPENDENCY_BUCKETS }, () => ({ digest: "", bytes: 0, records: 0, pages: 0 }));
  const grouped = Array.from({ length: M.SOURCE_DEPENDENCY_BUCKETS }, () => []), result = [];
  for (const row of changed) grouped[M.sourceDependencyBucket(row.key)].push(row);
  for (let bucket = 0; bucket < grouped.length; bucket++) {
    for (let start = 0; start < grouped[bucket].length; start += 32) {
      const part = grouped[bucket].slice(start, start + 32), data = JSON.stringify(part), previous = buckets[bucket];
      const page = { slot: root.build.slot, generation: root.build.generation, bucket, index: previous.pages,
        data, digest: await digest(data), bytes: new TextEncoder().encode(data).byteLength, records: part.length };
      result.push(page);
      buckets[bucket] = { digest: await digest(M.contributorPageCommitment(previous.digest, page.index, page)),
        bytes: previous.bytes + page.bytes, records: previous.records + page.records, pages: previous.pages + 1 };
    }
  }
  const nextRoot = { ...root, version: targetVersion, rows: changed.length, buckets };
  if (targetVersion < 4) delete nextRoot.hostLinkOwnerOrder;
  const data = JSON.stringify(nextRoot);
  return { root: { ...original, data, digest: await digest(data) }, pages: result };
}
