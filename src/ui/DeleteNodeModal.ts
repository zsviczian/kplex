/**
 * Native Obsidian dialog for confirming node deletion and inspecting remaining source references. The plugin owns vault changes; this shell owns localized controls, validation feedback and close cleanup.
 */
import { Modal, Setting, type App } from "obsidian";
import type { EvidenceSourceKind } from "../index/RelationEvidence";
import { createObsidianTranslator } from "../adapters/obsidian/localization";

export type DeleteNodeConfirmationOptions = {
  nodeName: string;
  hasFile: boolean;
  firstUse: boolean;
  confirmFileDelete: boolean;
  onConfirm: (confirmFileDelete: boolean) => void | Promise<void>;
  onCancel?: () => void;
};

export class DeleteNodeConfirmationModal extends Modal {
  private confirmed = false;
  private readonly translate = createObsidianTranslator();
  constructor(app: App, private readonly options: DeleteNodeConfirmationOptions) {
    super(app);
  }

  /** Render the node deletion confirmation with localized captions and feedback; the native Modal owns its open/close shell. */
  onOpen(): void {
    const { nodeName, hasFile, firstUse } = this.options;
    this.titleEl.setText(this.translate(hasFile ? "delete.noteTitle" : "delete.placeholderTitle"));
    this.contentEl.createEl("p", {
      text: this.translate(hasFile ? "delete.noteConfirm" : "delete.placeholderConfirm", { name: nodeName }),
    });

    let confirmFileDelete = this.options.confirmFileDelete;
    if (hasFile) {
      new Setting(this.contentEl)
        .setName(this.translate("delete.dontAskAgain"))
        .setDesc(this.translate("delete.dontAskAgainHelp"))
        .addToggle((toggle) => toggle
          .setValue(!confirmFileDelete)
          .onChange((dontAskAgain) => { confirmFileDelete = !dontAskAgain; }));
    } else if (firstUse) {
      new Setting(this.contentEl)
        .setName(this.translate("delete.alwaysConfirm"))
        .setDesc(this.translate("delete.alwaysConfirmHelp"))
        .addToggle((toggle) => toggle
          .setValue(confirmFileDelete)
          .onChange((value) => { confirmFileDelete = value; }));
    }

    const actions = new Setting(this.contentEl);
    actions.addButton((button) => button
      .setButtonText(this.translate("common.cancel"))
      .onClick(() => this.close()));
    actions.addButton((button) => button
      .setButtonText(this.translate(hasFile ? "delete.fileButton" : "delete.placeholderButton"))
      .setCta()
      .onClick(() => {
        this.confirmed = true;
        this.close();
        void this.options.onConfirm(confirmFileDelete);
      }));
  }

  onClose(): void {
    this.contentEl.empty();
    if (!this.confirmed) this.options.onCancel?.();
  }
}

export type RemainingNodeReference = {
  path: string;
  line: number;
  label: string;
  sourceKind: EvidenceSourceKind;
};

export class RemainingNodeReferencesModal extends Modal {
  private readonly translate = createObsidianTranslator();
  constructor(
    app: App,
    private readonly nodeName: string,
    private readonly references: readonly RemainingNodeReference[],
    private readonly onOpenLocation: (reference: RemainingNodeReference) => void | Promise<void>,
  ) {
    super(app);
  }

  /** Render the surviving body-reference report with localized captions and feedback; the native Modal owns its open/close shell. */
  onOpen(): void {
    this.titleEl.setText(this.translate("references.title"));
    this.contentEl.createEl("p", {
      text: this.translate("references.help", { name: this.nodeName }),
    });

    const grouped = new Map<string, RemainingNodeReference[]>();
    for (const reference of this.references) {
      const items = grouped.get(reference.path) ?? [];
      items.push(reference);
      grouped.set(reference.path, items);
    }

    for (const [path, items] of grouped) {
      this.contentEl.createEl("h3", { text: path });
      for (const reference of items) {
        const source = ({
          "obsidian-link": this.translate("references.markdownLink"),
          "unresolved-link": this.translate("references.unresolvedMarkdownLink"),
          "inline-ontology": this.translate("references.inlineRelationship"),
          "body-url": this.translate("references.bodyUrl"),
        } as Partial<Record<EvidenceSourceKind, string>>)[reference.sourceKind] ?? this.translate("references.reference");
        const setting = new Setting(this.contentEl)
          .setName(reference.label || source)
          .setDesc(this.translate("references.sourceLine", { source, line: reference.line + 1 }));
        setting.addButton((button) => button
          .setButtonText(this.translate("common.open"))
          .onClick(() => { void this.onOpenLocation(reference); }));
      }
    }

    const actions = new Setting(this.contentEl);
    actions.addButton((button) => button
      .setButtonText(this.translate("common.done"))
      .setCta()
      .onClick(() => this.close()));
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
