/** Root one already-constructed canvas for Markdown without graph discovery or layout work.
 * Existing branch/section parents take precedence. Remaining visible occurrences use a bounded
 * spanning tree; non-tree connections stay available to the formatter as crosslinks. */
import {MIND_MAP_MARKDOWN_LIMITS} from "./mindMapMarkdown";

/** Preserve occurrence parents, then connect other constructed cards without duplicating notes. */
export function markdownTreeParents(root: string, nodes: readonly Readonly<{id: string; parent?: string}>[],
  edges: readonly Readonly<{source: string; target: string}>[]): ReadonlyMap<string, string | undefined> {
  if (nodes.length > MIND_MAP_MARKDOWN_LIMITS.nodes || edges.length > MIND_MAP_MARKDOWN_LIMITS.links) throw new Error("Canvas outline exceeds export limits");
  const ids = new Set(nodes.map(node => node.id));
  if (ids.size !== nodes.length || !ids.has(root)) throw new Error("Invalid canvas outline root");
  const parents = new Map<string, string | undefined>([[root, undefined]]), children = new Map<string, string[]>(), adjacent = new Map<string, string[]>();
  for (const node of nodes) if (node.id !== root && node.parent && ids.has(node.parent)) parents.set(node.id, node.parent);
  const colors = new Map<string, number>();
  for (const node of nodes) {
    const path: string[] = [];let current: string | undefined = node.id;
    while (current && colors.get(current) !== 2) {
      if (colors.get(current) === 1) throw new Error("Cyclic canvas outline parents");
      colors.set(current, 1);path.push(current);current = parents.get(current);
    }
    for (const id of path) colors.set(id, 2);
  }
  for (const [id, parent] of parents) if (parent) {const rows = children.get(parent) ?? [];rows.push(id);children.set(parent, rows);}
  for (const edge of edges) if (ids.has(edge.source) && ids.has(edge.target) && edge.source !== edge.target) {
    for (const [source, target] of [[edge.source, edge.target], [edge.target, edge.source]]) {const rows = adjacent.get(source) ?? [];rows.push(target);adjacent.set(source, rows);}
  }
  const queue = [root], visited = new Set<string>();let cursor = 0;
  /** Each occurrence is admitted once; explicit hierarchy never borrows a different incoming edge. */
  const drain = (): void => {
    while (cursor < queue.length) {
      const id = queue[cursor++];if (visited.has(id)) continue;visited.add(id);
      queue.push(...children.get(id) ?? []);
      for (const target of adjacent.get(id) ?? []) if (!parents.has(target)) {parents.set(target, id);queue.push(target);}
    }
  };
  drain();
  // A rendered disconnected component is still visible content. Attach its entry without
  // inventing an ontology label; its own explicit descendants remain intact.
  for (const node of nodes) if (!visited.has(node.id)) {
    let entry = node.id;while (parents.get(entry) && !visited.has(parents.get(entry)!)) entry = parents.get(entry)!;
    parents.set(entry, root);queue.push(entry);drain();
  }
  return parents;
}
