/**
 * Native confirmation shell for deleting K-Plex's derived persistent index. A narrow callback
 * owns cancellation/storage effects; this modal owns localized controls, notices and detached
 * DOM cleanup. It never accesses or modifies vault files.
 */
import { Modal, Notice, Setting, type App, type ButtonComponent } from "obsidian";
import { createObsidianTranslator } from "../adapters/obsidian/localization";

export class PurgeIndexCacheModal extends Modal {
  private readonly translate = createObsidianTranslator();
  private purging = false;
  private buttons: ButtonComponent[] = [];

  /** Bind the persistent-cache owner without exposing plugin or vault mutation capabilities. */
  constructor(app: App, private readonly purgeCache: () => Promise<boolean>, private readonly onPurged: () => void) {
    super(app);
  }

  /** Render restart-required confirmation; cancel and native close perform no deletion. */
  onOpen(): void {
    this.titleEl.setText(this.translate("indexing.purgeTitle"));
    this.contentEl.createEl("p", { text: this.translate("indexing.purgeHelp") });
    new Setting(this.contentEl)
      .addButton(/** Native cancel leaves both persistent cache and vault files untouched. */ button => {
        this.buttons.push(button);
        button.setButtonText(this.translate("common.cancel")).onClick(() => this.close());
      })
      .addButton(/** Only explicit confirmation invokes the destructive derived-cache maintenance owner. */ button => {
        this.buttons.push(button);
        button.setButtonText(this.translate("indexing.purgeButton")).setDestructive()
          .onClick(/** Coalesce double activation while asynchronous database deletion settles. */ () => { void this.purge(); });
      });
  }

  /** Await actual deletion before reporting success; failed or blocked deletion remains retryable. */
  private async purge(): Promise<void> {
    if (this.purging) return;
    this.purging = true;
    for (const button of this.buttons) button.setDisabled(true);
    try {
      if (!await this.purgeCache()) {
        new Notice(this.translate("indexing.purgeFailed"));
        return;
      }
      this.onPurged();
      new Notice(this.translate("indexing.purgeComplete"));
      this.close();
    } catch (error) {
      console.error("K-Plex index cache purge failed", error);
      new Notice(this.translate("indexing.purgeFailed"));
    } finally {
      this.purging = false;
      for (const button of this.buttons) button.setDisabled(false);
    }
  }

  /** Release button references and native DOM even if the user closes during deletion. */
  onClose(): void {
    this.buttons = [];
    this.contentEl.empty();
  }
}
