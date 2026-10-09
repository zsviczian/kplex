/**
 * Surface-local occurrence selection over the already displayed Plex projection. This hook owns
 * ephemeral selection and reveal effects only; the shared action dispatcher owns key delivery.
 * Center, filter and interaction changes retire selection instead of restoring stale occurrences.
 */
import { useEffect, useRef, useState } from "react";
import { moveKeyboardSelection, type KeyboardNode, type NavigationDirection } from "../core/plex/keyboardNavigation";

export type PlexKeyboardNode = KeyboardNode & Readonly<{ label: string; path: string }>;
type NavigationOptions = Readonly<{
  normalMode: boolean; activePath: string; nodes: readonly PlexKeyboardNode[];
  crossSections: boolean; reveal: (node: PlexKeyboardNode) => void;
}>;
export interface PlexKeyboardSelection {
  selectedId: string | null;
  /** Read the latest exact occurrence synchronously, including during key-repeat renders. */
  readSelected: () => PlexKeyboardNode | null;
  /** Select only a currently displayed occurrence; filtering cannot introduce hidden targets. */
  select: (id: string | null) => boolean;
  /** Reuse spatial policy, optionally crossing sections only after a within-section boundary. */
  move: (direction: NavigationDirection, section: boolean) => boolean;
}

/** Keep exact occurrence selection local and synchronous while React supplies its visual state. */
export function usePlexKeyboardNavigation(options: NavigationOptions): PlexKeyboardSelection {
  const [selection, setSelection] = useState<{ center: string; id: string } | null>(null);
  const selectedId = selection?.center === options.activePath && options.nodes.some(node => node.id === selection.id)
    ? selection.id : null;
  const current = useRef({ options, selectedId });
  current.current = { options, selectedId };
  useEffect(/** Retire removed occurrences permanently; a later filter undo must not resurrect them. */ () => {
    if (selection && (selection.center !== options.activePath || !options.normalMode
      || !options.nodes.some(node => node.id === selection.id))) setSelection(null);
  }, [selection, options.activePath, options.normalMode, options.nodes]);
  /** Validate and reveal the exact occurrence before scheduling its visual selection update. */
  const select = (id: string | null): boolean => {
    const latest = current.current.options;
    const node = latest.nodes.find(candidate => candidate.id === id);
    if (id && !node) return false;
    current.current.selectedId = node?.id ?? null;
    setSelection(node ? { center: latest.activePath, id: node.id } : null);
    if (node) latest.reveal(node);
    return true;
  };
  return {
    selectedId: options.normalMode ? selectedId : null,
    readSelected: /** Avoid closure-stale selection between repeated deliveries in the same task. */ () =>
      current.current.options.normalMode ? current.current.options.nodes.find(node => node.id === current.current.selectedId) ?? null : null,
    select,
    move: /** Try the established section-local rule before optional boundary crossing. */ (direction, section) => {
      const { options: latest, selectedId: selected } = current.current;
      const origin = latest.nodes.find(node => node.id === selected) ?? latest.nodes.find(node => node.section === "center") ?? latest.nodes[0];
      let id = moveKeyboardSelection(latest.nodes, selected, direction, section);
      if (!section && latest.crossSections && id === origin?.id) id = moveKeyboardSelection(latest.nodes, selected, direction, true);
      return id ? select(id) : false;
    },
  };
}
