/**
 * Element-local native touch containment for controls embedded in gesture-owning surfaces. This
 * portable DOM helper keeps browser defaults intact, owns no pointer capture or timing state, and
 * returns the exact listener teardown to the rendering owner. It never acquires a document listener.
 */

/**
 * Stop a control-origin touch stream before it bubbles to surrounding canvas/sidebar recognizers.
 * Native touch events retain their initial target for the gesture, including movement outside the
 * owner's rectangle; browser range dragging and bounded scrolling remain the native default action.
 * @returns Idempotent cleanup for every listener installed on this exact element.
 * @remarks Ancestor capture listeners have already run; this is not a claim to override that phase.
 */
export function containNativeTouchGestures(owner: HTMLElement): () => void {
  /** Contain propagation only; canceling the default could disable the native control being repaired. */
  const contain = (event: TouchEvent) => event.stopPropagation();
  const events = ["touchstart", "touchmove", "touchend", "touchcancel"] as const;
  for (const type of events) owner.addEventListener(type, contain, { passive: true });
  let disposed = false;
  /** Release only this owner's exact listeners, without retaining detached controls or gesture state. */
  return () => {
    if (disposed) return;
    disposed = true;
    for (const type of events) owner.removeEventListener(type, contain);
  };
}
