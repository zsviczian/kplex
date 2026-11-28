/** Detach an induced public graph from K-Plex's existing certified relation and style owners. */
import type {App, TFile} from "obsidian";
import {normalizeFieldName} from "../../core/contracts/fieldName";
import type {ColorValue} from "../../core/contracts/colorValue";
import {LinkDirection, RelationType} from "../../core/graph/relations";
import {PUBLICATION_MAX_RELATIONS, type PublicationAppearance, type PublishedNode, type PublishedRelation, type PublishedStyle, type PublishedValue} from "../../core/plex/publication";
import {classicFlipped} from "../../core/plex/views/classic/configuration";
import {classicViewDefinition} from "../../core/plex/views/classic/definition";
import {readViewConfiguration} from "../../core/plex/views/configuration";
import type {GraphIndex} from "../../index/GraphIndex";
import {resolveLinkStyle, resolveNodeStyle} from "../../index/style";
import {captureSettingsPolicy} from "../../core/graph/settingsPolicy";
import type {KplexSettings} from "../../settings";
import type {NodeStyle} from "../../types";
import type {NativePublishSelection} from "./publishSelection";
import {colorValueCss} from "./colorPresentation";

type GraphPorts = Readonly<{
  app: App; index: GraphIndex; settings: () => KplexSettings; revision: () => number;
  owner: Window; document: Document; scope: NativePublishSelection; signal: AbortSignal; allowPreparation: boolean;
}>;

export class PublishGraphError extends Error {
  readonly reason: "stale" | "approval" | "incomplete" | "limit";

  /** Errors describe local graph state without exposing note or property paths. */
  constructor(reason: PublishGraphError["reason"]) {super(reason);this.reason = reason;}
}

/** Sample only allowed theme colors and serialize them to safe hex values. */
export function publicationColors(document: Document): Readonly<{resolve: (color: ColorValue | undefined) => string | undefined; stylesheet: () => string}> {
  const element = document.querySelector(".kplex-app") ?? document.body;
  const tokens = document.defaultView?.getComputedStyle(element);
  const canvas = document.createElementNS("http://www.w3.org/1999/xhtml", "canvas") as HTMLCanvasElement;
  const context = canvas.getContext("2d");
  /** Parsing a color on a detached canvas cannot resolve arbitrary CSS or load a resource. */
  const hex = (value: string): string | undefined => {
    const color = value.trim();
    if (!context || !/^(?:#[a-f0-9]{3,8}|(?:rgb|rgba|hsl|hsla)\([\d.% ,/+-]+\)|[a-z]+)$/i.test(color)) return undefined;
    context.fillStyle = "#010203";
    context.fillStyle = color;
    if (context.fillStyle === "#010203" && color.toLowerCase() !== "#010203") return undefined;
    const result = context.fillStyle;
    if (/^#[a-f0-9]{6}$/i.test(result)) return result;
    const rgba = /^rgba\((\d+), (\d+), (\d+), ([.\d]+)\)$/.exec(result);
    return rgba ? "#" + rgba.slice(1).map((part, index) => Math.round(Number(part) * (index === 3 ? 255 : 1)).toString(16).padStart(2, "0")).join("") : undefined;
  };
  /** Resolve a bounded known style token, dropping source identifiers from the DTO. */
  const resolve = (color: ColorValue | undefined): string | undefined => {
    if (color === undefined || color === null) return undefined;
    if (typeof color === "string") return hex(colorValueCss(color));
    const css = colorValueCss(color);
    const property = /^var\((--[a-z0-9-]+),/.exec(css)?.[1];
    return (property && hex(tokens?.getPropertyValue(property) ?? "")) ||
      (color.kind === "theme" ? hex(tokens?.getPropertyValue(color.variable) ?? "") : undefined);
  };
  /** Emit only the reader's explicit CSS variables and public, resolved color literals. */
  const stylesheet = (): string => {
    const names = new Map([
      ["--background-primary", "--background-primary"], ["--text-normal", "--text-normal"], ["--text-muted", "--text-muted"],
      ["--background-modifier-border", "--background-modifier-border"], ["--interactive-accent", "--interactive-accent"],
      ["--kplex-publication-panel", "--background-secondary"], ["--kplex-publication-link", "--link-color"],
    ]);
    const declarations: string[] = [];
    for (const [name, source] of names) {
      const color = hex(tokens?.getPropertyValue(source) ?? "");
      if (color) declarations.push(`  ${name}: ${color};`);
    }
    const mode = document.body.classList.contains("theme-dark") ? "dark" : "light";
    return `@media (prefers-color-scheme: ${mode}) {\n.kplex-publication {\n${declarations.join("\n")}\n}\n}\n`;
  };
  return {resolve, stylesheet};
}

/** Export approved scalar properties, resolving local references through native metadata. */
function approvedProperties(app: App, file: TFile, fields: readonly string[], identities: ReadonlyMap<string, string>): Record<string, PublishedValue> {
  const approved = new Set(fields.map(normalizeFieldName));
  const source = app.metadataCache.getFileCache(file)?.frontmatter ?? {};
  const rows = new Map<string, PublishedValue>();
  const safeText = (value: string): string | undefined => {
    const match = /^\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]$/.exec(value.trim());
    if (match) return identities.get(app.metadataCache.getFirstLinkpathDest(match[1], file.path)?.path ?? "");
    return value.length <= 1000 && value.trim() && !/[\\/]|\[\[|\p{Cc}/u.test(value) ? value : undefined;
  };
  for (const [name, value] of Object.entries(source)) {
    if (name === "position" || name.length > 192 || !approved.has(normalizeFieldName(name))) continue;
    if (typeof value === "number" && Number.isFinite(value) || typeof value === "boolean") rows.set(name, value);
    else if (typeof value === "string") {
      const scalar = safeText(value);
      if (scalar !== undefined) rows.set(name, scalar);
    } else if (Array.isArray(value) && value.length <= 48 && value.every(item => typeof item === "string")) {
      const values = value.flatMap(item => safeText(item) ?? []);
      if (values.length) rows.set(name, values);
    }
  }
  return Object.fromEntries(rows);
}

/** Only these bounded layout preferences cross the publishing boundary. */
function publicationAppearance(settings: KplexSettings): PublicationAppearance {
  const {compactingFactor, horizontalCompactingFactor, compactView, minLinkLength, parentColumns, childColumns, siblingRelativeSize, lateralArrangement,
    parentMaxHeight, childMaxHeight, friendMaxHeight, siblingMaxHeight, baseFontSize, wrapNodeLabels, propertyFontSize} = settings;
  return {maximum: Math.min(400, Math.max(1, Math.round(settings.maxItemCount))),
    flip: classicFlipped(readViewConfiguration(classicViewDefinition, settings.canvasViewSettings)),
    geometry: {compactingFactor, horizontalCompactingFactor, compactView, minLinkLength, parentColumns, childColumns,
      siblingRelativeSize, lateralArrangement, parentMaxHeight, childMaxHeight, friendMaxHeight, siblingMaxHeight},
    typography: {baseFontSize, wrapNodeLabels, propertyFontSize}};
}

/** Project an effective native card style to bounded renderer fields and resolved colors. */
function cardStyle(style: NodeStyle, color: ReturnType<typeof publicationColors>): PublishedStyle {
  const {fontSize, gateRadius} = style;
  return {fill: color.resolve(style.backgroundColor), stroke: color.resolve(style.borderColor), color: color.resolve(style.textColor),
    gate: color.resolve(style.gateBackgroundColor), fontSize: fontSize !== undefined && fontSize >= 6 && fontSize <= 96 ? fontSize : undefined,
    gateRadius: gateRadius !== undefined && gateRadius >= 0 && gateRadius <= 40 ? gateRadius : undefined};
}

/** Release the modal's wait on cancellation/deadline without interrupting other source consumers. */
async function awaitPublicationAuthority(index: GraphIndex, owner: Window, signal: AbortSignal, current: () => boolean, deadline: number): Promise<boolean> {
  let finish!: () => void;
  const cancelled = new Promise<false>(resolve => {finish = () => resolve(false);});
  const timer = owner.setTimeout(finish, Math.max(0, deadline - owner.performance.now()));
  signal.addEventListener("abort", finish, {once: true});
  try {return await Promise.race([index.preparePublicationAuthority(current), cancelled]);}
  finally {owner.clearTimeout(timer);signal.removeEventListener("abort", finish);}
}

/** Use the existing selected-scope demand owner in bounded batches only after explicit approval. */
export async function capturePublishGraph(ports: GraphPorts) {
  const {app, index, scope, signal, owner, document} = ports;
  const settings = ports.settings(), sourceRevision = ports.revision(), policy = JSON.stringify(captureSettingsPolicy(settings));
  const color = publicationColors(document);
  const {profile, identities: approvedIdentities} = scope.selection;
  const identities = new Map(approvedIdentities.map(row => [row.path, row.id]));
  const targets = new Set(identities.keys());
  const nodes: PublishedNode[] = [], relations: PublishedRelation[] = [];
  const isCurrent = (): boolean => !signal.aborted && scope.isCurrent() && ports.revision() === sourceRevision
    && JSON.stringify(captureSettingsPolicy(ports.settings())) === policy;
  const checked = (): void => {
    signal.throwIfAborted();
    if (!isCurrent()) throw new PublishGraphError("stale");
  };
  const complete = (file: TFile): boolean => index.viewScopeCoverage(file.path).complete;
  const deadline = owner.performance.now() + 120_000;
  checked();
  if (scope.files.some(file => !complete(file))) {
    if (!ports.allowPreparation) throw new PublishGraphError("approval");
    if (!await awaitPublicationAuthority(index, owner, signal, isCurrent, deadline)) {
      checked();
      throw new PublishGraphError("incomplete");
    }
    checked();
  }
  for (let offset = 0; offset < scope.files.length; offset += 8) {
    checked();
    const batch = scope.files.slice(offset, offset + 8);
    const release = batch.filter(file => !complete(file)).map(file => index.acquireSemanticDemand(file.path, true));
    try {
      while (batch.some(file => !complete(file))) {
        if (owner.performance.now() >= deadline) throw new PublishGraphError("incomplete");
        if (batch.every(file => complete(file) || !index.viewScopeCoverage(file.path).pending) && !index.hasActiveSourcePreparation()) throw new PublishGraphError("incomplete");
        await new Promise<void>(done => owner.setTimeout(done, 35));
        checked();
      }
      for (const file of batch) {
        const source = identities.get(file.path), page = index.get(file.path);
        if (!source || !page || page.file !== file || !complete(file)) throw new PublishGraphError("incomplete");
        const cache = app.metadataCache.getFileCache(file);
        const aliases = profile.aliases ? page.aliases.filter(value =>
          typeof value === "string" && value.trim() && value.length <= 512 && !/[\\/]|\p{Cc}/u.test(value)).slice(0, 64) : undefined;
        nodes.push({id: source, title: file.basename, kind: cache?.frontmatter?.["excalidraw-plugin"] ? "drawing" : "document", aliases,
          properties: approvedProperties(app, file, profile.properties.filter(name => normalizeFieldName(name) !== normalizeFieldName(profile.uuidProperty)), identities),
          style: cardStyle(resolveNodeStyle(page, null, "child", settings), color), roleStyles: {
            center: cardStyle(resolveNodeStyle(page, null, "center", settings), color),
            sibling: cardStyle(resolveNodeStyle(page, null, "sibling", settings), color),
            inferred: cardStyle(resolveNodeStyle(page, {page, role: "child", relationType: RelationType.INFERRED, linkDirection: null}, "child", settings), color),
          }});
        for (const row of index.visibleRelationshipsWithin(page, targets)) {
          if (row.role === "sibling") continue;
          const target = identities.get(row.page.path);
          if (!target) continue;
          const link = resolveLinkStyle(row, settings, page);
          const reverse = row.linkDirection === (settings.inverseArrowDirection ? LinkDirection.TO : LinkDirection.FROM);
          const definition = row.typeDefinition && row.typeDefinition.split(",").every(part => profile.properties.some(field =>
            normalizeFieldName(field) === normalizeFieldName(part.trim()))) ? row.typeDefinition : undefined;
          relations.push({source, target, role: row.role, relationType: row.relationType, direction: row.linkDirection, definition,
            style: {stroke: color.resolve(link.strokeColor), width: link.strokeWidth,
              startHead: reverse ? link.endArrowHead : link.startArrowHead, endHead: reverse ? link.startArrowHead : link.endArrowHead}});
          if (relations.length > PUBLICATION_MAX_RELATIONS) throw new PublishGraphError("limit");
        }
      }
    } finally { for (const dispose of release.reverse()) dispose(); }
    // Settled global scans also yield so generation can be cancelled under large profiles.
    if (offset + batch.length < scope.files.length) await new Promise<void>(done => owner.setTimeout(done, 0));
  }
  checked();
  const entry = identities.get(profile.entryPath);
  if (!entry) throw new PublishGraphError("incomplete");
  return {id: profile.id, title: profile.title, entry, nodes, relations, appearance: publicationAppearance(settings), isCurrent,
    theme: profile.theme ? color.stylesheet() : undefined};
}
