/** Native informational dialog shared by host notifications. The caller owns copy, durable
 * acknowledgment and lifetime; this shell releases its dismissal callback exactly once. */
import {formActions, KplexModal as Modal} from "../adapters/obsidian/KplexModal";

import {type App} from "obsidian";

/** Present information until explicitly dismissed through the native button, Escape or close control. */
export class NotificationModal extends Modal {
  private retired = false;

  /** Capture localized content and a release callback without acquiring settings or graph ownership. */
  constructor(app: App, private readonly title: string, private readonly message: string,
    private readonly dismissLabel: string, private readonly dismissed: () => void) {
    super(app);
    this.modalEl.addClass("kplex-notification-modal");
  }

  /** Reuse Obsidian's title, content and native action styling without a separate dialog design. */
  onOpen(): void {
    if (this.retired) return;
    this.setTitle(this.title);
    this.contentEl.empty();
    this.contentEl.createEl("p", {text: this.message});
    formActions(this.contentEl).addButton(/** Acknowledgment dismisses only this informational shell. */ button => {
      button.setButtonText(this.dismissLabel).setCta().onClick(/** Native close owns release for every dismissal route. */ () => this.close());
    });
  }

  /** Release once, including native Escape, close-before-open and plugin teardown. */
  onClose(): void {
    if (this.retired) return;
    this.retired = true;
    this.contentEl.empty();
    this.dismissed();
  }
}
