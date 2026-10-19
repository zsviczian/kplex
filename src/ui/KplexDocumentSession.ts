/**
 * One native Plex incarnation owns document-sync intent and pending host operations. Only the
 * explicitly projected scalar state enters native workspace persistence; native leaves, requests
 * and the session trail never enter plugin settings. React/window remounts retain this owner.
 */
import type { TFile, WorkspaceLeaf } from "obsidian";
import type { KplexSettings } from "../settings";
import { PlexFootprints } from "../application/PlexFootprints";

export type DocumentPreferences = Pick<KplexSettings, "documentSyncMode" | "sidecarOpen" | "sidecarPosition" | "sidecarLastFilePath" | "sidecarLastUrl" | "sidecarMarkdownMode">;
export type DocumentFollowIntent = Readonly<{file: TFile; leaf: WorkspaceLeaf; revision: number}>;
export type DocumentUrlFollowIntent = Readonly<{url: string; leaf: WorkspaceLeaf; revision: number}>;

/** Isolate the host's undocumented ID getter and verify it through the installed public lookup. */
export function nativeLeafId(workspace: {getLeafById(id: string): WorkspaceLeaf | null}, leaf: WorkspaceLeaf): string | null {
  const id: unknown = Reflect.get(leaf, "id");
  return typeof id === "string" && workspace.getLeafById(id) === leaf ? id : null;
}

export class KplexDocumentSession {
  readonly footprints = new PlexFootprints();
  linkedDocumentLeaf: WorkspaceLeaf | null = null;
  lastDocumentLeaf: WorkspaceLeaf | null = null;
  centerPath: string | null = null;
  targetId: string | null = null;
  restored = false;
  initialized = false;
  private readonly restoreListeners = new Set<() => void>();
  disposed = false;
  revision = 0;
  restoreTask: Promise<void> | null = null;
  restoreAttempted = false;
  suppression: {path: string; until: number} | null = null;
  pendingFollow: DocumentFollowIntent | null = null;
  pendingUrl: DocumentUrlFollowIntent | null = null;
  readonly preferences: DocumentPreferences;

  /** New views inherit defaults, never another view's managed association or pinned target. */
  constructor(defaults: DocumentPreferences, readonly ownerId: string | null, private readonly changed: () => void) {
    this.preferences = {documentSyncMode: defaults.documentSyncMode === "pinned" ? "off" : defaults.documentSyncMode,
      sidecarOpen: false, sidecarPosition: defaults.sidecarPosition, sidecarLastFilePath: "", sidecarLastUrl: "",
      sidecarMarkdownMode: defaults.sidecarMarkdownMode};
  }

  /** Save only durable intent through Obsidian's workspace writer, without a settings write. */
  persist(): void { if (!this.disposed) this.changed(); }

  /** Initial native setState may arrive after React mounts; retain an exact completion subscription. */
  subscribeRestoration = (listener: () => void): (() => void) => {this.restoreListeners.add(listener);return () => this.restoreListeners.delete(listener);};

  /** Native serialization is an allowlist; ephemeral operations and trail values are excluded. */
  getState(): Record<string, unknown> {
    return {version: 1, ownerId: this.ownerId, centerPath: this.centerPath, targetId: this.targetId, ...this.preferences};
  }

  /** Restore validated scalar intent. A duplicated native leaf may copy its center, never its claim. */
  restore(value: unknown): void {
    if (this.initialized || this.disposed) return;
    this.initialized = true;
    try {this.restoreInitialState(value);} finally {for (const listener of this.restoreListeners) listener();}
  }

  /** Decode only the first native state for this incarnation, never replay another surface's live ownership. */
  private restoreInitialState(value: unknown): void {
    if (!value || typeof value !== "object" || Reflect.get(value, "version") !== 1) return;
    const center: unknown = Reflect.get(value, "centerPath");
    if (typeof center === "string" && center) this.centerPath = center;
    this.restored = true;
    if (!this.ownerId || Reflect.get(value, "ownerId") !== this.ownerId) return;
    const mode: unknown = Reflect.get(value, "documentSyncMode"), position: unknown = Reflect.get(value, "sidecarPosition");
    if (mode === "off" || mode === "recent" || mode === "pinned") this.preferences.documentSyncMode = mode;
    if (position === "left" || position === "right" || position === "above" || position === "below") this.preferences.sidecarPosition = position;
    this.preferences.sidecarOpen = Reflect.get(value, "sidecarOpen") === true;
    const markdown: unknown = Reflect.get(value, "sidecarMarkdownMode");
    if (markdown === "source" || markdown === "preview") this.preferences.sidecarMarkdownMode = markdown;
    for (const key of ["sidecarLastFilePath", "sidecarLastUrl"] as const) {
      const item: unknown = Reflect.get(value, key); if (typeof item === "string") this.preferences[key] = item;
    }
    const target: unknown = Reflect.get(value, "targetId");
    this.targetId = typeof target === "string" ? target : null;
  }

  /** Retire await completions on ownership changes, without pretending native opens are cancellable. */
  retire(): void { this.revision++; this.pendingFollow = null; this.pendingUrl = null; }

  /** Actual view close ends this incarnation; same-view React/window remounts do not call this. */
  dispose(): void { this.disposed = true; this.retire(); this.linkedDocumentLeaf = null; this.lastDocumentLeaf = null; this.footprints.dispose(); this.restoreListeners.clear(); }
}
