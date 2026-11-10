/** Compact native optional-default editor embedded in the existing type/style form.
 * It owns a detached ordered draft and a cache-only preview; persistence belongs to the parent Save. */
import {FormSetting as Setting, iconButton} from "../adapters/obsidian/KplexModal";
import type {ButtonComponent} from "obsidian";
import {MAX_NODE_PROPERTIES, validNodeProperties, type NodeProperty, type NodePropertyLine} from "../core/plex/nodeProperties";
import type {Translator} from "../lang";

export type NodeDetailsOptions = Readonly<{rows: readonly NodeProperty[];
  preview(type: string, rows: readonly NodeProperty[]): Readonly<{title: string; lines: readonly NodePropertyLine[]}>;
}>;

export class NodeDetailsFields {
  readonly element: HTMLElement;
  private readonly list: HTMLElement;
  private readonly preview: HTMLElement;
  private rows: NodeProperty[];
  private addButton?: ButtonComponent;
  /** Reuse native fields/toggles/icon actions; adding/reordering never writes settings or a note. */
  constructor(container: HTMLElement, private readonly t: Translator,
    private readonly options: NodeDetailsOptions, private readonly type: () => string, private readonly current: () => boolean) {
    this.rows = options.rows.map(row => ({...row}));this.element = container.createDiv({cls: "kplex-node-details-editor"});
    this.element.createEl("h3", {text: t("nodeProperties.title")});
    this.element.createEl("p", {text: t("nodeProperties.help"), cls: "setting-item-description"});
    this.list = this.element.createDiv();
    new Setting(this.element).addButton(button => {this.addButton = iconButton(button, t("nodeProperties.add"), "plus").onClick(() => {
      if (!this.current() || this.rows.length >= MAX_NODE_PROPERTIES) return;this.rows.push({field: "", visible: true});this.render();
      this.list.querySelectorAll<HTMLInputElement>("input[type=text]").item(this.rows.length - 1)?.focus();
    });});
    this.preview = this.element.createDiv({cls: "kplex-node-details-preview", attr: {"aria-label": t("nodeProperties.preview")}});this.render();
  }

  /** Return a validated detached snapshot only when the parent submits its full form. */
  read(): readonly NodeProperty[] {if (!validNodeProperties(this.rows)) throw new Error(this.t("nodeProperties.invalid"));return this.rows.map(row => ({field: row.field.trim(), visible: row.visible}));}

  /** Type-name edits update this compact sample without rediscovering note types or source bodies. */
  refreshPreview(): void {
    if (!this.preview || !this.current()) return;const sample = this.options.preview(this.type(), this.rows);this.preview.empty();
    const caption = this.preview.createSpan({cls: "kplex-thought-caption"});caption.createSpan({text: sample.title, cls: "kplex-thought-label"});
    const lines = caption.createSpan({cls: "kplex-node-properties"});for (const line of sample.lines) lines.createSpan({text: line.text, cls: "kplex-node-property"});
  }

  /** Each row shares one native input/control layout, with explicit accessible names and no double tooltip. */
  private render(): void {
    if (!this.current()) return;this.list.empty();this.addButton?.setDisabled(this.rows.length >= MAX_NODE_PROPERTIES);
    this.rows.forEach((row, index) => {
      const setting = new Setting(this.list);setting.settingEl.addClass("kplex-node-detail-row");
      setting.addText(input => {input.inputEl.setAttribute("aria-label", this.t("nodeProperties.field"));input.setValue(row.field).setPlaceholder(this.t("nodeProperties.field"))
        .onChange(field => {if (this.current()) {this.rows[index] = {...this.rows[index], field};this.refreshPreview();}});})
        .addToggle(toggle => {toggle.toggleEl.setAttribute("aria-label", this.t("nodeProperties.visible"));toggle.setValue(row.visible).onChange(visible => {if (this.current()) {this.rows[index] = {...this.rows[index], visible};this.refreshPreview();}});})
        .addButton(button => iconButton(button, this.t("facets.moveUp"), "arrow-up").setDisabled(index === 0).onClick(() => this.move(index, -1)))
        .addButton(button => iconButton(button, this.t("facets.moveDown"), "arrow-down").setDisabled(index === this.rows.length - 1).onClick(() => this.move(index, 1)))
        .addButton(button => iconButton(button, this.t("common.delete"), "trash-2").onClick(() => {if (this.current()) {this.rows.splice(index, 1);this.render();}}));
    });this.refreshPreview();
  }

  /** Preserve authored values while moving exactly one configured row. */
  private move(index: number, delta: number): void {
    if (!this.current()) return;const target = index + delta;if (target < 0 || target >= this.rows.length) return;
    [this.rows[index], this.rows[target]] = [this.rows[target], this.rows[index]];this.render();
    this.list.querySelectorAll<HTMLInputElement>("input[type=text]").item(target)?.focus();
  }
}
