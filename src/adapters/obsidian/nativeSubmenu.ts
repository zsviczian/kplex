/**
 * Native Obsidian submenu compatibility boundary. Obsidian 1.14.2 exposes
 * MenuItem.setSubmenu at runtime, although the installed 1.13 API declarations
 * omit it. The host owns hover, keyboard/touch navigation and menu cleanup.
 */
import type { Menu, MenuItem } from "obsidian";

/** Add a native submenu, falling back to accessible flat actions on hosts without the private capability. */
export function addNativeSubmenu(menu: Menu, title: string, icon: string, populate: (submenu: Menu) => void): void {
  let supported = false;
  menu.addItem(/** Bind the host-owned submenu, or label the flat fallback group. */ (item: MenuItem) => {
    const native = item as MenuItem & { setSubmenu?: () => Menu };
    if (typeof native.setSubmenu !== "function") {
      item.setTitle(title).setIsLabel(true);
      return;
    }
    supported = true;
    item.setTitle(title).setIcon(icon);
    populate(native.setSubmenu());
  });
  if (!supported) populate(menu);
}
