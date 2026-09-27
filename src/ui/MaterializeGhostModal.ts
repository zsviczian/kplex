/**
 * Native Obsidian dialog for materializing a placeholder as a real Markdown note. The plugin owns vault changes; this shell owns localized controls, validation feedback and close cleanup.
 */
import { Modal, Notice, Setting, type App } from "obsidian";
import { createObsidianTranslator } from "../adapters/obsidian/localization";

export type GhostMaterializationKind = "markdown" | "excalidraw";

export type GhostMaterializationLocation = {
  folderPath: string;
  label: string;
};

export class MaterializeGhostModal extends Modal {
  private readonly translate = createObsidianTranslator();
  private selectedFolderPath: string;
  private creating = false;

  constructor(
    app: App,
    private readonly noteName: string,
    private readonly locations: readonly GhostMaterializationLocation[],
    private readonly excalidrawAvailable: boolean,
    private readonly defaultKind: GhostMaterializationKind,
    private readonly onCreate: (kind: GhostMaterializationKind, folderPath: string) => Promise<boolean>,
  ) {
    super(app);
    this.selectedFolderPath = locations[0]?.folderPath ?? "";
  }

  /** Submit the validated creation request to the plugin and show localized failure feedback; the modal retains its existing busy/close lifecycle. */
  private async create(kind: GhostMaterializationKind): Promise<void> {
    if (this.creating) return;
    this.creating = true;
    try {
      if (await this.onCreate(kind, this.selectedFolderPath)) this.close();
    } catch (error) {
      new Notice(this.translate("note.createFailed", { error: error instanceof Error ? error.message : String(error) }), 5000);
    } finally {
      this.creating = false;
    }
  }

  /** Render the placeholder materialization form with localized captions and feedback; the native Modal owns its open/close shell. */
  onOpen(): void {
    const effectiveDefault = this.defaultKind === "excalidraw" && this.excalidrawAvailable ? "excalidraw" : "markdown";
    this.titleEl.setText(this.translate("ghost.createTitle", { name: this.noteName }));
    this.contentEl.createEl("p", {
      text: this.translate(this.excalidrawAvailable ? "ghost.createHelpWithExcalidraw" : "ghost.createHelp"),
      cls: "setting-item-description",
    });

    if (this.locations.length > 1) {
      new Setting(this.contentEl)
        .setName(this.translate("common.location"))
        .setDesc(this.translate("ghost.locationConflictHelp"))
        .addDropdown((dropdown) => {
          for (const location of this.locations) {
            const value = location.folderPath || "/";
            dropdown.addOption(value, location.label);
          }
          dropdown.setValue(this.selectedFolderPath || "/");
          dropdown.onChange((value) => { this.selectedFolderPath = value === "/" ? "" : value; });
        });
    } else {
      new Setting(this.contentEl)
        .setName(this.translate("common.location"))
        .setDesc(this.locations[0]?.label ?? this.translate("common.vaultRoot"));
    }

    const actionSetting = new Setting(this.contentEl);
    actionSetting.addButton((button) => {
      button
        .setButtonText(this.translate("common.markdown"))
        .setIcon("file-text")
        .onClick(() => { void this.create("markdown"); });
      if (effectiveDefault === "markdown") button.setCta();
    });

    if (this.excalidrawAvailable) {
      actionSetting.addButton((button) => {
        button
          .setButtonText(this.translate("common.excalidraw"))
          .setIcon("palette")
          .onClick(() => { void this.create("excalidraw"); });
        if (effectiveDefault === "excalidraw") button.setCta();
      });
    }

    actionSetting.addButton((button) => button
      .setButtonText(this.translate("common.cancel"))
      .onClick(() => this.close()));

    this.scope.register(["Mod"], "Enter", (event) => {
      event.preventDefault();
      void this.create(effectiveDefault);
      return true;
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
