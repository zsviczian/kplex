/** Mouse grab scrolling for a bounded horizontal list. Native touch, wheel and keyboard behavior
 * stay browser-owned. Only a committed mouse drag suppresses its click; cancellation, owner-window
 * blur and unmount release capture and all document listeners without dispatching navigation. */
import {useEffect, useRef, type ReactNode, type RefObject} from "react";

/** Render one horizontal scroll owner; children retain their ordinary click and focus semantics. */
export function HorizontalDragScroll({className, children}: {className: string; children: ReactNode}) {
  const ref = useRef<HTMLDivElement>(null);
  useHorizontalDragScroll(ref);
  return <div ref={ref} className={className}>{children}</div>;
}

/** Share scrolling on an existing list root; explicit drag handles retain their own gesture. */
export function useHorizontalDragScroll(ref: RefObject<HTMLDivElement | null>, enabled = true, ignoreSelector?: string): void {
  useEffect(/** Bind to this mounted list's document, including native popout ownership. */ () => {
    const element = ref.current;
    if (!element || !enabled) return;
    const doc = element.ownerDocument, owner = doc.defaultView;
    let gesture: {id: number; x: number; y: number; left: number; dragging: boolean} | null = null;
    let suppressClick = false;
    /** Release only this gesture's capture; lost-capture delivery cannot revive retired intent. */
    const finish = (): void => {
      const previous = gesture;gesture = null;
      element.classList.remove("is-mouse-scrolling");
      if (previous && element.hasPointerCapture(previous.id)) element.releasePointerCapture(previous.id);
    };
    /** Plain primary mouse input may scroll; touch/pen and modified clicks retain native actions. */
    const down = (event: PointerEvent): void => {
      suppressClick = false;
      if (event.pointerType !== "mouse" || event.button !== 0 || !event.isPrimary) return;
      finish();
      const target = event.target;
      // Native SVG icons can be adopted from another realm; use document identity, not instanceof.
      if (ignoreSelector && target && "nodeType" in target && target.nodeType === 1 && "ownerDocument" in target && target.ownerDocument === doc
        && (target as Element).closest(ignoreSelector)) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || element.scrollWidth <= element.clientWidth) return;
      gesture = {id: event.pointerId, x: event.clientX, y: event.clientY, left: element.scrollLeft, dragging: false};
    };
    /** Commit after a horizontal threshold so a stationary press remains an ordinary node click. */
    const move = (event: PointerEvent): void => {
      if (!gesture || event.pointerId !== gesture.id) return;
      if (!(event.buttons & 1)) {finish();return;}
      const delta = event.clientX - gesture.x;
      if (!gesture.dragging) {
        if (Math.abs(delta) < 5 || Math.abs(delta) <= Math.abs(event.clientY - gesture.y)) return;
        gesture.dragging = true;suppressClick = true;
        element.setPointerCapture(event.pointerId);element.classList.add("is-mouse-scrolling");
      }
      event.preventDefault();element.scrollLeft = gesture.left - delta;
    };
    /** Finish on matching release/cancellation; the captured drag's synthesized click stays inert. */
    const up = (event: PointerEvent): void => {if (event.pointerId === gesture?.id) finish();};
    /** Consume only a pointer-generated post-drag click, preserving keyboard activation. */
    const click = (event: MouseEvent): void => {
      if (!suppressClick || event.detail === 0) return;
      suppressClick = false;event.preventDefault();event.stopPropagation();
    };
    element.addEventListener("pointerdown", down);
    element.addEventListener("click", click, true);
    element.addEventListener("lostpointercapture", up);
    doc.addEventListener("pointermove", move, {passive: false});
    doc.addEventListener("pointerup", up);doc.addEventListener("pointercancel", up);
    owner?.addEventListener("blur", finish);
    return () => {
      finish();element.removeEventListener("pointerdown", down);element.removeEventListener("click", click, true);
      element.removeEventListener("lostpointercapture", up);doc.removeEventListener("pointermove", move);
      doc.removeEventListener("pointerup", up);doc.removeEventListener("pointercancel", up);owner?.removeEventListener("blur", finish);
    };
  }, [ref, enabled, ignoreSelector]);
}
