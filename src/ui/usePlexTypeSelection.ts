/**
 * Surface-local typing selection over the already displayed Plex occurrence list. This React hook
 * owns only an ephemeral exact-phrase query; the shared keyboard selection capability validates,
 * highlights and reveals each chosen occurrence. It reads no graph index or persistent settings,
 * and center changes, abnormal modes and explicit clear retire its query without changing navigation.
 */
import { useEffect, useRef, useState } from "react";
import type { PlexKeyboardNode, PlexKeyboardSelection } from "./usePlexKeyboardNavigation";

type TypeSelectionOptions = Readonly<{
  normalMode: boolean;
  activePath: string;
  nodes: readonly PlexKeyboardNode[];
  selection: PlexKeyboardSelection;
}>;

export interface PlexTypeSelection {
  query: string;
  count: number;
  index: number;
  /** Read synchronous query ownership before React commits a preceding key in the same task. */
  readQuery: () => string;
  /** Retire the query while leaving the exact selected occurrence highlighted. */
  clear: () => void;
  /** Handle unclaimed graph text/query-control keys; callers retain native focus and action priority. */
  handleKey: (event: KeyboardEvent) => boolean;
}

/**
 * Match one contiguous case-insensitive label phrase, preserving displayed order and duplicate
 * occurrences. Plex Find trims input for its separate field; typing deliberately retains every
 * space in the user's phrase, including a trailing space, instead of broadening that match.
 */
export function matchTypeSelection(nodes: readonly PlexKeyboardNode[], query: string): readonly PlexKeyboardNode[] {
  const phrase = query.toLocaleLowerCase();
  return phrase ? nodes.filter(/** Paths and hidden graph records are intentionally outside this label-only query. */ node =>
    node.label.toLocaleLowerCase().includes(phrase)) : [];
}

/** Choose the next/previous match after the current displayed occurrence, even if the extended phrase excludes that origin. */
export function nextTypeSelection(nodes: readonly PlexKeyboardNode[], matches: readonly PlexKeyboardNode[], selectedId: string | null, direction: 1 | -1): PlexKeyboardNode | null {
  if (!matches.length) return null;
  const matching = new Map(matches.map(/** Preserve exact occurrences when the same semantic path appears in several areas. */ node => [node.id, node]));
  const origin = nodes.findIndex(/** Compare opaque occurrence IDs, never a potentially shared semantic path. */ node => node.id === selectedId);
  const start = origin < 0 ? direction > 0 ? -1 : 0 : origin;
  for (let offset = 1; offset <= nodes.length; offset++) {
    const node = nodes[(start + offset * direction + nodes.length) % nodes.length];
    const match = node ? matching.get(node.id) : undefined;
    if (match) return match;
  }
  return null;
}

/** Keep text selection separate from Vault search and Plex Find, using their shared occurrence reveal boundary. */
export function usePlexTypeSelection(options: TypeSelectionOptions): PlexTypeSelection {
  const [state, setState] = useState<{ center: string; query: string } | null>(null);
  const query = options.normalMode && state?.center === options.activePath ? state.query : "";
  const current = useRef({ options, query });
  current.current = { options, query };
  useEffect(/** A later return to a center or normal mode must not resurrect a retired query. */ () => {
    if (state && (state.center !== options.activePath || !options.normalMode)) setState(null);
  }, [state, options.activePath, options.normalMode]);

  /** Update synchronous ownership first so immediate Scope and DOM deliveries use the same query generation. */
  const update = (value: string): void => {
    const latest = current.current;
    latest.query = value;
    setState(value ? { center: latest.options.activePath, query: value } : null);
  };
  /** Reveal through the existing selection owner; zero hits retain the prior selected occurrence. */
  const choose = (value: string, direction: 1 | -1): void => {
    const latest = current.current.options;
    const match = nextTypeSelection(latest.nodes, matchTypeSelection(latest.nodes, value), latest.selection.readSelected()?.id ?? null, direction);
    if (match) latest.selection.select(match.id);
  };
  const matches = matchTypeSelection(options.nodes, query);
  const selectedId = options.selection.readSelected()?.id;
  return {
    query,
    count: matches.length,
    index: matches.findIndex(/** The status reports selection without independently moving focus or navigation. */ node => node.id === selectedId) + 1,
    readQuery: /** Inactive modes decline query-control priority synchronously, before effect cleanup. */ () =>
      current.current.options.normalMode ? current.current.query : "",
    clear: /** Pointer/explicit cancellation leaves the existing keyboard selection owner in control. */ () => update(""),
    handleKey: /** Only graph-owned usable input reaches this hook; defensive guards preserve IME and native editing. */ event => {
      const latest = current.current;
      if (!latest.options.normalMode || event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey
        || event.key === "Dead" || event.key === "Process" || event.getModifierState?.("AltGraph")) return false;
      if (latest.query && event.key === "Escape") { update(""); return true; }
      if (latest.query && event.key === "Tab") { choose(latest.query, event.shiftKey ? -1 : 1); return true; }
      if (latest.query && event.key === "Backspace") {
        const next = Array.from(latest.query).slice(0, -1).join("");
        update(next); if (next) choose(next, 1); return true;
      }
      if (Array.from(event.key).length !== 1 || event.key === " " && !latest.query) return false;
      const next = latest.query + event.key;
      update(next); choose(next, 1); return true;
    },
  };
}
