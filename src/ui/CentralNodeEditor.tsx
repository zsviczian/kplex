/** Native Obsidian view for a file- or URL-backed central Plex node. Live editor geometry supplies
 * the small-node drawing-fit policy only when opening or switching a drawing, never on rendering.
 * Per-note Markdown scaling affects only native Markdown content; controls, fullscreen and canvas
 * views retain untransformed native geometry and pointer coordinates. */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Notice, type TFile, type WorkspaceLeaf } from "obsidian";
import type KplexPlugin from "../main";
import type { Translator } from "../lang";
import type { GraphPage } from "../types";
import {
  mountEmbeddedMarkdownLeaf,
  type EmbeddedDocumentView,
  type EmbeddedMarkdownLeafController,
  type EmbeddedMarkdownMode,
} from "../adapters/obsidian/embeddedMarkdownLeaf";
import { markdownZoomMode, withMarkdownZoomMode } from "../core/plex/markdownZoomPreferences";
import { ObsidianIcon } from "./ObsidianIcon";
import { EmbeddedWebPage } from "./EmbeddedWebPage";
import { urlEmbed } from "./features/urlEmbed";

/** Own the center’s native file leaf or desktop/mobile web guest, plus local view/maximize controls and the caller-owned shared node menu. */
export function CentralNodeEditor({
  plugin,
  hostLeaf,
  page,
  defaultMode,
  maximized,
  allowMaximize,
  activateHostLeafOnInteraction,
  onModeChange,
  onMaximizedChange,
  onCollapse,
  onOpenMenu,
  onNavigate,
  translate,
}: {
  plugin: KplexPlugin;
  hostLeaf: WorkspaceLeaf;
  page: GraphPage;
  defaultMode: EmbeddedMarkdownMode;
  maximized: boolean;
  allowMaximize: boolean;
  activateHostLeafOnInteraction: boolean;
  onModeChange: (mode: EmbeddedMarkdownMode) => void;
  onMaximizedChange: (maximized: boolean) => void;
  onCollapse: () => void;
  onOpenMenu: (button: HTMLButtonElement) => void;
  onNavigate: (file: TFile) => void;
  translate: Translator;
}) {
  const webTarget = page.url ? urlEmbed(page.url) : null;
  const useWebFrame = Boolean(webTarget);
  const mountRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<EmbeddedMarkdownLeafController | null>(null);
  const fileRef = useRef(page.file);
  const defaultModeRef = useRef(defaultMode);
  const onNavigateRef = useRef(onNavigate);
  const maximizedRef = useRef(maximized);
  const [mode, setMode] = useState<EmbeddedMarkdownMode>(defaultMode);
  const [, refreshMarkdownZoom] = useState(0);
  const scaleMarkdownWithZoom = markdownZoomMode(plugin.settings.centralNodeMarkdownZoomModes, page.path) === "scale";
  const [documentView, setDocumentView] = useState<EmbeddedDocumentView | null>(null);
  const [excalidrawFile, setExcalidrawFile] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  fileRef.current = page.file;
  defaultModeRef.current = defaultMode;
  onNavigateRef.current = onNavigate;
  maximizedRef.current = maximized;

  useLayoutEffect(/** Own a native file leaf only; URL guests have an independent view-scoped lifetime. */ () => {
    const mount = mountRef.current;
    if (!mount || useWebFrame) return;
    let controller: EmbeddedMarkdownLeafController;
    try {
      controller = mountEmbeddedMarkdownLeaf(plugin.app, hostLeaf, mount, (nextFile) => {
        if (nextFile.path !== fileRef.current?.path) onNavigateRef.current(nextFile);
      }, (requiredVersion) => {
        new Notice(plugin.translator("notice.excalidrawUpdateRequired", {
          version: requiredVersion,
        }), 6000);
      }, (nextView) => {
        setDocumentView(nextView);
      }, activateHostLeafOnInteraction, /** Read current preference and editor geometry only at a native opening boundary. */ () =>
        plugin.settings.excalidrawFitOnNodeOpen && !maximizedRef.current);
    } catch (error) {
      console.error("K-Plex failed to create the embedded central leaf.", error);
      setStatus("error");
      return;
    }
    controllerRef.current = controller;
    return () => {
      controllerRef.current = null;
      controller.dispose();
    };
  }, [plugin, hostLeaf, activateHostLeafOnInteraction, useWebFrame]);

  useEffect(/** Route this center to its native file leaf or explicitly opened URL guest without changing history. */ () => {
    const controller = controllerRef.current;
    if (useWebFrame) { setDocumentView(null); setExcalidrawFile(false); setStatus("ready"); return; }
    if (!controller) return;
    let cancelled = false;
    const initialMode = defaultModeRef.current;
    setMode(initialMode);
    setDocumentView(null);
    setExcalidrawFile(false);
    setStatus("loading");
    const openTarget = page.url
      ? controller.openUrl(page.url)
      : page.file
        ? controller.open(page.file, initialMode)
        : Promise.reject(new Error("Central node has no renderable target"));
    void openTarget.then(() => {
      if (cancelled) return;
      setDocumentView(controller.getDocumentView());
      setExcalidrawFile(Boolean(page.file) && plugin.isExcalidrawAvailable() && controller.isExcalidrawFile());
      setStatus("ready");
    }).catch((error: unknown) => {
      console.error(`K-Plex failed to open ${page.path} in the embedded central leaf.`, error);
      if (!cancelled) setStatus("error");
    });
    return () => { cancelled = true; };
  }, [page.path, page.file, page.url, plugin, useWebFrame]);

  useEffect(/** Notify native files when their layout box changes; web guests own their resize observer. */ () => {
    const mount = mountRef.current;
    const controller = controllerRef.current;
    if (!mount || !controller) return;
    type WindowWithResizeObserver = Window & { ResizeObserver: typeof ResizeObserver };
    const viewWindow = (mount.ownerDocument.defaultView ?? window) as WindowWithResizeObserver;
    const observer = new viewWindow.ResizeObserver(/** Resize the owned native view after a settled editor-box change. */ () => controller.resize());
    observer.observe(mount);
    const frame = viewWindow.requestAnimationFrame(/** Complete the first native layout after React mounts the host. */ () => controller.resize());
    return /** Retire callbacks before the native host is detached or moved to a URL guest. */ () => {
      observer.disconnect();
      viewWindow.cancelAnimationFrame(frame);
    };
  }, [plugin, hostLeaf, useWebFrame]);

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

  /** Persist only this note's presentation preference; native leaf ownership and semantic state stay unchanged. */
  const toggleMarkdownZoom = (): void => {
    const next = !scaleMarkdownWithZoom;
    plugin.settings.centralNodeMarkdownZoomModes = withMarkdownZoomMode(
      plugin.settings.centralNodeMarkdownZoomModes, page.path, next ? "scale" : "fixed");
    refreshMarkdownZoom(/** Apply the selected mode immediately without replacing the native leaf. */ revision => revision + 1);
    void plugin.saveSettings(false, true).catch(/** Settle a failed preference write without replacing the active native editor. */ (error: unknown) => {
      console.error("K-Plex failed to save the central-node Markdown zoom preference.", error);
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
    className={`kplex-central-editor-content${maximized ? " is-maximized" : ""}${mode === "source" ? " is-edit-mode" : ""}${documentView === "markdown" && !maximized && scaleMarkdownWithZoom ? " is-markdown-zoom-scaled" : ""}`}
    onPointerDownCapture={/** Native document gestures route commands to its leaf; local buttons keep the Plex active. */ (event) => {
      if (!(event.target as Element).closest(".kplex-central-editor-toolbar")) controllerRef.current?.activate();
    }}
    onFocusCapture={/** Toolbar focus must not activate a synthetic file leaf during collapse. */ (event) => {
      if (!(event.target as Element).closest(".kplex-central-editor-toolbar")) controllerRef.current?.activate();
    }}
  >
    {useWebFrame && webTarget ? <EmbeddedWebPage target={webTarget} label={page.name || page.url || page.path} />
      : <div ref={mountRef} className="kplex-central-editor-leaf-host" />}
    <div className="kplex-central-editor-toolbar" role="toolbar" aria-label={translate("centralEditor.toolbar")}>
      {excalidrawFile && documentView && <button
        type="button"
        aria-label={translate(documentView === "excalidraw" ? "centralEditor.showMarkdown" : "centralEditor.showDrawing")}
        onClick={toggleExcalidrawView}
      ><ObsidianIcon name={documentView === "excalidraw" ? "text" : "palette"} size={12} /></button>}
      {documentView && <button
        type="button"
        aria-label={translate(mode === "source" ? "centralEditor.showPreview" : "centralEditor.showEditor")}
        onClick={toggleMode}
      ><ObsidianIcon name={mode === "source" ? "book-open" : "square-pen"} size={12} /></button>}
      {documentView === "markdown" && !maximized && <button
        type="button"
        data-kplex-markdown-zoom-toggle
        aria-label={translate(scaleMarkdownWithZoom ? "centralEditor.keepTextSize" : "centralEditor.scaleWithZoom")}
        aria-pressed={scaleMarkdownWithZoom}
        onClick={toggleMarkdownZoom}
      ><ObsidianIcon name={scaleMarkdownWithZoom ? "scaling" : "type"} size={12} /></button>}
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
      <button type="button" aria-label={translate("graph.openMenu")}
        onClick={/** Use the graph's existing node actions and host destinations in both editor sizes. */ (event) => onOpenMenu(event.currentTarget)}
      ><ObsidianIcon name="ellipsis-vertical" size={12} /></button>
    </div>
    {status === "loading" && <div className="kplex-central-editor-status" aria-live="polite">{translate("centralEditor.loading")}</div>}
    {status === "error" && <div className="kplex-central-editor-status is-error" role="status">{translate("centralEditor.unavailable")}</div>}
  </div>;
}
