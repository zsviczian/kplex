/**
 * Pane-fit disclosure shell for native layout controls. The caller supplies localized toggle and
 * control content plus actual container geometry; this portable component owns only element-local
 * touch containment, bounded panel geometry and its listener lifetime, never preferences or storage.
 */
import { useEffect, useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { containNativeTouchGestures } from "./nativeTouchBoundary";

/**
 * Keep the disclosure first in keyboard order and bottom-left when the supplied pane cannot fit
 * the compact rail. Narrow panels render above that entry control and scroll independently of it.
 * Width is pane geometry, not a device classifier; resizing preserves the mounted controls/focus.
 */
export function LayoutControls({ width, height, expanded, toggle, children }: {
  width: number;
  height: number;
  expanded: boolean;
  toggle: ReactNode;
  children: ReactNode;
}) {
  const owner = useRef<HTMLDivElement | null>(null);
  // Seven current rails require 506px including their disclosure; five opposite zoom/display
  // buttons need another 170px plus margins. Fit never changes the caller's typography device.
  const stacked = width < 760 || (height > 0 && height < 300);
  const panelStyle = { "--kplex-layout-panel-height": `${height > 0 ? Math.max(24, height - 112) : 320}px` } as CSSProperties;
  useEffect(/** Bind native bubbling before the surrounding graph's touch listener, then retire on unmount. */ () => {
    const element = owner.current;
    return element ? containNativeTouchGestures(element) : undefined;
  }, []);
  return <div ref={owner} className={`kplex-layout-controls${stacked ? " is-stacked" : ""}`} style={panelStyle}
    onPointerDown={/** Native control pointer defaults remain available; the graph cannot start a drag here. */ (event: PointerEvent<HTMLDivElement>) => event.stopPropagation()}>
    {toggle}
    {expanded && <div className="kplex-layout-panel">{children}</div>}
  </div>;
}
