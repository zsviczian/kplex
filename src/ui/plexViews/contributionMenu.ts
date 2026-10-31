/** Compose registered contributions into Obsidian's existing menu and submenu owner. */
import type {Menu} from "obsidian";
import type {Translator} from "../../lang";
import {addNativeSubmenu} from "../../adapters/obsidian/nativeSubmenu";
import type {CapturedCanvasViewMenuItem} from "./contributionContracts";
import {canvasViewText} from "./labels";

/** Optional groups never replace shared entries or gain relationship/file mutation authority. */
export function appendCanvasViewMenu(menu: Menu, items: readonly CapturedCanvasViewMenuItem[], translate: Translator): void {
  for (const item of items) {
    if (item.kind === "separator") {menu.addSeparator(); continue;}
    if (item.kind === "submenu" && item.enabled) {
      addNativeSubmenu(menu, canvasViewText(item.label, translate), item.icon ?? "list", submenu => appendCanvasViewMenu(submenu, item.items, translate), item.checked);
      continue;
    }
    menu.addItem(/** Obsidian owns pointer/keyboard activation and menu teardown. */ native => {
      const reason = item.kind === "action" && item.unavailableReason ? canvasViewText(item.unavailableReason, translate) : "";
      native.setTitle(`${canvasViewText(item.label, translate)}${reason ? ` — ${reason}` : ""}`).setDisabled(!item.enabled);
      if (item.icon) native.setIcon(item.icon);
      if (item.kind === "submenu" && item.checked !== undefined) native.setChecked(item.checked);
      if (item.kind === "action") {
        if (item.checked !== undefined) native.setChecked(item.checked);
        native.onClick(/** Capture grants no authority after a selection/revision/unmount change. */ () => {if (item.enabled) void item.command.run();});
      }
    });
  }
}
