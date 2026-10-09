/**
 * Native Obsidian view shells, active-view hotkey scopes and React-root lifecycle for K-Plex
 * surfaces. React registers/unregisters scoped actions with its owning surface. View registration
 * IDs stay stable; display titles use the plugin translator.
 */
import { ItemView, Scope, WorkspaceLeaf } from "obsidian";
import { createRoot, type Root } from "react-dom/client";
import type KplexPlugin from "../main";
import type { KplexViewSurface } from "../settings";
import { readObsidianPresentationEnvironment } from "../adapters/obsidian/presentationEnvironment";
import { KplexApp } from "./App";

export const KPLEX_VIEW_TYPE = "k-plex-react-view";
export const KPLEX_SIDEPANEL_VIEW_TYPE = "k-plex-sidepanel-view";

abstract class BaseKplexView extends ItemView {
  private root: Root | null = null;
  private windowMigrationCleanup: (() => void) | null = null;
  private ready = false;
  private renderGeneration = 0;
  private readyResolvers: Array<() => void> = [];

  /** Bind the native leaf, inherited hotkey scope and K-Plex owner; React owns surface handlers. */
  constructor(leaf: WorkspaceLeaf, protected plugin: KplexPlugin) {
    super(leaf);
    this.scope = new Scope(this.app.scope);
  }

  /** Return the localized native-view title without changing the view registration ID. */
  getDisplayText(): string { return this.plugin.translator("view.displayName"); }
  /** Return the host Lucide icon ID used for the native K-Plex tab. */
  getIcon(): string { return "brain-circuit"; }
  /** Identify the owning surface so profile and environment policy stay outside the renderer. */
  protected abstract getSurface(): KplexViewSurface;

  /** Resolve after initial rendering, or on close so pending callers cannot retain a dead view. */
  waitUntilReady(): Promise<void> {
    if (this.ready) return Promise.resolve();
    return new Promise<void>((resolve) => this.readyResolvers.push(resolve));
  }

  /** Mark the initial render ready and release each queued readiness waiter exactly once. */
  private markReady(): void {
    if (this.ready) return;
    this.ready = true;
    for (const resolve of this.readyResolvers.splice(0)) resolve();
  }

  /** Replace the React root in this owning document, releasing any previous root and listeners. */
  protected renderReact(): void {
    this.ready = false;
    const generation = ++this.renderGeneration;
    this.root?.unmount();
    this.root = createRoot(this.contentEl);
    this.root.render(<KplexApp
      plugin={this.plugin}
      surface={this.getSurface()}
      hostLeaf={this.leaf}
      translate={this.plugin.translator}
      environment={readObsidianPresentationEnvironment(this.contentEl.ownerDocument.defaultView ?? undefined)}
      onReady={/** Readiness belongs to the current mounted action/focus adapter, including migration. */ () => {
        if (generation === this.renderGeneration && this.root) this.markReady();
      }}
    />);
  }

  /** Mount immediately, watch native window migration and start indexing without blocking reveal. */
  async onOpen(): Promise<void> {
    await super.onOpen();
    this.contentEl.empty();
    this.contentEl.addClass("kplex-view-host");
    this.contentEl.toggleClass("kplex-sidepanel-host", this.getSurface() === "sidepanel");
    if (typeof this.containerEl.onWindowMigrated === "function") {
      this.windowMigrationCleanup = this.containerEl.onWindowMigrated(() => this.renderReact());
    }
    this.renderReact();
    // View construction/reveal must never wait for a potentially long initial index. On mobile,
    // awaiting the build here makes the sidepanel appear not to open at all and can keep
    // setViewState() pending long enough for the WebView to look hung. Render the indexing state
    // immediately, then let the index publish asynchronously into the mounted React view.
    void this.plugin.onKplexViewOpened(this.leaf).catch((error) => console.error("K-Plex view initialization failed", error));
  }

  /** Release window hooks, React resources and pending waiters before native view teardown. */
  async onClose(): Promise<void> {
    this.windowMigrationCleanup?.();
    this.windowMigrationCleanup = null;
    this.renderGeneration++;
    this.root?.unmount();
    this.root = null;
    this.ready = false;
    for (const resolve of this.readyResolvers.splice(0)) resolve();
    this.plugin.onKplexViewClosed(this.leaf);
    await super.onClose();
  }
}

export class KplexView extends BaseKplexView {
  /** Preserve the serialized normal/pop-out view type so existing workspaces restore unchanged. */
  getViewType(): string { return KPLEX_VIEW_TYPE; }
  /** Derive normal versus pop-out ownership from the native content document after each move. */
  protected getSurface(): KplexViewSurface {
    // A regular leaf can migrate into a popout. Its document lives in a different window then.
    return this.contentEl.ownerDocument.defaultView === window ? "leaf" : "popout";
  }
}

export class KplexSidepanelView extends BaseKplexView {
  /** Preserve the serialized sidepanel view type used by existing workspace state. */
  getViewType(): string { return KPLEX_SIDEPANEL_VIEW_TYPE; }
  /** Sidepanel shells always use the dedicated sidepanel layout and opening policy. */
  protected getSurface(): KplexViewSurface { return "sidepanel"; }
}
