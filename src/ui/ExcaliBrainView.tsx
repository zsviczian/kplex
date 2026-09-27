import { ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot, type Root } from "react-dom/client";
import type ExcaliBrainPlugin from "../main";
import type { KplexViewSurface } from "../settings";
import { readObsidianPresentationEnvironment } from "../adapters/obsidian/presentationEnvironment";
import { ExcaliBrainApp } from "./App";

export const EXCALIBRAIN_VIEW_TYPE = "k-plex-react-view";
export const KPLEX_SIDEPANEL_VIEW_TYPE = "k-plex-sidepanel-view";

abstract class BaseKplexView extends ItemView {
  private root: Root | null = null;
  private windowMigrationCleanup: (() => void) | null = null;
  private ready = false;
  private readyResolvers: Array<() => void> = [];

  constructor(leaf: WorkspaceLeaf, protected plugin: ExcaliBrainPlugin) { super(leaf); }

  getDisplayText(): string { return "K-Plex"; }
  getIcon(): string { return "brain-circuit"; }
  protected abstract getSurface(): KplexViewSurface;

  waitUntilReady(): Promise<void> {
    if (this.ready) return Promise.resolve();
    return new Promise<void>((resolve) => this.readyResolvers.push(resolve));
  }

  private markReady(): void {
    if (this.ready) return;
    this.ready = true;
    for (const resolve of this.readyResolvers.splice(0)) resolve();
  }

  protected renderReact(): void {
    this.root?.unmount();
    this.root = createRoot(this.contentEl);
    this.root.render(<ExcaliBrainApp
      plugin={this.plugin}
      surface={this.getSurface()}
      hostLeaf={this.leaf}
      translate={this.plugin.translator}
      environment={readObsidianPresentationEnvironment(this.contentEl.ownerDocument.defaultView ?? undefined)}
    />);
  }

  async onOpen(): Promise<void> {
    await super.onOpen();
    this.contentEl.empty();
    this.contentEl.addClass("excalibrain-view-host");
    this.contentEl.toggleClass("kplex-sidepanel-host", this.getSurface() === "sidepanel");
    if (typeof this.containerEl.onWindowMigrated === "function") {
      this.windowMigrationCleanup = this.containerEl.onWindowMigrated(() => this.renderReact());
    }
    this.renderReact();
    this.markReady();
    // View construction/reveal must never wait for a potentially long initial index. On mobile,
    // awaiting the build here makes the sidepanel appear not to open at all and can keep
    // setViewState() pending long enough for the WebView to look hung. Render the indexing state
    // immediately, then let the index publish asynchronously into the mounted React view.
    void this.plugin.onKplexViewOpened(this.leaf).catch((error) => console.error("K-Plex view initialization failed", error));
  }

  async onClose(): Promise<void> {
    this.windowMigrationCleanup?.();
    this.windowMigrationCleanup = null;
    this.root?.unmount();
    this.root = null;
    this.ready = false;
    for (const resolve of this.readyResolvers.splice(0)) resolve();
    this.plugin.onKplexViewClosed(this.leaf);
    await super.onClose();
  }
}

export class ExcaliBrainView extends BaseKplexView {
  getViewType(): string { return EXCALIBRAIN_VIEW_TYPE; }
  protected getSurface(): KplexViewSurface {
    // A regular leaf can migrate into a popout. Its document lives in a different window then.
    return this.contentEl.ownerDocument.defaultView === window ? "leaf" : "popout";
  }
}

export class KplexSidepanelView extends BaseKplexView {
  getViewType(): string { return KPLEX_SIDEPANEL_VIEW_TYPE; }
  protected getSurface(): KplexViewSurface { return "sidepanel"; }
}
