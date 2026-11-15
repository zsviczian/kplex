/** A shared, nonmodal tip strip for contextual canvas instructions.
 * Callers supply prioritized content; this owner has no timers, host state or keyboard listeners. */
import type {ReactNode} from "react";

/** Mount in the viewport, outside its zero-size transformed camera, to keep instructions readable
 * and stationary without intercepting canvas gestures. */
export function CanvasUsageTips({children, contextual = false}: {children?: ReactNode; contextual?: boolean}) {
  if (!children) return null;
  return <div className={`kplex-canvas-usage-tips${contextual ? " is-contextual" : ""}`} role={contextual ? "status" : undefined} aria-live={contextual ? "polite" : undefined}>{children}</div>;
}
