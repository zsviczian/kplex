/** Portable catalog-format fixture only: not an IndexedDB emulator or a durable-storage acceptance test. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { loadPortableModules } from "./portableTypeScript.mjs";
export const { exports: C } = loadPortableModules(["src/index/SourceContributorDiscovery.ts", "src/index/SourceContributorSummary.ts", "src/index/SourceFacts.ts"]);
export const sha = text => createHash("sha256").update(text).digest("hex");
export const ref = (id, kind = "document", physicalPath = id) => ({ id, kind, state: "materialized", semanticPath: id,
  ...(kind === "document" || kind === "attachment" || kind === "container" ? { physicalPath } : {}) });
export const target = entity => ({ entity, rawTarget: entity.semanticPath, resolvedBy: entity.kind === "url" ? "url" : "host" });
export const entityFact = entity => ({ kind: "entity", source: entity, sourceRevision: "physical:1", entity, name: entity.id, url: null, semanticMtime: 1 });
export const stamp = { epoch: "fixture-host", revision: 1, token: "fixture-catalog" };

/** Strict valid heads permit testing discovery independently of physical chunk IO. */
export function head(sourceId, source, sequence = 1) {
  const revision = "revision:" + sourceId;
  return { sourceId, sourceRevision: revision, sequence, formatVersion: C.SOURCE_FACT_FORMAT_VERSION,
    compilerVersion: C.SOURCE_FACT_COMPILER_VERSION, bodyParserVersion: C.SOURCE_BODY_PARSER_VERSION,
    resolutionVersion: C.SOURCE_RESOLUTION_VERSION, physical: { identity: "physical:" + sourceId, path: source.physicalPath, mtime: 1, size: 1, ctime: 1 },
    observation: { epoch: stamp.epoch, revision: stamp.revision, environment: sha("environment") }, state: "complete",
    families: Object.fromEntries(C.SOURCE_FAMILIES.map(family => [family, { revision: revision + family, chunks: 1, records: 0, bytes: 2,
      postings: 1, digest: sha("family"), postingDigest: sha("posting") }])) };
}

/** Emit fixture rows through the production neutral projection, with explicit source/host ownership. */
export function rowsFor(sources, structural = []) {
  const rows = [];
  for (const [order, value] of sources.entries()) {
    const owner = C.contributorKey("source", value.sourceId);
    const keys = new Set(value.summary?.keys ?? [C.contributorKey("node", value.source.id)]);
    for (const record of value.records ?? []) for (const key of C.contributorRecordKeys(record)) keys.add(key);
    let summary = { pages: 0, records: 0, bytes: 0, digest: "" };
    for (const page of C.contributorSummaryPages([...keys].sort(), 128 * 1024)) {
      const commitment = { digest: sha(page.data), bytes: page.bytes, records: page.keys.length };
      rows.push({ kind: "summary", key: C.contributorKey("summary", value.sourceId), index: page.index, keys: page.keys });
      summary = { pages: summary.pages + 1, records: summary.records + page.keys.length, bytes: summary.bytes + page.bytes,
        digest: sha(C.contributorSummaryPageCommitment(summary.digest, value.sourceId, value.head.sourceRevision, value.head.sequence, page.index, commitment)) };
    }
    rows.push({ kind: "source", key: owner, order, head: value.head, source: value.source, summary });
    for (const key of keys) rows.push({ kind: "link", key, owner });
  }
  for (const [order, fact] of structural.entries()) {
    const owner = C.contributorKey("host", String(order));
    rows.push({ kind: "host", key: owner, order, fact });
    for (const key of C.contributorRecordKeys(fact)) rows.push({ kind: "link", key, owner });
  }
  return rows;
}

/** Deterministic storage-port fixture exercises production page/manifest/discovery code, not IDB. */
export function catalogFixture(sources = [], structural = []) {
  let generation = 0, current = true, environment = true;
  const state = { root: null, pages: new Map(), heads: new Map(sources.map(source => [source.sourceId, source.head])), writes: 0, reads: 0, yields: 0 };
  const runtime = { now: () => 0, sliceBudgetMs: 8, isCurrent: () => current, yield: async () => { state.yields++; await state.onYield?.(); } };
  const host = { stamp, isCurrent: () => current, validate: () => environment,
    collect: async emit => { for (const fact of structural) if (!await emit(fact)) return false; return true; },
    capture: async () => { throw new Error("A portable catalog fixture must not fake a durable source replay"); } };
  const repository = {
    observationDigest: async value => sha(value),
    beginDependencyBuild: async () => ({ revision: 1, sequence: Math.max(0, ...sources.map(source => source.head.sequence)), slot: generation++ % 2, generation: String(generation) }),
    putDependencyPage: async (build, page) => {
      assert(C.validSourceDependencyPage(page), "Production strict page codec must accept the writer");
      assert.equal(page.generation, build.generation); assert.equal(Buffer.byteLength(page.data), page.bytes);
      state.pages.set(JSON.stringify([page.slot, page.bucket, page.index]), structuredClone(page)); state.writes++;
    },
    activateDependencyBuild: async (root, count) => {
      assert(C.validSourceDependencyRoot(root));
      assert.equal([...state.pages.values()].filter(page => page.generation === root.build.generation).length, count);
      state.root = structuredClone(root); state.writes++;
    },
    readDependencyRoot: async () => { if (!state.root) throw new C.SourceFactError("dependency-pending"); return structuredClone(state.root); },
    readDependencyPage: async (build, bucket, index) => {
      state.reads++;
      const value = state.pages.get(JSON.stringify([build.slot, bucket, index]));
      if (!C.validSourceDependencyPage(value) || value.generation !== build.generation) throw new C.SourceFactError("dependency-invalid");
      return structuredClone(value);
    },
    validateSelections: async selections => {
      for (const selected of selections) {
        const actual = state.heads.get(selected.head.sourceId);
        if (!actual) return { reason: "missing" };
        if (JSON.stringify(actual) !== JSON.stringify(selected.head) || selected.sequence !== actual.sequence) return { reason: "superseded" };
      }
      return { reason: "ready" };
    },
  };
  const discovery = new C.SourceContributorDiscovery(repository, host, runtime);
  /** Assemble an independently framed test catalog; manifests commit to the original, complete rows. */
  const seal = async (rows = rowsFor(sources, structural)) => {
    const build = await repository.beginDependencyBuild();
    const buckets = Array.from({ length: C.SOURCE_DEPENDENCY_BUCKETS }, () => ({ digest: "", bytes: 0, records: 0, pages: 0 }));
    const grouped = Array.from({ length: C.SOURCE_DEPENDENCY_BUCKETS }, () => []);
    for (const row of rows) grouped[C.sourceDependencyBucket(row.key)].push(row);
    for (let bucket = 0; bucket < grouped.length; bucket++) {
      for (let start = 0; start < grouped[bucket].length; start += 32) {
        const part = grouped[bucket].slice(start, start + 32), data = JSON.stringify(part), previous = buckets[bucket];
        const page = { slot: build.slot, generation: build.generation, bucket, index: previous.pages, data,
          digest: sha(data), bytes: Buffer.byteLength(data), records: part.length };
        await repository.putDependencyPage(build, page);
        buckets[bucket] = { digest: sha(C.contributorPageCommitment(previous.digest, page.index, page)),
          bytes: previous.bytes + page.bytes, records: previous.records + page.records, pages: previous.pages + 1 };
      }
    }
    const data = JSON.stringify({ version: C.CONTRIBUTOR_LEGACY_CATALOG_VERSION, build, host: stamp, sources: sources.length, hostFacts: structural.length, rows: rows.length, buckets, urlIdentityVersion: 1 });
    await repository.activateDependencyBuild({ key: C.SOURCE_DEPENDENCY_ROOT_KEY, build, data, digest: sha(data) }, buckets.reduce((sum, bucket) => sum + bucket.pages, 0));
  };
  return { discovery, state, seal, repository, host, runtime, cancel: () => { current = false; }, environmentChanged: () => { environment = false; } };
}
