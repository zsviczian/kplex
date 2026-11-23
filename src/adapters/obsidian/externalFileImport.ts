/** Browser File imports use supported in-memory File and Vault APIs, never external filesystem
 * writes or private Electron paths. Directory discovery is bounded and read-only; copies retain exact bytes. */
import {normalizePath, type App, type TFile, type TFolder} from "obsidian";
import type {Translator} from "../../lang";

export const EXTERNAL_IMPORT_LIMITS = {files: 256, entries: 2048, depth: 32, fileBytes: 32 * 1024 * 1024, batchBytes: 128 * 1024 * 1024} as const;

export type ExternalImportPayload = Readonly<{files: readonly File[]; directory: boolean; entries?: readonly FileSystemEntry[]; unreadable?: boolean}>;
export type ExternalImportFile = Readonly<{file: File; relativePath: string}>;
export type ExternalImportInventory = Readonly<{files: readonly ExternalImportFile[]; directories: readonly string[]}>;

/** Finder metadata can travel with a folder even when the receiving device is not a Mac. */
function isFinderMetadata(name: string): boolean {return name.toLowerCase() === ".ds_store";}

/** Files-only native drag data is separate from caller-checked Obsidian file/node drags. */
export function externalFilesPayload(data: DataTransfer): ExternalImportPayload {
  const items = Array.from(data.items).filter(/** Text/link payloads cannot become import roots. */ item => item.kind === "file");
  const entries = items.flatMap(/** Capture entry handles synchronously while the native drop is readable. */ item => {
    const entry = item.webkitGetAsEntry?.() ?? null;
    const name = entry ? (entry.isFile ? entry.name : undefined) : item.getAsFile?.()?.name;
    return name && isFinderMetadata(name) ? [] : [entry];
  });
  return {files: Array.from(data.files).filter(/** Skip Finder bookkeeping before enforcing file limits. */ file => !isFinderMetadata(file.name)),
    directory: entries.some(/** Only an actual directory entry authorizes recursive discovery. */ entry => entry?.isDirectory === true),
    entries: entries.filter(/** Unavailable handles remain an explicit all-or-nothing discovery failure for folder drops. */ (entry): entry is FileSystemEntry => entry !== null), unreadable: entries.some(/** Do not silently omit one root from a mixed batch. */ entry => !entry)};
}

/** One literal cross-platform segment. No traversal, implicit separators or device filenames. */
export function validImportSegment(name: string): boolean {
  return Boolean(name && name === name.trim() && name !== "." && name !== ".." && !/[. ]$/.test(name)
    && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(name)
    && ![...name].some(/** Reject host-invalid path bytes before any destination can be created. */ c => (c.codePointAt(0) ?? 0) < 32 || '/\\<>:"|?*'.includes(c)));
}

/** Validate one literal before applying the same path normalization as the Vault. */
function normalizeImportSegment(name: string): string | null {
  if (!validImportSegment(name)) return null;
  const normalized = normalizePath(name);
  return validImportSegment(normalized) ? normalized : null;
}

/** Compare the last extension of an authored or source filename in the Vault spelling. */
function extension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot).toLowerCase() : "";
}

/** Both single and batch import validate user edits before choosing a normalized destination. */
export function externalImportName(source: File, rawName: string): string | null {
  const name = normalizeImportSegment(rawName.trim());
  return name && !isFinderMetadata(name) && extension(name) === extension(normalizePath(source.name)) ? name : null;
}

/** Discover all directory-reader pages before confirmation. This reads external entries only;
 * Vault writes occur later, serially and after destination/collision validation. */
export async function discoverExternalImports(payload: ExternalImportPayload, t: Translator, current: () => boolean,
  progress: (files: number, directories: number) => void): Promise<ExternalImportInventory> {
  const files: ExternalImportFile[] = [], directories: string[] = [], paths = new Set<string>();
  let bytes = 0, entries = 0;
  /** A bounded inventory cannot silently truncate files or accept a retired drop. */
  const check = (): void => {
    if (!current()) throw new Error(t("addRelated.endpointChanged"));
    if (entries > EXTERNAL_IMPORT_LIMITS.entries) throw new Error(t("fileImport.folderLimits", {entries: EXTERNAL_IMPORT_LIMITS.entries, depth: EXTERNAL_IMPORT_LIMITS.depth}));
    if (files.length > EXTERNAL_IMPORT_LIMITS.files || bytes > EXTERNAL_IMPORT_LIMITS.batchBytes) throw new Error(t("fileImport.limits", {files: EXTERNAL_IMPORT_LIMITS.files, size: 32}));
    progress(files.length, directories.length);
  };
  /** Detect aliases of one destination before writing, including equivalent Unicode spellings. */
  const admit = (path: string): void => {
    const parts = path.split("/");
    if (parts.length > EXTERNAL_IMPORT_LIMITS.depth) throw new Error(t("fileImport.folderLimits", {entries: EXTERNAL_IMPORT_LIMITS.entries, depth: EXTERNAL_IMPORT_LIMITS.depth}));
    if (paths.has(path)) throw new Error(t("fileImport.invalidName"));
    paths.add(path);
  };
  /** Admit metadata only; actual bytes are read one file at a time after confirmation. */
  const file = (value: File, relativePath: string): void => {
    admit(relativePath); if (value.size > EXTERNAL_IMPORT_LIMITS.fileBytes) throw new Error(t("fileImport.limits", {files: EXTERNAL_IMPORT_LIMITS.files, size: 32}));
    bytes += value.size; files.push({file: value, relativePath}); check();
  };
  /** Native entry readers return pages (often 100 entries); drain until their empty sentinel. */
  const visit = async (entry: FileSystemEntry, parent: string): Promise<void> => {
    entries++; check();
    if (entry.isFile && isFinderMetadata(entry.name)) return;
    const name = normalizeImportSegment(entry.name);
    if (!name) throw new Error(t("fileImport.invalidName"));
    const path = parent ? `${parent}/${name}` : name;
    if (entry.isFile) {
      const value = await new Promise<File>(/** Supported browser callbacks retain only this discovered file. */ (resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject));
      check(); file(value, path); return;
    }
    if (!entry.isDirectory) throw new Error(t("fileImport.failed"));
    admit(path); directories.push(path); check(); const reader = (entry as FileSystemDirectoryEntry).createReader();
    for (;;) {
      const children = await new Promise<FileSystemEntry[]>(/** A directory read failure rejects the whole inventory before any copying. */ (resolve, reject) => reader.readEntries(resolve, reject));
      check(); if (!children.length) return;
      for (const child of children) await visit(child, path);
    }
  };
  if (payload.directory) {
    if (payload.unreadable || !payload.entries?.length) throw new Error(t("fileImport.directoryUnavailable"));
    for (const entry of payload.entries) await visit(entry, "");
  } else for (const value of payload.files) {
    if (isFinderMetadata(value.name)) continue;
    entries++; check();
    const name = normalizeImportSegment(value.name);
    if (!name) throw new Error(t("fileImport.invalidName"));
    file(value, name);
  }
  check(); return {files, directories};
}

/** Retain the incoming extension, including binary types, and one literal vault-relative leaf. */
export function validateExternalImportName(app: App, source: File, rawName: string, folderPath: string, t: Translator): {stem: string; valid: boolean; error: string | null; existing: TFile | null} {
  const name = externalImportName(source, rawName);
  if (!name) return {stem: rawName.trim(), valid: false, error: t("fileImport.invalidName"), existing: null};
  const path = folderPath && folderPath !== "/" ? `${folderPath}/${name}` : name;
  const occupant = app.vault.getAbstractFileByPath(path);
  const folder = !folderPath || folderPath === "/" ? app.vault.getRoot() : app.vault.getFolderByPath(folderPath);
  return {stem: name, valid: !occupant && Boolean(folder),
    error: occupant ? t("moveNode.conflict") : !folder ? t("fileImport.existingFolder") : null,
    existing: app.vault.getFileByPath(path)};
}

/** Copy once after confirmation. Exact destination identity and collision checks are repeated
 * after reading bytes; dismissal or replacement before Vault acceptance makes no mutation. */
export async function copyExternalFile(app: App, source: File, name: string, folder: TFolder, t: Translator, current: () => boolean): Promise<TFile> {
  const capturedPath = folder.path, folderPath = folder.path === "/" ? "" : folder.path;
  /** No active-file lookup can retarget the captured destination after an await. */
  const live = (): boolean => current() && folder.path === capturedPath
    && (folderPath ? app.vault.getFolderByPath(folderPath) : app.vault.getRoot()) === folder;
  const validation = validateExternalImportName(app, source, name, folderPath, t);
  if (!live() || !validation.valid) throw new Error(validation.error ?? t("addRelated.endpointChanged"));
  if (source.size > EXTERNAL_IMPORT_LIMITS.fileBytes) throw new Error(t("fileImport.limits", {files: EXTERNAL_IMPORT_LIMITS.files, size: 32}));
  const bytes = await source.arrayBuffer();
  if (!live()) throw new Error(t("addRelated.endpointChanged"));
  const final = validateExternalImportName(app, source, name, folderPath, t);
  if (!final.valid) throw new Error(final.error ?? t("fileImport.invalidName"));
  if (bytes.byteLength !== source.size || bytes.byteLength > EXTERNAL_IMPORT_LIMITS.fileBytes) throw new Error(t("fileImport.failed"));
  const file = await app.vault.createBinary(folderPath ? `${folderPath}/${final.stem}` : final.stem, bytes);
  if (!file) throw new Error(t("fileImport.failed"));
  return file;
}
