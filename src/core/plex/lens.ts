import type { GraphNodeView } from "../graph/model";
import { GraphPredicateEngine, type CompiledGraphPredicate, type GraphPredicateEdgeContext, type GraphPredicateEvidence } from "./predicate";

export type PortableLensScope = "node" | "edge" | "evidence";
export type PortableLensMode = "include" | "exclude" | "style";
export type PortableLensNodeStyle = {
  backgroundColor?: string;
  fillStyle?: "solid" | "hachure" | "cross-hatch";
  textColor?: string;
  borderColor?: string;
  strokeWidth?: number;
  strokeStyle?: "solid" | "dashed" | "dotted";
};
export type PortableLensEdgeStyle = {
  strokeColor?: string;
  strokeWidth?: number;
  strokeStyle?: "solid" | "dashed" | "dotted";
  showLabel?: boolean;
  textColor?: string;
};
export type PortableLensStyle = Readonly<{ node?: Readonly<PortableLensNodeStyle>; edge?: Readonly<PortableLensEdgeStyle> }>;
export type PortableCompiledLens = Readonly<{ scope: PortableLensScope; mode: PortableLensMode; predicate: CompiledGraphPredicate; style?: PortableLensStyle }>;
export type PortableLensCandidate = Readonly<{ node: GraphNodeView; label: string; center?: GraphNodeView; edge?: GraphPredicateEdgeContext }>;
export type PortableEvidenceDecision = Readonly<{ evidence: GraphPredicateEvidence; active: boolean; suppressionReason?: string }>;
export interface GraphEvidenceProvider { decisions(sourcePath: string, targetPath: string): readonly PortableEvidenceDecision[]; }

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

export function portableLensStyle(engine: GraphPredicateEngine, evidence: GraphEvidenceProvider, lenses: readonly PortableCompiledLens[], candidate: PortableLensCandidate, target: "node"): PortableLensNodeStyle;
export function portableLensStyle(engine: GraphPredicateEngine, evidence: GraphEvidenceProvider, lenses: readonly PortableCompiledLens[], candidate: PortableLensCandidate, target: "edge"): PortableLensEdgeStyle;
export function portableLensStyle(engine: GraphPredicateEngine, evidence: GraphEvidenceProvider, lenses: readonly PortableCompiledLens[], candidate: PortableLensCandidate, target: "node" | "edge"): PortableLensNodeStyle | PortableLensEdgeStyle {
  const style: PortableLensNodeStyle | PortableLensEdgeStyle = {};
  for (const lens of lenses) {
    if (lens.mode !== "style" || !lens.style?.[target]) continue;
    if (target === "node" && lens.scope !== "node") continue;
    if (target === "edge" && lens.scope === "node") continue;
    if (matchesLens(engine, evidence, lens, candidate)) Object.assign(style, lens.style[target]);
  }
  return style;
}
