/**
 * Reconcile native command ownership after a nested Markdown leaf's focus event finishes
 * bubbling through its real K-Plex WorkspaceLeaf. Native leaf ancestors each activate themselves;
 * the owning document is the first boundary after those handlers without changing input or Scope.
 */
import type { View } from "obsidian";

const focusOwners = new WeakMap<HTMLElement, () => boolean>();

/** Focus only the live native controller registered for this exact mount, without exposing its synthetic leaf. */
export function focusEmbeddedMarkdown(mount: HTMLElement): boolean {
  return focusOwners.get(mount)?.() ?? false;
}

/** Lease one representation-aware focus operation to its original document and controller lifetime. */
export function registerEmbeddedMarkdownFocusTarget(mount: HTMLElement, focus: () => boolean, current: () => boolean): () => void {
  const ownerDocument = mount.ownerDocument;
  /** A disconnected, migrated, retired or background controller cannot steal focus or command ownership. */
  const ownedFocus = (): boolean => current() && mount.isConnected && mount.ownerDocument === ownerDocument && ownerDocument.hasFocus() && focus();
  focusOwners.set(mount, ownedFocus);
  return /** Release only this exact registration, including replacement-safe repeated disposal. */ () => {
    if (focusOwners.get(mount) === ownedFocus) focusOwners.delete(mount);
  };
}

/** Use the current native representation's focus contract and report success only after visible native content actually owns DOM focus. */
export function focusEmbeddedMarkdownView(mount: HTMLElement, view: Pick<View, "getViewType" | "setEphemeralState">, activate: () => void): boolean {
  if (view.getViewType() === "excalidraw") {
    // The companion overrides ephemeral state without implementing focus; its native canvas
    // already supplies tabIndex=0. Do not substitute a nonfocusable K-Plex wrapper.
    const drawing = mount.querySelector<HTMLElement>(".excalidraw");
    if (!drawing?.getClientRects().length) return false;
    drawing.focus({ preventScroll: true });
  } else {
    view.setEphemeralState({ focus: true, focusOnMobile: true });
  }
  const active = mount.ownerDocument.activeElement;
  if (!active || !mount.contains(active) || !active.getClientRects().length) return false;
  activate();
  return true;
}

/** Register one exact-mount focus reconciliation, retaining the caller's mobile/sidebar policy and lifetime. */
export function registerEmbeddedMarkdownFocus(mount: HTMLElement, activate: () => void, current: () => boolean): () => void {
  const ownerDocument = mount.ownerDocument;
  /** Only live native content can own commands; toolbar, external and migrated elements remain outside this mount. */
  const focused = (event: FocusEvent): void => {
    const target = event.target;
    if (!current() || !mount.isConnected || mount.ownerDocument !== ownerDocument || !ownerDocument.hasFocus()) return;
    if (target && "nodeType" in target && mount.contains(target as Node)) activate();
  };
  ownerDocument.addEventListener("focusin", focused);
  return /** Remove precisely this controller's document listener before its native leaf is disposed. */ () => ownerDocument.removeEventListener("focusin", focused);
}
