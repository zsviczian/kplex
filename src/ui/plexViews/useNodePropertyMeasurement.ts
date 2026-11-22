/** View-local font measurement lifetime. CSS/font/owner changes refresh one cached reader and
 * presentation capability; there is no source, semantic-index or persistent-settings access. */
import {useLayoutEffect, useState, type RefObject} from "react";
import type {NodePropertyMeasure} from "../../core/plex/nodeProperties";
import {NodePropertyTextMeasurement} from "./NodePropertyTextMeasurement";

/** Bind metrics only after the actual viewport is attached, retaining an explicit preconnected fallback. */
export function useNodePropertyMeasurement(rootRef: RefObject<HTMLElement | null>, fontSize: number, lifetime: number,
  subscribeCss: (changed: () => void) => () => void): NodePropertyMeasure | undefined {
  const [port, setPort] = useState<Readonly<{measure: NodePropertyMeasure}> | undefined>();
  useLayoutEffect(/** Every callback fences the captured document; migration rebinds instead of borrowing the main realm. */ () => {
    const root = rootRef.current;if (!root) return;
    let alive = true, releaseBinding: (() => void) | null = null, owner: Document | null = null;
    /** Retire the previous document before publishing another reader for this exact native viewport. */
    const bind = (): void => {
      releaseBinding?.();const document = root.ownerDocument;owner = document;
      const view = document.defaultView;if (!view || !root.isConnected) return;
      const reader = new NodePropertyTextMeasurement(root, fontSize);let active = true;
      /** A new capability identity retires the caller's per-page WeakMap when font metrics change. */
      const publish = (): void => {setPort({measure: /** Delegate only through this captured document's current reader. */ line => reader.measure(line)});};
      /** Old resource events cannot clear or replace a successor document's metric capability. */
      const changed = (force = false): void => {
        if (!alive || !active || rootRef.current !== root || root.ownerDocument !== document || view.closed) return;
        if (reader.refresh(force)) publish();
      };
      const constructors = view as Window & {HTMLElement: typeof HTMLElement; MutationObserver: typeof MutationObserver; ResizeObserver?: typeof ResizeObserver};
      const observer = new constructors.MutationObserver(/** Theme and inherited font attributes are context changes, not node mutations. */ () => changed());
      const targets = new Set([root, document.body, document.documentElement, root.closest(".kplex-app")].filter(/** Detached optional theme roots grant no measurement authority. */ (element): element is HTMLElement => element instanceof constructors.HTMLElement));
      for (const target of targets) observer.observe(target, {attributes: true, attributeFilter: ["class", "style"]});
      const resize = constructors.ResizeObserver ? new constructors.ResizeObserver(/** Media-query font changes are sampled once after viewport geometry changes. */ () => changed()) : null;
      resize?.observe(root);
      /** A settled font load may replace glyphs even when the computed CSS signature is unchanged. */
      const loaded = (): void => changed(true);document.fonts.addEventListener("loadingdone", loaded);document.fonts.addEventListener("loadingerror", loaded);
      const releaseCss = subscribeCss(/** Native CSS/font settings share the same property-only invalidation. */ () => changed());
      const fonts = document.fonts;publish();
      releaseBinding = /** Dispose through the exact window/font set even after an Obsidian document migration. */ () => {
        active = false;observer.disconnect();resize?.disconnect();fonts.removeEventListener("loadingdone", loaded);fonts.removeEventListener("loadingerror", loaded);releaseCss();reader.dispose();
      };
    };
    bind();
    const releaseMigration = root.onWindowMigrated?.(/** Only a genuine document change replaces the cached shaping realm. */ () => {if (alive && root.ownerDocument !== owner) bind();});
    return /** Unmount never publishes another state update or retains the outgoing popout document. */ () => {alive = false;releaseMigration?.();releaseBinding?.();};
  }, [rootRef, fontSize, lifetime, subscribeCss]);
  return port?.measure;
}
