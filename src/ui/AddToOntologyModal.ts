/**
 * Native Obsidian dialog for adding an existing vault field to an ontology role. The plugin owns vault changes; this shell owns localized controls, validation feedback and close cleanup.
 */
import { Modal, Notice, Setting, type ButtonComponent } from "obsidian";
import type KplexPlugin from "../main";

export type OntologyAssignmentRole = "parent" | "child" | "left" | "right" | "previous" | "next" | "hidden" | "excluded";


export class AddToOntologyModal extends Modal {
  private opened = false;
  private busy = false;
  private generation = 0;
  private saveButton: ButtonComponent | null = null;

  /** Retain only this selected field and callbacks for its native modal lifetime. */
  constructor(
    private plugin: KplexPlugin,
    private fieldName: string,
    private onSaved?: () => void,
    private onClosed?: () => void,
  ) { super(plugin.app); }

  /** Render the ontology role chooser for the selected vault field with localized captions and feedback; the native Modal owns its open/close shell. */
  onOpen(): void {
    this.opened = true; this.generation++;
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
      .addButton(/** Native clicks share one synchronous write guard before asynchronous persistence. */ button => {
        this.saveButton = button;
        button.setButtonText(translate("common.save")).setCta().setDisabled(this.busy).onClick(/** Capture the current chosen role without retargeting this field. */ () => { void this.save(selected); });
      })
      .addButton((button) => button.setButtonText(translate("common.cancel")).onClick(() => this.close()));
  }

  /** Save once; a dismissed or reopened shell cannot receive delayed UI callbacks or notices. */
  private async save(role: OntologyAssignmentRole): Promise<void> {
    if (!this.opened || this.busy) return;
    this.busy = true; this.saveButton?.setDisabled(true);
    const generation = this.generation;
    try {
      await this.plugin.assignFieldToOntology(this.fieldName, role);
      if (!this.opened || this.generation !== generation) return;
      this.onSaved?.(); this.close();
    } catch {
      if (this.opened && this.generation === generation) new Notice(this.plugin.translator("actions.failed"));
    } finally {
      this.busy = false;
      if (this.opened && this.generation === generation) this.saveButton?.setDisabled(false);
    }
  }

  /** Release the exact native invocation once, including dismissal while its save completes. */
  onClose(): void {
    const notify = this.opened;
    this.opened = false; this.saveButton = null; this.contentEl.empty();
    if (notify) this.onClosed?.();
  }
}
