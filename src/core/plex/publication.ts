/** Bounded, host-independent wire contract for an exported static K-Plex site. */
import {LinkDirection, RelationType, type RelationshipRole} from "../graph/relations";
import type {ClassicGeometryPreferences} from "./views/classic/geometry";

export const PUBLICATION_MAX_NODES = 10_000;
export const PUBLICATION_MAX_RELATIONS = 250_000;
export const PUBLICATION_MAX_BYTES = 256 * 1024 * 1024;
export const PUBLICATION_MANIFEST_MAX_BYTES = 24 * 1024 * 1024;
export const publicationSearchPath = "data/search.json";
export const publicationThemePath = "theme/publication.css";
export const publicationRoles: readonly RelationshipRole[] = ["parent", "child", "left", "right", "previous", "next"];

const kinds = ["document", "drawing", "attachment", "folder", "tag", "url"] as const;
const fileName = /^(?:index\.html|\.nojekyll|data\/search\.json|theme\/publication\.css|notes\/[a-f0-9-]{36}\.html|assets\/[a-f0-9]{64}\.(?:png|jpe?g|gif|webp|avif|svg|mp3|ogg|wav|mp4|webm|pdf)|runtime\/(?:compass\.css|(?:compass|demo|chunk(?:-[a-zA-Z0-9]+)?)\.js(?:\.LEGAL\.txt)?)|LICENSES\/(?:K-Plex|React|ReactDOM|Scheduler|Source)\.txt)$/;
const hash = /^[a-f0-9]{64}$/;
const release = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

export type PublishedStyle = Readonly<{fill?: string; stroke?: string; color?: string; gate?: string; fontSize?: number}>;
export type PublishedLinkStyle = Readonly<{stroke?: string; width?: number; arrowStart?: boolean; arrowEnd?: boolean}>;
export type PublishedValue = string | boolean | number | readonly string[];
export type PublishedNode = Readonly<{
  id: string; title: string; kind: typeof kinds[number]; aliases?: readonly string[];
  properties?: Readonly<Record<string, PublishedValue>>; style?: PublishedStyle; asset?: string;
}>;
export type PublishedRelation = Readonly<{
  source: string; target: string; role: RelationshipRole; relationType: RelationType; direction: LinkDirection | null; definition?: string; style?: PublishedLinkStyle;
}>;
export type PublicationAppearance = Readonly<{
  maximum?: number; flip?: boolean; geometry?: Partial<ClassicGeometryPreferences>;
  typography?: {baseFontSize?: number; wrapNodeLabels?: boolean; propertyFontSize?: number};
}>;
export type PublicationResource = Readonly<{path: string; bytes: number; sha256: string}>;
export type PublicationManifest = Readonly<{
  version: 2; runtimeVersion: string; id: string; title: string; entry: string; nodes: readonly PublishedNode[];
  relations: readonly PublishedRelation[]; resources: readonly PublicationResource[]; appearance?: PublicationAppearance; fullText: boolean;
}>;

/** Public site IDs are canonical lowercase UUIDs, independent of private vault paths. */
export function isPublicationId(id: unknown): id is string {
  return typeof id === "string" && uuid.test(id);
}

/** Derive the one legal document resource for a navigation ID. */
export function publicationNotePath(id: string): string {
  if (!isPublicationId(id)) throw new Error("Invalid public note ID");
  return `notes/${id}.html`;
}

/** Allow only package-owned paths using an unambiguous ASCII spelling. */
export function isPublicationPath(path: unknown): path is string {
  return typeof path === "string" && path.length <= 180 && fileName.test(path);
}

/** Narrow an untrusted JSON value to a record for the field-specific validators below. */
function record(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid publication record");
  return raw as Record<string, unknown>;
}

/** Public copy is bounded separately from resource sizes and identifiers. */
function text(raw: unknown, maximum: number): raw is string {
  return typeof raw === "string" && raw.length <= maximum && raw.trim().length > 0 && !/\p{Cc}/u.test(raw);
}

/** Reject non-finite or out-of-range geometry before invoking shared layout. */
function numeric(raw: unknown, low: number, high: number): raw is number {
  return typeof raw === "number" && Number.isFinite(raw) && raw >= low && raw <= high;
}

/** Resolve only hexadecimal colors and bounded typography, with no CSS expressions or resources. */
function style(raw: unknown): PublishedStyle {
  const values = record(raw);
  const safe: Partial<Record<"fill" | "stroke" | "color" | "gate", string>> = {};
  for (const key of ["fill", "stroke", "color", "gate"] as const) {
    const value = values[key];
    if (value === undefined) continue;
    if (typeof value !== "string" || !/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(value)) throw new Error("Invalid publication color");
    safe[key] = value;
  }
  const {fontSize} = values;
  if (fontSize === undefined) return safe;
  if (!numeric(fontSize, 6, 96)) throw new Error("Invalid publication font size");
  return {...safe, fontSize};
}

/** Admit a connector's bounded paint and explicit arrow overrides. */
function linkStyle(raw: unknown): PublishedLinkStyle {
  const {stroke, width, arrowStart, arrowEnd} = record(raw);
  if ((stroke !== undefined && (typeof stroke !== "string" || !/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(stroke)))
    || (width !== undefined && !numeric(width, 0.25, 20)) || (arrowStart !== undefined && typeof arrowStart !== "boolean")
    || (arrowEnd !== undefined && typeof arrowEnd !== "boolean")) throw new Error("Invalid publication link style");
  return {stroke, width, arrowStart, arrowEnd};
}

/** Accept only bounded display preferences understood by the shared Compass layout. */
function appearance(raw: unknown): PublicationAppearance {
  const input = record(raw);
  const result: {maximum?: number; flip?: boolean; geometry?: Partial<ClassicGeometryPreferences>; typography?: PublicationAppearance["typography"]} = {};
  if (input.maximum !== undefined) {
    if (!numeric(input.maximum, 1, 400) || !Number.isInteger(input.maximum)) throw new Error("Invalid publication scene limit");
    result.maximum = input.maximum;
  }
  if (input.flip !== undefined) {
    if (typeof input.flip !== "boolean") throw new Error("Invalid publication orientation");
    result.flip = input.flip;
  }
  if (input.geometry !== undefined) {
    const source = record(input.geometry);
    const geometry: {[K in keyof ClassicGeometryPreferences]?: ClassicGeometryPreferences[K]} = {};
    const sizes = ["compactingFactor", "horizontalCompactingFactor", "minLinkLength", "parentColumns", "childColumns", "siblingRelativeSize",
      "parentMaxHeight", "childMaxHeight", "friendMaxHeight", "siblingMaxHeight"] as const;
    for (const key of sizes) {
      const value = source[key];
      if (value === undefined) continue;
      if (!numeric(value, 0.1, 4000)) throw new Error("Invalid publication geometry");
      Object.assign(geometry, {[key]: value});
    }
    if (source.compactView !== undefined && typeof source.compactView !== "boolean") throw new Error("Invalid publication compact mode");
    if (source.lateralArrangement !== undefined && source.lateralArrangement !== "split" && source.lateralArrangement !== "left") throw new Error("Invalid publication side layout");
    result.geometry = {...geometry, ...(source.compactView === undefined ? {} : {compactView: source.compactView}),
      ...(source.lateralArrangement === undefined ? {} : {lateralArrangement: source.lateralArrangement})};
  }
  if (input.typography !== undefined) {
    const {baseFontSize, wrapNodeLabels, propertyFontSize} = record(input.typography);
    if ((baseFontSize !== undefined && !numeric(baseFontSize, 6, 48)) || (propertyFontSize !== undefined && !numeric(propertyFontSize, 6, 48))
      || (wrapNodeLabels !== undefined && typeof wrapNodeLabels !== "boolean")) throw new Error("Invalid publication typography");
    result.typography = {baseFontSize, wrapNodeLabels, propertyFontSize};
  }
  return result;
}

/** Validate author-approved scalar properties, constructing a safe own-property record. */
function properties(raw: unknown): Readonly<Record<string, PublishedValue>> {
  const input = Object.entries(record(raw));
  if (input.length > 64) throw new Error("Too many publication properties");
  const result = new Map<string, PublishedValue>();
  for (const [name, value] of input) {
    if (!text(name, 192) || ["__proto__", "constructor", "prototype"].includes(name)) throw new Error("Invalid publication property name");
    if (text(value, 1000) || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) result.set(name, value);
    else if (Array.isArray(value) && value.length <= 48 && value.every(item => text(item, 1000))) result.set(name, [...value] as string[]);
    else throw new Error("Invalid publication property value");
  }
  return Object.fromEntries(result);
}

/** Validate counts, cross-file ownership and exact directed relationship records before admission. */
export function readPublicationManifest(raw: unknown): PublicationManifest {
  const input = record(raw);
  if (input.version !== 2 || typeof input.runtimeVersion !== "string" || !release.test(input.runtimeVersion)) throw new Error("Unsupported publication version");
  if (!isPublicationId(input.id) || !isPublicationId(input.entry) || !text(input.title, 240) || typeof input.fullText !== "boolean"
    || !Array.isArray(input.nodes) || !input.nodes.length || input.nodes.length > PUBLICATION_MAX_NODES
    || !Array.isArray(input.relations) || input.relations.length > PUBLICATION_MAX_RELATIONS
    || !Array.isArray(input.resources) || input.resources.length > PUBLICATION_MAX_NODES * 4) throw new Error("Invalid publication manifest");
  let totalBytes = 0;
  const files = new Set<string>();
  const resources = (input.resources as unknown[]).map((rawFile): PublicationResource => {
    const {path, bytes, sha256} = record(rawFile);
    if (!isPublicationPath(path) || files.has(path) || !numeric(bytes, 0, 32 * 1024 * 1024) || !Number.isInteger(bytes)
      || typeof sha256 !== "string" || !hash.test(sha256)) throw new Error("Invalid publication resource");
    files.add(path);
    totalBytes += bytes;
    if (totalBytes > PUBLICATION_MAX_BYTES) throw new Error("Publication exceeds package limit");
    return {path, bytes, sha256};
  });
  const ids = new Set<string>();
  const ownedNotes = new Set<string>();
  const nodes = (input.nodes as unknown[]).map((rawNode): PublishedNode => {
    const row = record(rawNode);
    const {id, title, aliases, asset} = row;
    const kind = kinds.find(value => value === row.kind);
    if (!isPublicationId(id) || ids.has(id) || !text(title, 512) || !kind) throw new Error("Invalid publication node");
    ids.add(id);
    if (kind === "document" || kind === "drawing") {
      const note = publicationNotePath(id);
      if (!files.has(note)) throw new Error("Missing publication note resource");
      ownedNotes.add(note);
    }
    if (asset !== undefined && (typeof asset !== "string" || !asset.startsWith("assets/") || !files.has(asset))) throw new Error("Missing publication asset");
    if (aliases !== undefined && (!Array.isArray(aliases) || aliases.length > 64 || !aliases.every(item => text(item, 512)))) throw new Error("Invalid publication aliases");
    return {id, title, kind, ...(aliases === undefined ? {} : {aliases: [...aliases] as string[]}),
      ...(asset === undefined ? {} : {asset}), ...(row.style === undefined ? {} : {style: style(row.style)}),
      ...(row.properties === undefined ? {} : {properties: properties(row.properties)})};
  });
  if (!ids.has(input.entry) || [...files].some(path => path.startsWith("notes/") && !ownedNotes.has(path))
    || input.fullText !== files.has(publicationSearchPath)) throw new Error("Invalid publication document catalogue");
  const edges = new Set<string>();
  const relations = (input.relations as unknown[]).map((rawEdge): PublishedRelation => {
    const {source, target, relationType, direction, definition, role: rawRole, style} = record(rawEdge);
    const role = publicationRoles.find(value => value === rawRole);
    if (typeof source !== "string" || typeof target !== "string" || source === target || !ids.has(source) || !ids.has(target) || !role
      || (relationType !== RelationType.DEFINED && relationType !== RelationType.INFERRED)
      || (direction !== null && direction !== LinkDirection.TO && direction !== LinkDirection.FROM && direction !== LinkDirection.BOTH)
      || (definition !== undefined && !text(definition, 192))) throw new Error("Invalid publication relationship");
    const key = `${source}/${target}/${role}`;
    if (edges.has(key)) throw new Error("Duplicate publication relationship");
    edges.add(key);
    return {source, target, role, relationType, direction, ...(definition === undefined ? {} : {definition}), ...(style === undefined ? {} : {style: linkStyle(style)})};
  });
  return {version: 2, runtimeVersion: input.runtimeVersion, id: input.id, title: input.title, entry: input.entry, fullText: input.fullText,
    nodes, relations, resources, ...(input.appearance === undefined ? {} : {appearance: appearance(input.appearance)})};
}
