/** On-demand vault/index summary opened from the compact indexing status indicator. */
import { Modal, Setting } from "obsidian";
import type KplexPlugin from "../main";

export class VaultStatsModal extends Modal {
  constructor(private readonly plugin: KplexPlugin) {
    super(plugin.app);
  }

  onOpen(): void {
    const translate = this.plugin.translator;
    const stats = this.plugin.getVaultStatistics();
    this.setTitle(translate("vaultStats.title"));
    const grid = this.contentEl.createDiv({ cls: "kplex-vault-stats" });
    const row = (label: string, value: string | number, nested = false): void => {
      const item = grid.createDiv({ cls: `kplex-vault-stats-row${nested ? " is-nested" : ""}` });
      item.createSpan({ text: label });
      item.createSpan({ text: String(value), cls: "kplex-vault-stats-value" });
    };
    row(translate("vaultStats.indexStatus"), stats.indexStatus);
    row(translate("vaultStats.markdownFiles"), stats.markdownFiles);
    row(translate("vaultStats.notes"), stats.notes, true);
    if (stats.excalidrawDrawings !== null) row(translate("vaultStats.excalidrawDrawings"), stats.excalidrawDrawings, true);
    row(translate("vaultStats.urls"), stats.urls);
    row(translate("vaultStats.folders"), stats.folders);
    row(translate("vaultStats.tags"), stats.tags);
    row(translate("vaultStats.placeholders"), stats.placeholders);
    row(translate("vaultStats.attachments"), stats.attachments);
    row(translate("vaultStats.images"), stats.images, true);
    row(translate("vaultStats.video"), stats.video, true);
    row(translate("vaultStats.otherAttachments"), stats.otherAttachments, true);
    row(translate("vaultStats.ontology"), translate("vaultStats.ontologyValue", { total: stats.ontologyTotal, used: stats.ontologyUsed }));
    new Setting(this.contentEl).addButton((button) => button
      .setButtonText(translate("common.ok"))
      .setCta()
      .onClick(() => this.close()));
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
