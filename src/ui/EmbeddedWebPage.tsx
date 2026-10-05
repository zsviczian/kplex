/** View-owned desktop webview/mobile iframe; mounted only after explicit central-editor expansion. */
import { useLayoutEffect, useRef } from "react";
import { Platform } from "obsidian";
import type { UrlEmbed } from "./features/urlEmbed";

/** Fit the requested video ratio into both dimensions without cropping; ordinary pages fill the node. */
export function EmbeddedWebPage({ target, label }: { target: UrlEmbed; label: string }) {
  const host = useRef<HTMLDivElement>(null);
  useLayoutEffect(/** Desktop guest browsing preserves host authentication; mobile uses the supported iframe surface. */ () => {
    const mount = host.current;
    if (!mount) return;
    const frame = Platform.isMobile
      ? mount.createEl("iframe")
      : mount.createEl("webview" as keyof HTMLElementTagNameMap);
    frame.classList.add("kplex-embedded-web-frame");
    frame.setAttribute("aria-label", label);
    frame.setAttribute("title", label);
    if (frame.tagName.toLowerCase() === "iframe") {
      frame.setAttribute("allow", "fullscreen; picture-in-picture; encrypted-media");
      frame.setAttribute("allowfullscreen", "");
      frame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-popups allow-presentation");
      frame.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    }
    frame.setAttribute("src", target.url);
    const ownerWindow = mount.ownerDocument.defaultView ?? window;
    /** Fit against layout dimensions before Plex camera scaling; fixed ratios never overflow the editor. */
    const fit = (): void => {
      const width = mount.clientWidth, height = mount.clientHeight;
      const ratio = target.aspectRatio;
      const frameWidth = ratio ? Math.min(width, height * ratio) : width;
      const frameHeight = ratio ? frameWidth / ratio : height;
      frame.setCssProps({ width: `${frameWidth}px`, height: `${frameHeight}px` });
    };
    const Resize = (ownerWindow as Window & { ResizeObserver: typeof ResizeObserver }).ResizeObserver;
    const observer = new Resize(fit);
    observer.observe(mount); fit();
    return /** Removing the view-owned frame tears down guest content and its observer on collapse/navigation. */ () => {
      observer.disconnect(); frame.remove();
    };
  }, [target.url, target.aspectRatio, label]);
  return <div className="kplex-embedded-web-page" ref={host} />;
}
