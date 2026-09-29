/**
 * Obsidian settings persistence, bounded legacy graph import, declarative controls and style/ontology
 * managers. Foreign imports cannot change plugin workflow preferences; own persisted K-Plex keys
 * remain stable. All saves cross the plugin settings-impact classifier; the injected translator
 * owns display copy.
 */
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
import type KplexPlugin from "./main";
import type { Arrowhead, Hierarchy, LinkStyle, NodeStyle, Role } from "./types";
import { sanitizeGraphLensDefinitions, type GraphLensDefinition } from "./lens/GraphLens";
import { collectionWindow } from "./ui/components/collectionWindow";
import { createObsidianTranslator } from "./adapters/obsidian/localization";
import type { Translator, PlainTranslationKey } from "./lang";

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

export interface KplexSettings {
  compactView: boolean;
  compactingFactor: number;
  minLinkLength: number;
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
  centralNodeMarkdownMode: SidecarMarkdownMode;
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
  /** Whether the one-time startup indexing guidance bubble has already been shown. */
  startupIndexInfoBubbleSeen: boolean;
  /** Whether K-Plex has already shown the first-use delete confirmation/preferences prompt. */
  deletePromptInitialized: boolean;
  /** Ask for confirmation before deleting a real note file from the node context menu. */
  confirmFileDelete: boolean;
}

export const DEFAULT_SETTINGS: KplexSettings = {
  compactView: false,
  compactingFactor: 2,
  minLinkLength: 18,
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
  centralNodeMarkdownMode: "source",
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
  startupIndexInfoBubbleSeen: false,
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

/**
 * Only ontology inputs and graph/node/link appearance cross the legacy import boundary. Plugin
 * commands, CSS, navigation, workspace state, editor preferences and scheduling never do.
 * Existing K-Plex data continues to load through migrateAndMergeSettings without this filter.
 */
const LEGACY_GRAPH_SETTING_KEYS = [
  "hierarchy", "inferAllLinksAsFriends", "inverseInfer", "excludeFilepaths",
  "compactView", "compactingFactor", "minLinkLength", "backgroundColor", "inverseArrowDirection",
  "renderAlias", "nameFields", "showInferredNodes", "showAttachments", "showURLNodes",
  "showVirtualNodes", "showFolderNodes", "showTagNodes", "showPageNodes", "showNeighborCount",
  "showFullTagName", "maxItemCount", "renderSiblings", "siblingRelativeSize", "crossLinkOpacity",
  "baseNodeStyle", "centralNodeStyle", "inferredNodeStyle", "urlNodeStyle", "virtualNodeStyle",
  "siblingNodeStyle", "attachmentNodeStyle", "folderNodeStyle", "tagNodeStyle", "tagNodeStyles",
  "tagStyleList", "primaryTagField", "displayAllStylePrefixes", "baseLinkStyle", "inferredLinkStyle",
  "folderLinkStyle", "tagLinkStyle", "hierarchyLinkStyles",
] as const satisfies readonly (keyof KplexSettings)[];

/** Recognize a settings/property object without treating arrays or null as containers. */
function isSettingsRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Import legacy graph configuration over current K-Plex preferences, or defaults on first run.
 * Only allowlisted graph settings are copied; foreign commands, CSS, unknown keys and plugin
 * workflow state cannot overwrite local preferences. Own persisted K-Plex settings are not filtered.
 * The caller owns persistence and any required index refresh. No host state is changed here.
 */
export function importExcaliBrainGraphSettings(raw: unknown, current?: KplexSettings): KplexSettings {
  const source = isSettingsRecord(raw) ? raw : {};
  // Detach imported dictionaries from a running legacy plugin before K-Plex style editors use them.
  const imported = structuredClone(Object.fromEntries(LEGACY_GRAPH_SETTING_KEYS
    .filter((key) => Object.prototype.hasOwnProperty.call(source, key))
    .map((key) => [key, source[key]])));
  const hierarchy = isSettingsRecord(imported.hierarchy) ? imported.hierarchy : {};
  // A legacy friends-only field must replace the local leftFriends default, not be masked by it.
  const leftFriends = hierarchy.leftFriends ?? hierarchy.friends ?? current?.hierarchy.leftFriends;
  return migrateAndMergeSettings({
    ...current,
    ...imported,
    hierarchy: {
      ...current?.hierarchy,
      ...hierarchy,
      ...(leftFriends === undefined ? {} : { leftFriends }),
    },
  });
}

/** Normalize this plugin's persisted settings, preserving K-Plex preferences across reloads. */
export function migrateAndMergeSettings(raw: unknown): KplexSettings {
  const rawSettings = (raw && typeof raw === "object" ? raw : {}) as Partial<KplexSettings> & {
    hierarchy?: Partial<Hierarchy>;
    maxZoom?: unknown;
    excalibrainFilepath?: unknown;
  };
  // Both values belonged to retired render surfaces and carry no K-Plex state.
  const { maxZoom: _legacyMaxZoom, excalibrainFilepath: _legacyDrawingPath, ...old } = rawSettings;
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
    // ExcaliBrain persisted `embedCentralNode` for its own center presentation. K-Plex's native
    // embedded editor is a different, explicitly opt-in surface, so legacy imports must start
    // with the normal central node. Existing initialized K-Plex vaults keep the user's choice.
    embedCentralNode: old.kplexInitialized ? Boolean(old.embedCentralNode) : false,
    centralNodeMarkdownMode: old.centralNodeMarkdownMode === "preview" ? "preview" : "source",
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
    startupIndexInfoBubbleSeen: Boolean(old.startupIndexInfoBubbleSeen),
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

type OntologyStyleField = { name: string; roles: Role[] };
type NodeStyleEntry = { name: string; kind: "property" | "tag" };
type NodeStyleValueSuggestion = { value: string; display: string; kind: "property" | "tag" | "configured" };

class NodeStyleValueSuggest extends AbstractInputSuggest<NodeStyleValueSuggestion> {
  private readonly input: HTMLInputElement;
  private readonly translate = createObsidianTranslator();

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

  /** Render the actual suggested value, using localized help only for plugin-owned annotations. */
  renderSuggestion(item: NodeStyleValueSuggestion, el: HTMLElement): void {
    const line = el.createDiv({ cls: "kplex-input-suggestion-line" });
    appendIcon(line, item.kind === "tag" ? "tag" : item.kind === "configured" ? "palette" : "list-tree");
    line.createSpan({ text: item.display });
    el.createDiv({
      cls: "suggestion-note",
      text: this.translate(item.kind === "tag" ? "styles.vaultTag" : item.kind === "configured" ? "styles.configuredStyle" : "styles.existingPropertyValue"),
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

/** Map a semantic role to a parameter-free catalog key for localized settings captions. */
const roleLabelKey = (role: Role): PlainTranslationKey => {
  switch (role) {
    case "parent": return "role.parent";
    case "child": return "role.child";
    case "left": return "role.friend";
    case "right": return "role.challenger";
    case "previous": return "role.previous";
    case "next": return "role.next";
    case "sibling": return "role.sibling";
  }
};

/** Format a stored arrowhead value as a localized caption without changing the persisted enum. */
const arrowheadLabel = (arrowhead: Arrowhead, translate: Translator): string => {
  switch (arrowhead) {
    case "arrow": return translate("styles.arrowArrow");
    case "triangle": return translate("styles.arrowTriangle");
    case "dot": return translate("styles.arrowDot");
    case "bar": return translate("styles.arrowBar");
    case "none": return translate("styles.arrowNone");
  }
};

/** Summarize the effective link-style overrides using localized labels and original color/width values. */
const describeLinkStyle = (style: LinkStyle | undefined, baseStyle: LinkStyle, translate: Translator): string => {
  const effective = { ...baseStyle, ...(style ?? {}) };
  const strokeStyle = effective.strokeStyle ?? "solid";
  const strokeKey = strokeStyle === "dashed" ? "styles.dashed" : strokeStyle === "dotted" ? "styles.dotted" : "styles.solid";
  const parts = [
    translate(strokeKey),
    `${effective.strokeWidth ?? 1}px`,
    sixHex(effective.strokeColor, "#696969"),
  ];
  if ((effective.startArrowHead ?? "none") !== "none" || (effective.endArrowHead ?? "none") !== "none") {
    parts.push(`${arrowheadLabel(effective.startArrowHead ?? "none", translate)} → ${arrowheadLabel(effective.endArrowHead ?? "none", translate)}`);
  }
  if (effective.showLabel) parts.push(translate("styles.summaryLabel"));
  if (effective.roughness !== undefined && effective.roughness !== baseStyle.roughness) parts.push(translate("styles.summaryRoughness", { value: effective.roughness }));
  if (effective.fontFamily !== undefined && effective.fontFamily !== baseStyle.fontFamily) parts.push(translate("styles.summaryFont", { value: effective.fontFamily }));
  return parts.join(" · ");
};

/** Summarize a node style with localized property labels while preserving its stored visual values. */
const describeNodeStyle = (style: NodeStyle, translate: Translator): string => {
  const parts: string[] = [];
  if (style.icon) parts.push(translate("styles.summaryIcon", { icon: style.icon }));
  if (style.fontSize) parts.push(`${style.fontSize}px`);
  if (style.backgroundColor) parts.push(sixHex(style.backgroundColor));
  return parts.length ? parts.join(" · ") : translate("styles.inheritedNodeDefaults");
};

class NoteTypeStyleModal extends Modal {
  private readonly translate = createObsidianTranslator();

  constructor(
    app: App,
    private initialName: string | null,
    private initialStyle: NodeStyle,
    private styleProperty: string,
    private valueSuggestions: NodeStyleValueSuggestion[],
    private onSave: (name: string, style: NodeStyle, previousName: string | null) => Promise<void>,
    private onDelete?: (name: string) => Promise<void>,
    private legacyTag = false,
  ) {
    super(app);
  }

  /** Render the note-type style controls with localized captions and feedback; the native Modal owns its open/close shell. */
  onOpen(): void {
    this.titleEl.setText(this.translate(this.initialName ? "styles.editNode" : "styles.addNode"));
    this.modalEl.addClass("kplex-style-editor-modal");
    this.contentEl.addClass("kplex-style-editor");
    this.contentEl.createEl("p", {
      text: this.legacyTag
        ? this.translate("styles.legacyTagHelp")
        : this.translate("styles.propertyHelp", { property: this.styleProperty || "Note type" }),
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
    nameInput.placeholder = this.translate("styles.propertyValuePlaceholder");
    field(this.translate(this.legacyTag ? "styles.tagPrefix" : "styles.propertyValue"), nameInput);
    new NodeStyleValueSuggest(this.app, nameInput, this.valueSuggestions);

    const prefixInput = this.legacyTag ? form.createEl("input") : null;
    if (prefixInput) {
      prefixInput.type = "text";
      prefixInput.value = this.initialStyle.prefix ?? "";
      field(this.translate("styles.labelPrefix"), prefixInput);
    }

    const iconInput = form.createEl("input");
    iconInput.type = "text";
    iconInput.value = this.initialStyle.icon ?? "";
    iconInput.placeholder = this.translate("styles.lucidePlaceholder");
    field(this.translate("styles.lucideIcon"), iconInput);
    new LucideIconSuggest(this.app, iconInput);

    const background = form.createEl("input");
    background.type = "color";
    background.value = sixHex(this.initialStyle.backgroundColor, "#182433");
    field(this.translate("styles.background"), background);

    const text = form.createEl("input");
    text.type = "color";
    text.value = sixHex(this.initialStyle.textColor, "#ffffff");
    field(this.translate("styles.text"), text);

    const border = form.createEl("input");
    border.type = "color";
    border.value = sixHex(this.initialStyle.borderColor, "#6f849a");
    field(this.translate("styles.border"), border);

    const fontSize = form.createEl("input");
    fontSize.type = "number";
    fontSize.min = "8";
    fontSize.max = "40";
    fontSize.step = "1";
    fontSize.value = String(this.initialStyle.fontSize ?? 18);
    field(this.translate("styles.fontSize"), fontSize);

    const actions = this.contentEl.createDiv({ cls: "kplex-style-actions" });
    if (this.initialName && this.onDelete) {
      const remove = actions.createEl("button", { cls: "mod-warning", text: this.translate("common.delete") });
      appendIcon(remove, "trash-2");
      remove.addEventListener("click", () => {
        void this.onDelete!(this.initialName!).then(() => this.close());
      });
    }
    const cancel = actions.createEl("button", { text: this.translate("common.cancel") });
    appendIcon(cancel, "x");
    cancel.addEventListener("click", () => this.close());

    const save = actions.createEl("button", { cls: "mod-cta", text: this.translate("common.save") });
    appendIcon(save, "check");
    save.addEventListener("click", () => {
      const name = this.legacyTag ? nameInput.value.trim() : normalizeNodeStyleValue(nameInput.value);
      if (!name) {
        nameInput.focus();
        nameInput.classList.add("is-invalid");
        return;
      }
      const style: NodeStyle = {
        ...this.initialStyle,
        icon: iconInput.value.trim() || undefined,
        backgroundColor: background.value === sixHex(this.initialStyle.backgroundColor, "#182433") ? this.initialStyle.backgroundColor : eightHex(background.value),
        textColor: text.value === sixHex(this.initialStyle.textColor, "#ffffff") ? this.initialStyle.textColor : eightHex(text.value),
        borderColor: border.value === sixHex(this.initialStyle.borderColor, "#6f849a") ? this.initialStyle.borderColor : eightHex(border.value),
        fontSize: fontSize.value === String(this.initialStyle.fontSize ?? 18) ? this.initialStyle.fontSize : Math.max(8, Math.min(40, Number(fontSize.value) || 18)),
        ...(prefixInput ? { prefix: prefixInput.value } : {}),
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
  private readonly translate = createObsidianTranslator();

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

  /** Render the ontology-link style controls with localized captions and feedback; the native Modal owns its open/close shell. */
  onOpen(): void {
    this.titleEl.setText(this.translate("styles.linkEditorTitle", { field: this.fieldName }));
    this.modalEl.addClass("kplex-style-editor-modal");
    this.contentEl.addClass("kplex-style-editor");
    this.contentEl.createEl("p", {
      text: this.translate("styles.linkEditorHelp"),
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
    field(this.translate("styles.lineColor"), strokeColor);

    const strokeWidth = form.createEl("input");
    strokeWidth.type = "number";
    strokeWidth.min = "0.5";
    strokeWidth.max = "8";
    strokeWidth.step = "0.5";
    strokeWidth.value = String(effective.strokeWidth ?? 1);
    field(this.translate("styles.lineWidth"), strokeWidth);

    const strokeStyle = form.createEl("select");
    for (const [value, label] of Object.entries({ solid: this.translate("styles.solid"), dashed: this.translate("styles.dashed"), dotted: this.translate("styles.dotted") })) {
      const option = strokeStyle.createEl("option", { text: label, attr: { value } });
      if (value === (effective.strokeStyle ?? "solid")) option.selected = true;
    }
    field(this.translate("styles.lineStyle"), strokeStyle);

    const arrowSelect = (selected: Arrowhead): HTMLSelectElement => {
      const select = form.createEl("select");
      for (const [value, label] of Object.entries(arrowOptions(this.translate))) {
        const option = select.createEl("option", { text: label, attr: { value } });
        if (value === selected) option.selected = true;
      }
      return select;
    };
    const startArrow = arrowSelect(effective.startArrowHead ?? "none");
    field(this.translate("styles.startArrowhead"), startArrow);
    const endArrow = arrowSelect(effective.endArrowHead ?? "none");
    field(this.translate("styles.endArrowhead"), endArrow);

    const showLabel = form.createEl("input");
    showLabel.type = "checkbox";
    showLabel.checked = effective.showLabel ?? false;
    field(this.translate("styles.showOntologyLabel"), showLabel);

    const textColor = form.createEl("input");
    textColor.type = "color";
    textColor.value = sixHex(effective.textColor, "#ffffff");
    field(this.translate("styles.labelColor"), textColor);

    const fontSize = form.createEl("input");
    fontSize.type = "number";
    fontSize.min = "7";
    fontSize.max = "24";
    fontSize.step = "1";
    fontSize.value = String(effective.fontSize ?? 10);
    field(this.translate("styles.labelSize"), fontSize);

    const actions = this.contentEl.createDiv({ cls: "kplex-style-actions" });
    const reset = actions.createEl("button", { cls: "mod-warning", text: this.translate("styles.reset") });
    appendIcon(reset, "rotate-ccw");
    reset.addEventListener("click", () => {
      void this.onReset().then(() => this.close());
    });
    const cancel = actions.createEl("button", { text: this.translate("common.cancel") });
    appendIcon(cancel, "x");
    cancel.addEventListener("click", () => this.close());
    const save = actions.createEl("button", { cls: "mod-cta", text: this.translate("common.save") });
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
  private role: "all" | Role = "all";
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

  /** Render the searchable ontology-link style manager with localized captions and feedback; the native Modal owns its open/close shell. */
  onOpen(): void {
    this.titleEl.setText(this.translate("styles.relationshipTitle"));
    this.modalEl.addClass("kplex-style-manager-modal");
    this.contentEl.addClass("kplex-style-manager");
    this.contentEl.createEl("p", {
      text: this.translate("styles.relationshipHelp"),
    });

    const controls = this.contentEl.createDiv({ cls: "kplex-style-manager-controls" });
    const searchWrap = controls.createDiv({ cls: "search-input-container kplex-style-manager-search" });
    const search = searchWrap.createEl("input", {
      attr: { type: "search", placeholder: this.translate("styles.searchRelationshipPlaceholder"), "aria-label": this.translate("styles.searchRelationshipAria") },
    });
    search.addEventListener("input", () => {
      this.search = search.value.trim().toLowerCase();
      this.visibleLimit = 12;
      this.renderList();
    });

    const scope = controls.createEl("select", { attr: { "aria-label": this.translate("styles.linkStyleScope"), "data-kplex-style-scope": "true" } });
    scope.createEl("option", { text: this.translate("styles.customStyles"), attr: { value: "custom" } });
    scope.createEl("option", { text: this.translate("styles.allRelationshipFields"), attr: { value: "all" } });
    scope.value = this.displayScope;
    scope.addEventListener("change", () => {
      this.displayScope = scope.value === "all" ? "all" : "custom";
      this.visibleLimit = 12;
      this.renderList();
    });

    const role = controls.createEl("select", { attr: { "aria-label": this.translate("styles.ontologyRole") } });
    role.createEl("option", { text: this.translate("styles.allRoles"), attr: { value: "all" } });
    const roleOptions: Role[] = ["parent", "child", "left", "right", "previous", "next"];
    for (const value of roleOptions) {
      role.createEl("option", { text: this.translate(roleLabelKey(value)), attr: { value } });
    }
    role.addEventListener("change", () => {
      this.role = role.value === "all" ? "all" : role.value as Role;
      this.visibleLimit = 12;
      this.renderList();
    });

    this.statusEl = this.contentEl.createDiv({ cls: "kplex-style-manager-status" });
    this.listEl = this.contentEl.createDiv({ cls: "kplex-style-manager-list" });
    this.renderList();
    window.setTimeout(() => search.focus(), 0);
  }

  /** Rebuild the searchable ontology-link style manager entries with localized status/actions while preserving actual field and style values. */
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
    const statusKey = this.displayScope === "custom"
      ? (scopeCount === 1 ? (matches.length === 1 ? "styles.statusCustom11" : "styles.statusCustom1n") : (matches.length === 1 ? "styles.statusCustomn1" : "styles.statusCustomnn"))
      : (scopeCount === 1 ? (matches.length === 1 ? "styles.statusFields11" : "styles.statusFields1n") : (matches.length === 1 ? "styles.statusFieldsn1" : "styles.statusFieldsnn"));
    this.statusEl.setText(this.translate(statusKey, { scopeCount, matches: matches.length }));

    if (!matches.length) {
      const empty = this.listEl.createDiv({ cls: "kplex-style-manager-empty" });
      empty.createEl("p", {
        text: this.translate(this.displayScope === "custom" ? "styles.noCustomMatches" : "styles.noRelationshipMatches"),
      });
      if (this.displayScope === "custom") {
        const browse = empty.createEl("button", { text: this.translate("styles.browseAllRelationships") });
        browse.addEventListener("click", () => {
          this.displayScope = "all";
          const select = this.contentEl.querySelector<HTMLSelectElement>('.kplex-style-manager-controls select[data-kplex-style-scope]');
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
      for (const role of field.roles) badges.createSpan({ text: this.translate(roleLabelKey(role)), cls: "kplex-style-manager-badge" });
      copy.createDiv({
        text: this.translate(customized ? "styles.customSummary" : "styles.defaultSummary", { summary: describeLinkStyle(style, this.baseStyle, this.translate) }),
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
    private getEntries: () => NodeStyleEntry[],
    private getStyle: (entry: NodeStyleEntry) => NodeStyle,
    private onEdit: (entry: NodeStyleEntry | null, afterChange: () => void) => void,
  ) {
    super(app);
  }

  /** Render the searchable note-type style manager with localized captions and feedback; the native Modal owns its open/close shell. */
  onOpen(): void {
    this.titleEl.setText(this.translate("styles.nodeTitle"));
    this.modalEl.addClass("kplex-style-manager-modal");
    this.contentEl.addClass("kplex-style-manager");
    this.contentEl.createEl("p", {
      text: this.translate("styles.managerHelp", { property: this.styleProperty || "Note type" }),
    });

    const controls = this.contentEl.createDiv({ cls: "kplex-style-manager-controls" });
    const searchWrap = controls.createDiv({ cls: "search-input-container kplex-style-manager-search" });
    const search = searchWrap.createEl("input", {
      attr: { type: "search", placeholder: this.translate("styles.searchNodePlaceholder"), "aria-label": this.translate("styles.searchNodeAria") },
    });
    search.addEventListener("input", () => {
      this.search = search.value.trim().toLowerCase();
      this.visibleLimit = 12;
      this.renderList();
    });
    const add = controls.createEl("button", { cls: "mod-cta", text: this.translate("styles.addStyle") });
    appendIcon(add, "plus");
    add.addEventListener("click", () => this.onEdit(null, () => this.renderList()));

    this.statusEl = this.contentEl.createDiv({ cls: "kplex-style-manager-status" });
    this.listEl = this.contentEl.createDiv({ cls: "kplex-style-manager-list" });
    this.renderList();
    window.setTimeout(() => search.focus(), 0);
  }

  /** Rebuild the searchable note-type style manager entries with localized status/actions while preserving actual field and style values. */
  private renderList(): void {
    if (!this.listEl || !this.statusEl) return;
    this.listEl.empty();
    const entries = this.getEntries();
    const matches = entries.filter((entry) => !this.search || entry.name.toLowerCase().includes(this.search));
    this.statusEl.setText(this.translate("styles.resultCount", { count: entries.length, results: matches.length }));

    if (!matches.length) {
      this.listEl.createDiv({
        cls: "kplex-style-manager-empty",
        text: this.translate(entries.length ? "styles.noMatches" : "styles.noneConfigured"),
      });
      return;
    }

    const windowed = collectionWindow(matches, this.visibleLimit, 20);
    for (const entry of windowed.visible) {
      const style = this.getStyle(entry);
      const row = this.listEl.createEl("button", { cls: "kplex-style-manager-row" });
      row.type = "button";
      const swatch = row.createSpan({ cls: "kplex-style-manager-node-swatch" });
      swatch.setCssProps({
        "--kplex-style-node-bg": sixHex(style.backgroundColor, "#000000"),
        "--kplex-style-node-border": sixHex(style.borderColor, "#6f849a"),
      });
      const copy = row.createDiv({ cls: "kplex-style-manager-copy" });
      copy.createDiv({ text: entry.name, cls: "kplex-style-manager-name" });
      copy.createDiv({ text: this.translate(entry.kind === "tag" ? "styles.legacyTag" : "styles.propertyValue"), cls: "kplex-style-manager-badge" });
      copy.createDiv({ text: describeNodeStyle(style, this.translate), cls: "kplex-style-manager-summary" });
      appendIcon(row, "chevron-right");
      row.addEventListener("click", () => this.onEdit(entry, () => this.renderList()));
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

  /** Render the discovered, unassigned ontology-field manager with localized captions and feedback; the native Modal owns its open/close shell. */
  onOpen(): void {
    this.titleEl.setText(this.translate("settings.unassignedTitle"));
    this.modalEl.addClass("kplex-style-manager-modal");
    this.contentEl.addClass("kplex-style-manager");
    this.contentEl.createEl("p", {
      text: this.translate("settings.unassignedHelp"),
    });

    const controls = this.contentEl.createDiv({ cls: "kplex-style-manager-controls" });
    const searchWrap = controls.createDiv({ cls: "search-input-container kplex-style-manager-search" });
    const search = searchWrap.createEl("input", {
      attr: { type: "search", placeholder: this.translate("settings.searchDiscoveredPlaceholder"), "aria-label": this.translate("settings.searchDiscoveredAria") },
    });
    search.addEventListener("input", () => {
      this.search = search.value.trim().toLowerCase();
      this.visibleLimit = 16;
      this.renderList();
    });

    const sort = controls.createEl("select", { attr: { "aria-label": this.translate("settings.sortDiscovered") } });
    sort.createEl("option", { text: this.translate("settings.mostUsed"), attr: { value: "frequency" } });
    sort.createEl("option", { text: this.translate("settings.az"), attr: { value: "name" } });
    sort.value = this.sortMode;
    sort.addEventListener("change", () => {
      this.sortMode = sort.value === "name" ? "name" : "frequency";
      this.visibleLimit = 16;
      this.renderList();
    });

    const refresh = controls.createEl("button", { text: this.translate("settings.refresh") });
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

  /** Rebuild the discovered, unassigned ontology-field manager entries with localized status/actions while preserving actual field and style values. */
  private renderList(): void {
    if (!this.listEl || !this.statusEl) return;
    this.listEl.empty();
    const all = this.getFields();
    const matches = all
      .filter((field) => !this.search || field.name.toLowerCase().includes(this.search))
      .sort((a, b) => this.sortMode === "name"
        ? a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        : b.count - a.count || a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    const statusKey = all.length === 1
      ? (matches.length === 1 ? "settings.unassignedStatus11" : "settings.unassignedStatus1n")
      : (matches.length === 1 ? "settings.unassignedStatusn1" : "settings.unassignedStatusnn");
    this.statusEl.setText(this.translate(statusKey, { count: all.length, results: matches.length }));

    if (!matches.length) {
      this.listEl.createDiv({
        cls: "kplex-style-manager-empty",
        text: this.translate(all.length ? "settings.noDiscoveredMatches" : "settings.allDiscoveredAssigned"),
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
        text: this.translate(field.count === 1 ? "settings.occurrenceOne" : "settings.occurrenceMany", { count: field.count }),
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
  private readonly translate = createObsidianTranslator();

  constructor(app: App, private plugin: KplexPlugin, private onImported: () => void) {
    super(app);
  }

  /** Render the legacy settings import chooser with localized captions and feedback; the native Modal owns its open/close shell. */
  onOpen(): void {
    this.titleEl.setText(this.translate("settings.importTitle"));
    this.contentEl.addClass("kplex-import-settings-modal");

    this.contentEl.createEl("p", {
      text: this.translate("settings.importHelp")
    });

    const fileRow = this.contentEl.createDiv({ cls: "kplex-import-file-row" });
    const fileInput = fileRow.createEl("input", { attr: { type: "file", accept: "application/json,.json" } });
    const status = this.contentEl.createDiv({ cls: "kplex-import-status", text: this.translate("settings.noFileSelected") });

    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (!file) {
        this.rawText = "";
        status.setText(this.translate("settings.noFileSelected"));
        return;
      }
      void file.text().then((text) => {
        this.rawText = text;
        status.setText(file.name);
      }).catch((error: unknown) => {
        this.rawText = "";
        status.setText(this.translate("settings.fileReadFailed", { error: String(error) }));
      });
    });

    const actions = this.contentEl.createDiv({ cls: "kplex-style-actions" });
    const cancel = actions.createEl("button", { text: this.translate("common.cancel") });
    appendIcon(cancel, "x");
    cancel.addEventListener("click", () => this.close());

    const importButton = actions.createEl("button", { cls: "mod-cta", text: this.translate("settings.importButton") });
    appendIcon(importButton, "download");
    importButton.addEventListener("click", () => {
      if (!this.rawText) {
        status.setText(this.translate("settings.chooseFileFirst"));
        return;
      }
      try {
        const parsed = JSON.parse(this.rawText) as unknown;
        this.plugin.settings = importExcaliBrainGraphSettings(parsed, this.plugin.settings);
      } catch (error) {
        status.setText(this.translate("settings.invalidJson", { error: String(error) }));
        return;
      }
      importButton.disabled = true;
      void this.plugin.saveSettings(true).then(() => {
        new Notice(this.translate("settings.importedNotice"), 2600);
        this.onImported();
        this.close();
      }).catch((error: unknown) => {
        importButton.disabled = false;
        status.setText(this.translate("settings.importFailed", { error: String(error) }));
      });
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

type DeclarativeSettingKey =
  | keyof KplexSettings
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

/** Provide localized arrowhead dropdown labels keyed by the unchanged persisted arrowhead values. */
const arrowOptions = (translate: Translator): Record<Arrowhead, string> => ({
  none: translate("styles.arrowNone"),
  arrow: translate("styles.arrowArrow"),
  triangle: translate("styles.arrowTriangle"),
  dot: translate("styles.arrowDot"),
  bar: translate("styles.arrowBar"),
});

export class KplexSettingTab extends PluginSettingTab {
  constructor(app: App, private kplexPlugin: KplexPlugin) {
    super(app, kplexPlugin);
    this.containerEl.addClass("kplex-settings");
  }

  private openNoteTypeStyleEditor(name: string | null, afterChange?: () => void): void {
    const style = name ? this.kplexPlugin.settings.noteTypeStyles[name] ?? {} : {};
    new NoteTypeStyleModal(
      this.app,
      name,
      style,
      this.kplexPlugin.settings.noteTypeField,
      this.nodeStyleValueSuggestions(),
      async (nextName, nextStyle, previousName) => {
        const normalizedNext = normalizeNodeStyleValue(nextName);
        if (previousName && previousName !== normalizedNext) delete this.kplexPlugin.settings.noteTypeStyles[previousName];
        this.kplexPlugin.settings.noteTypeStyles[normalizedNext] = nextStyle;
        await this.kplexPlugin.saveSettings(false);
        afterChange?.();
        this.update();
      },
      async (removeName) => {
        delete this.kplexPlugin.settings.noteTypeStyles[removeName];
        await this.kplexPlugin.saveSettings(false);
        afterChange?.();
        this.update();
      },
    ).open();
  }

  private openLegacyTagStyleEditor(name: string, afterChange?: () => void): void {
    new NoteTypeStyleModal(
      this.app, name, this.kplexPlugin.settings.tagNodeStyles[name] ?? {},
      this.kplexPlugin.settings.primaryTagField, [],
      async (nextName, nextStyle, previousName) => {
        const settings = this.kplexPlugin.settings;
        if (previousName && previousName !== nextName) delete settings.tagNodeStyles[previousName];
        settings.tagNodeStyles[nextName] = nextStyle;
        // Preserve first-match priority when renaming, including overlapping tag prefixes.
        settings.tagStyleList = settings.tagStyleList.map((key) => key === previousName ? nextName : key);
        if (!settings.tagStyleList.includes(nextName)) settings.tagStyleList.push(nextName);
        await this.kplexPlugin.saveSettings(false);
        afterChange?.();
        this.update();
      },
      async (removeName) => {
        delete this.kplexPlugin.settings.tagNodeStyles[removeName];
        this.kplexPlugin.settings.tagStyleList = this.kplexPlugin.settings.tagStyleList.filter((key) => key !== removeName);
        await this.kplexPlugin.saveSettings(false);
        afterChange?.();
        this.update();
      },
      true,
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
    for (const name of Object.keys(this.kplexPlugin.settings.noteTypeStyles)) put(name, normalizeNodeStyleValue(name), "configured");
    for (const page of this.kplexPlugin.index.allPages()) {
      if (page.noteType) put(page.noteType, page.noteType, "property");
      for (const tag of page.tags) {
        const normalized = normalizeNodeStyleValue(tag);
        if (normalized) put(normalized, `#${normalized}`, "tag");
      }
    }
    return [...values.values()].sort((a, b) => a.display.localeCompare(b.display, undefined, { sensitivity: "base" }));
  }

  private nodeStyleEntries(): NodeStyleEntry[] {
    return [
      ...Object.keys(this.kplexPlugin.settings.noteTypeStyles).map((name): NodeStyleEntry => ({ name, kind: "property" })),
      ...Object.keys(this.kplexPlugin.settings.tagNodeStyles).map((name): NodeStyleEntry => ({ name, kind: "tag" })),
    ].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }

  private openNoteTypeStylesManager(): void {
    new NoteTypeStylesManagerModal(
      this.app,
      this.kplexPlugin.settings.noteTypeField,
      () => this.nodeStyleEntries(),
      (entry) => (entry.kind === "tag" ? this.kplexPlugin.settings.tagNodeStyles : this.kplexPlugin.settings.noteTypeStyles)[entry.name] ?? {},
      (entry, afterChange) => entry?.kind === "tag"
        ? this.openLegacyTagStyleEditor(entry.name, afterChange)
        : this.openNoteTypeStyleEditor(entry?.name ?? null, afterChange),
    ).open();
  }

  /** Build style-manager entries from configured ontology fields, preserving field values and localizing fallback role captions. */
  private ontologyStyleFields(): OntologyStyleField[] {
    const roleGroups: [Role, string[]][] = [
      ["parent", this.kplexPlugin.settings.hierarchy.parents],
      ["child", this.kplexPlugin.settings.hierarchy.children],
      ["left", this.kplexPlugin.settings.hierarchy.leftFriends],
      ["right", this.kplexPlugin.settings.hierarchy.rightFriends],
      ["previous", this.kplexPlugin.settings.hierarchy.previous],
      ["next", this.kplexPlugin.settings.hierarchy.next],
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
    // Imported overrides may outlive their ontology assignment; keep them inspectable/editable.
    for (const name of Object.keys(this.kplexPlugin.settings.hierarchyLinkStyles)) {
      const key = normalizeOntologyStyleKey(name);
      if (key && !fields.has(key)) fields.set(key, { name, roles: [] });
    }
    return [...fields.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }

  private ontologyLinkStyle(fieldName: string): LinkStyle | undefined {
    const key = normalizeOntologyStyleKey(fieldName);
    return this.kplexPlugin.settings.hierarchyLinkStyles[key] ?? this.kplexPlugin.settings.hierarchyLinkStyles[fieldName];
  }

  private openOntologyLinkStyleEditor(fieldName: string, afterChange?: () => void): void {
    const key = normalizeOntologyStyleKey(fieldName);
    const style = this.ontologyLinkStyle(fieldName) ?? {};
    new OntologyLinkStyleModal(
      this.app,
      fieldName,
      style,
      this.kplexPlugin.settings.baseLinkStyle,
      async (nextStyle) => {
        // Normalize keys on write so aliases/casing in the ontology definition do not create
        // duplicate style entries for the same semantic property.
        delete this.kplexPlugin.settings.hierarchyLinkStyles[fieldName];
        this.kplexPlugin.settings.hierarchyLinkStyles[key] = nextStyle;
        await this.kplexPlugin.saveSettings(false);
        afterChange?.();
        this.update();
      },
      async () => {
        delete this.kplexPlugin.settings.hierarchyLinkStyles[fieldName];
        delete this.kplexPlugin.settings.hierarchyLinkStyles[key];
        await this.kplexPlugin.saveSettings(false);
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
      this.kplexPlugin.settings.baseLinkStyle,
      (fieldName, afterChange) => this.openOntologyLinkStyleEditor(fieldName, afterChange),
    ).open();
  }

  private openUnassignedOntologyManager(): void {
    new UnassignedOntologyManagerModal(
      this.app,
      () => this.kplexPlugin.index.unassignedOntologyFields(),
      (fieldName, afterChange) => this.kplexPlugin.openAddToOntologyModal(fieldName, afterChange),
      async () => {
        await this.kplexPlugin.rebuildIndex(true, true, "ontology-discovery");
      },
    ).open();
  }

  private openLegacySettingsImporter(): void {
    new LegacySettingsImportModal(this.app, this.kplexPlugin, () => this.update()).open();
  }

  /** Build native declarative settings and subpages with localized copy while keeping keys, defaults and control behavior stable. */
  getSettingDefinitions(): SettingDefinitionItem<DeclarativeSettingKey>[] {
    const translate = createObsidianTranslator();
    const nodeStyles = this.nodeStyleEntries();
    const unassignedFields = this.kplexPlugin.index.unassignedOntologyFields();
    const ontologyStyleFields = this.ontologyStyleFields();
    const customOntologyStyleCount = ontologyStyleFields.filter((field) =>
      hasMeaningfulLinkOverride(this.ontologyLinkStyle(field.name), this.kplexPlugin.settings.baseLinkStyle)
    ).length;
    return [
      {
        type: "group",
        heading: "",
        cls: "kplex-resource-links",
        items: [
          { name: translate("settings.ui.buy.me.a.coffee"), action: () => { window.open("https://ko-fi.com/zsolt", "_blank", "noopener,noreferrer"); } },
          { name: translate("settings.ui.read.sketch.your.mind"), action: () => { window.open("https://community.sketch-your-mind.com/sym", "_blank", "noopener,noreferrer"); } },
          { name: translate("settings.ui.join.sym.community"), action: () => { window.open("https://community.sketch-your-mind.com", "_blank", "noopener,noreferrer"); } },
        ],
      },
      {
        type: "page",
        name: translate("settings.ui.plex.behavior"),
        desc: translate("settings.ui.navigation.layout.visibility.and.relationship.behavior.i"),
        items: [
          {
            type: "group",
            heading: translate("settings.ui.navigation.interaction"),
            items: [
              { name: translate("settings.ui.animation.speed"), desc: translate("settings.ui.speed.multiplier.0.off.0.5.slow.1.normal.1.5.fast.2.very"), control: { type: "slider", key: "animationSpeed", min: 0, max: 2, step: 0.1 } },
              { name: translate("settings.ui.auto.fit.on.navigation"), control: { type: "toggle", key: "allowAutozoom" } },
              { name: translate("settings.ui.open.k.plex.in.a.pop.out.window"), desc: translate("settings.ui.when.k.plex.is.opened.and.no.k.plex.view.already.exists"), control: { type: "toggle", key: "startInPopout" } },
              { name: translate("settings.ui.confirm.before.deleting.files"), desc: translate("settings.ui.ask.before.a.node.context.menu.action.deletes.a.note.usi"), control: { type: "toggle", key: "confirmFileDelete" } },
              {
                name: translate("settings.ui.mouse.navigation"),
                desc: translate("settings.ui.smart.reserves.right.click.for.context.menus.left.drag.e"),
                control: { type: "dropdown", key: "mouseInteractionMode", defaultValue: "smart", options: { smart: translate("settings.ui.smart.recommended"), legacy: translate("settings.ui.legacy.any.button.pans"), "middle-only": translate("settings.ui.middle.button.pans") } }
              },
            ]
          },
          {
            type: "group",
            heading: translate("settings.centralNodeEditor.heading"),
            items: [
              {
                name: translate("settings.centralNodeEditor.defaultMode"),
                desc: translate("settings.centralNodeEditor.defaultModeDesc"),
                control: {
                  type: "dropdown",
                  key: "centralNodeMarkdownMode",
                  defaultValue: "source",
                  options: { source: translate("settings.ui.edit.mode"), preview: translate("settings.ui.reading.view") },
                },
              },
            ],
          },
          {
            type: "group",
            heading: translate("settings.ui.layout.sizing"),
            items: [
              { name: translate("settings.ui.parent.maximum.height"), desc: translate("settings.ui.parent.rows.become.vertically.scrollable.above.this.heig"), control: { type: "slider", key: "parentMaxHeight", min: 140, max: 800, step: 20 } },
              { name: translate("settings.ui.friend.challenger.maximum.height"), desc: translate("settings.ui.friend.and.challenger.lists.become.vertically.scrollable"), control: { type: "slider", key: "friendMaxHeight", min: 140, max: 800, step: 20 } },
              { name: translate("settings.ui.sibling.maximum.height"), desc: translate("settings.ui.sibling.lists.become.vertically.scrollable.above.this.he"), control: { type: "slider", key: "siblingMaxHeight", min: 120, max: 700, step: 10 } },
              { name: translate("settings.ui.sibling.relative.size"), desc: translate("settings.ui.scale.sibling.nodes.and.their.expanded.descendants.relat"), control: { type: "slider", key: "siblingRelativeSize", min: 30, max: 85, step: 5 } },
              { name: translate("settings.ui.child.maximum.height"), desc: translate("settings.ui.child.rows.become.vertically.scrollable.above.this.heigh"), control: { type: "slider", key: "childMaxHeight", min: 160, max: 900, step: 20 } },
              { name: translate("settings.ui.maximum.nodes.per.zone"), control: { type: "slider", key: "maxItemCount", min: 10, max: 300, step: 10 } },
              { name: translate("settings.ui.compact.view"), control: { type: "toggle", key: "compactView" } },
              { name: translate("settings.ui.minimum.link.length"), desc: translate("settings.ui.minimum.spacing.target.for.connected.nodes"), control: { type: "slider", key: "minLinkLength", min: 6, max: 40, step: 1 } },
            ]
          },
          {
            type: "group",
            heading: translate("settings.ui.content.visibility"),
            items: [
              { name: translate("settings.ui.show.siblings"), control: { type: "toggle", key: "renderSiblings" } },
              { name: translate("settings.ui.show.inferred.relationships"), control: { type: "toggle", key: "showInferredNodes" } },
              { name: translate("settings.ui.ghost.unresolved.nodes"), control: { type: "toggle", key: "showVirtualNodes" } },
              { name: translate("settings.ui.web.links"), control: { type: "toggle", key: "showURLNodes" } },
              { name: translate("settings.ui.attachments"), control: { type: "toggle", key: "showAttachments" } },
              { name: translate("settings.ui.folders"), control: { type: "toggle", key: "showFolderNodes" } },
              { name: translate("settings.ui.tags"), control: { type: "toggle", key: "showTagNodes" } },
              { name: translate("settings.ui.markdown.pages"), control: { type: "toggle", key: "showPageNodes" } },
              { name: translate("settings.ui.excluded.path.prefixes"), desc: translate("settings.ui.comma.separated.path.prefixes.that.stay.hidden.from.the"), control: { type: "textarea", key: "excludeFilepathsCsv", rows: 4 } },
              { name: translate("settings.ui.gate.counts"), desc: translate("settings.ui.show.the.number.of.currently.visible.relationships.besid"), control: { type: "toggle", key: "showNeighborCount" } },
            ]
          },
          {
            type: "group",
            heading: translate("settings.ui.relationship.behavior"),
            items: [
              { name: translate("settings.ui.infer.normal.links.as.friends"), control: { type: "toggle", key: "inferAllLinksAsFriends" } },
              { name: translate("settings.ui.inverse.inferred.parent.child.direction"), control: { type: "toggle", key: "inverseInfer" } },
              { name: translate("settings.ui.reverse.displayed.arrow.direction"), desc: translate("settings.ui.reverse.the.displayed.link.arrow.direction.without.chang"), control: { type: "toggle", key: "inverseArrowDirection" } },
            ]
          },
        ]
      },
      {
        type: "page",
        name: translate("settings.ui.ontology"),
        desc: translate("settings.ui.define.which.note.properties.create.relationships.and.ho"),
        items: [
          {
            type: "page",
            name: translate("settings.ui.relationship.fields"),
            desc: translate("settings.ui.choose.which.properties.appear.as.parents.children.frien"),
            items: [
              {
                type: "group",
                heading: translate("settings.ui.relationship.fields"),
                cls: "kplex-ontology-fields",
                items: [
                  { name: translate("settings.ui.parent.fields"), control: { type: "textarea", key: "hierarchy.parents", rows: 3 } },
                  { name: translate("settings.ui.child.fields"), control: { type: "textarea", key: "hierarchy.children", rows: 3 } },
                  { name: translate("settings.ui.left.friend.jump.fields"), control: { type: "textarea", key: "hierarchy.leftFriends", rows: 3 } },
                  { name: translate("settings.ui.right.friend.challenger.fields"), control: { type: "textarea", key: "hierarchy.rightFriends", rows: 3 } },
                  { name: translate("settings.ui.previous.fields"), control: { type: "textarea", key: "hierarchy.previous", rows: 3 } },
                  { name: translate("settings.ui.next.fields"), control: { type: "textarea", key: "hierarchy.next", rows: 3 } },
                  { name: translate("settings.ui.hidden.fields"), desc: translate("settings.ui.relationships.stored.in.these.properties.stay.out.of.the"), control: { type: "textarea", key: "hierarchy.hidden", rows: 3 } },
                ],
              },
            ],
          },
          {
            type: "page",
            name: translate("settings.ui.editor.suggester"),
            desc: translate("settings.ui.configure.shortcuts.for.inserting.ontology.fields.while"),
            items: [
              {
                type: "group",
                heading: translate("settings.ui.ontology.suggester"),
                items: [
                  { name: translate("settings.ui.enable.ontology.suggester"), control: { type: "toggle", key: "allowOntologySuggester" } },
                  { name: translate("settings.ui.parent.trigger"), control: { type: "text", key: "ontologySuggesterParentTrigger" } },
                  { name: translate("settings.ui.child.trigger"), control: { type: "text", key: "ontologySuggesterChildTrigger" } },
                  { name: translate("settings.ui.left.friend.trigger"), control: { type: "text", key: "ontologySuggesterLeftFriendTrigger" } },
                  { name: translate("settings.ui.right.friend.trigger"), control: { type: "text", key: "ontologySuggesterRightFriendTrigger" } },
                  { name: translate("settings.ui.previous.trigger"), control: { type: "text", key: "ontologySuggesterPreviousTrigger" } },
                  { name: translate("settings.ui.next.trigger"), control: { type: "text", key: "ontologySuggesterNextTrigger" } },
                  { name: translate("settings.ui.all.ontology.trigger"), desc: translate("settings.ui.suggest.fields.from.every.ontology.role"), control: { type: "text", key: "ontologySuggesterTrigger" } },
                  { name: translate("settings.ui.mid.sentence.prefix"), desc: translate("settings.ui.prefix.used.before.a.trigger.for.dataview.style.inline.f"), control: { type: "text", key: "ontologySuggesterMidSentenceTrigger" } },
                  { name: translate("settings.ui.bold.inserted.field.names"), control: { type: "toggle", key: "boldFields" } },
                ],
              },
            ],
          },
          {
            type: "page",
            name: translate("settings.ui.discovered.fields"),
            desc: translate("settings.ui.review.note.properties.that.are.not.currently.assigned.t"),
            items: [
              {
                type: "group",
                heading: translate("settings.ui.unassigned.relationship.fields"),
                items: [
                  {
                    name: translate("settings.ui.review.unassigned.fields"),
                    desc: unassignedFields.length
                      ? translate("settings.unassignedSummary", { count: unassignedFields.length })
                      : translate("settings.ui.all.currently.discovered.fields.are.assigned.you.can.ref"),
                    action: () => this.openUnassignedOntologyManager(),
                  },
                  {
                    name: translate("settings.ui.refresh.discovered.fields"),
                    desc: translate("settings.ui.rescan.note.properties.now.this.can.take.longer.in.a.lar"),
                    action: () => void this.kplexPlugin.rebuildIndex(true, true, "ontology-discovery"),
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "page",
        name: translate("settings.ui.visual.styling"),
        desc: translate("settings.ui.canvas.node.and.link.appearance"),
        items: [
          {
            type: "group",
            heading: translate("settings.ui.canvas.labels"),
            items: [
              { name: translate("settings.ui.plex.background"), control: { type: "color", key: "backgroundColorHex" } },
              { name: translate("settings.ui.use.frontmatter.display.names"), desc: translate("settings.ui.use.the.first.non.empty.value.from.the.configured.name.f"), control: { type: "toggle", key: "renderAlias" } },
              { name: translate("settings.ui.name.fields"), desc: translate("settings.ui.comma.separated.frontmatter.fields.checked.in.order.text"), control: { type: "text", key: "nameFields" } },
              { name: translate("settings.ui.show.full.tag.names"), control: { type: "toggle", key: "showFullTagName" } },
            ],
          },
          {
            type: "page",
            name: translate("settings.ui.node.styling"),
            desc: translate("settings.ui.node.shape.details.property.based.colors.and.node.images"),
            items: [
              {
                type: "group",
                heading: translate("settings.ui.node.appearance"),
                items: [
                  { name: translate("settings.ui.gate.radius"), desc: translate("settings.ui.radius.of.the.relationship.gates.around.nodes.in.pixels"), control: { type: "slider", key: "baseNodeStyle.gateRadius", min: 2, max: 8, step: 0.5 } },
                  { name: translate("settings.ui.style.property"), desc: translate("settings.ui.a.yaml.or.dataview.style.property.whose.value.can.select"), control: { type: "text", key: "noteTypeField" } },
                  {
                    name: translate("styles.nodeTitle"),
                    desc: translate("styles.settingsSummary", { count: nodeStyles.length }),
                    action: () => this.openNoteTypeStylesManager(),
                  },
                ],
              },
              {
                type: "group",
                heading: translate("settings.ui.node.images"),
                items: [
                  { name: translate("settings.ui.thumbnail.property"), desc: translate("settings.ui.image.link.shown.as.a.small.preview.before.the.node.labe"), control: { type: "text", key: "thumbnailProperty" } },
                  { name: translate("settings.ui.node.image.property"), desc: translate("settings.ui.image.link.that.replaces.the.node.label.with.a.compact.v"), control: { type: "text", key: "nodeImageProperty" } },
                  { name: translate("settings.ui.image.attachment.nodes"), desc: translate("settings.ui.how.jpg.png.gif.svg.webp.and.similar.image.attachments.a"), control: { type: "dropdown", key: "attachmentImageDisplay", defaultValue: "thumbnail-label", options: { label: translate("settings.ui.file.name"), "thumbnail-label": translate("settings.ui.thumbnail.file.name"), image: translate("settings.ui.image.only") } } },
                ],
              },
            ],
          },
          {
            type: "page",
            name: translate("settings.ui.link.styling"),
            desc: translate("settings.ui.connector.shape.default.appearance.cross.link.opacity.an"),
            items: [
              {
                type: "group",
                heading: translate("settings.ui.link.appearance"),
                items: [
                  { name: translate("settings.ui.link.shape"), control: { type: "dropdown", key: "connectorStyle", defaultValue: "bezier", options: { bezier: translate("settings.ui.curved"), straight: translate("settings.ui.straight") } } },
                  { name: translate("settings.ui.default.line.color"), control: { type: "color", key: "baseLinkStyle.strokeColorHex" } },
                  { name: translate("settings.ui.default.line.width"), control: { type: "slider", key: "baseLinkStyle.strokeWidth", min: 0.5, max: 8, step: 0.5 } },
                  { name: translate("settings.ui.default.line.style"), control: { type: "dropdown", key: "baseLinkStyle.strokeStyle", defaultValue: "solid", options: { solid: translate("settings.ui.solid"), dashed: translate("settings.ui.dashed"), dotted: translate("settings.ui.dotted") } } },
                  { name: translate("settings.ui.start.arrowhead"), control: { type: "dropdown", key: "baseLinkStyle.startArrowHead", defaultValue: "none", options: arrowOptions(translate) } },
                  { name: translate("settings.ui.end.arrowhead"), control: { type: "dropdown", key: "baseLinkStyle.endArrowHead", defaultValue: "none", options: arrowOptions(translate) } },
                  { name: translate("settings.ui.show.relationship.labels"), control: { type: "toggle", key: "baseLinkStyle.showLabel" } },
                  { name: translate("settings.ui.relationship.label.color"), control: { type: "color", key: "baseLinkStyle.textColorHex" } },
                  { name: translate("settings.ui.relationship.label.size"), control: { type: "slider", key: "baseLinkStyle.fontSize", min: 7, max: 24, step: 1 } },
                  { name: translate("settings.ui.cross.link.opacity"), desc: translate("settings.ui.opacity.of.extra.links.between.visible.non.central.nodes"), control: { type: "slider", key: "crossLinkOpacity", min: 0, max: 100, step: 5 } },
                  {
                    name: translate("settings.ui.relationship.specific.styles"),
                    desc: customOntologyStyleCount
                      ? translate("styles.relationshipSettingsSummary", { count: customOntologyStyleCount })
                      : translate("settings.ui.all.relationship.properties.currently.use.the.default.li"),
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
        name: translate("settings.ui.sidecar"),
        desc: translate("settings.ui.dedicated.companion.document.pane.placement.and.behavior"),
        items: [
          {
            type: "group",
            heading: translate("settings.ui.companion.document"),
            items: [
              {
                name: translate("settings.ui.default.position"),
                desc: translate("settings.ui.where.k.plex.creates.its.dedicated.companion.document.pa"),
                control: { type: "dropdown", key: "sidecarPosition", defaultValue: "right", options: { right: translate("settings.ui.right"), left: translate("settings.ui.left"), above: translate("settings.ui.above"), below: translate("settings.ui.below") } }
              },
              {
                name: translate("settings.ui.default.markdown.mode"),
                desc: translate("settings.ui.open.markdown.notes.in.the.sidecar.in.reading.view.or.so"),
                control: { type: "dropdown", key: "sidecarMarkdownMode", defaultValue: "source", options: { source: translate("settings.ui.edit.mode"), preview: translate("settings.ui.reading.view") } }
              },
              {
                name: translate("settings.ui.condensed.plex.breakpoint"),
                desc: translate("settings.ui.when.the.remaining.k.plex.width.is.at.or.below.this.valu"),
                control: { type: "slider", key: "sidecarCondensedBreakpoint", min: 280, max: 900, step: 20 }
              },
            ],
          },
        ],
      },
      {
        type: "page",
        name: translate("settings.ui.compatibility"),
        desc: translate("settings.ui.migration.and.legacy.excalibrain.interoperability"),
        items: [
          {
            type: "group",
            heading: translate("settings.ui.excalibrain"),
            items: [
              {
                name: translate("settings.ui.import.excalibrain.settings"),
                desc: translate("settings.ui.import.a.backed.up.excalibrain.data.json.file.and.migrat"),
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
    if (hierarchyKey) return csv(this.kplexPlugin.settings.hierarchy[hierarchyKey]);
    if (key === "excludeFilepathsCsv") return csv(this.kplexPlugin.settings.excludeFilepaths);
    if (key === "backgroundColorHex") return this.kplexPlugin.settings.backgroundColor.slice(0, 7).toLowerCase();
    if (key === "baseLinkStyle.strokeColorHex") return sixHex(this.kplexPlugin.settings.baseLinkStyle.strokeColor, "#696969").toLowerCase();
    if (key === "baseLinkStyle.strokeWidth") return this.kplexPlugin.settings.baseLinkStyle.strokeWidth ?? DEFAULT_LINK_STYLE.strokeWidth ?? 1;
    if (key === "baseLinkStyle.strokeStyle") return this.kplexPlugin.settings.baseLinkStyle.strokeStyle ?? "solid";
    if (key === "baseLinkStyle.startArrowHead") return this.kplexPlugin.settings.baseLinkStyle.startArrowHead ?? "none";
    if (key === "baseLinkStyle.endArrowHead") return this.kplexPlugin.settings.baseLinkStyle.endArrowHead ?? "none";
    if (key === "baseLinkStyle.showLabel") return this.kplexPlugin.settings.baseLinkStyle.showLabel ?? false;
    if (key === "baseLinkStyle.textColorHex") return sixHex(this.kplexPlugin.settings.baseLinkStyle.textColor, "#ffffff").toLowerCase();
    if (key === "baseLinkStyle.fontSize") return this.kplexPlugin.settings.baseLinkStyle.fontSize ?? DEFAULT_LINK_STYLE.fontSize ?? 10;
    if (key === "baseNodeStyle.gateRadius") return this.kplexPlugin.settings.baseNodeStyle.gateRadius ?? DEFAULT_NODE_STYLE.gateRadius ?? 5;
    return this.kplexPlugin.settings[key as keyof KplexSettings];
  }

  /** Apply every declarative control through the plugin's shared settings-impact classifier. */
  async setControlValue(key: string, value: unknown): Promise<void> {
    const hierarchyKey = HIERARCHY_KEY_MAP[key];
    if (hierarchyKey) {
      this.kplexPlugin.settings.hierarchy[hierarchyKey] = fromCsv(String(value));
      await this.kplexPlugin.saveSettings(true);
      return;
    }

    if (key === "excludeFilepathsCsv") {
      this.kplexPlugin.settings.excludeFilepaths = fromCsv(String(value));
      await this.kplexPlugin.saveSettings(false);
      return;
    }

    if (key === "backgroundColorHex") {
      const hex = String(value).slice(0, 7).toLowerCase();
      this.kplexPlugin.settings.backgroundColor = `${hex}ff`;
      await this.kplexPlugin.saveSettings(false);
      return;
    }

    if (key === "baseLinkStyle.strokeColorHex") {
      this.kplexPlugin.settings.baseLinkStyle.strokeColor = eightHex(String(value));
      await this.kplexPlugin.saveSettings(false);
      return;
    }
    if (key === "baseLinkStyle.strokeWidth") {
      this.kplexPlugin.settings.baseLinkStyle.strokeWidth = Math.max(0.5, Math.min(8, Number(value) || 1));
      await this.kplexPlugin.saveSettings(false);
      return;
    }
    if (key === "baseLinkStyle.strokeStyle") {
      const next = String(value);
      this.kplexPlugin.settings.baseLinkStyle.strokeStyle = next === "dashed" || next === "dotted" ? next : "solid";
      await this.kplexPlugin.saveSettings(false);
      return;
    }
    if (key === "baseLinkStyle.startArrowHead") {
      this.kplexPlugin.settings.baseLinkStyle.startArrowHead = String(value) as Arrowhead;
      await this.kplexPlugin.saveSettings(false);
      return;
    }
    if (key === "baseLinkStyle.endArrowHead") {
      this.kplexPlugin.settings.baseLinkStyle.endArrowHead = String(value) as Arrowhead;
      await this.kplexPlugin.saveSettings(false);
      return;
    }
    if (key === "baseLinkStyle.showLabel") {
      this.kplexPlugin.settings.baseLinkStyle.showLabel = Boolean(value);
      await this.kplexPlugin.saveSettings(false);
      return;
    }
    if (key === "baseLinkStyle.textColorHex") {
      this.kplexPlugin.settings.baseLinkStyle.textColor = eightHex(String(value));
      await this.kplexPlugin.saveSettings(false);
      return;
    }
    if (key === "baseLinkStyle.fontSize") {
      this.kplexPlugin.settings.baseLinkStyle.fontSize = Math.max(7, Math.min(24, Number(value) || 10));
      await this.kplexPlugin.saveSettings(false);
      return;
    }
    if (key === "baseNodeStyle.gateRadius") {
      this.kplexPlugin.settings.baseNodeStyle.gateRadius = Number(value);
      await this.kplexPlugin.saveSettings(false);
      return;
    }

    const settingKey = key as keyof KplexSettings;
    (this.kplexPlugin.settings as unknown as Record<string, unknown>)[settingKey] = value;
    await this.kplexPlugin.saveSettings();
  }
}
