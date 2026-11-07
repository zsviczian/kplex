/** Native, bounded note-type property drafts reuse the common modal, fields, actions and manager.
 * Save changes display configuration only; Cancel and typing never touch notes or graph state. */
import type {App, TextComponent, ButtonComponent} from "obsidian";
import {FormSetting as Setting, formActions, iconButton} from "../adapters/obsidian/KplexModal";
import {StyleEditorModal, type StyleCommitResult} from "./StyleEditorModal";
import {StyleManagerList} from "./StyleManagerList";
import {MAX_NODE_PROPERTIES, validNodeProperties, type NodeProperty} from "../core/plex/nodeProperties";
import type {Translator} from "../lang";

type Options = {
  translate: Translator; types(): readonly string[]; read(type: string): readonly NodeProperty[];
  save(type: string, opening: readonly NodeProperty[], rows: readonly NodeProperty[], current: () => boolean): Promise<StyleCommitResult>;
  closed?(): void;
};

/** Reuse the searchable manager for configured and currently known types without a new settings tree. */
export class NoteTypePropertiesManager extends StyleEditorModal {
  private children = new Set<NoteTypePropertiesEditor>();
  private manager: StyleManagerList | null = null;
  private query = "";
  constructor(app: App, private readonly options: Options) {super(app);}
  onOpen(): void {
    this.beginEditor();const t = this.options.translate;this.titleEl.setText(t("nodeProperties.title"));
    this.contentEl.createEl("p", {text: t("nodeProperties.help"), cls: "setting-item-description"});
    this.manager = new StyleManagerList(this.contentEl, t, {placeholder: t("nodeProperties.search"), aria: t("nodeProperties.search")}, query => {this.query = query;this.renderRows();});
    this.manager.action(t("nodeProperties.addType"), "plus", () => this.edit(null));this.renderRows();
  }
  private renderRows(): void {
    const manager = this.manager;if (!manager || !this.canEdit()) return;
    manager.list.empty();const types = this.options.types().filter(type => type.toLocaleLowerCase().includes(this.query.toLocaleLowerCase())).sort((a,b) => a.localeCompare(b));
    const page = manager.window(types);manager.status.setText(this.options.translate("styles.resultCount", {count: this.options.types().length, results: types.length}));
    for (const type of page.visible) manager.row(() => this.edit(type)).createDiv({text: type, cls: "kplex-style-manager-name"});
    manager.more(page, () => this.renderRows());
  }
  private edit(type: string | null): void {
    if (!this.canEdit()) return;
    const child = new NoteTypePropertiesEditor(this.app, type, this.options, () => {this.children.delete(child);this.renderRows();});
    this.children.add(child);child.open();
  }
  onClose(): void {for (const child of this.children) child.close();this.children.clear();this.manager = null;super.onClose();this.contentEl.empty();this.options.closed?.();}
}

/** Each property is a full-width authored field; compact visibility and ordered row actions follow it. */
export class NoteTypePropertiesEditor extends StyleEditorModal {
  private name: string;
  private readonly opening: readonly NodeProperty[];
  private rows: NodeProperty[];
  private list: HTMLElement | null = null;
  private saveButton: ButtonComponent | null = null;
  private addButton: ButtonComponent | null = null;
  constructor(app: App, private readonly initialType: string | null, private readonly options: Options, private readonly onClosed: () => void) {
    super(app);this.name = initialType ?? "";this.opening = structuredClone(initialType ? options.read(initialType) : []);this.rows = [...this.opening];
  }
  onOpen(): void {
    this.beginEditor();const t = this.options.translate;this.titleEl.setText(t("nodeProperties.title"));
    const {body, actions} = this.scrollableContent();
    new Setting(body).setName(t("nodeProperties.type")).addText(input => input.setValue(this.name).setDisabled(this.initialType !== null).onChange(value => {this.name = value;this.validate();}));
    body.createEl("p", {text: t("nodeProperties.valuesHelp"), cls: "setting-item-description"});
    this.list = body.createDiv({cls: "kplex-node-property-fields"});this.renderRows();
    formActions(actions)
      .addButton(button => {this.addButton = iconButton(button, t("nodeProperties.add"), "plus").onClick(() => {
        if (!this.canEdit() || this.rows.length >= MAX_NODE_PROPERTIES) return;
        this.rows.push({field: "", visible: true});this.renderRows(true);
      });})
      .addButton(button => iconButton(button, t("common.cancel"), "x").onClick(() => this.close()))
      .addButton(button => {this.saveButton = iconButton(button, t("common.save"), "save").setCta().onClick(() => {
        if (this.valid()) this.runOperation(current => this.options.save(this.name, this.opening, this.rows, current));
      });});this.validate();
  }
  private valid(): boolean {return !!this.name.trim().replace(/^#/, "") && this.name.trim().length <= 128 && validNodeProperties(this.rows);}
  private validate(): void {this.saveButton?.setDisabled(!this.valid());this.addButton?.setDisabled(this.rows.length >= MAX_NODE_PROPERTIES);}
  private renderRows(focusLast = false): void {
    const list = this.list;if (!list || !this.canEdit()) return;list.empty();const t = this.options.translate;let last: TextComponent | undefined;
    this.rows.forEach((row, index) => {
      const group = list.createDiv({cls: "kplex-node-property-field"});
      new Setting(group).setName(t("nodeProperties.field")).addText(input => {last = input;input.setValue(row.field).onChange(field => {this.rows[index] = {...this.rows[index], field};this.validate();});});
      new Setting(group).setName(t("nodeProperties.visible")).addToggle(toggle => toggle.setValue(row.visible).onChange(visible => {this.rows[index] = {...this.rows[index], visible};}))
        .addButton(button => iconButton(button, t("facets.moveUp"), "arrow-up").setDisabled(index === 0).onClick(() => this.move(index, -1)))
        .addButton(button => iconButton(button, t("facets.moveDown"), "arrow-down").setDisabled(index === this.rows.length - 1).onClick(() => this.move(index, 1)))
        .addButton(button => iconButton(button, t("common.delete"), "trash-2").onClick(() => {if (this.canEdit()) {this.rows.splice(index, 1);this.renderRows();}}));
    });this.validate();if (focusLast && last) this.focusAfterAttachment(last.inputEl);
  }
  private move(index: number, direction: -1 | 1): void {
    if (!this.canEdit()) return;const next = index + direction;if (next < 0 || next >= this.rows.length) return;
    [this.rows[index], this.rows[next]] = [this.rows[next], this.rows[index]];this.renderRows();
  }
  protected onOperationRejected(): void {this.validate();}
  onClose(): void {super.onClose();this.contentEl.empty();this.onClosed();}
}
