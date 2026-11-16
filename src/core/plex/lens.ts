/** Portable lens matching and appearance layers; color references retain identity until host paint. */
import type { GraphNodeView } from "../graph/model";
import type { ColorValue } from "../contracts/colorValue";
import { GraphPredicateEngine, type CompiledGraphPredicate, type GraphPredicateEdgeContext, type GraphPredicateEvidence,
  type GraphPredicateContext, type GraphPredicateRead, type GraphPredicateResult, type GraphPredicateValue } from "./predicate";

export type PortableLensScope = "node" | "edge" | "evidence";
export type PortableLensMode = "include" | "exclude" | "style";
export type PortableLensNodeStyle = {
  backgroundColor?: ColorValue;
  fillStyle?: "solid" | "hachure" | "cross-hatch";
  textColor?: ColorValue;
  borderColor?: ColorValue;
  strokeWidth?: number;
  strokeStyle?: "solid" | "dashed" | "dotted";
};
export type PortableLensEdgeStyle = {
  strokeColor?: ColorValue;
  strokeWidth?: number;
  strokeStyle?: "solid" | "dashed" | "dotted";
  showLabel?: boolean;
  textColor?: ColorValue;
};
export type PortableLensStyle = Readonly<{ node?: Readonly<PortableLensNodeStyle>; edge?: Readonly<PortableLensEdgeStyle> }>;
export type PortableCompiledLens = Readonly<{ scope: PortableLensScope; mode: PortableLensMode; predicate: CompiledGraphPredicate; style?: PortableLensStyle }>;
export type PortableLensCandidate = Readonly<{ node: GraphNodeView; label: string; center?: GraphNodeView; edge?: GraphPredicateEdgeContext }>;
export type PortableEvidenceDecision = Readonly<{ evidence: GraphPredicateEvidence; active: boolean; suppressionReason?: string }>;
export interface GraphEvidenceProvider { decisions(sourcePath: string, targetPath: string): readonly PortableEvidenceDecision[]; }

/** Opt-in any-match over explicitly supplied canonical contexts. Shared availability semantics
 * retain uncertainty until a positive context proves membership; legacy lens matching is unchanged. */
export function evaluatePortablePredicateContexts(engine: GraphPredicateEngine, predicate: CompiledGraphPredicate,
  contexts: Iterable<GraphPredicateContext>, read?: (value: GraphPredicateValue, context: GraphPredicateContext) => GraphPredicateRead): GraphPredicateResult {
  let unknown: Exclude<GraphPredicateResult, {status: "available"}> | undefined;
  for (const context of contexts) {
    const result = engine.evaluateAvailable(predicate, context, read);
    if (result.status === "available" && result.value) return result;
    if (result.status !== "available") unknown ??= result;
  }
  return unknown ?? {status: "available", value: false};
}

function matchesLens(engine: GraphPredicateEngine, evidenceProvider: GraphEvidenceProvider, lens: PortableCompiledLens, candidate: PortableLensCandidate): boolean {
  if (lens.scope !== "evidence") return engine.matches(lens.predicate, { node: { node: candidate.node, label: candidate.label }, center: candidate.center, edge: candidate.edge });
  const sourcePath = candidate.edge?.sourcePath ?? candidate.center?.path;
  const targetPath = candidate.edge?.targetPath ?? candidate.node.path;
  if (!sourcePath || !targetPath || sourcePath === targetPath) return false;
  return evidenceProvider.decisions(sourcePath, targetPath).some((decision) => engine.matches(lens.predicate, {
    node: { node: candidate.node, label: candidate.label }, center: candidate.center, edge: candidate.edge,
    evidence: { ...decision.evidence, active: decision.active, suppressionReason: decision.suppressionReason },
  }));
}

export function matchesPortableLenses(engine: GraphPredicateEngine, evidence: GraphEvidenceProvider, lenses: readonly PortableCompiledLens[], candidate: PortableLensCandidate): boolean {
  if (!lenses.length) return true;
  const includes = lenses.filter((lens) => lens.mode === "include");
  const excludes = lenses.filter((lens) => lens.mode === "exclude");
  const included = includes.length === 0 || includes.some((lens) => matchesLens(engine, evidence, lens, candidate));
  return included && !excludes.some((lens) => matchesLens(engine, evidence, lens, candidate));
}

/** Retain the same matching lens identities used by paint, in the exact override order. */
export function matchingPortableStyleLenses<L extends PortableCompiledLens>(engine: GraphPredicateEngine, evidence: GraphEvidenceProvider,
  lenses: readonly L[], candidate: PortableLensCandidate, target: "node" | "edge"): L[] {
  return lenses.filter(lens => lens.mode === "style" && !!lens.style?.[target]
    && (target === "node" ? lens.scope === "node" : lens.scope !== "node") && matchesLens(engine, evidence, lens, candidate));
}

export function portableLensStyle(engine: GraphPredicateEngine, evidence: GraphEvidenceProvider, lenses: readonly PortableCompiledLens[], candidate: PortableLensCandidate, target: "node"): PortableLensNodeStyle;
export function portableLensStyle(engine: GraphPredicateEngine, evidence: GraphEvidenceProvider, lenses: readonly PortableCompiledLens[], candidate: PortableLensCandidate, target: "edge"): PortableLensEdgeStyle;
export function portableLensStyle(engine: GraphPredicateEngine, evidence: GraphEvidenceProvider, lenses: readonly PortableCompiledLens[], candidate: PortableLensCandidate, target: "node" | "edge"): PortableLensNodeStyle | PortableLensEdgeStyle {
  const style: PortableLensNodeStyle | PortableLensEdgeStyle = {};
  for (const lens of matchingPortableStyleLenses(engine, evidence, lenses, candidate, target)) Object.assign(style, lens.style?.[target]);
  return style;
}
