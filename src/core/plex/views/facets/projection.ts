/** Attention appears exactly once, centrally or in its one proven category. Bounded direct neighbors retain real
 * canonical relationship evidence/roles; category membership changes presentation only. */
import type {PlexViewInput, PlexProjection, PlexOccurrence, PlexViewEdge, PhysicalPort} from "../contracts";
import type {NodeId} from "../../../graph/model";
import type {Role} from "../../../graph/relations";
import type {FacetMembership} from "./contracts";
import {facetLibrary} from "./configuration";
import {facetState, resolveFacetPreset} from "./state";
import {compileFacetValues, classifyFacetNode} from "./classification";
import {facetMembershipBadge, facetMembershipDescription, facetPresetLabel} from "./labels";
import {compileFacetRules, facetRuleClassifier} from "./rules";
import {facetDiagnostics, facetLayout} from "./presentation";

/** Collision-free bounded identity includes the preset and separates diagnostics from categories.
 *48-character component bounds keep every existing session area-height key below128 characters. */
export function facetAreaId(preset: string, kind: "category" | "status", id: string): string {return JSON.stringify(["facets", preset, kind, id]);}
/** Combined diagnostics never shares the specifically writable Unassigned area's identity. */
export function facetCombinedAreaId(preset: string): string {return JSON.stringify(["facets", preset, "diagnostics"]);}
/** Physical direction is a layout policy; it never substitutes for the canonical role. */
function ports(role: Role): Readonly<{source: PhysicalPort; target: PhysicalPort}> {
  return role === "parent" ? {source: "top", target: "bottom"} : role === "child" ? {source: "bottom", target: "top"}
    : role === "left" || role === "previous" ? {source: "left", target: "right"} : {source: "right", target: "left"};
}
/** Project one explicit preset/source with no acquisition, parser, scope expansion or mutation. */
export function projectFacets(input: PlexViewInput): PlexProjection | null {
  if (!Number.isSafeInteger(input.maximum) || input.maximum < 1) return null;
  const maximum = Math.min(2047, input.maximum), occurrenceLimit = Math.min(2048, maximum * 6 + 1);
  const library = facetLibrary(input.configuration), state = facetState(input.state), attention = input.read.node(input.attention);
  if (!library || !attention || !input.read.isCurrent()) return null;
  const selected = resolveFacetPreset(library, state?.preset), preset = selected.preset, match = compileFacetValues(preset);
  const diagnostics = facetDiagnostics(preset, selected.id, state);
  const admitted = new Map<NodeId, {node: typeof attention; relations: NonNullable<PlexOccurrence["relation"]>[]}>();
  admitted.set(attention.id, {node: attention, relations: []});
  const occurrenceId = (id: NodeId): string => JSON.stringify(["facets", id]);
  const occurrences = new Map<NodeId, PlexOccurrence>(), edges: PlexViewEdge[] = [];
  let truncated = false, coverage = input.read.coverage;
  for (const role of ["parent", "child", "left", "right", "previous", "next"] as const) {
    const rows = input.read.relations(attention.id, role, maximum);truncated ||= rows.truncated || rows.items.length > maximum;
    if (rows.coverage === "unavailable") coverage = "unavailable";
    for (const relation of [...rows.items.slice(0, maximum)].sort((a, b) => input.read.compare(a.node, b.node))) {
      if (relation.node.id === attention.id) continue;
      if (!admitted.has(relation.node.id) && admitted.size >= occurrenceLimit) {truncated = true;continue;}
      const target = admitted.get(relation.node.id) ?? {node: relation.node, relations: []};
      target.relations.push(relation);admitted.set(relation.node.id, target);
      const physical = ports(role);
      edges.push({id: JSON.stringify(["facets-edge", role, relation.node.id]), kind: "semantic", source: occurrenceId(attention.id), target: occurrenceId(relation.node.id),
        sourceNode: attention.id, targetNode: relation.node.id, sourcePort: physical.source, targetPort: physical.target, relation});
    }
  }
  const classifyRules = preset.source === "rules" ? facetRuleClassifier(input.read, attention, compileFacetRules(preset)) : null;
  const occurrence = (node: typeof attention, role?: Role, relation?: PlexOccurrence["relation"]): PlexOccurrence => {
    const center = node.id === attention.id;
    const membership: FacetMembership = center && (!state || selected.status === "future" || selected.status === "missing")
      ? {status: "unresolved", reason: "preset"} : classifyRules ? classifyRules.classify(node, admitted.get(node.id)?.relations ?? []) : classifyFacetNode(node, input.read, preset, match);
    const area = facetAreaId(selected.id, membership.status === "assigned" ? "category" : "status",
      membership.status === "assigned" ? membership.category : membership.status);
    const diagnostic = membership.status !== "assigned", combined = diagnostics.combined && diagnostic;
    return {id: occurrenceId(node.id), nodeId: node.id, representation: "thought", role: center ? undefined : role, relation,
      groupingPartition: area, ...(center || combined ? {badge: facetMembershipBadge(membership, preset)} : {}),
      ...(!center ? {areaId: combined ? facetCombinedAreaId(selected.id) : area}
        : preset.focusInCategory && membership.status === "assigned" && preset.order.includes(membership.category) ? {areaId: area} : {}),
      description: facetMembershipDescription(membership), ports: {top: "parent", bottom: "child", left: "left", right: "right"}};
  };
  for (const {node, relations} of admitted.values()) occurrences.set(node.id, occurrence(node, relations[0]?.role, relations[0]));
  const entry = occurrences.get(attention.id)!;
  return input.read.isCurrent() && (!classifyRules || classifyRules.isCurrent()) ? {attention: attention.id, layoutRoot: attention.id, entry: entry.id, editor: entry.id, frame: entry.id,
    occurrences: [...occurrences.values()], edges, truncated, coverage, heading: facetPresetLabel(preset),
    ...(preset.centerAnchoredLinks ? {connectionPresentation: "node-centers" as const} : {}),
    ...(!state || selected.status === "future" || selected.status === "missing" ? {status: {key: "facets.presetUnavailable"}}
      : facetLayout(preset, selected.id, state).fallback ? {status: {key: "facets.quadrantsUnavailable"}} : {})} : null;
}
