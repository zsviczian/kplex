/**
 * Obsidian settings persistence, bounded legacy graph import, declarative controls and style/ontology
 * managers. Foreign imports cannot change plugin workflow preferences; own persisted K-Plex keys
 * remain stable. Sparse device typography inherits shared defaults and native scope-qualified rows never write on initial render. Per-surface density preserves the legacy vertical key and migrates horizontal
 * density from the same saved value. All saves cross the plugin settings-impact classifier; the
 * injected translator owns display copy. Indexing strategy takes effect after restart; persistent
 * cache estimates run only when their settings row is rendered, never during plugin startup.
 * Date fallback roles reinterpret cached facts through the semantic settings owner; absent/interim
 * preferences use Parent and foreign imports cannot overwrite the local default role.
 * Background throttle changes apply live without reconstructing semantic data. Style creation selects
 * property-value or primary-tag-prefix matching without converting existing imported styles. Internal
 * keyboard bindings are additive workflow preferences; recorder controls own only transient capture.
 * Sparse per-note Markdown zoom overrides are durable local workflow data, independent of graph imports.
 * Cross-link visibility is shared persisted presentation state for the filter panel and Plex settings.
 * Remote node imagery requires explicit local opt-in; absent or malformed persisted consent stays off.
 * Style editors publish only durable queued drafts, exclude duplicate operations and distinguish
 * storage failure from saved changes whose presentation/manager refresh still needs recovery.
 * File-deletion cleanup is a local workflow preference with a stable native settings anchor;
 * changing it does not invalidate semantic data or change placeholder-removal policy.
 * Typed color sources retain literal alpha and named/theme identity; local palette preferences
 * are isolated from foreign graph imports and unsupported formats retain a persistence marker.
 * Hover modifier requirements are local workflow preferences, independent of themes and graph data;
 * absent or malformed values enable gating while explicit saved false values remain respected.
 * Device/main-tab/sidepanel layout profiles own physical lateral arrangement independently of
 * appearance themes and semantic indexing; omitted preferences preserve split placement.
 */
import { readObsidianPresentationEnvironment } from "./adapters/obsidian/presentationEnvironment";
import { formatShortcut } from "./core/plex/shortcutPresentation";
import {AppearanceThemesManagerModal} from "./ui/AppearanceThemesModal";
import {StyleManagerList} from "./ui/StyleManagerList";
import {ColorSwatchList, type ColorSwatchItem} from "./ui/ColorSwatchList";
import { StyleSwatchScope } from "./ui/StyleSwatchScope";
import {colorValueCss} from "./adapters/obsidian/colorPresentation";
import { subscribeAppearanceSources } from "./adapters/obsidian/colorChanges";

import { StyleEditorModal, appendIcon, type StyleCommitResult } from "./ui/StyleEditorModal";
import { NATIVE_NODE_PAINT, NATIVE_LINK_STROKE, NATIVE_LINK_TEXT, NATIVE_CANVAS_FILL, nodeColorFallback, nodePaintFallbacks } from "./index/style";
import { ColorAdoptionModal } from "./ui/ColorAdoptionModal";
import { StyleColorControls, compassSwatchItem, type StyleColorContext } from "./ui/StyleColorControls";
import { ColorPaletteModal } from "./ui/ColorPaletteModal";
import { standardColorSlots, adoptStandardThemeColors, withoutStyleColorOverrides, mergeStyleDraft, requireNamedColor, STANDARD_NODE_COLOR_STYLES, STANDARD_LINK_COLOR_STYLES } from "./core/plex/colorEditing";
import {COMPASS_DIRECTIONS, SEMANTIC_COLOR_DEFAULTS} from "./core/plex/colorPreferences";
import { ColorSourceModal } from "./ui/ColorSourceModal";
import {
  AbstractInputSuggest,
  App,
  Modal,
  Notice,
  PluginSettingTab,
  getIconIds,
  type SettingDefinitionItem,
  type SettingDefinition,
  type Setting,
} from "obsidian";
import type KplexPlugin from "./main";
import { RelationType, type Arrowhead, type Hierarchy, type LinkStyle, type NodeStyle, type Role } from "./types";
import { sanitizeGraphLensDefinitions, type GraphLensDefinition } from "./lens/GraphLens";
import { collectionWindow } from "./ui/components/collectionWindow";
import { createObsidianTranslator } from "./adapters/obsidian/localization";
import type { Translator, PlainTranslationKey } from "./lang";
import { PurgeIndexCacheModal } from "./ui/PurgeIndexCacheModal";
import { sanitizeIndexingThrottle, type IndexingThrottle } from "./index/ForegroundWorkScheduler";
import { sanitizeInternalHotkeys, type InternalHotkeys } from "./core/plex/internalHotkeys";
import { migrateActionPreferences, type ActionPreferencesV1 } from "./core/plex/actionPreferences";
import { ActionSettingsController } from "./ui/ActionSettingsController";
import { sanitizeDatePropertyRelations, type DatePropertyRelations } from "./core/graph/settings";
import { effectiveTypography, sanitizeTypographyProfiles, sanitizeTypographyValue, TYPOGRAPHY_FIELDS, TYPOGRAPHY_LIMITS, type TypographyProfiles, type TypographyField } from "./core/plex/typographyPreferences";
import type { LateralArrangement, PersistedLayoutDeviceClass } from "./core/plex/viewPresentation";
import { sanitizeMarkdownZoomModes, type MarkdownZoomModes } from "./core/plex/markdownZoomPreferences";
import { STYLE_SETTINGS_KEYS, appearanceColorReferences, appearanceHasUnsupportedColors } from "./core/contracts/appearance";
import {applyThemeAppearance, captureThemeAppearance, readAppearanceThemes, resetAppearanceColors, semanticColorSlots, DEFAULT_THEME_ID, type ColorResetScope, type AppearanceThemeLibrary, type AppearanceOwner} from "./core/plex/appearanceThemes";
import { defaultColorPreferences, migrateColorPreferences, SEMANTIC_COLOR_SLOTS, type SemanticColorSlot, type SemanticColorPair, type ColorPreferencesV1 } from "./core/plex/colorPreferences";
import { NODE_COLOR_FIELDS, LINK_COLOR_FIELDS, colorValuesEqual, colorIdentityText, colorRgbInput, type ColorValue } from "./core/contracts/colorValue";

const LEGACY_LINK_STYLE: LinkStyle = {
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

const LEGACY_NODE_STYLE: NodeStyle = {
  prefix: "",
  backgroundColor: "#00000066",
  fillStyle: "solid",
  textColor: "#ffffffff",
  borderColor: "#00000000",
  fontSize: 20,
  fontFamily: 3,
  maxLabelLength: 30,
  maxWidth: 286,
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

/** Fresh styles inherit native colors; historical baselines remain available only to legacy loading. */
export const DEFAULT_NODE_STYLE = withoutStyleColorOverrides(LEGACY_NODE_STYLE, NODE_COLOR_FIELDS);
export const DEFAULT_LINK_STYLE = withoutStyleColorOverrides(LEGACY_LINK_STYLE, LINK_COLOR_FIELDS);

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
export type IndexingMode = "eager" | "on-demand";
export type UrlIndexingMode = "on-demand" | "background";
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
  /** Omission retains the established split layout; pop-outs share the main-tab arrangement. */
  lateralArrangement?: LateralArrangement;
  /** Retained vertical density key, also the fallback for pre-axis profiles. */
  compactingFactor: number;
  /** Horizontal density is optional only at the persisted legacy/profile boundary. */
  horizontalCompactingFactor?: number;
  parentColumns: number;
  childColumns: number;
};

export const DEFAULT_LAYOUT_PROFILES: Record<string, KplexLayoutProfile> = {
  "desktop:leaf": { compactingFactor: 2, horizontalCompactingFactor: 2, parentColumns: 2, childColumns: 5 },
  "desktop:popout": { compactingFactor: 2, horizontalCompactingFactor: 2, parentColumns: 2, childColumns: 5 },
  "desktop:sidepanel": { compactingFactor: 2.65, horizontalCompactingFactor: 2.65, parentColumns: 1, childColumns: 2 },
  "tablet:leaf": { compactingFactor: 2.25, horizontalCompactingFactor: 2.25, parentColumns: 2, childColumns: 4 },
  "tablet:popout": { compactingFactor: 2.25, horizontalCompactingFactor: 2.25, parentColumns: 2, childColumns: 4 },
  "tablet:sidepanel": { compactingFactor: 2.7, horizontalCompactingFactor: 2.7, parentColumns: 1, childColumns: 2 },
  "mobile:leaf": { compactingFactor: 2.55, horizontalCompactingFactor: 2.55, parentColumns: 1, childColumns: 2 },
  "mobile:popout": { compactingFactor: 2.55, horizontalCompactingFactor: 2.55, parentColumns: 1, childColumns: 2 },
  "mobile:sidepanel": { compactingFactor: 2.85, horizontalCompactingFactor: 2.85, parentColumns: 1, childColumns: 2 },
};

export interface KplexSettings {
  /** Local appearance identities; foreign graph imports never replace this palette or compass preference. */
  colorPreferences: ColorPreferencesV1;
  /** Preserve an unsupported future color container verbatim while presenting read-only fallback controls. */
  colorPreferencesFuture?: unknown;
  /** Versioned private appearance library; effective root fields contain only its selected theme. */
  appearanceThemes?: AppearanceThemeLibrary;
  /** Preserve unsupported library data verbatim; appearance edits remain read-only. */
  appearanceThemesFuture?: unknown;
  /** Plex-local bindings; null disables an action without affecting Obsidian command hotkeys. */
  internalHotkeys: InternalHotkeys;
  /** Independent local bindings and desired Obsidian command publication; workflow-only state. */
  actionPreferences: ActionPreferencesV1;
  /** Retain a future schema verbatim while this version runs a conservative effective fallback. */
  actionPreferencesFuture?: unknown;
  compactView: boolean;
  /** Vertical density keeps its historical persisted key. */
  compactingFactor: number;
  /** Horizontal spacing and label truncation vary independently from vertical density. */
  horizontalCompactingFactor: number;
  minLinkLength: number;
  indexUpdateInterval: number;
  /** Acquisition policy applied at the next plugin startup, not a semantic graph setting. */
  indexingMode: IndexingMode;
  /** Legacy persisted compatibility field; web links always scan independently in the background. */
  urlIndexingMode: UrlIndexingMode;
  /** Live background scheduling policy, independent of semantic settings and cached source facts. */
  indexingThrottle: IndexingThrottle;
  hierarchy: Hierarchy;
  inferAllLinksAsFriends: boolean;
  inverseInfer: boolean;
  /** Fallback native Date role; configured field ontology always takes precedence. */
  datePropertyRelations: DatePropertyRelations;
  inverseArrowDirection: boolean;
  renderAlias: boolean;
  /** Ordered comma-separated frontmatter fields used as display-name fallbacks. */
  nameFields: string;
  nodeTitleScript: string;
  backgroundColor?: ColorValue;
  /** Absence policy only: explicit saved colors always remain authoritative. */
  standardStyleDefaults: "native" | "legacy";
  /** Runtime-only preservation of unsupported known lens colors; omitted by the writer. */
  graphLensesColorFuture?: unknown;
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
  /** Give every Plex thought a fixed two-line label area so long titles can wrap without breaking row alignment. */
  wrapNodeLabels: boolean;
  /** Base regular-node label size in pixels; role and explicit style proportions are preserved. */
  baseFontSize: number;
  /** Sparse device overrides inherit the shared typography defaults until explicitly customized. */
  typographyProfiles: TypographyProfiles;
  showFullTagName: boolean;
  maxItemCount: number;
  renderSiblings: boolean;
  /** Show connections between peripheral nodes without changing semantic relationships. */
  showCrossLinks: boolean;
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
  /** Fit newly opened drawings in normal editor nodes independently of the companion's preference. */
  excalidrawFitOnNodeOpen: boolean;
  centralNodeMarkdownMode: SidecarMarkdownMode;
  /** Exact Markdown file paths whose normal editor nodes scale their content with Plex zoom. */
  centralNodeMarkdownZoomModes: MarkdownZoomModes;
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
  /** Effective-view projection of the active profile; shared persisted settings leave this absent. */
  lateralArrangement?: LateralArrangement;
  mouseInteractionMode: MouseInteractionMode;
  /** Require the alternate modifier instead of delayed pointer highlighting. */
  hoverHighlightRequiresAlt: boolean;
  /** Require the alternate modifier for area hover outlines outside explicit area-settings mode. */
  areaOutlineRequiresAlt: boolean;
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
  /** Explicit permission to contact HTTP(S) hosts when displaying node imagery. Defaults off. */
  allowRemoteNodeImages: boolean;
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
  /** Default ontology-property cleanup when deleting a physical Markdown file through K-Plex. */
  removeOntologyLinksOnDelete: boolean;
}

const LEGACY_DEFAULT_SETTINGS: KplexSettings = {
  standardStyleDefaults: "legacy",
  colorPreferences: defaultColorPreferences(),
  internalHotkeys: sanitizeInternalHotkeys(undefined),
  actionPreferences: migrateActionPreferences(undefined).preferences,
  compactView: false,
  compactingFactor: 2,
  horizontalCompactingFactor: 2,
  minLinkLength: 18,
  indexUpdateInterval: 60000,
  indexingMode: "on-demand",
  urlIndexingMode: "background",
  indexingThrottle: "responsive",
  hierarchy: DEFAULT_HIERARCHY_DEFINITION,
  inferAllLinksAsFriends: false,
  inverseInfer: false,
  datePropertyRelations: "parent",
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
  wrapNodeLabels: false,
  typographyProfiles: {},
  baseFontSize: 12.4,
  showFullTagName: false,
  maxItemCount: 100,
  renderSiblings: false,
  showCrossLinks: false,
  siblingRelativeSize: 85,
  crossLinkOpacity: 85,
  applyPowerFilter: false,
  baseNodeStyle: LEGACY_NODE_STYLE,
  centralNodeStyle: { fontSize: 30, maxWidth: 370, backgroundColor: "#b5b5b5ff", textColor: "#000000ff" },
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
  baseLinkStyle: LEGACY_LINK_STYLE,
  inferredLinkStyle: { strokeStyle: "dashed" },
  folderLinkStyle: { strokeColor: "#ffd700ff" },
  tagLinkStyle: { strokeColor: "#4682b4ff" },
  hierarchyLinkStyles: {},
  navigationHistory: [],
  allowOntologySuggester: true,
  ontologySuggesterParentTrigger: "::p",
  ontologySuggesterChildTrigger: "::c",
  ontologySuggesterLeftFriendTrigger: "::f",
  ontologySuggesterRightFriendTrigger: "::r",
  ontologySuggesterPreviousTrigger: "::s",
  ontologySuggesterNextTrigger: "::n",
  ontologySuggesterTrigger: ":::",
  ontologySuggesterMidSentenceTrigger: "(",
  boldFields: false,
  allowAutozoom: false,
  allowAutofocuOnSearch: true,
  defaultAlwaysOnTop: false,
  embedCentralNode: false,
  excalidrawFitOnNodeOpen: true,
  centralNodeMarkdownMode: "source",
  centralNodeMarkdownZoomModes: {},
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
  hoverHighlightRequiresAlt: true,
  areaOutlineRequiresAlt: true,
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
  allowRemoteNodeImages: false,
  editNewNodeAfterCreate: false,
  newNodeDefaultType: "markdown",
  startupIndexInfoBubbleSeen: false,
  deletePromptInitialized: false,
  confirmFileDelete: true,
  removeOntologyLinksOnDelete: true,
};

/** Fresh installations inherit native paint while preserving established geometry and behavior. */
export const DEFAULT_SETTINGS: KplexSettings = (() => {
  const settings = structuredClone(LEGACY_DEFAULT_SETTINGS); adoptStandardThemeColors(settings); return settings;
})();

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
  // Normalize only supplied foreign standard records against their historical missing-field defaults.
  for (const key of [...STANDARD_NODE_COLOR_STYLES, ...STANDARD_LINK_COLOR_STYLES]) if (isSettingsRecord(imported[key]))
    imported[key] = {...LEGACY_DEFAULT_SETTINGS[key], ...imported[key]};
  const hierarchy = isSettingsRecord(imported.hierarchy) ? imported.hierarchy : {};
  // A legacy friends-only field must replace the local leftFriends default, not be masked by it.
  const leftFriends = hierarchy.leftFriends ?? hierarchy.friends ?? current?.hierarchy.leftFriends;
  const settings = migrateAndMergeSettings({
    ...current,
    ...imported,
    // Foreign appearance must be normalized before the selected local theme is synchronized by
    // the existing writer. Applying that old theme here would silently undo the imported paint.
    appearanceThemes: undefined,
    standardStyleDefaults: current?.standardStyleDefaults ?? "legacy",
    ...(current?.graphLensesColorFuture !== undefined ? {graphLenses: current.graphLensesColorFuture} : {}),
    actionPreferences: current?.actionPreferences ?? DEFAULT_SETTINGS.actionPreferences,
    colorPreferences: current?.colorPreferencesFuture !== undefined ? current.colorPreferencesFuture
      : current?.colorPreferences ?? DEFAULT_SETTINGS.colorPreferences,
    horizontalCompactingFactor: imported.compactingFactor ?? current?.horizontalCompactingFactor,
    hierarchy: {
      ...current?.hierarchy,
      ...hierarchy,
      ...(leftFriends === undefined ? {} : { leftFriends }),
    },
  });
  delete settings.appearanceThemes;
  if (current?.appearanceThemes) settings.appearanceThemes = structuredClone(current.appearanceThemes);
  if (current?.appearanceThemesFuture !== undefined) settings.appearanceThemesFuture = structuredClone(current.appearanceThemesFuture);
  return settings;
}

/** Normalize this plugin's persisted settings, preserving K-Plex preferences across reloads. */
export function migrateAndMergeSettings(raw: unknown): KplexSettings {
  const rawSettings = (raw && typeof raw === "object" ? raw : {}) as Partial<KplexSettings> & {
    hierarchy?: Partial<Hierarchy>;
    maxZoom?: unknown;
    excalibrainFilepath?: unknown;
  };
  // Both values belonged to retired render surfaces and carry no K-Plex state.
  const { maxZoom: _legacyMaxZoom, excalibrainFilepath: _legacyDrawingPath, actionPreferencesFuture: _runtimeFuture,
    colorPreferencesFuture: _runtimeColorFuture, graphLensesColorFuture: _runtimeLensColorFuture,
    appearanceThemesFuture: _runtimeThemesFuture, ...old } = rawSettings;
  const actionPreferences = migrateActionPreferences(raw);
  const colors = migrateColorPreferences(old.colorPreferences);
  const defaults = old.standardStyleDefaults === "native" || Object.keys(old).length === 0 ? DEFAULT_SETTINGS : LEGACY_DEFAULT_SETTINGS;
  const futureLensColors = appearanceHasUnsupportedColors({graphLenses: old.graphLenses});
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
  /** Preserve old density/column defaults; only explicit supported lateral arrangements become saved overrides. */
  const sanitizeProfile = (candidate: Partial<KplexLayoutProfile> | undefined, fallback: KplexLayoutProfile): KplexLayoutProfile => ({
    compactingFactor: Math.max(0.75, Math.min(4, finite(candidate?.compactingFactor, fallback.compactingFactor))),
    horizontalCompactingFactor: Math.max(0.75, Math.min(4, finite(candidate?.horizontalCompactingFactor,
      finite(candidate?.compactingFactor, fallback.horizontalCompactingFactor ?? fallback.compactingFactor)))),
    parentColumns: Math.max(1, Math.min(3, Math.round(finite(candidate?.parentColumns, fallback.parentColumns)))),
    childColumns: Math.max(1, Math.min(7, Math.round(finite(candidate?.childColumns, fallback.childColumns)))),
    ...(candidate?.lateralArrangement === "left" || candidate?.lateralArrangement === "split"
      ? { lateralArrangement: candidate.lateralArrangement } : {}),
  });
  const legacyProfile = sanitizeProfile({
    compactingFactor: old.compactingFactor,
    horizontalCompactingFactor: old.horizontalCompactingFactor,
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

  const settings: KplexSettings = {
    ...defaults,
    standardStyleDefaults: defaults.standardStyleDefaults,
    ...(futureLensColors ? {graphLensesColorFuture: structuredClone(old.graphLenses)} : {}),
    ...old,
    colorPreferences: colors.preferences,
    ...(colors.future !== undefined ? { colorPreferencesFuture: colors.future } : {}),
    showCrossLinks: typeof old.showCrossLinks === "boolean" ? old.showCrossLinks : DEFAULT_SETTINGS.showCrossLinks,
    indexingMode: old.indexingMode === "eager" ? "eager" : "on-demand",
    urlIndexingMode: "background",
    indexingThrottle: sanitizeIndexingThrottle(old.indexingThrottle),
    datePropertyRelations: sanitizeDatePropertyRelations(old.datePropertyRelations),
    hierarchy,
    baseNodeStyle: { ...defaults.baseNodeStyle, ...(old.baseNodeStyle ?? {}) },
    baseLinkStyle: { ...defaults.baseLinkStyle, ...(old.baseLinkStyle ?? {}) },
    centralNodeStyle: { ...defaults.centralNodeStyle, ...(old.centralNodeStyle ?? {}) },
    inferredNodeStyle: { ...defaults.inferredNodeStyle, ...(old.inferredNodeStyle ?? {}) },
    urlNodeStyle: mergeLegacyIconStyle(defaults.urlNodeStyle, old.urlNodeStyle, "🌐 "),
    virtualNodeStyle: { ...defaults.virtualNodeStyle, ...(old.virtualNodeStyle ?? {}) },
    siblingNodeStyle: { ...defaults.siblingNodeStyle, ...(old.siblingNodeStyle ?? {}) },
    attachmentNodeStyle: mergeLegacyIconStyle(defaults.attachmentNodeStyle, old.attachmentNodeStyle, "📎 "),
    folderNodeStyle: mergeLegacyIconStyle(defaults.folderNodeStyle, old.folderNodeStyle, "📂 "),
    tagNodeStyle: mergeLegacyIconStyle(defaults.tagNodeStyle, old.tagNodeStyle, "#"),
    inferredLinkStyle: { ...defaults.inferredLinkStyle, ...(old.inferredLinkStyle ?? {}) },
    folderLinkStyle: { ...defaults.folderLinkStyle, ...(old.folderLinkStyle ?? {}) },
    tagLinkStyle: { ...defaults.tagLinkStyle, ...(old.tagLinkStyle ?? {}) },
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
    horizontalCompactingFactor: legacyProfile.horizontalCompactingFactor ?? legacyProfile.compactingFactor,
    baseFontSize: Math.max(8, Math.min(28, finite(old.baseFontSize, DEFAULT_SETTINGS.baseFontSize))),
    minLinkLength: finite(old.minLinkLength, DEFAULT_SETTINGS.minLinkLength),
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
    typographyProfiles: sanitizeTypographyProfiles(old.typographyProfiles),
    hoverHighlightRequiresAlt: typeof old.hoverHighlightRequiresAlt === "boolean" ? old.hoverHighlightRequiresAlt : true,
    areaOutlineRequiresAlt: typeof old.areaOutlineRequiresAlt === "boolean" ? old.areaOutlineRequiresAlt : true,
    mouseInteractionMode: old.mouseInteractionMode === "legacy" || old.mouseInteractionMode === "middle-only" ? old.mouseInteractionMode : "smart",
    // ExcaliBrain persisted `embedCentralNode` for its own center presentation. K-Plex's native
    // embedded editor is a different, explicitly opt-in surface, so legacy imports must start
    // with the normal central node. Existing initialized K-Plex vaults keep the user's choice.
    embedCentralNode: old.kplexInitialized ? Boolean(old.embedCentralNode) : false,
    excalidrawFitOnNodeOpen: typeof old.excalidrawFitOnNodeOpen === "boolean" ? old.excalidrawFitOnNodeOpen : true,
    centralNodeMarkdownMode: old.centralNodeMarkdownMode === "preview" ? "preview" : "source",
    centralNodeMarkdownZoomModes: sanitizeMarkdownZoomModes(old.centralNodeMarkdownZoomModes),
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
    allowRemoteNodeImages: old.allowRemoteNodeImages === true,
    editNewNodeAfterCreate: Boolean(old.editNewNodeAfterCreate),
    newNodeDefaultType: old.newNodeDefaultType === "excalidraw" ? "excalidraw" : "markdown",
    startupIndexInfoBubbleSeen: Boolean(old.startupIndexInfoBubbleSeen),
    deletePromptInitialized: Boolean(old.deletePromptInitialized),
    confirmFileDelete: old.confirmFileDelete !== false,
    removeOntologyLinksOnDelete: old.removeOntologyLinksOnDelete !== false,
    internalHotkeys: sanitizeInternalHotkeys(old.internalHotkeys),
    actionPreferences: actionPreferences.preferences,
    ...(actionPreferences.unsupportedVersion !== undefined
      ? { actionPreferencesFuture: old.actionPreferences } : {}),
    // Keep legacy flags coherent for imported settings and older code paths.
    autoOpenCentralDocument: documentSyncMode !== "off",
    followActiveFile: documentSyncMode !== "off",
  };
  if (old.appearanceThemes !== undefined) {
    const library = readAppearanceThemes(old.appearanceThemes);
    if (library && colors.future === undefined && !futureLensColors && !appearanceHasUnsupportedColors(old)) {
      // Factory appearance always follows current native defaults, never a persisted RGB capture.
      const factory = library.themes.find(/** Stable identity alone identifies the immutable factory entry. */ theme => theme.id === DEFAULT_THEME_ID);
      if (factory) factory.appearance = captureThemeAppearance(DEFAULT_SETTINGS);
      settings.appearanceThemes = library;
      const selected = library.themes.find(/** Apply only the explicitly selected private appearance. */ theme => theme.id === library.selectedId);
      if (selected) applyThemeAppearance(settings, selected.appearance);
    } else {
      delete settings.appearanceThemes;
      settings.appearanceThemesFuture = structuredClone(old.appearanceThemes);
    }
  }
  return settings;
}

const csv = (value: string[]) => value.join(", ");
const fromCsv = (value: string) => value.split(",").map((x) => x.trim()).filter(Boolean);
const normalizeOntologyStyleKey = (value: string) => value.toLowerCase().replace(/\s+/g, "-").trim();
/** Retain existing property-value normalization; a tag hint is also a valid property value. */
const normalizeNodeStyleValue = (value: string) => value.trim().replace(/^#/, "");
/** Accept typed or suggested tag prefixes with one leading hashtag; empty prefixes cannot match. */
const normalizeTagStylePrefix = (value: string): string => {
  const prefix = value.trim().replace(/^#+/, "").trim();
  return prefix ? `#${prefix}` : "";
};
/** Legacy RGB-only control adapter; it cannot flatten a reference or mutate the saved source. */
const sixHex = (value?: ColorValue, fallback = "#000000"): string => {
  return colorRgbInput(value, fallback);
};
const eightHex = (value: string) => `${value.slice(0, 7)}ff`;

type OntologyStyleField = { name: string; roles: Role[] };
type NodeStyleKind = "property" | "tag";
type NodeStyleEntry = { name: string; kind: NodeStyleKind };
type NodeStyleValueSuggestion = { value: string; display: string; kind: "property" | "tag" | "configured" };

class NodeStyleValueSuggest extends AbstractInputSuggest<NodeStyleValueSuggestion> {
  private readonly input: HTMLInputElement;
  private readonly translate = createObsidianTranslator();

  /** The current mode supplies suggestions without replacing the focused input or its draft. */
  constructor(app: App, input: HTMLInputElement, private readonly values: () => NodeStyleValueSuggestion[]) {
    super(app, input);
    this.input = input;
    this.limit = 40;
  }

  /** Search current-mode suggestions case-insensitively while retaining their stored spelling. */
  protected getSuggestions(query: string): NodeStyleValueSuggestion[] {
    const needle = query.trim().replace(/^#/, "").toLowerCase();
    const ranked = this.values().filter(/** Match tag text with or without the display hashtag. */ (item) => {
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

  /** Use the suggestion's already normalized mode-specific value and notify input listeners. */
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
      return !colorValuesEqual(style[key], baseStyle[key]);
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
const describeLinkStyle = (style: LinkStyle | undefined, baseStyle: LinkStyle, translate: Translator, palette: readonly SemanticColorPair[] = []): string => {
  const effective = { ...baseStyle, ...(style ?? {}) };
  const strokeStyle = effective.strokeStyle ?? "solid";
  const strokeKey = strokeStyle === "dashed" ? "styles.dashed" : strokeStyle === "dotted" ? "styles.dotted" : "styles.solid";
  const parts = [
    translate(strokeKey),
    `${effective.strokeWidth ?? 1}px`,
    colorIdentityText(effective.strokeColor, palette),
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
const describeNodeStyle = (style: NodeStyle, translate: Translator, palette: readonly SemanticColorPair[] = []): string => {
  const parts: string[] = [];
  if (style.icon) parts.push(translate("styles.summaryIcon", { icon: style.icon }));
  if (style.fontSize) parts.push(`${style.fontSize}px`);
  if (style.backgroundColor) parts.push(colorIdentityText(style.backgroundColor, palette));
  return parts.length ? parts.join(" · ") : translate("styles.inheritedNodeDefaults");
};

/** Appearance fields share the existing serialized style writer; semantic/workflow settings retain their owners. */
export { STYLE_SETTINGS_KEYS } from "./core/contracts/appearance";
/** Narrow mutable draft captured from the latest live appearance at one queued operation's boundary. */
export type StyleSettingsDraft = Pick<KplexSettings, typeof STYLE_SETTINGS_KEYS[number]>;
export type { StyleCommitResult } from "./ui/StyleEditorModal";

/** Native source captions share one known node-color inventory across standard and custom styles. */
function nodeColorLabel(field: typeof NODE_COLOR_FIELDS[number]): PlainTranslationKey {
  return ({backgroundColor: "styles.background", textColor: "styles.text", borderColor: "styles.border",
    gateStrokeColor: "colors.gateStroke", gateBackgroundColor: "colors.gateFill"} as const)[field];
}
/** Link and label paint keep distinct source controls. */
function linkColorLabel(field: typeof LINK_COLOR_FIELDS[number]): PlainTranslationKey {
  return field === "strokeColor" ? "styles.lineColor" : "styles.labelColor";
}

class NodeStyleModal extends StyleEditorModal {
  private static nextFormId = 0;
  private valueSuggest?: NodeStyleValueSuggest;
  private iconSuggest?: LucideIconSuggest;
  private colors?: StyleColorControls;

  /** Edit one fixed style family, or allow an unsaved new style to choose its matching family. */
  constructor(
    app: App,
    private initialName: string | null,
    private initialStyle: NodeStyle,
    private styleProperty: string,
    private valueSuggestions: Record<NodeStyleKind, NodeStyleValueSuggestion[]>,
    private onSave: (name: string, style: NodeStyle, previousName: string | null, kind: NodeStyleKind, isCurrent: () => boolean) => Promise<StyleCommitResult>,
    private onDelete?: (name: string, isCurrent: () => boolean) => Promise<StyleCommitResult>,
    private initialKind: NodeStyleKind = "property",
    private colorContext?: StyleColorContext,
    private onClosed?: () => void,
  ) {
    super(app);
  }

  /** Render both matching modes in one form so switching a new style preserves its appearance draft. */
  onOpen(): void {
    this.beginEditor(this.colorContext?.sourceScope, this.colorContext?.bindEditor);
    this.titleEl.setText(this.translate(this.initialName ? "styles.editNode" : "styles.addNode"));
    this.modalEl.addClass("kplex-style-editor-modal");
    this.contentEl.addClass("kplex-style-editor");
    const idPrefix = `kplex-node-style-${++NodeStyleModal.nextFormId}`;
    const help = this.contentEl.createEl("p", { attr: { id: `${idPrefix}-matching-help` } });
    let fieldIndex = 0;
    let kind = this.initialKind;

    const form = this.contentEl.createDiv({ cls: "kplex-style-form" });
    /** Associate each native control with its visible label and optional theme-styled explanation. */
    const field = (label: string, input: HTMLElement, description?: string) => {
      const row = form.createDiv({ cls: "kplex-style-row" });
      const info = row.createDiv({ cls: "setting-item-info" });
      const inputId = `${idPrefix}-${fieldIndex++}`;
      input.setAttribute("id", inputId);
      const labelEl = info.createEl("label", { text: label, attr: { for: inputId } });
      input.setAttribute("aria-label", label);
      if (description) {
        const descriptionId = `${inputId}-help`;
        info.createDiv({ text: description, cls: "setting-item-description", attr: { id: descriptionId } });
        input.setAttribute("aria-describedby", descriptionId);
      }
      row.appendChild(input);
      return { row, labelEl };
    };

    const typeInput = form.createEl("select");
    typeInput.createEl("option", { text: this.translate("styles.propertyValue"), value: "property" });
    typeInput.createEl("option", { text: this.translate("styles.tagPrefix"), value: "tag" });
    typeInput.value = kind;
    // Existing styles never change dictionary/matching semantics merely by opening their editor.
    typeInput.disabled = this.initialName !== null;
    field(this.translate("styles.type"), typeInput, this.translate("styles.typeHelp"));

    const nameInput = form.createEl("input");
    nameInput.type = "text";
    nameInput.value = this.initialName ?? "";
    const nameField = field("", nameInput);
    nameInput.setAttribute("aria-describedby", `${idPrefix}-matching-help`);
    const valueSuggest = new NodeStyleValueSuggest(this.app, nameInput,
      /** Reuse the suggester with the active style family's prepared values. */ () => this.valueSuggestions[kind]);
    this.valueSuggest = valueSuggest;

    const prefixInput = form.createEl("input");
    prefixInput.type = "text";
    prefixInput.value = this.initialStyle.prefix ?? "";
    const prefixField = field(this.translate("styles.labelPrefix"), prefixInput, this.translate("styles.labelPrefixHelp"));
    /** Refresh matching copy and suggestions without resetting icon, colors, font or label prefix. */
    const updateKind = () => {
      help.setText(kind === "tag" ? this.translate("styles.legacyTagHelp")
        : this.translate("styles.propertyHelp", { property: this.styleProperty || "Note type" }));
      const label = this.translate(kind === "tag" ? "styles.tagPrefix" : "styles.propertyValue");
      nameField.labelEl.setText(label);
      nameInput.setAttribute("aria-label", label);
      nameInput.placeholder = this.translate(kind === "tag" ? "styles.tagPrefixPlaceholder" : "styles.propertyValuePlaceholder");
      prefixField.row.toggle(kind === "tag");
      nameInput.classList.remove("is-invalid");
    };
    typeInput.addEventListener("change", /** Change only the new style's matching family. */ () => {
      if (this.initialName !== null) return;
      kind = typeInput.value === "tag" ? "tag" : "property";
      // The control shows the matching family's convention immediately, before Save normalizes it.
      if (nameInput.value.trim()) nameInput.value = kind === "tag"
        ? normalizeTagStylePrefix(nameInput.value) : nameInput.value.trim().replace(/^#+/, "");
      valueSuggest.close();
      updateKind();
    });
    nameInput.addEventListener("input", /** Clear validation feedback when the user corrects a prefix/value. */ () => {
      nameInput.classList.remove("is-invalid");
    });
    updateKind();

    const iconInput = form.createEl("input");
    iconInput.type = "text";
    iconInput.value = this.initialStyle.icon ?? "";
    iconInput.placeholder = this.translate("styles.lucidePlaceholder");
    field(this.translate("styles.lucideIcon"), iconInput, this.translate("styles.lucideHelp"));
    this.iconSuggest = new LucideIconSuggest(this.app, iconInput);

    const colorDraft = {...this.initialStyle};
    const context = this.colorContext ?? {sourceScope: this.modalEl, translate: this.translate, preferences: defaultColorPreferences,
      nodeStyle: () => DEFAULT_NODE_STYLE, linkStyle: () => DEFAULT_LINK_STYLE, background: () => undefined};
    this.colors = new StyleColorControls(this.app, {...context, nodeStyle: () => ({...context.nodeStyle(), ...colorDraft})}, () => this.canEdit());
    for (const colorField of NODE_COLOR_FIELDS) this.colors.add(form, this.translate(nodeColorLabel(colorField)), {kind: "node", field: colorField},
      () => colorDraft[colorField], value => { if (value === undefined) delete colorDraft[colorField]; else colorDraft[colorField] = value; }, () => context.nodeStyle()[colorField]);

    const fontSize = form.createEl("input");
    fontSize.type = "number";
    fontSize.min = "8";
    fontSize.max = "40";
    fontSize.step = "1";
    fontSize.value = String(this.initialStyle.fontSize ?? 18);
    field(this.translate("styles.fontSize"), fontSize, this.translate("styles.fontSizeHelp"));

    const actions = this.contentEl.createDiv({ cls: "kplex-style-actions" });
    if (this.initialName && this.onDelete) {
      const remove = actions.createEl("button", { cls: "mod-warning", text: this.translate("common.delete") });
      appendIcon(remove, "trash-2");
      remove.addEventListener("click", /** Delete only the style whose fixed family is being edited. */ () => {
        this.runOperation(/** Capture the fixed family/name once while excluding repeated clicks. */ isCurrent => this.onDelete!(this.initialName!, isCurrent));
      });
    }
    const cancel = actions.createEl("button", { text: this.translate("common.cancel") });
    appendIcon(cancel, "x");
    cancel.addEventListener("click", /** Discard the unsaved form draft. */ () => this.close());

    const save = actions.createEl("button", { cls: "mod-cta", text: this.translate("common.save") });
    appendIcon(save, "check");
    save.addEventListener("click", /** Validate the active matching value and save the unchanged appearance draft. */ () => {
      const normalized = kind === "tag" ? normalizeTagStylePrefix(nameInput.value) : normalizeNodeStyleValue(nameInput.value);
      if (!normalized) {
        nameInput.focus();
        nameInput.classList.add("is-invalid");
        return;
      }
      // Saving appearance alone must not rewrite legacy key spelling or its matching position.
      const name = kind === "tag" && this.initialName !== null && nameInput.value === this.initialName ? this.initialName : normalized;
      const style: NodeStyle = {
        ...colorDraft,
        icon: iconInput.value.trim() || undefined,
        fontSize: fontSize.value === String(this.initialStyle.fontSize ?? 18) ? this.initialStyle.fontSize : Math.max(8, Math.min(40, Number(fontSize.value) || 18)),
        // Keep an absent label prefix inherited unless the user changes the input.
        ...(kind === "tag" && prefixInput.value !== (this.initialStyle.prefix ?? "") ? { prefix: prefixInput.value } : {}),
      };
      this.runOperation(/** Submit the validated appearance draft within this exact modal lifetime. */ isCurrent => this.onSave(name, style, this.initialName, kind, isCurrent));
    });
    this.focusAfterAttachment(nameInput);
  }

  /** Close form-owned suggestion popovers before dropping the native modal's form elements. */
  onClose(): void {
    super.onClose();
    this.valueSuggest?.close();
    this.iconSuggest?.close();
    this.colors?.dispose(); this.colors = undefined;
    this.contentEl.empty(); this.onClosed?.();
  }
}

class OntologyLinkStyleModal extends StyleEditorModal {
  private colors?: StyleColorControls;

  /** Edit one field's appearance; queued save/reset return a durable outcome independent of manager refresh. */
  constructor(
    app: App,
    private fieldName: string,
    private initialStyle: LinkStyle,
    private baseStyle: LinkStyle,
    private onSave: (style: LinkStyle, isCurrent: () => boolean) => Promise<StyleCommitResult>,
    private onReset: (isCurrent: () => boolean) => Promise<StyleCommitResult>,
    private colorContext?: StyleColorContext,
    private onClosed?: () => void,
  ) {
    super(app);
  }

  /** Render the ontology-link style controls with localized captions and feedback; the native Modal owns its open/close shell. */
  onOpen(): void {
    this.beginEditor(this.colorContext?.sourceScope, this.colorContext?.bindEditor);
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
      input.setAttribute("aria-label", label); row.appendChild(input);
    };

    const colorDraft = {...this.initialStyle};
    const context = this.colorContext ?? {sourceScope: this.modalEl, translate: this.translate, preferences: defaultColorPreferences,
      nodeStyle: () => DEFAULT_NODE_STYLE, linkStyle: () => this.baseStyle, background: () => undefined};
    this.colors = new StyleColorControls(this.app, {...context, linkStyle: () => ({...context.linkStyle(), ...colorDraft})}, () => this.canEdit());
    for (const colorField of LINK_COLOR_FIELDS) this.colors.add(form, this.translate(linkColorLabel(colorField)), {kind: "link", field: colorField},
      () => colorDraft[colorField], value => { if (value === undefined) delete colorDraft[colorField]; else colorDraft[colorField] = value; }, () => context.linkStyle()[colorField]);

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

    const fontSize = form.createEl("input");
    fontSize.type = "number";
    fontSize.min = "7";
    fontSize.max = "24";
    fontSize.step = "1";
    fontSize.value = String(effective.fontSize ?? 10);
    field(this.translate("styles.labelSize"), fontSize);

    const openingControls = {width: strokeWidth.value, stroke: strokeStyle.value, start: startArrow.value, end: endArrow.value,
      label: showLabel.checked, font: fontSize.value};

    const actions = this.contentEl.createDiv({ cls: "kplex-style-actions" });
    const reset = actions.createEl("button", { cls: "mod-warning", text: this.translate("styles.reset") });
    appendIcon(reset, "rotate-ccw");
    reset.addEventListener("click", /** Reset only after one durable operation, using the shared pending/error contract. */ () => {
      this.runOperation(/** Retain this form's lifetime through the queued reset. */ isCurrent => this.onReset(isCurrent));
    });
    const cancel = actions.createEl("button", { text: this.translate("common.cancel") });
    appendIcon(cancel, "x");
    cancel.addEventListener("click", () => this.close());
    const save = actions.createEl("button", { cls: "mod-cta", text: this.translate("common.save") });
    appendIcon(save, "check");
    save.addEventListener("click", /** Capture one appearance override for the durable style owner. */ () => {
      const style: LinkStyle = {
        ...colorDraft,
        strokeWidth: strokeWidth.value === openingControls.width ? this.initialStyle.strokeWidth : Math.max(0.5, Math.min(8, Number(strokeWidth.value) || 1)),
        strokeStyle: strokeStyle.value === openingControls.stroke ? this.initialStyle.strokeStyle : strokeStyle.value === "dashed" || strokeStyle.value === "dotted" ? strokeStyle.value : "solid",
        startArrowHead: startArrow.value === openingControls.start ? this.initialStyle.startArrowHead : startArrow.value as Arrowhead,
        endArrowHead: endArrow.value === openingControls.end ? this.initialStyle.endArrowHead : endArrow.value as Arrowhead,
        showLabel: showLabel.checked === openingControls.label ? this.initialStyle.showLabel : showLabel.checked,
        fontSize: fontSize.value === openingControls.font ? this.initialStyle.fontSize : Math.max(7, Math.min(24, Number(fontSize.value) || 10)),
      };
      this.runOperation(/** Keep completion bound to this exact native form. */ isCurrent => this.onSave(style, isCurrent));
    });
  }

  /** Retire asynchronous operations before removing the native controls. */
  onClose(): void {
    super.onClose();
    this.colors?.dispose(); this.colors = undefined;
    this.contentEl.empty(); this.onClosed?.();
  }
}

class OntologyLinkStylesManagerModal extends StyleEditorModal {
  private swatches: StyleSwatchScope | null = null;
  private releaseColors: (() => void) | null = null;
  private search = "";
  private role: "all" | Role = "all";
  // Modal already owns a `scope: Scope` keyboard-handler property. Keep this UI filter distinct.
  private displayScope: "custom" | "all" = "custom";
  private manager: StyleManagerList | null = null;
  private listEl: HTMLElement | null = null;
  private statusEl: HTMLElement | null = null;

  constructor(
    app: App,
    private fields: OntologyStyleField[],
    private getStyle: (fieldName: string) => LinkStyle | undefined,
    private baseStyle: LinkStyle,
    private onEdit: (fieldName: string, afterChange: () => void) => void,
    private colorContext?: StyleColorContext,
    private onClosed?: () => void,
  ) {
    super(app);
  }

  /** Render the searchable ontology-link style manager with localized captions and feedback; the native Modal owns its open/close shell. */
  onOpen(): void {
    this.beginEditor(this.colorContext?.sourceScope, this.colorContext?.bindEditor);
    this.swatches = new StyleSwatchScope(this.contentEl, this.colorContext ?? {preferences: defaultColorPreferences});
    this.releaseColors = this.colorContext?.subscribeColors?.(() => this.renderList()) ?? null;
    this.titleEl.setText(this.translate("styles.relationshipTitle"));
    this.modalEl.addClass("kplex-style-manager-modal");
    this.contentEl.addClass("kplex-style-manager");
    this.contentEl.createEl("p", {
      text: this.translate("styles.relationshipHelp"),
    });

    this.manager = new StyleManagerList(this.contentEl, this.translate,
      {placeholder: this.translate("styles.searchRelationshipPlaceholder"), aria: this.translate("styles.searchRelationshipAria")},
      /** Search mechanics are shared; this manager retains its domain filters and entries. */ query => {this.search = query; this.renderList();});
    const controls = this.manager.controls, search = this.manager.search;

    const scope = controls.createEl("select", { attr: { "aria-label": this.translate("styles.linkStyleScope"), "data-kplex-style-scope": "true" } });
    scope.createEl("option", { text: this.translate("styles.customStyles"), attr: { value: "custom" } });
    scope.createEl("option", { text: this.translate("styles.allRelationshipFields"), attr: { value: "all" } });
    scope.value = this.displayScope;
    scope.addEventListener("change", () => {
      this.displayScope = scope.value === "all" ? "all" : "custom";
      this.manager?.reset();
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
      this.manager?.reset();
      this.renderList();
    });

    this.statusEl = this.manager.status;
    this.listEl = this.manager.list;
    this.renderList();
    this.focusAfterAttachment(search);
  }

  /** Rebuild the searchable ontology-link style manager entries with localized status/actions while preserving actual field and style values. */
  private renderList(): void {
    if (!this.canEdit() || !this.listEl || !this.statusEl || !this.manager) return;
    const baseStyle = this.colorContext?.linkStyle() ?? this.baseStyle;
    this.listEl.empty();

    const matches = this.fields.filter((field) => {
      const style = this.getStyle(field.name);
      if (this.displayScope === "custom" && !hasMeaningfulLinkOverride(style, baseStyle)) return false;
      if (this.role !== "all" && !field.roles.includes(this.role)) return false;
      if (this.search && !`${field.name} ${field.roles.join(" ")}`.toLowerCase().includes(this.search)) return false;
      return true;
    });
    const customCount = this.fields.filter((field) => hasMeaningfulLinkOverride(this.getStyle(field.name), baseStyle)).length;
    const scopeCount = this.displayScope === "custom" ? customCount : this.fields.length;
    const statusKey = this.displayScope === "custom"
      ? (scopeCount === 1 ? (matches.length === 1 ? "styles.statusCustom11" : "styles.statusCustom1n") : (matches.length === 1 ? "styles.statusCustomn1" : "styles.statusCustomnn"))
      : (scopeCount === 1 ? (matches.length === 1 ? "styles.statusFields11" : "styles.statusFields1n") : (matches.length === 1 ? "styles.statusFieldsn1" : "styles.statusFieldsnn"));
    this.statusEl.setText(this.translate(statusKey, { scopeCount, matches: matches.length }));

    if (!matches.length) {
      this.swatches?.dispose();
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

    const windowed = this.manager.window(matches);
    this.swatches?.update(appearanceColorReferences({hierarchyLinkStyles: Object.fromEntries(windowed.visible.map(field => [field.name, {...baseStyle, ...this.getStyle(field.name)}]))}));
    for (const field of windowed.visible) {
      const style = this.getStyle(field.name);
      const customized = hasMeaningfulLinkOverride(style, baseStyle);
      const effective = { ...baseStyle, ...(style ?? {}) };
      const row = this.manager.row(/** The current domain owner alone opens an editor. */ () => {if (this.canEdit()) this.onEdit(field.name, () => this.renderList());});
      const swatch = row.createSpan({ cls: "kplex-style-manager-line-swatch" });
      const swatchStyle = effective.strokeStyle === "dashed" || effective.strokeStyle === "dotted" ? effective.strokeStyle : "solid";
      swatch.addClass(`is-${swatchStyle}`);
      swatch.setCssProps({ "--kplex-style-swatch": colorValueCss(effective.strokeColor, NATIVE_LINK_STROKE) });
      const copy = row.createDiv({ cls: "kplex-style-manager-copy" });
      const heading = copy.createDiv({ cls: "kplex-style-manager-heading" });
      heading.createSpan({ text: field.name, cls: "kplex-style-manager-name" });
      const badges = heading.createSpan({ cls: "kplex-style-manager-badges" });
      for (const role of field.roles) badges.createSpan({ text: this.translate(roleLabelKey(role)), cls: "kplex-style-manager-badge" });
      copy.createDiv({
        text: this.translate(customized ? "styles.customSummary" : "styles.defaultSummary", { summary: describeLinkStyle(style, baseStyle, this.translate, this.colorContext?.preferences().palette) }),
        cls: "kplex-style-manager-summary",
      });

    }
    this.manager.more(windowed, /** Show more only expands this existing filtered list. */ () => this.renderList());
  }

  onClose(): void {
    super.onClose(); this.releaseColors?.(); this.releaseColors = null; this.swatches?.dispose(); this.swatches = null;
    this.manager = null; this.listEl = null; this.statusEl = null; this.contentEl.empty(); this.onClosed?.();
  }
}

class NoteTypeStylesManagerModal extends StyleEditorModal {
  private swatches: StyleSwatchScope | null = null;
  private releaseColors: (() => void) | null = null;
  private search = "";
  private manager: StyleManagerList | null = null;
  private listEl: HTMLElement | null = null;
  private statusEl: HTMLElement | null = null;

  constructor(
    app: App,
    private styleProperty: string,
    private getEntries: () => NodeStyleEntry[],
    private getStyle: (entry: NodeStyleEntry) => NodeStyle,
    private onEdit: (entry: NodeStyleEntry | null, afterChange: () => void) => void,
    private colorContext?: StyleColorContext,
    private onClosed?: () => void,
  ) {
    super(app);
  }

  /** Render the searchable note-type style manager with localized captions and feedback; the native Modal owns its open/close shell. */
  onOpen(): void {
    this.beginEditor(this.colorContext?.sourceScope, this.colorContext?.bindEditor);
    this.swatches = new StyleSwatchScope(this.contentEl, this.colorContext ?? {preferences: defaultColorPreferences});
    this.releaseColors = this.colorContext?.subscribeColors?.(() => this.renderList()) ?? null;
    this.titleEl.setText(this.translate("styles.nodeTitle"));
    this.modalEl.addClass("kplex-style-manager-modal");
    this.contentEl.addClass("kplex-style-manager");
    this.contentEl.createEl("p", {
      text: this.translate("styles.managerHelp", { property: this.styleProperty || "Note type" }),
    });

    this.manager = new StyleManagerList(this.contentEl, this.translate,
      {placeholder: this.translate("styles.searchNodePlaceholder"), aria: this.translate("styles.searchNodeAria")},
      /** Search mechanics are shared; this manager retains its domain filters and entries. */ query => {this.search = query; this.renderList();});
    const search = this.manager.search;

    this.manager.action(this.translate("styles.addStyle"), "plus", /** Keep creation in the existing domain editor. */ () => {if (this.canEdit()) this.onEdit(null, () => this.renderList());});

    this.statusEl = this.manager.status;
    this.listEl = this.manager.list;
    this.renderList();
    this.focusAfterAttachment(search);
  }

  /** Rebuild the searchable note-type style manager entries with localized status/actions while preserving actual field and style values. */
  private renderList(): void {
    if (!this.canEdit() || !this.listEl || !this.statusEl || !this.manager) return;
    this.listEl.empty();
    const entries = this.getEntries();
    const matches = entries.filter((entry) => !this.search || entry.name.toLowerCase().includes(this.search));
    this.statusEl.setText(this.translate("styles.resultCount", { count: entries.length, results: matches.length }));

    if (!matches.length) {
      this.swatches?.dispose();
      this.listEl.createDiv({
        cls: "kplex-style-manager-empty",
        text: this.translate(entries.length ? "styles.noMatches" : "styles.noneConfigured"),
      });
      return;
    }

    const windowed = this.manager.window(matches);
    this.swatches?.update(appearanceColorReferences({noteTypeStyles: Object.fromEntries(windowed.visible.map(entry => [entry.kind + ":" + entry.name, {...this.colorContext?.nodeStyle(), ...this.getStyle(entry)}]))}));
    for (const entry of windowed.visible) {
      const style = {...this.colorContext?.nodeStyle(), ...this.getStyle(entry)};
      const row = this.manager.row(/** The current domain owner alone opens an editor. */ () => {if (this.canEdit()) this.onEdit(entry, () => this.renderList());});
      const swatch = row.createSpan({ cls: "kplex-style-manager-node-swatch" });
      swatch.setCssProps({
        "--kplex-style-node-bg": colorValueCss(style.backgroundColor, NATIVE_NODE_PAINT.fill),
        "--kplex-style-node-border": colorValueCss(style.borderColor, NATIVE_NODE_PAINT.border),
      });
      const copy = row.createDiv({ cls: "kplex-style-manager-copy" });
      copy.createDiv({ text: entry.name, cls: "kplex-style-manager-name" });
      copy.createDiv({ text: this.translate(entry.kind === "tag" ? "styles.legacyTag" : "styles.propertyValue"), cls: "kplex-style-manager-badge" });
      copy.createDiv({ text: describeNodeStyle(style, this.translate, this.colorContext?.preferences().palette), cls: "kplex-style-manager-summary" });

    }
    this.manager.more(windowed, /** Show more only expands this existing filtered list. */ () => this.renderList());
  }

  onClose(): void {
    super.onClose(); this.releaseColors?.(); this.releaseColors = null; this.swatches?.dispose(); this.swatches = null;
    this.manager = null; this.listEl = null; this.statusEl = null; this.contentEl.empty(); this.onClosed?.();
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

/** Existing foreign-appearance chooser participates in the same durable shell and opening-theme fence. */
class LegacySettingsImportModal extends StyleEditorModal {
  private rawText = "";
  private readGeneration = 0;
  private readonly openingOwner: AppearanceOwner;

  /** Capture the opening theme before file reads; imports cannot target a later selection. */
  constructor(app: App, private plugin: KplexPlugin, private onImported: () => void, private onClosed?: () => void) {
    super(app); this.openingOwner = plugin.captureAppearanceOwner();
  }

  /** Choose a local legacy settings file without publishing any settings before explicit import. */
  onOpen(): void {
    this.beginEditor(undefined, /** The base shell retains stale drafts read-only until discard. */ editor => this.plugin.bindAppearanceEditor(editor, this.openingOwner));
    this.titleEl.setText(this.translate("settings.importTitle")); this.contentEl.addClass("kplex-import-settings-modal");
    this.contentEl.createEl("p", {text: this.translate("settings.importHelp")});
    const fileRow = this.contentEl.createDiv({cls: "kplex-import-file-row"});
    const fileInput = fileRow.createEl("input", {attr: {type: "file", accept: "application/json,.json"}});
    const status = this.contentEl.createDiv({cls: "kplex-import-status", text: this.translate("settings.noFileSelected")});
    fileInput.addEventListener("change", /** Read only the explicitly chosen local JSON, fencing close/reselection/theme changes. */ () => {
      if (!this.canEdit()) return;
      const file = fileInput.files?.[0], generation = ++this.readGeneration; this.rawText = "";
      if (!file) {status.setText(this.translate("settings.noFileSelected")); return;}
      void file.text().then(/** An old File promise cannot replace a newer selection or retired draft. */ text => {
        if (!this.canEdit() || generation !== this.readGeneration) return;
        this.rawText = text; status.setText(file.name);
      }).catch(/** Failure belongs only to the still-open chosen file. */ (error: unknown) => {
        if (this.canEdit() && generation === this.readGeneration) status.setText(this.translate("settings.fileReadFailed", {error: String(error)}));
      });
    });
    const actions = this.contentEl.createDiv({cls: "kplex-style-actions"});
    const cancel = actions.createEl("button", {text: this.translate("common.cancel")}); appendIcon(cancel, "x");
    cancel.addEventListener("click", /** Cancellation never mutates or persists a candidate import. */ () => this.close());
    const button = actions.createEl("button", {cls: "mod-cta", text: this.translate("settings.importButton")}); appendIcon(button, "download");
    button.addEventListener("click", /** Capture one valid import before the queue freezes this form. */ () => {
      if (!this.canEdit()) return;
      if (!this.rawText) {status.setText(this.translate("settings.chooseFileFirst")); return;}
      let parsed: unknown;
      try {parsed = JSON.parse(this.rawText);} catch (error) {status.setText(this.translate("settings.invalidJson", {error: String(error)})); return;}
      this.runOperation(/** Legacy appearance, active stored theme and ontology share one durable operation. */ async current => {
        const result = await this.plugin.importLegacyAppearance(parsed, this.openingOwner);
        if (!current()) return result;
        try {new Notice(this.translate("settings.importedNotice"), 2600); this.onImported(); return result;}
        catch (error) {console.error("K-Plex saved legacy import refresh failed", error); return {refreshPending: true};}
      });
    });
  }

  /** Retire outstanding File callbacks and native/theme registrations before removing controls. */
  onClose(): void {super.onClose(); this.readGeneration++; this.contentEl.empty(); this.onClosed?.();}
}

type DeclarativeSettingKey =
  | keyof KplexSettings
  | `layout.${PersistedLayoutDeviceClass}.${"leaf" | "sidepanel"}.lateralArrangement`
  | `typography.${PersistedLayoutDeviceClass}.${TypographyField}`
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
  | "baseNodeStyle.gateRadius"
  | "baseNodeStyle.maxLabelLength"
  | "baseNodeStyle.maxWidth"
  | "centralNodeStyle.maxWidth";

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
  private actionSettings: ActionSettingsController | null = null;
  private readonly colorDialogs = new Set<StyleEditorModal>();
  private colorDialogGeneration = 0;
  private readonly colorSwatchPages = new WeakMap<HTMLElement, ColorSwatchList>();
  private readonly colorSwatchOwners = new Set<ColorSwatchList>();

  /** Keep shortcut editing in the native settings hierarchy with lazy rendered resource ownership. */
  constructor(app: App, private kplexPlugin: KplexPlugin) {
    super(app, kplexPlugin);
    this.containerEl.addClass("kplex-settings");
  }

  /** Supply searchable action definitions without mounting listeners while Obsidian indexes settings. */
  private actionSettingsController(): ActionSettingsController {
    return this.actionSettings ??= new ActionSettingsController(this.kplexPlugin);
  }

  /** Release row subscriptions and transient input before navigation, unload or settings teardown. */
  disposeActionSettings(): void {
    this.colorDialogGeneration++;
    for (const owner of this.colorSwatchOwners) owner.dispose();
    this.colorSwatchOwners.clear();
    this.actionSettings?.dispose();
    for (const dialog of this.colorDialogs) dialog.retire();
    this.colorDialogs.clear();
  }

  /** Native tab switches must not retain an editor or capture handler from the previous page. */
  override hide(): void {
    this.disposeActionSettings();
    super.hide();
  }

  /** Activate the visible native page entry inside this tab after the host opens its root. */
  openActionSettingsPage(): boolean {
    return this.openSettingsPage(createObsidianTranslator()("actions.settingsTitle"));
  }

  /** Activate a localized declarative page in this tab's owning document; never navigate another settings window. */
  openSettingsPage(name: string): boolean {
    const label = Array.from(this.containerEl.ownerDocument.querySelectorAll<HTMLElement>(".setting-item.mod-navigable .setting-item-name"))
      .find(/** Match a visible declarative entry in this owning settings document, including nested pages outside the root container. */ element => element.textContent === name && element.getClientRects().length > 0);
    const row = label?.closest<HTMLElement>(".setting-item.mod-navigable");
    if (!row?.isConnected) return false;
    row.click();
    return true;
  }

  /** Scroll and focus a translated native setting after its page mounts; description regeneration or window closure cannot redirect to another row. */
  focusSetting(name: string, anchor?: string): void {
    this.containerEl.ownerDocument.defaultView?.setTimeout(/** Let native page opening/scroll restoration settle, then reacquire the Settings window's document. */ () => {
      const doc = this.containerEl.ownerDocument;
      doc.defaultView?.requestAnimationFrame(/** Anchor navigation lands on the actual visible native row without altering its value. */ () => {
        // Native subpages replace the tab's root container with a sibling page. The
        // target row's own connection/visibility, not the retired root, owns focus.
        if (doc.defaultView?.closed) return;
        const label = Array.from(doc.querySelectorAll<HTMLElement>(".setting-item-name"))
          .find(/** Native description fragments may be regenerated; the same visible localized label still identifies the exact target row. */ element => element.textContent === name && element.getClientRects().length > 0);
        const row = label?.closest<HTMLElement>(".setting-item") ?? (anchor ? doc.getElementById(anchor) : null)?.closest<HTMLElement>(".setting-item");
        if (!row?.isConnected || !row.getClientRects().length) return;
        row.scrollIntoView({ block: "center" });
        row.querySelector<HTMLElement>("input, textarea, button, [tabindex='0']")?.focus({ preventScroll: true });
      });
    }, 250);
  }

  /** Open a new style with a selectable family, or edit a style without changing its family. */
  private openNodeStyleEditor(kind: NodeStyleKind, name: string | null, afterChange?: () => void): void {
    const owner = this.kplexPlugin.captureAppearanceOwner();
    const settings = this.kplexPlugin.settings;
    const styles = kind === "tag" ? settings.tagNodeStyles : settings.noteTypeStyles;
    const openingExists = name !== null && Object.prototype.hasOwnProperty.call(styles, name) === true;
    const opening = structuredClone(name ? styles[name] ?? {} : {});
    const dialog = new NodeStyleModal(
      this.app, name, opening, settings.noteTypeField,
      this.nodeStyleValueSuggestions(),
      /** Save to the selected family, retaining existing imported tag order and unrelated styles. */
      async (nextName, nextStyle, previousName, selectedKind, isCurrent) => this.commitStyleChange(/** Prepare only this queued edit; a disk failure cannot change live styles. */ currentSettings => {
        const target = selectedKind === "tag" ? currentSettings.tagNodeStyles : currentSettings.noteTypeStyles;
        const normalizedValue = selectedKind === "tag" ? normalizeTagStylePrefix(nextName) : normalizeNodeStyleValue(nextName);
        if (!normalizedValue) throw new Error("Invalid style name");
        const normalizedNext = selectedKind === "tag" && previousName !== null && nextName === previousName ? previousName : normalizedValue;
        const latest = previousName ? target[previousName] : undefined;
        if (openingExists && previousName && !latest) throw new Error("Edited style no longer exists");
        const merged = mergeStyleDraft(opening, nextStyle, latest ?? {}, NODE_COLOR_FIELDS);
        for (const field of NODE_COLOR_FIELDS) if (!colorValuesEqual(opening[field], merged[field])) requireNamedColor(merged[field], currentSettings.colorPreferences);
        if (previousName && previousName !== normalizedNext) delete target[previousName];
        target[normalizedNext] = merged;
        if (selectedKind === "tag") {
          // A rename retains first-match priority; a new tag prefix follows existing styles.
          currentSettings.tagStyleList = currentSettings.tagStyleList.map(/** Preserve each existing priority slot. */ (key) => key === previousName ? normalizedNext : key);
          if (!currentSettings.tagStyleList.includes(normalizedNext)) currentSettings.tagStyleList.push(normalizedNext);
        }
      }, isCurrent, owner, afterChange),
      /** Delete from the fixed edited family without affecting an equally named other-family style. */
      async (removeName, isCurrent) => this.commitStyleChange(/** Delete within the latest queued family without restoring unrelated preferences. */ currentSettings => {
        const target = kind === "tag" ? currentSettings.tagNodeStyles : currentSettings.noteTypeStyles;
        delete target[removeName];
        if (kind === "tag") currentSettings.tagStyleList = currentSettings.tagStyleList.filter(/** Remove only the deleted prefix's matching slots. */ (key) => key !== removeName);
      }, isCurrent, owner, afterChange),
      kind, this.styleColorContext(owner), () => this.colorDialogs.delete(dialog),
    );
    this.colorDialogs.add(dialog); dialog.open();
  }

  /**
   * Native declarative subpages replace (and detach) the tab root. Reacquire the visible page in
   * that exact Settings document; never navigate another application window. The connected page
   * guards delayed action opening, independently of the stable document used for theme previews.
   */
  private colorActionPage(): HTMLElement {
    if (this.containerEl.isConnected) return this.containerEl;
    const doc = this.containerEl.ownerDocument;
    return Array.from(doc.querySelectorAll<HTMLElement>(".setting-page-content"))
      .find(/** Only the currently displayed native page may supply a detached tab's context. */ page => page.isConnected && page.getClientRects().length > 0) ?? this.containerEl;
  }

  /**
   * A native subpage is replaced on css-change, even while its modal draft remains open. Sample
   * the stable owning Settings body in that case; it carries the host theme and inherited public
   * tokens. A still-attached root keeps its explicit scope, including local custom variables.
   */
  private colorSourceScope(): HTMLElement {
    const page = this.colorActionPage();
    return page !== this.containerEl ? page.ownerDocument.body : page;
  }

  /** Native color surfaces share current preview facts and one CSS subscription contract. */
  private styleColorContext(owner?: AppearanceOwner, sourceScope = this.colorSourceScope()): StyleColorContext {
    const plugin = this.kplexPlugin;
    const opening = owner ? structuredClone({colorPreferences: plugin.settings.colorPreferences, baseNodeStyle: plugin.settings.baseNodeStyle,
      baseLinkStyle: plugin.settings.baseLinkStyle, backgroundColor: plugin.settings.backgroundColor}) : null;
    /** An old draft keeps its own appearance while CSS remains live in its owning document. */
    const current = (): Pick<KplexSettings, "colorPreferences" | "baseNodeStyle" | "baseLinkStyle" | "backgroundColor"> => owner && opening && !plugin.isAppearanceOwnerCurrent(owner) ? opening : plugin.settings;
    return {sourceScope, translate: plugin.translator,
      ...(owner ? {bindEditor: /** Every nested source/pair editor shares this exact parent activation. */ (editor: StyleEditorModal) => plugin.bindAppearanceEditor(editor, owner)} : {}),
      subscribeColors: changed => subscribeAppearanceSources(listener => plugin.index.subscribePresentation(listener), current, changed),
      preferences: () => current().colorPreferences, nodeStyle: () => current().baseNodeStyle,
      linkStyle: () => current().baseLinkStyle, background: () => current().backgroundColor,
      subscribeCss: changed => {const ref = this.app.workspace.on("css-change", changed); return () => this.app.workspace.offref(ref);}};
  }

  /** Lazily open a native Compass draft; teardown/migration supersedes loading, and only edited fields enter the existing queue. */
  private async openCompassSettings(): Promise<void> {
    const owner = this.kplexPlugin.captureAppearanceOwner();
    const generation = ++this.colorDialogGeneration, actionPage = this.colorActionPage(), sourceScope = this.colorSourceScope(), sourceDocument = sourceScope.ownerDocument;
    const plugin = this.kplexPlugin; if (plugin.settings.colorPreferencesFuture !== undefined) return;
    const {CompassSettingsModal} = await import("./ui/CompassSettingsModal");
    if (!plugin.isAppearanceOwnerCurrent(owner) || generation !== this.colorDialogGeneration || !actionPage.isConnected || !sourceScope.isConnected || sourceScope.ownerDocument !== sourceDocument || plugin.settings.colorPreferencesFuture !== undefined) return;
    const dialog = new CompassSettingsModal(this.app, this.styleColorContext(owner), /** Merge against the latest durable owner without restoring stale palette or unedited fills. */ (initial, edited, current) => this.commitStyleChange(/** Each explicit Compass field has independent last-edit ownership. */ draft => {
      const latest = draft.colorPreferences.compass;
      if (initial.enabled !== edited.enabled) latest.enabled = edited.enabled;
      if (initial.intensity !== edited.intensity) {if (edited.intensity === undefined) delete latest.intensity; else latest.intensity = edited.intensity;}
      for (const direction of COMPASS_DIRECTIONS) if (!colorValuesEqual(initial.fills[direction], edited.fills[direction])) {
        const value = edited.fills[direction]; requireNamedColor(value, draft.colorPreferences);
        if (value === undefined) delete latest.fills[direction]; else latest.fills[direction] = value;
      }
    }, current, owner), /** Release exactly this native editor after close or migration. */ () => this.colorDialogs.delete(dialog));
    this.colorDialogs.add(dialog); dialog.open();
  }

  /** A searchable palette manager owns all pair and replacement dialogs until native tab teardown. */
  private openColorPalette(): void {
    const owner = this.kplexPlugin.captureAppearanceOwner();
    const plugin = this.kplexPlugin;
    const dialog = new ColorPaletteModal(this.app, {...this.styleColorContext(owner), read: () => plugin.settings,
      readOnly: () => plugin.settings.colorPreferencesFuture !== undefined || plugin.settings.appearanceThemesFuture !== undefined || !plugin.isAppearanceOwnerCurrent(owner),
      canDelete: () => plugin.settings.graphLensesColorFuture === undefined && !appearanceHasUnsupportedColors(plugin.settings),
      write: edit => plugin.updateStyleSettings(edit, owner), subscribe: changed => subscribeAppearanceSources(listener => plugin.index.subscribePresentation(listener), () => plugin.settings, changed),
      onClosed: () => this.colorDialogs.delete(dialog)});
    this.colorDialogs.add(dialog); dialog.open();
  }

  /** Each semantic slot validates its local candidate, including self/indirect cycles, before explicit Save. */
  private openSemanticColor(slot: SemanticColorSlot): void {
    const owner = this.kplexPlugin.captureAppearanceOwner();
    const plugin = this.kplexPlugin; if (plugin.settings.colorPreferencesFuture !== undefined) return;
    const context = this.styleColorContext(owner);
    const dialog = new ColorSourceModal(this.app, {...context, title: plugin.translator(`colors.semantic.${slot}`),
      initial: plugin.settings.colorPreferences.semantic[slot], target: {kind: "node", field: "borderColor"},
      inherit: () => ({kind: "theme", variable: `--kplex-semantic-${slot}`}), preferences: candidate => {
        const prefs = context.preferences(), semantic = {...prefs.semantic};
        if (candidate === undefined) delete semantic[slot]; else semantic[slot] = candidate;
        return {...prefs, semantic};
      },
      onSave: (color, current) => this.commitStyleChange(draft => {
        requireNamedColor(color, draft.colorPreferences);
        if (color === undefined) delete draft.colorPreferences.semantic[slot]; else draft.colorPreferences.semantic[slot] = color;
      }, current, owner), onClosed: () => this.colorDialogs.delete(dialog)});
    this.colorDialogs.add(dialog); dialog.open();
  }

  /** Share one bounded paired-color sampler among the currently rendered native page's rows. */
  private mountColorSwatches(element: HTMLElement, read: () => readonly ColorSwatchItem[]): () => void {
    const page = element.closest<HTMLElement>(".setting-page-content, .vertical-tab-content") ?? this.colorSourceScope();
    let owner = this.colorSwatchPages.get(page);
    if (!owner) {
      owner = new ColorSwatchList(page, this.styleColorContext(), /** Retired page owners do not accumulate across repeated navigation. */ () => {this.colorSwatchOwners.delete(owner!); this.colorSwatchPages.delete(page);});
      this.colorSwatchPages.set(page, owner); this.colorSwatchOwners.add(owner);
    }
    return owner.add(element, read);
  }

  /** Render a reusable pair beside an explicit native Edit action; source/queue behavior stays in existing editors. */
  private colorAction(name: string, read: () => readonly ColorSwatchItem[], action: () => void, desc?: string): SettingDefinition<DeclarativeSettingKey> {
    return {name, desc, render: /** Native cleanup owns the paired preview registration. */ setting => {
      const release = this.mountColorSwatches(setting.controlEl.createDiv(), read);
      setting.addButton(/** Associate repeated Edit actions with their specific color property for keyboard/screen-reader users. */ button => {
        button.setButtonText(this.kplexPlugin.translator("colors.edit")).setDisabled(this.kplexPlugin.settings.colorPreferencesFuture !== undefined || this.kplexPlugin.settings.appearanceThemesFuture !== undefined).onClick(action);
        button.buttonEl.setAttribute("aria-label", `${this.kplexPlugin.translator("colors.edit")}: ${name}`);
      });
      return release;
    }};
  }

  /** Read the same inherited fields and native role fallbacks used by the existing standard source editor. */
  private standardSwatchItems(key: typeof STANDARD_NODE_COLOR_STYLES[number] | typeof STANDARD_LINK_COLOR_STYLES[number]): readonly ColorSwatchItem[] {
    const settings = this.kplexPlugin.settings, node = key.endsWith("NodeStyle"), t = this.kplexPlugin.translator;
    const values = {...(node ? settings.baseNodeStyle : settings.baseLinkStyle), ...settings[key]};
    const fallback = nodePaintFallbacks({page: {isFolder: key === "folderNodeStyle", isTag: key === "tagNodeStyle", url: key === "urlNodeStyle" ? "url" : null, file: key === "virtualNodeStyle" ? null : true},
      role: key === "centralNodeStyle" ? "center" : key === "siblingNodeStyle" ? "sibling" : "child", relationType: key === "inferredNodeStyle" ? RelationType.INFERRED : undefined});
    return (node ? NODE_COLOR_FIELDS : LINK_COLOR_FIELDS).map(/** Each cell preserves its field label and current source identity. */ field => ({id: field, label: t(node ? nodeColorLabel(field as typeof NODE_COLOR_FIELDS[number]) : linkColorLabel(field as typeof LINK_COLOR_FIELDS[number])),
      value: Reflect.get(values, field) as ColorValue | undefined, fallback: node ? nodeColorFallback(field as typeof NODE_COLOR_FIELDS[number], fallback) : field === "textColor" ? NATIVE_LINK_TEXT : NATIVE_LINK_STROKE}));
  }

  /** Bind the host's cloned page-description strips only after declarative siblings have mounted. */
  private mountStandardOverview(setting: Setting): () => void {
    let retired = false; const releases: Array<() => void> = [];
    setting.settingEl.ownerDocument.defaultView?.queueMicrotask(/** Descriptions are cloned by Obsidian; the connected clones own their samples. */ () => {
      if (retired || !setting.settingEl.isConnected) return;
      const page = setting.settingEl.closest(".setting-page-content, .vertical-tab-content");
      for (const element of Array.from(page?.querySelectorAll<HTMLElement>("[data-kplex-color-style]") ?? [])) {
        const key = element.dataset.kplexColorStyle;
        const known = [...STANDARD_NODE_COLOR_STYLES, ...STANDARD_LINK_COLOR_STYLES].find(candidate => candidate === key);
        if (known) releases.push(this.mountColorSwatches(element, () => this.standardSwatchItems(known)));
      }
    });
    return /** Native subpage replacement retires every connected description registration. */ () => {retired = true; for (const release of releases) release();};
  }

  /** Standard styles expose the same source controls without expanding user-defined collections. */
  private standardColorPages(): SettingDefinitionItem<DeclarativeSettingKey>[] {
    const plugin = this.kplexPlugin, t = plugin.translator;
    return [...STANDARD_NODE_COLOR_STYLES, ...STANDARD_LINK_COLOR_STYLES].map(key => {
      const title = t(`colors.standard.${key}`);
      const fields = key.endsWith("NodeStyle") ? NODE_COLOR_FIELDS : LINK_COLOR_FIELDS;
      const description = createFragment(); description.createDiv({attr: {"data-kplex-color-style": key}});
      return {type: "page", name: title, desc: description, items: [{type: "group", heading: title, items: fields.map(field => this.colorAction(
        t(field === "strokeColor" ? "styles.lineColor" : field === "textColor" && key.endsWith("LinkStyle") ? "styles.labelColor" : nodeColorLabel(field)),
        () => this.standardSwatchItems(key).filter(item => item.id === field),
        () => this.openStandardColor(key, field),
      ))}]};
    });
  }

  /** Clearing one standard field changes only its absence policy; every other legacy literal remains explicit. */
  private openStandardColor(key: typeof STANDARD_NODE_COLOR_STYLES[number] | typeof STANDARD_LINK_COLOR_STYLES[number], field: typeof NODE_COLOR_FIELDS[number] | typeof LINK_COLOR_FIELDS[number]): void {
    const owner = this.kplexPlugin.captureAppearanceOwner();
    const plugin = this.kplexPlugin, context = this.styleColorContext(owner), isNode = key.endsWith("NodeStyle");
    const openingStyle = structuredClone(plugin.settings[key]);
    /** A stale draft never borrows the newly selected theme’s effective standard style. */
    const currentStyle = (): NodeStyle | LinkStyle => plugin.isAppearanceOwnerCurrent(owner) ? plugin.settings[key] : openingStyle;
    const initial = Reflect.get(plugin.settings[key], field) as ColorValue | undefined;
    const lower = (): ColorValue | undefined => key === "baseNodeStyle" || key === "baseLinkStyle" ? undefined
      : Reflect.get(isNode ? context.nodeStyle() : context.linkStyle(), field) as ColorValue | undefined;
    const dialog = new ColorSourceModal(this.app, {...context, title: plugin.translator(`colors.standard.${key}`), initial,
      target: isNode ? {kind: "node", field: field as typeof NODE_COLOR_FIELDS[number]} : {kind: "link", field: field as typeof LINK_COLOR_FIELDS[number]},
      fallbacks: nodePaintFallbacks({page: {isFolder: key === "folderNodeStyle", isTag: key === "tagNodeStyle", url: key === "urlNodeStyle" ? "url" : null, file: key === "virtualNodeStyle" ? null : true},
        role: key === "centralNodeStyle" ? "center" : key === "siblingNodeStyle" ? "sibling" : "child", relationType: key === "inferredNodeStyle" ? RelationType.INFERRED : undefined}),
      inherit: lower, nodeStyle: () => isNode ? {...context.nodeStyle(), ...currentStyle()} : context.nodeStyle(),
      linkStyle: () => isNode ? context.linkStyle() : {...context.linkStyle(), ...currentStyle()},
      onSave: (color, current) => this.commitStyleChange(draft => {
        requireNamedColor(color, draft.colorPreferences); const next = {...draft[key]};
        if (color === undefined) Reflect.deleteProperty(next, field); else Object.assign(next, {[field]: color});
        Object.assign(draft, {[key]: next}); draft.standardStyleDefaults = "native";
      }, current, owner), onClosed: () => this.colorDialogs.delete(dialog)});
    this.colorDialogs.add(dialog); dialog.open();
  }

  /** Immediate native rows follow Obsidian's document adoption; only actual row/window retirement disposes them. */
  private subscribeThemeRow(setting: Setting, changed: (migrated: boolean) => void, retired: () => void): () => void {
    let document = setting.settingEl.ownerDocument, live = true, releaseMigration: (() => void) | undefined, releaseWindow = (): void => {};
    /** Native Settings can adopt a constructed row into its popout; recreate handlers without retargeting a dirty editor. */
    const follow = (): void => {
      if (!live) return; releaseWindow(); document = setting.settingEl.ownerDocument; const boundDocument = document, view = document.defaultView;
      /** Closing an old window after adoption cannot retire a row already owned by another document. */
      const closed = (): void => {if (setting.settingEl.ownerDocument !== boundDocument) {follow(); changed(true);} else dispose();};
      view?.addEventListener("pagehide", closed, {once: true}); releaseWindow = /** Always unsubscribe from the exact acquired native window. */ () => view?.removeEventListener("pagehide", closed);
    };
    const release = this.kplexPlugin.subscribeAppearanceThemes(/** Reacquire only this mounted row's actual document and current activation. */ () => {
      if (!live) return; if (setting.settingEl.ownerDocument !== document) {follow(); changed(true);} else if (!document.defaultView?.closed) changed(false); else dispose();
    });
    /** Explicit native page replacement and owning-window close share idempotent teardown. */
    const dispose = (): void => {if (!live) return; live = false; release(); releaseMigration?.(); releaseWindow(); retired();};
    follow();
    if (typeof setting.settingEl.onWindowMigrated === "function") releaseMigration = setting.settingEl.onWindowMigrated(/** Initial same-window notification preserves state; real adoption replaces immediate native handlers. */ () => {
      if (live && setting.settingEl.ownerDocument !== document) {follow(); changed(true);}
    });
    return dispose;
  }

  /** Theme controls stay on Visual styling; native rows own their exact subscriptions and generation. */
  private appearanceThemeDefinitions(): SettingDefinitionItem<DeclarativeSettingKey>[] {
    const t = this.kplexPlugin.translator;
    return [{name: t("themes.label"), desc: t("themes.help"), render: /** Mount native controls only on the displayed page/search result. */ setting => this.mountThemeControls(setting)},
      {name: t("themes.migrationMessage"), visible: /** The durable marker makes this one dismissible migration message. */ () => this.kplexPlugin.settings.appearanceThemes?.migrationNotice === true,
        render: /** Native teardown releases the exact message row, including popout settings. */ setting => {
          let active = true, pending = false; const plugin = this.kplexPlugin;
          setting.addExtraButton(/** Persist dismissal as library metadata without any graph work. */ button => {
            button.setIcon("x").setTooltip(t("themes.dismissMigration")); button.extraSettingsEl.setAttribute("aria-label", t("themes.dismissMigration"));
            button.onClick(/** Duplicate/stale native events cannot dismiss a replacement migration state. */ async () => {
              if (!active || pending) return; pending = true; button.setDisabled(true); const owner = plugin.captureAppearanceOwner();
              try {const result = await plugin.updateAppearanceThemes({kind: "dismiss-migration"}, owner); if (result.refreshPending) new Notice(t("styles.operation.savedRefreshPending"));}
              catch (error) {console.error("K-Plex theme message dismissal was not saved", error); new Notice(t("styles.operation.notSaved"));}
              finally {pending = false; if (active) button.setDisabled(false);}
            });
          });
          return this.subscribeThemeRow(setting, /** Hide only after durable dismissal; other settings stay mounted. */ () => {if (active) setting.settingEl.toggle(plugin.settings.appearanceThemes?.migrationNotice === true);}, /** Pending UI completion cannot revive a removed row. */ () => {active = false;});
        }}];
  }

  /** Use one native dropdown and native Lucide icon buttons, never a separate CRUD toolbar. */
  private mountThemeControls(setting: Setting): () => void {
    const plugin = this.kplexPlugin, t = plugin.translator; let active = true, pending = false, generation = 0;
    setting.settingEl.addClass("kplex-theme-setting");
    /** Metadata updates names only here; activation retires old native callbacks through their captured proof. */
    const paint = (): void => {
      if (!active) return; setting.clear(); const mount = ++generation;
      const library = plugin.settings.appearanceThemes, owner = plugin.captureAppearanceOwner();
      const readOnly = !library || plugin.settings.appearanceThemesFuture !== undefined;
      setting.setDesc(t(readOnly ? "themes.unavailable" : "themes.help"));
      setting.addDropdown(/** Native selection is explicit and publishes only after the existing queue saves. */ dropdown => {
        dropdown.selectEl.setAttribute("aria-label", t("themes.label"));
        if (library) dropdown.addOptions(Object.fromEntries(library.themes.map(/** Names are literal user data; IDs remain stable. */ theme => [theme.id, theme.name]))).setValue(library.selectedId);
        dropdown.setDisabled(readOnly || pending).onChange(/** Retain the durable selection and restore it after a storage failure. */ async id => {
          if (!active || mount !== generation || pending || readOnly || !plugin.isAppearanceOwnerCurrent(owner) || id === library?.selectedId) return;
          pending = true; dropdown.setDisabled(true);
          try {const result = await plugin.updateAppearanceThemes({kind: "select", id}, owner); if (result.refreshPending) new Notice(t("styles.operation.savedRefreshPending"));}
          catch (error) {console.error("K-Plex theme selection was not saved", error); new Notice(t("styles.operation.notSaved"));}
          finally {pending = false; paint();}
        });
      });
      setting.addExtraButton(/** The manager opens metadata without selecting a row. */ button => {
        button.setIcon("palette").setTooltip(t("themes.manage")).setDisabled(readOnly || pending); button.extraSettingsEl.setAttribute("aria-label", t("themes.manage"));
        button.onClick(/** Capture this mounted row's activation, not a later selected identity. */ () => {if (active && mount === generation && !pending && !readOnly && plugin.isAppearanceOwnerCurrent(owner)) this.openAppearanceThemes(owner, setting.settingEl.ownerDocument.body);});
      });
      setting.addExtraButton(/** Factory is immutable; editable themes share the existing color-reset confirmation. */ button => {
        const disabled = readOnly || pending || library?.selectedId === DEFAULT_THEME_ID;
        button.setIcon("rotate-ccw").setTooltip(t("themes.reset")).setDisabled(disabled); button.extraSettingsEl.setAttribute("aria-label", t("themes.reset"));
        button.onClick(/** Native disabled treatment is reinforced before opening any draft. */ () => {if (active && mount === generation && !disabled && !pending && plugin.isAppearanceOwnerCurrent(owner)) this.openThemeColorReset("base", owner, false, setting.settingEl.ownerDocument.body);});
      });
    };
    paint(); return this.subscribeThemeRow(setting, paint, /** Row teardown retires pending completions and native handlers. */ () => {active = false;});
  }

  /** Reuse node/link manager mechanics and the same queued appearance ownership for the saved library. */
  private openAppearanceThemes(owner = this.kplexPlugin.captureAppearanceOwner(), sourceScope = this.colorSourceScope().ownerDocument.body): void {
    const plugin = this.kplexPlugin, opening = plugin.settings.appearanceThemes;
    if (!opening || plugin.settings.appearanceThemesFuture !== undefined || !plugin.isAppearanceOwnerCurrent(owner)) return;
    const dialog = new AppearanceThemesManagerModal(this.app, {context: this.styleColorContext(owner, sourceScope),
      library: /** A retired manager keeps its opening data visible read-only rather than retargeting. */ () => plugin.isAppearanceOwnerCurrent(owner) ? plugin.settings.appearanceThemes ?? opening : opening,
      subscribe: /** The plugin's metadata channel does not notify scene/index subscribers. */ changed => plugin.subscribeAppearanceThemes(changed),
      save: /** Theme metadata and selection share one durable operation, never a second writer. */ (action, _current) => plugin.updateAppearanceThemes(action, owner),
      create: /** Creating selects only after the same queued snapshot succeeds. */ (name, defaults, _current) => plugin.createAppearanceTheme(name, defaults, owner),
      closed: /** Unload/settings replacement releases precisely this manager and its children. */ () => this.colorDialogs.delete(dialog)});
    this.colorDialogs.add(dialog); dialog.open();
  }

  /** Enumerate the exact reviewed sources; palette definitions and non-color styling are never reset slots. */
  private themeResetSlots(settings: StyleSettingsDraft, scope: ColorResetScope): string[] {
    return [...(scope === "semantic" ? [] : standardColorSlots(settings)), ...(scope === "base" ? [] : semanticColorSlots(settings))];
  }

  /** Translate the finite scope while preserving literal rule/lens names instead of exposing storage paths. */
  private themeResetSlotLabel(slot: string, settings: StyleSettingsDraft): string {
    const t = this.kplexPlugin.translator; if (slot === "backgroundColor") return t("settings.ui.plex.background");
    const parts = slot.split("."), key = parts[0], field = parts.at(-1) ?? "", name = parts.slice(1, -1).join(".");
    if (key === "semantic") return t(`colors.semantic.${parts[1] as SemanticColorSlot}`);
    if (key === "compass") return `${t("compass.title")} · ${t(`compass.${parts[1] as typeof COMPASS_DIRECTIONS[number]}`)}`;
    const link = key.endsWith("LinkStyle") || key === "hierarchyLinkStyles" || parts.at(-2) === "edge";
    const label = t(link ? linkColorLabel(field as typeof LINK_COLOR_FIELDS[number]) : nodeColorLabel(field as typeof NODE_COLOR_FIELDS[number]));
    if (key === "lens") return t("themes.lensColor", {name: settings.graphLenses.find(/** Stable lens IDs never become matching expressions or recreated definitions. */ lens => lens.id === parts[1])?.name ?? parts[1], field: label});
    if (key === "noteTypeStyles" || key === "tagNodeStyles" || key === "hierarchyLinkStyles") return `${name} · ${label}`;
    return `${t(`colors.standard.${key as typeof STANDARD_NODE_COLOR_STYLES[number] | typeof STANDARD_LINK_COLOR_STYLES[number]}`)} · ${label}`;
  }

  /** Extend ColorAdoptionModal with detached scoped previews and one finite durable confirmation. */
  private openThemeColorReset(initial: ColorResetScope, owner = this.kplexPlugin.captureAppearanceOwner(), baseShortcut = false, sourceScope = this.colorSourceScope().ownerDocument.body): void {
    const plugin = this.kplexPlugin, library = plugin.settings.appearanceThemes;
    if (!library || plugin.settings.appearanceThemesFuture !== undefined || plugin.settings.colorPreferencesFuture !== undefined || !plugin.isAppearanceOwnerCurrent(owner)
      || (!baseShortcut && library.selectedId === DEFAULT_THEME_ID)) return;
    const opening = structuredClone(Object.fromEntries(STYLE_SETTINGS_KEYS.map(/** Capture appearance only; this detached preview is never the theme schema. */ key => [key, plugin.settings[key]]))) as StyleSettingsDraft;
    const context = this.styleColorContext(owner, sourceScope);
    /** The confirmed scope is checked again at queue entry, without clearing newly introduced unreviewed fields. */
    const save = (scope: ColorResetScope, current: () => boolean): Promise<StyleCommitResult> => this.commitStyleChange(/** Reset known source assignments only through the established queued draft. */ draft => {
      if (owner.themeId === DEFAULT_THEME_ID) throw new Error("Default theme is immutable");
      if (JSON.stringify(this.themeResetSlots(draft, scope)) !== JSON.stringify(this.themeResetSlots(opening, scope))) throw new Error("Affected colors changed; reopen reset preview");
      resetAppearanceColors(draft, scope);
    }, current, owner);
    const dialog = new ColorAdoptionModal(this.app, context, [], current => save("base", current), /** Exact native lifetime cleanup. */ () => this.colorDialogs.delete(dialog), {
      initial, baseShortcut, save,
      preview: /** Each scope starts from the same detached opening snapshot; no sampled RGB is persisted. */ scope => {
        const draft = structuredClone(opening); resetAppearanceColors(draft, scope);
        const node = Object.values(draft.noteTypeStyles)[0] ?? Object.values(draft.tagNodeStyles)[0] ?? {}, link = Object.values(draft.hierarchyLinkStyles)[0] ?? {};
        const previewContext: StyleColorContext = {...context, preferences: () => draft.colorPreferences,
          nodeStyle: () => scope === "base" && baseShortcut ? draft.baseNodeStyle : {...draft.baseNodeStyle, ...node},
          linkStyle: () => scope === "base" && baseShortcut ? draft.baseLinkStyle : {...draft.baseLinkStyle, ...link}, background: () => draft.backgroundColor};
        return {slots: this.themeResetSlots(opening, scope).map(/** Human-readable reviewed source names remain local to this dialog. */ slot => this.themeResetSlotLabel(slot, opening)), context: previewContext,
          target: {kind: "canvas"}, value: draft.backgroundColor};
      },
    });
    this.colorDialogs.add(dialog); dialog.open();
  }


  /** Preserve the established base-only adoption shortcut in the same scoped confirmation. */
  private openColorAdoption(): void {this.openThemeColorReset("base", this.kplexPlugin.captureAppearanceOwner(), true);}

  /** Settings and canvas reuse one detached source shell and the existing queued writer. */
  private openCanvasColorEditor(): void {
    const owner = this.kplexPlugin.captureAppearanceOwner();
    const sourceScope = this.colorSourceScope(); if (!sourceScope.isConnected) return;
    const plugin = this.kplexPlugin;
    const dialog = new ColorSourceModal(this.app, {...this.styleColorContext(owner),
      title: plugin.translator("settings.ui.plex.background"), initial: plugin.settings.backgroundColor,
      sourceScope, translate: plugin.translator, target: {kind: "canvas"},
      onSave: (color, current) => this.commitStyleChange(draft => {
        if (color && typeof color !== "string" && color.kind === "palette" && !draft.colorPreferences.palette.some(pair => pair.id === color.id)) throw new Error("Named color no longer exists");
        draft.backgroundColor = color;
        draft.standardStyleDefaults = "native";
      }, current, owner),
      onClosed: () => this.colorDialogs.delete(dialog),
    });
    this.colorDialogs.add(dialog); dialog.open();
  }

  /** Durable completion is authoritative; manager/settings failures become saved recovery hints and retired dialogs cannot refresh UI. */
  private async commitStyleChange(edit: (draft: StyleSettingsDraft) => void, isCurrent: () => boolean, owner: AppearanceOwner, afterChange?: () => void): Promise<StyleCommitResult> {
    const result = await this.kplexPlugin.updateStyleSettings(edit, owner);
    if (!isCurrent()) return result;
    let refreshPending = result.refreshPending;
    for (const refresh of [afterChange, /** Refresh only this still-mounted native Settings page. */ () => { if (this.containerEl.isConnected) this.update(); }]) {
      try { refresh?.(); } catch (error) {
        console.error("K-Plex saved style manager refresh failed", error);
        refreshPending = true;
      }
    }
    return { refreshPending };
  }

  /** Collect both families in one indexed-page pass, without note-body reads or semantic work. */
  private nodeStyleValueSuggestions(): Record<NodeStyleKind, NodeStyleValueSuggestion[]> {
    const values: Record<NodeStyleKind, Map<string, NodeStyleValueSuggestion>> = { property: new Map(), tag: new Map() };
    /** Deduplicate within one family while prioritizing its configured styles over generic tag hints. */
    const put = (kind: NodeStyleKind, value: string, display: string, source: NodeStyleValueSuggestion["kind"]) => {
      const normalized = kind === "tag" ? normalizeTagStylePrefix(value) : normalizeNodeStyleValue(value);
      if (!normalized) return;
      const key = normalized.toLowerCase();
      const current = values[kind].get(key);
      if (!current || (current.kind === "tag" && source !== "tag")) values[kind].set(key, { value: normalized, display, kind: source });
    };
    for (const name of Object.keys(this.kplexPlugin.settings.noteTypeStyles)) put("property", name, normalizeNodeStyleValue(name), "configured");
    for (const name of Object.keys(this.kplexPlugin.settings.tagNodeStyles)) put("tag", name, normalizeTagStylePrefix(name), "configured");
    for (const page of this.kplexPlugin.index.allPages()) {
      if (page.noteType) put("property", page.noteType, page.noteType, "property");
      for (const tag of page.tags) {
        const normalized = normalizeTagStylePrefix(tag);
        if (normalized) {
          put("property", tag, normalized, "tag");
          put("tag", normalized, normalized, "tag");
        }
      }
    }
    /** Present a stable alphabetical list without changing stored tag matching priority. */
    const sorted = (kind: NodeStyleKind) => [...values[kind].values()].sort(
      /** Sort only the suggestion display, never the saved tag-style list. */ (a, b) => a.display.localeCompare(b.display, undefined, { sensitivity: "base" }));
    return { property: sorted("property"), tag: sorted("tag") };
  }

  private nodeStyleEntries(): NodeStyleEntry[] {
    return [
      ...Object.keys(this.kplexPlugin.settings.noteTypeStyles).map((name): NodeStyleEntry => ({ name, kind: "property" })),
      ...Object.keys(this.kplexPlugin.settings.tagNodeStyles).map((name): NodeStyleEntry => ({ name, kind: "tag" })),
    ].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }

  /** Manage both style families through one searchable list and the explicit-family editor. */
  private openNoteTypeStylesManager(): void {
    const owner = this.kplexPlugin.captureAppearanceOwner();
    const dialog = new NoteTypeStylesManagerModal(
      this.app,
      this.kplexPlugin.settings.noteTypeField,
      /** Refresh manager entries after a successful style save/delete. */ () => this.nodeStyleEntries(),
      /** Read the entry's own family even when the other family uses the same name. */
      (entry) => (entry.kind === "tag" ? this.kplexPlugin.settings.tagNodeStyles : this.kplexPlugin.settings.noteTypeStyles)[entry.name] ?? {},
      /** Existing entries retain their family; Add starts in property mode with a visible choice. */
      (entry, afterChange) => this.openNodeStyleEditor(entry?.kind ?? "property", entry?.name ?? null, afterChange),
      this.styleColorContext(owner), () => this.colorDialogs.delete(dialog),
    );
    this.colorDialogs.add(dialog); dialog.open();
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

  /** Edit/reset an ontology appearance override through the same durable owner as node styles. */
  private openOntologyLinkStyleEditor(fieldName: string, afterChange?: () => void): void {
    const owner = this.kplexPlugin.captureAppearanceOwner();
    const key = normalizeOntologyStyleKey(fieldName);
    const openingExists = this.ontologyLinkStyle(fieldName) !== undefined;
    const style = structuredClone(this.ontologyLinkStyle(fieldName) ?? {});
    const dialog = new OntologyLinkStyleModal(
      this.app,
      fieldName,
      style,
      this.kplexPlugin.settings.baseLinkStyle,
      async (nextStyle, isCurrent) => this.commitStyleChange(/** Preserve other ontology overrides while committing this normalized key. */ draft => {
        // Normalize keys on write so aliases/casing in the ontology definition do not create
        // duplicate style entries for the same semantic property.
        const current = draft.hierarchyLinkStyles[key] ?? draft.hierarchyLinkStyles[fieldName];
        if (openingExists && !current) throw new Error("Edited style no longer exists");
        const latest = current ?? {};
        const merged = mergeStyleDraft(style, nextStyle, latest, LINK_COLOR_FIELDS);
        for (const field of LINK_COLOR_FIELDS) if (!colorValuesEqual(style[field], merged[field])) requireNamedColor(merged[field], draft.colorPreferences);
        delete draft.hierarchyLinkStyles[fieldName];
        draft.hierarchyLinkStyles[key] = merged;
      }, isCurrent, owner, afterChange),
      async isCurrent => this.commitStyleChange(/** Remove only this field's two compatible spellings. */ draft => {
        delete draft.hierarchyLinkStyles[fieldName];
        delete draft.hierarchyLinkStyles[key];
      }, isCurrent, owner, afterChange),
      this.styleColorContext(owner), () => this.colorDialogs.delete(dialog),
    );
    this.colorDialogs.add(dialog); dialog.open();
  }

  private openOntologyLinkStylesManager(): void {
    const owner = this.kplexPlugin.captureAppearanceOwner();
    const dialog = new OntologyLinkStylesManagerModal(
      this.app,
      this.ontologyStyleFields(),
      (fieldName) => this.ontologyLinkStyle(fieldName),
      this.kplexPlugin.settings.baseLinkStyle,
      (fieldName, afterChange) => this.openOntologyLinkStyleEditor(fieldName, afterChange),
      this.styleColorContext(owner), () => this.colorDialogs.delete(dialog),
    );
    this.colorDialogs.add(dialog); dialog.open();
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
    const dialog = new LegacySettingsImportModal(this.app, this.kplexPlugin, /** Refresh the same native Settings owner after a durable import. */ () => this.update(), /** Release exactly this lifetime on close. */ () => this.colorDialogs.delete(dialog));
    this.colorDialogs.add(dialog); dialog.open();
  }

  /** Format the logical cache payload estimate without implying exact IndexedDB disk usage. */
  private formatIndexCacheSize(bytes: number | null, translate: Translator): string {
    if (bytes === null) return translate("indexing.cacheUnavailable");
    const units = ["B", "KB", "MB", "GB"];
    const unit = bytes <= 0 ? 0 : Math.min(3, Math.floor(Math.log(bytes) / Math.log(1024)));
    return `${(bytes / 1024 ** unit).toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
  }

  /** Build localized native settings and subpages, including shared persisted Plex visibility controls. */
  getSettingDefinitions(): SettingDefinitionItem<DeclarativeSettingKey>[] {
    const translate = createObsidianTranslator();
    const environment = readObsidianPresentationEnvironment(this.containerEl?.ownerDocument?.defaultView ?? undefined);
    const hoverModifier = formatShortcut({key: "", modifiers: ["alt"]}, {...environment, inputModes: {...environment.inputModes, keyboard: true}}, {
      shift: translate("shortcut.shift"), command: translate("shortcut.command"), control: translate("shortcut.control"),
      option: translate("shortcut.option"), alt: translate("shortcut.alt"),
    }, true, "") ?? translate("settings.hoverHighlight.modifier");
    const deleteCleanupDescription = createFragment();
    deleteCleanupDescription.createSpan({ text: translate("settings.deletion.removeOntologyLinks.help"), attr: { id: "kplex-remove-ontology-links-on-delete" } });
    const nodeStyles = this.nodeStyleEntries();
    const unassignedFields = this.kplexPlugin.index.unassignedOntologyFields();
    const ontologyStyleFields = this.ontologyStyleFields();
    const customOntologyStyleCount = ontologyStyleFields.filter((field) =>
      hasMeaningfulLinkOverride(this.ontologyLinkStyle(field.name), this.kplexPlugin.settings.baseLinkStyle)
    ).length;
    return this.bindThemeControls([
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
        name: translate("actions.settingsTitle"),
        desc: translate("actions.settingsHelp"),
        items: [this.actionSettingsController().getSettingDefinitions()],
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
              { name: translate("settings.hoverHighlight.name"), desc: translate("settings.hoverHighlight.help", {key: hoverModifier}), control: {type: "toggle", key: "hoverHighlightRequiresAlt"} },
              { name: translate("settings.areaOutline.name"), desc: translate("settings.areaOutline.help", {key: hoverModifier}), control: {type: "toggle", key: "areaOutlineRequiresAlt"} },
              { name: translate("settings.ui.animation.speed"), desc: translate("settings.ui.speed.multiplier.0.off.0.5.slow.1.normal.1.5.fast.2.very"), control: { type: "slider", key: "animationSpeed", min: 0, max: 2, step: 0.1 } },
              { name: translate("settings.ui.auto.fit.on.navigation"), control: { type: "toggle", key: "allowAutozoom" } },
              { name: translate("settings.ui.open.k.plex.in.a.pop.out.window"), desc: translate("settings.ui.when.k.plex.is.opened.and.no.k.plex.view.already.exists"), control: { type: "toggle", key: "startInPopout" } },
              { name: translate("settings.ui.confirm.before.deleting.files"), desc: translate("settings.ui.ask.before.a.node.context.menu.action.deletes.a.note.usi"), control: { type: "toggle", key: "confirmFileDelete" } },
              { name: translate("settings.deletion.removeOntologyLinks"), desc: deleteCleanupDescription, control: { type: "toggle", key: "removeOntologyLinksOnDelete" } },
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
              { type: "page", name: translate("layout.simplifiedTitle"), desc: translate("layout.simplifiedHelp"), items: this.lateralArrangementDefinitions() },
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
              { name: translate("filter.showCrossLinks"), desc: translate("filter.crossLinksHelp"), control: { type: "toggle", key: "showCrossLinks" } },
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
              { name: translate("settings.datePropertyRelations.name"), desc: translate("settings.datePropertyRelations.description"),
                control: { type: "dropdown", key: "datePropertyRelations", defaultValue: "parent", options: {
                  parent: translate("role.parent"), left: translate("role.friend"), child: translate("role.child"),
                  right: translate("role.challenger"), previous: translate("role.previous"), next: translate("role.next"),
                } } },
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
          ...this.appearanceThemeDefinitions(),
          {type: "page", name: translate("colors.colorsPage"), items: [
            {type: "page", name: translate("colors.standardColors"), items: [
              {name: translate("colors.palettePreview"), desc: translate("colors.palettePreviewHelp"), render: setting => this.mountStandardOverview(setting)},
              ...this.standardColorPages(),
            ]},
            {type: "page", name: translate("colors.semanticColors"), items: [{type: "group", heading: translate("colors.semanticColors"), items: SEMANTIC_COLOR_SLOTS.map(slot => this.colorAction(
              translate(`colors.semantic.${slot}`), () => [{label: translate(`colors.semantic.${slot}`), value: {kind: "theme", variable: `--kplex-semantic-${slot}`}, fallback: `var(${SEMANTIC_COLOR_DEFAULTS[slot]}, var(--text-normal))`}],
              () => this.openSemanticColor(slot), translate(`colors.semanticHelp.${slot}`),
            ))}]},
            {type: "group", items: [
              this.colorAction(translate("settings.ui.plex.background"), () => [{label: translate("settings.ui.plex.background"), value: this.kplexPlugin.settings.backgroundColor, fallback: NATIVE_CANVAS_FILL}], () => this.openCanvasColorEditor()),
              this.colorAction(translate("compass.title"), () => COMPASS_DIRECTIONS.map(/** Reuse the exact directional source chain shown inside its editor. */ direction => compassSwatchItem(translate(`compass.${direction}`), direction, this.kplexPlugin.settings.colorPreferences.compass.fills[direction])), () => {void this.openCompassSettings();}),
              {name: translate("colors.namedColors"), action: () => this.openColorPalette()},
              {name: translate("colors.adopt"), desc: translate("colors.adoptHelp"), action: () => this.openColorAdoption()},
            ]},
          ]},
          {type: "page", name: translate("colors.labelsPage"), items: [
            { name: translate("settings.ui.use.frontmatter.display.names"), desc: translate("settings.ui.use.the.first.non.empty.value.from.the.configured.name.f"), control: { type: "toggle", key: "renderAlias" } },
            { name: translate("settings.ui.name.fields"), desc: translate("settings.ui.comma.separated.frontmatter.fields.checked.in.order.text"), control: { type: "text", key: "nameFields" } },
            { name: translate("settings.ui.show.full.tag.names"), control: { type: "toggle", key: "showFullTagName" } },
          ]},
          {
            type: "page",
            name: translate("settings.ui.node.styling"),
            desc: translate("settings.ui.node.shape.details.property.based.colors.and.node.images"),
            items: [
              {
                type: "group",
                heading: translate("typography.sharedDefaults"),
                items: [
                  { name: translate("typography.deviceField", { device: translate("typography.sharedDefaults"), field: translate("settings.ui.base.font.size") }), desc: translate("settings.ui.base.font.size.help"), control: { type: "slider", key: "baseFontSize", ...TYPOGRAPHY_LIMITS.baseFontSize } },
                  { name: translate("typography.deviceField", { device: translate("typography.sharedDefaults"), field: translate("settings.ui.max.label.length") }), desc: translate("settings.ui.max.label.length.help"), control: { type: "slider", key: "baseNodeStyle.maxLabelLength", ...TYPOGRAPHY_LIMITS.maxLabelLength } },
                  { name: translate("typography.deviceField", { device: translate("typography.sharedDefaults"), field: translate("settings.ui.wrap.node.labels") }), desc: translate("settings.ui.wrap.node.labels.help"), control: { type: "toggle", key: "wrapNodeLabels" } },
                  { name: translate("typography.deviceField", { device: translate("typography.sharedDefaults"), field: translate("settings.ui.maximum.node.width") }), desc: translate("settings.ui.maximum.node.width.help"), control: { type: "slider", key: "baseNodeStyle.maxWidth", ...TYPOGRAPHY_LIMITS.maxWidth } },
                ],
              },
              ...this.typographyDefinitions(),
              {
                type: "group",
                heading: translate("settings.ui.node.appearance"),
                items: [
                  { name: translate("settings.ui.maximum.central.node.width"), desc: translate("settings.ui.maximum.central.node.width.help"), control: { type: "slider", key: "centralNodeStyle.maxWidth", min: 180, max: 1000, step: 10 } },
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
                  { name: translate("settings.ui.allowRemoteNodeImages"), desc: translate("settings.ui.allowRemoteNodeImages.help"), control: { type: "toggle", key: "allowRemoteNodeImages" } },
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
                  this.colorAction(translate("settings.ui.default.line.color"), () => this.standardSwatchItems("baseLinkStyle").filter(item => item.id === "strokeColor"), () => this.openStandardColor("baseLinkStyle", "strokeColor")),
                  { name: translate("settings.ui.default.line.width"), control: { type: "slider", key: "baseLinkStyle.strokeWidth", min: 0.5, max: 8, step: 0.5 } },
                  { name: translate("settings.ui.default.line.style"), control: { type: "dropdown", key: "baseLinkStyle.strokeStyle", defaultValue: "solid", options: { solid: translate("settings.ui.solid"), dashed: translate("settings.ui.dashed"), dotted: translate("settings.ui.dotted") } } },
                  { name: translate("settings.ui.start.arrowhead"), control: { type: "dropdown", key: "baseLinkStyle.startArrowHead", defaultValue: "none", options: arrowOptions(translate) } },
                  { name: translate("settings.ui.end.arrowhead"), control: { type: "dropdown", key: "baseLinkStyle.endArrowHead", defaultValue: "none", options: arrowOptions(translate) } },
                  { name: translate("settings.ui.show.relationship.labels"), control: { type: "toggle", key: "baseLinkStyle.showLabel" } },
                  this.colorAction(translate("settings.ui.relationship.label.color"), () => this.standardSwatchItems("baseLinkStyle").filter(item => item.id === "textColor"), () => this.openStandardColor("baseLinkStyle", "textColor")),
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
        name: translate("indexing.pageTitle"),
        desc: translate("indexing.pageHelp"),
        items: [
          {
            type: "group",
            heading: translate("indexing.strategy"),
            items: [
              {
                name: translate("indexing.mode"),
                desc: translate("indexing.modeHelp"),
                control: { type: "dropdown", key: "indexingMode", defaultValue: "on-demand", options: {
                  eager: translate("indexing.eager"), "on-demand": translate("indexing.onDemand"),
                } },
              },
              {
                name: translate("indexing.urls"),
                desc: translate("indexing.urlsHelp"),

              },
              {
                name: translate("indexing.throttle"),
                desc: translate("indexing.throttleHelp"),
                control: { type: "dropdown", key: "indexingThrottle", defaultValue: "responsive", options: {
                  responsive: translate("indexing.throttleResponsive"),
                  balanced: translate("indexing.throttleBalanced"),
                  faster: translate("indexing.throttleFaster"),
                } },
              },
            ],
          },
          {
            type: "group",
            heading: translate("indexing.cache"),
            items: [{
              name: translate("indexing.purgeAction"),
              // Native declarative rows render only when their page opens: never scan storage
              // while constructing definitions or rendering the root settings list.
              render: /** Estimate only the displayed cache row and ignore completion after it is removed. */ setting => {
                let active = true;
                let purged = false;
                setting.setDesc(translate("indexing.cacheHelp", { size: translate("indexing.cacheCalculating") }));
                setting.addButton(/** Open explicit confirmation; the index owner alone cancels work and deletes its database. */ button => {
                  button.setButtonText(translate("indexing.purgeButton")).setDestructive()
                    .onClick(/** A confirmed purge updates only a still-mounted settings row. */ () => {
                      new PurgeIndexCacheModal(this.app,
                        () => this.kplexPlugin.index.purgePersistentIndexCache(),
                        /** A successful purge supersedes any estimate that was already in flight. */ () => {
                          purged = true;
                          if (active) setting.setDesc(translate("indexing.cacheHelp", { size: this.formatIndexCacheSize(0, translate) }));
                        }).open();
                    });
                });
                void this.kplexPlugin.index.estimatePersistentIndexBytes().then(
                  /** Reflect successful estimates only in the exact row that requested them. */ bytes => {
                    if (active && !purged) setting.setDesc(translate("indexing.cacheHelp", { size: this.formatIndexCacheSize(bytes, translate) }));
                  },
                  /** Storage failure is an unavailable estimate, not a zero-byte cache. */ () => {
                    if (active && !purged) setting.setDesc(translate("indexing.cacheHelp", { size: translate("indexing.cacheUnavailable") }));
                  });
                return /** Fence asynchronous estimates when Obsidian tears down this row. */ () => { active = false; };
              },
            }],
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
            heading: translate("settings.excalidrawCompatibility"),
            items: [{
              name: translate("settings.excalidrawFitOnNodeOpen"),
              desc: translate("settings.excalidrawFitOnNodeOpenHelp"),
              control: { type: "toggle", key: "excalidrawFitOnNodeOpen" },
            }],
          },
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
    ]);
  }

  /** Mount only appearance scalars with an activation-bound callback, including global-search rows. */
  private bindThemeControls(items: SettingDefinitionItem<DeclarativeSettingKey>[]): SettingDefinitionItem<DeclarativeSettingKey>[] {
    return items.map(/** Global workflow controls retain their existing native declarative behavior. */ item => {
      if ("type" in item && item.type === "page") return {...item, items: item.items && this.bindThemeControls(item.items)};
      if ("type" in item) return {...item, items: item.items?.map(/** Groups contain only settings and pages, preserving native search typing. */ child =>
        "type" in child ? {...child, items: child.items && this.bindThemeControls(child.items)} : this.bindThemeScalar(child))};
      return this.bindThemeScalar(item);
    });
  }

  /** Bind the finite theme-owned native scalar types without changing global control ownership. */
  private bindThemeScalar(item: SettingDefinition<DeclarativeSettingKey>): SettingDefinition<DeclarativeSettingKey> {
      if (!("control" in item) || !item.control) return item;
      const control = item.control;
      if (!/^(baseNodeStyle\.|centralNodeStyle\.|baseLinkStyle\.|backgroundColorHex$)/.test(control.key)
        || (control.type !== "slider" && control.type !== "toggle" && control.type !== "dropdown")) return item;
      return {name: item.name, desc: item.desc, searchable: item.searchable, visible: item.visible, render: /** Recreate a scalar on activation; retired handlers cannot save into its replacement. */ (setting: Setting) => {
        let active = true, owner = this.kplexPlugin.captureAppearanceOwner(), generation = 0;
        let mounted: {pending: number; refresh: () => void} | null = null;
        /** The scalar has no unsubmitted draft: a switch replaces its native control with the new effective value. */
        const mount = (): void => {
          for (const input of Array.from(setting.controlEl.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input,select"))) input.disabled = true;
          setting.clear(); owner = this.kplexPlugin.captureAppearanceOwner();
          const opening = owner, mount = ++generation, state = {pending: 0, refresh: (): void => {}}; mounted = state;
          const disabled = !!this.kplexPlugin.settings.appearanceThemesFuture || !!this.kplexPlugin.settings.colorPreferencesFuture
            || (typeof control.disabled === "function" ? control.disabled() : !!control.disabled);
          /** Capture at mount, never infer ownership from the selected theme when a delayed native event arrives. */
          const change = async (value: string | number | boolean): Promise<void> => {
            if (!active || mount !== generation || disabled || !this.kplexPlugin.isAppearanceOwnerCurrent(opening)) return;
            state.pending++;
            try {await this.setControlValue(control.key, value, opening);}
            catch (error) {console.error("K-Plex appearance control was not saved", error); new Notice(this.kplexPlugin.translator("styles.operation.notSaved"));}
            finally {state.pending--; if (active && mounted === state && !state.pending) state.refresh();}
          };
          const value = this.getControlValue(control.key) ?? control.defaultValue;
          if (control.type === "slider") setting.addSlider(/** Retain native bounds, tooltip and keyboard gestures. */ slider => {
            slider.setLimits(control.min, control.max, control.step).setValue(Number(value)).setDynamicTooltip().setDisabled(disabled).onChange(change);
            slider.sliderEl.setAttribute("aria-label", item.name);
            state.refresh = /** Same-activation edits update peers without replacing a live slider or emitting another change. */ () => {slider.setValue(Number(this.getControlValue(control.key) ?? control.defaultValue));};
          });
          else if (control.type === "toggle") setting.addToggle(/** Initial seeding never submits a save. */ toggle => {
            toggle.setValue(Boolean(value)).setDisabled(disabled).onChange(change); toggle.toggleEl.setAttribute("aria-label", item.name);
            state.refresh = /** Restore the committed value after another surface or a failed immediate save. */ () => {toggle.setValue(Boolean(this.getControlValue(control.key) ?? control.defaultValue));};
          });
          else setting.addDropdown(/** Reuse the original finite choices and native select. */ dropdown => {
            dropdown.addOptions(control.options).setValue(typeof value === "string" ? value : "").setDisabled(disabled).onChange(change); dropdown.selectEl.setAttribute("aria-label", item.name);
            state.refresh = /** Preserve native choices while reflecting the current committed field. */ () => {const value = this.getControlValue(control.key) ?? control.defaultValue; dropdown.setValue(typeof value === "string" ? value : "");};
          });
        };
        mount();
        const release = this.subscribeThemeRow(setting, /** Activation or native adoption replaces this immediate scalar's handlers. */ migrated => {
          if (active && setting.settingEl.isConnected && (migrated || !this.kplexPlugin.isAppearanceOwnerCurrent(owner))) mount();
          else if (active && mounted && !mounted.pending) mounted.refresh();
        }, /** A closed/migrated settings window cannot retain scalar handlers. */ () => {active = false;});
        return release;
      }};
  }

  /** Share the durable appearance writer and truthful refresh recovery for native scalar controls. */
  private async commitAppearanceControl(edit: (draft: StyleSettingsDraft) => void, owner?: AppearanceOwner): Promise<void> {
    const result = await this.kplexPlugin.updateStyleSettings(edit, owner ?? this.kplexPlugin.captureAppearanceOwner());
    if (result.refreshPending) new Notice(this.kplexPlugin.translator("styles.operation.savedRefreshPending"));
  }

  /** Parse permanently scope-qualified device control keys; global-search rows never depend on a selected editor scope. */
  private typographyKey(key: string): { device: PersistedLayoutDeviceClass; field: TypographyField } | undefined {
    const parts = key.split(".");
    const device = parts[1];
    const field = parts[2];
    if (parts.length !== 3 || parts[0] !== "typography" || (device !== "desktop" && device !== "tablet" && device !== "mobile")) return;
    if (field !== "baseFontSize" && field !== "maxLabelLength" && field !== "maxWidth" && field !== "wrapNodeLabels") return;
    return { device, field };
  }

  /** Native device sections render only their own rows, preserve inherited values and release presentation subscriptions on teardown. */
  private typographyDefinitions(): SettingDefinitionItem<DeclarativeSettingKey>[] {
    const translate = this.kplexPlugin.translator;
    const names = {
      baseFontSize: translate("settings.ui.base.font.size"), maxLabelLength: translate("settings.ui.max.label.length"),
      maxWidth: translate("settings.ui.maximum.node.width"), wrapNodeLabels: translate("settings.ui.wrap.node.labels"),
    };
    return (["desktop", "tablet", "mobile"] as const).map(/** Capture each device once for normal pages, global search and multiple settings windows. */ device => ({
      type: "page", name: translate("typography.deviceTitle", { device: translate(`typography.${device}`) }),
      desc: translate("typography.deviceHelp"),
      items: [
        ...TYPOGRAPHY_FIELDS.map(/** Expose a scope-qualified searchable scalar row with explicit inheritance and selective reset. */ field => ({
          name: translate("typography.deviceField", { device: translate(`typography.${device}`), field: names[field] }),
          desc: translate(field === "maxWidth" ? "typography.deviceWidthHelp" : "typography.deviceHelp"),
          render: /** Mount native controls without first-render writes, and update same-scope peers after live edits/reset. */ (setting: Setting) => {
            const key = `typography.${device}.${field}`;
            let refreshControl: () => void;
            if (field === "wrapNodeLabels") {
              setting.addToggle(/** Set the initial inherited value before installing the user-change callback. */ toggle => {
                toggle.setValue(Boolean(this.getControlValue(key))).onChange(/** Route only actual user input to the shared scalar device writer. */ value => { void this.setControlValue(key, value); });
                refreshControl = /** Synchronize a mounted toggle without invoking its change handler. */ () => { toggle.setValue(Boolean(this.getControlValue(key))); };
              });
            } else {
              const limits = TYPOGRAPHY_LIMITS[field];
              setting.addSlider(/** Reuse canonical shared/device bounds and native slider affordances. */ slider => {
                slider.setLimits(limits.min, limits.max, limits.step).setValue(Number(this.getControlValue(key))).setDynamicTooltip()
                  .onChange(/** Persist this captured device rather than a mutable active settings scope. */ value => { void this.setControlValue(key, value); });
                refreshControl = /** Keep mounted rows current when another surface changes this device. */ () => { slider.setValue(Number(this.getControlValue(key))); };
              });
            }
            setting.addExtraButton(/** Delete only this supported override, preserving the other values/devices. */ button => {
              button.setIcon("rotate-ccw").setTooltip(translate("typography.resetField"))
                .onClick(/** Restore inheritance through canonical persistence. */ () => { void this.kplexPlugin.resetTypographyOverride(device, field); });
            });
            /** Explain state independently of the displayed number, including equal-to-default customization. */
            const refresh = (): void => {
              const customized = Object.keys(this.kplexPlugin.settings.typographyProfiles[device] ?? {}).includes(field);
              setting.setDesc(`${field === "maxWidth" ? `${translate("typography.deviceWidthHelp")} ` : ""}${translate(customized ? "typography.customized" : "typography.inherited")}`);
              refreshControl?.();
            };
            refresh();
            return this.kplexPlugin.index.subscribePresentation(refresh);
          },
        })),
        { name: translate("typography.deviceReset", { device: translate(`typography.${device}`) }),
          desc: translate("typography.resetHelp"), action: /** Clear only this device's typography fields. */ () => { void this.kplexPlugin.resetTypographyOverride(device); } },
      ],
    }));
  }

  /** Recognize only the six visible arrangement scopes; pop-outs inherit the matching main tab. */
  private lateralArrangementKey(key: string): string | undefined {
    const parts = key.split(".");
    if (parts.length !== 4 || parts[0] !== "layout" || parts[3] !== "lateralArrangement") return;
    const [, device, surface] = parts;
    if ((device !== "desktop" && device !== "tablet" && device !== "mobile")
      || (surface !== "leaf" && surface !== "sidepanel")) return;
    return `${device}:${surface}`;
  }

  /** Reuse native declarative toggles with captured device/surface identities, including Settings search. */
  private lateralArrangementDefinitions(): SettingDefinitionItem<DeclarativeSettingKey>[] {
    const translate = this.kplexPlugin.translator;
    return (["desktop", "tablet", "mobile"] as const).flatMap(/** Keep all device preferences editable from any host device. */ device =>
      (["leaf", "sidepanel"] as const).map(/** Each row has an explicit scope rather than following the active Plex. */ surface => ({
        name: translate("layout.arrangementScope", { device: translate(`typography.${device}`),
          surface: translate(surface === "leaf" ? "layout.mainTab" : "layout.sidepanel") }),
        control: { type: "toggle", key: `layout.${device}.${surface}.lateralArrangement` as const },
      })));
  }

  /** Read shared controls or device overrides without turning an inherited value into a saved customization. */
  getControlValue(key: string): unknown {
    const arrangementKey = this.lateralArrangementKey(key);
    if (arrangementKey) return this.kplexPlugin.settings.layoutProfiles[arrangementKey]?.lateralArrangement === "left";
    const typography = this.typographyKey(key);
    if (typography) {
      const settings = this.kplexPlugin.settings;
      return effectiveTypography({ baseFontSize: settings.baseFontSize, maxLabelLength: settings.baseNodeStyle.maxLabelLength ?? 30,
        maxWidth: settings.baseNodeStyle.maxWidth ?? 286, wrapNodeLabels: settings.wrapNodeLabels }, settings.typographyProfiles[typography.device])[typography.field];
    }
    const hierarchyKey = HIERARCHY_KEY_MAP[key];
    if (hierarchyKey) return csv(this.kplexPlugin.settings.hierarchy[hierarchyKey]);
    if (key === "excludeFilepathsCsv") return csv(this.kplexPlugin.settings.excludeFilepaths);
    if (key === "backgroundColorHex") return sixHex(this.kplexPlugin.settings.backgroundColor).toLowerCase();
    if (key === "baseLinkStyle.strokeColorHex") return sixHex(this.kplexPlugin.settings.baseLinkStyle.strokeColor, "#696969").toLowerCase();
    if (key === "baseLinkStyle.strokeWidth") return this.kplexPlugin.settings.baseLinkStyle.strokeWidth ?? DEFAULT_LINK_STYLE.strokeWidth ?? 1;
    if (key === "baseLinkStyle.strokeStyle") return this.kplexPlugin.settings.baseLinkStyle.strokeStyle ?? "solid";
    if (key === "baseLinkStyle.startArrowHead") return this.kplexPlugin.settings.baseLinkStyle.startArrowHead ?? "none";
    if (key === "baseLinkStyle.endArrowHead") return this.kplexPlugin.settings.baseLinkStyle.endArrowHead ?? "none";
    if (key === "baseLinkStyle.showLabel") return this.kplexPlugin.settings.baseLinkStyle.showLabel ?? false;
    if (key === "baseLinkStyle.textColorHex") return sixHex(this.kplexPlugin.settings.baseLinkStyle.textColor, "#ffffff").toLowerCase();
    if (key === "baseLinkStyle.fontSize") return this.kplexPlugin.settings.baseLinkStyle.fontSize ?? DEFAULT_LINK_STYLE.fontSize ?? 10;
    if (key === "baseNodeStyle.gateRadius") return this.kplexPlugin.settings.baseNodeStyle.gateRadius ?? DEFAULT_NODE_STYLE.gateRadius ?? 5;
    if (key === "baseNodeStyle.maxLabelLength") return this.kplexPlugin.settings.baseNodeStyle.maxLabelLength ?? DEFAULT_NODE_STYLE.maxLabelLength ?? 30;
    if (key === "baseNodeStyle.maxWidth") return this.kplexPlugin.settings.baseNodeStyle.maxWidth ?? DEFAULT_NODE_STYLE.maxWidth ?? 286;
    if (key === "centralNodeStyle.maxWidth") return this.kplexPlugin.settings.centralNodeStyle.maxWidth ?? DEFAULT_SETTINGS.centralNodeStyle.maxWidth ?? 370;
    return this.kplexPlugin.settings[key as keyof KplexSettings];
  }

  /** Apply every declarative control through the plugin's shared settings-impact classifier. */
  async setControlValue(key: string, value: unknown, owner?: AppearanceOwner): Promise<void> {
    const arrangementKey = this.lateralArrangementKey(key);
    if (arrangementKey) {
      const current = this.kplexPlugin.settings.layoutProfiles[arrangementKey] ?? DEFAULT_LAYOUT_PROFILES[arrangementKey];
      this.kplexPlugin.settings.layoutProfiles = { ...this.kplexPlugin.settings.layoutProfiles,
        [arrangementKey]: { ...current, lateralArrangement: value === true ? "left" : "split" } };
      await this.kplexPlugin.saveSettings(false);
      return;
    }
    const typography = this.typographyKey(key);
    if (typography) {
      const scalar = sanitizeTypographyValue(typography.field, value);
      if (scalar !== undefined) await this.kplexPlugin.updateTypographyOverride(typography.device, { [typography.field]: scalar });
      return;
    }
    if (key === "indexingThrottle") {
      this.kplexPlugin.settings.indexingThrottle = sanitizeIndexingThrottle(value);
      // The scheduler reads this preference live; saving must not invalidate semantic caches.
      await this.kplexPlugin.saveSettings(false, false);
      return;
    }
    if (key === "removeOntologyLinksOnDelete") {
      this.kplexPlugin.settings.removeOntologyLinksOnDelete = value === true;
      // This preference only supplies defaults to the next deletion preview; it does not
      // change ontology interpretation, source authority or the currently displayed graph.
      await this.kplexPlugin.saveSettings(false, false);
      return;
    }
    if (key === "indexingMode" || key === "urlIndexingMode") {
      if (key === "indexingMode") this.kplexPlugin.settings.indexingMode = value === "on-demand" ? "on-demand" : "eager";
      else this.kplexPlugin.settings.urlIndexingMode = "background";
      // Strategy changes apply at restart and must not trigger live semantic reconstruction.
      await this.kplexPlugin.saveSettings(false, false);
      return;
    }
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
      await this.commitAppearanceControl(/** Commit this captured control’s finite scalar through the theme owner. */ draft => {draft.backgroundColor = `${hex}ff`;}, owner);
      return;
    }

    if (key === "baseLinkStyle.strokeColorHex") {
      await this.commitAppearanceControl(/** Commit this captured control’s finite scalar through the theme owner. */ draft => {draft.baseLinkStyle.strokeColor = eightHex(String(value));}, owner);
      return;
    }
    if (key === "baseLinkStyle.strokeWidth") {
      await this.commitAppearanceControl(/** Commit this captured control’s finite scalar through the theme owner. */ draft => {draft.baseLinkStyle.strokeWidth = Math.max(0.5, Math.min(8, Number(value) || 1));}, owner);
      return;
    }
    if (key === "baseLinkStyle.strokeStyle") {
      const next = String(value);
      await this.commitAppearanceControl(/** Commit this captured control’s finite scalar through the theme owner. */ draft => {draft.baseLinkStyle.strokeStyle = next === "dashed" || next === "dotted" ? next : "solid";}, owner);
      return;
    }
    if (key === "baseLinkStyle.startArrowHead") {
      await this.commitAppearanceControl(/** Commit this captured control’s finite scalar through the theme owner. */ draft => {draft.baseLinkStyle.startArrowHead = String(value) as Arrowhead;}, owner);
      return;
    }
    if (key === "baseLinkStyle.endArrowHead") {
      await this.commitAppearanceControl(/** Commit this captured control’s finite scalar through the theme owner. */ draft => {draft.baseLinkStyle.endArrowHead = String(value) as Arrowhead;}, owner);
      return;
    }
    if (key === "baseLinkStyle.showLabel") {
      await this.commitAppearanceControl(/** Commit this captured control’s finite scalar through the theme owner. */ draft => {draft.baseLinkStyle.showLabel = Boolean(value);}, owner);
      return;
    }
    if (key === "baseLinkStyle.textColorHex") {
      await this.commitAppearanceControl(/** Commit this captured control’s finite scalar through the theme owner. */ draft => {draft.baseLinkStyle.textColor = eightHex(String(value));}, owner);
      return;
    }
    if (key === "baseLinkStyle.fontSize") {
      await this.commitAppearanceControl(/** Commit this captured control’s finite scalar through the theme owner. */ draft => {draft.baseLinkStyle.fontSize = Math.max(7, Math.min(24, Number(value) || 10));}, owner);
      return;
    }
    if (key === "baseNodeStyle.gateRadius") {
      await this.commitAppearanceControl(/** Commit this captured control’s finite scalar through the theme owner. */ draft => {draft.baseNodeStyle.gateRadius = Number(value);}, owner);
      return;
    }
    if (key === "baseNodeStyle.maxLabelLength") {
      await this.commitAppearanceControl(/** Commit this captured control’s finite scalar through the theme owner. */ draft => {draft.baseNodeStyle.maxLabelLength = Math.max(8, Math.min(120, Math.round(Number(value) || 30)));}, owner);
      return;
    }
    if (key === "baseFontSize") {
      this.kplexPlugin.settings.baseFontSize = Math.max(8, Math.min(28, Number(value) || DEFAULT_SETTINGS.baseFontSize));
      await this.kplexPlugin.saveSettings(false);
      return;
    }
    if (key === "baseNodeStyle.maxWidth") {
      await this.commitAppearanceControl(/** Commit this captured control’s finite scalar through the theme owner. */ draft => {draft.baseNodeStyle.maxWidth = Math.max(160, Math.min(800, Math.round(Number(value) || 286)));}, owner);
      return;
    }
    if (key === "centralNodeStyle.maxWidth") {
      await this.commitAppearanceControl(/** Commit this captured control’s finite scalar through the theme owner. */ draft => {draft.centralNodeStyle.maxWidth = Math.max(180, Math.min(1000, Math.round(Number(value) || 370)));}, owner);
      return;
    }

    if (STYLE_SETTINGS_KEYS.some(/** Generic appearance controls still use the same finite queue and owner fence. */ field => field === key)) {
      await this.commitAppearanceControl(/** Never assign an appearance root before its durable commit. */ draft => {Object.assign(draft, {[key]: structuredClone(value)});}, owner);
      return;
    }
    const settingKey = key as keyof KplexSettings;
    (this.kplexPlugin.settings as unknown as Record<string, unknown>)[settingKey] = value;
    await this.kplexPlugin.saveSettings();
  }
}
