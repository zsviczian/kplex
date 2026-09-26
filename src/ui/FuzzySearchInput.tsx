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
export function FuzzySearchInput<T>({ icon = "search", portalSelector = ".excalibrain-app", ...props }: FuzzySearchInputProps<T>): ReactElement {
  return createElement(FuzzySuggester<T>, {
    ...props,
    portalSelector,
    appTopbarSelector: ".excalibrain-topbar",
    icon: icon ? createElement(ObsidianIcon, { name: icon, size: 16 }) : undefined,
  });
}

/** Tiny ranking helper for short string vocabularies such as ontology fields. */
export function fuzzyFilterStrings(values: readonly string[], query: string, limit = 24): string[] {
  const q = query.trim().toLocaleLowerCase();
  const unique = [...new Map(values.map((value) => [value.toLocaleLowerCase(), value] as const)).values()];
  if (!q) return unique.slice(0, limit);

  const score = (value: string): number | null => {
    const text = value.toLocaleLowerCase();
    if (text === q) return 0;
    if (text.startsWith(q)) return 1 + (text.length - q.length) / 1000;
    const at = text.indexOf(q);
    if (at >= 0) return 10 + at + (text.length - q.length) / 1000;
    let cursor = 0;
    let gaps = 0;
    for (const char of q) {
      const found = text.indexOf(char, cursor);
      if (found < 0) return null;
      gaps += found - cursor;
      cursor = found + 1;
    }
    return 100 + gaps + text.length / 1000;
  };

  return unique
    .map((value) => ({ value, score: score(value) }))
    .filter((entry): entry is { value: string; score: number } => entry.score !== null)
    .sort((a, b) => a.score - b.score || a.value.localeCompare(b.value, undefined, { sensitivity: "base", numeric: true }))
    .slice(0, limit)
    .map((entry) => entry.value);
}
