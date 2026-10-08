/**
 * Spatial keyboard selection over the current Plex projection. Callers supply rendered coordinates
 * and section identities, including repacked overflow rows. This policy never reads graph semantics,
 * changes the center or owns DOM focus, scrolling, camera, persistence or editor state.
 */
export type NavigationDirection = "up" | "down" | "left" | "right";
export type KeyboardNode = Readonly<{ id: string; section: string; x: number; y: number; sectionX?: number; sectionY?: number }>;

/** Rank forward candidates, strongly preferring the same visual row/column in a grid. */
function directionalScore(origin: Pick<KeyboardNode, "x" | "y">, target: Pick<KeyboardNode, "x" | "y">, direction: NavigationDirection): number {
  const horizontal = direction === "left" || direction === "right";
  const forward = (horizontal ? target.x - origin.x : target.y - origin.y) * (direction === "left" || direction === "up" ? -1 : 1);
  if (forward < 1) return Infinity;
  const cross = Math.abs(horizontal ? target.y - origin.y : target.x - origin.x);
  return forward + cross * 4;
}

/** Return the nearest forward target, retaining the current selection at a boundary. */
function nearest<T extends Pick<KeyboardNode, "x" | "y">>(origin: Pick<KeyboardNode, "x" | "y">, candidates: readonly T[], direction: NavigationDirection): T | undefined {
  let best: T | undefined, score = Infinity;
  for (const candidate of candidates) {
    const next = directionalScore(origin, candidate, direction);
    if (next < score) { best = candidate; score = next; }
  }
  return best;
}

/**
 * Move within a section or enter the next nonempty section in the requested spatial direction.
 * The center is a one-node section; only section jumps leave it.
 * Section jumps use supplied area anchors (bounds as fallback), then choose the closest entry.
 */
export function moveKeyboardSelection(nodes: readonly KeyboardNode[], selectedId: string | null, direction: NavigationDirection, betweenSections: boolean): string | null {
  const current = nodes.find(node => node.id === selectedId) ?? nodes.find(node => node.section === "center") ?? nodes[0];
  if (!current) return null;
  if (!betweenSections) {
    return nearest(current, nodes.filter(node => node.section === current.section && node.id !== current.id), direction)?.id ?? current.id;
  }
  const sections = new Map<string, KeyboardNode[]>();
  for (const node of nodes) {
    const group = sections.get(node.section) ?? [];
    group.push(node); sections.set(node.section, group);
  }
  const centers = [...sections].map(/** Use bounds, avoiding a density-dependent bias toward populated rows. */ ([section, group]) => ({
    section, x: group[0].sectionX ?? (Math.min(...group.map(node => node.x)) + Math.max(...group.map(node => node.x))) / 2,
    y: group[0].sectionY ?? (Math.min(...group.map(node => node.y)) + Math.max(...group.map(node => node.y))) / 2,
  }));
  const origin = centers.find(section => section.section === current.section)!;
  const target = nearest(origin, centers.filter(section => section.section !== current.section), direction);
  if (!target) return current.id;
  const group = sections.get(target.section)!;
  return group.reduce(/** Enter the closest visible row without changing the graph center. */ (best, node) =>
    Math.hypot(node.x - current.x, node.y - current.y) < Math.hypot(best.x - current.x, best.y - current.y) ? node : best).id;
}
