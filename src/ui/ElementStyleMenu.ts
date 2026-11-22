/** Native appearance-source navigation shared by node and connector menus. The production
 * style/lens owners supply ordered sources; this component never evaluates a predicate or graph. */
import type {Menu} from "obsidian";
import type {Translator} from "../lang";
import type {ElementStyleSource} from "../core/contracts/styleSource";
import {addNativeSubmenu} from "../adapters/obsidian/nativeSubmenu";
import {NOTE_TYPE_TAG_LINK_STYLE} from "../core/graph/presentation";

/** One physical tag editor appears once even when tag, prefix and note-type inheritance overlap. */
export function uniqueElementStyleSources(sources: readonly ElementStyleSource[]): ElementStyleSource[] {
  const entries = new Map<string, ElementStyleSource>();
  for (const source of sources) {
    const key = source.kind === "lens" ? `lens:${source.id}` : source.kind === "standard" || source.kind === "ontology" ? `${source.kind}:${source.key}` : `tag:${source.key}`;
    const previous = entries.get(key);
    if (!previous || source.kind === "note-type" || previous.kind === "prefix") entries.set(key, source);
  }
  return [...entries.values()];
}

/** Names distinguish configuration layers from user-authored lens/type/ontology names. */
export function elementStyleSourceLabel(source: ElementStyleSource, translate: Translator): string {
  if (source.kind === "standard") return translate(`colors.standard.${source.key}`);
  if (source.kind === "lens") return translate("styleSources.lens", {name: source.name || translate("filter.untitledLens")});
  if (source.kind === "ontology" && source.key === NOTE_TYPE_TAG_LINK_STYLE) return translate("tagAssignment.linkStyle");
  return translate(source.kind === "ontology" ? "styleSources.ontology" : source.kind === "note-type" ? "styleSources.noteType" : source.kind === "prefix" ? "styleSources.prefix" : "styleSources.tag", {name: source.key});
}

/** Recheck the originating surface on selection; native submenu ownership/cleanup stays shared. */
export function addElementStyleMenu(menu: Menu, sources: readonly ElementStyleSource[], translate: Translator,
  current: () => boolean, open: (source: ElementStyleSource) => void): void {
  const entries = uniqueElementStyleSources(sources);if (!entries.length) return;
  addNativeSubmenu(menu, translate("styleSources.menu"), "palette", submenu => {
    addElementStyleActions(submenu, entries, translate, current, open);
  });
}

/** A dialog action opens the same source choices directly, without a redundant submenu level. */
export function addElementStyleActions(menu: Menu, sources: readonly ElementStyleSource[], translate: Translator,
  current: () => boolean, open: (source: ElementStyleSource) => void): void {
  for (const source of uniqueElementStyleSources(sources)) menu.addItem(item => item.setTitle(elementStyleSourceLabel(source, translate))
    .setIcon(source.kind === "lens" ? "list-filter" : source.kind === "ontology" ? "git-branch" : source.kind === "standard" ? "palette" : "tag")
    .onClick(() => {if (current()) open(source);}));
}
