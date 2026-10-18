/**
 * Reusable host-bound literal editor content, independent of a modal or persistence owner. One
 * public native RGB adapter, explicit opacity and partial/IME-safe text share the portable parser.
 * Opening never rewrites a literal. The containing editor owns Save/Cancel and calls dispose.
 */
import { colorRgbInput, formatLiteralColor, literalRgbHex, parseLiteralColor, type LiteralColor } from "../core/contracts/colorValue";
import { mountRgbColorControl, type RgbColorControl } from "../adapters/obsidian/rgbColorControl";

export type LiteralColorLabels = Readonly<{ rgb: string; value: string; opacity: string; reset: string; invalid: string; legacy: string }>;
export type LiteralColorEditorOptions = Readonly<{
  label: string; initial: string; labels: LiteralColorLabels; onChange: (value: string, valid: boolean) => void;
}>;

/** One detached literal draft; native callbacks and DOM events are inert after disposal. */
export class ColorLiteralEditor {
  private static nextId = 0;
  private readonly root: HTMLFieldSetElement;
  private readonly text: HTMLInputElement;
  private readonly percentage: HTMLInputElement;
  private readonly slider: HTMLInputElement;
  private readonly feedback: HTMLElement;
  private readonly legacyHelp: HTMLElement;
  private readonly swatch: HTMLElement;
  private readonly rgb: RgbColorControl;
  private alive = true;
  private disabled = false;
  private composing = false;
  private textValid = true;
  private opacityValid = true;
  private value: string;
  private parsed: LiteralColor | null;

  /** Mount controls without notifying, saving, harvesting CSS or normalizing the original literal. */
  constructor(container: HTMLElement, private readonly options: LiteralColorEditorOptions) {
    this.value = options.initial; this.parsed = parseLiteralColor(this.value);
    const id = `kplex-literal-${++ColorLiteralEditor.nextId}`;
    this.root = container.createEl("fieldset", { cls: "kplex-literal-editor" });
    this.root.createEl("legend", { text: options.label });
    const row = this.root.createDiv({ cls: "kplex-literal-controls" });
    this.swatch = row.createSpan({ cls: "kplex-color-swatch", attr: { "aria-hidden": "true" } });
    this.rgb = mountRgbColorControl(row.createDiv({ cls: "kplex-literal-rgb" }), colorRgbInput(this.value, "#808080"), options.labels.rgb,
      /** RGB changes retain the exact parsed alpha; opaque legacy expressions require explicit text conversion first. */ hex => {
        if (!this.editable() || !this.parsed) return;
        const rgb = parseLiteralColor(hex); if (!rgb) return;
        this.install({ ...rgb, alpha: this.parsed.alpha }, "rgb");
      });
    const textLabel = row.createEl("label", { text: options.labels.value });
    this.text = textLabel.createEl("input", { attr: { type: "text", spellcheck: "false", autocomplete: "off", "aria-describedby": id + "-error" } });
    this.text.value = this.displayValue();
    this.text.addEventListener("compositionstart", /** Retain the last valid preview throughout composition. */ () => { if (this.editable()) { this.composing = true; this.notify(); } });
    this.text.addEventListener("compositionend", /** Validate once after the native IME commits, without rewriting its text/caret. */ () => { if (this.editable()) { this.composing = false; this.readText(true); } });
    this.text.addEventListener("input", /** Partial text stays in the native field; only valid complete values repaint the draft. */ () => { if (this.editable() && !this.composing) this.readText(false); });
    this.text.addEventListener("blur", /** Associate an error with a completed invalid edit. */ () => { if (this.editable() && !this.composing) this.readText(true); });
    const opacity = this.root.createDiv({ cls: "kplex-literal-opacity" });
    const sliderLabel = opacity.createEl("label", { text: options.labels.opacity });
    this.slider = sliderLabel.createEl("input", { attr: { type: "range", min: "0", max: "100", step: "0.1" } });
    this.percentage = opacity.createEl("input", { attr: { type: "number", min: "0", max: "100", step: "any", "aria-label": options.labels.opacity, "aria-describedby": id + "-error" } });
    opacity.createSpan({ text: "%", attr: { "aria-hidden": "true" } });
    this.slider.addEventListener("input", /** An explicit slider action changes opacity only. */ () => { if (this.editable() && this.parsed) this.install({ ...this.parsed, alpha: Number(this.slider.value) / 100 }, "slider"); });
    this.percentage.addEventListener("input", /** Empty/partial/invalid percentages never become an accidental zero. */ () => {
      if (!this.editable() || !this.parsed) return;
      const text = this.percentage.value, percentage = Number(text);
      this.opacityValid = text.trim() !== "" && Number.isFinite(percentage) && percentage >= 0 && percentage <= 100;
      if (this.opacityValid) this.install({ ...this.parsed, alpha: percentage / 100 }, "percentage"); else this.notify();
    });
    this.percentage.addEventListener("blur", /** Reveal validation after a completed invalid opacity edit. */ () => { if (this.editable()) this.showError(); });
    this.feedback = this.root.createDiv({ cls: "kplex-color-error", attr: { id: id + "-error", role: "status", "aria-live": "polite" } });
    this.legacyHelp = this.root.createDiv({ cls: "setting-item-description" });
    const reset = this.root.createEl("button", { text: options.labels.reset, attr: { type: "button" } });
    reset.addEventListener("click", /** Reset only this variant, retaining its counterpart. */ () => this.reset());
    this.sync("initial");
  }

  /** Restore this variant's exact opening literal, including alpha and original serialization. */
  reset(): void {
    if (!this.editable()) return;
    this.value = this.options.initial; this.parsed = parseLiteralColor(this.value); this.textValid = true; this.opacityValid = true; this.composing = false;
    this.text.value = this.displayValue(); this.sync("reset"); this.showError(); this.notify();
  }

  /** Expose the last valid draft; callers still check validity before submitting. */
  getValue(): string { return this.value; }
  /** Composition and partial numeric input exclude submission without discarding the prior preview. */
  isValid(): boolean { return this.textValid && this.opacityValid && !this.composing; }
  /** Freeze native input along with the containing explicit save operation. */
  setDisabled(disabled: boolean): void { this.disabled = disabled; this.root.disabled = disabled; this.rgb.setDisabled(disabled || !this.parsed); this.slider.disabled = disabled || !this.parsed; this.percentage.disabled = disabled || !this.parsed; }
  /** Remove only this owned field and retire even programmatically delivered late native callbacks. */
  dispose(): void { if (!this.alive) return; this.alive = false; this.rgb.dispose(); this.root.remove(); }
  /** Every user callback checks both its exact lifetime and durable-operation exclusion. */
  private editable(): boolean { return this.alive && !this.disabled && !this.root.disabled; }
  /** Parse a complete text value without setting the text input or moving its caret. */
  private readText(final: boolean): void {
    const parsed = parseLiteralColor(this.text.value);
    this.textValid = !!parsed || this.text.value === this.options.initial;
    if (parsed) { this.value = this.text.value; this.parsed = parsed; this.opacityValid = true; this.sync("text"); }
    else if (this.textValid) { this.value = this.options.initial; this.parsed = parseLiteralColor(this.value); this.opacityValid = true; this.sync("text"); }
    if (final || this.textValid) this.showError(); this.notify();
  }
  /** Explicit RGB/opacity actions create a new literal while retaining untouched channels exactly. */
  private install(parsed: LiteralColor, origin: string): void {
    const same = this.parsed && this.parsed.red === parsed.red && this.parsed.green === parsed.green && this.parsed.blue === parsed.blue && this.parsed.alpha === parsed.alpha;
    this.parsed = parsed; if (!same) this.value = formatLiteralColor(parsed); this.textValid = true;
    if (origin === "slider" || origin === "percentage") this.opacityValid = true;
    this.sync(origin); this.showError(); this.notify();
  }
  /** Synchronize peer controls only; never overwrite the user's active text/number draft. */
  private sync(origin: string): void {
    this.rgb.setDisabled(this.disabled || !this.parsed); this.slider.disabled = this.disabled || !this.parsed; this.percentage.disabled = this.disabled || !this.parsed;
    this.legacyHelp.setText(this.parsed ? "" : this.options.labels.legacy);
    if (!this.parsed) return;
    this.rgb.setValue(literalRgbHex(this.parsed));
    this.swatch.setCssProps({ "--kplex-color-swatch": formatLiteralColor(this.parsed) });
    if (origin !== "text") this.text.value = this.displayValue();
    if (origin !== "percentage" && this.opacityValid) this.percentage.value = String(Number((this.parsed.alpha * 100).toFixed(2)));
    if (origin !== "slider") this.slider.value = String(this.parsed.alpha * 100);
  }
  /** Display two alpha decimals without changing the exact saved draft or rewriting active text. */
  private displayValue(): string {
    return this.parsed && /^rgba?\(/i.test(this.value.trim())
      ? formatLiteralColor({...this.parsed, alpha: Number(this.parsed.alpha.toFixed(2))}) : this.value;
  }
  /** Install an explicitly recommended variant; the containing dialog still owns Save and Cancel. */
  setValue(value: string): void {
    if (!this.editable()) return;
    const parsed = parseLiteralColor(value); if (!parsed) return;
    this.value = value; this.parsed = parsed; this.textValid = true; this.opacityValid = true; this.composing = false;
    this.sync("recommendation"); this.showError(); this.notify();
  }
  /** Error text and accessible invalid state describe validation without altering the draft. */
  private showError(): void {
    this.feedback.setText(this.isValid() ? "" : this.options.labels.invalid);
    this.text.setAttribute("aria-invalid", String(!this.textValid)); this.percentage.setAttribute("aria-invalid", String(!this.opacityValid));
  }
  /** Notify local draft/preview owners only; this component has no disk or graph capability. */
  private notify(): void { if (this.alive) this.options.onChange(this.value, this.isValid()); }
}
