/**
 * Native read-only reference for effective Plex keyboard shortcuts. This host presentation shell
 * reads the shared action catalog and saved preferences; it cannot dispatch actions or edit keys.
 * The launching App owns the dialog lifetime, while this modal releases its preference subscription,
 * search listener and captured dialog lease exactly once when closed.
 */
import { Modal, SearchComponent, Setting } from "obsidian";
import type KplexPlugin from "../main";
import { ACTION_CATALOG } from "../core/plex/actions";
import { effectiveActionBindings } from "../core/plex/actionPreferences";
import { readObsidianPresentationEnvironment } from "../adapters/obsidian/presentationEnvironment";
import { formatActionBinding, translateActionText } from "./actionPresentation";
import { renderActionSuggestion } from "./actionSuggestion";

/** Show current bound graph shortcuts without the execution behavior of a command palette. */
export class KeyboardHelpModal extends Modal {
  private opened = false;
  private retired = false;
  private query = "";
  private input: HTMLInputElement | null = null;
  private list: HTMLElement | null = null;
  private releasePreferences: (() => void) | null = null;

  /** Capture only the native presentation owner and its explicit invocation-release callback. */
  constructor(private plugin: KplexPlugin, private release: () => void = () => {}) {
    super(plugin.app);
    this.modalEl.addClass("kplex-keyboard-help");
    this.setTitle(plugin.translator("actions.helpTitle"));
  }

  /** Filter label, description and formatted chord text without interpreting input as a command. */
  private onSearch = (): void => {
    this.query = this.input?.value.trim().toLocaleLowerCase() ?? "";
    this.renderRows();
  };

  /** Build public native controls and keep live preference refreshes confined to reference rows. */
  onOpen(): void {
    if (this.retired || this.opened) return;
    this.opened = true;
    this.contentEl.empty();
    const header = this.contentEl.createDiv({ cls: "kplex-keyboard-help-header" });
    header.createEl("p", { text: this.plugin.translator("actions.helpDescription") });
    const search = new SearchComponent(header).setPlaceholder(this.plugin.translator("actions.helpPlaceholder"));
    this.input = search.inputEl;
    this.input.setAttr("aria-label", this.plugin.translator("actions.helpPlaceholder"));
    this.input.addEventListener("input", this.onSearch);
    this.list = this.contentEl.createDiv({ cls: "kplex-action-results kplex-keyboard-help-results" });
    const footer = this.contentEl.createDiv({ cls: "kplex-keyboard-help-footer" });
    new Setting(footer).addButton(/** Navigation is explicit and releases this dialog before opening native settings. */ button => {
      button.setButtonText(this.plugin.translator("actions.helpConfigure"))
        .onClick(/** Closing clears the surface dialog lease before native settings change focus. */ () => {
          if (!this.opened) return;
          this.close();
          this.plugin.openActionSettings();
        });
    });
    this.releasePreferences = this.plugin.subscribeActionPreferences(/** Saved changes refresh effective chords without stealing search focus. */ () => this.renderRows());
    this.renderRows();
    this.input.focus();
  }

  /** Project only effective bound graph actions; editor/session-only chords are separate workflows. */
  private renderRows(): void {
    if (!this.opened || !this.list) return;
    const environment = readObsidianPresentationEnvironment(this.contentEl.ownerDocument.defaultView ?? undefined);
    this.list.empty();
    const entries = ACTION_CATALOG.filter(/** A graph context includes the shared search and editor focus routes. */ action =>
      action.localContexts.includes("graph") && !action.id.startsWith("composer.") && !action.id.startsWith("ontology.assign."))
      .map(/** Display current effective bindings; explicit disablement and character-shortcut opt-out remain authoritative. */ action => ({
        action,
        label: translateActionText(this.plugin.translator, action.labelKey),
        description: translateActionText(this.plugin.translator, action.descriptionKey),
        chords: effectiveActionBindings(this.plugin.settings.actionPreferences, action.id)
          .map(/** A reference intentionally shows keys even when physical keyboard presence is unknown. */ binding =>
            formatActionBinding(binding, environment, this.plugin.translator, true))
          .filter(/** Only successfully formatted chords become visible reference entries. */ (chord): chord is string => chord !== null),
      }))
      .filter(/** Local text search covers the explanation and actual shortcut as well as its action label. */ entry =>
        entry.chords.length > 0 && (!this.query || `${entry.label} ${entry.description} ${entry.chords.join(" ")}`.toLocaleLowerCase().includes(this.query)))
      .sort(/** Translated alphabetical ordering makes a reference easy to scan. */ (first, second) => first.label.localeCompare(second.label));
    for (const { action, label, description, chords } of entries) {
      const row = this.list.createDiv({ cls: "suggestion-item" });
      row.setAttr("data-action-id", action.id);
      renderActionSuggestion(row, label, description, chords);
    }
  }

  /** Retire listeners and captured ownership once, including close-before-open and repeated close. */
  onClose(): void {
    if (this.retired) return;
    this.retired = true;
    this.opened = false;
    this.input?.removeEventListener("input", this.onSearch);
    this.releasePreferences?.();
    this.releasePreferences = null;
    this.input = null;
    this.list = null;
    this.contentEl.empty();
    const release = this.release;
    this.release = () => {};
    release();
  }
}
