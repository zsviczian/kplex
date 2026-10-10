/**
 * Native support-report guidance with an exact read-only Markdown preview. A host-free clipboard
 * session starts in the original user gesture; this shell observes only its actual result and
 * owns retry/selection controls. Closing retires callbacks and restores native selection/focus.
 * GitHub navigation is explicit through literal external anchors; nothing is submitted here.
 */
import { Modal, Setting, type App } from "obsidian";
import type { Translator } from "../../lang";
import { SupportClipboardSession, type SupportCopyState } from "../../application/supportClipboard";

/** Display support instructions without collecting any further index, vault or account facts. */
export class SupportReportModal extends Modal {
  private retired = false;
  private status: HTMLElement | null = null;
  private retry: HTMLButtonElement | null = null;
  private release: (() => void) | null;

  /** Capture the already-started clipboard session, catalog and explicit host teardown callback. */
  constructor(app: App, private session: SupportClipboardSession, private translate: Translator, release: () => void) {
    super(app);
    this.release = release;
    this.modalEl.addClass("kplex-support-report-modal");
    this.setTitle(translate("support.reportTitle"));
  }

  /** Build semantic native controls; the preview is exactly the immutable clipboard payload. */
  onOpen(): void {
    if (this.retired) return;
    const content = this.contentEl;
    content.empty();
    content.createEl("p", { text: this.translate("support.searchFirst") });
    content.createEl("p", { text: this.translate("support.issueInstructions") });
    content.createEl("p", { text: this.translate("support.privacyDisclosure"), cls: "setting-item-description" });
    this.status = content.createEl("p", { cls: "kplex-support-copy-status" });
    this.status.setAttr("role", "status");
    this.status.setAttr("aria-live", "polite");
    const links = content.createDiv({ cls: "kplex-support-report-links" });
    const search = links.createEl("a", { cls: "external-link", text: this.translate("support.searchIssues"), href: "https://github.com/zsviczian/kplex/issues" });
    search.setAttr("target", "_blank");
    search.setAttr("rel", "noopener noreferrer");
    const create = links.createEl("a", { cls: "external-link", text: this.translate("support.createIssue"), href: "https://github.com/zsviczian/kplex/issues/new" });
    create.setAttr("target", "_blank");
    create.setAttr("rel", "noopener noreferrer");
    const preview = content.createEl("textarea", { cls: "kplex-support-report-preview" });
    preview.value = this.session.report;
    preview.readOnly = true;
    preview.spellcheck = false;
    preview.setAttr("aria-label", this.translate("support.previewLabel"));
    preview.rows = 9;
    new Setting(content).addButton(/** Retry starts the owning writer in the native button callback's synchronous turn. */ button => {
      this.retry = button.buttonEl;
      button.setButtonText(this.translate("support.copyAgain"))
        .onClick(/** No report regeneration or prior await can consume clipboard user activation. */ () => this.session.copy());
    }).addButton(/** Native modal dismissal owns cleanup and native focus restoration. */ button => {
      button.setButtonText(this.translate("support.close"))
        .onClick(/** Close without activating the background graph or changing its selected node. */ () => this.close());
    });
    this.session.listen(/** Actual fulfillment/denial updates only this still-mounted native shell. */ state => this.updateCopyState(state));
  }

  /** Show success only after fulfillment; denial retains selectable text and a usable retry. */
  private updateCopyState(state: SupportCopyState): void {
    if (this.retired || !this.status) return;
    this.status.setText(this.translate(state === "copied" ? "support.copied" : state === "failed" ? "support.copyFailed" : "support.copying"));
    this.status.toggleClass("mod-warning", state === "failed");
    if (this.retry) this.retry.disabled = state === "copying";
  }

  /** Release clipboard/presentation captures before notifying the exact launching host owner. */
  onClose(): void {
    if (this.retired) return;
    this.retired = true;
    this.session.dispose();
    this.status = null;
    this.retry = null;
    this.contentEl.empty();
    const release = this.release;
    this.release = null;
    release?.();
  }
}
