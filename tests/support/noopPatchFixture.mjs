/**
 * Production GraphBuilder no-op workload with a retained, high-degree published page and a
 * depth-eight evidence chain. Only native Vault/storage inputs are supplied by the caller.
 * Test-owned probes count source adjacency enumeration and compaction output, never global Maps.
 */

/** Seed canonical page identities, original declarations and a matching hot source fingerprint. */
export function noopPatchFixture(M, host, degree) {
  const settings = { hierarchy: { hidden: [], parents: [], children: ['Child'], leftFriends: [], rightFriends: [], previous: [], next: [] },
    inferAllLinksAsFriends: false, inverseInfer: false, showFullTagName: true, tagStyleList: [],
    baseNodeStyle: { maxLabelLength: 30 }, noteTypeField: 'Type', primaryTagField: 'Style' };
  const file = host.add('Hub.md', 'Original prose');
  const fields = { Child: Array.from({ length: degree }, /** Exact independently addressable targets. */ (_, n) => `[[Target-${n}]]`) };
  host.metadata.set(file.path, { frontmatter: fields });
  const hot = new Map(), fingerprints = new Map();
  const plugin = { settings, getIndexSourceRevision: /** Per-file event retirement is exercised separately from this fixed setup generation. */ () => 0 };
  let current = true;
  const builder = new M.GraphBuilder(plugin, host.app, hot,
    { parse: async /** Count only actual parser admission. */ text => { host.parses.push(text); return M.parseBodyMetadata(text); } },
    host.cache, /** Retire preparation without changing source identity. */ () => current, fingerprints, host.acquisition ?? null);
  const state = M.createGraphState();
  builder.addPage(state, builder.createPage({ path: 'folder:/', name: '/', isFolder: true }));
  const page = builder.createPage({ path: file.path, name: file.basename, file });
  builder.addPage(state, page);
  for (let n = 0; n < degree; n++) {
    const path = `Target-${n}.md`, target = builder.createPage({ path, name: `Target-${n}` });
    builder.addPage(state, target);
    state.evidence.addPair(page.path, path, 'child', M.RelationType.DEFINED, M.LinkDirection.TO,
      { sourceKind: 'frontmatter-ontology', definition: 'Child', fieldName: 'Child', rawValue: `[[Target-${n}]]` });
    M.resolveEvidencePair(state.pages, state.evidence, page.path, path);
    M.resolveEvidencePair(state.pages, state.evidence, path, page.path);
  }
  for (let n = 0; n < 8; n++) state.evidence = state.evidence.fork();
  const body = M.parseBodyMetadata('Original prose'), signature = builder.semanticSourceSignature(file, body);
  hot.set(file.path, { mtime: file.stat.mtime, body, semanticSignature: signature });
  fingerprints.set(file.path, signature);
  return { builder, state, page, file, fields, hot, fingerprints, signature,
    /** Retire all pending callbacks through the original builder lifetime capability. */
    retire() { current = false; } };
}

/** Count only this workload's copied adjacency and evidence writes; restore exact own descriptors. */
export function probeNoopPatch(fixture) {
  const counts = { neighbourEntriesCopied: 0, evidenceCompactions: 0, compactedPairs: 0, compactedDeclarations: 0 };
  const map = fixture.page.neighbours, proto = Object.getPrototypeOf(fixture.state.evidence);
  const iterator = map[Symbol.iterator], compact = proto.compactCooperative, write = proto.writePair;
  const descriptor = Object.getOwnPropertyDescriptor(map, Symbol.iterator);
  let compacting = false;
  /** Observe only the source page's iterator; preserve entry/result objects and Map ordering. */
  map[Symbol.iterator] = function* () {
    for (const entry of iterator.call(this)) { counts.neighbourEntriesCopied++; yield entry; }
  };
  /** Preserve the original compaction promise; completion observation adds no await to its owner. */
  proto.compactCooperative = function (...args) {
    counts.evidenceCompactions++; compacting = true;
    const result = compact.apply(this, args);
    result.then(/** Clear probe state after successful maintenance. */ () => { compacting = false; },
      /** A failed compaction also releases the counter scope. */ () => { compacting = false; });
    return result;
  };
  /** These writes count rebuilt buckets and records, separately from ordinary patch writes. */
  proto.writePair = function (key, declarations, ...args) {
    if (compacting) { counts.compactedPairs++; counts.compactedDeclarations += declarations.length; }
    return write.call(this, key, declarations, ...args);
  };
  return { counts,
    /** Cleanup runs independently of benchmark/assertion success and leaves no prototype probe. */
    restore() {
    if (descriptor) Object.defineProperty(map, Symbol.iterator, descriptor); else delete map[Symbol.iterator];
    proto.compactCooperative = compact; proto.writePair = write;
  } };
}
