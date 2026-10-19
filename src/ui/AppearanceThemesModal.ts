/**
 * Named appearance management in the established native style-manager shell. Library mutations
 * cross the caller's existing queued settings owner. Opening a row never selects a theme. Only
 * visible summaries resolve their private palette; graph rendering never receives the library.
 */
import {Setting, type App, type ButtonComponent} from "obsidian";
import {StyleEditorModal, type StyleCommitResult} from "./StyleEditorModal";
import {StyleManagerList} from "./StyleManagerList";
import {ColorSwatchList, type ColorSwatchItem} from "./ColorSwatchList";
import {StyleSwatchScope} from "./StyleSwatchScope";
import {ColorPreview} from "./ColorPreview";
import {compassSwatchItem, type StyleColorContext} from "./StyleColorControls";
import {DEFAULT_THEME_ID, copyThemeValue, validThemeName, type AppearanceTheme, type AppearanceThemeLibrary, type AppearanceThemeAction} from "../core/plex/appearanceThemes";
import {COMPASS_DIRECTIONS, SEMANTIC_COLOR_DEFAULTS, SEMANTIC_COLOR_SLOTS} from "../core/plex/colorPreferences";
import {sanitizeColorValue} from "../core/contracts/colorValue";
import {colorValueCss} from "../adapters/obsidian/colorPresentation";
import {NATIVE_CANVAS_FILL, NATIVE_NODE_PAINT} from "../index/style";

/** Narrow manager capabilities; no second settings writer or global plugin discovery. */
export type AppearanceThemesOptions = Readonly<{
  context: StyleColorContext;
  library: () => AppearanceThemeLibrary;
  subscribe: (changed: () => void) => () => void;
  save: (action: AppearanceThemeAction, current: () => boolean) => Promise<StyleCommitResult>;
  create: (name: string, defaults: boolean, current: () => boolean) => Promise<StyleCommitResult>;
  closed: () => void;
}>;

/** Use finite representative base/semantic assignments rather than walking every custom rule. */
function themeSummary(theme: AppearanceTheme, context: StyleColorContext): ColorSwatchItem[] {
  const t = context.translate, base = theme.appearance.base, semantic = theme.appearance.semantic;
  const rules: ColorSwatchItem[] = [];
  for (const group of [semantic.noteTypeStyles, semantic.tagNodeStyles, semantic.hierarchyLinkStyles]) {
    for (const [name, style] of Object.entries(group)) {
      const value = sanitizeColorValue(style.backgroundColor ?? style.strokeColor ?? style.textColor ?? style.borderColor);
      if (value !== undefined) rules.push({label: name, value, fallback: NATIVE_NODE_PAINT.foreground});
      if (rules.length === 4) break;
    }
    if (rules.length === 4) break;
  }
  return [{label: t("themes.baseTitle"), value: base.backgroundColor, fallback: NATIVE_CANVAS_FILL},
    {label: t("styles.text"), value: sanitizeColorValue(base.baseNodeStyle.textColor), fallback: NATIVE_NODE_PAINT.foreground},
    ...SEMANTIC_COLOR_SLOTS.map(/** The same semantic source identities stay local to this saved palette. */ slot => ({label: t(`colors.semantic.${slot}`), value: {kind: "theme" as const, variable: `--kplex-semantic-${slot}`}, fallback: `var(${SEMANTIC_COLOR_DEFAULTS[slot]}, var(--text-normal))`})),
    ...COMPASS_DIRECTIONS.map(/** Summaries show actual configured tint fills, using the same direction chain as its editor. */ direction => compassSwatchItem(t(`compass.${direction}`), direction, semantic.colorPreferences.compass.fills[direction])), ...rules];
}

/** Inactive editor previews resolve its own palette and records; native host CSS remains live. */
function themeContext(theme: AppearanceTheme, context: StyleColorContext): StyleColorContext {
  return {...context, preferences: /** No active-theme palette can leak into this explicitly opened saved appearance. */ () => theme.appearance.semantic.colorPreferences,
    nodeStyle: () => theme.appearance.base.baseNodeStyle, linkStyle: () => theme.appearance.base.baseLinkStyle,
    background: () => theme.appearance.base.backgroundColor, subscribeColors: undefined};
}

/** Searchable, progressively disclosed list using the same mechanics as node/link managers. */
export class AppearanceThemesManagerModal extends StyleEditorModal {
  private list: StyleManagerList | null = null;
  private colors: ColorSwatchList | null = null;
  private rowScopes: StyleSwatchScope[] = [];
  private releaseLibrary: (() => void) | null = null;
  private readonly children = new Set<StyleEditorModal>();
  private query = "";

  /** Retain explicit queue/activation capabilities supplied by the owning Settings page. */
  constructor(app: App, private readonly options: AppearanceThemesOptions) {super(app);}

  /** Opening and browsing do not mutate selection or create an appearance copy. */
  onOpen(): void {
    const {context} = this.options, t = context.translate;
    this.beginEditor(context.sourceScope, context.bindEditor); this.modalEl.addClass("kplex-style-manager-modal"); this.titleEl.setText(t("themes.manage"));
    this.contentEl.createEl("p", {text: t("themes.managerHelp")});
    this.list = new StyleManagerList(this.contentEl, t, {placeholder: t("themes.search"), aria: t("themes.search")}, /** Native search changes only this bounded manager. */ query => {this.query = query; this.renderList();});
    this.list.action(t("themes.create"), "plus", /** Add reuses the same editor flow, without separate toolbar CRUD controls. */ () => this.edit(null));
    this.releaseLibrary = this.options.subscribe(/** Metadata changes repaint this manager without graph work. */ () => this.renderList());
    this.renderList(); this.focusAfterAttachment(this.list.search);
  }

  /** Resolve only the visible window, with one paired CSS harvest shared by its private palettes. */
  private renderList(): void {
    if (!this.canEdit() || !this.list) return;
    this.colors?.dispose(); for (const scope of this.rowScopes.splice(0)) scope.dispose(); this.list.list.empty();
    const library = this.options.library(), matches = library.themes.filter(/** User names are literal data; filtering never activates a row. */ theme => !this.query || theme.name.toLocaleLowerCase().includes(this.query));
    this.list.status.setText(this.translate("styles.resultCount", {count: library.themes.length, results: matches.length}));
    if (!matches.length) {this.list.list.createDiv({cls: "kplex-style-manager-empty", text: this.translate("styles.noMatches")}); return;}
    this.colors = new ColorSwatchList(this.contentEl, this.options.context);
    const windowed = this.list.window(matches);
    for (const theme of windowed.visible) {
      const context = themeContext(theme, this.options.context), items = themeSummary(theme, context);
      const row = this.list.row(/** Opening metadata does not select the theme. */ () => this.edit(theme.id));
      const swatch = row.createSpan({cls: "kplex-style-manager-node-swatch"});
      const scope = new StyleSwatchScope(row, context); scope.update(items.flatMap(/** Preserve only supported configured identities. */ item => item.value === undefined ? [] : [item.value])); this.rowScopes.push(scope);
      swatch.setCssProps({"--kplex-style-node-bg": colorValueCss(sanitizeColorValue(theme.appearance.base.baseNodeStyle.backgroundColor), NATIVE_NODE_PAINT.fill),
        "--kplex-style-node-border": colorValueCss(sanitizeColorValue(theme.appearance.base.baseNodeStyle.borderColor), NATIVE_NODE_PAINT.border)});
      const copy = row.createDiv({cls: "kplex-style-manager-copy"}), heading = copy.createDiv({cls: "kplex-style-manager-heading"});
      heading.createSpan({text: theme.name, cls: "kplex-style-manager-name"});
      if (theme.id === library.selectedId) {heading.createSpan({text: this.translate("themes.active"), cls: "kplex-style-manager-badge"}); row.setAttribute("aria-current", "true");}
      copy.createDiv({text: this.translate("themes.summary", {nodes: Object.keys(theme.appearance.semantic.noteTypeStyles).length + Object.keys(theme.appearance.semantic.tagNodeStyles).length,
        links: Object.keys(theme.appearance.semantic.hierarchyLinkStyles).length, pairs: theme.appearance.semantic.colorPreferences.palette.length}), cls: "kplex-style-manager-summary"});
      this.colors.add(copy.createDiv(), /** This row uses its own named pairs and semantic assignments. */ () => items, context.preferences);
    }
    this.list.more(windowed, /** Expanding still reads only saved settings, never vault data. */ () => this.renderList());
  }

  /** Track child lifetime; an accepted durable operation survives parent retirement truthfully. */
  private edit(id: string | null): void {
    if (!this.canEdit()) return;
    const child = new AppearanceThemeEditorModal(this.app, this.options, id,
      /** A live metadata edit updates this manager; activation retirement waits for the child's truthful completion. */ () => {if (this.canEdit()) this.renderList();},
      /** Retire an old manager only after the accepted child has displayed its saved result and closed. */ () => {this.children.delete(child); if (this.modalEl.isConnected && !this.canEdit()) this.retire();});
    this.children.add(child); child.open();
  }

  /** Retire every observer, sampler and child before native shell teardown. */
  onClose(): void {
    super.onClose(); this.releaseLibrary?.(); this.releaseLibrary = null; this.colors?.dispose(); this.colors = null;
    for (const scope of this.rowScopes.splice(0)) scope.dispose(); for (const child of this.children) child.retire(); this.children.clear();
    this.list = null; this.contentEl.empty(); this.options.closed();
  }
}

/** One familiar native Add/Edit flow owns naming, source choice and deletion, never implicit activation. */
class AppearanceThemeEditorModal extends StyleEditorModal {
  private name = "";
  private defaults = false;
  private input: HTMLInputElement | null = null;
  private error: HTMLElement | null = null;
  private saveButton: ButtonComponent | null = null;
  private colors: ColorSwatchList | null = null;
  private preview: ColorPreview | null = null;
  private releaseCss: (() => void) | null = null;
  private confirmation: AppearanceThemeDeleteModal | null = null;
  private openingSource: AppearanceTheme | null = null;

  /** A row ID is metadata ownership; the supplied context retains its opening activation fence. */
  constructor(app: App, private readonly options: AppearanceThemesOptions, private readonly id: string | null, private readonly saved: () => void, private readonly closed: () => void) {super(app);}

  /** Build an independent local draft; Cancel/unchanged Save make no write or Custom theme. */
  onOpen(): void {
    const t = this.options.context.translate, library = this.options.library(), theme = library.themes.find(/** Copies always name the explicit selected source. */ candidate => candidate.id === (this.id ?? library.selectedId));
    if (!theme) {this.close(); return;}
    this.openingSource = copyThemeValue(theme); this.name = this.id ? theme.name : ""; this.beginEditor(this.options.context.sourceScope, this.options.context.bindEditor); this.modalEl.addClass("kplex-color-modal"); this.titleEl.setText(t(this.id ? "themes.edit" : "themes.create"));
    const {body, actions} = this.scrollableContent();
    const immutable = this.id === DEFAULT_THEME_ID;
    new Setting(body).setName(t("colors.name")).addText(/** Match the existing name editors' native inline validation. */ text => {
      text.setValue(this.name).setDisabled(immutable); this.input = text.inputEl; text.inputEl.maxLength = 100; text.inputEl.setAttribute("aria-label", t("colors.name"));
      text.onChange(/** Keystrokes never persist the library. */ value => {if (this.canEdit()) {this.name = value; this.validate();}});
    });
    this.error = body.createDiv({cls: "setting-item-description", attr: {role: "status", "aria-live": "polite"}});
    if (!this.id) new Setting(body).setName(t("themes.startingPoint")).addDropdown(/** Copy is the default; the native menu identifies the actual source by name. */ dropdown => {
      dropdown.addOptions({copy: t("themes.copyFrom", {name: theme.name}), defaults: t("themes.startDefaults")}).setValue("copy").onChange(/** Source selection updates previews only. */ value => {if (this.canEdit()) {this.defaults = value === "defaults"; this.paint();}});
    });
    if (immutable) body.createDiv({text: t("themes.immutable"), cls: "setting-item-description"});
    this.colors = new ColorSwatchList(body, this.options.context);
    for (const section of ["base", "semantic"] as const) {
      body.createEl("h3", {text: t(section === "base" ? "themes.baseTitle" : "themes.semanticTitle")});
      this.colors.add(body.createDiv(), /** Both sections share the existing pair renderer and private source palette. */ () => {
        const items = themeSummary(this.source(), this.options.context); return section === "base" ? items.slice(0, 2) : items.slice(2);
      }, /** Source choice changes previews only, never durable color identities. */ () => this.source().appearance.semantic.colorPreferences);
    }
    this.preview = new ColorPreview(body, {...themeContext(theme, this.options.context),
      preferences: () => this.source().appearance.semantic.colorPreferences, nodeStyle: () => this.source().appearance.base.baseNodeStyle,
      linkStyle: () => this.source().appearance.base.baseLinkStyle, background: () => this.source().appearance.base.backgroundColor, target: {kind: "canvas"}}, theme.appearance.base.backgroundColor);
    this.releaseCss = this.options.context.subscribeCss?.(/** Native CSS stays live for both mode previews. */ () => this.preview?.invalidate()) ?? null;
    new Setting(actions).addButton(/** Native dismissal shares pending exclusion with Escape. */ button => button.setButtonText(t("common.cancel")).onClick(() => this.close()))
      .addButton(/** Rename keeps stable identity; Create publishes selection only after storage succeeds. */ button => {this.saveButton = button; button.setButtonText(t(this.id ? "common.save" : "themes.create")).setCta().setDisabled(immutable).onClick(() => this.submit());});
    if (this.id) new Setting(actions).addButton(/** Factory metadata remains immutable in the UI and core owner. */ button => button.setButtonText(t("common.delete")).setDestructive().setDisabled(immutable).onClick(() => this.remove()));
    this.validate(); if (this.input && !immutable) this.focusAfterAttachment(this.input);
  }

  /** Factory source is always current built-in inheritance, while a copy retains its opening appearance. */
  private source(): AppearanceTheme {
    const library = this.options.library(), theme = library.themes.find(/** Opening ownership is separately fenced before any submission. */ candidate => candidate.id === (this.defaults ? DEFAULT_THEME_ID : this.id ?? library.selectedId));
    if (theme) return theme; if (this.openingSource) return this.openingSource; throw new Error("Theme source no longer exists");
  }

  /** Updating source choice only refreshes existing shared components. */
  private paint(): void {this.colors?.update(); this.preview?.update(this.source().appearance.base.backgroundColor); this.preview?.refreshSources();}

  /** Keep naming errors inline and the same invalid/disabled treatment as native style editors. */
  private validate(): boolean {
    const valid = validThemeName(this.options.library(), this.name, this.id ?? undefined);
    this.input?.classList.toggle("is-invalid", !!this.name && !valid); this.input?.setAttribute("aria-invalid", String(!valid));
    this.error?.setText(!valid && this.name ? this.translate("themes.invalidName") : "");
    this.saveButton?.setDisabled(!this.canEdit() || !valid || this.id === DEFAULT_THEME_ID); return valid;
  }

  /** Persist only a changed name/new copy; no selection occurs merely by opening or unchanged Save. */
  private submit(): void {
    if (!this.canEdit() || this.id === DEFAULT_THEME_ID || !this.validate()) return;
    const name = this.name.trim(), id = this.id;
    if (id && this.options.library().themes.find(/** Compare the same durable identity. */ theme => theme.id === id)?.name === name) {this.close(); return;}
    this.runOperation(/** Durable success precedes manager refresh and any activation retirement. */ async current => {
      const result = id ? await this.options.save({kind: "rename", id, name}, current) : await this.options.create(name, this.defaults, current);
      return this.finishSaved(result, current);
    });
  }

  /** Active deletion requires explicit factory-fallback consent; inactive deletion has no scene effect. */
  private remove(): void {
    if (!this.canEdit() || !this.id || this.id === DEFAULT_THEME_ID) return;
    const id = this.id, active = this.options.library().selectedId === id;
    if (!active) {this.runOperation(async current => this.finishSaved(await this.options.save({kind: "delete", id}, current), current)); return;}
    const theme = this.options.library().themes.find(/** Name only the confirmed durable target. */ candidate => candidate.id === id); if (!theme) return;
    let deleted = false;
    this.confirmation = new AppearanceThemeDeleteModal(this.app, this.options.context, theme.name,
      /** Deletion and fallback share one existing queued snapshot; retain the saved-refresh outcome. */ async current => {
        const result = this.finishSaved(await this.options.save({kind: "delete", id}, current), current); deleted = true; return result;
      }, /** Retire parents after the confirmation shell reports durable completion, never before. */ () => {this.confirmation = null; if (deleted) this.retire();});
    this.confirmation.open();
  }

  /** A saved theme cannot become an unsaved retry because its manager refresh failed. */
  private finishSaved(result: StyleCommitResult, current: () => boolean): StyleCommitResult {
    if (!current()) return result;
    try {this.saved(); return result;}
    catch (error) {console.error("K-Plex saved theme manager refresh failed", error); return {refreshPending: true};}
  }

  /** Rejected writes keep name/source drafts available for repair or retry. */
  protected onOperationRejected(): void {this.validate();}

  /** Explicitly retire nested confirmation and both shared preview owners on close/unload. */
  onClose(): void {super.onClose(); this.confirmation?.retire(); this.confirmation = null; this.releaseCss?.(); this.releaseCss = null; this.colors?.dispose(); this.colors = null; this.preview?.dispose(); this.preview = null; this.contentEl.empty(); this.closed();}
}

/** Confirmation retains the established pending/failed-storage/native-dismissal contract. */
class AppearanceThemeDeleteModal extends StyleEditorModal {
  /** Capture the visible name and opening activation; the caller owns the stable deletion identity. */
  constructor(app: App, private readonly context: StyleColorContext, private readonly name: string, private readonly save: (current: () => boolean) => Promise<StyleCommitResult>, private readonly closed: () => void) {super(app);}
  /** A native destructive button confirms the complete atomic fallback operation. */
  onOpen(): void {
    this.beginEditor(this.context.sourceScope, this.context.bindEditor); const t = this.context.translate; this.titleEl.setText(t("themes.deleteTitle", {name: this.name}));
    this.contentEl.createEl("p", {text: t("themes.deleteHelp")});
    new Setting(this.contentEl).addButton(button => button.setButtonText(t("common.cancel")).onClick(() => this.close()))
      .addButton(button => button.setButtonText(t("common.delete")).setDestructive().onClick(() => this.runOperation(this.save)));
  }
  /** Clear confirmation controls after native lifetime retirement. */
  onClose(): void {super.onClose(); this.contentEl.empty(); this.closed();}
}
