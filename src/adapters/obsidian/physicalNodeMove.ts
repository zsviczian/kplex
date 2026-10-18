/** Capture and revalidate a native move; normal FileManager/Vault events own graph reconciliation. */
import { TFolder, type App, type TAbstractFile } from "obsidian";
import type { GraphPage } from "../../types";
import { graphFolder } from "./graphFolder";

export type PhysicalMoveFailure = "changed" | "unsupported" | "root" | "recursive" | "same" | "conflict";
export type PhysicalMovePlan = Readonly<{
  source: TAbstractFile;
  folder: TFolder;
  sourcePath: string;
  folderPath: string;
  destination: string;
}>;
export type PhysicalMovePreparation = { ok: true; plan: PhysicalMovePlan } | { ok: false; reason: PhysicalMoveFailure };

/** Accept only exact physical endpoints; no name rewriting, auto-created destination or overwrite. */
export function preparePhysicalMove(app: App, origin: GraphPage, target: GraphPage): PhysicalMovePreparation {
  if (origin.transient || target.transient || !target.isFolder || origin.isTag || origin.url || (!origin.file && !origin.isFolder)) return { ok: false, reason: "unsupported" };
  const source = origin.isFolder ? graphFolder(app, origin) : origin.file;
  const folder = graphFolder(app, target);
  if (!source || !folder || origin.file && app.vault.getFileByPath(origin.file.path) !== origin.file) return { ok: false, reason: "changed" };
  return prepareNativeMove(app, source, folder);
}

/** Native object ancestry prevents moving a folder into itself or one of its descendants. */
export function prepareNativeMove(app: App, source: TAbstractFile, folder: TFolder): PhysicalMovePreparation {
  if (source === app.vault.getRoot() || !source.parent) return { ok: false, reason: "root" };
  const sourceCurrent = source instanceof TFolder ? app.vault.getFolderByPath(source.path) : app.vault.getFileByPath(source.path);
  const folderCurrent = folder === app.vault.getRoot() ? app.vault.getRoot() : app.vault.getFolderByPath(folder.path);
  if (sourceCurrent !== source || folderCurrent !== folder) return { ok: false, reason: "changed" };
  if (source.parent === folder) return { ok: false, reason: "same" };
  for (let ancestor: TFolder | null = folder; ancestor; ancestor = ancestor.parent) if (ancestor === source) return { ok: false, reason: "recursive" };
  const destination = folder.path === "/" ? source.name : `${folder.path}/${source.name}`;
  // Either a file or a folder can occupy this name; both must block a move.
  if (app.vault.getAbstractFileByPath(destination)) return { ok: false, reason: "conflict" };
  return { ok: true, plan: { source, folder, sourcePath: source.path, folderPath: folder.path, destination } };
}

/** Confirmation authorizes these exact names/incarnations, not a renamed/replaced destination. */
export function revalidatePhysicalMove(app: App, plan: PhysicalMovePlan): PhysicalMovePreparation {
  if (plan.source.path !== plan.sourcePath || plan.folder.path !== plan.folderPath) return { ok: false, reason: "changed" };
  return prepareNativeMove(app, plan.source, plan.folder);
}
