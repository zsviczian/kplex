/**
 * Native Obsidian dialog for creating a real note in a physical folder. The plugin owns vault changes; this shell owns localized controls, validation feedback and close cleanup.
 */
import { SavedRelationshipPendingError } from "../adapters/obsidian/relationshipMetadataWrite";
import { Modal, Notice, Setting, type ButtonComponent, type WorkspaceLeaf } from "obsidian";
import type KplexPlugin from "../main";
import type { GraphPage } from "../types";
import type { GhostMaterializationKind } from "./MaterializeGhostModal";

export class CreateFolderNoteModal extends Modal {
  private noteName = "";
  private creating = false;
  private readonly createButtons: ButtonComponent[] = [];

  constructor(
    private readonly plugin: KplexPlugin,
    private readonly folder: GraphPage,
    private readonly hostLeaf?: WorkspaceLeaf,
  ) {
    super(plugin.app);
  }

  /** Produce a localized folder display label while retaining its underlying vault path. */
  private folderLabel(): string {
    if (this.folder.path === "folder:/") return this.plugin.translator("common.vaultRoot");
    return this.folder.path.startsWith("folder:") ? this.folder.path.slice("folder:".length) : this.folder.name;
  }

  private refreshButtons(): void {
    const validation = this.plugin.validateRelatedNoteName(this.noteName);
    const enabled = !this.creating && validation.valid && !validation.existing;
    for (const button of this.createButtons) button.setDisabled(!enabled);
  }

  /** Submit the validated creation request to the plugin and show localized failure feedback; the modal retains its existing busy/close lifecycle. */
  private async create(kind: GhostMaterializationKind): Promise<void> {
    if (this.creating) return;
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
    this.refreshButtons();
    try {
      const page = await this.plugin.createNewNodeInFolder(this.folder, this.noteName, kind);
      if (!page) return;
      await this.plugin.rememberNewNodeDefaultType(kind);
      this.close();
      if (this.plugin.settings.editNewNodeAfterCreate) {
        await this.plugin.finishNewRelatedNode(page, this.hostLeaf, true);
      }
    } catch (error) {
      new Notice(error instanceof SavedRelationshipPendingError ? error.message : this.plugin.translator("note.createFailed", { error: error instanceof Error ? error.message : String(error) }), 5000);
    } finally {
      this.creating = false;
      this.refreshButtons();
    }
  }

  /** Render the physical-folder note creation form with localized captions and feedback; the native Modal owns its open/close shell. */
  onOpen(): void {
    const excalidrawAvailable = this.plugin.isExcalidrawAvailable();
    const defaultKind: GhostMaterializationKind = this.plugin.settings.newNodeDefaultType === "excalidraw" && excalidrawAvailable
      ? "excalidraw"
      : "markdown";

    this.titleEl.setText(this.plugin.translator("folderNote.title"));
    this.modalEl.addClass("kplex-create-folder-note-modal");
    this.contentEl.createEl("p", {
      text: this.plugin.translator("folderNote.help", { folder: this.folderLabel() }),
      cls: "setting-item-description",
    });

    const nameSetting = new Setting(this.contentEl)
      .setName(this.plugin.translator("folderNote.noteName"))
      .addText((text) => {
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
    this.scope.register(["Mod"], "Enter", (event) => {
      const validation = this.plugin.validateRelatedNoteName(this.noteName);
      if (!validation.valid || validation.existing || this.creating) return false;
      event.preventDefault();
      void this.create(defaultKind);
      return true;
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
