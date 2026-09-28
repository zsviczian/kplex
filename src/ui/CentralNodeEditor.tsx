/** Native Obsidian view for a Markdown-backed central Plex node, including Excalidraw when installed. */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Notice, type TFile, type WorkspaceLeaf } from "obsidian";
import type ExcaliBrainPlugin from "../main";
import type { Translator } from "../lang";
import {
  mountEmbeddedMarkdownLeaf,
  type EmbeddedDocumentView,
  type EmbeddedMarkdownLeafController,
  type EmbeddedMarkdownMode,
} from "../adapters/obsidian/embeddedMarkdownLeaf";
import { ObsidianIcon } from "./ObsidianIcon";

/** Render one native Markdown-backed leaf for the center and expose local view/maximize controls. */
export function CentralNodeEditor({
  plugin,
  hostLeaf,
  file,
  defaultMode,
  maximized,
  allowMaximize,
  onModeChange,
  onMaximizedChange,
  onCollapse,
  onNavigate,
  translate,
}: {
  plugin: ExcaliBrainPlugin;
  hostLeaf: WorkspaceLeaf;
  file: TFile;
  defaultMode: EmbeddedMarkdownMode;
  maximized: boolean;
  allowMaximize: boolean;
  onModeChange: (mode: EmbeddedMarkdownMode) => void;
  onMaximizedChange: (maximized: boolean) => void;
  onCollapse: () => void;
  onNavigate: (file: TFile) => void;
  translate: Translator;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<EmbeddedMarkdownLeafController | null>(null);
  const fileRef = useRef(file);
  const defaultModeRef = useRef(defaultMode);
  const onNavigateRef = useRef(onNavigate);
  const [mode, setMode] = useState<EmbeddedMarkdownMode>(defaultMode);
  const [documentView, setDocumentView] = useState<EmbeddedDocumentView | null>(null);
  const [excalidrawFile, setExcalidrawFile] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  fileRef.current = file;
  defaultModeRef.current = defaultMode;
  onNavigateRef.current = onNavigate;

  useLayoutEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let controller: EmbeddedMarkdownLeafController;
    try {
      controller = mountEmbeddedMarkdownLeaf(plugin.app, hostLeaf, mount, (nextFile) => {
        if (nextFile.path !== fileRef.current.path) onNavigateRef.current(nextFile);
      }, (requiredVersion) => {
        new Notice(plugin.translator("notice.excalidrawUpdateRequired", {
          version: requiredVersion,
        }), 6000);
      });
    } catch (error) {
      console.error("K-Plex failed to create the embedded central Markdown leaf.", error);
      setStatus("error");
      return;
    }
    controllerRef.current = controller;
    return () => {
      controllerRef.current = null;
      controller.dispose();
    };
  }, [plugin, hostLeaf]);

  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller) return;
    let cancelled = false;
    const initialMode = defaultModeRef.current;
    setMode(initialMode);
    setDocumentView(null);
    setExcalidrawFile(false);
    setStatus("loading");
    void controller.open(file, initialMode).then(() => {
      if (cancelled) return;
      setDocumentView(controller.getDocumentView());
      setExcalidrawFile(plugin.isExcalidrawAvailable() && controller.isExcalidrawFile());
      setStatus("ready");
    }).catch((error: unknown) => {
      console.error(`K-Plex failed to open ${file.path} in the embedded central Markdown leaf.`, error);
      if (!cancelled) setStatus("error");
    });
    return () => { cancelled = true; };
  }, [file]);

  useEffect(() => {
    const mount = mountRef.current;
    const controller = controllerRef.current;
    if (!mount || !controller) return;
    type WindowWithResizeObserver = Window & { ResizeObserver: typeof ResizeObserver };
    const viewWindow = (mount.ownerDocument.defaultView ?? window) as WindowWithResizeObserver;
    const observer = new viewWindow.ResizeObserver(() => controller.resize());
    observer.observe(mount);
    const frame = viewWindow.requestAnimationFrame(() => controller.resize());
    return () => {
      observer.disconnect();
      viewWindow.cancelAnimationFrame(frame);
    };
  }, [plugin, hostLeaf]);

  /** Switch only this embedded leaf between Obsidian source and reading modes. */
  const toggleMode = (): void => {
    const nextMode: EmbeddedMarkdownMode = mode === "source" ? "preview" : "source";
    setMode(nextMode);
    const controller = controllerRef.current;
    onModeChange(nextMode);
    if (!controller) return;
    void controller.setMode(nextMode).catch((error: unknown) => {
      console.error(`K-Plex failed to switch the embedded central Markdown leaf to ${nextMode} mode.`, error);
      setStatus("error");
    });
  };

  /** Toggle an Excalidraw-backed note between its drawing surface and native Markdown view. */
  const toggleExcalidrawView = (): void => {
    const controller = controllerRef.current;
    if (!controller) return;
    void controller.toggleExcalidrawView(mode).then((nextView) => {
      setDocumentView(nextView);
      setExcalidrawFile(plugin.isExcalidrawAvailable() && controller.isExcalidrawFile());
    }).catch((error: unknown) => {
      console.error("K-Plex failed to toggle the embedded Excalidraw view.", error);
      setStatus("error");
    });
  };

  return <div
    className={`kplex-central-editor-content${maximized ? " is-maximized" : ""}${mode === "source" ? " is-edit-mode" : ""}`}
    onPointerDownCapture={() => controllerRef.current?.activate()}
    onFocusCapture={() => controllerRef.current?.activate()}
  >
    <div ref={mountRef} className="kplex-central-editor-leaf-host" />
    <div className="kplex-central-editor-toolbar" role="toolbar" aria-label={translate("centralEditor.toolbar")}>
      {excalidrawFile && documentView && <button
        type="button"
        aria-label={translate(documentView === "excalidraw" ? "centralEditor.showMarkdown" : "centralEditor.showDrawing")}
        onClick={toggleExcalidrawView}
      ><ObsidianIcon name={documentView === "excalidraw" ? "text" : "palette"} size={12} /></button>}
      <button
        type="button"
        aria-label={translate(mode === "source" ? "centralEditor.showPreview" : "centralEditor.showEditor")}
        onClick={toggleMode}
      ><ObsidianIcon name={mode === "source" ? "book-open" : "square-pen"} size={12} /></button>
      {allowMaximize && <button
        type="button"
        aria-label={translate(maximized ? "centralEditor.restore" : "centralEditor.maximize")}
        onClick={() => onMaximizedChange(!maximized)}
      ><ObsidianIcon name={maximized ? "minimize-2" : "maximize-2"} size={12} /></button>}
      <button
        type="button"
        aria-label={translate("app.useNormalCentralNode")}
        onClick={onCollapse}
      ><ObsidianIcon name="rectangle-ellipsis" size={12} /></button>
    </div>
    {status === "loading" && <div className="kplex-central-editor-status" aria-live="polite">{translate("centralEditor.loading")}</div>}
    {status === "error" && <div className="kplex-central-editor-status is-error" role="status">{translate("centralEditor.unavailable")}</div>}
  </div>;
}
