/**
 * Shared native color-source content for settings and graph entry points. Detached local drafts
 * preserve source identity; only the containing shell can Save. This content owns its literal
 * controls, bounded source-validation scope and chooser lifetime, never persistence or a graph.
 */
import type { ColorValue } from "../core/contracts/colorValue";
import { colorIdentityText, colorValuesEqual, isThemeColorName, parseLiteralColor } from "../core/contracts/colorValue";
import type { ColorPreferencesV1, SemanticColorPair } from "../core/plex/colorPreferences";
import { ColorScope } from "../adapters/obsidian/colorScope";
import { ColorLiteralEditor } from "./ColorLiteralEditor";
import type { Translator } from "../lang";

type ColorSourceKind = "inherit" | "fixed" | "named" | "theme" | "unsupported";
export type ColorSourceEditorOptions = Readonly<{
  initial: ColorValue | undefined; sourceScope: HTMLElement; translate: Translator;
  preferences: (draftSource?: ColorValue) => ColorPreferencesV1;
  themeTokens: readonly Readonly<{ variable: string; label: string }>[];
  chooseNamed: (chosen: (pair: SemanticColorPair) => void) => () => void;
  chooseTheme: (current: string, chosen: (variable: string | null) => void) => () => void;
  fixedSeed: (source: ColorValue | undefined) => string;
  onChange: () => void;
  onPreview: (source: ColorValue | undefined, finishedThemeName: boolean) => void;
}>;

/** One source selector, reused in all native/React callers through the same owning modal. */
export class ColorSourceEditor {
  private static serial = 0;
  private readonly root: HTMLElement;
  private readonly selector: HTMLSelectElement;
  private readonly fixedPane: HTMLElement;
  private readonly namedPane: HTMLElement;
  private readonly themePane: HTMLElement;
  private readonly namedButton: HTMLButtonElement;
  private readonly tokens: HTMLButtonElement;
  private customVariable = false;
  private readonly variable: HTMLInputElement;
  private readonly feedback: HTMLElement;
  private readonly validationRoot: HTMLElement;
  private readonly validation: ColorScope;
  private literal: ColorLiteralEditor | null = null;
  private kind: ColorSourceKind;
  private namedId = "";
  private themeName = "";
  private composing = false;
  private disabled = false;
  private alive = true;
  private validatedSource: ColorValue | undefined;
  private validatedPreferences: ColorPreferencesV1 | undefined;
  private lastPreview: ColorValue | undefined;
  private releaseChooser: (() => void) | null = null;

  /** Mount detached choices without invoking a settings writer or converting the initial identity. */
  constructor(container: HTMLElement, private readonly options: ColorSourceEditorOptions) {
    const { initial, translate: t } = options; this.lastPreview = initial;
    this.kind = initial === undefined ? "inherit" : initial === null ? "unsupported" : typeof initial === "string" ? "fixed"
      : initial.kind === "palette" ? "named" : initial.kind === "theme" ? "theme" : "unsupported";
    if (initial && typeof initial !== "string") { if (initial.kind === "palette") this.namedId = initial.id; else if (initial.kind === "theme") this.themeName = initial.variable; }
    this.root = container.createDiv({ cls: "kplex-color-source-editor" });
    const label = this.root.createEl("label", { text: t("colors.source") });
    this.selector = label.createEl("select", {cls: "dropdown"});
    const kinds = ["inherit", "fixed", "named", "theme"] as const;
    for (const kind of kinds) this.selector.createEl("option", { text: t(`colors.${kind}`), attr: { value: kind } });
    if (this.kind === "unsupported") this.selector.createEl("option", { text: t("colors.unsupportedSource"), attr: { value: "unsupported", disabled: "" } });
    this.selector.value = this.kind;
    this.fixedPane = this.root.createDiv(); this.namedPane = this.root.createDiv(); this.themePane = this.root.createDiv();
    this.namedButton = this.namedPane.createEl("button", { attr: { type: "button" } });
    this.namedButton.addEventListener("click", /** Keep chooser callbacks local to this still-editable form. */ () => {
      if (!this.editable()) return;
      this.releaseChooser?.(); this.releaseChooser = options.chooseNamed(pair => {
        if (!this.editable()) return; this.namedId = pair.id; this.refresh(false);
      });
    });
    const themeLabel = this.themePane.createEl("label", { text: t("colors.theme") });
    this.tokens = themeLabel.createEl("button", {cls: "kplex-theme-color-choice", attr: {type: "button"}});
    this.customVariable = !!this.themeName && !options.themeTokens.some(token => token.variable === this.themeName);
    const variableLabel = this.themePane.createEl("label", { text: t("colors.variableName") });
    this.variable = variableLabel.createEl("input", { attr: { type: "text", spellcheck: "false", autocomplete: "off", maxlength: "128" } });
    this.variable.value = this.themeName;
    const feedbackId = `kplex-color-source-error-${++ColorSourceEditor.serial}`;
    this.feedback = this.root.createDiv({ cls: "setting-item-description", attr: { id: feedbackId, role: "status", "aria-live": "polite" } });
    this.variable.setAttribute("aria-describedby", feedbackId); this.selector.setAttribute("aria-describedby", feedbackId);
    this.validationRoot = options.sourceScope.createDiv({ cls: "kplex-color-draft-scope", attr: { "aria-hidden": "true" } });
    this.validationRoot.setCssStyles({ position: "fixed", left: "-100000px", visibility: "hidden", pointerEvents: "none" });
    this.validation = new ColorScope(this.validationRoot, { preferences: options.preferences(), references: [] }, { observe: false });
    this.selector.addEventListener("change", /** Choosing Fixed is the explicit source conversion; opening/cancel never performs it. */ () => {
      if (!this.editable()) return;
      const kind = kinds.find(value => value === this.selector.value); if (!kind) return;
      const previous = this.getValue(); this.kind = kind;
      if (kind === "fixed" && !this.literal) this.mountLiteral(typeof initial === "string" ? initial : options.fixedSeed(previous));
      this.refresh(kind === "theme");
    });
    this.tokens.addEventListener("click", /** Native search shows swatches; custom entry keeps its independent text draft. */ () => {
      if (!this.editable()) return;
      this.releaseChooser?.(); this.releaseChooser = options.chooseTheme(this.themeName, variable => {
        if (!this.editable()) return;
        this.customVariable = variable === null;
        if (variable !== null) {this.themeName = variable; this.variable.value = variable;}
        this.refresh(variable !== null);
        if (variable === null) this.variable.focus();
      });
    });
    this.variable.addEventListener("compositionstart", /** Do not sample partial IME names. */ () => { if (this.editable()) { this.composing = true; options.onChange(); } });
    this.variable.addEventListener("compositionend", /** Revalidate the complete case-sensitive name without rewriting its text. */ () => { if (this.editable()) { this.composing = false; this.themeName = this.variable.value; this.refresh(true); } });
    this.variable.addEventListener("input", /** Picker typing changes a local identity; stylesheet harvesting waits for a finished name. */ () => { if (this.editable() && !this.composing) { this.themeName = this.variable.value; this.refresh(false); } });
    this.variable.addEventListener("blur", /** Request at most a completed name's preview, never one snapshot per keystroke. */ () => { if (this.editable() && !this.composing) this.refresh(true); });
    if (this.kind === "fixed" && typeof initial === "string") this.mountLiteral(initial);
    this.refresh(true);
  }

  /** Return saved source intent, including undefined inheritance distinct from transparent literals. */
  getValue(): ColorValue | undefined {
    return this.kind === "inherit" ? undefined : this.kind === "fixed" ? this.literal?.getValue()
      : this.kind === "named" ? { kind: "palette", id: this.namedId } : this.kind === "theme" ? { kind: "theme", variable: this.themeName } : this.options.initial;
  }
  /** Existing damaged sources can close unchanged; new choices must resolve and remain repairable. */
  isValid(): boolean {
    if (this.composing || (this.kind === "fixed" && !this.literal?.isValid())) return false;
    const value = this.getValue(); if (colorValuesEqual(value, this.options.initial)) return true;
    if (value === undefined) return true;
    if (typeof value === "string") return !!parseLiteralColor(value);
    if (value.kind === "palette") return this.options.preferences().palette.some(pair => pair.id === value.id);
    return isThemeColorName(value.variable) && !this.validation.getIssues().some(issue => colorValuesEqual(issue.source, value));
  }
  /** Disable every local source/literal input while the native shell owns a durable submission. */
  setDisabled(disabled: boolean): void { this.disabled = disabled; this.selector.disabled = disabled; this.tokens.disabled = disabled; this.variable.disabled = disabled; this.namedButton.disabled = disabled; this.literal?.setDisabled(disabled); }
  /** Re-evaluate current palette/CSS context without resampling styles on literal movement. */
  refresh(finishedThemeName: boolean): void {
    if (!this.alive) return;
    const value = this.getValue(), reference = value && typeof value === "object" ? value : undefined, preferences = this.options.preferences(value);
    if (finishedThemeName || preferences !== this.validatedPreferences || !colorValuesEqual(reference, this.validatedSource)) {
      this.validation.update({preferences, references: reference === undefined ? [] : [reference]});
      this.validatedSource = reference; this.validatedPreferences = preferences;
    }
    this.fixedPane.toggle(this.kind === "fixed"); this.namedPane.toggle(this.kind === "named"); this.themePane.toggle(this.kind === "theme");
    this.variable.parentElement?.toggle(this.customVariable);
    this.tokens.setText(this.themeName || this.options.translate("colors.chooseTheme"));
    this.namedButton.setText(colorIdentityText({ kind: "palette", id: this.namedId }, this.options.preferences().palette) || this.options.translate("colors.chooseNamed"));
    this.variable.setAttribute("aria-invalid", String(this.kind === "theme" && !this.isValid()));
    this.feedback.setText(this.kind !== "unsupported" && this.isValid() && !this.validation.getIssues().some(issue => colorValuesEqual(issue.source, value)) ? "" : this.options.translate("colors.invalidSource"));
    if (this.isValid()) this.lastPreview = value;
    this.options.onPreview(this.lastPreview, finishedThemeName && this.kind === "theme" && isThemeColorName(this.themeName)); this.options.onChange();
  }
  /** Cancel only owned local UI resources; an enclosing submitted disk operation keeps its independent lifetime. */
  dispose(): void { if (!this.alive) return; this.alive = false; this.releaseChooser?.(); this.literal?.dispose(); this.validation.dispose(); this.validationRoot.remove(); this.root.remove(); }
  /** Native callbacks cannot alter a retired or pending source draft. */
  private editable(): boolean { return this.alive && !this.disabled && !this.selector.disabled; }
  /** The same literal field serves fixed sources and both variants of the palette editor. */
  private mountLiteral(initial: string): void {
    const t = this.options.translate;
    this.literal = new ColorLiteralEditor(this.fixedPane, { label: t("colors.fixed"), initial,
      labels: { rgb: t("colors.rgb"), value: t("colors.value"), opacity: t("colors.opacity"), reset: t("colors.resetVariant"), invalid: t("colors.invalidLiteral"), legacy: t("colors.legacyLiteral") },
      onChange: /** Literal drag changes preview paint only, never the theme snapshot or settings. */ () => { if (this.alive && this.kind === "fixed") this.refresh(false); } });
  }
}
