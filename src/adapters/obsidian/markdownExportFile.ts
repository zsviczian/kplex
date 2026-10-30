/**
 * Native Markdown artifact handoff, matching Obsidian's own Bases CSV export.
 * The optional exportTextFile adapter capability uses system download on desktop
 * and native export/share storage on mobile. No Vault note writer or index is used.
 * Desktop completion means handoff, not a claim that the user completed the save.
 */
import type {App} from "obsidian";

type NativeTextExportAdapter = App["vault"]["adapter"] & {exportTextFile?: (text: string, filename: string) => Promise<void>};

/** Accept a filename only; the native system UI owns destination selection and overwrite confirmation. */
export function markdownExportFilename(raw: string): string | null {
  const value = raw.trim();
  if (!value || value.length > 200 || value === "." || value === ".." || /[\\/:*?"<>|#[\]]/.test(value)
    || Array.from(value).some(/** Reject native control characters without a regex control range. */ char => char.charCodeAt(0) < 32)) return null;
  return /\.md$/i.test(value) ? value : `${value}.md`;
}

/** Feature-detect the reviewed host capability instead of inventing a platform filesystem fallback. */
export function canExportMarkdownFile(app: App): boolean {return typeof (app.vault.adapter as NativeTextExportAdapter).exportTextFile === "function";}

/** Hand one immutable artifact to the native exporter; callers retain UI and captured-canvas lifetime. */
export async function exportMarkdownFile(app: App, filename: string, markdown: string, current: () => boolean): Promise<void> {
  const adapter = app.vault.adapter as NativeTextExportAdapter;
  if (markdownExportFilename(filename) !== filename || !current() || typeof adapter.exportTextFile !== "function") throw new Error("Native Markdown export unavailable");
  await adapter.exportTextFile(markdown, filename);
}
