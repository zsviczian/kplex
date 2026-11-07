/** Pointer reordering mechanics for a finite list with explicit handles. Caller-owned rows
 * supply stable data-reorder-id keys and a data-reorder-handle control; domain code rechecks
 * captured order before persistence. Ordinary buttons, native drags and touch scroll are untouched.
 * This component owns capture/listeners only in its actual document and retires on migration.
 * Disabling reordering cancels any captured drag while optional body scrolling remains active. */
import {useEffect, useRef, type ReactNode} from "react";
import {useHorizontalDragScroll} from "./HorizontalDragScroll";

/** One relative insertion request; the caller owns semantic identity, persistence and feedback. */
export type ReorderMove = Readonly<{id: string; before: string | null; expected: readonly string[]}>;

/** Native icons can be adopted from another realm without changing their prototype. Validate
 * the event target's actual document instead of rejecting those icons through instanceof. */
function ownedElement(value: EventTarget | null, doc: Document): value is Element {
  return !!value && "nodeType" in value && value.nodeType === 1 && "ownerDocument" in value && value.ownerDocument === doc;
}

/** Dedicated handles may drag with mouse, pen or touch. A stationary handle remains a normal
 * button, allowing the caller's native keyboard-accessible reorder menu to open. */
export function ReorderableList({ids, className, label, children, onMove, grabScroll = false, reorderEnabled = true}: {
  ids: readonly string[]; className: string; label: string; children: ReactNode; onMove: (move: ReorderMove) => void;
  grabScroll?: boolean;
  reorderEnabled?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null), latest = useRef({ids, onMove});latest.current = {ids, onMove};
  useHorizontalDragScroll(root, grabScroll, "[data-reorder-handle]");
  useEffect(/** Capture exact document ownership; migrated/unmounted roots cannot commit old gestures. */ () => {
    const element = root.current, doc = element?.ownerDocument, owner = doc?.defaultView;
    if (!element || !doc || !owner || !reorderEnabled) return;
    let gesture: {pointer: number; id: string; row: HTMLElement; x: number; y: number; expected: readonly string[]; dragging: boolean; before: string | null} | null = null;
    let indicator: Element | null = null, suppressClick = false;
    /** Release only owned capture and visual state; never persist from a cancellation path. */
    const finish = (): void => {
      const old = gesture;gesture = null;indicator?.classList.remove("is-reorder-before");indicator = null;
      element.classList.remove("is-reordering", "is-reorder-end");
      old?.row.classList.remove("is-reorder-source");
      old?.row.style.removeProperty("--reorder-drag-x");
      if (old && element.hasPointerCapture(old.pointer)) element.releasePointerCapture(old.pointer);
    };
    /** Handles alone acquire a gesture, preserving normal saved-note and external drag behavior. */
    const down = (event: PointerEvent): void => {
      suppressClick = false;finish();
      const target = ownedElement(event.target, doc) ? event.target : null;
      const handle = target?.closest("[data-reorder-handle]"), row = handle?.closest<HTMLElement>("[data-reorder-id]");
      if (!row || !element.contains(row) || event.button !== 0 || !event.isPrimary) return;
      const id = row.getAttribute("data-reorder-id");if (!id || !latest.current.ids.includes(id)) return;
      gesture = {pointer: event.pointerId, id, row, x: event.clientX, y: event.clientY, expected: [...latest.current.ids], dragging: false, before: id};
    };
    /** Measure finite current rows only while dragging; scroll offsets are already in these bounds. */
    const move = (event: PointerEvent): void => {
      if (!gesture || gesture.pointer !== event.pointerId) return;
      if (!(event.buttons & 1) || !element.isConnected || element.ownerDocument !== doc) {finish();return;}
      if (!gesture.dragging) {
        if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) < 6) return;
        gesture.dragging = true;suppressClick = true;element.setPointerCapture(event.pointerId);element.classList.add("is-reordering");gesture.row.classList.add("is-reorder-source");
      }
      event.preventDefault();indicator?.classList.remove("is-reorder-before");indicator = null;
      // The source follows input without moving its layout slot or changing insertion geometry.
      // This single dynamic coordinate is retired on every release/cancel/migration path.
      gesture.row.style.setProperty("--reorder-drag-x", `${event.clientX - gesture.x}px`);
      for (const child of Array.from(element.children)) {
        if (!ownedElement(child, doc) || !child.getAttribute("data-reorder-id") || child.getAttribute("data-reorder-id") === gesture.id) continue;
        const bounds = child.getBoundingClientRect();
        if (event.clientX < bounds.left + bounds.width / 2) {indicator = child;break;}
      }
      gesture.before = indicator?.getAttribute("data-reorder-id") ?? null;indicator?.classList.add("is-reorder-before");
      element.classList.toggle("is-reorder-end", !indicator);
    };
    /** A matching release is the only pointer path allowed to request one persistent move. */
    const up = (event: PointerEvent): void => {
      if (!gesture || gesture.pointer !== event.pointerId) return;
      const completed = gesture;finish();
      if (completed.dragging && element.isConnected && element.ownerDocument === doc)
        latest.current.onMove({id: completed.id, before: completed.before, expected: completed.expected});
    };
    /** Cancellation/lost capture/blur never publishes even after crossing the drag threshold. */
    const cancel = (event: PointerEvent): void => {if (event.pointerId === gesture?.pointer) finish();};
    /** Escape cancels this list's gesture without replacing ordinary document keyboard handling. */
    const key = (event: KeyboardEvent): void => {if (gesture && event.key === "Escape") {event.preventDefault();event.stopPropagation();finish();}};
    /** Suppress the drag's synthesized click, retaining subsequent pointer and keyboard activation. */
    const click = (event: MouseEvent): void => {if (suppressClick && event.detail !== 0) {suppressClick = false;event.preventDefault();event.stopPropagation();}};
    element.addEventListener("pointerdown", down);element.addEventListener("click", click, true);element.addEventListener("lostpointercapture", cancel);
    doc.addEventListener("pointermove", move, {passive: false});doc.addEventListener("pointerup", up);doc.addEventListener("pointercancel", cancel);doc.addEventListener("keydown", key, true);owner.addEventListener("blur", finish);
    return () => {
      finish();element.removeEventListener("pointerdown", down);element.removeEventListener("click", click, true);element.removeEventListener("lostpointercapture", cancel);
      doc.removeEventListener("pointermove", move);doc.removeEventListener("pointerup", up);doc.removeEventListener("pointercancel", cancel);doc.removeEventListener("keydown", key, true);owner.removeEventListener("blur", finish);
    };
  }, [reorderEnabled]);
  return <div ref={root} className={className} role="list" aria-label={label}>{children}</div>;
}
