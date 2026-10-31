/** Host presentation of a portable preset. Managers and unsaved preset drafts resolve the same
 * literal labels/localized Help and delegate privacy, dependencies and validation to core. */
import {getLanguage} from "obsidian";
import type {FacetPreset} from "../../../core/plex/views/facets/contracts";
import {facetCategoryLabel, facetPresetLabel} from "../../../core/plex/views/facets/labels";
import {exportFacetPackage} from "../../../core/plex/sharing/transfer";
import {FACETS_AUTHORING_CONTEXT} from "../../../core/plex/sharing/authoring";
import type {Translator} from "../../../lang";
import type {PortableSharingContext} from "../../sharing/contracts";
import {canvasViewText} from "../labels";
import {effectiveFacetHelp} from "./help";

/** Export only the supplied definition and explicitly selected lens dependencies; live activation is absent. */
export function facetPortablePackage(id: string, preset: FacetPreset, sharing: Pick<PortableSharingContext, "read">, translate: Translator,
  selected: readonly string[] = [], allowPrivate = false) {
  const state = sharing.read();
  return exportFacetPackage(id, preset, {name: canvasViewText(facetPresetLabel(preset), translate),
    labels: Object.fromEntries(preset.order.map(/** Stable identities resolve to effective literal display labels. */ key => [key, canvasViewText(facetCategoryLabel(preset.categories[key], key), translate)])),
    helpMarkdown: effectiveFacetHelp(id, preset, translate), locale: (preset.helpSourceLocale ?? getLanguage()) || "en"},
  state.palette, state.lenses, selected, FACETS_AUTHORING_CONTEXT, allowPrivate);
}
