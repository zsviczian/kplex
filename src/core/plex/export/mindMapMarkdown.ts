/**
 * Bounded, host-free Markdown serialization of one committed Mind Map presentation.
 * Callers supply displayed occurrences, visual order and native-formatted node text;
 * this service never reads a graph, acquires sources, expands branches or mutates input.
 * Ancestor-cycle cards become Builder block-reference crosslinks rather than tree cycles.
 */
export type MindMapMarkdownNode = Readonly<{
  id: string; parent?: string; identity?: string; text: string; label: string;
  x: number; y: number; side: -1 | 1; reference: boolean;
  expanded: boolean; canExpand: boolean; partial: boolean; unresolved?: boolean; adjusted?: boolean;
  annotation?: string;
}>;
export type MindMapMarkdownEdge = Readonly<{source: string; target: string; label?: string}>;
export type MindMapMarkdownSnapshot = Readonly<{
  root: string; nodes: readonly MindMapMarkdownNode[]; links: readonly MindMapMarkdownEdge[];
  omitted: number; limited: boolean;
}>;
export type MindMapMarkdownWarnings = Readonly<{
  unresolved: number; adjusted: number; references: number; omitted: number; partial: number; collapsed: number;
}>;
export type MindMapMarkdownResult = Readonly<{markdown: string; title: string; nodes: number; warnings: MindMapMarkdownWarnings}>;
export const MIND_MAP_MARKDOWN_LIMITS = {nodes: 2048, links: 16_384, characters: 2_000_000} as const;

/** Neutralize syntax consumed as Builder metadata while retaining ordinary Markdown text. */
function inlineText(text: string): string {
  return text.replace(/[\r\n\t]+/g, " ").replace(/::/g, "&#58;&#58;")
    .replace(/\s#boundary\b/g, " &#35;boundary").replace(/\s\^([a-zA-Z0-9]{8})$/g, " &#94;$1")
    .replace(/\[\[#\^/g, "[[&#35;^").trim();
}

/** Serialize the whole captured root or an admitted subtree; malformed/oversized input fails closed. */
export function exportMindMapMarkdown(snapshot: MindMapMarkdownSnapshot, subtree = snapshot.root): MindMapMarkdownResult {
  if (snapshot.nodes.length > MIND_MAP_MARKDOWN_LIMITS.nodes || snapshot.links.length > MIND_MAP_MARKDOWN_LIMITS.links) throw new Error("Mind Map export exceeds its bound");
  const nodes = new Map(snapshot.nodes.map(node => [node.id, node]));
  if (nodes.size !== snapshot.nodes.length || !nodes.has(snapshot.root) || !nodes.has(subtree)) throw new Error("Invalid Mind Map export root");
  const root = nodes.get(subtree)!;
  const children = new Map<string, MindMapMarkdownNode[]>();
  for (const node of snapshot.nodes) {
    if (!node.id || !Number.isFinite(node.x) || !Number.isFinite(node.y)) throw new Error("Invalid Mind Map export occurrence");
    if (node.parent) {const list = children.get(node.parent) ?? [];list.push(node);children.set(node.parent, list);}
  }
  for (const [id, rows] of children) rows.sort(/** Match Builder's balanced right-before-left, then visual top-to-bottom order. */ (a, b) =>
    (id === subtree ? b.side - a.side : 0) || a.y - b.y || a.x - b.x);
  const ordered: {node: MindMapMarkdownNode; depth: number}[] = [], seen = new Set<string>(), included = new Set<string>();
  const links: MindMapMarkdownEdge[] = [];
  const warnings = {unresolved: 0, adjusted: 0, references: 0, omitted: snapshot.omitted, partial: snapshot.limited ? 1 : 0, collapsed: 0};
  const pending = [{node: root, depth: 0}];
  while (pending.length) {
    const next = pending.pop()!;
    if (seen.has(next.node.id) || next.depth > 32) throw new Error("Cyclic Mind Map occurrence hierarchy");
    seen.add(next.node.id);
    if (next.node.reference && next.node !== root) {
      let ancestor = next.node.parent ? nodes.get(next.node.parent) : undefined, target: MindMapMarkdownNode | undefined;
      const walked = new Set<string>();
      while (ancestor && !walked.has(ancestor.id)) {
        walked.add(ancestor.id);
        if (ancestor.identity !== undefined && ancestor.identity === next.node.identity && included.has(ancestor.id)) {target = ancestor;break;}
        if (ancestor.id === subtree) break;
        ancestor = ancestor.parent ? nodes.get(ancestor.parent) : undefined;
      }
      if (target && next.node.parent) {links.push({source: next.node.parent, target: target.id, label: next.node.annotation});warnings.references++;continue;}
    }
    included.add(next.node.id);ordered.push(next);
    if (next.node.unresolved) warnings.unresolved++;
    if (next.node.partial) warnings.partial++;
    if (!next.node.expanded && next.node.canExpand) warnings.collapsed++;
    if (!next.node.reference && next.node.expanded) {
      const rows = children.get(next.node.id) ?? [];
      for (let i = rows.length - 1; i >= 0; i--) pending.push({node: rows[i], depth: next.depth + 1});
    }
  }
  for (const edge of snapshot.links) if (included.has(edge.source) && included.has(edge.target)) links.push(edge);
  // Builder's one-line fast path does not reconstruct crosslinks. Never add a dummy
  // child merely to bypass it; retain the real root and disclose omitted self-links.
  if (ordered.length === 1 && links.length) {warnings.omitted += links.length;warnings.references = 0;links.length = 0;}
  const references = new Map<string, string>(), outgoing = new Map<string, string[]>(), unique = new Set<string>();
  for (const edge of links) {
    if (!included.has(edge.source) || !included.has(edge.target)) {warnings.omitted++;continue;}
    const key = JSON.stringify([edge.source, edge.target, edge.label ?? ""]);if (unique.has(key)) continue;unique.add(key);
    let reference = references.get(edge.target);
    if (!reference) {reference = `kp${String(references.size + 1).padStart(6, "0")}`;references.set(edge.target, reference);}
    const label = edge.label?.replace(/[\r\n:()]+/g, " ").trim();
    if (label && label !== edge.label) warnings.adjusted++;
    const text = label ? `(${label}:: [[#^${reference}|*]])` : `[[#^${reference}|*]]`;
    const list = outgoing.get(edge.source) ?? [];list.push(text);outgoing.set(edge.source, list);
  }
  const lines: string[] = [];let characters = 0;
  for (const {node, depth} of ordered) {
    const text = inlineText(node.text);
    if (!text) throw new Error("Empty Mind Map export text");
    if (node.adjusted || text !== node.text) warnings.adjusted++;
    const annotation = depth > 0 && node.annotation ? inlineText(node.annotation) : "";
    if (annotation && annotation !== node.annotation) warnings.adjusted++;
    const suffix = `${outgoing.has(node.id) ? ` ${outgoing.get(node.id)!.join(" ")}` : ""}${references.has(node.id) ? ` ^${references.get(node.id)!}` : ""}`;
    // Builder's single-line fast path strips a list prefix but retains a heading marker.
    const prefix = depth === 0 && ordered.length > 1 ? "# " : `${"  ".repeat(Math.max(0, depth - 1))}- `;
    const line = `${prefix}${annotation ? `${annotation}:: ` : ""}${text}${suffix}`;
    characters += line.length + 2;if (characters > MIND_MAP_MARKDOWN_LIMITS.characters) throw new Error("Mind Map export text exceeds its bound");
    lines.push(line);
  }
  return {markdown: `${lines.join(references.size ? "\n\n" : "\n")}\n`, title: root.label, nodes: ordered.length, warnings};
}
