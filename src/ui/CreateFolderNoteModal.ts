/**
 * Native Obsidian dialog for creating a real note in a physical folder. The plugin owns vault changes; this shell owns localized controls, validation feedback and close cleanup.
 */
import { SavedRelationshipPendingError } from "../adapters/obsidian/relationshipMetadataWrite";
import { Modal, Notice, Setting, type ButtonComponent, type TFolder, type WorkspaceLeaf } from "obsidian";
import type KplexPlugin from "../main";
import type { GraphPage } from "../types";
import type { GhostMaterializationKind } from "./MaterializeGhostModal";
import type { CompletionIntent } from "../core/plex/actions";
import type { RelatedNoteInvocation } from "./NewRelatedNoteModal";

export class CreateFolderNoteModal extends Modal {
  private noteName = "";
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
  private continuation: CompletionIntent;
  private nameInput: HTMLInputElement | null = null;
  private folderDescription: HTMLParagraphElement | null = null;
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
  ) {
    super(plugin.app);
    const path = folder.path === "folder:/" ? "" : folder.path.slice("folder:".length);
    this.nativeFolder = path ? plugin.app.vault.getFolderByPath(path) : plugin.app.vault.getRoot();
    this.hostContainer = hostLeaf?.view.containerEl ?? null;
    this.invokingDocument = this.hostContainer?.ownerDocument ?? this.modalEl.ownerDocument;
    const active = this.invokingDocument.activeElement;
    this.invokingElement = active && "focus" in active ? active as HTMLElement : null;
    this.continuation = invocation.continuation ?? "configured";
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

  /** Save/Clear controls remain unavailable during writes and saved publication-pending states. */
  private refreshButtons(): void {
    const validation = this.plugin.validateRelatedNoteName(this.noteName);
    const enabled = this.canComplete() && this.opened && !this.creating && !this.pending && validation.valid && !validation.existing;
    for (const button of this.createButtons) button.setDisabled(!enabled);
  }

  /** Submit the validated creation request to the plugin and show localized failure feedback; the modal retains its existing busy/close lifecycle. */
  private async create(kind: GhostMaterializationKind, intent: CompletionIntent = this.continuation): Promise<void> {
    if (!this.canComplete() || this.creating || this.pending) return;
    const folder = this.nativeFolder;
    if (!folder || (folder === this.plugin.app.vault.getRoot() ? this.plugin.app.vault.getRoot() : this.plugin.app.vault.getFolderByPath(folder.path)) !== folder) {
      new Notice(this.plugin.translator("addRelated.endpointChanged")); return;
    }
    const validation = this.plugin.validateRelatedNoteName(this.noteName);
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
      const page = await this.plugin.createNewNodeInFolder({ ...this.folder, path: folderPath }, this.noteName, kind, folder);
      if (!page) return;
      await this.plugin.rememberNewNodeDefaultType(kind);
      if (!this.canComplete()) return;
      if (intent === "another") {
        this.noteName = "";
        if (this.nameInput) { this.nameInput.value = ""; this.nameInput.focus(); }
        return;
      }
      const edit = intent === "edit" || intent === "configured" && this.plugin.settings.editNewNodeAfterCreate;
      this.completing = true; this.completionPath = page.path;
      this.closingForCompletion = true; this.ignoreInvokerFocus = true;
      try { this.close(); } finally { this.closingForCompletion = false; }
      if (intent === "return" || intent === "configured" && !edit) this.restoreInvoker();
      if (intent === "follow" || edit) {
        await this.plugin.finishNewRelatedNode(page, this.hostLeaf, edit, /** Delayed editor routing retains the original surface fence. */ () => this.canComplete());
        if (!edit && this.canComplete()) this.invocation.focusGraph?.();
      }
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

  /** Render the physical-folder note creation form with localized captions and feedback; the native Modal owns its open/close shell. */
  onOpen(): void {
    this.opened = true;
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

    this.titleEl.setText(this.plugin.translator("folderNote.title"));
    this.modalEl.addClass("kplex-create-folder-note-modal");
    this.folderDescription = this.contentEl.createEl("p", {
      text: this.plugin.translator("folderNote.help", { folder: this.folderLabel() }),
      cls: "setting-item-description",
    });
    const renameRef = this.plugin.app.vault.on("rename", /** Follow the exact captured physical folder; a replacement at its former path is a different origin. */ file => {
      if (file === this.nativeFolder && this.opened && this.folderDescription?.isConnected) this.folderDescription.setText(this.plugin.translator("folderNote.help", { folder: this.folderLabel() }));
    });
    this.releaseFolderRename = /** Retire the native source subscription with the visible form, including intentional completion closes. */ () => this.plugin.app.vault.offref(renameRef);

    const nameSetting = new Setting(this.contentEl)
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

    new Setting(this.contentEl)
      .setName(this.plugin.translator("folderNote.openForEditing"))
      .setDesc(this.plugin.translator("folderNote.openForEditingHelp"))
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.editNewNodeAfterCreate)
        .onChange((enabled) => {
          this.plugin.settings.editNewNodeAfterCreate = enabled;
          void this.plugin.saveSettings(false, false);
        }));

    new Setting(this.contentEl).setName(this.plugin.translator("addRelated.completionMode")).addDropdown(/** Explicit continuation remains local to this folder invocation. */ dropdown => {
      for (const intent of ["configured", "return", "another", "follow", "edit"] as const) dropdown.addOption(intent, this.plugin.translator(`addRelated.completion.${intent}`));
      dropdown.setValue(this.continuation).onChange(/** Accept only the finite continuation protocol. */ value => {
        if (value === "configured" || value === "return" || value === "another" || value === "follow" || value === "edit") this.continuation = value;
      });
    });

    const actions = new Setting(this.contentEl);
    actions.addButton((button) => {
      this.createButtons.push(button);
      button
        .setButtonText(this.plugin.translator("common.markdown"))
        .setIcon("file-text")
        .onClick(() => { void this.create("markdown"); });
      if (defaultKind === "markdown") button.setCta();
    });

    if (excalidrawAvailable) {
      actions.addButton((button) => {
        this.createButtons.push(button);
        button
          .setButtonText(this.plugin.translator("common.excalidraw"))
          .setIcon("palette")
          .onClick(() => { void this.create("excalidraw"); });
        if (defaultKind === "excalidraw") button.setCta();
      });
    }

    actions.addButton((button) => button
      .setButtonText(this.plugin.translator("common.cancel"))
      .onClick(() => this.close()));

    this.refreshButtons();
    /** Submit protocol excludes composition, AltGraph and held keys before scheduling any file creation. */
    const submit = (event: KeyboardEvent, intent?: CompletionIntent): false | undefined => {
      if (event.isComposing || event.key === "Dead" || event.getModifierState?.("AltGraph")) return;
      const validation = this.plugin.validateRelatedNoteName(this.noteName);
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
    this.releaseFolderRename?.(); this.releaseFolderRename = null;
    if (!this.completing) { this.releaseInteraction?.(); this.releaseInteraction = null; }
    if (!this.completing) this.restoreInvoker();
    this.opened = false;
    if (!this.completing) this.invalidated = true;
    this.contentEl.empty();
    this.nameInput = null; this.folderDescription = null; this.createButtons.length = 0;
    this.invocation.onClosed?.();
  }
}
