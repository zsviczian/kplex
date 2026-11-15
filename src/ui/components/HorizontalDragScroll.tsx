/** Direction-aware primary/middle-button grab scrolling for a bounded horizontal list. Native touch, wheel and keyboard behavior
 * stay browser-owned. Only a committed mouse drag suppresses its click; cancellation, owner-window
 * blur and unmount release capture and all document listeners without dispatching navigation. */
import {useEffect, useRef, type ReactNode, type RefObject} from "react";

/** Render one horizontal scroll owner; children retain their ordinary click and focus semantics. */
export function HorizontalDragScroll({className, children, directionalLinks = false}: {className: string; children: ReactNode; directionalLinks?: boolean}) {
  const ref = useRef<HTMLDivElement>(null);
  useHorizontalDragScroll(ref, true, undefined, directionalLinks);
  return <div ref={ref} className={className}>{children}</div>;
}

/** Share scrolling on an existing list root; directional links export outward and scroll along the list. */
export function useHorizontalDragScroll(ref: RefObject<HTMLDivElement | null>, enabled = true, ignoreSelector?: string, directionalLinks = false): void {
  useEffect(/** Bind to this mounted list's document, including native popout ownership. */ () => {
    const element = ref.current;
    if (!element || !enabled) return;
    const doc = element.ownerDocument, owner = doc.defaultView;
    let gesture: {id: number; x: number; y: number; dx: number; dy: number; mask: number; left: number; dragging: boolean; touch: boolean; horizontal: boolean} | null = null;
    let suppressClick = false;
    /** Release only this gesture's capture; lost-capture delivery cannot revive retired intent. */
    const finish = (): void => {
      const previous = gesture;gesture = null;
      element.classList.remove("is-mouse-scrolling");
      if (previous && element.hasPointerCapture(previous.id)) element.releasePointerCapture(previous.id);
    };
    /** Unmodified primary input negotiates scroll/export; middle mouse always chooses saved-list scrolling. */
    const down = (event: PointerEvent): void => {
      suppressClick = false;
      const middle = directionalLinks && event.pointerType === "mouse" && event.button === 1;
      if ((!directionalLinks && event.pointerType !== "mouse") || event.button !== 0 && !middle || !event.isPrimary) return;
      finish();
      const target = event.target;
      // Native SVG icons can be adopted from another realm; use document identity, not instanceof.
      if (target && "nodeType" in target && target.nodeType === 1 && "ownerDocument" in target && target.ownerDocument === doc
        && [directionalLinks ? undefined : "[draggable=true]", ignoreSelector].some(selector => selector && (target as Element).closest(selector))) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || element.scrollWidth <= element.clientWidth) return;
      gesture = {id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, dy: 0, mask: middle ? 4 : 1, left: element.scrollLeft, dragging: false, touch: event.pointerType !== "mouse", horizontal: false};
      if (middle) {event.preventDefault();suppressClick = true;}
    };
    /** Commit after a horizontal threshold so a stationary press remains an ordinary node click. */
    const move = (event: PointerEvent): void => {
      if (!gesture || event.pointerId !== gesture.id) return;
      if (!(event.buttons & gesture.mask)) {finish();return;}
      const delta = event.clientX - gesture.x;
      gesture.dx = delta;gesture.dy = event.clientY - gesture.y;
      gesture.horizontal = Math.abs(delta) >= 5 && Math.abs(delta) > Math.abs(gesture.dy);
      // Touch pan remains browser-owned. A horizontal swipe cannot later turn into an exported
      // link or activate its chip; stationary long holds and outward drags remain available.
      if (gesture.touch) {if (gesture.horizontal) suppressClick = true;return;}
      if (!gesture.dragging) {
        if (Math.abs(delta) < 5 || gesture.mask === 1 && Math.abs(delta) <= Math.abs(gesture.dy)) return;
        gesture.dragging = true;suppressClick = true;
        element.setPointerCapture(event.pointerId);element.classList.add("is-mouse-scrolling");
      }
      event.preventDefault();element.scrollLeft = gesture.left - delta;
    };
    /** Finish on matching release/cancellation; the captured drag's synthesized click stays inert. */
    const up = (event: PointerEvent): void => {if (event.pointerId === gesture?.id) finish();};
    /** HTML link drag recognition releases capture before dragstart can be canceled. Its horizontal mouse gesture
     * continues through document listeners until release, cancellation, blur or unmount. */
    const lost = (event: PointerEvent): void => {if (event.target === element && !element.hasPointerCapture(event.pointerId)
      && !(directionalLinks && gesture?.dragging && !gesture.touch)) up(event);};
    /** Horizontal movement scrolls an overflowing saved list; outward native link drags retain their source. */
    const drag = (event: DragEvent): void => {
      if (!directionalLinks || !gesture) return;
      // Native HTML drag recognition can precede our click/scroll threshold. Its coordinates are
      // the press location, so classify with the latest pointer vector instead of losing an early
      // horizontal movement to export. Outward movement keeps the ordinary native drag route.
      const {dx, dy} = gesture;
      if (gesture.dragging || gesture.horizontal || gesture.mask === 4 || !gesture.touch && Math.abs(dx) > Math.abs(dy)) {
        event.preventDefault();event.stopPropagation();suppressClick = true;
        if (!gesture.touch) {gesture.dragging = true;element.classList.add("is-mouse-scrolling");element.scrollLeft = gesture.left - dx;}
      } else finish();
    };
    /** Consume only a pointer-generated post-drag click, preserving keyboard activation. */
    const click = (event: MouseEvent): void => {
      if (!suppressClick || event.detail === 0) return;
      if (event.type === "auxclick" && event.button !== 1) return;
      suppressClick = false;event.preventDefault();event.stopPropagation();
    };
    element.addEventListener("pointerdown", down);
    element.addEventListener("click", click, true);
    element.addEventListener("auxclick", click, true);
    element.addEventListener("dragstart", drag, true);
    element.addEventListener("lostpointercapture", lost);
    doc.addEventListener("pointermove", move, {passive: false});
    doc.addEventListener("pointerup", up);doc.addEventListener("pointercancel", up);
    owner?.addEventListener("blur", finish);
    return () => {
      finish();element.removeEventListener("pointerdown", down);element.removeEventListener("click", click, true);
      element.removeEventListener("auxclick", click, true);
      element.removeEventListener("dragstart", drag, true);
      element.removeEventListener("lostpointercapture", lost);doc.removeEventListener("pointermove", move);
      doc.removeEventListener("pointerup", up);doc.removeEventListener("pointercancel", up);owner?.removeEventListener("blur", finish);
    };
  }, [ref, enabled, ignoreSelector, directionalLinks]);
}
