import {
  AbstractInputSuggest,
  App,
  Modal,
  Notice,
  PluginSettingTab,
  getIcon,
  getIconIds,
  type SettingDefinitionItem,
} from "obsidian";
import type ExcaliBrainPlugin from "./main";
import type { Arrowhead, Hierarchy, LinkStyle, NodeStyle } from "./types";
import { sanitizeGraphLensDefinitions, type GraphLensDefinition } from "./lens/GraphLens";
import { collectionWindow } from "./ui/components/collectionWindow";
import { createObsidianTranslator } from "./adapters/obsidian/localization";

export const DEFAULT_LINK_STYLE: LinkStyle = {
  strokeColor: "#696969ff",
  strokeWidth: 1,
  strokeStyle: "solid",
  roughness: 0,
  startArrowHead: "none",
  endArrowHead: "none",
  showLabel: false,
  fontSize: 10,
  fontFamily: 3,
  textColor: "#ffffffff"
};

export const DEFAULT_NODE_STYLE: NodeStyle = {
  prefix: "",
  backgroundColor: "#00000066",
  fillStyle: "solid",
  textColor: "#ffffffff",
  borderColor: "#00000000",
  fontSize: 20,
  fontFamily: 3,
  maxLabelLength: 30,
  roughness: 0,
  strokeShaprness: "round",
  strokeWidth: 1,
  strokeStyle: "solid",
  padding: 10,
  gateRadius: 5,
  gateOffset: 15,
  gateStrokeColor: "#ffffffff",
  gateBackgroundColor: "#ffffffff",
  gateFillStyle: "solid"
};

export const DEFAULT_HIERARCHY_DEFINITION: Hierarchy = {
  exclusions: [
    "excalidraw-font", "excalidraw-font-color", "excalidraw-css", "excalidraw-plugin",
    "excalidraw-link-brackets", "excalidraw-link-prefix", "excalidraw-border-color", "excalidraw-default-mode",
    "excalidraw-export-dark", "excalidraw-export-transparent", "excalidraw-export-svgpadding", "excalidraw-export-pngscale",
    "excalidraw-url-prefix", "excalidraw-linkbutton-opacity", "excalidraw-onload-script", "kanban-plugin"
  ],
  parents: ["Parent", "Parents", "up", "u", "North", "origin", "inception", "source", "parent domain"],
  children: ["Children", "Child", "down", "d", "South", "leads to", "contributes to", "nurtures"],
  leftFriends: ["Friends", "Friend", "Jump", "Jumps", "j", "similar", "supports", "alternatives", "advantages", "pros"],
  rightFriends: ["Challenger", "opposes", "disadvantages", "missing", "cons"],
  previous: ["Previous", "Prev", "West", "w", "Before"],
  next: ["Next", "n", "East", "e", "After"],
  hidden: ["hidden"]
};

export type KplexViewSurface = "leaf" | "sidepanel" | "popout";
export type KplexDeviceClass = "desktop" | "tablet" | "mobile";
export type MouseInteractionMode = "smart" | "legacy" | "middle-only";
export type SidecarPosition = "right" | "left" | "above" | "below";
export type SidecarMarkdownMode = "preview" | "source";
export type AttachmentImageDisplay = "label" | "thumbnail-label" | "image";
export type NewNodeType = "markdown" | "excalidraw";
export type DocumentSyncMode = "off" | "recent" | "pinned";
export type NodeSortOrder = "name-asc" | "name-desc" | "modified-desc" | "modified-asc" | "created-desc" | "created-asc" | "connections-desc" | "connections-asc";

function sanitizeNodeSortOrder(value: unknown): NodeSortOrder {
  switch (value) {
    case "name-asc":
    case "name-desc":
    case "modified-desc":
    case "modified-asc":
    case "created-desc":
    case "created-asc":
    case "connections-desc":
    case "connections-asc":
      return value;
    default:
      return "name-asc";
  }
}
export type KplexLayoutProfile = {
  compactingFactor: number;
  parentColumns: number;
  childColumns: number;
};

export const DEFAULT_LAYOUT_PROFILES: Record<string, KplexLayoutProfile> = {
  "desktop:leaf": { compactingFactor: 2, parentColumns: 2, childColumns: 5 },
  "desktop:popout": { compactingFactor: 2, parentColumns: 2, childColumns: 5 },
  "desktop:sidepanel": { compactingFactor: 2.65, parentColumns: 1, childColumns: 2 },
  "tablet:leaf": { compactingFactor: 2.25, parentColumns: 2, childColumns: 4 },
  "tablet:popout": { compactingFactor: 2.25, parentColumns: 2, childColumns: 4 },
  "tablet:sidepanel": { compactingFactor: 2.7, parentColumns: 1, childColumns: 2 },
  "mobile:leaf": { compactingFactor: 2.55, parentColumns: 1, childColumns: 2 },
  "mobile:popout": { compactingFactor: 2.55, parentColumns: 1, childColumns: 2 },
  "mobile:sidepanel": { compactingFactor: 2.85, parentColumns: 1, childColumns: 2 },
};

export interface ExcaliBrainSettings {
  compactView: boolean;
  compactingFactor: number;
  minLinkLength: number;
  excalibrainFilepath: string;
  indexUpdateInterval: number;
  hierarchy: Hierarchy;
  inferAllLinksAsFriends: boolean;
  inverseInfer: boolean;
  inverseArrowDirection: boolean;
  renderAlias: boolean;
  /** Ordered comma-separated frontmatter fields used as display-name fallbacks. */
  nameFields: string;
  nodeTitleScript: string;
  backgroundColor: string;
  excludeFilepaths: string[];
  autoOpenCentralDocument: boolean;
  toggleEmbedTogglesAutoOpen: boolean;
  showInferredNodes: boolean;
  showAttachments: boolean;
  showURLNodes: boolean;
  showVirtualNodes: boolean;
  showFolderNodes: boolean;
  showTagNodes: boolean;
  showPageNodes: boolean;
  showNeighborCount: boolean;
  showFullTagName: boolean;
  maxItemCount: number;
  renderSiblings: boolean;
  /** Relative layout scale applied to sibling nodes and their expanded descendants, as a percentage. */
  siblingRelativeSize: number;
  /** Opacity applied to non-highlighted cross-links, as a percentage. */
  crossLinkOpacity: number;
  applyPowerFilter: boolean;
  baseNodeStyle: NodeStyle;
  centralNodeStyle: NodeStyle;
  inferredNodeStyle: NodeStyle;
  urlNodeStyle: NodeStyle;
  virtualNodeStyle: NodeStyle;
  siblingNodeStyle: NodeStyle;
  attachmentNodeStyle: NodeStyle;
  folderNodeStyle: NodeStyle;
  tagNodeStyle: NodeStyle;
  tagNodeStyles: Record<string, NodeStyle>;
  tagStyleList: string[];
  primaryTagField: string;
  primaryTagFieldLowerCase: string;
  displayAllStylePrefixes: boolean;
  baseLinkStyle: LinkStyle;
  inferredLinkStyle: LinkStyle;
  folderLinkStyle: LinkStyle;
  tagLinkStyle: LinkStyle;
  hierarchyLinkStyles: Record<string, LinkStyle>;
  navigationHistory: string[];
  allowOntologySuggester: boolean;
  ontologySuggesterParentTrigger: string;
  ontologySuggesterChildTrigger: string;
  ontologySuggesterLeftFriendTrigger: string;
  ontologySuggesterRightFriendTrigger: string;
  ontologySuggesterPreviousTrigger: string;
  ontologySuggesterNextTrigger: string;
  ontologySuggesterTrigger: string;
  ontologySuggesterMidSentenceTrigger: string;
  boldFields: boolean;
  allowAutozoom: boolean;
  allowAutofocuOnSearch: boolean;
  defaultAlwaysOnTop: boolean;
  embedCentralNode: boolean;
  centerEmbedWidth: number;
  centerEmbedHeight: number;
  // React/K-Plex additions. Existing ExcaliBrain data.json files simply omit these.
  showContentPane: boolean;
  followActiveFile: boolean;
  contentPaneWidth: number;
  graphDepth: 1 | 2;
  connectorStyle: "bezier" | "straight";
  /** Presentation-only order used within each visible Plex zone. */
  nodeSortOrder: NodeSortOrder;
  parentColumns: number;
  childColumns: number;
  friendMaxHeight: number;
  siblingMaxHeight: number;
  parentMaxHeight: number;
  childMaxHeight: number;
  noteTypeField: string;
  noteTypeStyles: Record<string, NodeStyle>;
  kplexInitialized: boolean;
  startInPopout: boolean;
  lastActivePath: string;
  pinnedNodes: string[];
  layoutProfiles: Record<string, KplexLayoutProfile>;
  mouseInteractionMode: MouseInteractionMode;
  toolbarExpanded: boolean;
  sidecarOpen: boolean;
  sidecarPosition: SidecarPosition;
  sidecarMarkdownMode: SidecarMarkdownMode;
  sidecarCondensedBreakpoint: number;
  /** Last document path shown in the managed sidecar. Used only to re-associate Obsidian's restored tab group. */
  sidecarLastFilePath: string;
  /** Last URL shown in the managed sidecar. Mutually exclusive with sidecarLastFilePath. */
  sidecarLastUrl: string;
  /** Remember the last ontology field used by each add-relationship action. */
  relationDefaultFields: { parent: string; child: string; left: string; right: string; previous: string; next: string };
  /** How K-Plex is paired with a note tab. */
  documentSyncMode: DocumentSyncMode;
  /** Animation speed multiplier: 0 disables motion; 1 is normal; 2 is very fast. */
  animationSpeed: number;
  /** Named local Graph Lenses. Definitions are persisted; evaluation is limited to the visible Plex. */
  graphLenses: GraphLensDefinition[];
  /** Frontmatter/Dataview-style property used for a small image before the node label. */
  thumbnailProperty: string;
  /** Frontmatter/Dataview-style property whose image replaces the node label. */
  nodeImageProperty: string;
  /** How image attachment nodes are rendered. */
  attachmentImageDisplay: AttachmentImageDisplay;
  /** Remember the Create Note dialog toggle between invocations. */
  editNewNodeAfterCreate: boolean;
  /** Remember which create button Ctrl/Cmd+Enter should invoke next time. */
  newNodeDefaultType: NewNodeType;
  /** Whether K-Plex has already shown the first-use delete confirmation/preferences prompt. */
  deletePromptInitialized: boolean;
  /** Ask for confirmation before deleting a real note file from the node context menu. */
  confirmFileDelete: boolean;
}

export const DEFAULT_SETTINGS: ExcaliBrainSettings = {
  compactView: false,
  compactingFactor: 2,
  minLinkLength: 18,
  excalibrainFilepath: "excalibrain.md",
  indexUpdateInterval: 60000,
  hierarchy: DEFAULT_HIERARCHY_DEFINITION,
  inferAllLinksAsFriends: false,
  inverseInfer: false,
  inverseArrowDirection: true,
  renderAlias: true,
  nameFields: "aliases",
  nodeTitleScript: "",
  backgroundColor: "#0c3e6aff",
  excludeFilepaths: [],
  autoOpenCentralDocument: true,
  toggleEmbedTogglesAutoOpen: true,
  showInferredNodes: true,
  showAttachments: true,
  showURLNodes: true,
  showVirtualNodes: true,
  showFolderNodes: false,
  showTagNodes: false,
  showPageNodes: true,
  showNeighborCount: true,
  showFullTagName: false,
  maxItemCount: 100,
  renderSiblings: false,
  siblingRelativeSize: 85,
  crossLinkOpacity: 85,
  applyPowerFilter: false,
  baseNodeStyle: DEFAULT_NODE_STYLE,
  centralNodeStyle: { fontSize: 30, backgroundColor: "#b5b5b5ff", textColor: "#000000ff" },
  inferredNodeStyle: { backgroundColor: "#000005b3", textColor: "#95c7f3ff" },
  urlNodeStyle: { icon: "globe" },
  virtualNodeStyle: { backgroundColor: "#ff000066", fillStyle: "hachure", textColor: "#ffffffff" },
  siblingNodeStyle: { fontSize: 15 },
  attachmentNodeStyle: { icon: "paperclip" },
  folderNodeStyle: { icon: "folder", strokeShaprness: "sharp", borderColor: "#ffd700ff", textColor: "#ffd700ff" },
  tagNodeStyle: { icon: "tag", strokeShaprness: "sharp", borderColor: "#4682b4ff", textColor: "#4682b4ff" },
  tagNodeStyles: {},
  tagStyleList: [],
  primaryTagField: "Note type",
  primaryTagFieldLowerCase: "note-type",
  displayAllStylePrefixes: true,
  baseLinkStyle: DEFAULT_LINK_STYLE,
  inferredLinkStyle: { strokeStyle: "dashed" },
  folderLinkStyle: { strokeColor: "#ffd700ff" },
  tagLinkStyle: { strokeColor: "#4682b4ff" },
  hierarchyLinkStyles: {},
  navigationHistory: [],
  allowOntologySuggester: true,
  ontologySuggesterParentTrigger: "::p",
  ontologySuggesterChildTrigger: "::c",
  ontologySuggesterLeftFriendTrigger: "::l",
  ontologySuggesterRightFriendTrigger: "::r",
  ontologySuggesterPreviousTrigger: "::e",
  ontologySuggesterNextTrigger: "::n",
  ontologySuggesterTrigger: ":::",
  ontologySuggesterMidSentenceTrigger: "(",
  boldFields: false,
  allowAutozoom: false,
  allowAutofocuOnSearch: true,
  defaultAlwaysOnTop: false,
  embedCentralNode: false,
  centerEmbedWidth: 550,
  centerEmbedHeight: 700,
  showContentPane: false,
  followActiveFile: true,
  contentPaneWidth: 38,
  graphDepth: 1,
  connectorStyle: "bezier",
  nodeSortOrder: "name-asc",
  parentColumns: 2,
  childColumns: 5,
  friendMaxHeight: 350,
  siblingMaxHeight: 250,
  parentMaxHeight: 300,
  childMaxHeight: 400,
  noteTypeField: "Note type",
  noteTypeStyles: {},
  kplexInitialized: false,
  startInPopout: false,
  lastActivePath: "",
  pinnedNodes: [],
  layoutProfiles: DEFAULT_LAYOUT_PROFILES,
  mouseInteractionMode: "smart",
  toolbarExpanded: false,
  sidecarOpen: false,
  sidecarPosition: "right",
  sidecarMarkdownMode: "source",
  sidecarCondensedBreakpoint: 560,
  sidecarLastFilePath: "",
  sidecarLastUrl: "",
  relationDefaultFields: { parent: "Parent", child: "Child", left: "Friend", right: "Challenger", previous: "Previous", next: "Next" },
  documentSyncMode: "off",
  animationSpeed: 0.5,
  graphLenses: [],
  thumbnailProperty: "thumbnail",
  nodeImageProperty: "node-image",
  attachmentImageDisplay: "thumbnail-label",
  editNewNodeAfterCreate: false,
  newNodeDefaultType: "markdown",
  deletePromptInitialized: false,
  confirmFileDelete: true
};

const norm = (value: string) => value.toLowerCase().replaceAll(" ", "-").trim();

function mergeLegacyIconStyle(defaultStyle: NodeStyle, saved: NodeStyle | undefined, legacyPrefix: string): NodeStyle {
  const merged = { ...defaultStyle, ...(saved ?? {}) };
  // Classic ExcaliBrain used emoji/text prefixes as built-in icons. K-Plex renders built-in
  // UI/node icons through Obsidian getIcon(), while preserving genuinely custom prefixes.
  if (merged.prefix === legacyPrefix) {
    delete merged.prefix;
    merged.icon ??= defaultStyle.icon;
  }
  return merged;
}

export function migrateAndMergeSettings(raw: unknown): ExcaliBrainSettings {
  const rawSettings = (raw && typeof raw === "object" ? raw : {}) as Partial<ExcaliBrainSettings> & { hierarchy?: Partial<Hierarchy>; maxZoom?: unknown };
  const { maxZoom: _legacyMaxZoom, ...old } = rawSettings;
  const hierarchyRaw: Partial<Hierarchy> = old.hierarchy ?? {};
  const hierarchy: Hierarchy = {
    ...DEFAULT_HIERARCHY_DEFINITION,
    ...hierarchyRaw,
    leftFriends: hierarchyRaw.leftFriends ?? hierarchyRaw.friends ?? DEFAULT_HIERARCHY_DEFINITION.leftFriends,
    rightFriends: hierarchyRaw.rightFriends ?? DEFAULT_HIERARCHY_DEFINITION.rightFriends,
    previous: hierarchyRaw.previous ?? DEFAULT_HIERARCHY_DEFINITION.previous,
    next: hierarchyRaw.next ?? DEFAULT_HIERARCHY_DEFINITION.next,
    hidden: hierarchyRaw.hidden ?? DEFAULT_HIERARCHY_DEFINITION.hidden,
    exclusions: hierarchyRaw.exclusions ?? DEFAULT_HIERARCHY_DEFINITION.exclusions
  };
  // K-Plex adds Challenger as the canonical right-gate ontology while retaining every
  // legacy right-friend field. Existing vaults therefore gain the requested default without
  // losing any ExcaliBrain ontology aliases.
  if (!hierarchy.rightFriends.some((field) => norm(field) === "challenger")) {
    hierarchy.rightFriends = ["Challenger", ...hierarchy.rightFriends];
  }

  // Mirror classic initializeHierarchy() precedence rules.
  const sortFields = (items: string[]) => [...items].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const normalized = (items: string[]) => items.map(norm);
  hierarchy.hidden = sortFields(hierarchy.hidden);
  hierarchy.parents = sortFields(hierarchy.parents);
  let master = [...normalized(hierarchy.hidden), ...normalized(hierarchy.parents)];
  const lowerPriority = (items: string[]) => {
    const output = sortFields(items.filter((item) => !master.includes(norm(item))));
    master = [...master, ...normalized(output)];
    return output;
  };
  hierarchy.children = lowerPriority(hierarchy.children);
  hierarchy.leftFriends = lowerPriority(hierarchy.leftFriends);
  hierarchy.rightFriends = lowerPriority(hierarchy.rightFriends);
  hierarchy.previous = lowerPriority(hierarchy.previous);
  hierarchy.next = lowerPriority(hierarchy.next);
  hierarchy.exclusions = sortFields(hierarchy.exclusions.filter((item) => !master.includes(norm(item))));

  const finite = (value: unknown, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const sanitizeProfile = (candidate: Partial<KplexLayoutProfile> | undefined, fallback: KplexLayoutProfile): KplexLayoutProfile => ({
    compactingFactor: Math.max(0.75, Math.min(4, finite(candidate?.compactingFactor, fallback.compactingFactor))),
    parentColumns: Math.max(1, Math.min(3, Math.round(finite(candidate?.parentColumns, fallback.parentColumns)))),
    childColumns: Math.max(1, Math.min(7, Math.round(finite(candidate?.childColumns, fallback.childColumns)))),
  });
  const legacyProfile = sanitizeProfile({
    compactingFactor: old.compactingFactor,
    parentColumns: old.parentColumns,
    childColumns: old.childColumns,
  }, DEFAULT_LAYOUT_PROFILES["desktop:leaf"]);
  const migratedProfiles = Object.fromEntries(
    Object.entries(DEFAULT_LAYOUT_PROFILES).map(([key, fallback]) => [
      key,
      sanitizeProfile(old.layoutProfiles?.[key], key === "desktop:leaf" || key === "desktop:popout" ? legacyProfile : fallback),
    ]),
  ) as Record<string, KplexLayoutProfile>;

  const oldSyncMode = old.documentSyncMode;
  const documentSyncMode: DocumentSyncMode = oldSyncMode === "recent" || oldSyncMode === "pinned" || oldSyncMode === "off"
    ? oldSyncMode
    : oldSyncMode === "kplex-to-leaf" || oldSyncMode === "leaf-to-kplex" || oldSyncMode === "two-way" || Boolean(old.autoOpenCentralDocument) || Boolean(old.followActiveFile)
      ? "recent" : "off";

  return {
    ...DEFAULT_SETTINGS,
    ...old,
    hierarchy,
    baseNodeStyle: { ...DEFAULT_NODE_STYLE, ...(old.baseNodeStyle ?? {}) },
    baseLinkStyle: { ...DEFAULT_LINK_STYLE, ...(old.baseLinkStyle ?? {}) },
    centralNodeStyle: { ...DEFAULT_SETTINGS.centralNodeStyle, ...(old.centralNodeStyle ?? {}) },
    inferredNodeStyle: { ...DEFAULT_SETTINGS.inferredNodeStyle, ...(old.inferredNodeStyle ?? {}) },
    urlNodeStyle: mergeLegacyIconStyle(DEFAULT_SETTINGS.urlNodeStyle, old.urlNodeStyle, "🌐 "),
    virtualNodeStyle: { ...DEFAULT_SETTINGS.virtualNodeStyle, ...(old.virtualNodeStyle ?? {}) },
    siblingNodeStyle: { ...DEFAULT_SETTINGS.siblingNodeStyle, ...(old.siblingNodeStyle ?? {}) },
    attachmentNodeStyle: mergeLegacyIconStyle(DEFAULT_SETTINGS.attachmentNodeStyle, old.attachmentNodeStyle, "📎 "),
    folderNodeStyle: mergeLegacyIconStyle(DEFAULT_SETTINGS.folderNodeStyle, old.folderNodeStyle, "📂 "),
    tagNodeStyle: mergeLegacyIconStyle(DEFAULT_SETTINGS.tagNodeStyle, old.tagNodeStyle, "#"),
    inferredLinkStyle: { ...DEFAULT_SETTINGS.inferredLinkStyle, ...(old.inferredLinkStyle ?? {}) },
    folderLinkStyle: { ...DEFAULT_SETTINGS.folderLinkStyle, ...(old.folderLinkStyle ?? {}) },
    tagLinkStyle: { ...DEFAULT_SETTINGS.tagLinkStyle, ...(old.tagLinkStyle ?? {}) },
    tagNodeStyles: old.tagNodeStyles ?? {},
    tagStyleList: old.tagStyleList ?? [],
    noteTypeStyles: old.noteTypeStyles ?? {},
    hierarchyLinkStyles: old.hierarchyLinkStyles ?? {},
    navigationHistory: old.navigationHistory ?? [],
    excludeFilepaths: old.excludeFilepaths ?? [],
    primaryTagFieldLowerCase: norm(old.primaryTagField ?? DEFAULT_SETTINGS.primaryTagField),
    connectorStyle: old.connectorStyle === "straight" ? "straight" : "bezier",
    nodeSortOrder: sanitizeNodeSortOrder(old.nodeSortOrder),
    graphDepth: old.graphDepth === 2 ? 2 : 1,
    parentColumns: legacyProfile.parentColumns,
    childColumns: legacyProfile.childColumns,
    maxItemCount: Math.max(10, Math.min(300, Number(old.maxItemCount ?? DEFAULT_SETTINGS.maxItemCount))),
    compactingFactor: legacyProfile.compactingFactor,
    friendMaxHeight: Math.max(120, Math.min(900, Number(old.friendMaxHeight ?? old.siblingMaxHeight ?? DEFAULT_SETTINGS.friendMaxHeight))),
    siblingMaxHeight: Math.max(120, Math.min(900, Number(old.siblingMaxHeight ?? DEFAULT_SETTINGS.siblingMaxHeight))),
    siblingRelativeSize: Math.max(30, Math.min(85, finite(old.siblingRelativeSize, DEFAULT_SETTINGS.siblingRelativeSize))),
    crossLinkOpacity: Math.max(0, Math.min(100, finite(old.crossLinkOpacity, DEFAULT_SETTINGS.crossLinkOpacity))),
    parentMaxHeight: Math.max(120, Math.min(900, Number(old.parentMaxHeight ?? DEFAULT_SETTINGS.parentMaxHeight))),
    childMaxHeight: Math.max(120, Math.min(900, Number(old.childMaxHeight ?? DEFAULT_SETTINGS.childMaxHeight))),
    noteTypeField: String(old.noteTypeField ?? DEFAULT_SETTINGS.noteTypeField),
    nameFields: String(old.nameFields ?? DEFAULT_SETTINGS.nameFields).trim() || DEFAULT_SETTINGS.nameFields,
    kplexInitialized: Boolean(old.kplexInitialized),
    startInPopout: Boolean(old.startInPopout),
    lastActivePath: String(old.lastActivePath ?? ""),
    pinnedNodes: Array.isArray(old.pinnedNodes) ? old.pinnedNodes.filter((value): value is string => typeof value === "string") : [],
    layoutProfiles: migratedProfiles,
    mouseInteractionMode: old.mouseInteractionMode === "legacy" || old.mouseInteractionMode === "middle-only" ? old.mouseInteractionMode : "smart",
    toolbarExpanded: Boolean(old.toolbarExpanded),
    sidecarOpen: Boolean(old.sidecarOpen),
    sidecarPosition: old.sidecarPosition === "left" || old.sidecarPosition === "above" || old.sidecarPosition === "below" ? old.sidecarPosition : "right",
    sidecarMarkdownMode: old.sidecarMarkdownMode === "preview" ? "preview" : "source",
    sidecarCondensedBreakpoint: Math.max(360, Math.min(900, finite(old.sidecarCondensedBreakpoint, 560))),
    sidecarLastFilePath: String(old.sidecarLastFilePath ?? ""),
    sidecarLastUrl: String(old.sidecarLastUrl ?? ""),
    relationDefaultFields: {
      parent: String(old.relationDefaultFields?.parent ?? DEFAULT_SETTINGS.relationDefaultFields.parent),
      child: String(old.relationDefaultFields?.child ?? DEFAULT_SETTINGS.relationDefaultFields.child),
      left: String(old.relationDefaultFields?.left ?? DEFAULT_SETTINGS.relationDefaultFields.left),
      right: String(old.relationDefaultFields?.right ?? DEFAULT_SETTINGS.relationDefaultFields.right),
      previous: String(old.relationDefaultFields?.previous ?? DEFAULT_SETTINGS.relationDefaultFields.previous),
      next: String(old.relationDefaultFields?.next ?? DEFAULT_SETTINGS.relationDefaultFields.next),
    },
    documentSyncMode,
    animationSpeed: Math.max(0, Math.min(2, finite(old.animationSpeed, 1))),
    graphLenses: sanitizeGraphLensDefinitions(old.graphLenses),
    thumbnailProperty: String(old.thumbnailProperty ?? DEFAULT_SETTINGS.thumbnailProperty).trim() || DEFAULT_SETTINGS.thumbnailProperty,
    nodeImageProperty: String(old.nodeImageProperty ?? DEFAULT_SETTINGS.nodeImageProperty).trim() || DEFAULT_SETTINGS.nodeImageProperty,
    attachmentImageDisplay: old.attachmentImageDisplay === "label" || old.attachmentImageDisplay === "image" ? old.attachmentImageDisplay : "thumbnail-label",
    editNewNodeAfterCreate: Boolean(old.editNewNodeAfterCreate),
    newNodeDefaultType: old.newNodeDefaultType === "excalidraw" ? "excalidraw" : "markdown",
    deletePromptInitialized: Boolean(old.deletePromptInitialized),
    confirmFileDelete: old.confirmFileDelete !== false,
    // Keep legacy flags coherent for imported settings and older code paths.
    autoOpenCentralDocument: documentSyncMode !== "off",
    followActiveFile: documentSyncMode !== "off",
  };
}

const csv = (value: string[]) => value.join(", ");
const fromCsv = (value: string) => value.split(",").map((x) => x.trim()).filter(Boolean);
const normalizeOntologyStyleKey = (value: string) => value.toLowerCase().replace(/\s+/g, "-").trim();
const normalizeNodeStyleValue = (value: string) => value.trim().replace(/^#/, "");
const sixHex = (value?: string, fallback = "#000000") => /^#[0-9a-f]{6}/i.test(value ?? "") ? (value as string).slice(0, 7) : fallback;
const eightHex = (value: string) => `${value.slice(0, 7)}ff`;
const canonicalHex = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const lower = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(lower)) return `${lower}ff`;
  if (/^#[0-9a-f]{8}$/.test(lower)) return lower;
  return lower || null;
};

function appendIcon(button: HTMLElement, name: string): void {
  const icon = getIcon(name);
  if (!icon) return;
  icon.classList.add("kplex-lucide");
  button.prepend(icon);
}

type OntologyStyleField = { name: string; roles: string[] };
type NodeStyleValueSuggestion = { value: string; display: string; kind: "property" | "tag" | "configured" };

class NodeStyleValueSuggest extends AbstractInputSuggest<NodeStyleValueSuggestion> {
  private readonly input: HTMLInputElement;

  constructor(app: App, input: HTMLInputElement, private readonly values: NodeStyleValueSuggestion[]) {
    super(app, input);
    this.input = input;
    this.limit = 40;
  }

  protected getSuggestions(query: string): NodeStyleValueSuggestion[] {
    const needle = query.trim().replace(/^#/, "").toLowerCase();
    const ranked = this.values.filter((item) => {
      if (!needle) return true;
      return item.value.toLowerCase().includes(needle) || item.display.toLowerCase().includes(needle);
    });
    return ranked.slice(0, this.limit);
  }

  renderSuggestion(item: NodeStyleValueSuggestion, el: HTMLElement): void {
    const line = el.createDiv({ cls: "kplex-input-suggestion-line" });
    appendIcon(line, item.kind === "tag" ? "tag" : item.kind === "configured" ? "palette" : "list-tree");
    line.createSpan({ text: item.display });
    el.createDiv({
      cls: "suggestion-note",
      text: item.kind === "tag" ? "Vault tag" : item.kind === "configured" ? "Configured style" : "Existing style-property value",
    });
  }

  selectSuggestion(item: NodeStyleValueSuggestion): void {
    this.setValue(item.value);
    this.input.dispatchEvent(new Event("input", { bubbles: true }));
    this.close();
  }
}

class LucideIconSuggest extends AbstractInputSuggest<string> {
  private readonly input: HTMLInputElement;
  private readonly icons = getIconIds().slice().sort((a, b) => a.localeCompare(b));

  constructor(app: App, input: HTMLInputElement) {
    super(app, input);
    this.input = input;
    this.limit = 50;
  }

  protected getSuggestions(query: string): string[] {
    const needle = query.trim().toLowerCase();
    if (!needle) return this.icons.slice(0, this.limit);
    const starts: string[] = [];
    const contains: string[] = [];
    for (const icon of this.icons) {
      const lower = icon.toLowerCase();
      if (lower.startsWith(needle)) starts.push(icon);
      else if (lower.includes(needle)) contains.push(icon);
      if (starts.length + contains.length >= this.limit * 2) break;
    }
    return [...starts, ...contains].slice(0, this.limit);
  }

  renderSuggestion(iconName: string, el: HTMLElement): void {
    const line = el.createDiv({ cls: "kplex-input-suggestion-line" });
    appendIcon(line, iconName);
    line.createSpan({ text: iconName });
  }

  selectSuggestion(iconName: string): void {
    this.setValue(iconName);
    this.input.dispatchEvent(new Event("input", { bubbles: true }));
    this.close();
  }
}

const LINK_STYLE_KEYS: (keyof LinkStyle)[] = [
  "strokeColor",
  "strokeWidth",
  "strokeStyle",
  "roughness",
  "startArrowHead",
  "endArrowHead",
  "showLabel",
  "fontSize",
  "fontFamily",
  "textColor",
];

const hasMeaningfulLinkOverride = (style: LinkStyle | undefined, baseStyle: LinkStyle): boolean => {
  if (!style) return false;
  return LINK_STYLE_KEYS.some((key) => {
    if (style[key] === undefined) return false;
    if (key === "strokeColor" || key === "textColor") {
      return canonicalHex(style[key]) !== canonicalHex(baseStyle[key]);
    }
    return style[key] !== baseStyle[key];
  });
};

const describeLinkStyle = (style: LinkStyle | undefined, baseStyle: LinkStyle): string => {
  const effective = { ...baseStyle, ...(style ?? {}) };
  const parts = [
    effective.strokeStyle ?? "solid",
    `${effective.strokeWidth ?? 1}px`,
    sixHex(effective.strokeColor, "#696969"),
  ];
  if ((effective.startArrowHead ?? "none") !== "none" || (effective.endArrowHead ?? "none") !== "none") {
    parts.push(`${effective.startArrowHead ?? "none"} → ${effective.endArrowHead ?? "none"}`);
  }
  if (effective.showLabel) parts.push("label");
  if (effective.roughness !== undefined && effective.roughness !== baseStyle.roughness) parts.push(`roughness ${effective.roughness}`);
  if (effective.fontFamily !== undefined && effective.fontFamily !== baseStyle.fontFamily) parts.push(`font ${effective.fontFamily}`);
  return parts.join(" · ");
};

const describeNodeStyle = (style: NodeStyle): string => {
  const parts: string[] = [];
  if (style.icon) parts.push(`icon: ${style.icon}`);
  if (style.fontSize) parts.push(`${style.fontSize}px`);
  if (style.backgroundColor) parts.push(sixHex(style.backgroundColor));
  return parts.length ? parts.join(" · ") : "Uses inherited node defaults";
};

class NoteTypeStyleModal extends Modal {
  constructor(
    app: App,
    private initialName: string | null,
    private initialStyle: NodeStyle,
    private styleProperty: string,
    private valueSuggestions: NodeStyleValueSuggestion[],
    private onSave: (name: string, style: NodeStyle, previousName: string | null) => Promise<void>,
    private onDelete?: (name: string) => Promise<void>,
  ) {
    super(app);
  }

  onOpen(): void {
    this.titleEl.setText(this.initialName ? "Edit node style" : "Add node style");
    this.modalEl.addClass("kplex-style-editor-modal");
    this.contentEl.addClass("kplex-style-editor");
    this.contentEl.createEl("p", {
      text: `Style notes where “${this.styleProperty || "Note type"}” matches this value. Existing values and vault tags are suggested as you type.`,
    });

    const form = this.contentEl.createDiv({ cls: "kplex-style-form" });
    const field = (label: string, input: HTMLElement) => {
      const row = form.createDiv({ cls: "kplex-style-row" });
      row.createEl("label", { text: label });
      row.appendChild(input);
    };

    const nameInput = form.createEl("input");
    nameInput.type = "text";
    nameInput.value = this.initialName ?? "";
    nameInput.placeholder = "project";
    field("Property value", nameInput);
    new NodeStyleValueSuggest(this.app, nameInput, this.valueSuggestions);

    const iconInput = form.createEl("input");
    iconInput.type = "text";
    iconInput.value = this.initialStyle.icon ?? "";
    iconInput.placeholder = "Search Lucide icons, e.g. book-open";
    field("Lucide icon", iconInput);
    new LucideIconSuggest(this.app, iconInput);

    const background = form.createEl("input");
    background.type = "color";
    background.value = sixHex(this.initialStyle.backgroundColor, "#182433");
    field("Background", background);

    const text = form.createEl("input");
    text.type = "color";
    text.value = sixHex(this.initialStyle.textColor, "#ffffff");
    field("Text", text);

    const border = form.createEl("input");
    border.type = "color";
    border.value = sixHex(this.initialStyle.borderColor, "#6f849a");
    field("Border", border);

    const fontSize = form.createEl("input");
    fontSize.type = "number";
    fontSize.min = "8";
    fontSize.max = "40";
    fontSize.step = "1";
    fontSize.value = String(this.initialStyle.fontSize ?? 18);
    field("Font size", fontSize);

    const actions = this.contentEl.createDiv({ cls: "kplex-style-actions" });
    if (this.initialName && this.onDelete) {
      const remove = actions.createEl("button", { cls: "mod-warning", text: "Delete" });
      appendIcon(remove, "trash-2");
      remove.addEventListener("click", () => {
        void this.onDelete!(this.initialName!).then(() => this.close());
      });
    }
    const cancel = actions.createEl("button", { text: "Cancel" });
    appendIcon(cancel, "x");
    cancel.addEventListener("click", () => this.close());

    const save = actions.createEl("button", { cls: "mod-cta", text: "Save" });
    appendIcon(save, "check");
    save.addEventListener("click", () => {
      const name = normalizeNodeStyleValue(nameInput.value);
      if (!name) {
        nameInput.focus();
        nameInput.classList.add("is-invalid");
        return;
      }
      const style: NodeStyle = {
        ...this.initialStyle,
        icon: iconInput.value.trim() || undefined,
        backgroundColor: eightHex(background.value),
        textColor: eightHex(text.value),
        borderColor: eightHex(border.value),
        fontSize: Math.max(8, Math.min(40, Number(fontSize.value) || 18)),
      };
      void this.onSave(name, style, this.initialName).then(() => this.close());
    });
    window.setTimeout(() => nameInput.focus(), 0);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

class OntologyLinkStyleModal extends Modal {
  constructor(
    app: App,
    private fieldName: string,
    private initialStyle: LinkStyle,
    private baseStyle: LinkStyle,
    private onSave: (style: LinkStyle) => Promise<void>,
    private onReset: () => Promise<void>,
  ) {
    super(app);
  }

  onOpen(): void {
    this.titleEl.setText(`Link style · ${this.fieldName}`);
    this.modalEl.addClass("kplex-style-editor-modal");
    this.contentEl.addClass("kplex-style-editor");
    this.contentEl.createEl("p", {
      text: "Change the appearance of links created by this relationship field. Reset returns it to the default link style.",
    });

    const effective = { ...this.baseStyle, ...this.initialStyle };
    const form = this.contentEl.createDiv({ cls: "kplex-style-form" });
    const field = (label: string, input: HTMLElement) => {
      const row = form.createDiv({ cls: "kplex-style-row" });
      row.createEl("label", { text: label });
      row.appendChild(input);
    };

    const strokeColor = form.createEl("input");
    strokeColor.type = "color";
    strokeColor.value = sixHex(effective.strokeColor, "#696969");
    field("Line color", strokeColor);

    const strokeWidth = form.createEl("input");
    strokeWidth.type = "number";
    strokeWidth.min = "0.5";
    strokeWidth.max = "8";
    strokeWidth.step = "0.5";
    strokeWidth.value = String(effective.strokeWidth ?? 1);
    field("Line width", strokeWidth);

    const strokeStyle = form.createEl("select");
    for (const [value, label] of Object.entries({ solid: "Solid", dashed: "Dashed", dotted: "Dotted" })) {
      const option = strokeStyle.createEl("option", { text: label, attr: { value } });
      if (value === (effective.strokeStyle ?? "solid")) option.selected = true;
    }
    field("Line style", strokeStyle);

    const arrowSelect = (selected: Arrowhead): HTMLSelectElement => {
      const select = form.createEl("select");
      for (const [value, label] of Object.entries(ARROW_OPTIONS)) {
        const option = select.createEl("option", { text: label, attr: { value } });
        if (value === selected) option.selected = true;
      }
      return select;
    };
    const startArrow = arrowSelect(effective.startArrowHead ?? "none");
    field("Start arrowhead", startArrow);
    const endArrow = arrowSelect(effective.endArrowHead ?? "none");
    field("End arrowhead", endArrow);

    const showLabel = form.createEl("input");
    showLabel.type = "checkbox";
    showLabel.checked = effective.showLabel ?? false;
    field("Show ontology label", showLabel);

    const textColor = form.createEl("input");
    textColor.type = "color";
    textColor.value = sixHex(effective.textColor, "#ffffff");
    field("Label color", textColor);

    const fontSize = form.createEl("input");
    fontSize.type = "number";
    fontSize.min = "7";
    fontSize.max = "24";
    fontSize.step = "1";
    fontSize.value = String(effective.fontSize ?? 10);
    field("Label size", fontSize);

    const actions = this.contentEl.createDiv({ cls: "kplex-style-actions" });
    const reset = actions.createEl("button", { cls: "mod-warning", text: "Reset" });
    appendIcon(reset, "rotate-ccw");
    reset.addEventListener("click", () => {
      void this.onReset().then(() => this.close());
    });
    const cancel = actions.createEl("button", { text: "Cancel" });
    appendIcon(cancel, "x");
    cancel.addEventListener("click", () => this.close());
    const save = actions.createEl("button", { cls: "mod-cta", text: "Save" });
    appendIcon(save, "check");
    save.addEventListener("click", () => {
      const style: LinkStyle = {
        ...this.initialStyle,
        strokeColor: eightHex(strokeColor.value),
        strokeWidth: Math.max(0.5, Math.min(8, Number(strokeWidth.value) || 1)),
        strokeStyle: strokeStyle.value === "dashed" || strokeStyle.value === "dotted" ? strokeStyle.value : "solid",
        startArrowHead: startArrow.value as Arrowhead,
        endArrowHead: endArrow.value as Arrowhead,
        showLabel: showLabel.checked,
        textColor: eightHex(textColor.value),
        fontSize: Math.max(7, Math.min(24, Number(fontSize.value) || 10)),
      };
      void this.onSave(style).then(() => this.close());
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

class OntologyLinkStylesManagerModal extends Modal {
  private readonly translate = createObsidianTranslator();
  private search = "";
  private role = "all";
  // Modal already owns a `scope: Scope` keyboard-handler property. Keep this UI filter distinct.
  private displayScope: "custom" | "all" = "custom";
  private visibleLimit = 12;
  private listEl: HTMLElement | null = null;
  private statusEl: HTMLElement | null = null;

  constructor(
    app: App,
    private fields: OntologyStyleField[],
    private getStyle: (fieldName: string) => LinkStyle | undefined,
    private baseStyle: LinkStyle,
    private onEdit: (fieldName: string, afterChange: () => void) => void,
  ) {
    super(app);
  }

  onOpen(): void {
    this.titleEl.setText("Relationship link styles");
    this.modalEl.addClass("kplex-style-manager-modal");
    this.contentEl.addClass("kplex-style-manager");
    this.contentEl.createEl("p", {
      text: "Customize only the relationship properties that should look different from the default link style.",
    });

    const controls = this.contentEl.createDiv({ cls: "kplex-style-manager-controls" });
    const searchWrap = controls.createDiv({ cls: "search-input-container kplex-style-manager-search" });
    const search = searchWrap.createEl("input", {
      attr: { type: "search", placeholder: "Search relationship properties…", "aria-label": "Search relationship properties" },
    });
    search.addEventListener("input", () => {
      this.search = search.value.trim().toLowerCase();
      this.visibleLimit = 12;
      this.renderList();
    });

    const scope = controls.createEl("select", { attr: { "aria-label": "Link style scope" } });
    scope.createEl("option", { text: "Custom styles", attr: { value: "custom" } });
    scope.createEl("option", { text: "All relationship fields", attr: { value: "all" } });
    scope.value = this.displayScope;
    scope.addEventListener("change", () => {
      this.displayScope = scope.value === "all" ? "all" : "custom";
      this.visibleLimit = 12;
      this.renderList();
    });

    const role = controls.createEl("select", { attr: { "aria-label": "Ontology role" } });
    role.createEl("option", { text: "All roles", attr: { value: "all" } });
    for (const value of ["Parent", "Child", "Friend", "Challenger", "Previous", "Next"]) {
      role.createEl("option", { text: value, attr: { value } });
    }
    role.addEventListener("change", () => {
      this.role = role.value;
      this.visibleLimit = 12;
      this.renderList();
    });

    this.statusEl = this.contentEl.createDiv({ cls: "kplex-style-manager-status" });
    this.listEl = this.contentEl.createDiv({ cls: "kplex-style-manager-list" });
    this.renderList();
    window.setTimeout(() => search.focus(), 0);
  }

  private renderList(): void {
    if (!this.listEl || !this.statusEl) return;
    this.listEl.empty();

    const matches = this.fields.filter((field) => {
      const style = this.getStyle(field.name);
      if (this.displayScope === "custom" && !hasMeaningfulLinkOverride(style, this.baseStyle)) return false;
      if (this.role !== "all" && !field.roles.includes(this.role)) return false;
      if (this.search && !`${field.name} ${field.roles.join(" ")}`.toLowerCase().includes(this.search)) return false;
      return true;
    });
    const customCount = this.fields.filter((field) => hasMeaningfulLinkOverride(this.getStyle(field.name), this.baseStyle)).length;
    const scopeCount = this.displayScope === "custom" ? customCount : this.fields.length;
    this.statusEl.setText(`${scopeCount} ${this.displayScope === "custom" ? "custom style" : "relationship field"}${scopeCount === 1 ? "" : "s"} · ${matches.length} result${matches.length === 1 ? "" : "s"}`);

    if (!matches.length) {
      const empty = this.listEl.createDiv({ cls: "kplex-style-manager-empty" });
      empty.createEl("p", {
        text: this.displayScope === "custom"
          ? "No customized link styles match. The remaining relationship fields use the global link style."
          : "No relationship fields match this filter.",
      });
      if (this.displayScope === "custom") {
        const browse = empty.createEl("button", { text: "Browse all relationship fields" });
        browse.addEventListener("click", () => {
          this.displayScope = "all";
          const select = this.contentEl.querySelector<HTMLSelectElement>('.kplex-style-manager-controls select[aria-label="Link style scope"]');
          if (select) select.value = "all";
          this.renderList();
        });
      }
      return;
    }

    const windowed = collectionWindow(matches, this.visibleLimit, 20);
    for (const field of windowed.visible) {
      const style = this.getStyle(field.name);
      const customized = hasMeaningfulLinkOverride(style, this.baseStyle);
      const effective = { ...this.baseStyle, ...(style ?? {}) };
      const row = this.listEl.createEl("button", { cls: "kplex-style-manager-row" });
      row.type = "button";
      const swatch = row.createSpan({ cls: "kplex-style-manager-line-swatch" });
      const swatchStyle = effective.strokeStyle === "dashed" || effective.strokeStyle === "dotted" ? effective.strokeStyle : "solid";
      swatch.addClass(`is-${swatchStyle}`);
      swatch.setCssProps({ "--kplex-style-swatch": sixHex(effective.strokeColor, "#696969") });
      const copy = row.createDiv({ cls: "kplex-style-manager-copy" });
      const heading = copy.createDiv({ cls: "kplex-style-manager-heading" });
      heading.createSpan({ text: field.name, cls: "kplex-style-manager-name" });
      const badges = heading.createSpan({ cls: "kplex-style-manager-badges" });
      for (const role of field.roles) badges.createSpan({ text: role, cls: "kplex-style-manager-badge" });
      copy.createDiv({
        text: `${customized ? "Custom" : "Default"} · ${describeLinkStyle(style, this.baseStyle)}`,
        cls: "kplex-style-manager-summary",
      });
      appendIcon(row, "chevron-right");
      row.addEventListener("click", () => this.onEdit(field.name, () => this.renderList()));
    }
    if (windowed.remaining > 0) {
      const more = this.listEl.createEl("button", {
        cls: "kplex-style-manager-more",
        text: this.translate("collection.showMore", { count: windowed.nextCount }),
      });
      more.type = "button";
      more.addEventListener("click", () => {
        this.visibleLimit += 20;
        this.renderList();
      });
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

class NoteTypeStylesManagerModal extends Modal {
  private readonly translate = createObsidianTranslator();
  private search = "";
  private visibleLimit = 12;
  private listEl: HTMLElement | null = null;
  private statusEl: HTMLElement | null = null;

  constructor(
    app: App,
    private styleProperty: string,
    private getNames: () => string[],
    private getStyle: (name: string) => NodeStyle,
    private onEdit: (name: string | null, afterChange: () => void) => void,
  ) {
    super(app);
  }

  onOpen(): void {
    this.titleEl.setText("Node styles");
    this.modalEl.addClass("kplex-style-manager-modal");
    this.contentEl.addClass("kplex-style-manager");
    this.contentEl.createEl("p", {
      text: `Choose how notes look for different values of “${this.styleProperty || "Note type"}”.`,
    });

    const controls = this.contentEl.createDiv({ cls: "kplex-style-manager-controls" });
    const searchWrap = controls.createDiv({ cls: "search-input-container kplex-style-manager-search" });
    const search = searchWrap.createEl("input", {
      attr: { type: "search", placeholder: "Search node styles…", "aria-label": "Search node styles" },
    });
    search.addEventListener("input", () => {
      this.search = search.value.trim().toLowerCase();
      this.visibleLimit = 12;
      this.renderList();
    });
    const add = controls.createEl("button", { cls: "mod-cta", text: "Add style" });
    appendIcon(add, "plus");
    add.addEventListener("click", () => this.onEdit(null, () => this.renderList()));

    this.statusEl = this.contentEl.createDiv({ cls: "kplex-style-manager-status" });
    this.listEl = this.contentEl.createDiv({ cls: "kplex-style-manager-list" });
    this.renderList();
    window.setTimeout(() => search.focus(), 0);
  }

  private renderList(): void {
    if (!this.listEl || !this.statusEl) return;
    this.listEl.empty();
    const names = this.getNames();
    const matches = names.filter((name) => !this.search || name.toLowerCase().includes(this.search));
    this.statusEl.setText(`${names.length} style${names.length === 1 ? "" : "s"} · ${matches.length} result${matches.length === 1 ? "" : "s"}`);

    if (!matches.length) {
      this.listEl.createDiv({
        cls: "kplex-style-manager-empty",
        text: names.length ? "No node styles match this search." : "No property-value node styles configured yet.",
      });
      return;
    }

    const windowed = collectionWindow(matches, this.visibleLimit, 20);
    for (const name of windowed.visible) {
      const style = this.getStyle(name);
      const row = this.listEl.createEl("button", { cls: "kplex-style-manager-row" });
      row.type = "button";
      const swatch = row.createSpan({ cls: "kplex-style-manager-node-swatch" });
      swatch.setCssProps({
        "--kplex-style-node-bg": sixHex(style.backgroundColor, "#000000"),
        "--kplex-style-node-border": sixHex(style.borderColor, "#6f849a"),
      });
      const copy = row.createDiv({ cls: "kplex-style-manager-copy" });
      copy.createDiv({ text: name, cls: "kplex-style-manager-name" });
      copy.createDiv({ text: describeNodeStyle(style), cls: "kplex-style-manager-summary" });
      appendIcon(row, "chevron-right");
      row.addEventListener("click", () => this.onEdit(name, () => this.renderList()));
    }
    if (windowed.remaining > 0) {
      const more = this.listEl.createEl("button", {
        cls: "kplex-style-manager-more",
        text: this.translate("collection.showMore", { count: windowed.nextCount }),
      });
      more.type = "button";
      more.addEventListener("click", () => {
        this.visibleLimit += 20;
        this.renderList();
      });
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

type UnassignedOntologyField = { normalized: string; name: string; count: number };

class UnassignedOntologyManagerModal extends Modal {
  private readonly translate = createObsidianTranslator();
  private search = "";
  private sortMode: "frequency" | "name" = "frequency";
  private visibleLimit = 16;
  private listEl: HTMLElement | null = null;
  private statusEl: HTMLElement | null = null;

  constructor(
    app: App,
    private getFields: () => UnassignedOntologyField[],
    private onAssign: (fieldName: string, afterChange: () => void) => void,
    private onRefresh: () => Promise<void>,
  ) {
    super(app);
  }

  onOpen(): void {
    this.titleEl.setText("Unassigned relationship fields");
    this.modalEl.addClass("kplex-style-manager-modal");
    this.contentEl.addClass("kplex-style-manager");
    this.contentEl.createEl("p", {
      text: "Review properties K-Plex has discovered but does not yet use as relationship fields.",
    });

    const controls = this.contentEl.createDiv({ cls: "kplex-style-manager-controls" });
    const searchWrap = controls.createDiv({ cls: "search-input-container kplex-style-manager-search" });
    const search = searchWrap.createEl("input", {
      attr: { type: "search", placeholder: "Search discovered fields…", "aria-label": "Search discovered fields" },
    });
    search.addEventListener("input", () => {
      this.search = search.value.trim().toLowerCase();
      this.visibleLimit = 16;
      this.renderList();
    });

    const sort = controls.createEl("select", { attr: { "aria-label": "Sort discovered fields" } });
    sort.createEl("option", { text: "Most used", attr: { value: "frequency" } });
    sort.createEl("option", { text: "A–Z", attr: { value: "name" } });
    sort.value = this.sortMode;
    sort.addEventListener("change", () => {
      this.sortMode = sort.value === "name" ? "name" : "frequency";
      this.visibleLimit = 16;
      this.renderList();
    });

    const refresh = controls.createEl("button", { text: "Refresh" });
    appendIcon(refresh, "refresh-cw");
    refresh.addEventListener("click", () => {
      refresh.disabled = true;
      void this.onRefresh()
        .then(() => {
          this.visibleLimit = 16;
          this.renderList();
        })
        .finally(() => { refresh.disabled = false; });
    });

    this.statusEl = this.contentEl.createDiv({ cls: "kplex-style-manager-status" });
    this.listEl = this.contentEl.createDiv({ cls: "kplex-style-manager-list" });
    this.renderList();
    window.setTimeout(() => search.focus(), 0);
  }

  private renderList(): void {
    if (!this.listEl || !this.statusEl) return;
    this.listEl.empty();
    const all = this.getFields();
    const matches = all
      .filter((field) => !this.search || field.name.toLowerCase().includes(this.search))
      .sort((a, b) => this.sortMode === "name"
        ? a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        : b.count - a.count || a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    this.statusEl.setText(`${all.length} unassigned field${all.length === 1 ? "" : "s"} · ${matches.length} result${matches.length === 1 ? "" : "s"}`);

    if (!matches.length) {
      this.listEl.createDiv({
        cls: "kplex-style-manager-empty",
        text: all.length ? "No discovered fields match this search." : "All discovered fields are assigned to an ontology role.",
      });
      return;
    }

    const windowed = collectionWindow(matches, this.visibleLimit, 24);
    for (const field of windowed.visible) {
      const row = this.listEl.createEl("button", { cls: "kplex-style-manager-row" });
      row.type = "button";
      const icon = row.createSpan({ cls: "kplex-style-manager-property-icon" });
      appendIcon(icon, "list-tree");
      const copy = row.createDiv({ cls: "kplex-style-manager-copy" });
      copy.createDiv({ text: field.name, cls: "kplex-style-manager-name" });
      copy.createDiv({
        text: `${field.count} occurrence${field.count === 1 ? "" : "s"}`,
        cls: "kplex-style-manager-summary",
      });
      appendIcon(row, "chevron-right");
      row.addEventListener("click", () => this.onAssign(field.name, () => this.renderList()));
    }

    if (windowed.remaining > 0) {
      const more = this.listEl.createEl("button", {
        cls: "kplex-style-manager-more",
        text: this.translate("collection.showMore", { count: windowed.nextCount }),
      });
      more.type = "button";
      more.addEventListener("click", () => {
        this.visibleLimit += 24;
        this.renderList();
      });
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

class LegacySettingsImportModal extends Modal {
  private rawText = "";

  constructor(app: App, private plugin: ExcaliBrainPlugin, private onImported: () => void) {
    super(app);
  }

  onOpen(): void {
    this.titleEl.setText("Import ExcaliBrain settings");
    this.contentEl.addClass("kplex-import-settings-modal");

    this.contentEl.createEl("p", {
      text: "Choose an ExcaliBrain data.json backup. K-Plex will migrate compatible ontology, visibility, navigation and appearance settings, then rebuild the index."
    });

    const fileRow = this.contentEl.createDiv({ cls: "kplex-import-file-row" });
    const fileInput = fileRow.createEl("input", { attr: { type: "file", accept: "application/json,.json" } });
    const status = this.contentEl.createDiv({ cls: "kplex-import-status", text: "No file selected." });

    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (!file) {
        this.rawText = "";
        status.setText("No file selected.");
        return;
      }
      void file.text().then((text) => {
        this.rawText = text;
        status.setText(file.name);
      }).catch((error: unknown) => {
        this.rawText = "";
        status.setText(`Could not read file: ${String(error)}`);
      });
    });

    const actions = this.contentEl.createDiv({ cls: "kplex-style-actions" });
    const cancel = actions.createEl("button", { text: "Cancel" });
    appendIcon(cancel, "x");
    cancel.addEventListener("click", () => this.close());

    const importButton = actions.createEl("button", { cls: "mod-cta", text: "Import" });
    appendIcon(importButton, "download");
    importButton.addEventListener("click", () => {
      if (!this.rawText) {
        status.setText("Choose an ExcaliBrain data.json file first.");
        return;
      }
      try {
        const parsed = JSON.parse(this.rawText) as unknown;
        // Import legacy keys without resetting K-Plex-only preferences that do not exist in an
        // ExcaliBrain data.json (layout columns, bounded-zone heights, connector style, etc.).
        const current = this.plugin.settings;
        const imported = parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
        const importedHierarchy = imported.hierarchy && typeof imported.hierarchy === "object"
          ? imported.hierarchy as Record<string, unknown>
          : {};
        this.plugin.settings = migrateAndMergeSettings({
          ...current,
          ...imported,
          hierarchy: { ...current.hierarchy, ...importedHierarchy },
        });
      } catch (error) {
        status.setText(`Invalid JSON: ${String(error)}`);
        return;
      }
      importButton.disabled = true;
      void this.plugin.saveSettings(true).then(() => {
        new Notice("ExcaliBrain settings imported into K-Plex.", 2600);
        this.onImported();
        this.close();
      }).catch((error: unknown) => {
        importButton.disabled = false;
        status.setText(`Import failed: ${String(error)}`);
      });
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

type DeclarativeSettingKey =
  | keyof ExcaliBrainSettings
  | "hierarchy.parents"
  | "hierarchy.children"
  | "hierarchy.leftFriends"
  | "hierarchy.rightFriends"
  | "hierarchy.previous"
  | "hierarchy.next"
  | "hierarchy.hidden"
  | "excludeFilepathsCsv"
  | "backgroundColorHex"
  | "baseLinkStyle.strokeColorHex"
  | "baseLinkStyle.strokeWidth"
  | "baseLinkStyle.strokeStyle"
  | "baseLinkStyle.startArrowHead"
  | "baseLinkStyle.endArrowHead"
  | "baseLinkStyle.showLabel"
  | "baseLinkStyle.textColorHex"
  | "baseLinkStyle.fontSize"
  | "baseNodeStyle.gateRadius";

type EditableHierarchyKey = Exclude<keyof Hierarchy, "friends" | "exclusions">;

const HIERARCHY_KEY_MAP: Record<string, EditableHierarchyKey> = {
  "hierarchy.parents": "parents",
  "hierarchy.children": "children",
  "hierarchy.leftFriends": "leftFriends",
  "hierarchy.rightFriends": "rightFriends",
  "hierarchy.previous": "previous",
  "hierarchy.next": "next",
  "hierarchy.hidden": "hidden"
};

const REINDEX_SETTING_KEYS = new Set<string>([
  "inferAllLinksAsFriends",
  "inverseInfer",
  "showFullTagName",
  "primaryTagField",
  "noteTypeField",
  ...Object.keys(HIERARCHY_KEY_MAP)
]);

const ARROW_OPTIONS: Record<Arrowhead, string> = {
  none: "None",
  arrow: "Arrow",
  triangle: "Triangle",
  dot: "Dot",
  bar: "Bar",
};

export class ExcaliBrainSettingTab extends PluginSettingTab {
  constructor(app: App, private ebPlugin: ExcaliBrainPlugin) {
    super(app, ebPlugin);
    this.containerEl.addClass("kplex-settings");
  }

  private openNoteTypeStyleEditor(name: string | null, afterChange?: () => void): void {
    const style = name ? this.ebPlugin.settings.noteTypeStyles[name] ?? {} : {};
    new NoteTypeStyleModal(
      this.app,
      name,
      style,
      this.ebPlugin.settings.noteTypeField,
      this.nodeStyleValueSuggestions(),
      async (nextName, nextStyle, previousName) => {
        const normalizedNext = normalizeNodeStyleValue(nextName);
        if (previousName && previousName !== normalizedNext) delete this.ebPlugin.settings.noteTypeStyles[previousName];
        this.ebPlugin.settings.noteTypeStyles[normalizedNext] = nextStyle;
        await this.ebPlugin.saveSettings(false);
        afterChange?.();
        this.update();
      },
      async (removeName) => {
        delete this.ebPlugin.settings.noteTypeStyles[removeName];
        await this.ebPlugin.saveSettings(false);
        afterChange?.();
        this.update();
      },
    ).open();
  }

  private nodeStyleValueSuggestions(): NodeStyleValueSuggestion[] {
    const values = new Map<string, NodeStyleValueSuggestion>();
    const put = (value: string, display: string, kind: NodeStyleValueSuggestion["kind"]) => {
      const normalized = normalizeNodeStyleValue(value);
      if (!normalized) return;
      const key = normalized.toLowerCase();
      const current = values.get(key);
      // Existing configured/property values are more semantically precise than a generic tag hint.
      if (!current || (current.kind === "tag" && kind !== "tag")) values.set(key, { value: normalized, display, kind });
    };
    for (const name of Object.keys(this.ebPlugin.settings.noteTypeStyles)) put(name, normalizeNodeStyleValue(name), "configured");
    for (const page of this.ebPlugin.index.allPages()) {
      if (page.noteType) put(page.noteType, page.noteType, "property");
      for (const tag of page.tags) {
        const normalized = normalizeNodeStyleValue(tag);
        if (normalized) put(normalized, `#${normalized}`, "tag");
      }
    }
    return [...values.values()].sort((a, b) => a.display.localeCompare(b.display, undefined, { sensitivity: "base" }));
  }

  private noteTypeStyleNames(): string[] {
    return Object.keys(this.ebPlugin.settings.noteTypeStyles)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }

  private openNoteTypeStylesManager(): void {
    new NoteTypeStylesManagerModal(
      this.app,
      this.ebPlugin.settings.noteTypeField,
      () => this.noteTypeStyleNames(),
      (name) => this.ebPlugin.settings.noteTypeStyles[name] ?? {},
      (name, afterChange) => this.openNoteTypeStyleEditor(name, afterChange),
    ).open();
  }

  private ontologyStyleFields(): OntologyStyleField[] {
    const roleGroups: [string, string[]][] = [
      ["Parent", this.ebPlugin.settings.hierarchy.parents],
      ["Child", this.ebPlugin.settings.hierarchy.children],
      ["Friend", this.ebPlugin.settings.hierarchy.leftFriends],
      ["Challenger", this.ebPlugin.settings.hierarchy.rightFriends],
      ["Previous", this.ebPlugin.settings.hierarchy.previous],
      ["Next", this.ebPlugin.settings.hierarchy.next],
    ];
    const fields = new Map<string, OntologyStyleField>();
    for (const [role, names] of roleGroups) {
      for (const rawName of names) {
        const name = rawName.trim();
        if (!name) continue;
        const key = normalizeOntologyStyleKey(name);
        const current = fields.get(key);
        if (current) {
          if (!current.roles.includes(role)) current.roles.push(role);
        } else {
          fields.set(key, { name, roles: [role] });
        }
      }
    }
    return [...fields.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }

  private ontologyLinkStyle(fieldName: string): LinkStyle | undefined {
    const key = normalizeOntologyStyleKey(fieldName);
    return this.ebPlugin.settings.hierarchyLinkStyles[key] ?? this.ebPlugin.settings.hierarchyLinkStyles[fieldName];
  }

  private openOntologyLinkStyleEditor(fieldName: string, afterChange?: () => void): void {
    const key = normalizeOntologyStyleKey(fieldName);
    const style = this.ontologyLinkStyle(fieldName) ?? {};
    new OntologyLinkStyleModal(
      this.app,
      fieldName,
      style,
      this.ebPlugin.settings.baseLinkStyle,
      async (nextStyle) => {
        // Normalize keys on write so aliases/casing in the ontology definition do not create
        // duplicate style entries for the same semantic property.
        delete this.ebPlugin.settings.hierarchyLinkStyles[fieldName];
        this.ebPlugin.settings.hierarchyLinkStyles[key] = nextStyle;
        await this.ebPlugin.saveSettings(false);
        afterChange?.();
        this.update();
      },
      async () => {
        delete this.ebPlugin.settings.hierarchyLinkStyles[fieldName];
        delete this.ebPlugin.settings.hierarchyLinkStyles[key];
        await this.ebPlugin.saveSettings(false);
        afterChange?.();
        this.update();
      },
    ).open();
  }

  private openOntologyLinkStylesManager(): void {
    new OntologyLinkStylesManagerModal(
      this.app,
      this.ontologyStyleFields(),
      (fieldName) => this.ontologyLinkStyle(fieldName),
      this.ebPlugin.settings.baseLinkStyle,
      (fieldName, afterChange) => this.openOntologyLinkStyleEditor(fieldName, afterChange),
    ).open();
  }

  private openUnassignedOntologyManager(): void {
    new UnassignedOntologyManagerModal(
      this.app,
      () => this.ebPlugin.index.unassignedOntologyFields(),
      (fieldName, afterChange) => this.ebPlugin.openAddToOntologyModal(fieldName, afterChange),
      async () => {
        await this.ebPlugin.rebuildIndex(true, true, "ontology-discovery");
      },
    ).open();
  }

  private openLegacySettingsImporter(): void {
    new LegacySettingsImportModal(this.app, this.ebPlugin, () => this.update()).open();
  }

  getSettingDefinitions(): SettingDefinitionItem<DeclarativeSettingKey>[] {
    const noteTypes = this.noteTypeStyleNames();
    const unassignedFields = this.ebPlugin.index.unassignedOntologyFields();
    const ontologyStyleFields = this.ontologyStyleFields();
    const customOntologyStyleCount = ontologyStyleFields.filter((field) =>
      hasMeaningfulLinkOverride(this.ontologyLinkStyle(field.name), this.ebPlugin.settings.baseLinkStyle)
    ).length;
    return [
      {
        type: "group",
        heading: "",
        cls: "kplex-resource-links",
        items: [
          { name: "Buy me a coffee", action: () => { window.open("https://ko-fi.com/zsolt", "_blank", "noopener,noreferrer"); } },
          { name: "Read Sketch Your Mind", action: () => { window.open("https://community.sketch-your-mind.com/sym", "_blank", "noopener,noreferrer"); } },
          { name: "Join SYM Community", action: () => { window.open("https://community.sketch-your-mind.com", "_blank", "noopener,noreferrer"); } },
        ],
      },
      {
        type: "page",
        name: "Plex behavior",
        desc: "Navigation, layout, visibility and relationship behavior inside the Plex.",
        items: [
          {
            type: "group",
            heading: "Navigation & interaction",
            items: [
              { name: "Animation speed", desc: "Speed multiplier: 0 = off, 0.5 = slow, 1 = normal, 1.5 = fast, 2 = very fast. Shared nodes visibly migrate to their new position while the newly selected center arrives a little sooner.", control: { type: "slider", key: "animationSpeed", min: 0, max: 2, step: 0.1 } },
              { name: "Auto fit on navigation", control: { type: "toggle", key: "allowAutozoom" } },
              { name: "Open K-Plex in a pop-out window", desc: "When K-Plex is opened and no K-Plex view already exists, create it in a pop-out window. Desktop only.", control: { type: "toggle", key: "startInPopout" } },
              { name: "Confirm before deleting files", desc: "Ask before a node context-menu action deletes a note using Obsidian's configured trash behavior. Placeholder cleanup is still explained the first time you use Delete node.", control: { type: "toggle", key: "confirmFileDelete" } },
              {
                name: "Mouse navigation",
                desc: "Smart reserves right-click for context menus: left-drag empty canvas or middle-drag anywhere to pan. Legacy allows any mouse button to pan. Wheel zoom never requires a modifier.",
                control: { type: "dropdown", key: "mouseInteractionMode", defaultValue: "smart", options: { smart: "Smart (recommended)", legacy: "Legacy: any button pans", "middle-only": "Middle button pans" } }
              },
            ]
          },
          {
            type: "group",
            heading: "Layout & sizing",
            items: [
              { name: "Parent maximum height", desc: "Parent rows become vertically scrollable above this height.", control: { type: "slider", key: "parentMaxHeight", min: 140, max: 800, step: 20 } },
              { name: "Friend / challenger maximum height", desc: "Friend and challenger lists become vertically scrollable above this height.", control: { type: "slider", key: "friendMaxHeight", min: 140, max: 800, step: 20 } },
              { name: "Sibling maximum height", desc: "Sibling lists become vertically scrollable above this height.", control: { type: "slider", key: "siblingMaxHeight", min: 120, max: 700, step: 10 } },
              { name: "Sibling relative size (%)", desc: "Scale sibling nodes and their expanded descendants relative to other nodes. 30% is smallest; 85% is largest.", control: { type: "slider", key: "siblingRelativeSize", min: 30, max: 85, step: 5 } },
              { name: "Child maximum height", desc: "Child rows become vertically scrollable above this height.", control: { type: "slider", key: "childMaxHeight", min: 160, max: 900, step: 20 } },
              { name: "Maximum nodes per zone", control: { type: "slider", key: "maxItemCount", min: 10, max: 300, step: 10 } },
              { name: "Compact view", control: { type: "toggle", key: "compactView" } },
              { name: "Minimum link length", desc: "Minimum spacing target for connected nodes.", control: { type: "slider", key: "minLinkLength", min: 6, max: 40, step: 1 } },
            ]
          },
          {
            type: "group",
            heading: "Content visibility",
            items: [
              { name: "Show siblings", control: { type: "toggle", key: "renderSiblings" } },
              { name: "Show inferred relationships", control: { type: "toggle", key: "showInferredNodes" } },
              { name: "Ghost / unresolved nodes", control: { type: "toggle", key: "showVirtualNodes" } },
              { name: "Web links", control: { type: "toggle", key: "showURLNodes" } },
              { name: "Attachments", control: { type: "toggle", key: "showAttachments" } },
              { name: "Folders", control: { type: "toggle", key: "showFolderNodes" } },
              { name: "Tags", control: { type: "toggle", key: "showTagNodes" } },
              { name: "Markdown pages", control: { type: "toggle", key: "showPageNodes" } },
              { name: "Excluded path prefixes", desc: "Comma-separated path prefixes that stay hidden from the Plex.", control: { type: "textarea", key: "excludeFilepathsCsv", rows: 4 } },
              { name: "Gate counts", desc: "Show the number of currently visible relationships beside each gate.", control: { type: "toggle", key: "showNeighborCount" } },
            ]
          },
          {
            type: "group",
            heading: "Relationship behavior",
            items: [
              { name: "Infer normal links as friends", control: { type: "toggle", key: "inferAllLinksAsFriends" } },
              { name: "Inverse inferred parent/child direction", control: { type: "toggle", key: "inverseInfer" } },
              { name: "Reverse displayed arrow direction", desc: "Reverse the displayed link arrow direction without changing relationship semantics.", control: { type: "toggle", key: "inverseArrowDirection" } },
            ]
          },
        ]
      },
      {
        type: "page",
        name: "Ontology",
        desc: "Define which note properties create relationships and how quickly you can enter them while editing.",
        items: [
          {
            type: "page",
            name: "Relationship fields",
            desc: "Choose which properties appear as parents, children, friends, challengers and sequence links.",
            items: [
              {
                type: "group",
                heading: "Relationship fields",
                cls: "kplex-ontology-fields",
                items: [
                  { name: "Parent fields", control: { type: "textarea", key: "hierarchy.parents", rows: 3 } },
                  { name: "Child fields", control: { type: "textarea", key: "hierarchy.children", rows: 3 } },
                  { name: "Left friend / jump fields", control: { type: "textarea", key: "hierarchy.leftFriends", rows: 3 } },
                  { name: "Right friend / challenger fields", control: { type: "textarea", key: "hierarchy.rightFriends", rows: 3 } },
                  { name: "Previous fields", control: { type: "textarea", key: "hierarchy.previous", rows: 3 } },
                  { name: "Next fields", control: { type: "textarea", key: "hierarchy.next", rows: 3 } },
                  { name: "Hidden fields", desc: "Relationships stored in these properties stay out of the Plex.", control: { type: "textarea", key: "hierarchy.hidden", rows: 3 } },
                ],
              },
            ],
          },
          {
            type: "page",
            name: "Editor suggester",
            desc: "Configure shortcuts for inserting ontology fields while writing notes.",
            items: [
              {
                type: "group",
                heading: "Ontology suggester",
                items: [
                  { name: "Enable ontology suggester", control: { type: "toggle", key: "allowOntologySuggester" } },
                  { name: "Parent trigger", control: { type: "text", key: "ontologySuggesterParentTrigger" } },
                  { name: "Child trigger", control: { type: "text", key: "ontologySuggesterChildTrigger" } },
                  { name: "Left friend trigger", control: { type: "text", key: "ontologySuggesterLeftFriendTrigger" } },
                  { name: "Right friend trigger", control: { type: "text", key: "ontologySuggesterRightFriendTrigger" } },
                  { name: "Previous trigger", control: { type: "text", key: "ontologySuggesterPreviousTrigger" } },
                  { name: "Next trigger", control: { type: "text", key: "ontologySuggesterNextTrigger" } },
                  { name: "All ontology trigger", desc: "Suggest fields from every ontology role.", control: { type: "text", key: "ontologySuggesterTrigger" } },
                  { name: "Mid-sentence prefix", desc: "Prefix used before a trigger for Dataview-style inline fields, for example (::p → (Parent:: …).", control: { type: "text", key: "ontologySuggesterMidSentenceTrigger" } },
                  { name: "Bold inserted field names", control: { type: "toggle", key: "boldFields" } },
                ],
              },
            ],
          },
          {
            type: "page",
            name: "Discovered fields",
            desc: "Review note properties that are not currently assigned to an ontology role.",
            items: [
              {
                type: "group",
                heading: "Unassigned relationship fields",
                items: [
                  {
                    name: "Review unassigned fields",
                    desc: unassignedFields.length
                      ? `${unassignedFields.length} discovered field${unassignedFields.length === 1 ? " is" : "s are"} not assigned to an ontology role. Search, sort and assign them from one compact list.`
                      : "All currently discovered fields are assigned. You can refresh after adding new properties to your vault.",
                    action: () => this.openUnassignedOntologyManager(),
                  },
                  {
                    name: "Refresh discovered fields",
                    desc: "Rescan note properties now. This can take longer in a large vault.",
                    action: () => void this.ebPlugin.rebuildIndex(true, true, "ontology-discovery"),
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "page",
        name: "Visual styling",
        desc: "Canvas, node and link appearance.",
        items: [
          {
            type: "group",
            heading: "Canvas & labels",
            items: [
              { name: "Plex background", control: { type: "color", key: "backgroundColorHex" } },
              { name: "Use frontmatter display names", desc: "Use the first non-empty value from the configured name fields. Turn this off to always show the file name.", control: { type: "toggle", key: "renderAlias" } },
              { name: "Name fields", desc: "Comma-separated frontmatter fields checked in order. Text and list values are supported; the first non-empty value is used, then K-Plex falls back to the file name. Example: title, aliases, backup_names.", control: { type: "text", key: "nameFields" } },
              { name: "Show full tag names", control: { type: "toggle", key: "showFullTagName" } },
            ],
          },
          {
            type: "page",
            name: "Node styling",
            desc: "Node shape details, property-based colors and node images.",
            items: [
              {
                type: "group",
                heading: "Node appearance",
                items: [
                  { name: "Gate radius", desc: "Radius of the relationship gates around nodes, in pixels.", control: { type: "slider", key: "baseNodeStyle.gateRadius", min: 2, max: 8, step: 0.5 } },
                  { name: "Style property", desc: "A YAML or Dataview-style property whose value can select a custom node style. Default: Note type.", control: { type: "text", key: "noteTypeField" } },
                  {
                    name: "Property-value styles",
                    desc: noteTypes.length
                      ? `${noteTypes.length} custom style${noteTypes.length === 1 ? "" : "s"}. Search, edit or add styles for values of “${this.ebPlugin.settings.noteTypeField || "Note type"}”.`
                      : `No custom styles yet. Add styles for values of “${this.ebPlugin.settings.noteTypeField || "Note type"}”.`,
                    action: () => this.openNoteTypeStylesManager(),
                  },
                ],
              },
              {
                type: "group",
                heading: "Node images",
                items: [
                  { name: "Thumbnail property", desc: "Image link shown as a small preview before the node label. Works with YAML or Dataview-style inline fields.", control: { type: "text", key: "thumbnailProperty" } },
                  { name: "Node image property", desc: "Image link that replaces the node label with a compact visual node. Works with YAML or Dataview-style inline fields.", control: { type: "text", key: "nodeImageProperty" } },
                  { name: "Image attachment nodes", desc: "How JPG, PNG, GIF, SVG, WebP and similar image attachments appear in the Plex.", control: { type: "dropdown", key: "attachmentImageDisplay", defaultValue: "thumbnail-label", options: { label: "File name", "thumbnail-label": "Thumbnail + file name", image: "Image only" } } },
                ],
              },
            ],
          },
          {
            type: "page",
            name: "Link styling",
            desc: "Connector shape, default appearance, cross-link opacity and relationship-specific overrides.",
            items: [
              {
                type: "group",
                heading: "Link appearance",
                items: [
                  { name: "Link shape", control: { type: "dropdown", key: "connectorStyle", defaultValue: "bezier", options: { bezier: "Curved", straight: "Straight" } } },
                  { name: "Default line color", control: { type: "color", key: "baseLinkStyle.strokeColorHex" } },
                  { name: "Default line width", control: { type: "slider", key: "baseLinkStyle.strokeWidth", min: 0.5, max: 8, step: 0.5 } },
                  { name: "Default line style", control: { type: "dropdown", key: "baseLinkStyle.strokeStyle", defaultValue: "solid", options: { solid: "Solid", dashed: "Dashed", dotted: "Dotted" } } },
                  { name: "Start arrowhead", control: { type: "dropdown", key: "baseLinkStyle.startArrowHead", defaultValue: "none", options: ARROW_OPTIONS } },
                  { name: "End arrowhead", control: { type: "dropdown", key: "baseLinkStyle.endArrowHead", defaultValue: "none", options: ARROW_OPTIONS } },
                  { name: "Show relationship labels", control: { type: "toggle", key: "baseLinkStyle.showLabel" } },
                  { name: "Relationship label color", control: { type: "color", key: "baseLinkStyle.textColorHex" } },
                  { name: "Relationship label size", control: { type: "slider", key: "baseLinkStyle.fontSize", min: 7, max: 24, step: 1 } },
                  { name: "Cross-link opacity (%)", desc: "Opacity of extra links between visible non-central nodes. Hovered or highlighted links are shown at full opacity.", control: { type: "slider", key: "crossLinkOpacity", min: 0, max: 100, step: 5 } },
                  {
                    name: "Relationship-specific styles",
                    desc: customOntologyStyleCount
                      ? `${customOntologyStyleCount} custom relationship style${customOntologyStyleCount === 1 ? "" : "s"}. Search by property or filter by role.`
                      : "All relationship properties currently use the default link style.",
                    action: () => this.openOntologyLinkStylesManager(),
                  },
                ],
              },
            ],
          },
        ],
      },

      {
        type: "page",
        name: "Sidecar",
        desc: "Dedicated companion document pane placement and behavior.",
        items: [
          {
            type: "group",
            heading: "Companion document",
            items: [
              {
                name: "Default position",
                desc: "Where K-Plex creates its dedicated companion document pane. Existing neighboring tabs are never reused as the sidecar.",
                control: { type: "dropdown", key: "sidecarPosition", defaultValue: "right", options: { right: "Right", left: "Left", above: "Above", below: "Below" } }
              },
              {
                name: "Default Markdown mode",
                desc: "Open Markdown notes in the sidecar in reading view or source/edit mode.",
                control: { type: "dropdown", key: "sidecarMarkdownMode", defaultValue: "source", options: { source: "Edit mode", preview: "Reading view" } }
              },
              {
                name: "Condensed Plex breakpoint",
                desc: "When the remaining K-Plex width is at or below this value, use the compact sidecar toolbar layout.",
                control: { type: "slider", key: "sidecarCondensedBreakpoint", min: 280, max: 900, step: 20 }
              },
            ],
          },
        ],
      },
      {
        type: "page",
        name: "Compatibility",
        desc: "Migration and legacy ExcaliBrain interoperability.",
        items: [
          {
            type: "group",
            heading: "ExcaliBrain",
            items: [
              {
                name: "Import ExcaliBrain settings",
                desc: "Import a backed-up ExcaliBrain data.json file and migrate compatible settings into K-Plex.",
                action: () => this.openLegacySettingsImporter(),
              },
            ],
          },
        ],
      },
    ];
  }

  getControlValue(key: string): unknown {
    const hierarchyKey = HIERARCHY_KEY_MAP[key];
    if (hierarchyKey) return csv(this.ebPlugin.settings.hierarchy[hierarchyKey]);
    if (key === "excludeFilepathsCsv") return csv(this.ebPlugin.settings.excludeFilepaths);
    if (key === "backgroundColorHex") return this.ebPlugin.settings.backgroundColor.slice(0, 7).toLowerCase();
    if (key === "baseLinkStyle.strokeColorHex") return sixHex(this.ebPlugin.settings.baseLinkStyle.strokeColor, "#696969").toLowerCase();
    if (key === "baseLinkStyle.strokeWidth") return this.ebPlugin.settings.baseLinkStyle.strokeWidth ?? DEFAULT_LINK_STYLE.strokeWidth ?? 1;
    if (key === "baseLinkStyle.strokeStyle") return this.ebPlugin.settings.baseLinkStyle.strokeStyle ?? "solid";
    if (key === "baseLinkStyle.startArrowHead") return this.ebPlugin.settings.baseLinkStyle.startArrowHead ?? "none";
    if (key === "baseLinkStyle.endArrowHead") return this.ebPlugin.settings.baseLinkStyle.endArrowHead ?? "none";
    if (key === "baseLinkStyle.showLabel") return this.ebPlugin.settings.baseLinkStyle.showLabel ?? false;
    if (key === "baseLinkStyle.textColorHex") return sixHex(this.ebPlugin.settings.baseLinkStyle.textColor, "#ffffff").toLowerCase();
    if (key === "baseLinkStyle.fontSize") return this.ebPlugin.settings.baseLinkStyle.fontSize ?? DEFAULT_LINK_STYLE.fontSize ?? 10;
    if (key === "baseNodeStyle.gateRadius") return this.ebPlugin.settings.baseNodeStyle.gateRadius ?? DEFAULT_NODE_STYLE.gateRadius ?? 5;
    return this.ebPlugin.settings[key as keyof ExcaliBrainSettings];
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    const hierarchyKey = HIERARCHY_KEY_MAP[key];
    if (hierarchyKey) {
      this.ebPlugin.settings.hierarchy[hierarchyKey] = fromCsv(String(value));
      await this.ebPlugin.saveSettings(true);
      return;
    }

    if (key === "excludeFilepathsCsv") {
      this.ebPlugin.settings.excludeFilepaths = fromCsv(String(value));
      await this.ebPlugin.saveSettings(false);
      return;
    }

    if (key === "backgroundColorHex") {
      const hex = String(value).slice(0, 7).toLowerCase();
      this.ebPlugin.settings.backgroundColor = `${hex}ff`;
      await this.ebPlugin.saveSettings(false);
      return;
    }

    if (key === "baseLinkStyle.strokeColorHex") {
      this.ebPlugin.settings.baseLinkStyle.strokeColor = eightHex(String(value));
      await this.ebPlugin.saveSettings(false);
      return;
    }
    if (key === "baseLinkStyle.strokeWidth") {
      this.ebPlugin.settings.baseLinkStyle.strokeWidth = Math.max(0.5, Math.min(8, Number(value) || 1));
      await this.ebPlugin.saveSettings(false);
      return;
    }
    if (key === "baseLinkStyle.strokeStyle") {
      const next = String(value);
      this.ebPlugin.settings.baseLinkStyle.strokeStyle = next === "dashed" || next === "dotted" ? next : "solid";
      await this.ebPlugin.saveSettings(false);
      return;
    }
    if (key === "baseLinkStyle.startArrowHead") {
      this.ebPlugin.settings.baseLinkStyle.startArrowHead = String(value) as Arrowhead;
      await this.ebPlugin.saveSettings(false);
      return;
    }
    if (key === "baseLinkStyle.endArrowHead") {
      this.ebPlugin.settings.baseLinkStyle.endArrowHead = String(value) as Arrowhead;
      await this.ebPlugin.saveSettings(false);
      return;
    }
    if (key === "baseLinkStyle.showLabel") {
      this.ebPlugin.settings.baseLinkStyle.showLabel = Boolean(value);
      await this.ebPlugin.saveSettings(false);
      return;
    }
    if (key === "baseLinkStyle.textColorHex") {
      this.ebPlugin.settings.baseLinkStyle.textColor = eightHex(String(value));
      await this.ebPlugin.saveSettings(false);
      return;
    }
    if (key === "baseLinkStyle.fontSize") {
      this.ebPlugin.settings.baseLinkStyle.fontSize = Math.max(7, Math.min(24, Number(value) || 10));
      await this.ebPlugin.saveSettings(false);
      return;
    }
    if (key === "baseNodeStyle.gateRadius") {
      this.ebPlugin.settings.baseNodeStyle.gateRadius = Number(value);
      await this.ebPlugin.saveSettings(false);
      return;
    }

    const settingKey = key as keyof ExcaliBrainSettings;
    (this.ebPlugin.settings as unknown as Record<string, unknown>)[settingKey] = value;
    if (key === "renderAlias" || key === "nameFields") {
      await this.ebPlugin.saveSettings(false, false);
      this.ebPlugin.index.refreshDisplayNames();
      return;
    }
    await this.ebPlugin.saveSettings(REINDEX_SETTING_KEYS.has(key));
  }
}
