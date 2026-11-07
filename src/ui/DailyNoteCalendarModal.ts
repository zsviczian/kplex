/** Native calendar popup. Obsidian owns focus/Escape and mobile sizing; this shell owns the
 * finite filename inventory, React root and cancellation on canvas migration or window teardown. */
import {getLanguage, Notice, type App, type WorkspaceLeaf} from "obsidian";
import {createElement} from "react";
import {createRoot, type Root} from "react-dom/client";
import {KplexModal} from "../adapters/obsidian/KplexModal";
import {collectDailyNotes, dailyCalendarWeekStart, type DailyNoteEntry} from "../adapters/obsidian/dailyNoteNavigation";
import {calendarDayKey} from "../core/plex/calendarDates";
import type {Translator} from "../lang";
import {CalendarDatePicker} from "./features/CalendarDatePicker";

export class DailyNoteCalendarModal extends KplexModal {
  private opened = false;
  private root: Root | null = null;
  private releaseWindow: (() => void) | null = null;
  private releaseMigration: (() => void) | null = null;
  /** Capture the originating canvas and navigation callback rather than following active leaves. */
  constructor(app: App, private readonly translate: Translator, private readonly hostLeaf: WorkspaceLeaf,
    private readonly initialDate: string, private readonly current: () => boolean,
    private readonly selected: (date: string, entries: readonly DailyNoteEntry[]) => void, private readonly retired: () => void) {super(app);}

  /** Opening reads native filenames only and never creates a note or prepares semantic sources. */
  onOpen(): void {
    this.opened = true;this.setTitle(this.translate("daily.calendar"));this.modalEl.addClass("kplex-calendar-modal");
    this.root = createRoot(this.contentEl.createDiv());
    const today = calendarDayKey(new Date()), locale = getLanguage() || "en";
    /** New renders share one popup lifetime, while only explicit selection crosses into host navigation. */
    const render = (entries: readonly DailyNoteEntry[] | null): void => {
      if (!this.opened || !this.current()) return;
      this.root?.render(createElement(CalendarDatePicker, {initialDate: this.initialDate, today, locale, weekStart: dailyCalendarWeekStart(),
        dates: new Set(entries?.map(/** Only dates, never mutable native files, enter the calendar component. */ entry => entry.date) ?? []), ready: entries !== null, translate: this.translate,
        onChoose: /** Dismiss the picker before opening another native dialog or changing the canvas. */ date => {if (!this.current()) {this.close();return;}if (entries && this.opened) {this.close();this.selected(date, entries);}}}));
    };
    const owner = this.contentEl.ownerDocument.defaultView, close = /** Native teardown retires delayed inventory. */ (): void => this.close();
    owner?.addEventListener("pagehide", close, {once: true});this.releaseWindow = /** Release only this popup's owning window listener. */ () => owner?.removeEventListener("pagehide", close);
    this.releaseMigration = this.hostLeaf.view.containerEl.onWindowMigrated?.(close) ?? null;
    render(null);
    void collectDailyNotes(this.app, /** No delayed native observation may revive a dismissed or migrated picker. */ () => this.opened && this.current())
      .then(/** Configuration changes retire this picker rather than presenting the wrong note directory. */ entries => {if (entries) render(entries);else if (this.opened) this.close();})
      .catch(/** Failed metadata availability is explicit and never an empty complete calendar. */ error => {console.error("K-Plex daily calendar lookup failed", error);if (this.opened) {new Notice(this.translate("daily.lookupFailed"));this.close();}});
  }

  /** Dismissal retires pending work and the exact document-owned root without changing vault data. */
  onClose(): void {this.opened = false;this.releaseWindow?.();this.releaseWindow = null;this.releaseMigration?.();this.releaseMigration = null;this.root?.unmount();this.root = null;this.contentEl.empty();this.retired();}
}
