/**
 * Native Obsidian dialog for materializing a placeholder as a real Markdown note. The plugin owns vault changes; this shell owns localized controls, validation feedback and close cleanup.
 */
import { DrawingTemplateSelect, type DrawingTemplateChoices } from "./features/DrawingTemplateSelect";
import { SavedRelationshipPendingError } from "../adapters/obsidian/relationshipMetadataWrite";
import { Modal, Notice, Setting, type App, type ButtonComponent, type Scope, type TFile } from "obsidian";
import { createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createObsidianTranslator } from "../adapters/obsidian/localization";
import { FolderPathInput, type FolderPathInputProps } from "./FolderPathInput";
import { PartialRelatedFileError } from "../adapters/obsidian/relatedFileOutcome";

/** Retain the native modal's selected destination while reusing the controlled React field. */
function MaterializationFolderInput(props: FolderPathInputProps) {
  const [value, setValue] = useState(props.value);
  return createElement(FolderPathInput, { ...props, value,
    onChange: /** Text editing never performs a native mutation. */ next => { setValue(next); props.onChange(next); } });
}

export type GhostMaterializationKind = "markdown" | "excalidraw";

export type GhostMaterializationLocation = {
  folderPath: string;
  label: string;
};

export class MaterializeGhostModal extends Modal {
  private readonly translate = createObsidianTranslator();
  private selectedFolderPath: string;
  private templatePath: string | undefined;
  private templateRoot: Root | null = null;
  private creating = false;
  private opened = false;
  private generation = 0;
  private folderRoot: Root | null = null;
  private readonly buttons: Array<{ button: ButtonComponent; kind: GhostMaterializationKind }> = [];
  private readonly nativeHandlers: Array<ReturnType<Scope["register"]>> = [];
  private partialFile: TFile | null = null;
  private partialKind: GhostMaterializationKind | null = null;
  private folderPaths: string[] = [];
  private recoveryStatus: HTMLElement | null = null;

  /** Capture one creation invocation; explicit folder selection focuses its field, while ordinary opening keeps quick submission. */
  constructor(
    app: App,
    private readonly noteName: string,
    locations: readonly GhostMaterializationLocation[],
    private readonly excalidrawAvailable: boolean,
    private readonly defaultKind: GhostMaterializationKind,
    private readonly onCreate: (kind: GhostMaterializationKind, folderPath: string, retainedFile?: TFile, current?: () => boolean, templatePath?: string) => Promise<boolean>,
    private readonly focusFolder = false,
    private readonly templateChoices?: DrawingTemplateChoices | null,
  ) {
    super(app);
    this.selectedFolderPath = locations[0]?.folderPath ?? "";
    this.templatePath = templateChoices?.selected;
  }

  /** Submit the validated creation request to the plugin and show localized failure feedback; the modal retains its existing busy/close lifecycle. */
  private async create(kind: GhostMaterializationKind): Promise<void> {
    if (this.creating || !this.opened || this.partialKind && kind !== this.partialKind) return;
    const generation = this.generation;
    /** Closing and reopening the same shell never revives an earlier submission's UI authority. */
    const current = (): boolean => this.opened && this.generation === generation;
    this.creating = true;
    this.refreshControls();
    try {
      if (await this.onCreate(kind, this.selectedFolderPath, this.partialFile ?? undefined, current, this.templatePath) && current()) this.close();
    } catch (error) {
      if (!current()) return;
      if (error instanceof PartialRelatedFileError) {
        this.partialFile = error.file; this.partialKind = kind;
        if (this.opened) {
          this.recoveryStatus ??= this.contentEl.createDiv({ cls: "kplex-add-related-recovery", attr: { role: "alert" } });
          this.recoveryStatus.setText(this.translate("ghost.recoverCreated", { path: error.file.path, error: error.message }));
        }
      } else if (this.opened) new Notice(error instanceof SavedRelationshipPendingError ? error.message : this.translate("note.createFailed", { error: error instanceof Error ? error.message : String(error) }), 5000);
    } finally {
      // The native write remains single-flight even if this same shell is reopened meanwhile.
      this.creating = false;
      if (this.opened) this.refreshControls();
    }
  }

  /** Lock the exact partial file's destination/type; retry continues the accepted write rather than creating again. */
  private refreshControls(): void {
    this.renderTemplate();
    for (const { button, kind } of this.buttons) button.setDisabled(this.creating || this.partialKind !== null && kind !== this.partialKind);
    this.folderRoot?.render(createElement(MaterializationFolderInput, {
      value: this.selectedFolderPath, folders: this.folderPaths, translate: this.translate, autoFocus: this.focusFolder,
      openResultsOnFocus: false,
      disabled: this.creating || this.partialFile !== null,
      onChange: /** A busy or accepted partial operation retains its exact destination. */ value => {
        if (!this.creating && !this.partialFile) this.selectedFolderPath = value;
      },
    }));
  }

  /** Keep template choice local and lock it once a file is accepted. */
  private renderTemplate(): void {
    if (!this.templateChoices) return;
    this.templateRoot?.render(createElement(DrawingTemplateSelect, {
      choices: this.templateChoices, value: this.templatePath ?? "", translate: this.translate,
      disabled: this.creating || this.partialFile !== null,
      onChange: path => { this.templatePath = path; this.renderTemplate(); },
    }));
  }

  /** Render the placeholder materialization form with localized captions and feedback; the native Modal owns its open/close shell. */
  onOpen(): void {
    this.generation++;
    this.opened = true;
    const effectiveDefault = this.defaultKind === "excalidraw" && this.excalidrawAvailable ? "excalidraw" : "markdown";
    this.titleEl.setText(this.translate("ghost.createTitle", { name: this.noteName }));
    this.contentEl.createEl("p", {
      text: this.translate(this.excalidrawAvailable ? "ghost.createHelpWithExcalidraw" : "ghost.createHelp"),
      cls: "setting-item-description",
    });

    const folderSetting = new Setting(this.contentEl).setName(this.translate("folderPicker.label"))
      .setClass("kplex-materialize-folder-row");
    const folderHost = folderSetting.controlEl.createDiv({ cls: "kplex-materialize-folder-input" });
    this.folderRoot = createRoot(folderHost);
    this.folderPaths = this.app.vault.getAllFolders(true).map(/** Include root without exposing note contents. */ folder => folder.path === "/" ? "/" : folder.path);
    this.refreshControls();

    if (this.templateChoices) {
      this.templateRoot = createRoot(this.contentEl.createDiv());
      this.renderTemplate();
    }
    const actionSetting = new Setting(this.contentEl);
    actionSetting.addButton((button) => {
      this.buttons.push({ button, kind: "markdown" });
      button
        .setButtonText(this.translate("common.markdown"))
        .onClick(() => { void this.create("markdown"); });
      if (effectiveDefault === "markdown") button.setCta();
    });

    if (this.excalidrawAvailable) {
      actionSetting.addButton((button) => {
        this.buttons.push({ button, kind: "excalidraw" });
        button
          .setButtonText(this.translate("common.excalidraw"))
          .onClick(() => { void this.create("excalidraw"); });
        if (effectiveDefault === "excalidraw") button.setCta();
      });
    }

    actionSetting.addButton((button) => button
      .setButtonText(this.translate("common.cancel"))
      .onClick(() => this.close()));

    this.nativeHandlers.push(this.scope.register(["Mod"], "Enter", (event) => {
      if (event.defaultPrevented || event.isComposing || event.repeat || event.getModifierState?.("AltGraph")
        || this.contentEl.querySelector('input[aria-expanded="true"]')) return undefined;
      event.preventDefault();
      void this.create(this.partialKind ?? effectiveDefault);
      return true;
    }));
  }

  /** Escape dismisses an open folder list before closing the native creation form. */
  override onEscapeKey(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.isComposing) return;
    event.preventDefault(); event.stopPropagation();
    const expanded = this.contentEl.querySelector<HTMLInputElement>('input[aria-expanded="true"]');
    const shell = expanded?.closest<HTMLElement>(".kplex-fuzzy-search");
    if (!shell) { this.close(); return; }
    const EventCtor = shell.ownerDocument.defaultView?.CustomEvent ?? CustomEvent;
    shell.dispatchEvent(new EventCtor("kplex-dismiss-suggestions"));
  }

  /** Release the exact React suggestion owner and native key registrations on every close. */
  onClose(): void {
    this.opened = false;
    this.generation++;
    this.templateRoot?.unmount(); this.templateRoot = null;
    this.folderRoot?.unmount(); this.folderRoot = null;
    for (const handler of this.nativeHandlers) this.scope.unregister(handler);
    this.nativeHandlers.length = 0; this.buttons.length = 0;
    this.contentEl.empty();
  }
}
