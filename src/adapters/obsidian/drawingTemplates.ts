/** Versioned public EA boundary. Template discovery never reads companion-private settings. */
import type { TFile } from "obsidian";

export interface DrawingAutomation {
  verifyMinimumPluginVersion?: (version: string) => boolean;
  readonly templateFilePath?: string;
  getListOfTemplateFiles?: () => TFile[] | null;
  getDrawingFilePath?: (filename: string, foldername?: string) => string;
  getAPI?: () => DrawingAutomation;
  create?: (params: {exactPath: string; templatePath?: string; silent: boolean; validateBeforeCreate?: () => void}) => Promise<string>;
  destroy?: () => void;
}

/** Only 2.29.1+ owns the complete public template/filename contract. */
export function drawingAutomation(): DrawingAutomation | null {
  const bridge = (window as unknown as {ExcalidrawAutomate?: DrawingAutomation}).ExcalidrawAutomate;
  try {
    return bridge?.verifyMinimumPluginVersion?.("2.29.1") === true && typeof bridge.getDrawingFilePath === "function"
      && typeof bridge.getListOfTemplateFiles === "function" && typeof bridge.getAPI === "function" ? bridge : null;
  } catch { return null; }
}

/** Immutable dialog-local choices; a removed remembered template falls back to the first available drawing. */
export function drawingTemplateOptions(remembered: string | null): {files: readonly TFile[]; selected: string; root: string} | null {
  const bridge = drawingAutomation();
  if (!bridge) return null;
  const files = bridge.getListOfTemplateFiles?.() ?? [];
  const selected = remembered === "" || files.some(file => file.path === remembered) ? remembered ?? "" : files[0]?.path ?? "";
  return {files, selected, root: bridge.templateFilePath ?? ""};
}
