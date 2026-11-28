/** Admit only the known theme properties as literal colors. Never attach untrusted CSS to the page. */
import type {CSSProperties} from "react";

const properties = new Set(["background-primary", "text-normal", "text-muted", "background-modifier-border", "interactive-accent", "kplex-publication-panel", "kplex-publication-link"]);
const rule = /\s*(?:\.kplex-publication\s*\{([^{}]*)\}|@media\s*\(\s*prefers-color-scheme:\s*(light|dark)\s*\)\s*\{\s*\.kplex-publication\s*\{([^{}]*)\}\s*\})\s*/yu;

/** Convert an editable generated stylesheet to known light/dark color channels. */
export function readPublicationTheme(value: string): CSSProperties {
  if (!value.length || value.length > 4096) throw new Error("Unsupported publication theme");
  const values: Record<string, string> = {};
  const applied = new Set<string>();
  let offset = 0;
  while (offset < value.length) {
    rule.lastIndex = offset;
    const match = rule.exec(value);
    if (!match) throw new Error("Unsupported publication theme");
    const mode = match[2] ?? "light", source = match[1] ?? match[3];
    if (applied.has(mode)) throw new Error("Duplicate publication theme mode");
    applied.add(mode);
    offset = rule.lastIndex;
    for (const declaration of source.split(";")) {
      if (!declaration.trim()) continue;
      const color = /^\s*--([a-z-]+)\s*:\s*(#[\da-f]{6}(?:[\da-f]{2})?)\s*$/iu.exec(declaration);
      if (!color || !properties.has(color[1])) throw new Error("Unsupported publication color");
      values[`--kp-published-${mode}-${color[1]}`] = color[2];
    }
  }
  return values;
}
