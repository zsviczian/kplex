/** Native file and folder rename and optional note display-name synchronization. FileManager retains link maintenance;
 * the same captured TFile/path owns the subsequent document-property write. Only an explicitly enabled existing name field is updated; all other metadata is preserved. This operation owns no listeners or persistent state. */
import type {App, TFile, TFolder} from "obsidian";
import {normalizeFieldName} from "../../core/contracts/fieldName";

type FolderRename = Readonly<{folder: TFolder; path: string; parent: TFolder; parentPath: string}>;

/** Captured folder and parent must still be the exact native objects at the approved coordinates. */
export function isFolderRenameCurrent(app: App, plan: FolderRename): boolean {
  const {folder, path, parent, parentPath} = plan;
  const currentParent = parentPath === "/" ? app.vault.getRoot() : app.vault.getFolderByPath(parentPath);
  return folder.path === path && folder.parent === parent && parent.path === parentPath
    && currentParent === parent && app.vault.getFolderByPath(path) === folder;
}

/** A physical, non-root folder can be renamed in place. */
export function captureFolderRename(app: App, folder: TFolder): FolderRename | null {
  const parent = folder.parent;
  if (!parent || folder.path === "/" || folder === app.vault.getRoot()) return null;
  const plan = {folder, path: folder.path, parent, parentPath: parent.path};
  return isFolderRenameCurrent(app, plan) ? plan : null;
}

/** Match the native subfolder form's single-name validation. Periods inside the name are literal. */
export function validFolderRenameName(name: string): boolean {
  return Boolean(name && !/[. ]$/.test(name)
    && [...name].every(character => (character.codePointAt(0) ?? 0) >= 32 && !'/\\<>:"|?*'.includes(character)));
}

/** Obsidian renames the folder and maintains links for its descendants through FileManager. */
export async function renameFolder(app: App, plan: FolderRename, newPath: string, unavailable: () => Error): Promise<void> {
  const separator = newPath.lastIndexOf("/");
  const parentPath = separator === -1 ? "/" : newPath.slice(0, separator);
  if (!isFolderRenameCurrent(app, plan) || parentPath !== plan.parentPath || !validFolderRenameName(newPath.slice(separator + 1))) throw unavailable();
  if (newPath !== plan.path) {
    if (app.vault.getAbstractFileByPath(newPath)) throw unavailable();
    await app.fileManager.renameFile(plan.folder, newPath);
  }
  if (!isFolderRenameCurrent(app, {...plan, path: newPath})) throw unavailable();
}

/** Normalize Obsidian's two alias spellings without conflating any other property names. */
function displayFieldKey(field: string): string {
  const normalized = normalizeFieldName(field);
  return normalized === "alias" ? "aliases" : normalized;
}

/** Select the first configured, existing editable display-name property in this exact note.
 * No default title property is created. Alias lists keep their other entries on rename. */
export function renameDisplayField(app: App, file: TFile, nameFields: string): string | null {
  if (file.extension !== "md") return null;
  const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter ?? {};
  for (const requested of nameFields.split(",").map(field => field.trim()).filter(Boolean)) {
    const keys = Object.keys(frontmatter).filter(key => displayFieldKey(key) === displayFieldKey(requested));
    if (keys.length !== 1) continue;
    const value: unknown = frontmatter[keys[0]];
    if (typeof value === "string" && value.trim().length > 0 || Array.isArray(value) && value.every(item => typeof item === "string") && value.some(item => item.trim().length > 0)) return keys[0];
  }
  return null;
}

/** Rename once, then optionally synchronize the captured existing display-name field.
 * A same-path retry may repair metadata after a successful rename. Replaced/moved files
 * cannot receive late metadata, and attachments never acquire document properties. */
export async function renameNoteWithDisplayName(app: App, file: TFile, newPath: string, title: string, field: string | null,
  unavailable: () => Error): Promise<void> {
  const originalPath = file.path;
  if (app.vault.getFileByPath(originalPath) !== file) throw unavailable();
  if (newPath !== originalPath) await app.fileManager.renameFile(file, newPath);
  if (file.path !== newPath || app.vault.getFileByPath(newPath) !== file) throw unavailable();
  if (!field || file.extension !== "md") return;
  await app.fileManager.processFrontMatter(file, /** Recheck after the host's awaited read; aliases and other fields stay intact. */ (frontmatter: Record<string, unknown>) => {
    if (file.path !== newPath || app.vault.getFileByPath(newPath) !== file) throw unavailable();
    const keys = Object.keys(frontmatter).filter(key => displayFieldKey(key) === displayFieldKey(field));
    if (keys.length !== 1) return;
    const value: unknown = frontmatter[keys[0]];
    if (typeof value === "string") frontmatter[keys[0]] = title;
    else if (Array.isArray(value) && value.every(item => typeof item === "string")) {
      const first = value.findIndex(item => item.trim().length > 0);
      frontmatter[keys[0]] = [title, ...value.filter((item, index) => index !== first && item !== title)];
    }
  });
}
