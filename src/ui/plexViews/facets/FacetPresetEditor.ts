/** Detached native preset draft. Categories retain stable IDs through rename/reorder; source
 * values, assignment and colors are explicit. Save commits one atomic entry through the host. */
import {FormSetting as Setting, formActions, formOptionGroup} from "../../../adapters/obsidian/KplexModal";
import {type App, type ButtonComponent} from "obsidian";
import {StyleEditorModal, labelIconButton} from "../../StyleEditorModal";
import {StyleColorControls} from "../../StyleColorControls";
import type {CanvasViewManagerContext} from "../managerContracts";
import type {FacetPreset, FacetCategory} from "../../../core/plex/views/facets/contracts";
import {isFacetPreset} from "../../../core/plex/views/facets/validation";
import {facetCategoryLabel, facetPresetLabel, facetHasWuXingPhases} from "../../../core/plex/views/facets/labels";
import {FACET_TEMPLATES} from "../../../core/plex/views/facets/templates";
import {canvasViewText} from "../labels";
import {FacetPresetRemoval} from "./FacetPresetRemoval";
import {configurationExpected} from "../../../core/plex/views/configurationPaths";
import {createElement as reactElement} from "react";
import {createRoot, type Root} from "react-dom/client";
import {PredicateRuleEditor} from "../../predicates/PredicateRuleEditor";
import {compileFacetRules} from "../../../core/plex/views/facets/rules";
import {renderDiagnosticSettings} from "./diagnosticSettings";
import {renderFacetLayoutSettings} from "./layoutSettings";
import {renderAreaSizeSettings} from "./areaSizeSettings";
import {FACET_DIAGNOSTIC_ORDER} from "../../../core/plex/views/facets/presentation";
import {renderFacetFlowSettings} from "./flowSettings";
import {renderPresetHelpSettings} from "./helpSettings";
import type {ClipboardSession} from "../../../application/ClipboardSession";
import {copyPortableText, downloadPortableJson} from "../../sharing/portableTransfer";
import {facetPortablePackage} from "./facetSharing";
import {numberSlider} from "../../numberSlider";

export class FacetPresetEditor extends StyleEditorModal {
  private draft: FacetPreset;
  private readonly address: {field: string; path: string[]};
  private readonly expected;
  private readonly owner: () => boolean;
  private body: HTMLElement | null = null;
  private validation: HTMLElement | null = null;
  private saveButton: ButtonComponent | null = null;
  private colors: StyleColorControls | null = null;
  private release: (() => void) | null = null;
  private removal: FacetPresetRemoval | null = null;
  private readonly ruleRoots: Root[] = [];
  private releaseHelp: (() => void) | null = null;
  private clipboard: ClipboardSession | null = null;
  /** Opening captures only this entry; sibling drafts and canvases remain independent. */
  constructor(app: App, private readonly options: CanvasViewManagerContext, private readonly id: string, preset: FacetPreset,
    private readonly existing: boolean, private readonly duplicate: (preset: FacetPreset) => void, private readonly closed: () => void) {
    super(app);this.draft = structuredClone(preset);this.address = {field: "presets", path: [id]};
    this.expected = options.read(this.address);this.owner = options.capture(this.address);
  }
  /** One shared native scrolling body; colors retain the same parent-draft and modal lifecycle. */
  onOpen(): void {
    this.beginEditor(this.options.colors.sourceScope, this.options.colors.bindEditor);const t = this.translate;
    this.modalEl.addClass("kplex-facet-preset-editor");
    this.titleEl.setText(t(this.existing ? "facets.edit" : "facets.create"));
    const {body, actions} = this.scrollableContent();this.body = body;formOptionGroup(body);
    this.validation = actions.createDiv({cls: "setting-item-description", attr: {role: "status", "aria-live": "polite"}});
    const row = formActions(actions);row.settingEl.addClass("kplex-modal-action-row");
    if (this.options.sharing) for (const action of ["copy", "download"] as const) row.addButton(/** Export the visible unsaved draft without committing it. */ button => {
      labelIconButton(button.buttonEl, t(action === "copy" ? "sharing.copyJson" : "sharing.download"), action === "copy" ? "copy" : "download");
      button.onClick(/** Shared canonical export and transfer owners handle the requested gesture. */ () => this.exportDraft(action));
    });
    row.addButton(/** A duplicate opens a separately owned, unsaved preset. */ button => {
      labelIconButton(button.buttonEl, t("facets.duplicate"), "copy-plus");button.onClick(() => {if (this.canEdit()) this.duplicate(this.draft);});
    });
    if (FACET_TEMPLATES[this.id]) row.addButton(/** Reset is visible and remains reversible until Save. */ button => {
      labelIconButton(button.buttonEl, t("facets.restore"), "rotate-ccw");button.onClick(() => {
        if (this.canEdit()) {this.draft = structuredClone(FACET_TEMPLATES[this.id]);this.render();this.validation?.setText(t("facets.resetStatus"));}
      });
    });
    if (this.existing) row.addButton(/** Delete retains the existing explicit replacement dialog. */ button => {
      labelIconButton(button.buttonEl, t("common.delete"), "trash-2");button.setDestructive().onClick(() => {
      if (!this.canEdit() || !this.owner()) return;
      this.removal = new FacetPresetRemoval(this.app, this.options, this.id, this.expected, this.owner,
        deleted => {this.removal = null;if (deleted) this.close();else this.validate();});this.removal.open();
      });
    });
    row.addButton(/** Native Cancel and Escape retain pending-save exclusion. */ button => {
      labelIconButton(button.buttonEl, t("common.cancel"), "x");button.onClick(() => this.close());
    }).addButton(/** Save remains the same validated atomic preset operation. */ button => {
      this.saveButton = button;labelIconButton(button.buttonEl, t("common.save"), "save");button.setCta().onClick(() => this.submit());
    });
    this.release = this.options.subscribe(() => this.validate());this.render();
  }
  /** Rebuild only after explicit structure changes; ordinary typing never replaces/focuses input. */
  private render(): void {
    const body = this.body;if (!body) return;
    const flowOpen = body.querySelector<HTMLDetailsElement>(".kplex-facet-flow-settings")?.open ?? false;
    const helpOpen = body.querySelector<HTMLDetailsElement>(".kplex-facet-help-settings")?.open ?? false;
    this.releaseHelp?.();this.releaseHelp = null;
    for (const root of this.ruleRoots.splice(0)) root.unmount();
    this.colors?.dispose();body.empty();const t = this.translate;
    this.colors = new StyleColorControls(this.app, this.options.colors, () => this.canEdit() && this.owner());
    new Setting(body).setName(t("facets.name")).addText(input => input.setValue(canvasViewText(facetPresetLabel(this.draft), t)).onChange(name => {
      this.draft = {...this.draft, name};this.validate();
    }));
    this.releaseHelp = renderPresetHelpSettings(this.app, body, this.id, /** Keep help edits with the current detached sibling fields. */ () => this.draft,
      /** Preview/reset never publishes a setting; Save retains the existing writer. */ (preset, structural) => {
        if (!this.canEdit() || !this.owner()) return;this.draft = preset;if (structural) this.render();else this.validate();
      }, /** Retire native preview work with its original draft owner. */ () => this.canEdit() && this.owner(), t, helpOpen);
    new Setting(body).setName(t("wuxing.source")).addDropdown(input => input.addOptions({property: t("wuxing.property"), type: t("wuxing.noteType"), tag: t("wuxing.tags"), rules: t("facets.rules")})
      .setValue(this.draft.source).onChange(source => {if (source === "property" || source === "type" || source === "tag" || source === "rules") this.draft = {...this.draft, source};this.render();}));
    if (this.draft.source === "property") new Setting(body).setName(t("wuxing.field")).setDesc(t("wuxing.fieldHelp")).addText(input => input.setValue(this.draft.field).onChange(field => {this.draft = {...this.draft, field};this.validate();}));
    renderFacetLayoutSettings(body, /** Keep sibling settings current through structural rerenders. */ () => this.draft, /** Only this detached preset's structure changes. */ preset => {
      if (!this.canEdit()) return;this.draft = preset;this.render();
    }, t);
    for (const [field, label, help] of [["focusInCategory", "facets.focusInCategory", "facets.focusInCategoryHelp"],
      ["centerAnchoredLinks", "facets.centerAnchoredLinks", "facets.centerAnchoredLinksHelp"]] as const)
      new Setting(body).setName(t(label)).setDesc(t(help)).addToggle(/** Optional values stay inside the captured detached preset. */ input => input
        .setValue(this.draft[field] === true).onChange(/** Save/Cancel/stale-entry guards are shared with every other preset field. */ value => {
          if (this.canEdit() && this.owner()) {this.draft = {...this.draft, [field]: value};this.validate();}
        }));
    new Setting(body).setName(t("facets.start")).addDropdown(input => input.addOptions(Object.fromEntries(this.draft.order.map(id => [id, canvasViewText(facetCategoryLabel(this.draft.categories[id], id), t)])))
      .setValue(this.draft.start).onChange(start => {this.draft = {...this.draft, start};this.render();}));
    for (const [field, label, minimum, maximum, step] of [["spacing", "wuxing.spacing", 24, 200, 8],
      ["regionWidth", "wuxing.width", 200, 640, 20], ["regionHeight", "wuxing.height", 160, 600, 20]] as const)
      numberSlider(new Setting(body).setName(t(label)), {label: t(label), value: this.draft[field], min: minimum, max: maximum, step,
        onChange: value => {if (this.canEdit() && this.owner()) {this.draft = {...this.draft, [field]: value};this.validate();}}});
    for (const [field, label] of [["guides", "wuxing.guides"], ["tints", "wuxing.tints"]] as const)
      new Setting(body).setName(t(label)).addToggle(input => input.setValue(this.draft[field]).onChange(value => {this.draft = {...this.draft, [field]: value};this.validate();}));
    renderFacetFlowSettings(body, /** Read current sibling layout/preset edits. */ () => this.draft,
      /** Guide settings stay inside the same atomic guarded preset Save. */ (preset, structural) => {
        if (!this.canEdit()) return;this.draft = preset;if (structural) this.render();else this.validate();
      }, t, flowOpen);
    renderDiagnosticSettings(body, /** Read current sibling edits before merging one dock control. */ () => this.draft.diagnostics, t, /** Retain all dock edits in this exact guarded native draft. */ (diagnostics, structural) => {
      if (!this.canEdit()) return;
      this.draft = {...this.draft, diagnostics};if (structural) this.render();else this.validate();
    });
    if (facetHasWuXingPhases(this.draft)) {
      new Setting(body).setName(t("facets.relativeLabels")).setDesc(t("facets.wuxingHelp")).addToggle(input => input
        .setValue(this.draft.interpretation === "wuxing" && this.draft.relativeLabels === true).onChange(relativeLabels => {
          this.draft = {...this.draft, interpretation: "wuxing", relativeLabels};this.validate();
        }));
      new Setting(body).setName(t("facets.regulatingGuides")).setDesc(t("facets.cyclesHelp")).addToggle(input => input
        .setValue(this.draft.interpretation === "wuxing" && this.draft.regulatingGuides === true).onChange(regulatingGuides => {
          this.draft = {...this.draft, interpretation: "wuxing", regulatingGuides};this.validate();
        }));
    }
    for (const [index, id] of this.draft.order.entries()) this.category(body, id, index);
    new Setting(body).addButton(button => button.setButtonText(t("facets.addCategory")).setDisabled(this.draft.order.length >= 7).onClick(() => {
      if (!this.canEdit() || this.draft.order.length >= 7) return;
      const id = `category-${this.modalEl.ownerDocument.defaultView?.crypto.randomUUID() ?? ""}`;if (id === "category-") return;
      this.draft = {...this.draft, order: [...this.draft.order, id], categories: {...this.draft.categories,
        [id]: {label: t("facets.newCategory"), values: [], color: {kind: "theme", variable: "--color-cyan"}}}};this.render();
    }));
    for (const [field, label] of [["conflictingColor", "facets.conflicting"], ["unassignedColor", "facets.unassigned"]] as const)
      this.colors.add(body, t(label), {kind: "node", field: "backgroundColor"}, () => this.draft[field], color => {if (color !== undefined) this.draft = {...this.draft, [field]: color};this.validate();}, () => undefined);
    for (const id of ["combined", ...FACET_DIAGNOSTIC_ORDER] as const) {
      body.createEl("h4", {text: t(id === "combined" ? "facets.diagnostics" : id === "unresolved" ? "facets.cannotClassify" : `facets.${id}`)});
      renderAreaSizeSettings(body, "diagnostics", id, /** Exact values read the current detached draft. */ () => this.draft,
        /** Save remains the existing atomic preset operation. */ preset => {if (this.canEdit()) {this.draft = preset;this.validate();}}, t);
    }
    this.validate();
  }
  /** Every category edit replaces its local value only; aliases retain exact trimmed case. */
  private category(body: HTMLElement, id: string, index: number): void {
    const t = this.translate, category = this.draft.categories[id], section = body.createDiv();
    section.createEl("h3", {text: canvasViewText(facetCategoryLabel(category, id), t)});
    new Setting(section).setName(t("wuxing.label")).addText(input => input.setValue(canvasViewText(facetCategoryLabel(category, id), t)).onChange(label => this.changeCategory(id, {label})));
    if (this.draft.source !== "rules") new Setting(section).setName(t("wuxing.values")).setDesc(t("facets.valuesHelp")).addTextArea(input => input.setValue(category.values.join("\n")).onChange(value => this.changeCategory(id, {values: value.split(/\r?\n/).map(part => part.trim()).filter(Boolean)})));
    if (this.draft.source === "property") new Setting(section).setName(t("facets.assignment")).setDesc(t("facets.assignmentHelp")).addText(input => input.setValue(category.assignment ?? "").onChange(assignment => {
      const {assignment: _previous, ...rest} = this.draft.categories[id];
      this.draft = {...this.draft, categories: {...this.draft.categories, [id]: {...rest, ...(assignment.trim() ? {assignment: assignment.trim()} : {})}}};this.validate();
    }));
    if (this.draft.source === "rules") {
      new Setting(section).setName(t("facets.rules")).setDesc(t("facets.rulesHelp"));
      const host = section.createDiv(), root = createRoot(host);this.ruleRoots.push(root);
      root.render(reactElement(PredicateRuleEditor, {initial: category.rule ?? "", translate: t, suggestions: this.options.suggestions?.(),
        onChange: rule => this.changeCategory(id, {rule})}));
    }
    this.colors?.add(section, t("facets.color"), {kind: "node", field: "backgroundColor"}, () => this.draft.categories[id].color,
      color => {if (color !== undefined) this.changeCategory(id, {color});}, () => undefined);
    renderAreaSizeSettings(section, "categories", id, /** Reacquire current sibling category/default edits. */ () => this.draft,
      /** Exact defaults never write per-canvas dimensions or mutate note properties. */ preset => {if (this.canEdit()) {this.draft = preset;this.validate();}}, t);
    new Setting(section).addButton(button => button.setButtonText(t("facets.moveUp")).setDisabled(index === 0).onClick(() => this.move(id, -1)))
      .addButton(button => button.setButtonText(t("facets.moveDown")).setDisabled(index === this.draft.order.length - 1).onClick(() => this.move(id, 1)))
      .addButton(button => button.setButtonText(t("common.delete")).setDisabled(this.draft.order.length <= 3).onClick(() => {
        if (!this.canEdit() || this.draft.order.length <= 3) return;
        const categories = {...this.draft.categories};delete categories[id];const order = this.draft.order.filter(key => key !== id);
        const sizes = {...this.draft.areaSizes?.categories};delete sizes[id];
        this.draft = {...this.draft, categories, order, start: this.draft.start === id ? order[0] : this.draft.start,
          ...(this.draft.areaSizes ? {areaSizes: {...this.draft.areaSizes, categories: sizes}} : {}),
          ...(this.draft.flowOverrides ? {flowOverrides: this.draft.flowOverrides.filter(/** Only references to the explicitly deleted category retire. */ pair => pair.source !== id && pair.target !== id)} : {})};this.render();
      }));
  }
  /** Current drafts preserve unknown category fields while changing one explicit value. */
  private changeCategory(id: string, change: Partial<FacetCategory>): void {
    if (!this.canEdit()) return;
    this.draft = {...this.draft, categories: {...this.draft.categories, [id]: {...this.draft.categories[id], ...change}}};this.validate();
  }
  /** Stable IDs make reordering independent of labels, recognition or assignment values. */
  private move(id: string, offset: number): void {
    if (!this.canEdit()) return;
    const order = [...this.draft.order], index = order.indexOf(id), target = index + offset;
    if (index < 0 || target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];this.draft = {...this.draft, order};this.render();
  }
  /** Stale entry/appearance drafts retain their content and cannot overwrite accepted settings. */
  private validate(): void {
    const valid = this.validDraft();
    const current = this.owner() && configurationExpected(this.options.read(this.address), this.expected);
    this.validation?.setText(!current ? this.translate("facets.staleDraft") : !valid ? this.translate("facets.invalidPreset") : "");
    this.saveButton?.setDisabled(!this.canEdit() || !current || !valid);
  }
  /** Save is atomic at the entry and revalidated inside the existing queued writer. */
  private submit(): void {
    this.validate();if (!this.canEdit() || !this.owner() || !this.validDraft()) return;
    const value = structuredClone(this.draft);
    if (this.expected.present && JSON.stringify(this.expected.value) === JSON.stringify(value)) {this.close();return;}
    this.runOperation(current => this.options.save(this.address, {kind: "set", value}, this.expected, () => current() && this.owner()));
  }
  /** Copy/save exact validated draft JSON using the existing privacy/clipboard/download owners.
   * Dependencies remain opt-in in the manager's reviewed export; no preset or note is saved here. */
  private exportDraft(action: "copy" | "download"): void {
    const sharing = this.options.sharing;
    if (!sharing || !this.canEdit() || !this.owner() || !sharing.current() || !this.validDraft()) return;
    try {
      const text = JSON.stringify(facetPortablePackage(this.id, this.draft, sharing, this.translate), null, 2);
      if (action === "download") {downloadPortableJson(text, this.contentEl);return;}
      this.clipboard?.dispose();this.clipboard = copyPortableText(text, this.contentEl, /** Feedback follows native fulfillment, never a click alone. */ state => {
        if (this.canEdit()) this.validation?.setText(state === "copied" ? this.translate("footprints.copied") : state === "failed" ? this.translate("footprints.copyFailed") : "");
      });
    } catch (error) {console.error("K-Plex preset export refused", error);this.validation?.setText(this.translate("sharing.privacy"));}
  }
  /** A storage rejection retains the exact draft and rechecks current ownership. */
  protected onOperationRejected(): void {this.validate();}
  /** Authored rules must compile through the shared grammar before the existing queue sees them. */
  private validDraft(): boolean {
    return isFacetPreset(this.draft) && !!(this.draft.name.trim() || this.draft.nameKey)
      && (this.draft.source !== "rules" || compileFacetRules(this.draft).status === "ready");
  }
  /** Retire children/color samplers/listeners before clearing the native form. */
  onClose(): void {
    this.clipboard?.dispose();this.clipboard = null;
    this.releaseHelp?.();this.releaseHelp = null;
    for (const root of this.ruleRoots.splice(0)) root.unmount();
    super.onClose();this.removal?.retire();this.removal = null;this.release?.();this.release = null;this.colors?.dispose();this.colors = null;
    this.body = null;this.saveButton = null;this.contentEl.empty();this.closed();
  }
}
