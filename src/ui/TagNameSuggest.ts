/** Native tag completion shared by selector editing and reviewed repair prompts.
 * Callers prepare cached suggestions once; querying never discovers files or rewrites input. */
import type {App} from "obsidian";
import {KplexInputSuggest} from "../adapters/obsidian/KplexInputSuggest";
import {noteTypeTag} from "../core/graph/tagPaths";

export class TagNameSuggest extends KplexInputSuggest<string> {
  /** Capture one form's input and already-discovered tag names. */
  constructor(app: App, input: HTMLInputElement, private readonly names: readonly string[]) {super(app, input);this.limit = 40;}
  /** Return a bounded native list while retaining each tag's authored spelling. */
  getSuggestions(query: string): string[] {const needle = query.trim().replace(/^#/, "").toLocaleLowerCase();return this.names.filter(name => noteTypeTag(name) && name.toLocaleLowerCase().includes(needle)).slice(0, this.limit);}
  /** Native suggestions show a tag rather than a second class/property namespace. */
  renderSuggestion(value: string, element: HTMLElement): void {element.setText(`#${value.replace(/^#/, "")}`);}
  /** Use the owning document's event constructor, including a popout form. */
  selectSuggestion(value: string): void {
    this.acceptValue(value);
  }
}
