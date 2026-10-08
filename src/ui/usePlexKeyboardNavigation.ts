/**
 * View-scoped native keyboard delivery and ephemeral selection. The host scope wins over workspace
 * shortcuts; a surface listener also supports sidebar focus. Both share one guarded dispatcher and
 * release on unmount/window migration. Editors, inputs, controls, portals and non-normal modes retain
 * their own keys. Callers supply projection, reveal and activation effects; no index is acquired here.
 */
import { useEffect, useRef, useState, type RefObject } from "react";
import type { Scope } from "obsidian";
import type { KeyConvention } from "../core/contracts/presentationEnvironment";
import { INTERNAL_HOTKEY_ACTIONS, resolveInternalHotkey, type InternalHotkeyAction, type InternalHotkeys } from "../core/plex/internalHotkeys";
import { moveKeyboardSelection, type KeyboardNode, type NavigationDirection } from "../core/plex/keyboardNavigation";
import { registerInternalHotkeys } from "./internalHotkeyScope";

export type PlexKeyboardNode = KeyboardNode & Readonly<{ label: string; path: string }>;
type NavigationOptions = Readonly<{
  viewport: RefObject<HTMLDivElement | null>; scope: Scope | null;
  normalMode: boolean; activePath: string; convention: KeyConvention;
  readBindings: () => InternalHotkeys; nodes: readonly PlexKeyboardNode[];
  reveal: (node: PlexKeyboardNode) => void; activate: (node: PlexKeyboardNode) => void;
  add: (action: InternalHotkeyAction) => boolean;
}>;

/** Limit internal navigation to the focused bare Plex, without realm-sensitive instanceof checks. */
export function ownsPlexKeyboardEvent(root: HTMLElement, event: KeyboardEvent, normalMode: boolean): boolean {
  const target = event.target;
  if (!normalMode || event.defaultPrevented || event.isComposing || !target || !("nodeType" in target)) return false;
  const element = target as Element;
  return root.contains(element) && !element.closest(
    "input, textarea, select, button, a, [contenteditable]:not([contenteditable='false']), [role='button'], [role='textbox'], [role='slider'], [role='menu'], [role='dialog'], .kplex-central-editor-content, .kplex-filter-panel",
  );
}

/** Keep selection surface-local, reset on navigation, and fall back to center after filtering/removal. */
export function usePlexKeyboardNavigation(options: NavigationOptions): string | null {
  const [selection, setSelection] = useState<{ center: string; id: string } | null>(null);
  const selectedId = selection?.center === options.activePath && options.nodes.some(node => node.id === selection.id)
    ? selection.id : null;
  const current = useRef({ options, selectedId });
  current.current = { options, selectedId };
  const bindings = options.readBindings();
  useEffect(/** Retire selection rather than resurrecting it when a prior center/filter returns. */ () => {
    if (selection && (selection.center !== options.activePath || !options.normalMode
      || !options.nodes.some(node => node.id === selection.id))) setSelection(null);
  }, [selection, options.activePath, options.normalMode, options.nodes]);
  useEffect(/** Bind only to this owning surface and release both native entry points together. */ () => {
    const root = options.viewport.current?.closest<HTMLElement>(".kplex-app");
    if (!root) return;
    /** Route exact configured chords once, only after mode and focus ownership are proven. */
    const dispatch = (event: KeyboardEvent): false | undefined => {
      const { options: latest, selectedId: selected } = current.current;
      if (!ownsPlexKeyboardEvent(root, event, latest.normalMode)) return;
      const action = resolveInternalHotkey(event, latest.readBindings(), latest.convention);
      if (!action) return;
      // Search/Find are owned by App and remain available in editor-node mode.
      if (action === "focusSearch" || action === "focusFind") return;
      if (action.startsWith("add")) {
        if (event.repeat) { event.preventDefault(); event.stopPropagation(); return false; }
        if (!latest.add(action)) return;
      } else if (action === "activate") {
        const node = latest.nodes.find(candidate => candidate.id === selected) ?? latest.nodes.find(candidate => candidate.section === "center");
        if (!node) return;
        if (!event.repeat) latest.activate(node);
      } else {
        const direction = action.replace(/^(move|section)/, "").toLowerCase() as NavigationDirection;
        const id = moveKeyboardSelection(latest.nodes, selected, direction, action.startsWith("section"));
        const node = latest.nodes.find(candidate => candidate.id === id);
        if (!node) return;
        current.current.selectedId = node.id;
        setSelection({ center: latest.activePath, id: node.id });
        latest.reveal(node);
      }
      event.preventDefault(); event.stopPropagation();
      return false;
    };
    const releaseScope = registerInternalHotkeys(options.scope, options.readBindings(),
      INTERNAL_HOTKEY_ACTIONS.filter(action => action !== "focusSearch" && action !== "focusFind"), dispatch);
    /** Sidebar native focus may not activate the leaf's host keymap scope. */
    const keydown = (event: KeyboardEvent): void => { dispatch(event); };
    root.addEventListener("keydown", keydown, true);
    /** Pointer interaction ends keyboard highlighting without changing click/navigation behavior. */
    const clear = (): void => { current.current.selectedId = null; setSelection(null); };
    root.addEventListener("pointerdown", clear, true);
    return () => {
      releaseScope();
      root.removeEventListener("keydown", keydown, true);
      root.removeEventListener("pointerdown", clear, true);
    };
  }, [options.viewport, options.scope, bindings]);
  return options.normalMode ? selectedId : null;
}
