/**
 * Windows desktop fullscreen control exclusion, confined to Obsidian's owning document. The host
 * selector is a feature-detected compatibility seam, not a public window-frame API. Only visible
 * client-area control geometry reserves space; missing/hidden/native-frame controls reserve none.
 * A fullscreen-entry lease owns bounded native-container observations, window resize and queued
 * measurement. It never changes body styles, graph width, native controls or browser fullscreen.
 * Actual Windows frame/DPI acceptance remains separate from synthetic geometry tests on macOS.
 */
import { Platform } from "obsidian";

type ChromeRectangle = Readonly<{ left: number; top: number; right: number; bottom: number; width: number; height: number }>;
const CONTROL_SELECTOR = ".titlebar-button-container.mod-right";
const INSET_PROPERTY = "--kplex-window-controls-inset";

/**
 * Return physical-right exclusion only for finite positive client rectangles overlapping both the
 * fullscreen overlay and its actual toolbar band. Clamp to viewport width; hidden controls and a
 * native frame outside the client viewport do not reduce K-Plex's graph or toolbar width.
 */
export function fullscreenControlInset(overlay: ChromeRectangle, toolbar: ChromeRectangle, controls: ChromeRectangle): number {
  for (const rectangle of [overlay, toolbar, controls]) {
    if (![rectangle.left, rectangle.top, rectangle.right, rectangle.bottom, rectangle.width, rectangle.height].every(Number.isFinite)
      || rectangle.width <= 0 || rectangle.height <= 0 || rectangle.right <= rectangle.left || rectangle.bottom <= rectangle.top) return 0;
  }
  if (controls.left >= overlay.right || controls.right <= overlay.left || controls.top >= overlay.bottom || controls.bottom <= overlay.top
    || controls.left >= toolbar.right || controls.right <= toolbar.left || controls.top >= toolbar.bottom || controls.bottom <= toolbar.top) return 0;
  return Math.min(overlay.width, Math.max(0, overlay.right - controls.left));
}

/** Reject detached, CSS-hidden or fully transparent native controls even when their layout rect survives. */
function visibleControlRectangle(control: HTMLElement, ownerWindow: Window): ChromeRectangle | null {
  if (!control.isConnected || control.ownerDocument !== ownerWindow.document) return null;
  let element: HTMLElement | null = control, depth = 0;
  while (element && depth++ < 64) {
    const style = ownerWindow.getComputedStyle(element);
    // Visibility inherits, but a child may explicitly restore visible; opacity/display cannot do so.
    if (style.display === "none" || depth === 1 && (style.visibility === "hidden" || style.visibility === "collapse") || Number(style.opacity) === 0) return null;
    element = element.parentElement;
  }
  return element ? null : control.getBoundingClientRect();
}

/**
 * Acquire one Windows-only fullscreen chrome lease for the overlay's actual window. Measurements
 * read geometry before any CSS write and prepare the existing graph camera before changed inset.
 * Measure against the overlay even when Zen hides its toolbar: maximized editor controls share
 * the same right-hand exclusion and must not depend on a hidden toolbar's empty rectangle.
 * Specific native containers are re-resolved on resize; no whole-body observer or polling exists.
 * Release is idempotent and cancels old-generation queued work before restoring scoped CSS.
 */
export function leaseFullscreenChrome(overlay: HTMLElement, prepareResize: () => void): () => void {
  const ownerWindow = overlay.ownerDocument.defaultView;
  if (!Platform.isDesktop || !Platform.isWin || !ownerWindow) return /** Non-Windows/mobile entry owns no chrome resources or CSS changes. */ () => {};
  const document = overlay.ownerDocument;
  let live = true, queued: number | null = null, prior = 0;
  let controls: HTMLElement[] = [], resizeObserver: ResizeObserver | null = null, mutationObserver: MutationObserver | null = null;
  overlay.addClass("kplex-windows-fullscreen");
  const measure = /** Only the current connected overlay generation can read or publish host geometry. */ (): void => {
    queued = null;
    if (!live || !overlay.isConnected || overlay.ownerDocument !== document) return;
    const overlayRect = overlay.getBoundingClientRect();
    const rectangles = controls.flatMap(/** Read native visibility and geometry before changing the toolbar's exclusion. */ control => {
      const rectangle = visibleControlRectangle(control, ownerWindow);
      return rectangle ? [rectangle] : [];
    });
    const inset = Math.max(0, ...rectangles.map(/** Share visible client-area native control geometry across fullscreen action bars, including Zen. */ rect => fullscreenControlInset(overlayRect, overlayRect, rect)));
    if (inset === prior) return;
    prepareResize(); prior = inset;
    overlay.setCssProps({[INSET_PROPERTY]: `${inset}px`});
  };
  const schedule = /** Coalesce only explicit native geometry events on their acquisition window. */ (): void => {
    if (live && queued === null) queued = ownerWindow.requestAnimationFrame(measure);
  };
  const observe = /** Replace exact container observations when native resize adopts new frame controls. */ (): void => {
    const next = Array.from(document.querySelectorAll<HTMLElement>(CONTROL_SELECTOR));
    if (next.length === controls.length && next.every(/** Stable host nodes retain their existing finite subscriptions. */ (element, index) => element === controls[index])) return;
    resizeObserver?.disconnect(); mutationObserver?.disconnect(); controls = next;
    resizeObserver = typeof ownerWindow.ResizeObserver === "function" ? new ownerWindow.ResizeObserver(schedule) : null;
    mutationObserver = typeof ownerWindow.MutationObserver === "function" ? new ownerWindow.MutationObserver(schedule) : null;
    for (const control of controls) {
      resizeObserver?.observe(control);
      mutationObserver?.observe(control, {attributes: true, childList: true, subtree: true});
    }
  };
  const resize = /** Native frame replacement and viewport resize share a bounded, owning-window measurement. */ (): void => { observe(); schedule(); };
  observe(); ownerWindow.addEventListener("resize", resize); measure();
  return /** Retire every entry-specific resource before old window/overlay state can be reused. */ (): void => {
    if (!live) return;
    live = false;
    if (queued !== null) ownerWindow.cancelAnimationFrame(queued);
    queued = null; ownerWindow.removeEventListener("resize", resize);
    resizeObserver?.disconnect(); mutationObserver?.disconnect(); controls = [];
    overlay.removeClass("kplex-windows-fullscreen"); overlay.style.removeProperty(INSET_PROPERTY);
  };
}
