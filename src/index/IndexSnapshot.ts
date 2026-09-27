import { TFile, TFolder, type App } from "obsidian";
import type { ExcaliBrainSettings } from "../settings";
import { LinkDirection, RelationType, type GraphPage, type Relation } from "../types";
import { createGraphState, type GraphState } from "./GraphState";
import { resolveEvidenceStore, resolveEvidenceStoreCooperative } from "./RelationResolver";
import type { EvidenceProvenance, EvidenceRole, RelationEvidence } from "./RelationEvidence";

export const INDEX_SNAPSHOT_VERSION = 1;

export type PersistedRelation = {
  targetPath: string;
  direction: LinkDirection | null;
  isHidden: boolean;
  isParent: boolean;
  parentType?: RelationType;
  parentTypeDefinition?: string;
  isChild: boolean;
  childType?: RelationType;
  childTypeDefinition?: string;
  isLeftFriend: boolean;
  leftFriendType?: RelationType;
  leftFriendTypeDefinition?: string;
  isRightFriend: boolean;
  rightFriendType?: RelationType;
  rightFriendTypeDefinition?: string;
  isNextFriend: boolean;
  nextFriendType?: RelationType;
  nextFriendTypeDefinition?: string;
  isPreviousFriend: boolean;
  previousFriendType?: RelationType;
  previousFriendTypeDefinition?: string;
};

export type PersistedPage = {
  path: string;
  filePath: string | null;
  name: string;
  url: string | null;
  isFolder: boolean;
  isTag: boolean;
  mtime: number | null;
  aliases: string[];
  tags: string[];
  noteType: string | null;
  primaryStyleTag: string | null;
  styleTags: string[];
  maxLabelLength: number;
  /** Compact semantic fingerprint for edit no-op detection after a warm restore. Optional for old snapshots. */
  semanticSignature?: string;
  /** Cached resolved neighbours. Optional so v1/early IndexedDB snapshots still migrate cleanly. */
  relations?: PersistedRelation[];
};

export type PersistedEvidenceDeclaration = EvidenceProvenance & {
  sourcePath: string;
  targetPath: string;
  role: EvidenceRole;
  relationType: RelationType;
  direction: LinkDirection;
};

export type PersistedIndexSnapshot = {
  version: 1;
  createdAt: number;
  vaultSignature: string;
  settingsSignature: string;
  pages: PersistedPage[];
  evidence: PersistedEvidenceDeclaration[];
  discoveredFields: Array<[string, { name: string; count: number }]>;
};

/** Chunked v2 cache manifest. Chunk files are generation-scoped and the manifest is written last,
 * so a crash during persistence can never replace a previously valid cache with a half-written one. */
export type PersistedIndexManifestV2 = {
  version: 2;
  createdAt: number;
  generation: string;
  vaultSignature: string;
  settingsSignature: string;
  pageChunkCount: number;
  evidenceChunkCount: number;
  discoveredFields: Array<[string, { name: string; count: number }]>;
};

function hashText(hash: number, text: string): number {
  let next = hash >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    next ^= text.charCodeAt(i);
    next = Math.imul(next, 16777619) >>> 0;
  }
  return next;
}

/**
 * Cheap deterministic marker for the physical vault tree. It intentionally includes attachments
 * and empty folders because both participate in the K-Plex file tree. Computing it is O(number of
 * vault entries), but it performs no file reads and is dramatically cheaper than rebuilding.
 */
export function computeVaultSignature(app: App): string {
  let hash = 2166136261 >>> 0;
  let count = 0;
  const stack: TFolder[] = [app.vault.getRoot()];
  while (stack.length) {
    const folder = stack.pop()!;
    hash = hashText(hash, `D\0${folder.path}\0`);
    count += 1;
    const children = [...folder.children].sort((a, b) => a.path.localeCompare(b.path));
    for (const child of children) {
      if (child instanceof TFolder) {
        stack.push(child);
        continue;
      }
      if (!(child instanceof TFile)) continue;
      hash = hashText(hash, `F\0${child.path}\0${child.stat.mtime}\0${child.stat.size}\0`);
      count += 1;
    }
  }
  return `${count}:${hash.toString(16).padStart(8, "0")}`;
}

/** Settings that alter the semantic graph, rather than only presentation. */
export function computeIndexSettingsSignature(settings: ExcaliBrainSettings): string {
  return JSON.stringify({
    schema: INDEX_SNAPSHOT_VERSION,
    hierarchy: settings.hierarchy,
    inferAllLinksAsFriends: settings.inferAllLinksAsFriends,
    inverseInfer: settings.inverseInfer,
    excalibrainFilepath: settings.excalibrainFilepath,
    showFullTagName: settings.showFullTagName,
    noteTypeField: settings.noteTypeField,
    primaryTagField: settings.primaryTagField,
    tagStyleList: settings.tagStyleList,
    maxLabelLength: settings.baseNodeStyle.maxLabelLength ?? 30,
  });
}

export function persistedDeclarationFromEvidence(item: RelationEvidence): PersistedEvidenceDeclaration {
  return {
    sourcePath: item.declaredByPath,
    targetPath: item.declaredTargetPath,
    role: item.declaredRole,
    relationType: item.relationType,
    direction: item.sourcePath === item.declaredByPath ? item.direction : (
      item.direction === LinkDirection.FROM ? LinkDirection.TO :
        item.direction === LinkDirection.TO ? LinkDirection.FROM : item.direction
    ),
    sourceKind: item.sourceKind,
    definition: item.definition,
    fieldName: item.fieldName,
    rawValue: item.rawValue,
    line: item.line,
    start: item.start,
    end: item.end,
  };
}

const persistedRelationFromRelation = (targetPath: string, relation: Relation): PersistedRelation => ({
  targetPath,
  direction: relation.direction,
  isHidden: relation.isHidden,
  isParent: relation.isParent,
  parentType: relation.parentType,
  parentTypeDefinition: relation.parentTypeDefinition,
  isChild: relation.isChild,
  childType: relation.childType,
  childTypeDefinition: relation.childTypeDefinition,
  isLeftFriend: relation.isLeftFriend,
  leftFriendType: relation.leftFriendType,
  leftFriendTypeDefinition: relation.leftFriendTypeDefinition,
  isRightFriend: relation.isRightFriend,
  rightFriendType: relation.rightFriendType,
  rightFriendTypeDefinition: relation.rightFriendTypeDefinition,
  isNextFriend: relation.isNextFriend,
  nextFriendType: relation.nextFriendType,
  nextFriendTypeDefinition: relation.nextFriendTypeDefinition,
  isPreviousFriend: relation.isPreviousFriend,
  previousFriendType: relation.previousFriendType,
  previousFriendTypeDefinition: relation.previousFriendTypeDefinition,
});

export function persistedPageFromGraphPage(page: GraphPage, semanticSignature?: string): PersistedPage {
  return {
    path: page.path,
    filePath: page.file?.path ?? null,
    name: page.name,
    url: page.url,
    isFolder: page.isFolder,
    isTag: page.isTag,
    mtime: page.mtime,
    aliases: [...page.aliases],
    tags: [...page.tags],
    noteType: page.noteType,
    primaryStyleTag: page.primaryStyleTag,
    styleTags: [...page.styleTags],
    maxLabelLength: page.maxLabelLength,
    ...(semanticSignature ? { semanticSignature } : {}),
    relations: [...page.neighbours.entries()].map(([targetPath, relation]) => persistedRelationFromRelation(targetPath, relation)),
  };
}

export function serializeGraphState(
  state: GraphState,
  app: App,
  settings: ExcaliBrainSettings,
): PersistedIndexSnapshot {
  const pages: PersistedPage[] = [];
  for (const page of state.pages.values()) {
    if (page.transient) continue;
    pages.push(persistedPageFromGraphPage(page));
  }

  // RelationEvidenceStore retains each original fact once and derives inverse perspectives on
  // demand. Persist those original declarations directly; runtime inverse evidence is recreated
  // by the store when a relationship is queried.
  const evidence: PersistedEvidenceDeclaration[] = [];
  for (const item of state.evidence.declarations()) evidence.push(persistedDeclarationFromEvidence(item));

  return {
    version: INDEX_SNAPSHOT_VERSION,
    createdAt: Date.now(),
    vaultSignature: computeVaultSignature(app),
    settingsSignature: computeIndexSettingsSignature(settings),
    pages,
    evidence,
    discoveredFields: [...state.discoveredFields.entries()],
  };
}

export function resolvePersistedPageFile(app: App, page: PersistedPage): TFile | null {
  const path = page.filePath ?? (!page.isFolder && !page.isTag && !page.url ? page.path : null);
  if (!path) return null;
  const candidate = app.vault.getAbstractFileByPath(path);
  return candidate instanceof TFile ? candidate : null;
}

export function addPersistedPageToState(state: GraphState, saved: PersistedPage, app: App): void {
  const file = resolvePersistedPageFile(app, saved);
  const page: GraphPage = {
    path: saved.path,
    file,
    name: saved.name,
    url: saved.url,
    isFolder: saved.isFolder,
    isTag: saved.isTag,
    // Keep the mtime captured when the snapshot was written. GraphIndex uses this marker to
    // identify the handful of Markdown notes that changed while K-Plex was closed and can patch
    // those files without throwing away/rebuilding a 20k-note semantic graph.
    mtime: saved.mtime,
    neighbours: new Map(),
    aliases: [...saved.aliases],
    tags: [...saved.tags],
    noteType: saved.noteType,
    primaryStyleTag: saved.primaryStyleTag,
    styleTags: [...saved.styleTags],
    maxLabelLength: saved.maxLabelLength,
  };
  state.pages.set(page.path, page);
  state.lowercasePathMap.set(page.path.toLowerCase(), page.path);
}

/** Restore one already-resolved neighbour map without replaying the relationship truth table.
 * Evidence is restored separately for explainability/editing. */
export function hydratePersistedPageRelations(state: GraphState, saved: PersistedPage): boolean {
  if (!Array.isArray(saved.relations)) return false;
  const source = state.pages.get(saved.path);
  if (!source) return true;
  source.neighbours.clear();
  for (const persisted of saved.relations) {
    const target = state.pages.get(persisted.targetPath);
    if (!target) continue;
    source.neighbours.set(persisted.targetPath, {
      target,
      direction: persisted.direction,
      isHidden: persisted.isHidden,
      isParent: persisted.isParent,
      parentType: persisted.parentType,
      parentTypeDefinition: persisted.parentTypeDefinition,
      isChild: persisted.isChild,
      childType: persisted.childType,
      childTypeDefinition: persisted.childTypeDefinition,
      isLeftFriend: persisted.isLeftFriend,
      leftFriendType: persisted.leftFriendType,
      leftFriendTypeDefinition: persisted.leftFriendTypeDefinition,
      isRightFriend: persisted.isRightFriend,
      rightFriendType: persisted.rightFriendType,
      rightFriendTypeDefinition: persisted.rightFriendTypeDefinition,
      isNextFriend: persisted.isNextFriend,
      nextFriendType: persisted.nextFriendType,
      nextFriendTypeDefinition: persisted.nextFriendTypeDefinition,
      isPreviousFriend: persisted.isPreviousFriend,
      previousFriendType: persisted.previousFriendType,
      previousFriendTypeDefinition: persisted.previousFriendTypeDefinition,
    });
  }
  return true;
}

export function hydratePersistedRelations(state: GraphState, pages: Iterable<PersistedPage>): boolean {
  let complete = true;
  for (const saved of pages) if (!hydratePersistedPageRelations(state, saved)) complete = false;
  return complete;
}

export function addPersistedEvidenceToState(state: GraphState, declaration: PersistedEvidenceDeclaration): void {
  const provenance: EvidenceProvenance = {
    sourceKind: declaration.sourceKind,
    definition: declaration.definition,
    fieldName: declaration.fieldName,
    rawValue: declaration.rawValue,
    line: declaration.line,
    start: declaration.start,
    end: declaration.end,
  };
  state.evidence.addDeclaration(
    declaration.sourcePath, declaration.targetPath, declaration.role,
    declaration.relationType, declaration.direction, provenance,
  );
}

export async function finalizeHydratedGraphStateCooperative(
  state: GraphState,
  isCurrent: () => boolean = () => true,
  batchSize = 240,
  onProgress?: () => void,
): Promise<boolean> {
  return resolveEvidenceStoreCooperative(state.pages, state.evidence, isCurrent, batchSize, onProgress);
}

export function hydrateGraphState(snapshot: PersistedIndexSnapshot, app: App): GraphState {
  const state = createGraphState();
  for (const saved of snapshot.pages) addPersistedPageToState(state, saved, app);
  for (const declaration of snapshot.evidence) addPersistedEvidenceToState(state, declaration);
  state.discoveredFields = new Map(snapshot.discoveredFields);
  if (!hydratePersistedRelations(state, snapshot.pages)) resolveEvidenceStore(state.pages, state.evidence);
  return state;
}

export function isPersistedIndexSnapshot(value: unknown): value is PersistedIndexSnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PersistedIndexSnapshot>;
  return candidate.version === INDEX_SNAPSHOT_VERSION &&
    typeof candidate.vaultSignature === "string" &&
    typeof candidate.settingsSignature === "string" &&
    Array.isArray(candidate.pages) && Array.isArray(candidate.evidence) && Array.isArray(candidate.discoveredFields);
}

export function isPersistedIndexManifestV2(value: unknown): value is PersistedIndexManifestV2 {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PersistedIndexManifestV2>;
  return candidate.version === 2 &&
    typeof candidate.createdAt === "number" &&
    typeof candidate.generation === "string" &&
    typeof candidate.vaultSignature === "string" &&
    typeof candidate.settingsSignature === "string" &&
    Number.isInteger(candidate.pageChunkCount) && Number(candidate.pageChunkCount) >= 0 &&
    Number.isInteger(candidate.evidenceChunkCount) && Number(candidate.evidenceChunkCount) >= 0 &&
    Array.isArray(candidate.discoveredFields);
}
