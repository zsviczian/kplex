/** Native, bounded color chooser shared by named pairs and CSS-variable sources. */
import {SuggestModal, type App} from "obsidian";
import type {ColorValue} from "../core/contracts/colorValue";
import {ColorSwatchList} from "./ColorSwatchList";
import type {StyleColorContext} from "./StyleColorControls";
import {collectionWindow} from "./components/collectionWindow";

export type ColorSourceChoice<T> = Readonly<{label: string; detail?: string; color?: ColorValue; value: T}>;

/** Rows retain native keyboard/search behavior; previews reuse the existing owner-document sampler. */
export class ColorSourceSuggest<T> extends SuggestModal<ColorSourceChoice<T>> {
  private readonly swatches: ColorSwatchList;
  private alive = true;
  private selected = false;

  /** Read current choices per query, keeping labels separate from the source identity selected. */
  constructor(app: App, context: StyleColorContext,
    private readonly choices: () => readonly ColorSourceChoice<T>[], private readonly chosen: (value: T) => void) {
    super(app); this.limit = 40;
    this.swatches = new ColorSwatchList(context.sourceScope, context);
    this.setPlaceholder(context.translate("colors.searchColors"));
  }

  /** Bound mounted rows, including the chooser's sampler registrations, across repeated searches. */
  getSuggestions(query: string): ColorSourceChoice<T>[] {
    this.swatches.clear();
    const parts = query.trim().toLocaleLowerCase().split(/\s+/);
    return [...collectionWindow(this.choices().filter(item => parts.every(part => `${item.label} ${item.detail ?? ""}`.toLocaleLowerCase().includes(part))), this.limit, this.limit).visible];
  }

  /** Show both modes next to literal names, including custom variables and duplicate pair names. */
  renderSuggestion(item: ColorSourceChoice<T>, element: HTMLElement): void {
    element.addClass("kplex-color-suggestion");
    const copy = element.createDiv({cls: "suggestion-content"});
    copy.createDiv({text: item.label});
    if (item.detail) copy.createDiv({text: item.detail, cls: "suggestion-note"});
    if (item.color !== undefined) this.swatches.add(element.createDiv(), () => [{label: item.label, value: item.color, fallback: ""}]);
  }

  /** A retired chooser cannot complete into a newer or submitted source editor. */
  onChooseSuggestion(item: ColorSourceChoice<T>): void { if (this.alive && !this.selected) {this.selected = true; this.chosen(item.value);} }

  /** Native selection closes before its callback; capture the authorized choice before that boundary. */
  override selectSuggestion(item: ColorSourceChoice<T>, event: MouseEvent | KeyboardEvent): void {
    if (!this.alive || this.selected) return;
    this.selected = true;
    super.selectSuggestion(item, event);
    this.chosen(item.value);
  }

  /** Cancel pending harvests and exact subscriptions when native Escape, selection or teardown closes. */
  onClose(): void { this.alive = false; this.swatches.dispose(); }
}
