/**
 * Native Obsidian dialog for adding an existing vault field to an ontology role. The plugin owns vault changes; this shell owns localized controls, validation feedback and close cleanup.
 */
import { Modal, Setting } from "obsidian";
import type KplexPlugin from "../main";

export type OntologyAssignmentRole = "parent" | "child" | "left" | "right" | "previous" | "next" | "hidden" | "excluded";


export class AddToOntologyModal extends Modal {
  constructor(
    private plugin: KplexPlugin,
    private fieldName: string,
    private onSaved?: () => void,
  ) { super(plugin.app); }

  /** Render the ontology role chooser for the selected vault field with localized captions and feedback; the native Modal owns its open/close shell. */
  onOpen(): void {
    const translate = this.plugin.translator;
    this.titleEl.setText(translate("ontology.addTitle", { field: this.fieldName }));
    this.contentEl.createEl("p", {
      text: translate("ontology.chooseRoleHelp"),
      cls: "setting-item-description",
    });
    let selected: OntologyAssignmentRole = this.plugin.ontologyRoleForField(this.fieldName) ?? "child";
    new Setting(this.contentEl)
      .setName(translate("ontology.relationshipRole"))
      .addDropdown((dropdown) => {
        const roleLabels: Record<OntologyAssignmentRole, string> = {
          parent: translate("role.parent"), child: translate("role.child"), left: translate("role.friendLeft"),
          right: translate("role.challengerRight"), previous: translate("role.previous"), next: translate("role.next"),
          hidden: translate("role.hidden"), excluded: translate("role.excludedMetadata"),
        };
        for (const [value, label] of Object.entries(roleLabels)) dropdown.addOption(value, label);
        dropdown.setValue(selected).onChange((value) => { selected = value as OntologyAssignmentRole; });
      });
    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText(translate("common.save")).setCta().onClick(() => {
        void this.plugin.assignFieldToOntology(this.fieldName, selected).then(() => {
          this.onSaved?.();
          this.close();
        });
      }))
      .addButton((button) => button.setButtonText(translate("common.cancel")).onClick(() => this.close()));
  }

  onClose(): void { this.contentEl.empty(); }
}
