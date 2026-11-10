/** Explicit cached-YAML review and sequential repair. This feature never acquires bodies,
 * creates an index, changes discovery policy or repairs anything without a selected preview. */
import type {App, TFile} from "obsidian";
import {normalizeFieldName} from "../../core/contracts/fieldName";
import {nodePropertyRows, type NoteTypeProperties, type NodeProperty} from "../../core/plex/nodeProperties";
import {noteTypeSelection, noteTypeAsTag, NoteTypeChangedError, type NoteTypeSelection} from "./tagNoteType";
import {hasYamlTagMembership, supportsYamlTags} from "./tagMembership";
import {missingNoteProperties} from "./noteTypeProperties";
import {SavedRelationshipPendingError} from "./relationshipMetadataWrite";

export type NoteTypeProblem = "invalid" | "missing-tag" | "missing-properties" | "manual";
export type NoteTypeFinding = Readonly<{kind: NoteTypeProblem; value: string; tag: string | null; field: string;
  file: TFile; path: string; mtime: number; size: number; selection: NoteTypeSelection; missing: readonly string[]}>;
export type NoteTypeReport = Readonly<{findings: readonly NoteTypeFinding[]; scanned: number; total: number; unavailable: number; withoutYaml: number; cancelled: boolean}>;
export type NoteTypeOutcome = Readonly<{finding: NoteTypeFinding; status: "changed" | "unchanged" | "skipped" | "failed" | "pending"; savedPending?: boolean}>;
export type NoteTypeRepairPorts = Readonly<{
  field(): string; properties(): NoteTypeProperties;
  set(file: TFile, field: string, opening: NoteTypeSelection, value: string, current: () => boolean, stamp: Readonly<{mtime: number; size: number}>): Promise<boolean>;
  ensureMembership(file: TFile, field: string, opening: NoteTypeSelection, current: () => boolean, stamp: Readonly<{mtime: number; size: number}>): Promise<boolean>;
  initialize(file: TFile, field: string, opening: NoteTypeSelection, rows: readonly NodeProperty[], current: () => boolean): Promise<boolean>;
}>;

/** Inspect one current native cache entry without retaining arbitrary property values in a second model. */
export function inspectNoteType(file: TFile, frontmatter: Record<string, unknown>, field: string, configuration: NoteTypeProperties): NoteTypeFinding[] {
  const names = Object.keys(frontmatter).filter(key => normalizeFieldName(key) === normalizeFieldName(field)), key = names[0] ?? field;
  const raw: unknown = frontmatter[key];
  const selection = typeof raw === "string" && raw.length > 512 ? {key, value: null, supported: false, token: "unsupported"} : noteTypeSelection(frontmatter, field);
  if (selection.supported && (raw == null || raw === "" || Array.isArray(raw) && raw.length === 0)) return [];
  const scalar = typeof raw === "string" ? raw : Array.isArray(raw) && raw.length === 1 && typeof raw[0] === "string" ? raw[0] : null;
  const tag = scalar !== null ? noteTypeAsTag(scalar) : null;
  const base = {file, path: file.path, mtime: file.stat.mtime, size: file.stat.size, field, selection, tag, missing: []};
  if (!selection.supported || scalar === null || !supportsYamlTags(frontmatter)) return [{...base, kind: "manual", value: selection.key}];
  if (!scalar.trim()) return [];
  if (!tag) return [{...base, kind: typeof raw === "string" ? "invalid" : "manual", value: typeof raw === "string" ? scalar : selection.key}];
  if (!hasYamlTagMembership(frontmatter, tag)) return [{...base, kind: "missing-tag", value: tag.toLocaleLowerCase()}];
  const missing = missingNoteProperties(frontmatter, nodePropertyRows(configuration, tag));
  return missing.length ? [{...base, kind: "missing-properties", value: tag.toLocaleLowerCase(), missing}] : [];
}

/** One manually requested pass yields within 64 native-cache lookups or a 4ms slice and reports gaps/cancellation.
 * Absence of YAML does not classify inline-only selectors as invalid or grant permission to shadow them. */
export async function reviewNoteTypes(app: App, field: string, configuration: NoteTypeProperties,
  current: () => boolean, yieldToOwner: () => Promise<void>, progress: (scanned: number, total: number) => void): Promise<NoteTypeReport> {
  const files = app.vault.getMarkdownFiles(), findings: NoteTypeFinding[] = [];let scanned = 0, unavailable = 0, withoutYaml = 0, sliceStarted = Date.now();
  for (const file of files) {
    if (!current()) break;
    const metadata = app.metadataCache.getFileCache(file);
    if (!metadata || app.vault.getFileByPath(file.path) !== file) unavailable++;
    else if (!metadata.frontmatter || !Object.keys(metadata.frontmatter).some(key => normalizeFieldName(key) === normalizeFieldName(field))) withoutYaml++;
    else findings.push(...inspectNoteType(file, metadata.frontmatter, field, configuration));
    scanned++;if (scanned % 64 === 0 || Date.now() - sliceStarted >= 4) {progress(scanned, files.length);await yieldToOwner();sliceStarted = Date.now();}
  }
  progress(scanned, files.length);return {findings, scanned, total: files.length, unavailable, withoutYaml, cancelled: !current()};
}

/** Apply only selected, still-identical findings. A batch is not globally atomic: cancellation
 * retains earlier commits and leaves pending files untouched; per-file native writes remain atomic. */
export async function repairNoteTypes(app: App, findings: readonly NoteTypeFinding[], replacement: string | undefined,
  ports: NoteTypeRepairPorts, current: () => boolean, progress: (outcomes: readonly NoteTypeOutcome[]) => void): Promise<readonly NoteTypeOutcome[]> {
  const outcomes: NoteTypeOutcome[] = [];
  for (const finding of findings) {
    if (!current()) {outcomes.push({finding, status: "pending"});continue;}
    const file = app.vault.getFileByPath(finding.path);
    if (finding.kind === "manual" || file !== finding.file || file.stat.mtime !== finding.mtime || file.stat.size !== finding.size || ports.field() !== finding.field) {
      outcomes.push({finding, status: "skipped"});progress(outcomes);continue;
    }
    const fm = app.metadataCache.getFileCache(file)?.frontmatter;
    const selected = fm && noteTypeSelection(fm, finding.field);
    if (!selected || selected.token !== finding.selection.token || !selected.supported || !fm || !supportsYamlTags(fm)) {outcomes.push({finding, status: "skipped"});progress(outcomes);continue;}
    try {
      let changed: boolean;
      if (finding.kind === "missing-properties") {
        const rows = nodePropertyRows(ports.properties(), finding.tag ?? "");
        // A changed default list needs another preview; never initialize newly configured unseen fields.
        if (!fm || JSON.stringify(missingNoteProperties(fm, rows)) !== JSON.stringify(finding.missing)) {outcomes.push({finding, status: "skipped"});progress(outcomes);continue;}
        changed = await ports.initialize(file, finding.field, selected, rows, current);
      } else if (finding.kind === "missing-tag") changed = await ports.ensureMembership(file, finding.field, selected, current, {mtime: finding.mtime, size: finding.size});
      else {
        const tag = noteTypeAsTag(replacement ?? null);
        if (!tag) {outcomes.push({finding, status: "skipped"});progress(outcomes);continue;}
        changed = await ports.set(file, finding.field, selected, tag, current, {mtime: finding.mtime, size: finding.size});
      }
      outcomes.push({finding, status: changed ? "changed" : !current() ? "pending" : app.vault.getFileByPath(finding.path) !== finding.file ? "skipped" : "unchanged"});
    } catch (error) {
      outcomes.push({finding, status: error instanceof SavedRelationshipPendingError ? "changed" : !current() ? "pending" : error instanceof NoteTypeChangedError ? "skipped" : "failed", ...(error instanceof SavedRelationshipPendingError ? {savedPending: true} : {})});
    }
    progress(outcomes);
  }
  return outcomes;
}
