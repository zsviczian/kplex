/** Bounded composer input interpretation. Core owns literal link grammar; native resolution
 * owns exact file identity. Recognized invalid links never fall through to filename creation. */
import {parseLinktext, type App} from "obsidian";
import {iterateInternalLinkTokens, iterateMarkdownLinkSteps} from "../../core/parser/metadata";
import type {GraphPage} from "../../types";

export type RelatedTargetInput = Readonly<{kind: "name"} | {kind: "web"; url: string; label: string}
  | {kind: "note"; page: GraphPage; label: string} | {kind: "invalid"; reason: "invalid" | "subpath" | "missing"}>;

/** Accept one complete web URL while keeping its query and fragment intact. */
function webTarget(raw: string, label = ""): RelatedTargetInput {
  if (/\s/.test(raw)) return {kind: "invalid", reason: "invalid"};
  try {
    const url = new URL(raw);
    if (url.protocol === "https:" || url.protocol === "http:") return {kind: "web", url: raw, label};
  } catch { /* A recognized malformed link remains an error, never a filename. */ }
  return {kind: "invalid", reason: "invalid"};
}

/** Resolve complete pasted tokens through Obsidian, without searching/preparing graph scopes. */
export function interpretRelatedTarget(app: App, readPage: (file: NonNullable<GraphPage["file"]>) => GraphPage | undefined,
  sourcePath: string, raw: string): RelatedTargetInput {
  const value = raw.trim();
  if (/^https?:\/\//i.test(value)) return webTarget(value);
  if (/^\[\[/.test(value)) {
    const tokens = [...iterateInternalLinkTokens(value)];
    const token = tokens[0];
    if (tokens.length !== 1 || !token || token.kind !== "wiki" || token.start !== 0 || token.end !== value.length)
      return {kind: "invalid", reason: "invalid"};
    const [target, ...labels] = value.slice(2, -2).split("|");
    if (labels.length > 1) return {kind: "invalid", reason: "invalid"};
    let decoded = target.trim();
    try {decoded = decodeURIComponent(decoded);} catch {return {kind: "invalid", reason: "invalid"};}
    const parsed = parseLinktext(decoded);
    if (parsed.subpath) return {kind: "invalid", reason: "subpath"};
    const file = parsed.path && app.metadataCache.getFirstLinkpathDest(parsed.path, sourcePath);
    if (!file || app.vault.getFileByPath(file.path) !== file) return {kind: "invalid", reason: "missing"};
    const page = readPage(file);
    if (!page || page.file !== file || page.path !== file.path) return {kind: "invalid", reason: "missing"};
    return {kind: "note", page, label: labels[0]?.trim() ?? ""};
  }
  if (value.startsWith("[") && value.includes("](")) {
    const links = [...iterateMarkdownLinkSteps(value)].filter(/** Ignore parser checkpoints, retaining every actual link for ambiguity rejection. */ (item): item is NonNullable<typeof item> => item !== null);
    const link = links[0], close = value.indexOf("]");
    if (links.length !== 1 || !link || close < 1 || value[close + 1] !== "(" || value.indexOf(")", close + 2) !== value.length - 1)
      return {kind: "invalid", reason: "invalid"};
    return webTarget(link.rawTarget.trim(), link.label);
  }
  // Bracketed ordinary names remain filenames. A real or malformed link opening anywhere in a
  // pasted sentence is an unsupported target, rather than permission to create a bracketed file.
  const embeddedInternal = [...iterateInternalLinkTokens(value)].length > 0;
  const embeddedMarkdown = [...iterateMarkdownLinkSteps(value)].some(/** Null values are parser checkpoints, not link tokens. */ link => link !== null);
  if (embeddedInternal || embeddedMarkdown || value.includes("[[") || value.includes("](")) return {kind: "invalid", reason: "invalid"};
  if (/^(?:https?|javascript|data|vbscript|file|obsidian|mailto|tel|sms):|^[a-z][a-z\d+.-]*:\/\//i.test(value)) return {kind: "invalid", reason: "invalid"};
  if (value.includes("/")) {
    const parsed = parseLinktext(value);
    if (parsed.subpath) return {kind: "invalid", reason: "subpath"};
    const file = app.metadataCache.getFirstLinkpathDest(parsed.path, sourcePath);
    if (file && app.vault.getFileByPath(file.path) === file) {
      const page = readPage(file);
      if (!page || page.file !== file || page.path !== file.path) return {kind: "invalid", reason: "missing"};
      return {kind: "note", page, label: ""};
    }
  }
  return {kind: "name"};
}
