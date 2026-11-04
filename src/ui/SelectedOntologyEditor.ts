/** Shared field-targeted ontology editing lifetime for native and React-backed parent forms.
 * This owner opens the existing canonical editor; it never changes a connection or parent draft. */
import type KplexPlugin from "../main";
import {AddToOntologyModal} from "./AddToOntologyModal";

export class SelectedOntologyEditor {
  private dialog: AddToOntologyModal | null = null;
  private releaseWindow: (() => void) | null = null;

  /** The parent supplies exact invocation/window lifetime rather than an active workspace lookup. */
  constructor(private readonly plugin: KplexPlugin, private readonly current: () => boolean) {}

  /** Parent submit guards use the same synchronous child ownership as close and focus restoration. */
  get active(): boolean {return this.dialog !== null;}

  /** Nested modal interaction belongs to its parent session, including focus in its literal editors. */
  owns(target: EventTarget): boolean {return !!this.dialog && "nodeType" in target && this.dialog.modalEl.contains(target as Node);}

  /** Open exactly the physical selected field, including the selected endpoint of an inverse pair. */
  open(field: string, invoker: HTMLElement, saved: () => void): void {
    if (!field.trim() || !this.current() || this.dialog) return;
    const doc = invoker.ownerDocument, parent = invoker.closest<HTMLElement>(".modal");
    const dialog = new AddToOntologyModal(this.plugin, field.trim(),
      /** Saved settings publications refresh annotations; unrelated parent drafts stay untouched. */ () => {if (this.dialog === dialog && this.current()) saved();},
      /** A stale child cannot restore focus into a retired or migrated parent. */ () => {
        if (this.dialog !== dialog) return;
        this.dialog = null; this.releaseWindow?.(); this.releaseWindow = null;
        if (this.current()) {
          if (invoker.isConnected && invoker.ownerDocument === doc) invoker.focus();
          else if (parent?.isConnected && parent.ownerDocument === doc) parent.querySelector<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled])')?.focus();
        }
      });
    this.dialog = dialog;
    const owner = doc.defaultView;
    const close = /** Closing the child's native realm revokes its unaccepted editor draft. */ (): void => this.close(); owner?.addEventListener("pagehide", close, {once: true});
    this.releaseWindow = /** Retire only this selected editor's owner-window subscription. */ () => owner?.removeEventListener("pagehide", close);
    // Native Modal.open can focus an input synchronously. Own the child before that focus reaches
    // the parent's outside-interaction guard, otherwise merely opening it would retire the draft.
    try {dialog.open();} catch (error) {this.close(); throw error;}
  }

  /** Closing the parent revokes unaccepted child work before any parent DOM is released. */
  close(): void {const dialog = this.dialog; this.dialog = null; this.releaseWindow?.(); this.releaseWindow = null; dialog?.close();}
}
