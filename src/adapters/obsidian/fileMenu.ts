/**
 * Native K-Plex opening menus capture file or unresolved-link targets. Public file-menu covers
 * files; a guarded native link-menu wrapper supplies the missing unresolved-link hook in both
 * editor and reading views. Unload disables retained wrappers and releases the plugin reference.
 */
import { Notice, TFile, normalizePath, parseLinktext, type Menu, type Workspace, type WorkspaceLeaf } from "obsidian";
import type KplexPlugin from "../../main";
import { readObsidianPresentationEnvironment } from "./presentationEnvironment";
import { addNativeSubmenu } from "./nativeSubmenu";

export type FilePlexTarget = "reuse" | "tab" | "split" | "window" | "sidepanel";
/** A missing link retains its exact native source; it never grants file-creation authority. */
export type FilePlexNode = TFile | Readonly<{path: string; source: TFile}>;
type NativeLinkWorkspace = Workspace & {
  handleLinkContextMenu?: (menu: Menu, linktext: string, sourcePath: string, leaf?: WorkspaceLeaf) => boolean;
};

/** Populate identical destinations for a captured file or an existing source's unresolved link. */
function addPlexOpenMenu(plugin: KplexPlugin, menu: Menu, node: FilePlexNode): void {
  const sourcePath = "source" in node ? node.source.path : null;
  const environment = readObsidianPresentationEnvironment();
  addNativeSubmenu(menu, plugin.translator("view.displayName"), "brain-circuit", submenu => {
    const targets: FilePlexTarget[] = environment.device === "phone" ? ["sidepanel"]
      : ["reuse", "tab", "split", "sidepanel", ...(environment.device === "desktop" ? ["window" as const] : [])];
    for (const target of targets) submenu.addItem(item => item
      .setTitle(plugin.translator(`fileMenu.${target}`))
      .setIcon(target === "window" ? "picture-in-picture-2" : target === "split" ? "separator-vertical" : "brain-circuit")
      .onClick(async () => {
        try {
          if ("source" in node && (node.source.path !== sourcePath || plugin.app.vault.getFileByPath(sourcePath ?? "") !== node.source)) return;
          // A newly materialized link opens its actual file, without creating one here.
          const resolved = "source" in node ? plugin.app.metadataCache.getFirstLinkpathDest(node.path, node.source.path) : null;
          await plugin.openFileInKplex(resolved ?? node, target);
        } catch (error) {
          console.error("K-Plex file-menu navigation failed", error);
          new Notice(plugin.translator("ontology.usage.openFailed"));
        }
      }));
  });
}

/** Register public file menus and the feature-detected native hook; all ownership is plugin-scoped. */
export function registerFileMenus(plugin: KplexPlugin): void {
  plugin.registerEvent(plugin.app.workspace.on("file-menu", (menu, file) => {
    if (file instanceof TFile) addPlexOpenMenu(plugin, menu, file);
  }));
  const workspace = plugin.app.workspace as NativeLinkWorkspace;
  const original: unknown = Reflect.get(workspace, "handleLinkContextMenu");
  if (typeof original !== "function") return;
  // Obsidian 1.15 emits file-menu only when the link resolves. Keep its native menu and add
  // the missing target at this one narrow boundary; no editor grammar or DOM hit-test is copied.
  let owner: KplexPlugin | null = plugin;
  const wrapped: NonNullable<NativeLinkWorkspace["handleLinkContextMenu"]> = function(menu, linktext, sourcePath, leaf) {
    const result: unknown = Reflect.apply(original, workspace, [menu, linktext, sourcePath, leaf]);
    if (!owner || !linktext) return result === true;
    const path = normalizePath(parseLinktext(linktext).path.trim());
    const source = owner.app.vault.getFileByPath(sourcePath);
    if (!path || /^[a-z][a-z\d+.-]*:/i.test(path) || !source || owner.app.metadataCache.getFirstLinkpathDest(path, sourcePath)) return result === true;
    addPlexOpenMenu(owner, menu, {path, source});
    return result === true;
  };
  workspace.handleLinkContextMenu = wrapped;
  plugin.register(/** Restore only our own current wrapper; later wrappers may retain an inert passthrough. */ () => {
    owner = null;
    if (workspace.handleLinkContextMenu === wrapped) Reflect.set(workspace, "handleLinkContextMenu", original);
  });
}
