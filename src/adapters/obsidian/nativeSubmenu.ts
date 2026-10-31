/**
 * Native Obsidian submenu compatibility boundary. Obsidian 1.14.2 exposes
 * MenuItem.setSubmenu at runtime, although the installed 1.13 API declarations
 * omit it. The host owns hover, keyboard/touch navigation and menu cleanup. Selected submenu
 * parents use a label check: Obsidian converts boolean checked states to native checkboxes,
 * which cannot also present submenu children on macOS.
 */
import type { Menu, MenuItem } from "obsidian";

/** Add a native submenu, falling back to accessible flat actions on hosts without the private capability. */
export function addNativeSubmenu(menu: Menu, title: string, icon: string, populate: (submenu: Menu) => void, checked?: boolean): void {
  let supported = false;
  menu.addItem(/** Bind the host-owned submenu, or label the flat fallback group. */ (item: MenuItem) => {
    const native = item as MenuItem & { setSubmenu?: () => Menu };
    if (typeof native.setSubmenu !== "function") {
      item.setTitle(title).setIsLabel(true);
      if (checked !== undefined) item.setChecked(checked);
      return;
    }
    supported = true;
    // Keep checked null for actual submenus. Even false becomes type: "checkbox" in Obsidian's
    // native template and loses the child menu. Leaf actions retain normal native checkmarks.
    item.setTitle(checked ? `✓ ${title}` : title).setIcon(icon);
    if (checked !== undefined) item.setChecked(null);
    populate(native.setSubmenu());
  });
  if (!supported) populate(menu);
}
