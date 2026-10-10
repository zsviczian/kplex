/**
 * Native view-owned session display modes. Fullscreen leases the same React content node into its
 * owning document's viewport overlay, retaining native pane geometry and exact restoration position.
 * One document owner and an exact window pagehide lease prevent cross-view interference; close,
 * plugin unload and migration restore owned DOM and retire callbacks. No workspace layout writes,
 * persisted settings, browser fullscreen API or semantic/index operations cross this host boundary.
 * Windows toolbar geometry owns a separate per-entry chrome lease, retired on every fullscreen exit.
 */
import type { Component } from "obsidian";
import { leaseFullscreenChrome } from "../adapters/obsidian/fullscreenChrome";
export type KplexDisplayModeState = Readonly<{ fullscreen: boolean; zen: boolean; revision: number }>;
const fullscreenOwners = new WeakMap<Document, KplexDisplayModes>();

/** Register an isolated unload lease; closing a view clears its only captured controller reference. */
export function registerDisplayModeUnload(plugin: Pick<Component, "register">, modes: KplexDisplayModes): () => void {
  let current: KplexDisplayModes | null = modes;
  plugin.register(/** Plugin unload restores the active native lease, even before leaves close. */ () => { current?.dispose(); current = null; });
  return /** View close leaves the plugin's remaining cleanup inert without retaining a native view. */ () => { current = null; };
}

/** Keep independent Zen state and one reversible fullscreen overlay per owning document. */
export class KplexDisplayModes {
  private state: KplexDisplayModeState = { fullscreen: false, zen: false, revision: 0 };
  private listeners = new Set<() => void>();
  private transitions = new Set<() => void>();
  private overlay: HTMLElement | null = null;
  private anchor: HTMLElement | null = null;
  private parent: HTMLElement | null = null;
  private releaseWindow: (() => void) | null = null;
  private releaseChrome: (() => void) | null = null;
  private disposed = false;
  private lifecycleCleanup = new Set<() => void>();

  /** Desktop availability comes from the existing host presentation facts, never browser fullscreen APIs. */
  constructor(private readonly content: HTMLElement, readonly fullscreenAvailable: boolean) {}

  /** React receives a stable immutable snapshot until an actual mode changes. */
  getSnapshot = (): KplexDisplayModeState => this.state;
  /** Subscribe an exact renderer; retired subscribers cannot keep the native view alive. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return /** Remove only this renderer's subscription. */ () => { this.listeners.delete(listener); };
  };
  /** Prepare camera preservation before either native DOM movement or React's Zen layout change. */
  onBeforeResize(listener: () => void): () => void {
    this.transitions.add(listener);
    return /** Retire the exact graph generation's resize preparation. */ () => { this.transitions.delete(listener); };
  }
  /** Native event releases share the controller lifetime, independent of view close ordering. */
  ownCleanup(release: () => void): void { this.lifecycleCleanup.add(release); }
  /** Notify the graph before dimensions change, then publish one new session snapshot. */
  private prepare(): void { for (const listener of this.transitions) listener(); }
  /** Publish independent mode facts without persisted settings or semantic notifications. */
  private publish(fullscreen: boolean, zen = this.state.zen): void {
    this.state = { fullscreen, zen, revision: this.state.revision + 1 };
    for (const listener of this.listeners) listener();
  }
  /** Restore an owned HTML control after same-document movement; realm identity may differ in popouts. */
  private restoreFocus(focused: Element | null): void {
    if (focused && this.content.contains(focused) && focused.namespaceURI === "http://www.w3.org/1999/xhtml") (focused as HTMLElement).focus({ preventScroll: true });
  }
  /** Hide or restore only K-Plex chrome, retaining graph controls and the other mode. */
  toggleZen(): void {
    if (this.disposed) return;
    this.prepare(); this.publish(this.state.fullscreen, !this.state.zen);
  }
  /** Move the same React host into its viewport overlay and acquire entry-scoped Windows chrome facts. */
  toggleFullscreen(): void {
    if (this.state.fullscreen) { this.exitFullscreen(); return; }
    if (this.disposed || !this.fullscreenAvailable || !this.content.isConnected || !this.content.parentElement) return;
    const document = this.content.ownerDocument;
    fullscreenOwners.get(document)?.exitFullscreen(false);
    this.prepare();
    this.parent = this.content.parentElement;
    this.anchor = this.parent.createDiv({ cls: "kplex-fullscreen-anchor", attr: { "aria-hidden": "true" } });
    this.parent.insertBefore(this.anchor, this.content);
    this.overlay = document.body.createDiv({ cls: "kplex-fullscreen-overlay" });
    const focused = document.activeElement;
    this.overlay.appendChild(this.content);
    fullscreenOwners.set(document, this);
    this.releaseChrome = leaseFullscreenChrome(this.overlay, /** Toolbar wrapping uses the same camera-preservation boundary as native movement. */ () => this.prepare());
    const ownerWindow = document.defaultView;
    if (ownerWindow) {
      const exit = /** Restore the content before its owning window is retired without stealing native focus. */ (): void => this.exitFullscreen(false);
      ownerWindow.addEventListener("pagehide", exit);
      this.releaseWindow = /** Remove this exact overlay's window callback. */ () => ownerWindow.removeEventListener("pagehide", exit);
    }
    this.publish(true);
    this.restoreFocus(focused);
  }
  /** Retire chrome observations before restoring the original/adopted anchor; native pane changes may decline focus. */
  exitFullscreen(restoreFocus = true): void {
    if (!this.overlay) return;
    this.prepare();
    const document = this.overlay.ownerDocument, focused = this.content.ownerDocument.activeElement;
    this.releaseChrome?.(); this.releaseChrome = null;
    this.releaseWindow?.(); this.releaseWindow = null;
    if (this.anchor?.parentElement) this.anchor.parentElement.insertBefore(this.content, this.anchor);
    else if (this.parent) this.parent.appendChild(this.content);
    this.anchor?.remove(); this.anchor = null; this.parent = null;
    this.overlay.remove(); this.overlay = null;
    if (fullscreenOwners.get(document) === this) fullscreenOwners.delete(document);
    this.publish(false);
    if (restoreFocus) this.restoreFocus(focused);
  }
  /** Close/unload cleanup is idempotent and touches only this controller's overlay and subscribers. */
  dispose(): void {
    if (this.disposed) return;
    this.exitFullscreen(false); this.disposed = true;
    for (const release of this.lifecycleCleanup) release(); this.lifecycleCleanup.clear();
    this.listeners.clear(); this.transitions.clear();
  }
}
