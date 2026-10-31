/**
 * Host-bound canvas menu composition. The caller owns the view, modal/settings effects and native
 * menu lifetime; this builder receives localized copy, current display state and narrow callbacks.
 * Node and relationship menus retain their separate semantic owners.
 */
import { Menu } from "obsidian";
import {addNativeSubmenu} from "../adapters/obsidian/nativeSubmenu";
import type { ActionId } from "../core/plex/actions";
import type { Translator } from "../lang";
import type {CapturedCanvasViewMenuItem} from "./plexViews/contributionContracts";
import {appendCanvasViewMenu} from "./plexViews/contributionMenu";

/** Build the bare-canvas menu with checked display modes and support reporting as the last item. */
export function createPlexContextMenu(options: {
  translate: Translator;
  zen: boolean;
  fullscreen: boolean;
  fullscreenAvailable: boolean;
  runAction: (id: ActionId) => void;
  openSettings: () => void;
  chooseBackground: () => void;
  reportBug: () => void;
  contributions?: readonly CapturedCanvasViewMenuItem[];
  exportBreadcrumbs?: () => void;
  breadcrumbsAvailable?: boolean;
}): Menu {
  const { translate, runAction } = options;
  const menu = new Menu();
  menu.addItem(/** Start/resume the same view session as commands and local shortcuts. */ item => item
    .setTitle(translate("actions.view.wander.start")).setIcon("shuffle")
    .onClick(/** Keep the surface captured by the composing caller. */ () => runAction("view.wander.start")));
  addNativeSubmenu(menu, translate("export.menu"), "download", /** Native menus retain their owning canvas and user activation. */ submenu => {
    submenu.addItem(/** Markdown uses the same captured scene service as the published command. */ item => item
      .setTitle(translate("export.canvasMarkdown")).setIcon("file-output")
      .onClick(/** Dispatch on the composing surface. */ () => runAction("view.export.markdown")));
    submenu.addItem(/** Image output also retains the same toolbar/palette service. */ item => item
      .setTitle(translate("export.canvasImage")).setIcon("image")
      .onClick(/** Dispatch on the composing surface. */ () => runAction("view.export.image")));
    submenu.addItem(/** The native view owns this trail; an empty trail cannot export. */ item => item
      .setTitle(translate("export.breadcrumbsMarkdown")).setIcon("footprints")
      .setDisabled(!options.breadcrumbsAvailable || !options.exportBreadcrumbs)
      .onClick(/** Copy starts before yielding so the native menu gesture remains valid. */ () => {if (options.breadcrumbsAvailable) options.exportBreadcrumbs?.();}));
  });
  menu.addSeparator();
  menu.addItem(/** Native settings owns its existing page and lifetime. */ item => item
    .setTitle(translate("actions.canvasSettings")).setIcon("settings").onClick(options.openSettings));
  menu.addItem(/** Report current Zen state without acquiring or persisting display modes. */ item => item
    .setTitle(translate("actions.canvasZen")).setIcon("scan-eye").setChecked(options.zen)
    .onClick(/** Delegate the exact existing toggle. */ () => runAction("view.zen.toggle")));
  if (options.fullscreenAvailable) menu.addItem(/** Preserve platform availability and current view state. */ item => item
    .setTitle(translate("actions.canvasFullscreen")).setIcon("maximize").setChecked(options.fullscreen)
    .onClick(/** Fullscreen remains independent of Zen. */ () => runAction("view.fullscreen.toggle")));
  menu.addItem(/** Reuse Obsidian's native color control through the caller's owned dialog. */ item => item
    .setTitle(translate("actions.canvasBackground")).setIcon("palette").onClick(options.chooseBackground));
  if (options.contributions?.length) {menu.addSeparator(); appendCanvasViewMenu(menu, options.contributions, translate);}
  menu.addSeparator();
  menu.addItem(/** Invoke support synchronously so its clipboard writer retains native user activation. */ item => item
    .setTitle(translate("support.reportTitle")).setIcon("bug").onClick(options.reportBug));
  return menu;
}
