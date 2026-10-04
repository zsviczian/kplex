/**
 * Private, bounded center-gate projection over an authenticated canonical relation cover. This is
 * presentation counting, not another semantic resolver: roles come only from classifyRelation.
 * Exact-ID physical facts must share the reader's clean host observation. The caller owns final
 * root/head/journal/host/policy/demand fences; this module neither authenticates ranges nor publishes.
 */
import type { CompiledGraphNode, GraphCompilerRuntime, PortableGraphCompilation } from "../core/graph/compiler";
import type { NodeId } from "../core/graph/model";
import type { SourcePatchReadPort } from "../core/graph/patch";
import { RelationType } from "../core/graph/relations";
import { classifyRelation } from "../core/graph/resolver";
import type { SourceEntityRef } from "../core/graph/source";
import { SOURCE_MAX_BATCH_RECORDS, type SourceReason } from "./SourceFacts";

/** Only gate visibility inputs; titles, sorting, top-N, lenses and layout are deliberately absent. */
export type CachedCenterGateSettings = Readonly<{
  excludeFilepaths: readonly string[];
  showVirtualNodes: boolean;
  showAttachments: boolean;
  showFolderNodes: boolean;
  showTagNodes: boolean;
  showPageNodes: boolean;
  showURLNodes: boolean;
  showInferredNodes: boolean;
}>;
/** The owner advances this token for presentation changes, independently of semantic/source policy. */
export type CachedCenterGatePolicy = Readonly<{
  revision: string;
  settings: CachedCenterGateSettings;
  isCurrent(): boolean;
}>;
/** Physical center gates; previous/next share the left/right gate respectively. */
export type CachedCenterGateSide = "top" | "bottom" | "left" | "right";
/** Semantic fill and unique visible-path count before any display truncation. */
export type CachedCenterGates = Readonly<Record<CachedCenterGateSide, Readonly<{
  hasAny: boolean;
  visibleCount: number;
}>>>;
/** Local projection only: ready here still requires the reader's final authentication fence. */
export type CachedCenterGateProjection = Readonly<{
  outcome: "ready";
  gates: CachedCenterGates;
  work: Readonly<{ relations: number; entityReads: number }>;
}> | Readonly<{ outcome: "unproved"; reason: SourceReason }>;

/** Count and byte caps supplement existing contributor/replay bounds; overflow is never a prefix. */
const MAX_GATE_PATH_BYTES = 32 * 1024 * 1024;
const MAX_VISIBILITY_PREFIXES = 256;
const MAX_VISIBILITY_PREFIX_BYTES = 64 * 1024;
const roles = ["parent", "child", "left", "right", "previous", "next"] as const;
const roleGates: Readonly<Record<typeof roles[number], CachedCenterGateSide>> = {
  parent: "top", child: "bottom", left: "left", right: "right", previous: "left", next: "right",
};
type VisibilityFact = Readonly<{ path: string; virtual: boolean; attachment: boolean; folder: boolean; tag: boolean; url: boolean }>;

/** Copy only finite visibility inputs before any await; retain prefix order and empty prefixes. */
export function captureCachedCenterGateSettings(settings: CachedCenterGateSettings): CachedCenterGateSettings | null {
  if (settings.excludeFilepaths.length > MAX_VISIBILITY_PREFIXES
    || settings.excludeFilepaths.reduce((bytes, path) => bytes + 2 * path.length, 0) > MAX_VISIBILITY_PREFIX_BYTES) return null;
  return { excludeFilepaths: [...settings.excludeFilepaths], showVirtualNodes: settings.showVirtualNodes,
    showAttachments: settings.showAttachments, showFolderNodes: settings.showFolderNodes,
    showTagNodes: settings.showTagNodes, showPageNodes: settings.showPageNodes,
    showURLNodes: settings.showURLNodes, showInferredNodes: settings.showInferredNodes };
}

/** Match legacy page visibility exactly once the required physical/synthetic facets are proved. */
function visible(fact: VisibilityFact, settings: CachedCenterGateSettings): boolean {
  if (settings.excludeFilepaths.some((prefix) => fact.path.startsWith(prefix))) return false;
  if (!settings.showVirtualNodes && fact.virtual) return false;
  if (!settings.showAttachments && fact.attachment) return false;
  if (!settings.showFolderNodes && fact.folder) return false;
  if (!settings.showTagNodes && fact.tag) return false;
  if (!settings.showPageNodes && !fact.folder && !fact.tag && !fact.attachment && !fact.url) return false;
  if (!settings.showURLNodes && fact.url) return false;
  return true;
}

/**
 * Project one present center without sorting or truncating. Physical entity absence is unproved,
 * not virtual; an absent compiled center likewise cannot authorize a zero count. Synthetic facets
 * come from the canonical current-policy compiler. The final async fence belongs to the reader.
 */
export async function projectCachedCenterGates(compilation: PortableGraphCompilation, center: SourceEntityRef,
  inferAllLinksAsFriends: boolean, settings: CachedCenterGateSettings, entities: SourcePatchReadPort,
  runtime: GraphCompilerRuntime): Promise<CachedCenterGateProjection> {
  if (!runtime.isCurrent()) return { outcome: "unproved", reason: "cancelled" };
  const node = compilation.node(center.id);
  if (!node) return { outcome: "unproved", reason: "missing" };
  const facts = new Map<NodeId, VisibilityFact>();
  let entityReads = 0, failure: SourceReason = "missing";
  if (2 * (node.semanticPath?.length ?? 0) > MAX_GATE_PATH_BYTES) return { outcome: "unproved", reason: "backpressure" };
  /** Read each physical identity at most once; never derive identity, paths or file state from IDs. */
  const factFor = (target: CompiledGraphNode): VisibilityFact | null => {
    const cached = facts.get(target.id);
    if (cached) return cached;
    if (!target.semanticPath) { failure = "unsupported-scope"; return null; }
    const folder = target.kind === "container", tag = target.kind === "tag", url = Boolean(target.url);
    let hasFile = false, attachment = false;
    if (target.kind === "document" || target.kind === "attachment") {
      entityReads++;
      const fact = entities.entity(target);
      if (!fact || !fact.file) { failure = "missing"; return null; }
      if (fact.source.id !== target.id || fact.entity.id !== target.id || fact.entity.state !== "materialized"
        || fact.entity.kind !== target.kind || fact.entity.semanticPath !== target.semanticPath
        || fact.entity.physicalPath !== target.physicalPath || fact.file.path !== target.physicalPath
        || typeof fact.file.extension !== "string" || (fact.file.extension === "md") !== (target.kind === "document")) {
        failure = "stale"; return null;
      }
      hasFile = true;
      attachment = fact.file.extension !== "md";
    } else if (target.file || (target.kind === "url" && !url)
      || target.state === "missing" || target.state === "deleted") {
      // These facets cannot bind to the promised ordinary current GraphIndex page contract.
      failure = "missing"; return null;
    }
    const result = { path: target.semanticPath, virtual: !hasFile && !folder && !tag && !url,
      attachment, folder, tag, url };
    facts.set(target.id, result);
    return result;
  };
  // An excluded center still exists and owns gates; its own visibility never filters its targets.
  if (!factFor(node)) return { outcome: "unproved", reason: failure };
  const gates = { top: { hasAny: false, visibleCount: 0 }, bottom: { hasAny: false, visibleCount: 0 },
    left: { hasAny: false, visibleCount: 0 }, right: { hasAny: false, visibleCount: 0 } };
  const paths: Record<CachedCenterGateSide, Set<string>> = {
    top: new Set(), bottom: new Set(), left: new Set(), right: new Set(),
  };
  // Legacy binding keys neighbours by path, not ID. Distinct IDs sharing a path can overwrite
  // roles/visibility there; a path Set alone cannot prove that projection. Reject that scope.
  const identityByPath = new Map<string, NodeId>(node.semanticPath ? [[node.semanticPath, node.id]] : []);
  let started = runtime.now(), relations = 0;
  for (const relation of node.neighbours.values()) {
    if (!runtime.isCurrent()) return { outcome: "unproved", reason: "cancelled" };
    if ((relations > 0 && relations % SOURCE_MAX_BATCH_RECORDS === 0) || runtime.now() - started >= runtime.sliceBudgetMs) {
      await runtime.yield();
      if (!runtime.isCurrent()) return { outcome: "unproved", reason: "cancelled" };
      started = runtime.now();
    }
    relations++;
    const path = relation.target.semanticPath;
    if (!path) return { outcome: "unproved", reason: "unsupported-scope" };
    const previous = identityByPath.get(path);
    if (previous !== undefined && previous !== relation.target.id) return { outcome: "unproved", reason: "unsupported-scope" };
    if (previous === undefined) {
      // The path map necessarily scales with this one requested center. Bound pathological single
      // identities, not the aggregate relation count.
      if (2 * path.length > MAX_GATE_PATH_BYTES) return { outcome: "unproved", reason: "backpressure" };
      identityByPath.set(path, relation.target.id);
    }
    if (relation.isHidden) continue;
    const classified = roles.map((role) => ({ gate: roleGates[role], type: classifyRelation(relation, role, inferAllLinksAsFriends) }))
      .filter((item) => item.type !== null);
    if (!classified.length) continue;
    for (const { gate } of classified) gates[gate].hasAny = true;
    const fact = factFor(relation.target);
    if (!fact) return { outcome: "unproved", reason: failure };
    if (!visible(fact, settings)) continue;
    for (const { gate, type } of classified) {
      if (type === RelationType.INFERRED && !settings.showInferredNodes) continue;
      paths[gate].add(fact.path);
    }
  }
  if (!runtime.isCurrent()) return { outcome: "unproved", reason: "cancelled" };
  for (const gate of ["top", "bottom", "left", "right"] as const) gates[gate].visibleCount = paths[gate].size;
  return { outcome: "ready", gates, work: { relations, entityReads } };
}
