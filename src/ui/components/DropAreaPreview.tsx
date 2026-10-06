/**
 * Paints a pointer-transparent drop affordance above canvas content. The caller supplies local
 * viewport geometry and state classes; clipping keeps an offscreen target's edge visible without
 * moving graph content or acquiring host/relationship policy. No listeners or persistence are owned.
 */

/** Keep a target visible inside its viewport, retaining a small edge cue when it lies offscreen. */
export function DropAreaPreview({ left, top, width, height, viewportWidth, viewportHeight, className }: {
  left: number; top: number; width: number; height: number;
  viewportWidth: number; viewportHeight: number; className: string;
}) {
  const minimumWidth = Math.min(16, viewportWidth);
  const minimumHeight = Math.min(16, viewportHeight);
  const visibleLeft = Math.max(0, Math.min(left, viewportWidth - minimumWidth));
  const visibleTop = Math.max(0, Math.min(top, viewportHeight - minimumHeight));
  const visibleWidth = Math.max(minimumWidth, Math.min(left + width, viewportWidth) - visibleLeft);
  const visibleHeight = Math.max(minimumHeight, Math.min(top + height, viewportHeight) - visibleTop);
  return <div aria-hidden="true" className={`kplex-drop-area-preview ${className}`}
    style={{ left: visibleLeft, top: visibleTop, width: visibleWidth, height: visibleHeight }} />;
}
