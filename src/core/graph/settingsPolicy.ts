/**
 * Settings effects and snapshot-policy compatibility. This portable owner compares immutable,
 * allowlisted projections, never entire mutable plugin settings. Encoded values remain private;
 * only built-in key names may cross the diagnostic boundary. Array order/multiplicity is retained for the owning policy.
 */
import { sanitizeDatePropertyRelations, type DatePropertyRelations, type SemanticHierarchy } from "./settings";

export const HIERARCHY_ROLES = ["hidden", "parents", "children", "leftFriends", "rightFriends", "previous", "next"] as const;
export const PRESENTATION_KEYS = [
  "showFullTagName", "noteTypeField", "primaryTagField", "tagStyleList", "renderAlias", "nameFields", "nodeTitleScript",
  "baseNodeStyle", "centralNodeStyle", "inferredNodeStyle", "virtualNodeStyle", "siblingNodeStyle", "urlNodeStyle",
  "attachmentNodeStyle", "folderNodeStyle", "tagNodeStyle", "tagNodeStyles", "noteTypeStyles", "displayAllStylePrefixes",
  "baseLinkStyle", "inferredLinkStyle", "folderLinkStyle", "tagLinkStyle", "hierarchyLinkStyles", "attachmentImageDisplay",
] as const;
const SEMANTIC_KEYS = ["inferAllLinksAsFriends", "inverseInfer", "thumbnailProperty", "nodeImageProperty", "datePropertyRelations"] as const;
const VIEW_KEYS = [
  "hierarchy.exclusions", "showFolderNodes", "showTagNodes", "showPageNodes", "showAttachments", "showURLNodes",
  "showVirtualNodes", "showInferredNodes", "renderSiblings", "nodeSortOrder", "graphLenses", "excludeFilepaths",
  "backgroundColor", "connectorStyle", "graphDepth", "compactingFactor", "horizontalCompactingFactor", "compactView", "maxItemCount",
  "minLinkLength", "inverseArrowDirection", "showNeighborCount", "wrapNodeLabels", "baseFontSize", "siblingRelativeSize", "crossLinkOpacity",
  "applyPowerFilter", "parentColumns", "childColumns", "friendMaxHeight", "siblingMaxHeight", "parentMaxHeight",
  "childMaxHeight", "animationSpeed", "layoutProfiles", "allowAutozoom", "embedCentralNode", "centerEmbedWidth", "centerEmbedHeight",
] as const;
export const SETTING_DIAGNOSTIC_KEYS = [
  ...HIERARCHY_ROLES.map((role) => `hierarchy.${role}` as const), ...SEMANTIC_KEYS,
  ...PRESENTATION_KEYS, "baseNodeStyle.maxLabelLength", ...VIEW_KEYS,
] as const;
export type SettingDiagnosticKey = typeof SETTING_DIAGNOSTIC_KEYS[number];

/** Narrow structural input: K-Plex supplies these fields without leaking its host-owned type. */
export type SettingsPolicyInput = Readonly<{
  hierarchy: SemanticHierarchy;
  inferAllLinksAsFriends: boolean;
  inverseInfer: boolean;
  datePropertyRelations?: DatePropertyRelations;
  thumbnailProperty?: string;
  nodeImageProperty?: string;
  showFullTagName: boolean;
  noteTypeField: string;
  primaryTagField: string;
  tagStyleList: readonly string[];
  baseNodeStyle: Readonly<{ maxLabelLength?: number }>;
}> & Partial<Readonly<Record<Exclude<typeof PRESENTATION_KEYS[number], "baseNodeStyle" | "tagStyleList" | "noteTypeField" | "primaryTagField" | "showFullTagName">, unknown>>>;

export type SettingsPolicy = Readonly<{
  /** Private, canonical field encodings, independent of subsequent in-place UI mutations. */
  values: Readonly<Partial<Record<SettingDiagnosticKey, string>>>;
}>;
export type SettingsEffects = Readonly<{
  semanticInvalidation: boolean;
  presentationFacets: boolean;
  searchTerms: boolean;
  nodeVisuals: boolean;
  render: boolean;
  changedKeys: readonly SettingDiagnosticKey[];
}>;

/** Canonicalize object keys only; meaningful array order and repeated entries stay intact. */
function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]));
}

/** Restrict runtime JSON decoding and diagnostic inspection to plain object-shaped values. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Freeze one field's comparison value without retaining mutable caller-owned arrays/objects. */
function encode(value: unknown): string {
  return JSON.stringify(canonicalValue(value)) ?? "undefined";
}

/** Pick only semantic roles and suppression inputs; discovery exclusions are not compiled policy. */
function semanticValues(settings: SettingsPolicyInput): Record<string, unknown> {
  return {
    hierarchy: Object.fromEntries(HIERARCHY_ROLES.map((role) => [role, [...settings.hierarchy[role]]])),
    inferAllLinksAsFriends: settings.inferAllLinksAsFriends,
    inverseInfer: settings.inverseInfer,
    datePropertyRelations: sanitizeDatePropertyRelations(settings.datePropertyRelations),
    thumbnailProperty: settings.thumbnailProperty ?? "thumbnail",
    nodeImageProperty: settings.nodeImageProperty ?? "node-image",
  };
}

/** Capture before the next mutation. The caller may continue mutating its original settings. */
export function captureSettingsPolicy(settings: SettingsPolicyInput): SettingsPolicy {
  const values: Partial<Record<SettingDiagnosticKey, string>> = {};
  for (const role of HIERARCHY_ROLES) values[`hierarchy.${role}`] = encode(settings.hierarchy[role]);
  const semantic = semanticValues(settings);
  for (const key of SEMANTIC_KEYS) values[key] = encode(semantic[key]);
  for (const key of PRESENTATION_KEYS) values[key] = encode(settings[key]);
  values["baseNodeStyle.maxLabelLength"] = encode(settings.baseNodeStyle.maxLabelLength ?? 30);
  const record: object = settings;
  for (const key of VIEW_KEYS) {
    values[key] = encode(key === "hierarchy.exclusions" ? settings.hierarchy.exclusions :
      Object.prototype.hasOwnProperty.call(record, key) ? Reflect.get(record, key) : undefined);
  }
  return { values };
}

/** Classify one named difference set for both runtime settings and saved-signature comparison. */
function effectsForKeys(changedKeys: readonly SettingDiagnosticKey[]): SettingsEffects {
  const has = (...keys: readonly SettingDiagnosticKey[]): boolean => keys.some((key) => changedKeys.includes(key));
  return {
    semanticInvalidation: changedKeys.some((key) => HIERARCHY_ROLES.some((role) => key === `hierarchy.${role}`)) || has(...SEMANTIC_KEYS),
    presentationFacets: has("showFullTagName", "noteTypeField", "primaryTagField", "tagStyleList", "baseNodeStyle.maxLabelLength"),
    searchTerms: has("showFullTagName", "renderAlias", "nameFields", "nodeTitleScript"),
    nodeVisuals: has("thumbnailProperty", "nodeImageProperty", "attachmentImageDisplay"),
    render: changedKeys.length > 0,
    changedKeys,
  };
}

/** Compare immutable projections, including changes made through managers or legacy imports. */
export function classifySettingsChange(before: SettingsPolicy, after: SettingsPolicy): SettingsEffects {
  return effectsForKeys(SETTING_DIAGNOSTIC_KEYS.filter((key) => before.values[key] !== after.values[key]));
}

/** Filter twice at trust boundaries; custom field names and values must never be exported. */
export function sanitizeChangedSettingKeys(value: unknown): SettingDiagnosticKey[] {
  if (!Array.isArray(value)) return [];
  return SETTING_DIAGNOSTIC_KEYS.filter((key) => value.includes(key));
}

/** Write signature format 4 for Date fallback roles; neutral source and snapshot schemas stay intact. */
export function encodeIndexSettingsSignature(settings: SettingsPolicyInput): string {
  return JSON.stringify({ schema: 1, signatureVersion: 4, ...semanticValues(settings) });
}

export type SignatureCompatibility = Readonly<{
  compatible: boolean;
  reason: "compatible" | "signature-format-changed" | "semantic-settings-changed" | "signature-format-unknown";
  changedKeys: readonly SettingDiagnosticKey[];
  presentationChanged: boolean;
  /** Private upgrade input, never a diagnostic field. The host must reconcile the retired exclusion. */
  retiredFilepath?: string;
}>;

/** Validate recognized string-list fields without accepting unknown future signature shapes. */
function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/** Recognize old inference/mode signatures as semantic mismatches; only current v4 roles may reuse graphs. */
export function compareIndexSettingsSignature(raw: unknown, current: SettingsPolicyInput): SignatureCompatibility {
  const unknown: SignatureCompatibility = { compatible: false, reason: "signature-format-unknown", changedKeys: [], presentationChanged: false };
  if (typeof raw !== "string") return unknown;
  let saved: unknown;
  try { saved = JSON.parse(raw); } catch { return unknown; }
  if (!isRecord(saved) || saved.schema !== 1 || !isRecord(saved.hierarchy)) return unknown;
  const legacy = saved.signatureVersion === undefined;
  if (!legacy && saved.signatureVersion !== 2 && saved.signatureVersion !== 3 && saved.signatureVersion !== 4) return unknown;
  const common = ["schema", "hierarchy", "inferAllLinksAsFriends", "inverseInfer"];
  const legacyFields = ["showFullTagName", "noteTypeField", "primaryTagField", "tagStyleList", "maxLabelLength", "excalibrainFilepath"];
  const allowed = legacy ? [...common, ...legacyFields] : [...common, "signatureVersion", "thumbnailProperty", "nodeImageProperty",
    ...(saved.signatureVersion === 3 || saved.signatureVersion === 4 ? ["datePropertyRelations"] : [])];
  if (Object.keys(saved).some((key) => !allowed.includes(key))) return unknown;
  const hierarchy = saved.hierarchy;
  if (Object.keys(hierarchy).some((key) => ![...HIERARCHY_ROLES, "exclusions", "friends"].includes(key))) return unknown;
  if (HIERARCHY_ROLES.some((role) => !isStringList(role === "leftFriends" ? hierarchy.leftFriends ?? hierarchy.friends : hierarchy[role]))) return unknown;
  if (hierarchy.exclusions !== undefined && !isStringList(hierarchy.exclusions)) return unknown;
  if (hierarchy.friends !== undefined && !isStringList(hierarchy.friends)) return unknown;
  if (typeof saved.inferAllLinksAsFriends !== "boolean" || typeof saved.inverseInfer !== "boolean") return unknown;
  if (legacy) {
    if (typeof saved.showFullTagName !== "boolean" || typeof saved.noteTypeField !== "string" ||
      typeof saved.primaryTagField !== "string" || !isStringList(saved.tagStyleList) ||
      typeof saved.maxLabelLength !== "number" || !Number.isFinite(saved.maxLabelLength) ||
      (saved.excalibrainFilepath !== undefined && typeof saved.excalibrainFilepath !== "string")) return unknown;
  } else if (typeof saved.thumbnailProperty !== "string" || typeof saved.nodeImageProperty !== "string") return unknown;
  if (saved.signatureVersion === 3 && saved.datePropertyRelations !== "inferred" && saved.datePropertyRelations !== "ontology") return unknown;
  if (saved.signatureVersion === 4 && saved.datePropertyRelations !== sanitizeDatePropertyRelations(saved.datePropertyRelations)) return unknown;
  const currentPolicy = captureSettingsPolicy(current);
  const oldValues = { ...currentPolicy.values };
  for (const role of HIERARCHY_ROLES) oldValues[`hierarchy.${role}`] = encode(role === "leftFriends" ? hierarchy.leftFriends ?? hierarchy.friends : hierarchy[role]);
  for (const key of SEMANTIC_KEYS) oldValues[key] = encode(key === "datePropertyRelations"
    // Historical mode values must stay distinct from every current role, never sanitize to Parent.
    ? saved.signatureVersion === 4 ? saved[key] : saved.signatureVersion === 3 ? saved[key] : "inferred"
    : saved[key] ?? (key === "thumbnailProperty" ? "thumbnail" : "node-image"));
  if (legacy) {
    for (const key of ["showFullTagName", "noteTypeField", "primaryTagField", "tagStyleList"] as const) oldValues[key] = encode(saved[key]);
    oldValues["baseNodeStyle.maxLabelLength"] = encode(saved.maxLabelLength);
  }
  const effects = classifySettingsChange({ values: oldValues }, currentPolicy);
  return {
    compatible: !effects.semanticInvalidation,
    reason: effects.semanticInvalidation ? "semantic-settings-changed" : legacy ? "signature-format-changed" : "compatible",
    changedKeys: effects.changedKeys,
    presentationChanged: legacy && effects.presentationFacets,
    ...(legacy && typeof saved.excalibrainFilepath === "string" && saved.excalibrainFilepath ? { retiredFilepath: saved.excalibrainFilepath } : {}),
  };
}
