/** Native input suggestions keep Obsidian's skin, filtering and keyboard scope. This owner
 * only refreshes an already-open anchor when its own modal/window changes geometry. */
import {AbstractInputSuggest, type App} from "obsidian";

/** Shared by tag, node-style and icon inputs; closing releases every observation immediately. */
export abstract class KplexInputSuggest<T> extends AbstractInputSuggest<T> {
  private positionedPopupOpen = false;
  private releaseAnchor: (() => void) | null = null;
  private anchorRect: readonly number[] = [];
  private activated = true;
  private releaseActivation: (() => void) | null = null;

  /** The native suggester still owns its input events and complete popup lifetime. */
  constructor(app: App, private readonly anchorInput: HTMLInputElement, startClosed = false) {
    super(app, anchorInput);this.activated = !startClosed;
    if (startClosed) {
      const activate = (event: Event): void => {
        if (event instanceof anchorInput.ownerDocument.defaultView!.KeyboardEvent && event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        this.activated = true;
        if (event.type !== "input") this.open();
      };
      anchorInput.addEventListener("input", activate, true);anchorInput.addEventListener("pointerdown", activate);anchorInput.addEventListener("keydown", activate, true);
      this.releaseActivation = () => {anchorInput.removeEventListener("input", activate, true);anchorInput.removeEventListener("pointerdown", activate);anchorInput.removeEventListener("keydown", activate, true);};
    }
  }

  /** Bind only while visible, using the input's actual document and its realm constructors. */
  override open(): void {
    if (!this.activated) return;
    if (!this.anchorInput.isConnected || this.anchorInput.disabled || this.anchorInput.ownerDocument.defaultView?.closed) return;
    this.positionedPopupOpen = true;super.open();this.anchorRect = this.readAnchor();
    if (this.releaseAnchor) return;
    const owner = this.anchorInput.ownerDocument.defaultView;if (!owner) return;
    const changed = (): void => {
      if (!this.anchorInput.isConnected || this.anchorInput.ownerDocument.defaultView !== owner || owner.closed) {this.close();return;}
      const next = this.readAnchor();if (next.some((value, index) => value !== this.anchorRect[index])) this.refreshPosition();
    };
    const Observer = (owner as Window & {ResizeObserver?: typeof ResizeObserver}).ResizeObserver;
    const observer = Observer ? new Observer(changed) : null;
    observer?.observe(this.anchorInput, {box: "border-box"});
    const modal = this.anchorInput.closest(".modal");if (modal) observer?.observe(modal, {box: "border-box"});
    const closed = (): void => this.close();
    owner.addEventListener("resize", changed);owner.visualViewport?.addEventListener("resize", changed);
    owner.addEventListener("pagehide", closed, {once: true});
    this.releaseAnchor = () => {observer?.disconnect();owner.removeEventListener("resize", changed);owner.visualViewport?.removeEventListener("resize", changed);owner.removeEventListener("pagehide", closed);};
  }

  /** Escape, blur, selection and form retirement must prevent any delayed observation from reopening it. */
  override close(): void {this.positionedPopupOpen = false;this.releaseAnchor?.();this.releaseAnchor = null;this.anchorRect = [];super.close();}

  /** Form retirement also releases optional initial-focus activation listeners. */
  dispose(): void {this.close();this.releaseActivation?.();this.releaseActivation = null;this.activated = false;}

  /** Public native open is idempotent and recalculates the anchor without synthesizing input or focus. */
  refreshPosition(): void {
    if (this.positionedPopupOpen && this.anchorInput.isConnected && this.anchorInput.ownerDocument.activeElement === this.anchorInput) {
      super.open();this.anchorRect = this.readAnchor();
    }
  }

  /** Accept a native choice only into its live editable input, using that document's event realm. */
  protected acceptValue(value: string): void {
    const owner = this.anchorInput.ownerDocument.defaultView;
    if (!this.anchorInput.isConnected || this.anchorInput.disabled || !owner || owner.closed) return;
    this.setValue(value);this.anchorInput.dispatchEvent(new owner.Event("input", {bubbles: true}));this.close();
  }

  /** Retain only the finite coordinates needed to avoid redundant observer-driven refreshes. */
  private readAnchor(): readonly number[] {const rect = this.anchorInput.getBoundingClientRect();return [rect.x, rect.y, rect.width, rect.height];}
}
