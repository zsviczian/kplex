/**
 * Shared neighborhood oracle/host inputs for portable and real-IDB lanes. Only fixture setup and
 * result projection live here: full results use every live canonical collector, never cached replay
 * or the new reader's chosen owners/parents. Functions are self-contained for real-browser loading.
 */

/** Fixed bodies/metadata contain dormant, conflicting, duplicate, incoming and third-party support. */
export function configureNeighborhood(f, imageOnly = false) {
  if (imageOnly) {
    f.add("A.md", "", { Image: "[[B]]" });
    f.add("B.md", "Friends:: [[A]]", { Parent: "[[A]]" });
    f.app.metadataCache.resolvedLinks["A.md"] = { "B.md": 1 };
  } else {
    f.add("A.md", "DormantInline:: [[P]]\nFriends:: [[B]]\nFriends:: [[B]]",
      { Dormant: ["[[P]]", "[[P]]"], Friends: "[[B]]", Image: "[[B]]" });
    f.add("B.md", "Opposes:: [[A]]", { Parent: "[[A]]" });
    f.app.metadataCache.resolvedLinks["A.md"] = { "B.md": 3, "P.md": 3 };
  }
  f.app.metadataCache.resolvedLinks["B.md"] = { "A.md": 2 };
  f.add("P.md", "", { Children: "[[S]]" });
  f.add("S.md", "Opposes:: [[P]]", { Parent: "[[P]]" });
  f.app.metadataCache.resolvedLinks["S.md"] = { "P.md": 2 };
  f.add("T.md", "Parent:: [[P]]");
  f.app.metadataCache.resolvedLinks["T.md"] = { "P.md": 1 };
  f.add("C.md", "[Third party](https://example.com/path)\n[Again](https://example.com/path)", { Friends: "[[A]]" });
  f.app.metadataCache.resolvedLinks["C.md"] = { "A.md": 1 };
  f.add("E.md", "[Independent support](https://example.com/path)");
  f.add("D.md", "", { Unrelated: "[[Nowhere]]" });
  f.add("image.png", "");
  f.metadata.get("A.md").hostTags = ["#project/nested", "#project/nested"];
  f.metadata.get("S.md").hostTags = ["#project/nested"];
  if (f.resolutions) for (const file of f.files.values()) f.resolutions.set(file.basename, file.path);
}

/** Independent all-owner full compile under exactly the requested final policy, with real collectors. */
export async function fullNeighborhoodOracle(M, f, settings, runtime) {
  const compiler = new M.NormalizedGraphCompiler(settings, runtime);
  const host = M.createObsidianMetadataSourceHost(f.app);
  const cr = { isCurrent: () => true, sourceRevision: () => f.acquisition.hostRevision, checkpoint: async () => true };
  f.entities = new Map();
  /** Preserve each producer's own framing, finality and currentness rather than concatenating prefixes. */
  const feed = async collector => {
    const read = compiler.beginRead(collector.boundary);
    const consume = async batch => {
      for (const record of batch.records) if (record.kind === "entity") f.entities.set(record.entity.id, record);
      return compiler.acceptBatch(read, batch);
    };
    if (!await collector.collectBatches(consume)) throw new Error("Full collector failed");
    if (collector.finalize) {
      const final = await collector.finalize();
      if (!final || !await consume(final)) throw new Error("Full collector did not finalize");
    }
    if (!collector.isBoundaryCurrent(collector.boundary) || !compiler.completeRead(read, collector.boundary)) {
      throw new Error("Full collector boundary is not current");
    }
  };
  await feed(new M.ObsidianStructuralSourceCollector(f.app, cr));
  await feed(new M.ObsidianHostLinkSourceCollector(f.app, cr));
  for (const file of f.app.vault.getMarkdownFiles()) {
    const body = M.parseBodyMetadata((f.text ?? f.texts).get(file.path));
    const metadata = M.mergeFileMetadata(f.metadata.get(file.path), body);
    const presentation = { noteTypeField: "Type", primaryTagField: "Style" };
    await feed(new M.ObsidianMetadataSourceCollector(host, cr, file, metadata, presentation, "metadata"));
    await feed(new M.ObsidianReferenceSourceCollector({ metadataCache: f.app.metadataCache,
      resolvedLinkCount: host.resolvedLinkCount }, cr, file, metadata));
    await feed(new M.ObsidianMetadataSourceCollector(host, cr, file, metadata, presentation, "relations"));
  }
  const compiled = await compiler.finish();
  if (!compiled) throw new Error("Independent full compile failed");
  return compiled;
}

/**
 * Compare both directions of all center/parent pairs, complete evidence and sibling witnesses.
 * Only attempt-local evidence IDs/contribution revisions are removed. No target IDs, hidden
 * decisions, roles, locations, multiplicity or ownership are normalized away. Presentation is not
 * certified: this projects unfiltered semantic roles and witnesses, not GraphIndex's visible scene.
 * An explicit completeParents cover restricts only certified parent incidence/sibling witnesses;
 * center incidence, roles and declaration provenance remain complete.
 */
export function neighborhoodView(M, compilation, center, settings, completeParents) {
  /** Sort object keys, not values: browser JSON equality must not compare property insertion order. */
  const stable = value => Array.isArray(value) ? value.map(stable)
    : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([key, item]) => [key, stable(item)])) : value;
  /** Keep every non-attempt-local declaration field, with exact original contributing source ID. */
  const evidence = item => {
    const { id, contribution, ...rest } = item;
    return stable({ ...rest, contribution: { sourceId: contribution.sourceId } });
  };
  const declarations = [...compilation.declarations()];
  /** Canonical classification supplies roles; the projection introduces no role/precedence heuristic. */
  const roles = id => [...(compilation.node(id)?.neighbours.values() ?? [])].filter(edge => !edge.isHidden)
    .flatMap(edge => ["parent", "child", "left", "right", "previous", "next"].flatMap(role => {
      const relationType = M.classifyRelation(edge, role, settings.inferAllLinksAsFriends);
      return relationType === null ? [] : [{ id: edge.target.id, role, relationType, direction: edge.direction }];
    }));
  const direct = roles(center.id);
  const parents = direct.filter(edge => edge.role === "parent" && (completeParents === undefined || completeParents.includes(edge.id))).map(edge => edge.id).sort();
  /** Preserve even hidden/suppressed declarations for a pair without an active visible relation. */
  const incidence = id => {
    const targets = new Set([...(compilation.node(id)?.neighbours.values() ?? [])].map(edge => edge.target.id));
    for (const declaration of declarations) {
      if (declaration.sourceId === id) targets.add(declaration.targetId);
      if (declaration.targetId === id) targets.add(declaration.sourceId);
    }
    return [...targets].sort().map(target => {
      const perspective = (from, to) => {
        const edge = [...(compilation.node(from)?.neighbours.values() ?? [])].find(edge => edge.target.id === to);
        return { edge: edge ? stable({ ...edge, target: edge.target.id }) : null,
          decisions: M.applyOntologyPrecedence(compilation.evidenceBetween(from, to)).map(decision =>
            JSON.stringify(stable({ ...decision, evidence: evidence(decision.evidence) }))).sort() };
      };
      return { target, forward: perspective(id, target), reverse: perspective(target, id), declarations: declarations
        .filter(item => item.sourceId === id && item.targetId === target || item.sourceId === target && item.targetId === id)
        .map(item => JSON.stringify(evidence(item))).sort() };
    });
  };
  const occupied = new Set([center.id, ...direct.map(edge => edge.id)]);
  const siblings = new Map();
  for (const parent of parents) for (const child of roles(parent).filter(edge => edge.role === "child")) {
    if (occupied.has(child.id)) continue;
    const witnesses = siblings.get(child.id) ?? [];
    witnesses.push({ parent, relationType: child.relationType, direction: child.direction });
    siblings.set(child.id, witnesses);
  }
  return stable({ center: center.id, parents, direct: direct.map(edge => JSON.stringify(stable(edge))).sort(),
    centerIncidence: incidence(center.id), parentIncidence: parents.map(parent => ({ parent, pairs: incidence(parent) })),
    siblings: [...siblings].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([id, witnesses]) => ({ id, witnesses })) });
}
