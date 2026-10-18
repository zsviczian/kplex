/**
 * Native one-shot consent for configuring the first Hidden ontology property. The host supplies
 * a collision-checked name and owns persistence; this shell only returns create/settings/cancel.
 * Closing or retiring the owning graph cannot approve a late configuration or note mutation.
 */
import { Modal, Setting, type App } from "obsidian";
import { createObsidianTranslator } from "../adapters/obsidian/localization";

export type HiddenFieldSetupChoice = "create" | "settings" | null;

/** Offer explicit automatic setup or native settings navigation without silently assigning a property. */
export class HiddenFieldSetupModal extends Modal {
  private decided = false;
  /** Retain the proposed name and the single caller-owned decision boundary; no plugin instance crosses into this shell. */
  constructor(app: App, private readonly field: string | null,
    private readonly onDecision: (choice: HiddenFieldSetupChoice) => void) { super(app); }

  /** Render only available choices; a missing property registry requires manual setup rather than guessing an unused name. */
  onOpen(): void {
    const translate = createObsidianTranslator();
    this.titleEl.setText(translate("hide.setup.title"));
    this.contentEl.createEl("p", { text: this.field
      ? translate("hide.setup.help", { field: this.field }) : translate("hide.setup.manualRequired") });
    if (this.field && this.field !== "hidden") this.contentEl.createEl("p", { text: translate("hide.setup.alternative") });
    const actions = new Setting(this.contentEl);
    actions.addButton(/** Cancellation never approves configuration. */ button => button.setButtonText(translate("common.cancel"))
      .onClick(/** Native cancellation uses the same one-shot disposal. */ () => this.close()));
    actions.addButton(/** Settings lets the user choose their own field without approving this hide operation. */ button => button.setButtonText(translate("hide.setup.settings"))
      .onClick(/** Settle before handing navigation to the host. */ () => this.finish("settings")));
    const field = this.field;
    if (field) actions.addButton(/** Creation configures the displayed exact name before the separate directional hide confirmation. */ button => button
      .setButtonText(translate("hide.setup.create", { field })).setCta()
      .onClick(/** Duplicate clicks cannot configure twice. */ () => this.finish("create")));
  }

  /** Close controls before resolving explicit consent; old buttons cannot revive this shell. */
  private finish(choice: Exclude<HiddenFieldSetupChoice, null>): void {
    if (this.decided) return;
    this.decided = true;
    this.close();
    this.onDecision(choice);
  }

  /** Escape, outside click and graph/plugin teardown cancel configuration exactly once. */
  onClose(): void {
    this.contentEl.empty();
    if (!this.decided) { this.decided = true; this.onDecision(null); }
  }
}
