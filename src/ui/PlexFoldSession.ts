/** One ephemeral native tab-group fold. Captured DOM ownership is reversible even after detach;
 * no workspace model, native document, graph or persisted setting is modified by this lease. */
import { setIcon, type WorkspaceLeaf } from "obsidian";
import type { SidecarPosition } from "../settings";
import type { KplexView } from "./KplexView";
import { installKplexLongPressTooltips } from "./LongPressTooltip";

const identities = new WeakMap<object, number>();
let identitySequence = 0;

/** Memoize nonpersistent identity only; checks never modify native DOM/workspace/settings. */
export function plexFoldIdentity(value: object): number {
  let identity = identities.get(value);
  if (identity === undefined) { identity = ++identitySequence; identities.set(value, identity); }
  return identity;
}

/** Host-only capture; portable action routing receives its opaque token and window identity. */
export type PlexFoldCandidate = Readonly<{
  token: string; hostLeaf: WorkspaceLeaf; sidecarLeaf: WorkspaceLeaf; hostView: KplexView;
  generation: number; hostGroup: HTMLElement; sidecarGroup: HTMLElement; split: HTMLElement;
  ancestors: readonly HTMLElement[]; sidecarView: WorkspaceLeaf["view"]; sidecarType: string;
  /** Observed allocation only. Folding never writes native flex bases or persisted dimensions. */
  hostShare: number | null;
  recoveryHost: HTMLElement; ownerWindow: Window; position: SidecarPosition; folded: boolean;
  session?: PlexFoldSession;
}>;

/** Recovery capability and the exact native elements hidden by one committed fold. */
export class PlexFoldSession {
  readonly hostGroup: HTMLElement;
  readonly sidecarLeaf: WorkspaceLeaf;
  readonly position: SidecarPosition;
  private button: HTMLButtonElement | null = null;
  /** Expose the installed native recovery capability without allowing ownership replacement. */
  get unfoldButton(): HTMLButtonElement | null { return this.button; }
  private releaseTooltip: (() => void) | null = null;
  private observer: MutationObserver | null = null;
  private retired = false;
  private readonly hadRecoveryClass: boolean;
  private readonly pagehide: () => void;

  /** Install recovery before hiding. Failed installation rolls back through the same cleanup. */
  constructor(readonly candidate: PlexFoldCandidate, label: string,
    private readonly current: () => boolean, restore: () => void, unfold: () => void) {
    this.hostGroup = candidate.hostGroup;
    this.sidecarLeaf = candidate.sidecarLeaf;
    this.position = candidate.position;
    this.hadRecoveryClass = candidate.recoveryHost.classList.contains("kplex-fold-recovery-host");
    this.pagehide = restore;
    try {
      candidate.recoveryHost.classList.add("kplex-fold-recovery-host");
      const button = this.button = candidate.recoveryHost.createEl("button", { cls: "kplex-sidecar-unfold-plex" });
      button.type = "button";
      button.setAttribute("aria-label", label);
      button.setAttribute("data-kplex-tooltip-scope", "");
      const side = candidate.position === "right" ? "left" : candidate.position === "left" ? "right"
        : candidate.position === "above" ? "bottom" : "top";
      button.classList.add(`is-${side}`);
      setIcon(button, `panel-${side}-open`);
      button.addEventListener("click", /** A detached stale button cannot unfold its successor. */ () => {
        if (!this.retired) unfold();
      });
      this.releaseTooltip = installKplexLongPressTooltips(candidate.hostGroup.ownerDocument);
      candidate.ownerWindow.addEventListener("pagehide", this.pagehide);
      const Observer = (candidate.ownerWindow as Window & { MutationObserver: typeof MutationObserver }).MutationObserver;
      this.observer = new Observer(/** Observe native wrapper/control replacement only, never editor text. */ () => {
        if (this.retired) return;
        if (!this.current()) { restore(); return; }
        if (button.parentElement !== candidate.recoveryHost) candidate.recoveryHost.appendChild(button);
      });
      this.observer.observe(candidate.sidecarGroup, { childList: true });
      this.observer.observe(candidate.recoveryHost, { childList: true });
    } catch (error) { this.dispose(); throw error; }
  }

  /** Commit only after its host inventory owns this session and recovery is actually connected. */
  hide(): boolean {
    if (this.retired || !this.button?.isConnected || !this.current()
      || this.hostGroup.hasAttribute("data-kplex-fold-owner") || this.hostGroup.classList.contains("kplex-folded-workspace-group")) return false;
    this.hostGroup.setAttribute("data-kplex-fold-owner", this.candidate.token);
    this.hostGroup.classList.add("kplex-folded-workspace-group");
    return this.candidate.ownerWindow.getComputedStyle(this.hostGroup).display === "none";
  }

  /** Remove only this session's effects, including captured detached DOM and old-window leases. */
  dispose(): void {
    if (this.retired) return;
    this.retired = true;
    this.observer?.disconnect(); this.observer = null;
    this.candidate.ownerWindow.removeEventListener("pagehide", this.pagehide);
    this.releaseTooltip?.(); this.releaseTooltip = null;
    this.button?.remove(); this.button = null;
    if (!this.hadRecoveryClass) this.candidate.recoveryHost.classList.remove("kplex-fold-recovery-host");
    if (this.hostGroup.getAttribute("data-kplex-fold-owner") === this.candidate.token) {
      this.hostGroup.classList.remove("kplex-folded-workspace-group");
      this.hostGroup.removeAttribute("data-kplex-fold-owner");
    }
  }
}
