/**
 * Native appearance-manager list mechanics shared by node styles, relationship styles and themes.
 * Consumers retain domain filtering, summaries, ownership and persistence; this shell only mounts
 * familiar search/actions/rows and bounds already-filtered entries through collectionWindow.
 */
import {collectionWindow, type CollectionWindow} from "./components/collectionWindow";
import {appendIcon} from "./StyleEditorModal";
import type {Translator} from "../lang";

/** One native manager owns its finite list and search control; no graph or settings owner is acquired. */
export class StyleManagerList {
  readonly controls: HTMLElement;
  readonly search: HTMLInputElement;
  readonly status: HTMLElement;
  readonly list: HTMLElement;
  private visibleLimit = 12;

  /** Reuse the established manager layout and keep each consumer's localized search semantics. */
  constructor(content: HTMLElement, private readonly translate: Translator, labels: {placeholder: string; aria: string}, changed: (query: string) => void) {
    content.addClass("kplex-style-manager");
    this.controls = content.createDiv({cls: "kplex-style-manager-controls"});
    this.search = this.controls.createDiv({cls: "search-input-container kplex-style-manager-search"}).createEl("input", {
      attr: {type: "search", placeholder: labels.placeholder, "aria-label": labels.aria},
    });
    this.search.addEventListener("input", /** Search/filter changes return to the first bounded window. */ () => {
      this.reset(); changed(this.search.value.trim().toLowerCase());
    });
    this.status = content.createDiv({cls: "kplex-style-manager-status", attr: {role: "status", "aria-live": "polite"}});
    this.list = content.createDiv({cls: "kplex-style-manager-list"});
  }

  /** Filters never retain a previous query's expanded page size. */
  reset(): void {this.visibleLimit = 12;}

  /** Window already ranked domain results; filtering remains the real manager's responsibility. */
  window<T>(matches: readonly T[]): CollectionWindow<T> {return collectionWindow(matches, this.visibleLimit, 20);}

  /** Share the native icon/action spacing with existing style-manager Add actions. */
  action(label: string, icon: string, run: () => void): HTMLButtonElement {
    const button = this.controls.createEl("button", {text: label, cls: "mod-cta", attr: {type: "button"}});
    appendIcon(button, icon); button.addEventListener("click", run); return button;
  }

  /** Rows retain a real button and the familiar native navigation glyph; consumers provide content. */
  row(run: () => void): HTMLButtonElement {
    const row = this.list.createEl("button", {cls: "kplex-style-manager-row", attr: {type: "button"}});
    appendIcon(row, "chevron-right"); row.addEventListener("click", run); return row;
  }

  /** Progressive disclosure uses the same count and step for all three actual consumers. */
  more(windowed: Pick<CollectionWindow<unknown>, "remaining" | "nextCount">, changed: () => void): void {
    if (!windowed.remaining) return;
    const button = this.list.createEl("button", {cls: "kplex-style-manager-more", text: this.translate("collection.showMore", {count: windowed.nextCount}), attr: {type: "button"}});
    button.addEventListener("click", /** Expanding never acquires more graph or vault data. */ () => {this.visibleLimit += 20; changed();});
  }
}
