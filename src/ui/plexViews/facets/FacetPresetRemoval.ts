/** Explicit deletion replacement covers closed/restored canvases without rewriting their state.
 * One atomic redirect replaces this entry; no other preset or workspace record is removed. */
import {formActions, FormSetting as Setting} from "../../../adapters/obsidian/KplexModal";
import {type App, type ButtonComponent} from "obsidian";
import {StyleEditorModal, labelIconButton} from "../../StyleEditorModal";
import type {CanvasViewManagerContext} from "../managerContracts";
import type {ViewConfigurationExpected} from "../../../core/plex/views/configuration";
import {facetLibrary} from "../../../core/plex/views/facets/configuration";
import {orderedFacetPresets, replaceFacetPreset} from "../../../core/plex/views/facets/state";
import {facetPresetLabel} from "../../../core/plex/views/facets/labels";
import {canvasViewText} from "../labels";
import {isFacetPreset} from "../../../core/plex/views/facets/validation";

export class FacetPresetRemoval extends StyleEditorModal {
  private replacement = "";
  private save: ButtonComponent | null = null;
  private deleted = false;
  /** Parent supplies its exact opening entry and remote ownership, never a current global canvas. */
  constructor(app: App, private readonly options: CanvasViewManagerContext, private readonly id: string,
    private readonly expected: ViewConfigurationExpected, private readonly owner: () => boolean, private readonly closed: (deleted: boolean) => void) {super(app);}
  /** Confirmation starts without a selected replacement; choosing one is always explicit. */
  onOpen(): void {
    this.beginEditor(this.options.colors.sourceScope, this.options.colors.bindEditor);const t = this.translate;
    this.titleEl.setText(t("facets.deletePreset"));this.contentEl.createEl("p", {text: t("facets.deleteHelp")});
    const library = facetLibrary(this.options.configuration());
    const choices = library ? orderedFacetPresets(library).filter(entry => entry.id !== this.id) : [];
    new Setting(this.contentEl).setName(t("facets.replacement")).addDropdown(input => input.addOption("", t("facets.chooseReplacement"))
      .addOptions(Object.fromEntries(choices.map(({id, preset}) => [id, canvasViewText(facetPresetLabel(preset), t)])))
      .setValue("").onChange(value => {this.replacement = value;this.save?.setDisabled(!value || !this.owner());}));
    const actions = formActions(this.contentEl);actions.settingEl.addClass("kplex-modal-action-row");
    actions.addButton(/** Explicit dismissal preserves the installed preset. */ button => {labelIconButton(button.buttonEl, t("common.cancel"), "x");button.onClick(() => this.close());})
      .addButton(/** Delete is available only after choosing a valid replacement. */ button => {this.save = button;labelIconButton(button.buttonEl, t("common.delete"), "trash-2");button.setDestructive().setDisabled(true).onClick(() => {
        if (!this.canEdit() || !this.owner()) return;
        this.runOperation(async current => {
          const currentLibrary = facetLibrary(this.options.configuration());if (!currentLibrary) throw new Error("Preset configuration is unavailable");
          const value = replaceFacetPreset(currentLibrary, this.id, this.replacement);
          const result = await this.options.save({field: "presets", path: [this.id]}, {kind: "set", value}, this.expected,
          () => current() && this.owner() && isFacetPreset(facetLibrary(this.options.configuration())?.presets[this.replacement]));this.deleted = true;return result;});
      });});
  }
  /** Explicit close releases the parent reference without changing canvas intent. */
  onClose(): void {super.onClose();this.save = null;this.contentEl.empty();this.closed(this.deleted);}
}
