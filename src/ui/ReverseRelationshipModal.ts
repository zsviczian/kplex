/** Explicit selected-source reversal confirmation. Cross-file mutation is plugin-owned; this
 * shell shows stable before/after states; Save observes pending work before retrying it. */
import {KplexModal as Modal, formActions, labelIconButton} from "../adapters/obsidian/KplexModal";
import {type App, type ButtonComponent} from "obsidian";

import type {Translator} from "../lang";
import type {RelationshipReversalResult} from "../main";

export class ReverseRelationshipModal extends Modal {
  private opened = false;
  private busy = false;
  private pending = false;
  private save: ButtonComponent | null = null;
  private feedback: HTMLElement | null = null;

  /** The parent provides one exact provenance intent and owns cleanup across close/migration. */
  constructor(app: App, private readonly t: Translator, private readonly source: {owner: string; field: string; target: string; inverse: string},
    private readonly current: () => boolean, private readonly submit: () => Promise<RelationshipReversalResult>,
    private readonly refresh: () => Promise<boolean>, private readonly retired: () => void) {super(app);}

  /** Only one Save can observe or mutate the selected pair at a time. */
  private renderDirection(): void {
    this.save?.setDisabled(this.busy || !this.current());
  }

  /** Submit once; a later Save observes pending disk work before the idempotent writer resumes. */
  private async confirm(): Promise<void> {
    if (!this.opened || !this.current() || this.busy) return;
    this.busy = true; this.renderDirection();
    try {
      // A second Save observes the prior durable result before the idempotent writer can resume.
      if (this.pending && !await this.refresh()) return;
      if (!this.opened || !this.current()) return;
      const outcome = await this.submit();
      if (!this.opened || !this.current()) return;
      if (outcome.state === "reversed") {this.close(); return;}
      this.pending = true;
      this.feedback?.setText(this.t(outcome.stage === "replacement" ? "relationship.replacementPending" : "relationship.removalPending"));
    } catch (error) {if (this.opened && this.current()) this.feedback?.setText(error instanceof Error ? error.message : String(error));}
    finally {this.busy = false; if (this.opened) this.renderDirection();}
  }

  /** Fixed before/after previews preserve the selected declaration while the user reviews Save. */
  onOpen(): void {
    this.opened = true; this.setTitle(this.t("relationship.flip"));
    const before = this.contentEl.createDiv({cls: "kplex-ownership-preview"});
    before.createEl("h4", {text: this.t("relationship.before")});
    before.createEl("p", {text: this.t("relationship.directionPreview", {owner: this.source.owner, field: this.source.field, target: this.source.target})});
    const after = this.contentEl.createDiv({cls: "kplex-ownership-preview is-after"});
    after.createEl("h4", {text: this.t("relationship.after")});
    after.createEl("p", {text: this.t("relationship.directionPreview", {owner: this.source.target, field: this.source.inverse, target: this.source.owner})});
    this.contentEl.createEl("p", {text: this.t("relationship.flipScope")});
    const actions = formActions(this.contentEl);
    this.feedback = actions.infoEl.createDiv({cls: "kplex-form-status", attr: {role: "status"}});
    actions
      .addButton(/** Closing never starts or rolls back a native mutation. */ button => {labelIconButton(button.buttonEl, this.t("common.cancel"), "x"); button.onClick(/** Retire this invocation only. */ () => this.close());})
      .addButton(/** Explicit Save is the only cross-file mutation entry. */ button => {this.save = button; labelIconButton(button.buttonEl, this.t("common.save"), "save"); button.setCta().onClick(/** Share duplicate-submit guarding across pointer and keyboard activation. */ () => {void this.confirm();});});
    this.renderDirection();
  }

  /** Parent retirement closes this child before releasing pair-provenance DOM. */
  onClose(): void {this.opened = false; this.save = null; this.feedback = null; this.contentEl.empty(); this.retired();}
}
