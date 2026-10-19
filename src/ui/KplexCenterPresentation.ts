/** One native Plex leaf owns its center representation, including across React/window remounts. */
import type { KplexSettings, SidecarMarkdownMode } from "../settings";

export type CenterPresentation = Readonly<{embedCentralNode: boolean; centralNodeMarkdownMode: SidecarMarkdownMode}>;

/** Device/profile settings inherit their remaining fields; a spread would silently drop those fields. */
export function centerViewSettings(settings: KplexSettings, presentation: CenterPresentation): KplexSettings {
  return Object.assign(Object.create(settings) as KplexSettings, presentation);
}

export class KplexCenterPresentation {
  private readonly listeners = new Set<() => void>();
  private state: CenterPresentation;
  constructor(initial: CenterPresentation, private readonly changed: () => void) {
    this.state = {embedCentralNode: initial.embedCentralNode, centralNodeMarkdownMode: initial.centralNodeMarkdownMode};
  }
  getSnapshot = (): CenterPresentation => this.state;
  subscribe = (listener: () => void): (() => void) => {this.listeners.add(listener);return () => this.listeners.delete(listener);};

  /** Native workspace persistence replaces a plugin-wide settings write for explicit view toggles. */
  update(next: Partial<CenterPresentation>): void {this.apply({...this.state, ...next}, true);}

  /** Older workspaces inherit the existing defaults; malformed/future data cannot invent a mode. */
  restore(value: unknown): void {
    if (!value || typeof value !== "object") return;
    const data = value as Partial<CenterPresentation>;
    this.apply({embedCentralNode: typeof data.embedCentralNode === "boolean" ? data.embedCentralNode : this.state.embedCentralNode,
      centralNodeMarkdownMode: data.centralNodeMarkdownMode === "source" || data.centralNodeMarkdownMode === "preview" ? data.centralNodeMarkdownMode : this.state.centralNodeMarkdownMode}, false);
  }

  private apply(next: CenterPresentation, persist: boolean): void {
    if (next.embedCentralNode === this.state.embedCentralNode && next.centralNodeMarkdownMode === this.state.centralNodeMarkdownMode) return;
    this.state = next;
    for (const listener of this.listeners) listener();
    if (persist) this.changed();
  }
}
