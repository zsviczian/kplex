/**
 * Native Obsidian dialog for creating a real note in a physical folder. The plugin owns vault
 * changes; this shell owns controls, validation, the shared completion selector's root and cleanup.
 */
import {FormSetting as Setting, KplexModal as Modal, formActions, labelIconButton} from "../adapters/obsidian/KplexModal";

import { DrawingTemplateSelect } from "./features/DrawingTemplateSelect";
import { graphFolder } from "../adapters/obsidian/graphFolder";
import { SavedRelationshipPendingError } from "../adapters/obsidian/relationshipMetadataWrite";
import {Notice, type ButtonComponent, type TFolder, type WorkspaceLeaf} from "obsidian";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import type KplexPlugin from "../main";
import type { GraphPage } from "../types";
import type { GhostMaterializationKind } from "./MaterializeGhostModal";
import type { CompletionIntent } from "../core/plex/actions";
import type { RelatedNoteInvocation } from "./NewRelatedNoteModal";
import {resolveCreationAfterSaving, type CreationAfterSavingAction} from "../core/plex/createdNoteDestination";
import { CreationCompletionSelect } from "./features/CreationCompletionSelect";

import {Tabs} from "./components/Tabs";

let folderTabSequence = 0;

export class CreateFolderNoteModal extends Modal {
  private noteName = "";
  private tabRoot: Root | null = null;
  private tabPanels: {note: HTMLElement; folder: HTMLElement} | null = null;
  private folderTab: "note" | "folder" = "note";
  private readonly tabPrefix = `kplex-folder-create-${++folderTabSequence}`;
  private folderName = "";
  private folderButton: ButtonComponent | null = null;
  private releaseMigration: (() => void) | null = null;
  private templateRoot: Root | null = null;
  private templatePath: string | undefined;
  private renderTemplate: (() => void) | null = null;
  private creating = false;
  private opened = false;
  private completing = false;
  private invalidated = false;
  private closingForCompletion = false;
  private ignoreInvokerFocus = false;
  private releaseInteraction: (() => void) | null = null;
  private releaseFolderRename: (() => void) | null = null;
  private creationNavigation: string | undefined;
  private completionPath: string | null = null;
  private pending = false;
  private continuation: CreationAfterSavingAction;
  private nameInput: HTMLInputElement | null = null;
  private folderDescription: HTMLParagraphElement | null = null;
  private completionRoot: Root | null = null;
  private readonly nativeFolder: TFolder | null;
  private readonly hostContainer: HTMLElement | null;
  private readonly invokingDocument: Document;
  private readonly invokingElement: HTMLElement | null;
  private readonly createButtons: ButtonComponent[] = [];

  /** Capture folder incarnation and invoking surface before the native form takes focus. */
  constructor(
    private readonly plugin: KplexPlugin,
    private readonly folder: GraphPage,
    private readonly hostLeaf?: WorkspaceLeaf,
    private readonly invocation: RelatedNoteInvocation = {},
    private readonly allowSubfolders = false,
  ) {
    super(plugin.app);
    this.nativeFolder = graphFolder(plugin.app, folder);
    this.hostContainer = hostLeaf?.view.containerEl ?? null;
    this.invokingDocument = this.hostContainer?.ownerDocument ?? this.modalEl.ownerDocument;
    const active = this.invokingDocument.activeElement;
    this.invokingElement = active && "focus" in active ? active as HTMLElement : null;
    this.continuation = resolveCreationAfterSaving(invocation.continuation ?? "configured", plugin.createdNoteCompletionControl(hostLeaf).value);
  }

  /** Native writes may settle after dismissal; only a connected current invocation receives UI effects. */
  private canComplete(): boolean {
    if (this.creating && this.plugin.settings.lastActivePath !== this.creationNavigation && !(this.completing && this.plugin.settings.lastActivePath === this.completionPath)) this.invalidated = true;
    return !this.invalidated && (this.opened || this.completing) && this.invocation.current?.() !== false
      && (!this.hostContainer || this.hostContainer.isConnected && this.hostContainer.ownerDocument === this.invokingDocument);
  }

  /** Restore only the original connected control or its explicitly provided graph surface. */
  private restoreInvoker(): void {
    if (!this.canComplete()) return;
    if (this.invokingElement?.isConnected && this.invokingElement.ownerDocument === this.invokingDocument) this.invokingElement.focus();
    else this.invocation.focusGraph?.();
  }

  /** Produce a localized folder display label while retaining its underlying vault path. */
  private folderLabel(): string {
    if (this.folder.path === "folder:/") return this.plugin.translator("common.vaultRoot");
    if (this.nativeFolder) return this.nativeFolder.path;
    return this.folder.path.startsWith("folder:") ? this.folder.path.slice("folder:".length) : this.folder.name;
  }

  /** Reuse exact-destination validation; matching basenames elsewhere never block this folder. */
  private validateName(): ReturnType<KplexPlugin["validateRelatedNoteName"]> {
    const folderPath = this.nativeFolder?.path ?? "";
    return this.plugin.validateRelatedNoteName(this.noteName, folderPath === "/" ? "" : folderPath);
  }

  /** Save/Clear controls remain unavailable during writes and saved publication-pending states. */
  private refreshButtons(): void {
    const validation = this.validateName();
    const enabled = this.canComplete() && this.opened && !this.creating && !this.pending && validation.valid && !validation.existing;
    for (const button of this.createButtons) button.setDisabled(!enabled);
    this.renderCompletionControls();
    this.renderTemplate?.();
    this.folderButton?.setDisabled(this.creating || this.pending || !this.canComplete() || !this.folderName.trim());
    this.renderTabs();
  }

  /** One after-saving choice owns navigation/opening; rendering never saves a fallback. */
  private renderCompletionControls(): void {
    if (!this.opened || !this.completionRoot) return;
    const completion = this.plugin.createdNoteCompletionControl(this.hostLeaf);
    this.completionRoot.render(createElement(CreationCompletionSelect, {...completion,
      translate: this.plugin.translator, value: this.continuation, disabled: this.creating || this.pending,
      onChange: /** Remember an actual user selection across every creation dialog. */ value => {
        this.continuation = value; completion.onChange(value); this.renderCompletionControls();
      },
    }));
  }

  /** Submit the validated creation request to the plugin and show localized failure feedback; the modal retains its existing busy/close lifecycle. */
  private async create(kind: GhostMaterializationKind, intent: CompletionIntent | CreationAfterSavingAction = this.continuation): Promise<void> {
    if (!this.canComplete() || this.creating || this.pending) return;
    const folder = this.nativeFolder;
    if (!folder || (folder === this.plugin.app.vault.getRoot() ? this.plugin.app.vault.getRoot() : this.plugin.app.vault.getFolderByPath(folder.path)) !== folder) {
      new Notice(this.plugin.translator("addRelated.endpointChanged")); return;
    }
    const validation = this.validateName();
    if (!validation.valid) {
      new Notice(validation.error ?? this.plugin.translator("note.validation.enterValid"), 2800);
      return;
    }
    if (validation.existing) {
      new Notice(this.plugin.translator("note.existsNamed", { name: validation.stem }), 2800);
      return;
    }

    this.creating = true;
    this.creationNavigation = this.plugin.settings.lastActivePath;
    this.refreshButtons();
    try {
      const folderPath = folder.path === "/" || folder.path === "" ? "folder:/" : `folder:${folder.path}`;
      const page = await this.plugin.createNewNodeInFolder({ ...this.folder, path: folderPath }, this.noteName, kind, folder, this.templatePath);
      if (!page) return;
      await this.plugin.rememberNewNodeDefaultType(kind);
      if (!this.canComplete()) return;
      const action = resolveCreationAfterSaving(intent, this.continuation);
      if (action === "another") {
        this.noteName = "";
        if (this.nameInput) { this.nameInput.value = ""; this.nameInput.focus(); }
        return;
      }
      this.completing = true; this.completionPath = page.path;
      this.closingForCompletion = true; this.ignoreInvokerFocus = true;
      try { this.close(); } finally { this.closingForCompletion = false; }
      if (action === "return") this.restoreInvoker();
      if (action !== "return") await this.plugin.finishNewRelatedNode(page, this.hostLeaf, action, /** Preserve the original native surface across delayed opening. */ () => this.canComplete());
      if (action === "follow" && this.canComplete()) this.invocation.focusGraph?.();
    } catch (error) {
      if (error instanceof SavedRelationshipPendingError) {
        this.pending = true;
        if (this.canComplete()) this.contentEl.createDiv({ text: this.plugin.translator("addRelated.savedPending"), attr: { role: "status" } });
      }
      if (this.canComplete() && (!(error instanceof SavedRelationshipPendingError) || !error.noticeReported)) new Notice(error instanceof SavedRelationshipPendingError ? error.message : this.plugin.translator("note.createFailed", { error: error instanceof Error ? error.message : String(error) }), 5000);
    } finally {
      this.completing = false;
      this.completionPath = null;
      this.creating = false;
      if (!this.opened) { this.releaseInteraction?.(); this.releaseInteraction = null; }
      if (this.opened) this.refreshButtons();
    }
  }

  /** Shared navigation retains each mounted panel and saves only an explicit tab selection. */
  private renderTabs(): void {
    if (!this.tabPanels) return;
    this.tabPanels.note.hidden = this.folderTab !== "note";
    this.tabPanels.folder.hidden = this.folderTab !== "folder";
    this.tabRoot?.render(createElement(Tabs, {prefix: this.tabPrefix, label: this.plugin.translator("folderActions.tabs"),
      items: [{id: "note", label: this.plugin.translator("folderActions.noteTab")}, {id: "folder", label: this.plugin.translator("folderActions.folderTab")}],
      value: this.folderTab, disabled: this.creating || this.pending,
      onChange: /** An unavailable or retired tab cannot change the remembered preference. */ value => {
        if (!this.canComplete() || this.creating || this.pending || value !== "note" && value !== "folder") return;
        this.folderTab = value; this.plugin.settings.folderCreationTab = value;
        void this.plugin.saveSettings(false, false); this.renderTabs();
      }}));
  }

  /** Create one literal native child; this structural path never writes relationship properties. */
  private async createSubfolder(): Promise<void> {
    if (!this.canComplete() || this.creating || this.pending || !this.nativeFolder) return;
    const name = this.folderName.trim(), folder = this.nativeFolder;
    if (!name || name === "." || name === ".." || /[. ]$/.test(name) || [...name].some(/** No traversal or invalid native filename bytes. */ c => (c.codePointAt(0) ?? 0) < 32 || '/\\<>:"|?*'.includes(c))) {new Notice(this.plugin.translator("folderPicker.invalid")); return;}
    const path = folder.path === "/" || !folder.path ? name : folder.path + "/" + name;
    if (this.plugin.app.vault.getFolderByPath(folder.path) !== folder && folder !== this.plugin.app.vault.getRoot()) {new Notice(this.plugin.translator("addRelated.endpointChanged")); return;}
    if (this.plugin.app.vault.getAbstractFileByPath(path)) {new Notice(this.plugin.translator("moveNode.conflict")); return;}
    this.creationNavigation = this.plugin.settings.lastActivePath; this.creating = true; this.refreshButtons();
    try {await this.plugin.app.vault.createFolder(path); if (this.canComplete()) this.close();}
    catch (error) {if (this.canComplete()) new Notice(error instanceof Error ? error.message : this.plugin.translator("folderActions.failed"));}
    finally {this.creating = false; if (this.opened) this.refreshButtons();}
  }

  /** Render the physical-folder note creation form with localized captions and feedback; the native Modal owns its open/close shell. */
  onOpen(): void {
    this.opened = true;
    this.releaseMigration = this.hostContainer?.onWindowMigrated?.(/** The captured native shell retires on canvas migration. */ () => this.close()) ?? null;
    /** User interaction outside the captured native shell retires late UI effects, while a native write remains durable. */
    const outsideInteraction = (event: Event): void => {
      const target = event.target;
      if (event.type === "focusin" && (this.closingForCompletion || this.completing && this.ignoreInvokerFocus && target === this.invokingElement)) {
        this.ignoreInvokerFocus = false; return;
      }
      if (event.type === "pointerdown") this.ignoreInvokerFocus = false;
      if (target && target !== this.invokingDocument.body && "nodeType" in target && !this.modalEl.contains(target as Node)) this.invalidated = true;
    };
    this.invokingDocument.addEventListener("pointerdown", outsideInteraction, true);
    this.invokingDocument.addEventListener("focusin", outsideInteraction, true);
    this.releaseInteraction = /** Exact-document listeners live through intentional completion close, then retire in finally. */ () => {
      this.invokingDocument.removeEventListener("pointerdown", outsideInteraction, true);
      this.invokingDocument.removeEventListener("focusin", outsideInteraction, true);
    };
    const excalidrawAvailable = this.plugin.isExcalidrawAvailable();
    const defaultKind: GhostMaterializationKind = this.plugin.settings.newNodeDefaultType === "excalidraw" && excalidrawAvailable
      ? "excalidraw"
      : "markdown";

    this.titleEl.setText(this.allowSubfolders ? this.plugin.translator("folderActions.createTitle", {folder: this.folderLabel()}) : this.plugin.translator("folderNote.title"));
    this.modalEl.addClass("kplex-create-folder-note-modal");
    this.folderDescription = this.contentEl.createEl("p", {
      text: this.plugin.translator("folderNote.help", { folder: this.folderLabel() }),
      cls: "setting-item-description",
    });
    let form = this.contentEl;
    if (this.allowSubfolders) {
      this.folderTab = this.plugin.settings.folderCreationTab;
      this.tabRoot = createRoot(this.contentEl.createDiv());
      const note = this.contentEl.createDiv({attr: {id: this.tabPrefix + "-panel-note", role: "tabpanel", "aria-labelledby": this.tabPrefix + "-tab-note"}});
      const folder = this.contentEl.createDiv({attr: {id: this.tabPrefix + "-panel-folder", role: "tabpanel", "aria-labelledby": this.tabPrefix + "-tab-folder"}});
      this.tabPanels = {note, folder}; form = note;
      new Setting(folder).setName(this.plugin.translator("folderActions.name")).addText(/** Subfolder and note drafts remain independent across tab changes. */ text => {
        text.inputEl.setAttribute("aria-label", this.plugin.translator("folderActions.name"));
        text.onChange(/** Draft edits never invalidate source/index state. */ value => {this.folderName = value; this.refreshButtons();});
      });
      formActions(folder).addButton(/** One native create follows final path and identity checks. */ button => {this.folderButton = button;
        labelIconButton(button.buttonEl, this.plugin.translator("folderActions.create"), "folder-plus"); button.setCta().onClick(/** Submit the captured folder only. */ () => {void this.createSubfolder();});})
        .addButton(/** Tab cancellation never creates a note or folder. */ button => {labelIconButton(button.buttonEl, this.plugin.translator("common.cancel"), "x"); button.onClick(/** Release the whole creation shell. */ () => this.close());});
    }
    const renameRef = this.plugin.app.vault.on("rename", /** Follow the exact captured physical folder; a replacement at its former path is a different origin. */ file => {
      if (file === this.nativeFolder && this.opened && this.folderDescription?.isConnected) {
        this.folderDescription.setText(this.plugin.translator("folderNote.help", { folder: this.folderLabel() }));
        this.refreshButtons();
      }
    });
    this.releaseFolderRename = /** Retire the native source subscription with the visible form, including intentional completion closes. */ () => this.plugin.app.vault.offref(renameRef);

    const nameSetting = new Setting(form)
      .setName(this.plugin.translator("folderNote.noteName"))
      .addText((text) => {
        this.nameInput = text.inputEl;
        text
          .setPlaceholder(this.plugin.translator("folderNote.placeholder"))
          .onChange((value) => {
            this.noteName = value;
            this.refreshButtons();
          });
        text.inputEl.focus();
      });
    nameSetting.settingEl.addClass("kplex-create-folder-note-name-setting");

    const completion = form.createDiv({cls: "kplex-creation-completion-row"});
    this.completionRoot = createRoot(completion);

    const choices = this.plugin.drawingTemplateOptions();
    if (choices) {
      this.templatePath = choices.selected;
      this.templateRoot = createRoot(form.createDiv());
      this.renderTemplate = (): void => this.templateRoot?.render(createElement(DrawingTemplateSelect, {
        choices, value: this.templatePath ?? "", translate: this.plugin.translator,
        disabled: this.creating || this.pending,
        onChange: path => { this.templatePath = path; this.renderTemplate?.(); },
      }));
      this.renderTemplate();
    }
    form.appendChild(completion);
    const actions = formActions(form);
    actions.addButton((button) => {
      this.createButtons.push(button);
      button
        .setButtonText(this.plugin.translator("common.markdown"))
        .onClick(() => { void this.create("markdown"); });
      labelIconButton(button.buttonEl, this.plugin.translator("common.markdown"), "text-initial");
      if (defaultKind === "markdown") button.setCta();
    });

    if (excalidrawAvailable) {
      actions.addButton((button) => {
        this.createButtons.push(button);
        button
          .setButtonText(this.plugin.translator("common.excalidraw"))
          .onClick(() => { void this.create("excalidraw"); });
        labelIconButton(button.buttonEl, this.plugin.translator("common.excalidraw"), "palette");
        if (defaultKind === "excalidraw") button.setCta();
      });
    }

    actions.addButton(/** Cancel is one shared accessible icon action. */ button => {labelIconButton(button.buttonEl, this.plugin.translator("common.cancel"), "x"); button.onClick(() => this.close());});

    this.refreshButtons();
    /** Submit protocol excludes composition, AltGraph and held keys before scheduling any file creation. */
    const submit = (event: KeyboardEvent, intent?: CompletionIntent): false | undefined => {
      if (event.isComposing || event.key === "Dead" || event.getModifierState?.("AltGraph")) return;
      if (this.allowSubfolders && this.folderTab === "folder") {event.preventDefault(); if (!event.repeat) void this.createSubfolder(); return false;}
      const validation = this.validateName();
      if (!validation.valid || validation.existing || this.creating || this.pending) return false;
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) void this.create(defaultKind, intent);
      return false;
    };
    this.scope.register(["Mod"], "Enter", event => submit(event));
    this.scope.register(["Alt"], "Enter", event => submit(event, "return"));
    this.scope.register(["Mod", "Shift"], "Enter", event => submit(event, "another"));
  }

  /** Retire controls and release the owning session; an already started native write remains durable. */
  onClose(): void {
    if (!this.opened) return;
    this.releaseMigration?.(); this.releaseMigration = null;
    this.releaseFolderRename?.(); this.releaseFolderRename = null;
    if (!this.completing) { this.releaseInteraction?.(); this.releaseInteraction = null; }
    if (!this.completing) this.restoreInvoker();
    this.opened = false;
    if (!this.completing) this.invalidated = true;
    this.templateRoot?.unmount(); this.templateRoot = null; this.renderTemplate = null;
    this.completionRoot?.unmount(); this.completionRoot = null;
    this.tabRoot?.unmount(); this.tabRoot = null; this.tabPanels = null; this.folderButton = null;
    this.contentEl.empty();
    this.nameInput = null; this.folderDescription = null; this.createButtons.length = 0;
    this.invocation.onClosed?.();
  }
}
