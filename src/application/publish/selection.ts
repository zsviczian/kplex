/** Private publication settings and review planning. Native file objects never enter these contracts. */
import {normalizeFieldName} from "../../core/contracts/fieldName";
import type {GraphNodeView} from "../../core/graph/model";
import {
  compileGraphPredicate, GraphPredicateEngine, predicateCall, predicateLiteral, predicateProperty,
  type CompiledGraphPredicate,
} from "../../core/plex/predicate";
import {tryParseGraphPredicateExpression} from "../../core/plex/predicateParser";

export const DEFAULT_PUBLISH_UUID_PROPERTY = "kplex-id";
export const MAX_PUBLISH_NOTES = 10_000;
export const MAX_PUBLISH_INVENTORY = 100_000;

export type PublishRule = Readonly<
  | {kind: "note"; path: string}
  | {kind: "folder"; path: string; recursive: boolean}
  | {kind: "tag"; tag: string}
  | {kind: "predicate"; expression: string}
>;

export type PublishProfile = Readonly<{
  version: 1;
  id: string;
  title: string;
  entryPath: string;
  uuidProperty: string;
  include: readonly PublishRule[];
  exclude: readonly PublishRule[];
  includePaths: readonly string[];
  excludePaths: readonly string[];
  properties: readonly string[];
  aliases: boolean;
  fullText: boolean;
  includeMedia: boolean;
  theme: boolean;
  runtimeVersion?: string;
}>;

type Scalar = string | number | boolean | null;
export type PublishUuidValue = Scalar | readonly Scalar[];
export type PublishUuidField = Readonly<{property: string; value: unknown}>;
export type PublishIdentity = Readonly<{path: string; id: string}>;
export type PublishUuidChange = Readonly<{path: string; property: string; before?: PublishUuidValue; after: string}>;

export type PublishSelectionIssue = Readonly<{
  code: "metadata-unavailable" | "missing-note" | "missing-folder" | "invalid-predicate" | "unavailable-predicate"
    | "entry-not-selected" | "uuid-conflict" | "unsupported-uuid-value" | "limit" | "stale";
  path?: string;
  group?: "include" | "exclude";
  rule?: number;
}>;

export type PublishSelectionNote = Readonly<{
  path: string;
  candidate: GraphNodeView;
  uuidFields: readonly PublishUuidField[];
}>;

export type PublishSelectionInventory = Readonly<{
  notes: readonly PublishSelectionNote[];
  folderExists(path: string): boolean;
  predicates: GraphPredicateEngine;
  unavailablePath?: string;
}>;

export type PublishSelection = Readonly<{
  profile: PublishProfile;
  selectedPaths: readonly string[];
  identities: readonly PublishIdentity[];
  changes: readonly PublishUuidChange[];
  issues: readonly PublishSelectionIssue[];
}>;

/** A UUID is a portable opaque identity. Canonical lowercase forms compare equal across notes. */
export function publishUuid(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(value)) return;
  return value.toLowerCase();
}

/** Native paths and property names must survive text presentation without hidden controls. */
function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code < 32 || code === 127) return true;
  }
  return false;
}

/** Only normalized vault-relative coordinates can participate in exact native lookup. */
function validPath(path: unknown, folder = false): path is string {
  return typeof path === "string" && (folder && path === "/" || path.length > 0 && path.length <= 1_024
    && !path.includes("\\") && !hasControlCharacter(path) && path.split("/").every(
      /** Apply one rule to each exact, nonempty vault-path segment. */ part => part && part !== "." && part !== ".."));
}

/** Property names are literal frontmatter keys. Host metadata and prototype keys are reserved. */
function validProperty(value: unknown): value is string {
  return typeof value === "string" && value.length <= 128 && value === value.trim() && Boolean(value)
    && !hasControlCharacter(value) && !["__proto__", "constructor", "prototype", "position", "<<"].includes(normalizeFieldName(value));
}

/** Settings entries are decoded as records without copying unknown fields into the public model. */
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid-publish-profile");
  return value as Record<string, unknown>;
}

/** Capture one validated rule. An unknown rule is never accepted as an empty inclusion. */
function parseRule(value: unknown): PublishRule {
  const rule = record(value);
  if (rule.kind === "note" && validPath(rule.path) && rule.path.toLowerCase().endsWith(".md")) return {kind: "note", path: rule.path};
  if (rule.kind === "folder" && validPath(rule.path, true) && typeof rule.recursive === "boolean")
    return {kind: "folder", path: rule.path, recursive: rule.recursive};
  if (rule.kind === "tag" && typeof rule.tag === "string" && /^#?[^\s#,]{1,128}$/.test(rule.tag)) return {kind: "tag", tag: rule.tag};
  if (rule.kind === "predicate" && typeof rule.expression === "string" && rule.expression.length <= 2_048)
    return {kind: "predicate", expression: rule.expression};
  throw new Error("invalid-publish-rule");
}

/** Bound collection work before copying a profile into a detached operation. */
function readList<T>(value: unknown, limit: number, parse: (item: unknown) => T): T[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > limit) throw new Error("invalid-publish-profile");
  return value.map(parse);
}

/** Validate a persisted or draft v1 profile without migrating a future schema. */
export function parsePublishProfile(value: unknown): PublishProfile {
  const profile = record(value), id = publishUuid(profile.id), title = profile.title;
  const uuidProperty = profile.uuidProperty ?? DEFAULT_PUBLISH_UUID_PROPERTY;
  const runtimeVersion = profile.runtimeVersion;
  if (profile.version !== 1 || !id || typeof title !== "string" || !title.trim() || title.length > 200
    || !validPath(profile.entryPath) || !profile.entryPath.toLowerCase().endsWith(".md") || !validProperty(uuidProperty)
    || runtimeVersion !== undefined && (typeof runtimeVersion !== "string" || !/^\d{1,8}\.\d{1,8}\.\d{1,8}$/.test(runtimeVersion))) {
    throw new Error("invalid-publish-profile");
  }
  /** Manual exceptions also require unambiguous Markdown paths. */
  const notePath = (path: unknown): string => {
    if (!validPath(path) || !path.toLowerCase().endsWith(".md")) throw new Error("invalid-publish-profile");
    return path;
  };
  /** Omitted exposure options default off, including on older profile drafts. */
  const flag = (key: "aliases" | "fullText" | "includeMedia" | "theme"): boolean => {
    const value = profile[key];
    if (value === undefined) return false;
    if (typeof value !== "boolean") throw new Error("invalid-publish-profile");
    return value;
  };
  return {
    version: 1, id, title: title.trim(), entryPath: profile.entryPath, uuidProperty,
    include: readList(profile.include, 64, parseRule), exclude: readList(profile.exclude, 64, parseRule),
    includePaths: [...new Set(readList(profile.includePaths, MAX_PUBLISH_NOTES, notePath))],
    excludePaths: [...new Set(readList(profile.excludePaths, MAX_PUBLISH_NOTES, notePath))],
    properties: [...new Set(readList(profile.properties, 64, /** Preserve only authored allowlist keys. */ property => {
      if (!validProperty(property)) throw new Error("invalid-publish-profile");
      return property;
    }))],
    aliases: flag("aliases"), fullText: flag("fullText"), includeMedia: flag("includeMedia"), theme: flag("theme"),
    ...(runtimeVersion === undefined ? {} : {runtimeVersion}),
  };
}

/** Discover the same canonical physical key in cache and write callback. Ambiguous keys survive. */
export function publishUuidFields(frontmatter: Readonly<Record<string, unknown>>, property: string): PublishUuidField[] {
  const normalized = normalizeFieldName(property);
  return Object.keys(frontmatter).filter(/** Observe every spelling that shares the canonical coordinate. */ key => normalizeFieldName(key) === normalized)
    .map(/** Keep the physical key for comparison again inside FileManager. */ key => ({property: key, value: frontmatter[key]}));
}

/** Preview invalid scalar values without coercing, dropping, or retaining an unbounded YAML object. */
function reviewableUuidValue(value: unknown): value is PublishUuidValue {
  /** Keep reviewable scalar identity exact and bound disclosure of malformed values. */
  const scalar = (item: unknown): item is Scalar => item === null || typeof item === "boolean"
    || typeof item === "number" && Number.isFinite(item) || typeof item === "string" && item.length <= 256;
  return Array.isArray(value) ? value.length <= 32 && value.every(scalar) : scalar(value);
}

/** Build a single rule evaluator. Publication rule evaluation intentionally has no relationship or focus context. */
function compileRule(rule: PublishRule): CompiledGraphPredicate | undefined {
  if (rule.kind === "tag") return compileGraphPredicate(predicateCall("tags.has", predicateProperty("file", "tags"), predicateLiteral(rule.tag)));
  if (rule.kind !== "predicate") return;
  const {expression} = tryParseGraphPredicateExpression(rule.expression);
  if (!expression) return;
  const compiled = compileGraphPredicate(expression), {namespaces, unsupportedSelectors} = compiled.dependencies;
  if (!namespaces.size || unsupportedSelectors?.size || [...namespaces].some(
    /** Selection inspects saved files and their cached note properties only. */ namespace => namespace !== "note" && namespace !== "file")) return;
  return compiled;
}

/** Match literal folders by path segment. Recursive includes never broaden into neighbors. */
function inFolder(path: string, folder: string, recursive: boolean): boolean {
  const parent = path.slice(0, path.lastIndexOf("/") + 1);
  const prefix = folder === "/" ? "" : `${folder}/`;
  return recursive ? parent.startsWith(prefix) : parent === prefix;
}

/** Resolve selection and UUID proposals from one complete inventory without reading note bodies. */
export function reviewPublishSelection(profile: PublishProfile, inventory: PublishSelectionInventory, createId: () => string): PublishSelection {
  const result = {profile, selectedPaths: [] as string[], identities: [] as PublishIdentity[], changes: [] as PublishUuidChange[], issues: [] as PublishSelectionIssue[]};
  if (inventory.unavailablePath !== undefined) {
    result.issues.push({code: "metadata-unavailable", ...(inventory.unavailablePath ? {path: inventory.unavailablePath} : {})});
    return result;
  }
  if (inventory.notes.length > MAX_PUBLISH_INVENTORY) {
    result.issues.push({code: "limit"});
    return result;
  }
  const paths = new Set(inventory.notes.map(/** Explicit rules never infer an ambiguous basename. */ note => note.path));
  const explicit = {include: new Set(profile.includePaths), exclude: new Set(profile.excludePaths)};
  const testUnavailable = new Set<string>();
  const rules = (["include", "exclude"] as const).map(/** Keep exclusions independently validated even when a file is manually included. */ group => {
    for (const path of explicit[group]) if (!paths.has(path)) result.issues.push({code: "missing-note", group, path});
    return profile[group].map(/** Compile each established predicate once per review. */ (rule, index) => {
      if (rule.kind === "note" && !paths.has(rule.path)) result.issues.push({code: "missing-note", group, rule: index, path: rule.path});
      if (rule.kind === "folder" && !inventory.folderExists(rule.path)) result.issues.push({code: "missing-folder", group, rule: index, path: rule.path});
      const predicate = compileRule(rule);
      if (rule.kind === "predicate" && !predicate) result.issues.push({code: "invalid-predicate", group, rule: index});
      /** Unavailable evaluation blocks its rule instead of treating failed exclusions as no matches. */
      return (note: PublishSelectionNote): boolean => {
        if (rule.kind === "note") return note.path === rule.path;
        if (rule.kind === "folder") return inFolder(note.path, rule.path, rule.recursive);
        if (!predicate) return false;
        const read = inventory.predicates.evaluateAvailable(predicate, {node: {node: note.candidate}});
        if (read.status === "available") return read.value;
        const key = `${group}:${index}`;
        if (!testUnavailable.has(key)) {
          testUnavailable.add(key);
          result.issues.push({code: "unavailable-predicate", group, rule: index, path: note.path});
        }
        return false;
      };
    });
  });

  const used = new Map<string, number>();
  const selected: PublishSelectionNote[] = [];
  for (const note of inventory.notes) {
    for (const field of note.uuidFields) {
      const id = publishUuid(field.value);
      if (id) used.set(id, (used.get(id) ?? 0) + 1);
    }
    // Evaluate each rule even when another matches: a broken exclusion cannot quietly admit a note.
    const included = rules[0].reduce(/** Keep manual overrides while observing every include's validity. */ (match, rule) => rule(note) || match, explicit.include.has(note.path));
    const excluded = rules[1].reduce(/** Evaluate every exclusion even after another exclusion already matched. */ (match, rule) => rule(note) || match, explicit.exclude.has(note.path));
    if (included && !excluded) selected.push(note);
  }
  if (selected.length > MAX_PUBLISH_NOTES) {
    result.issues.push({code: "limit"});
    return result;
  }
  selected.sort(/** Author review and write order are deterministic across system locales. */ (left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  for (const note of selected) result.selectedPaths.push(note.path);
  if (!result.selectedPaths.includes(profile.entryPath)) result.issues.push({code: "entry-not-selected", path: profile.entryPath});
  for (const {path, uuidFields} of selected) {
    const field = uuidFields[0], id = publishUuid(field?.value);
    if (uuidFields.length > 1 || id && used.get(id) !== 1) {
      result.issues.push({code: "uuid-conflict", path});
    } else if (id) {
      result.identities.push({path, id});
    } else if (field && !reviewableUuidValue(field.value)) {
      result.issues.push({code: "unsupported-uuid-value", path});
    } else {
      const after = publishUuid(createId());
      if (!after || used.has(after)) {
        result.issues.push({code: "uuid-conflict", path});
        continue;
      }
      used.set(after, 1);
      result.changes.push({path, property: field?.property ?? profile.uuidProperty, before: field?.value as PublishUuidValue | undefined, after});
    }
  }
  return result;
}
