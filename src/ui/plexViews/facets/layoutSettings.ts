/** Native layout defaults and a semantic anchor schematic. The existing preset editor owns
 * the detached draft, Save/Cancel, conflict checks and component lifetime. No graph data is read. */

import {FormSetting as Setting} from "../../../adapters/obsidian/KplexModal";
import type {FacetPreset} from "../../../core/plex/views/facets/contracts";
import {FACET_LAYOUTS, isFacetLayout} from "../../../core/plex/views/facets/presentation";
import type {Translator} from "../../../lang";
import {facetCategoryLabel} from "../../../core/plex/views/facets/labels";
import {canvasViewText} from "../labels";

/** Layout/anchor choices rerender only this small native draft, never a native note editor. */
export function renderFacetLayoutSettings(body: HTMLElement, read: () => FacetPreset, change: (preset: FacetPreset) => void, t: Translator): void {
  const preset = read();
  new Setting(body).setName(t("facets.layout")).addDropdown(/** The same stable layout catalog serves the captured canvas choice. */ input => {
    for (const id of FACET_LAYOUTS) input.addOption(id, t(`facets.layout.${id}`));
    const quadrants = input.selectEl.querySelector<HTMLOptionElement>('option[value="quadrants"]');if (quadrants) quadrants.disabled = preset.order.length !== 4;
    input.setValue(preset.layout ?? "circular").onChange(/** Ignore unknown control output and preserve the four-category guard. */ layout => {
      if (isFacetLayout(layout) && (layout !== "quadrants" || read().order.length === 4)) change({...read(), layout});
    });
  });
  if (preset.layout === "concentric") body.createDiv({cls: "setting-item-description", text: t("facets.bandSizeHelp")});
  new Setting(body).setName(t("facets.reverseOrder")).addToggle(/** Reversal changes placement only. */ input => input.setValue(preset.reverse ?? false)
    .onChange(/** Classification and canonical category identities remain unchanged. */ reverse => change({...read(), reverse})));
  if (preset.layout !== "horizontal" && preset.layout !== "vertical") return;
  const anchor = preset.focusAnchor ?? (preset.layout === "horizontal" ? "top" : "left");
  new Setting(body).setName(t("facets.focusAnchor")).addDropdown(/** Cardinal anchor is independent of ordered-category reversal. */ input => input
    .addOptions({top: t("position.above"), bottom: t("position.below"), left: t("position.left"), right: t("position.right")}).setValue(anchor)
    .onChange(/** Only declared cardinal positions can enter the saved layout configuration. */ focusAnchor => {
      if (focusAnchor === "top" || focusAnchor === "bottom" || focusAnchor === "left" || focusAnchor === "right") change({...read(), focusAnchor});
    }));
  const schematic = body.createDiv({cls: `kplex-facet-anchor-preview is-anchor-${anchor} is-${preset.layout}`, attr: {role: "img", "aria-label": t("facets.anchorPreview")}});
  schematic.createSpan({cls: "kplex-facet-anchor-focus", text: t("facets.focus")});
  const categories = schematic.createDiv({cls: "kplex-facet-anchor-categories"});
  for (const id of preset.order) categories.createSpan({text: canvasViewText(facetCategoryLabel(preset.categories[id], id), t)});
}
