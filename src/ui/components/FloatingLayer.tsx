import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

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
  insideRoots: () => readonly (Node | null | undefined)[];
  onDismiss: (reason: FloatingLayerDismissReason) => void;
  portalTarget: (ownerDocument: Document) => Element | null;
  positioning: FloatingLayerPositioning;
  children: (style: CSSProperties) => ReactNode;
}

function isInsideEvent(event: PointerEvent, roots: readonly (Node | null | undefined)[]): boolean {
  const target = event.target as Node | null;
  const path = event.composedPath();
  return roots.some((root) => {
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

  useLayoutEffect(() => {
    if (!open) return;
    const activeAnchor = anchorRef.current;
    if (!activeAnchor) return;
    const doc = activeAnchor.ownerDocument;
    const view = doc.defaultView;
    if (!view) return;

    let cleaned = false;
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
      const left = Math.max(margin, Math.min(rect.left, view.innerWidth - desiredWidth - margin));
      const top = rect.bottom + positioning.anchorGap;
      setStyle({
        position: "fixed",
        left,
        top,
        width: desiredWidth,
        maxHeight: Math.max(positioning.minimumMaxHeight, view.innerHeight - top - margin),
      });
    };

    const onPointerDown = (event: PointerEvent) => {
      if (isInsideEvent(event, current.current.insideRoots())) return;
      current.current.onDismiss("outside-pointer");
    };
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

    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
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
