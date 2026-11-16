/** Active-view ownership of Obsidian's mobile navigation bar. Normal tabs dock the native bar
 * into the app layout; immersive views hide it. Exact class/observer leases retire on tab change,
 * navbar replacement, window migration and view/plugin disposal without changing preferences. */
import { Platform } from "obsidian";

type NavigationLease = { update(active: boolean, immersive: boolean): void; dispose(): void };
const owners = new WeakMap<Document, () => void>();
const DOCKED = "kplex-mobile-navbar-docked";
const HIDDEN = "kplex-mobile-navbar-hidden";

/** Native mobile drawers, sliding workspace and backdrop sit above the fullscreen layer. Lease only
 * their stacking order while the canvas is outside the drawer, leaving previews/menus above it.
 * Retire exact classes on exit, unload or migration without changing the drawer's saved state. */
export function leaseMobileFullscreenDrawer(content: HTMLElement): () => void {
  const className = "kplex-fullscreen-drawer";
  const surfaces = Platform.isMobile ? [content.closest(".workspace-drawer"), ...Array.from(content.ownerDocument.querySelectorAll(".workspace-drawer-backdrop, .workspace-split.mod-root.is-sliding-sidebar"))] : [];
  const owned = surfaces.filter((element): element is Element => !!element && !element.classList.contains(className));
  for (const element of owned) element.classList.add(className);
  return () => {for (const element of owned) element.classList.remove(className);};
}

/** Lease only the owning document's native navbar for an active tab or immersive surface.
 * Observe direct app children so native navbar reconstruction is covered without watching graph
 * mutations. Preserve foreign classes/styles, including Excalidraw's independent docking lease. */
export function leaseMobileNavigationChrome(content: HTMLElement): NavigationLease {
  let document: Document | null = null;
  let observer: MutationObserver | null = null;
  let navbar: Element | null = null;
  let ownedClass: string | null = null;
  let immersive = false;
  let disposed = false;

  /** Remove only the exact class this lease added, retaining native/foreign toolbar state. */
  const clearNavbar = (): void => {
    if (navbar && ownedClass) navbar.classList.remove(ownedClass);
    navbar = null; ownedClass = null;
  };
  /** Stop observing the old document before another view or window acquires its native bar. */
  const release = (): void => {
    observer?.disconnect(); observer = null;
    clearNavbar();
    if (document && owners.get(document) === release) owners.delete(document);
    document = null;
  };
  /** Reacquire a replaced native bar without touching its inline styles or mobile preferences. */
  const sync = (): void => {
    const next = document?.querySelector("body > .app-container > .mobile-navbar") ?? null;
    const className = immersive ? HIDDEN : DOCKED;
    if (next === navbar && navbar?.classList.contains(className) && (ownedClass === className || ownedClass === null)) return;
    clearNavbar();
    navbar = next;
    if (navbar && !navbar.classList.contains(className)) {
      navbar.classList.add(className); ownedClass = className;
    }
  };
  return {
    /** The display owner admits active normal tabs or immersive surfaces; all other views release. */
    update(active, hidden): void {
      if (disposed) return;
      immersive = hidden;
      const next = content.ownerDocument;
      if (!active || !Platform.isMobile || !content.isConnected) {release();return;}
      if (document !== next) {
        release(); owners.get(next)?.(); document = next; owners.set(next, release);
        const app = next.querySelector("body > .app-container"), ownerWindow = next.defaultView;
        if (app && ownerWindow) {
          observer = new ownerWindow.MutationObserver(sync);
          observer.observe(app, {childList: true});
        }
      }
      sync();
    },
    /** Closing a view/plugin releases host chrome even if React never completed its next render. */
    dispose(): void { if (disposed) return; disposed = true; release(); },
  };
}
