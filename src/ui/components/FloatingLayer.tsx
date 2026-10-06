/**
 * Portable anchored layers with owner-document dismissal, geometry and optional shared header drag.
 * Consumers own content, focus policy and inside roots; close/unload releases all geometry listeners.
 */
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { enableDraggableDialog } from "./DraggableDialog";

export type FloatingLayerDismissReason = "outside-pointer" | "escape";

export interface FloatingLayerPositioning {
  preferredWidth: number;
  minimumWidth: number;
  viewportMargin: number;
  anchorGap: number;
  minimumMaxHeight: number;
}

export interface FloatingLayerProps {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  panelRef: RefObject<HTMLElement | null>;
  /** Opt into shared pointer dragging; manual coordinates remain local to one open lifetime. */
  dragHandleRef?: RefObject<HTMLElement | null>;
  insideRoots: () => readonly (Node | null | undefined)[];
  onDismiss: (reason: FloatingLayerDismissReason) => void;
  portalTarget: (ownerDocument: Document) => Element | null;
  positioning: FloatingLayerPositioning;
  children: (style: CSSProperties) => ReactNode;
}

/** Treat explicitly registered portal roots and their composed descendants as inside the layer. */
function isInsideEvent(event: PointerEvent, roots: readonly (Node | null | undefined)[]): boolean {
  const target = event.target as Node | null;
  const path = event.composedPath();
  return roots.some(/** Ignore detached optional roots while respecting shadow/portal event paths. */ (root) => {
    if (!root) return false;
    if (path.includes(root)) return true;
    return target ? root.contains(target) : false;
  });
}

/**
 * Host-free owner-document floating-layer mechanics.
 *
 * The consumer owns modal/focus policy beyond Escape restoration, styling, content,
 * and the explicit roots that count as inside the layer.
 */
export function FloatingLayer({
  open,
  anchorRef,
  panelRef,
  dragHandleRef,
  insideRoots,
  onDismiss,
  portalTarget,
  positioning,
  children,
}: FloatingLayerProps) {
  const [style, setStyle] = useState<CSSProperties>({});
  const current = useRef({ insideRoots, onDismiss });
  current.current = { insideRoots, onDismiss };

  const anchor = anchorRef.current;
  const ownerDocument = anchor?.ownerDocument ?? null;
  const target = open && ownerDocument ? portalTarget(ownerDocument) : null;

  useLayoutEffect(/** Bind geometry and dismissal to the anchor's current document for this open lifetime. */ () => {
    if (!open) return;
    const activeAnchor = anchorRef.current;
    if (!activeAnchor) return;
    const doc = activeAnchor.ownerDocument;
    const view = doc.defaultView;
    if (!view) return;

    let cleaned = false;
    let draggedPosition: Readonly<{ left: number; top: number }> | null = null;
    /** Keep anchored sizing while preserving explicitly dragged coordinates across scroll/resize. */
    const updatePosition = () => {
      if (cleaned) return;
      const liveAnchor = anchorRef.current;
      if (!liveAnchor || liveAnchor.ownerDocument !== doc) return;
      const rect = liveAnchor.getBoundingClientRect();
      const margin = positioning.viewportMargin;
      const desiredWidth = Math.min(
        positioning.preferredWidth,
        Math.max(positioning.minimumWidth, view.innerWidth - margin * 2),
      );
      const left = draggedPosition?.left ?? Math.max(margin, Math.min(rect.left, view.innerWidth - desiredWidth - margin));
      const top = draggedPosition?.top ?? rect.bottom + positioning.anchorGap;
      setStyle({
        position: "fixed",
        left,
        top,
        width: desiredWidth,
        maxHeight: Math.max(positioning.minimumMaxHeight, view.innerHeight - top - margin),
      });
    };

    /** Dismiss outside gestures without intercepting controls or registered nested portals. */
    const onPointerDown = (event: PointerEvent) => {
      if (isInsideEvent(event, current.current.insideRoots())) return;
      current.current.onDismiss("outside-pointer");
    };
    /** Escape restores the still-connected trigger in its owning document. */
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      current.current.onDismiss("escape");
      const liveAnchor = anchorRef.current;
      if (liveAnchor?.ownerDocument === doc && liveAnchor.isConnected) liveAnchor.focus({ preventScroll: true });
    };

    const ResizeObserverCtor = view.ResizeObserver;
    const resizeObserver = ResizeObserverCtor ? new ResizeObserverCtor(updatePosition) : null;
    resizeObserver?.observe(activeAnchor);
    if (panelRef.current) resizeObserver?.observe(panelRef.current);

    view.addEventListener("resize", updatePosition);
    doc.addEventListener("scroll", updatePosition, true);
    doc.addEventListener("pointerdown", onPointerDown, true);
    doc.addEventListener("keydown", onKeyDown, true);

    const panel = panelRef.current, handle = dragHandleRef?.current;
    const releaseDrag = panel && handle ? enableDraggableDialog({
      modalEl: panel, handleEl: handle, viewportMargin: positioning.viewportMargin,
      /** React owns inline left/top so subsequent renders cannot overwrite the shared drag helper. */
      onPositionChange: (position) => { draggedPosition = position; updatePosition(); },
    }) : undefined;

    /** Idempotently retire drag, observers and owner-document listeners on close or page teardown. */
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      releaseDrag?.();
      resizeObserver?.disconnect();
      view.removeEventListener("resize", updatePosition);
      doc.removeEventListener("scroll", updatePosition, true);
      doc.removeEventListener("pointerdown", onPointerDown, true);
      doc.removeEventListener("keydown", onKeyDown, true);
      view.removeEventListener("pagehide", cleanup);
    };
    view.addEventListener("pagehide", cleanup);

    updatePosition();
    return cleanup;
  }, [
    open,
    anchorRef,
    panelRef,
    dragHandleRef,
    ownerDocument,
    positioning.anchorGap,
    positioning.minimumMaxHeight,
    positioning.minimumWidth,
    positioning.preferredWidth,
    positioning.viewportMargin,
  ]);

  if (!target) return null;
  return createPortal(children(style), target);
}
