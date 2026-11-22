/** Compact native optional-default editor embedded in the existing type/style form.
 * It owns a detached ordered draft and a cache-only preview; persistence belongs to the parent Save. */
import {FormSetting as Setting, iconButton} from "../adapters/obsidian/KplexModal";
import type {ButtonComponent} from "obsidian";
import {MAX_NODE_PROPERTIES, nodePropertyFontSize, validNodeProperties, loadNodePropertyRows, mergedNodePropertyRows, type NodeProperty, type NodePropertyLine} from "../core/plex/nodeProperties";
import {normalizeFieldName} from "../core/contracts/fieldName";
import type {Translator} from "../lang";
import {appendNodePropertyCaption} from "./NodePropertyCaption";

export type NodeDetailsOptions = Readonly<{rows: readonly NodeProperty[];
  focusProperties?: boolean;
  propertyFontSize?: number;
  common?: boolean;
  inheritedRows?: readonly NodeProperty[];
  suggestIcon?: (input: HTMLInputElement) => () => void;
  preview(type: string, rows: readonly NodeProperty[]): Readonly<{title: string; path?: string; lines: readonly NodePropertyLine[]}>;
}>;

export class NodeDetailsFields {
  readonly element: HTMLElement;
  private readonly list: HTMLElement;
  private readonly preview: HTMLElement;
  private rows: NodeProperty[];
  private addButton?: ButtonComponent;
  private suggestionReleases: Array<() => void> = [];
  /** Reuse native fields/toggles/icon actions; adding/reordering never writes settings or a note. */
  constructor(container: HTMLElement, private readonly t: Translator,
    private readonly options: NodeDetailsOptions, private readonly type: () => string, private readonly current: () => boolean) {
    this.rows = options.rows.map(/** All controls edit a detached draft until the parent submits. */ row => ({...row}));this.element = container.createDiv({cls: "kplex-node-details-editor"});
    if (!options.common) this.element.createEl("h3", {text: t("nodeProperties.title")});
    this.element.createEl("p", {text: t(options.common ? "nodeProperties.commonHelp" : "nodeProperties.help"), cls: "setting-item-description"});
    this.list = this.element.createDiv();
    new Setting(this.element).addButton(/** The native action shares the same bound for common and type configurations. */ button => {this.addButton = iconButton(button, t("nodeProperties.add"), "plus").onClick(/** Add one unfinished draft row and focus its actual field-name input. */ () => {
      if (!this.current() || this.rows.length >= MAX_NODE_PROPERTIES) return;this.rows.push({field: "", visible: true});this.render();
      this.list.querySelectorAll<HTMLInputElement>(".kplex-node-detail-field input").item(this.rows.length - 1)?.focus();
    });});
    this.preview = this.element.createDiv({cls: "kplex-node-details-preview"});this.render();
  }

  /** Return a validated detached snapshot only when the parent submits its full form. */
  read(): readonly NodeProperty[] {if (!validNodeProperties(this.rows)) throw new Error(this.t("nodeProperties.invalid"));return loadNodePropertyRows(this.rows);}

  /** Release this form's native suggestion leases before rerender, migration or dismissal. */
  dispose(): void {for (const release of this.suggestionReleases.splice(0)) release();}

  /** Type-name edits update this compact sample without rediscovering note types or source bodies. */
  refreshPreview(): void {
    if (!this.preview || !this.current()) return;this.preview.empty();this.preview.toggle(this.rows.some(/** An unfinished empty list has no useful preview source. */ row => row.field.trim()));
    if (!this.rows.some(/** Keep preview creation absent until a field is actually named. */ row => row.field.trim())) return;
    const sample = this.options.preview(this.type(), this.rows);
    this.preview.createEl("p", {text: sample.title ? this.t("nodeProperties.previewSource", {path: sample.path ?? sample.title}) : this.t(this.options.common ? "nodeProperties.noCommonPreviewNote" : "nodeProperties.noPreviewNote"), cls: "setting-item-description"});
    if (!sample.lines.length) {if (sample.title) this.preview.createEl("p", {text: this.t("nodeProperties.noPreviewValues"), cls: "setting-item-description"});return;}
    this.preview.style.setProperty("--kplex-node-property-font-size", `${nodePropertyFontSize(this.options.propertyFontSize)}px`);
    const caption = this.preview.createSpan({cls: "kplex-thought-caption"});caption.createSpan({text: sample.title, cls: "kplex-thought-label"});
    const lines = caption.createSpan({cls: "kplex-node-properties"});for (const line of sample.lines) appendNodePropertyCaption(lines, line);
  }

  /** Each row shares one native input/control layout, with explicit accessible names and no double tooltip. */
  private render(): void {
    if (!this.current()) return;this.dispose();this.list.empty();this.addButton?.setDisabled(this.rows.length >= MAX_NODE_PROPERTIES);
    this.rows.forEach(/** Every property keeps its visible name and all optional controls together in one native group. */ (row, index) => {
      const effective = mergedNodePropertyRows(this.options.inheritedRows, [row]).find(/** The type editor shows the same effective optional flags as creation and node details. */ candidate => normalizeFieldName(candidate.field) === normalizeFieldName(row.field)) ?? row;
      const group = this.list.createDiv({cls: "kplex-node-detail-group"});
      const setting = new Setting(group).setName(this.t("nodeProperties.field"));setting.settingEl.addClass("kplex-node-detail-row", "kplex-node-detail-field");
      setting.addText(/** Property identity remains editable independently of its optional visible label. */ input => {input.inputEl.setAttribute("aria-label", this.t("nodeProperties.field"));input.setValue(row.field).setPlaceholder(this.t("nodeProperties.field"))
        .onChange(/** Renaming a draft field updates only its local preview. */ field => {if (this.current()) {this.rows[index] = {...this.rows[index], field};this.refreshPreview();}});})
        .addButton(/** Reordering does not write or alter a neighboring field. */ button => iconButton(button, this.t("facets.moveUp"), "arrow-up").setDisabled(index === 0).onClick(/** Move this row one position earlier. */ () => this.move(index, -1)))
        .addButton(/** The final row has no later insertion position. */ button => iconButton(button, this.t("facets.moveDown"), "arrow-down").setDisabled(index === this.rows.length - 1).onClick(/** Move this row one position later. */ () => this.move(index, 1)))
        .addButton(/** Removal discards only this unsaved definition. */ button => iconButton(button, this.t("common.delete"), "trash-2").onClick(/** Retired forms cannot remove a row after a newer draft mounts. */ () => {if (this.current()) {this.rows.splice(index, 1);this.render();}}));
      new Setting(group).setName(this.t("nodeProperties.creationVisible")).addToggle(/** Creation availability is independent of supplementary node details. */ toggle => {toggle.toggleEl.setAttribute("aria-label", this.t("nodeProperties.creationVisible"));
        toggle.setValue(effective.creationVisible !== false).onChange(/** Preserve the value-display flag while changing creation visibility. */ creationVisible => {if (this.current()) this.rows[index] = {...this.rows[index], creationVisible};});});
      new Setting(group).setName(this.t("nodeProperties.visible")).addToggle(/** Only this flag authorizes lazy node-detail reads. */ toggle => {toggle.toggleEl.setAttribute("aria-label", this.t("nodeProperties.visible"));
        toggle.setValue(row.visible).onChange(/** Repaint the sample without changing the creation form preference. */ visible => {if (this.current()) {this.rows[index] = {...this.rows[index], visible};this.refreshPreview();}});});
      new Setting(group).setName(this.t("nodeProperties.showName")).addToggle(/** A missing name flag keeps historical value-only appearance. */ toggle => {toggle.toggleEl.setAttribute("aria-label", this.t("nodeProperties.showName"));
        toggle.setValue(effective.showName === true).onChange(/** Labels affect painting and measurement, never the property's identity. */ showName => {if (this.current()) {this.rows[index] = {...this.rows[index], showName};this.refreshPreview();}});});
      new Setting(group).setName(this.t("nodeProperties.label")).addText(/** Labels also name creation controls even when hidden in node details. */ input => {input.inputEl.setAttribute("aria-label", this.t("nodeProperties.label"));
        input.setValue(row.label ?? "").setPlaceholder(effective.label ?? row.field).onChange(/** Keep optional authored display text in this detached row. */ label => {if (this.current()) {this.rows[index] = {...this.rows[index], label};this.refreshPreview();}});});
      new Setting(group).setName(this.t("nodeProperties.icon")).addText(/** The caller supplies the shared native Lucide suggester; plain emoji remain valid text. */ input => {input.inputEl.setAttribute("aria-label", this.t("nodeProperties.icon"));
        input.setValue(row.icon ?? "").setPlaceholder(effective.icon ?? "").onChange(/** Refresh the same measured parts that canvases paint. */ icon => {if (this.current()) {this.rows[index] = {...this.rows[index], icon};this.refreshPreview();}});
        const release = this.options.suggestIcon?.(input.inputEl);if (release) this.suggestionReleases.push(release);
      });
    });this.refreshPreview();
  }

  /** Preserve authored values while moving exactly one configured row. */
  private move(index: number, delta: number): void {
    if (!this.current()) return;const target = index + delta;if (target < 0 || target >= this.rows.length) return;
    [this.rows[index], this.rows[target]] = [this.rows[target], this.rows[index]];this.render();
    this.list.querySelectorAll<HTMLInputElement>(".kplex-node-detail-field input").item(target)?.focus();
  }
}
