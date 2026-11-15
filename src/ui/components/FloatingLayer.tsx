/**
 * Portable anchored layers with owner-document dismissal, geometry and optional shared header drag.
 * Ancestors may mark a data-floating-layer-boundary to keep every disclosure within a bounded
 * host instead of underneath adjacent host chrome. Consumers own content and focus policy.
 */
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { enableDraggableDialog } from "./DraggableDialog";

export type FloatingLayerDismissReason = "outside-pointer" | "escape" | "anchor-hidden";

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
  /** Body portals may outlive a hidden native tab's trigger; opt in to ending that disclosure. */
  dismissWhenAnchorHidden?: boolean;
  /** Let a nested owning surface receive Escape before this layer consumes it or restores focus. */
  handleEscape?: (event: KeyboardEvent) => boolean;
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
  dismissWhenAnchorHidden = false,
  handleEscape,
  portalTarget,
  positioning,
  children,
}: FloatingLayerProps) {
  const [style, setStyle] = useState<CSSProperties>({});
  const current = useRef({ insideRoots, onDismiss, handleEscape });
  current.current = { insideRoots, onDismiss, handleEscape };

  const anchor = anchorRef.current;
  const ownerDocument = anchor?.ownerDocument ?? null;
  const boundary = anchor?.closest<HTMLElement>("[data-floating-layer-boundary]") ?? null;
  const target = open && ownerDocument ? boundary ?? portalTarget(ownerDocument) : null;

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
      if (dismissWhenAnchorHidden && (!liveAnchor.getClientRects().length || !rect.width || !rect.height)) {
        current.current.onDismiss("anchor-hidden");
        return;
      }
      const visual = view.visualViewport, scope = boundary?.getBoundingClientRect();
      const originLeft = scope && boundary ? scope.left + boundary.clientLeft - boundary.scrollLeft : 0;
      const originTop = scope && boundary ? scope.top + boundary.clientTop - boundary.scrollTop : 0;
      const boundsLeft = Math.max(visual?.offsetLeft ?? 0, scope?.left ?? 0);
      const boundsTop = Math.max(visual?.offsetTop ?? 0, scope?.top ?? 0);
      const boundsRight = Math.min((visual?.offsetLeft ?? 0) + Math.min(view.innerWidth, visual?.width ?? view.innerWidth), scope?.right ?? Infinity);
      const boundsBottom = Math.min((visual?.offsetTop ?? 0) + Math.min(view.innerHeight, visual?.height ?? view.innerHeight), scope?.bottom ?? Infinity);
      const margin = Math.min(positioning.viewportMargin, Math.max(0, (boundsRight - boundsLeft) / 2));
      const desiredWidth = Math.max(0, Math.min(Math.max(positioning.minimumWidth, positioning.preferredWidth), boundsRight - boundsLeft - margin * 2));
      const left = Math.max(boundsLeft + margin, Math.min(draggedPosition?.left ?? rect.left, boundsRight - desiredWidth - margin));
      const below = boundsBottom - rect.bottom - positioning.anchorGap - margin;
      const above = rect.top - boundsTop - positioning.anchorGap - margin;
      const preferredTop = below < positioning.minimumMaxHeight && above > below
        ? rect.top - positioning.anchorGap - Math.min(panelRef.current?.scrollHeight || positioning.minimumMaxHeight, above)
        : rect.bottom + positioning.anchorGap;
      const top = Math.max(boundsTop + margin, Math.min(draggedPosition?.top ?? preferredTop, boundsBottom - Math.min(positioning.minimumMaxHeight, Math.max(0, boundsBottom - boundsTop - margin * 2)) - margin));
      setStyle({
        position: boundary ? "absolute" : "fixed",
        left: left - originLeft,
        top: top - originTop,
        width: desiredWidth,
        maxHeight: Math.max(0, boundsBottom - top - margin),
      });
    };

    /** Dismiss outside gestures without intercepting controls or registered nested portals. */
    const onPointerDown = (event: PointerEvent) => {
      if (isInsideEvent(event, current.current.insideRoots())) return;
      current.current.onDismiss("outside-pointer");
    };
    /** Escape restores the still-connected trigger in its owning document. */
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || current.current.handleEscape?.(event) === false) return;
      event.preventDefault();
      event.stopPropagation();
      current.current.onDismiss("escape");
      const liveAnchor = anchorRef.current;
      if (liveAnchor?.ownerDocument === doc && liveAnchor.isConnected) liveAnchor.focus({ preventScroll: true });
    };

    const ResizeObserverCtor = view.ResizeObserver;
    const resizeObserver = ResizeObserverCtor ? new ResizeObserverCtor(updatePosition) : null;
    resizeObserver?.observe(activeAnchor);
    if (boundary) resizeObserver?.observe(boundary);
    if (panelRef.current) resizeObserver?.observe(panelRef.current);

    view.addEventListener("resize", updatePosition);
    view.visualViewport?.addEventListener("resize", updatePosition);
    view.visualViewport?.addEventListener("scroll", updatePosition);
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
      view.visualViewport?.removeEventListener("resize", updatePosition);
      view.visualViewport?.removeEventListener("scroll", updatePosition);
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
    dismissWhenAnchorHidden,
    anchorRef,
    panelRef,
    dragHandleRef,
    ownerDocument,
    boundary,
    positioning.anchorGap,
    positioning.minimumMaxHeight,
    positioning.minimumWidth,
    positioning.preferredWidth,
    positioning.viewportMargin,
  ]);

  if (!target) return null;
  return createPortal(children(style), target);
}
