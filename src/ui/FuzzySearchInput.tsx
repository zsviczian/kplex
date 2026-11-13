/**
 * Composes portable fuzzy-suggester mechanics with K-Plex shell selectors and Obsidian icons.
 * Consumers own result data/actions; the shared component owns focus, portals and their cleanup.
 */
import { createElement, type ReactElement } from "react";
import { FuzzySuggester, type FuzzySuggesterProps } from "./components/FuzzySuggester";
import { ObsidianIcon } from "./ObsidianIcon";

export type FuzzySearchInputProps<T> = Omit<FuzzySuggesterProps<T>, "icon" | "appTopbarSelector"> & {
  icon?: string;
};

/**
 * Obsidian-facing compatibility facade for the portable suggester.
 * C25 can retire this path after its remaining consumers move to composition-owned icon slots.
 */
export function FuzzySearchInput<T>({ icon = "search", portalSelector = ".kplex-app", ...props }: FuzzySearchInputProps<T>): ReactElement {
  return createElement(FuzzySuggester<T>, {
    ...props,
    portalSelector,
    appTopbarSelector: ".kplex-topbar",
    icon: icon ? createElement(ObsidianIcon, { name: icon, size: 16 }) : undefined,
  });
}

/** Retain the host facade while portable features share the canonical string ranker. */
export {fuzzyFilterStrings} from "./components/fuzzyFilterStrings";
