/** Bounded native workflow-guide editing inside the existing detached preset draft. Defaults
 * and stable category-pair overrides share one grammar; no relationship or settings writer lives here. */

import {FormSetting as Setting} from "../../../adapters/obsidian/KplexModal";
import type {FacetPreset, FacetFlowStyle} from "../../../core/plex/views/facets/contracts";
import {facetFlowId, facetFlowStyle, facetFlowOrder} from "../../../core/plex/views/facets/flow";
import {facetCategoryLabel} from "../../../core/plex/views/facets/labels";
import {canvasViewText} from "../labels";
import type {Translator} from "../../../lang";

/** Every field merges only its explicit value with the current parent draft, preserving siblings. */
function styleControls(body: HTMLElement, read: () => FacetFlowStyle, change: (patch: FacetFlowStyle) => void, t: Translator): void {
  new Setting(body).setName(t("facets.flowDirection")).addDropdown(/** Values are relative to the actual displayed category order. */ input => input
    .addOptions({forward: t("facets.flowForward"), backward: t("facets.flowBackward"), both: t("facets.flowBoth")}).setValue(read().direction ?? "forward")
    .onChange(/** Unknown values do not enter the draft. */ direction => {if (direction === "forward" || direction === "backward" || direction === "both") change({direction});}));
  new Setting(body).setName(t("facets.flowStyle")).addDropdown(/** Caption-only presentation is independent of real graph connectors. */ input => input
    .addOptions({arrow: t("facets.flowArrow"), line: t("facets.flowLine"), none: t("facets.flowNone")}).setValue(read().style ?? "arrow")
    .onChange(/** Only the three declared stroke policies are writable. */ style => {if (style === "arrow" || style === "line" || style === "none") change({style});}));
  new Setting(body).setName(t("facets.flowCaption")).addText(/** Literal captions remain inert bounded source text. */ input => {
    input.inputEl.maxLength = 80;input.setValue(read().caption ?? "").onChange(/** Empty string explicitly suppresses an inherited caption. */ caption => change({caption}));
  });
  new Setting(body).setName(t("facets.flowCaptionPosition")).addDropdown(/** Position follows the external decorative rail. */ input => input
    .addOptions({start: t("facets.flowStart"), middle: t("facets.flowMiddle"), end: t("facets.flowEnd")}).setValue(read().captionPosition ?? "middle")
    .onChange(/** Presentation-only caption placement cannot create a target. */ captionPosition => {if (captionPosition === "start" || captionPosition === "middle" || captionPosition === "end") change({captionPosition});}));
}

/** Pair overrides follow unordered stable category identities across reversal and category rename.
 * The semantic native disclosure keeps a long preset editor manageable on narrow/mobile surfaces. */
export function renderFacetFlowSettings(body: HTMLElement, read: () => FacetPreset, change: (preset: FacetPreset, structural: boolean) => void, t: Translator, open = false): void {
  const section = body.createEl("details", {cls: "kplex-facet-flow-settings", ...(open ? {attr: {open: ""}} : {})});section.createEl("summary", {text: t("facets.flow")});
  section.createDiv({cls: "setting-item-description", text: t("facets.flowHelp")});
  styleControls(section, /** Read current shared defaults between native field events. */ () => read().flow ?? {},
    /** Merge one default field without freezing pair inheritance. */ patch => change({...read(), flow: {...read().flow, ...patch}}, false), t);
  const preset = read(), order = facetFlowOrder(preset);
  for (const [index, target] of order.slice(1).entries()) {
    const source = order[index], id = facetFlowId(source, target), pair = section.createDiv();
    const override = preset.flowOverrides?.some(/** A pair retains identity when its geometric direction reverses. */ value => facetFlowId(value.source, value.target) === id);
    new Setting(pair).setName(t("facets.flowPair", {source: canvasViewText(facetCategoryLabel(preset.categories[source], source), t), target: canvasViewText(facetCategoryLabel(preset.categories[target], target), t)}))
      .addToggle(/** Removing an override restores the actual preset defaults. */ input => input.setValue(override ?? false).onChange(/** Structural changes show/hide only explicitly enabled pair controls. */ enabled => {
        const current = read(), others = (current.flowOverrides ?? []).filter(/** Other stable pair overrides remain untouched. */ value => facetFlowId(value.source, value.target) !== id);
        change({...current, flowOverrides: enabled ? [...others, {source, target}] : others}, true);
      }));
    if (override) styleControls(pair, /** The displayed effective style follows live defaults while unspecified fields inherit. */ () => facetFlowStyle(read(), source, target),
      /** Store only fields the user explicitly edits for this pair. */ patch => {
        const current = read(), previous = current.flowOverrides?.find(/** Resolve this exact pair in the current detached draft. */ value => facetFlowId(value.source, value.target) === id);
        const others = (current.flowOverrides ?? []).filter(/** Preserve every other stored pair. */ value => facetFlowId(value.source, value.target) !== id);
        change({...current, flowOverrides: [...others, {...previous, source, target, ...patch}]}, false);
      }, t);
  }
}
