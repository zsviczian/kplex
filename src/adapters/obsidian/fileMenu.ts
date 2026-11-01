/** Native file menus cover the explorer, file tabs and resolved internal links. */
import { Notice, TFile } from "obsidian";
import type KplexPlugin from "../../main";
import { readObsidianPresentationEnvironment } from "./presentationEnvironment";
import { addNativeSubmenu } from "./nativeSubmenu";

export type FilePlexTarget = "reuse" | "tab" | "split" | "window" | "sidepanel";

/** Register once with plugin-owned cleanup; capture the native file, never a mutable active-file lookup. */
export function registerFileMenus(plugin: KplexPlugin): void {
  plugin.registerEvent(plugin.app.workspace.on("file-menu", (menu, file) => {
    if (!(file instanceof TFile)) return;
    const environment = readObsidianPresentationEnvironment();
    addNativeSubmenu(menu, plugin.translator("view.displayName"), "brain-circuit", submenu => {
      const targets: FilePlexTarget[] = environment.device === "phone" ? ["sidepanel"]
        : ["reuse", "tab", "split", "sidepanel", ...(environment.device === "desktop" ? ["window" as const] : [])];
      for (const target of targets) submenu.addItem(item => item
        .setTitle(plugin.translator(`fileMenu.${target}`))
        .setIcon(target === "window" ? "picture-in-picture-2" : target === "split" ? "separator-vertical" : "brain-circuit")
        .onClick(async () => {
          try { await plugin.openFileInKplex(file, target); }
          catch (error) {
            console.error("K-Plex file-menu navigation failed", error);
            new Notice(plugin.translator("ontology.usage.openFailed"));
          }
        }));
    });
  }));
}
