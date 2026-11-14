/** Folder-scoped template discovery and explicit Markdown execution. Listing reads only native
 * file metadata; selecting a template acquires its content and an exact-file execution plan.
 * Explicit choices replace automatic creation templates for that file only, never vault-wide settings. */
import {TFile, TFolder, type App} from "obsidian";

export type CreationTemplateKind = "markdown" | "excalidraw";
export type CreationTemplateEntry = Readonly<{path: string; kind: CreationTemplateKind}>;
export type ExplicitCreationTemplate = Readonly<{path: string; run(file: TFile): Promise<void>}>;

/** Bound discovery by visited entries, including folders; no whole-vault scan or body/index reads.
 * Blank disables discovery; an explicit slash selects Obsidian's native vault-root identity. */
export function markdownTemplateFiles(app: App, folderPath: string, maximum = 4096): readonly TFile[] {
  if (!folderPath.trim()) return [];
  const path = folderPath.replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
  const root = path ? app.vault.getFolderByPath(path) : app.vault.getRoot();
  if (!root) return [];
  const pending = root.children.slice(0, maximum), files: TFile[] = [];let visited = 0;
  while (pending.length && visited++ < maximum) {
    const entry = pending.pop()!;
    if (entry instanceof TFolder) pending.push(...entry.children.slice(0, Math.max(0, maximum - visited - pending.length)));
    else if (entry instanceof TFile && entry.extension === "md" && !entry.path.endsWith(".excalidraw.md")) files.push(entry);
  }
  return files.sort(/** Stable native paths distinguish duplicate basenames and case-sensitive identities. */ (a, b) => a.path.localeCompare(b.path));
}

/** Core Templates uses these three variables; one captured time keeps a single execution coherent.
 * Use Obsidian's main-window calendar rather than importing a separate Moment runtime. */
export function expandMarkdownTemplate(text: string, title: string, options: Readonly<{dateFormat?: string; timeFormat?: string}>, now: number): string {
  const calendar = (window as unknown as {moment: (time: number) => {format(pattern: string): string}}).moment;
  return text.replace(/\{\{\s*(title|date|time)(?::([^}]+))?\s*\}\}/g, (_match, key: string, format?: string) =>
    key === "title" ? title : calendar(now).format(format?.trim() || (key === "date" ? options.dateFormat || "YYYY-MM-DD" : options.timeFormat || "HH:mm")));
}

type ExplicitTemplaterConfig = {template_file: TFile; target_file: TFile; run_mode: number; active_file?: TFile | null};
type ExplicitTemplater = {
  create_running_config(template: TFile, target: TFile, mode: number): ExplicitTemplaterConfig;
  parse_template(config: ExplicitTemplaterConfig, content: string): Promise<string>;
  start_templater_task(path: string): void;
  end_templater_task(path: string): Promise<void>;
};

/** Guard the verified native parser/task receipt surface; unsupported executable templates fail before creation. */
function explicitTemplater(value: unknown): ExplicitTemplater | null {
  if (!value || typeof value !== "object") return null;
  return ["create_running_config", "parse_template", "start_templater_task", "end_templater_task"].every(key => typeof Reflect.get(value, key) === "function")
    ? value as ExplicitTemplater : null;
}

/** Capture a selected Markdown template without executing it. Native identity, content revision and
 * caller preference/lifetime fences are checked again before parsing and before publishing text. */
export async function prepareMarkdownTemplate(app: App, template: TFile, title: string, current: () => boolean,
  unavailable: () => Error, unsupported: () => Error): Promise<(file: TFile) => Promise<void>> {
  const path = template.path, mtime = template.stat.mtime, size = template.stat.size;
  if (template.extension !== "md" || size > 1_048_576 || !current()) throw unavailable();
  const text = await app.vault.read(template), now = Date.now();
  const registry = app as App & {plugins?: {plugins?: Record<string, {templater?: unknown}>};
    internalPlugins?: {plugins?: Record<string, {instance?: {options?: {dateFormat?: string; timeFormat?: string}}}>}};
  const plugin = registry.plugins?.plugins?.["templater-obsidian"], nativeEngine = plugin?.templater, engine = explicitTemplater(nativeEngine);
  const content = expandMarkdownTemplate(text, title, registry.internalPlugins?.plugins?.templates?.instance?.options ?? {}, now);
  if (content.includes("<%") && !engine) throw unsupported();
  /** Captured source and plugin identities cannot be replaced by another template or engine after await. */
  const valid = (): boolean => current() && app.vault.getFileByPath(path) === template && template.path === path
    && template.stat.mtime === mtime && template.stat.size === size
    && registry.plugins?.plugins?.["templater-obsidian"] === plugin && plugin?.templater === nativeEngine;
  if (!valid()) throw unavailable();
  return async file => {
    const targetPath = file.path;
    /** Native tp.file.rename/move may relocate this result while parsing; follow only the same
     * native file at its current path, never a replacement occupying either destination. */
    const targetCurrent = (): boolean => valid() && app.vault.getFileByPath(file.path) === file;
    if (!targetCurrent()) throw unavailable();
    let rendered = content;
    const executeTemplater = content.includes("<%") && engine;
    if (executeTemplater) engine.start_templater_task(targetPath);
    try {
      if (executeTemplater) {
        // Native configuration preserves tp.config.active_file and future native context fields.
        // RunMode.CreateNewFromTemplate is zero in the verified Templater native contract.
        rendered = await engine.parse_template(engine.create_running_config(template, file, 0), content);
        if (typeof rendered !== "string" || !targetCurrent()) throw unavailable();
      }
      await app.vault.process(file, /** Never overwrite a concurrent user/foreign write while a template parser was awaiting. */ latest => {
        if (!targetCurrent() || latest !== "") throw unavailable();
        return rendered;
      });
    } finally { if (executeTemplater) await engine.end_templater_task(targetPath); }
  };
}
