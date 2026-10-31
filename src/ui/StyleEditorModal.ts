/**
 * Native style-operation shell shared by dictionary, source and palette editors. Preserve the existing
 * disk-before-publication owner, duplicate/Cancel exclusion and truthful saved-refresh-pending result.
 * Each content component owns its controls; explicit external retirement fences late UI callbacks.
 */
import {Modal, Notice, getIcon, setTooltip, type ButtonComponent} from "obsidian";
import type {ClipboardState} from "../application/ClipboardSession";
import {createObsidianTranslator} from "../adapters/obsidian/localization";

/** Storage succeeded; display refresh failure must never be presented as a destructive unsaved retry. */
export type StyleCommitResult = Readonly<{refreshPending:boolean}>;

/** Reuse the native settings glyph treatment without a second icon or button interaction policy. */
export function appendIcon(button: HTMLElement, name: string): void {
  const icon = getIcon(name);
  if (!icon) return;
  icon.classList.add("kplex-lucide");
  button.prepend(icon);
}

/** Compact native action with a visible Lucide glyph, styled tooltip and accessible name.
 * Retain literal text for the existing save/Cancel lifecycle guards; CSS hides it visually. */
export function labelIconButton(button: HTMLElement, label: string, icon: string): void {
  button.setText(label);button.addClass("kplex-icon-action");button.setAttribute("aria-label", label);
  setTooltip(button, label);appendIcon(button, icon);
}

/** Pending-state native shell; subclasses supply detached feature drafts and durable operations. */
export abstract class StyleEditorModal extends Modal {
  protected readonly translate = createObsidianTranslator();
  private operationPending = false;
  protected externallyRetired = false;
  private operationCommitted = false;
  private lifetime = 0;
  private editorOpen = false;
  private feedback: HTMLElement | null = null;
  private contextReleases: Array<() => void> = [];
  private themeCurrent: (() => boolean) | null = null;
  private openingThemeName = "";
  private themeReadOnlyMessage: string | undefined;

  /** Start a fresh editor lifetime; retired asynchronous completions cannot close its replacement. */
  protected beginEditor(sourceScope?: HTMLElement, bindEditor?: (editor: StyleEditorModal) => void): void {
    this.releaseEditorContext();
    this.lifetime += 1;
    this.externallyRetired = false;
    this.editorOpen = true;
    this.operationPending = false;
    this.operationCommitted = false;
    this.modalEl.setAttribute("aria-busy", "false");
    this.feedback = this.contentEl.createDiv({ cls: "setting-item-description", attr: { role: "status", "aria-live": "polite" } });
    const elements = new Set([this.modalEl, ...(sourceScope ? [sourceScope] : [])]);
    const views = new Set<Window>();
    for (const element of elements) {
      const document = element.ownerDocument;
      if (typeof element.onWindowMigrated === "function") this.contextReleases.push(element.onWindowMigrated(/** Retire only an actual realm change, never an initial same-window notification. */ () => { if (element.ownerDocument !== document) this.retire(); }));
      const view = element.ownerDocument.defaultView; if (view) views.add(view);
    }
    for (const view of views) if (typeof view.addEventListener === "function") {
      const closed = (): void => this.retire();
      view.addEventListener("pagehide", closed, {once: true});
      this.contextReleases.push(/** Release from the exact window that acquired this listener. */ () => view.removeEventListener("pagehide", closed));
    }
    bindEditor?.(this);
  }

  /** Bind the opening activation; stale unsubmitted drafts stay visible until explicit discard. */
  bindThemeOwner(isCurrent: () => boolean, subscribe: (changed: () => void) => () => void, name: string, readOnlyMessage?: string): void {
    this.themeCurrent = isCurrent; this.openingThemeName = name; this.themeReadOnlyMessage = readOnlyMessage;
    const lifetime = this.lifetime;
    /** Metadata changes may be harmless; only an actual activation mismatch freezes this draft. */
    const check = (): void => {if (this.editorOpen && this.lifetime === lifetime && (this.themeReadOnlyMessage || !isCurrent())) this.showStaleThemeDraft();};
    this.contextReleases.push(subscribe(check));
    // beginEditor precedes control construction. Finish attachment before disabling a stale form;
    // canEdit/runOperation fence callbacks even before this one microtask runs.
    this.modalEl.ownerDocument.defaultView?.queueMicrotask?.(check);
  }

  /** Preserve unsaved values, explain their owner and leave only explicit dismissal available. */
  private showStaleThemeDraft(): void {
    if (!this.editorOpen || this.operationPending || this.operationCommitted) return;
    this.feedback?.setText(this.themeReadOnlyMessage ?? this.translate("themes.staleDraft", {name: this.openingThemeName}));
    const cancel = this.translate("common.cancel"), discard = this.translate(this.themeReadOnlyMessage ? "styles.operation.close" : "themes.discardDraft");
    let hasDismiss = false;
    for (const control of Array.from(this.contentEl.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>("input, select, button"))) {
      const dismiss = control.tagName === "BUTTON" && (control.textContent === cancel || control.textContent === discard);
      control.disabled = !dismiss; if (dismiss) {
        if (control.classList.contains("kplex-icon-action")) labelIconButton(control, discard, "x");else control.setText(discard);
        hasDismiss = true;
      }
    }
    if (!hasDismiss) this.contentEl.createEl("button", {text: discard, attr: {type: "button"}}).addEventListener("click", /** Managers without a Cancel footer still provide explicit dismissal. */ () => this.close());
  }

  /** Share a native scrolling body and always-visible action footer across real appearance editors. */
  protected scrollableContent(): {body: HTMLElement; actions: HTMLElement} {
    this.modalEl.addClass("kplex-scroll-editor-modal");
    return {body: this.contentEl.createDiv({cls: "kplex-style-editor-body"}), actions: this.contentEl.createDiv({cls: "kplex-style-editor-actions"})};
  }

  /** Both export dialogs close only after a successful native write; failed copy stays available for retry. */
  protected clipboardFeedback(state: ClipboardState, button: ButtonComponent | null, status: HTMLElement | null, copied: string, failed: string): void {
    if (!this.canEdit() || !this.modalEl.isConnected) return;
    button?.setDisabled(state === "copying");
    if (state === "copied") {this.close();new Notice(copied);}
    else if (state === "failed") status?.setText(failed);
  }

  /** Submit once, freeze the captured draft and block Cancel/Escape until its durable outcome is known. */
  protected runOperation(operation: (isCurrent: () => boolean) => Promise<StyleCommitResult>): void {
    if (this.themeReadOnlyMessage || this.themeCurrent?.() === false) {this.showStaleThemeDraft(); return;}
    if (this.operationPending || this.operationCommitted || !this.editorOpen) return;
    const lifetime = this.lifetime;
    /** External teardown retires UI callbacks but never pretends an already submitted disk write was canceled. */
    const isCurrent = (): boolean => this.editorOpen && this.lifetime === lifetime
      && this.modalEl.isConnected && !this.modalEl.ownerDocument.defaultView?.closed;
    const controls = Array.from(this.contentEl.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>("input, select, button"));
    const disabled = controls.map(/** Restore existing fixed-family and inherited disabled state after a failed save. */ control => control.disabled);
    this.operationPending = true;
    this.modalEl.setAttribute("aria-busy", "true");
    this.feedback?.setText(this.translate("styles.operation.saving"));
    for (const control of controls) control.disabled = true;
    /** Separate durable operation failure from UI completion failure so a saved change never becomes an unsaved retry. */
    const finish = async (): Promise<void> => {
      let result: StyleCommitResult;
      try {
        result = await operation(isCurrent);
      } catch (error) {
        console.error("K-Plex style operation was not saved", error);
        if (!isCurrent()) return;
        this.operationPending = false;
        this.modalEl.setAttribute("aria-busy", "false");
        if (this.themeCurrent?.() === false) {this.showStaleThemeDraft(); return;}
        controls.forEach(/** Only restore this still-live form after persistence rejected. */ (control, index) => { control.disabled = disabled[index]; });
        this.feedback?.setText(this.translate("styles.operation.notSaved"));
        this.onOperationRejected();
        return;
      }
      if (!isCurrent()) return;
      this.operationPending = false;
      this.operationCommitted = true;
      if (result.refreshPending) {
        try { new Notice(this.translate("styles.operation.savedRefreshPending")); }
        catch (error) { console.error("K-Plex saved style recovery notice failed", error); }
      }
      try { this.close(); } catch (error) {
        console.error("K-Plex saved style editor close failed", error);
        if (!isCurrent()) return;
        this.modalEl.setAttribute("aria-busy", "false");
        this.feedback?.setText(this.translate("styles.operation.savedRefreshPending"));
        for (const control of controls) {
          // Saved operations cannot run again. Only dismissal is available after a native close failure.
          if (control.tagName === "BUTTON" && control.textContent === this.translate("common.cancel")) {
            control.disabled = false;
            if (control.classList.contains("kplex-icon-action")) labelIconButton(control, this.translate("styles.operation.close"), "x");
            else {control.setText(this.translate("styles.operation.close"));appendIcon(control, "x");}
          }
        }
      }
    };
    void finish();
  }

  /** Re-evaluate current draft validity after a rejected write restores native controls. */
  protected onOperationRejected(): void {}

  /** Focus a native control after attachment, using its exact window and existing modal retirement owner. */
  protected focusAfterAttachment(element: HTMLElement): void {
    const owner = element.ownerDocument, view = owner.defaultView; if (!view) return;
    const timer = view.setTimeout(/** A closed, pending or migrated form cannot steal focus from its replacement. */ () => {
      if (this.canEdit() && element.isConnected && element.ownerDocument === owner && !view.closed) element.focus();
    }, 0);
    this.contextReleases.push(/** Closing/reopening/migration cancels the original window's pending focus. */ () => view.clearTimeout(timer));
  }

  /** Permit local validation feedback to exclude Save during an existing durable operation. */
  protected canEdit(): boolean { return this.editorOpen && !this.operationPending && !this.operationCommitted && !this.themeReadOnlyMessage && this.themeCurrent?.() !== false; }

  /** External teardown retires UI even if storage is already submitted; durable work is not falsely canceled. */
  retire(): void {
    if (!this.editorOpen) return;
    this.releaseEditorContext();
    this.externallyRetired = true; this.editorOpen = false; this.lifetime += 1; this.operationPending = false;
    super.close();
  }

  /** Native Escape, the close icon and Cancel share the pending-operation exclusion. */
  close(): void {
    if (!this.operationPending) super.close();
  }

  /** Retire the exact form before subclasses remove controls and suggestion popovers. */
  onClose(): void {
    this.releaseEditorContext();
    this.editorOpen = false;
    this.operationPending = false;
    this.lifetime += 1;
    this.feedback = null;
  }
  /** Closing, migration and reuse release native context registrations exactly once. */
  private releaseEditorContext(): void {
    for (const release of this.contextReleases.splice(0)) release();
    this.themeCurrent = null; this.openingThemeName = ""; this.themeReadOnlyMessage = undefined;
  }

}
