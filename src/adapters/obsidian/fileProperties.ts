/** Narrow native Properties core-plugin action. Obsidian owns sidebar placement, pinning,
 * focus and editing; this adapter supplies only the captured physical Markdown target. */
import type {App, TFile} from "obsidian";

/** Narrow unpublished native objects without inheriting any permissive ambient App declarations. */
function record(value: unknown): value is Record<string, unknown> {return value !== null && typeof value === "object";}

/** This is the capability used by Obsidian's `properties:open-local` command, with an explicit file. */
function nativeProperties(app: App): ((file: TFile) => Promise<unknown>) | null {
  const native: unknown = Reflect.get(app, "internalPlugins");
  if (!record(native) || !record(native.plugins) || !record(native.plugins.properties)) return null;
  const core = native.plugins.properties, instance = core.instance;
  if (core.enabled !== true || !record(instance)) return null;
  const action: unknown = instance.ensurePropertiesView;
  if (typeof action !== "function") return null;
  return async file => {const result: unknown = Reflect.apply(action, instance, [file]);return await Promise.resolve(result);};
}

/** Disabled/missing native core support never exposes a dead context-menu item. */
export function canShowFileProperties(app: App): boolean {return nativeProperties(app) !== null;}

/** Dispatch the default native action without opening a different document or writing any note. */
export async function showFileProperties(app: App, file: TFile): Promise<boolean> {
  const open = nativeProperties(app);
  if (!open || file.extension !== "md" || app.vault.getFileByPath(file.path) !== file) return false;
  await open(file);return true;
}
