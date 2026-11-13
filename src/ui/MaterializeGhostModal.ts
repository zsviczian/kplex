/**
 * Native Obsidian dialog for materializing a placeholder as a real Markdown note or drawing.
 * The shared type panel owns presentation; this shell owns drafts, validation, exact-file recovery and cleanup.
 */
import {formActions, iconButton, FormSetting as Setting, KplexModal as Modal, formField} from "../adapters/obsidian/KplexModal";


import type {DrawingTemplateChoices} from "./features/DrawingTemplateSelect";
import {CreationTypeTabs, type CreationTypeTabControl} from "./features/CreationTypeTabs";
import {ObsidianIcon} from "./ObsidianIcon";
import { SavedRelationshipPendingError } from "../adapters/obsidian/relationshipMetadataWrite";
import {Notice, type App, type ButtonComponent, type Scope, type TFile} from "obsidian";
import { createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createObsidianTranslator } from "../adapters/obsidian/localization";
import { FolderPathInput, type FolderPathInputProps } from "./FolderPathInput";
import { PartialRelatedFileError } from "../adapters/obsidian/relatedFileOutcome";
import {CreationCompletionSelect, type CreatedNoteCompletionControl} from "./features/CreationCompletionSelect";
import type {CreationAfterSavingAction} from "../core/plex/createdNoteDestination";

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

/** Explicit native daily-template choice, separate from the editable ordinary destination. */
export type GhostDailyNoteChoice = Readonly<{path: string;
  create(retainedFile: TFile | undefined, current: () => boolean, afterSaving: CreationAfterSavingAction): Promise<boolean>}>;

export class MaterializeGhostModal extends Modal {
  private readonly translate = createObsidianTranslator();
  private selectedFolderPath: string;
  private templatePath: string | undefined;
  private templatePaths: Record<GhostMaterializationKind, string | undefined>;
  private templateKind: GhostMaterializationKind | undefined;
  private selectedKind: GhostMaterializationKind;
  private templateRoot: Root | null = null;
  private creating = false;
  private opened = false;
  private generation = 0;
  private folderRoot: Root | null = null;
  private readonly buttons: Array<{ button: ButtonComponent; kind: GhostMaterializationKind; daily?: boolean }> = [];
  private readonly nativeHandlers: Array<ReturnType<Scope["register"]>> = [];
  private partialFile: TFile | null = null;
  private partialKind: GhostMaterializationKind | null = null;
  private partialDaily = false;
  private folderPaths: string[] = [];
  private recoveryStatus: HTMLElement | null = null;
  private completionRoot: Root | null = null;
  private afterSaving: CreationAfterSavingAction;

  /** Capture one creation invocation; explicit folder selection focuses its field, while ordinary opening keeps quick submission. */
  constructor(
    app: App,
    private readonly noteName: string,
    locations: readonly GhostMaterializationLocation[],
    private readonly excalidrawAvailable: boolean,
    defaultKind: GhostMaterializationKind,
    private readonly onCreate: (kind: GhostMaterializationKind, folderPath: string, retainedFile?: TFile, current?: () => boolean, templatePath?: string, afterSaving?: CreationAfterSavingAction) => Promise<boolean>,
    private readonly focusFolder = false,
    private readonly templateChoices?: DrawingTemplateChoices | null,
    private readonly completionControl?: CreatedNoteCompletionControl,
    private readonly dailyNote?: GhostDailyNoteChoice,
    private readonly creationTabControl?: CreationTypeTabControl,
  ) {
    super(app);
    this.selectedFolderPath = locations[0]?.folderPath ?? "";
    if(templateChoices&&!excalidrawAvailable)this.templateChoices={...templateChoices,files:templateChoices.files.filter(file=>file.kind==='markdown')};
    const selected=this.templateChoices?.files.find(file=>file.path===this.templateChoices?.selected);
    this.templatePath=this.templateChoices?selected?.path??"":undefined;
    this.templateKind=selected?selected.kind??"excalidraw":undefined;
    this.selectedKind=this.templateKind??(defaultKind==='excalidraw'&&excalidrawAvailable?'excalidraw':'markdown');
    this.templatePaths={markdown:this.templateChoices?"":undefined,excalidraw:this.templateChoices?"":undefined};
    this.templatePaths[this.selectedKind]=this.templatePath;
    if (creationTabControl?.value === "markdown" || creationTabControl?.value === "excalidraw") {
      this.selectedKind=creationTabControl.value === "excalidraw" && excalidrawAvailable ? "excalidraw" : "markdown";
      this.templatePath=this.templatePaths[this.selectedKind];this.templateKind=this.templatePath?this.selectedKind:undefined;
    }
    this.afterSaving = completionControl?.value ?? "return";
  }

  /** Submit the validated creation request to the plugin and show localized failure feedback; the modal retains its existing busy/close lifecycle. */
  private async create(kind: GhostMaterializationKind, daily = false): Promise<void> {
    if (this.creating || !this.opened || daily && !this.dailyNote || !daily && this.templatePath && this.templateKind!==kind
      || this.partialKind && (kind !== this.partialKind || daily !== this.partialDaily)) return;
    const generation = this.generation;
    /** Closing and reopening the same shell never revives an earlier submission's UI authority. */
    const current = (): boolean => this.opened && this.generation === generation;
    this.creating = true;
    this.refreshControls();
    try {
      if(!daily&&!this.partialFile&&this.templatePath)this.templateChoices?.validate?.(this.templatePath,kind);
      const completed = daily && this.dailyNote
        ? await this.dailyNote.create(this.partialFile ?? undefined, current, this.afterSaving)
        : await this.onCreate(kind, this.selectedFolderPath, this.partialFile ?? undefined, current, this.templatePath, this.afterSaving);
      if (completed && current()) this.close();
    } catch (error) {
      if (!current()) return;
      if (error instanceof PartialRelatedFileError) {
        this.partialFile = error.file; this.partialKind = kind; this.partialDaily = daily;
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
    this.renderCompletion();
    for (const { button, kind, daily } of this.buttons) {
      button.setDisabled(this.creating || this.partialKind !== null && (kind !== this.partialKind || Boolean(daily) !== this.partialDaily)
        || !daily && Boolean(this.templatePath) && kind!==this.templateKind);
      button.buttonEl.classList.toggle('mod-cta',this.partialKind!==null?kind===this.partialKind&&Boolean(daily)===this.partialDaily:!daily&&kind===this.selectedKind);
    }
    this.folderRoot?.render(createElement(MaterializationFolderInput, {
      value: this.selectedFolderPath, folders: this.folderPaths, translate: this.translate, autoFocus: this.focusFolder,
      openResultsOnFocus: false,
      disabled: this.creating || this.partialFile !== null,
      onChange: /** A busy or accepted partial operation retains its exact destination. */ value => {
        if (!this.creating && !this.partialFile) this.selectedFolderPath = value;
      },
    }));
  }

  /** Render the single shared After saving control; partial writes lock its value. */
  private renderCompletion(): void {
    if (!this.completionControl || !this.completionRoot) return;
    this.completionRoot.render(createElement(CreationCompletionSelect, {...this.completionControl, compact: true,
      value: this.afterSaving, translate: this.translate, disabled: this.creating || this.partialFile !== null,
      onChange: /** Persist only the explicit outcome chosen in this invocation. */ value => {
        this.afterSaving = value; this.completionControl?.onChange(value); this.renderCompletion();
      },
    }));
  }

  /** A shared kind panel retains independent committed templates and locks the exact accepted partial operation. */
  private renderTemplate(): void {
    const generation = this.generation;
    this.templateRoot?.render(createElement(CreationTypeTabs, {
      value: this.selectedKind, types: this.excalidrawAvailable ? ["markdown", "excalidraw"] : ["markdown"], translate: this.translate,
      disabled: this.creating || this.partialFile !== null,
      onChange: /** Explicit physical tab selection restores its draft and remembers the tab even on cancellation. */ kind => {
        if(!this.opened||this.generation!==generation||this.creating||this.partialFile||kind === "placeholder")return;
        this.selectedKind=kind;this.templatePath=this.templatePaths[kind];this.templateKind=this.templatePath?kind:undefined;this.refreshControls();
        this.creationTabControl?.onChange(kind);
      },
      template: this.templateChoices ? {choices: this.templateChoices, value: this.templatePath ?? "", resultsOwnerId: this.suggestionOwnerId,
        onChange: /** Explicit path acceptance updates only the active physical kind. */ path => {
          if(this.creating||this.partialFile)return;
          this.templatePath=path;this.templatePaths[this.selectedKind]=path;this.templateKind=path?this.selectedKind:undefined;this.refreshControls();
        }} : undefined,
      actions: createElement("button", {type: "button", className: `kplex-icon-action${this.partialDaily ? "" : " mod-cta"}`,
        "aria-label": this.translate(this.selectedKind === "markdown" ? "addRelated.createMarkdown" : "addRelated.createExcalidraw"),
        disabled: this.creating || this.partialKind !== null && (this.partialDaily || this.partialKind !== this.selectedKind),
        onClick: /** Native Scope and pointer activation share exact-file recovery and creation fences. */ () => {void this.create(this.selectedKind);}},
      createElement(ObsidianIcon, {name: this.selectedKind === "markdown" ? "text-initial" : "palette", size: 20})),
    }));
  }

  /** Render the placeholder materialization form with localized captions and feedback; the native Modal owns its open/close shell. */
  onOpen(): void {
    this.generation++;
    this.opened = true;
    this.titleEl.setText(this.translate("ghost.createTitle", { name: this.noteName }));
    this.contentEl.createEl("p", {
      text: this.translate(this.excalidrawAvailable ? "ghost.createHelpWithExcalidraw" : "ghost.createHelp"),
      cls: "setting-item-description",
    });

    const folderSetting = new Setting(this.contentEl).setName(this.translate("folderPicker.label"))
      .setClass("kplex-materialize-folder-row");
    formField(folderSetting);
    const folderHost = folderSetting.controlEl.createDiv({ cls: "kplex-materialize-folder-input" });
    this.folderRoot = createRoot(folderHost);
    this.folderPaths = this.app.vault.getAllFolders(true).map(/** Include root without exposing note contents. */ folder => folder.path === "/" ? "/" : folder.path);
    this.refreshControls();

    if (this.completionControl) {
      this.completionRoot = createRoot(this.contentEl.createDiv({cls: "kplex-creation-completion-row"}));
      this.renderCompletion();
    }
    this.templateRoot = createRoot(this.contentEl.createDiv());
    this.renderTemplate();
    if (this.dailyNote) this.contentEl.createEl("p", {text: this.translate("ghost.dailyNoteHelp", {path: this.dailyNote.path}), cls: "setting-item-description"});
    if (this.dailyNote) formActions(this.contentEl).addButton(button => {
      this.buttons.push({button, kind: "markdown", daily: true});
      iconButton(button, this.translate("ghost.createDailyNote"), "calendar-days").onClick(() => {void this.create("markdown", true);});
    });

    this.nativeHandlers.push(this.scope.register(["Mod"], "Enter", (event) => {
      if (event.defaultPrevented || event.isComposing || event.repeat || event.getModifierState?.("AltGraph")
        || this.contentEl.querySelector('input[aria-expanded="true"]')) return undefined;
      event.preventDefault();
      void this.create(this.partialKind ?? this.selectedKind, this.partialKind !== null && this.partialDaily);
      return true;
    }));
    this.refreshControls();
  }

  /** Release the exact React suggestion owner and native key registrations on every close. */
  onClose(): void {
    this.opened = false;
    this.generation++;
    this.templateRoot?.unmount(); this.templateRoot = null;
    this.completionRoot?.unmount(); this.completionRoot = null;
    this.folderRoot?.unmount(); this.folderRoot = null;
    for (const handler of this.nativeHandlers) this.scope.unregister(handler);
    this.nativeHandlers.length = 0; this.buttons.length = 0;
    this.contentEl.empty();
  }
}
