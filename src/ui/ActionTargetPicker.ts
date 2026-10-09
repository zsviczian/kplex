/**
 * Native searchable picker over a caller's bounded action targets. The owning surface supplies
 * already displayed nodes, saved pins/history or pair-scoped connections; this shell never scans
 * the vault, resolves paths or mutates graph state. Close/unmount retires captured callbacks.
 */
import { FuzzySuggestModal, type App, type FuzzyMatch } from "obsidian";

export type ActionPickerEvent = MouseEvent | KeyboardEvent;

export interface ActionPickerItem<T> {
  label: string;
  detail?: string;
  disabled?: boolean;
  value: T;
}

/** Present a finite target list with native Obsidian suggestion navigation and accessibility. */
export class ActionTargetPicker<T> extends FuzzySuggestModal<ActionPickerItem<T>> {
  private chosen = false;
  private released = false;

  /** Capture this launch's targets and callbacks; missing rows stay explicit instead of shifting slots. */
  constructor(app: App, private items: readonly ActionPickerItem<T>[], placeholder: string,
    private choose: (value: T, event: MouseEvent | KeyboardEvent) => void,
    private release: () => void = () => {}) {
    super(app);
    this.setPlaceholder(placeholder);
  }

  /** Supply every captured target, preserving saved order even if native fuzzy matching filters it. */
  getItems(): ActionPickerItem<T>[] { return [...this.items]; }

  /** Include endpoint/path context in matching without interpreting canonical node identities. */
  getItemText(item: ActionPickerItem<T>): string { return `${item.label}${item.detail ? ` · ${item.detail}` : ""}`; }

  /** Keep unavailable targets visible and inert; valid selection dispatches once then closes. */
  onChooseItem(item: ActionPickerItem<T>, event: MouseEvent | KeyboardEvent): void {
    if (this.chosen || this.released || item.disabled) return;
    this.chosen = true;
    const choose = this.choose;
    this.close();
    choose(item.value, event);
  }

  /** Capture before native SuggestModal closes, preserving its modifier update and release-before-choice ordering. */
  selectSuggestion(match: FuzzyMatch<ActionPickerItem<T>>, event: MouseEvent | KeyboardEvent): void {
    if (this.chosen || this.released || match.item.disabled) return;
    this.chosen = true;
    const choose = this.choose;
    const value = match.item.value;
    // The public native method closes before onChooseSuggestion. Its later callback is inert
    // because this choice is already claimed, while native modifier bookkeeping stays intact.
    super.selectSuggestion(match, event);
    choose(value, event);
  }

  /** Support direct item callbacks without accepting a cancelled or already claimed native choice. */
  onChooseSuggestion(match: FuzzyMatch<ActionPickerItem<T>>, event: MouseEvent | KeyboardEvent): void {
    this.onChooseItem(match.item, event);
  }

  /** Native modal teardown releases this launch's callback lease exactly once. */
  onClose(): void {
    if (this.released) return;
    this.released = true;
    this.items = [];
    this.release();
    this.choose = () => {};
    this.release = () => {};
  }
}
