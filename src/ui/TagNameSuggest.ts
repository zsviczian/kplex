/** Native tag completion shared by selector editing and reviewed repair prompts.
 * Callers prepare cached suggestions once; querying never discovers files or rewrites input. */
import type {App} from "obsidian";
import {KplexInputSuggest} from "../adapters/obsidian/KplexInputSuggest";
import {noteTypeTag} from "../core/graph/tagPaths";
import type {GraphPage} from "../types";

/** Collect selectable types from published tags and configured type rows without reading notes. */
export function noteTypeSuggestionNames(pages: Iterable<Pick<GraphPage, "tags" | "noteType">>, configured: readonly string[]): string[] {
  const names = new Set<string>();
  /** Use the same tag normalization for configured types and observed tags. */
  const addTag = (tag: string): void => {const name = noteTypeTag(tag); if (name) names.add(name);};
  for (const tag of configured) addTag(tag);
  for (const page of pages) {
    for (const tag of page.tags) addTag(tag);
    if (page.noteType) addTag(page.noteType);
  }
  return [...names].sort();
}

export class TagNameSuggest extends KplexInputSuggest<string> {
  /** Capture one form's input and already-discovered tag names. */
  constructor(app: App, input: HTMLInputElement, private readonly names: readonly string[], startClosed = false, private readonly ownerId?: string) {
    super(app, input, startClosed);
    this.limit = 40;
  }
  /** Return a bounded native list while retaining each tag's authored spelling. */
  getSuggestions(query: string): string[] {const needle = query.trim().replace(/^#/, "").toLocaleLowerCase();return this.names.filter(name => noteTypeTag(name) && name.toLocaleLowerCase().includes(needle)).slice(0, this.limit);}
  /** Native suggestions show a tag rather than a second class/property namespace. */
  renderSuggestion(value: string, element: HTMLElement): void {
    if (this.ownerId) element.dataset.fuzzyOwner = this.ownerId;
    element.setText(`#${value.replace(/^#/, "")}`);
  }
  /** Use the owning document's event constructor, including a popout form. */
  selectSuggestion(value: string): void {
    this.acceptValue(value);
  }
}
