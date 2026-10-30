/** Native PNG preview and output shell. Capture/raster services own rendering, ClipboardSession
 * owns gesture-safe copy, and native file handoff owns destination selection. No source/editor
 * or canvas state writer is exposed to this dialog. */
import {Setting, type App, type ButtonComponent, type EventRef} from "obsidian";
import {StyleEditorModal, appendIcon} from "../StyleEditorModal";
import {numberSlider} from "../numberSlider";
import {ClipboardSession} from "../../application/ClipboardSession";
import {artifactFilename} from "../../core/plex/export/artifactFilename";
import {pngClipboardWriter, canSavePng, savePng} from "../../adapters/obsidian/pngExport";
import {captureCanvasImage, type CanvasImageSnapshot} from "./canvasImageSnapshot";
import {renderCanvasPng, type CanvasPng, type CanvasImageScope} from "./canvasImage";
import {CanvasImageError} from "./imageExportLifetime";

export type CanvasImageExportOptions = Readonly<{
  sourceScope: HTMLElement; center?: HTMLElement | null; name: string; mobile: boolean;
  current: () => boolean; closed: () => void;
}>;

/** One canvas's captured pixels, explicit scope/limits and owning-window save/copy lifetime. */
export class CanvasImageExportModal extends StyleEditorModal {
  private readonly capture = new AbortController();
  private raster: AbortController | null = null;
  private snapshot: CanvasImageSnapshot | null = null;
  private output: CanvasPng | null = null;
  private clipboard: ClipboardSession<Blob> | null = null;
  private preview: HTMLImageElement | null = null;
  private previewUrl: string | null = null;
  private status: HTMLElement | null = null;
  private details: HTMLElement | null = null;
  private warnings: HTMLElement | null = null;
  private copyButton: ButtonComponent | null = null;
  private saveButton: ButtonComponent | null = null;
  private scaleControl: ReturnType<typeof numberSlider> | null = null;
  private generation = 0;
  private exportScope: CanvasImageScope = "canvas";
  private scale = 2;
  private filename = "";
  private saving = false;
  private styleChanged = false;
  private cssSubscription: EventRef | null = null;

  /** Keep capture ownership tied to the exact source canvas, including its actual document. */
  constructor(app: App, private readonly options: CanvasImageExportOptions) {super(app);}

  /** Mount native responsive controls before starting expensive preparation. */
  onOpen(): void {
    this.beginEditor(this.options.sourceScope);
    this.cssSubscription = this.app.workspace.on("css-change", /** A changed stylesheet cannot authorize a mixed or outdated preview. */ () => {
      this.styleChanged = true;this.capture.abort();this.raster?.abort();this.fail(new CanvasImageError("retired"));
    });
    this.setTitle(this.translate("export.image.title"));this.modalEl.addClass("kplex-canvas-image-export");
    const {body, actions} = this.scrollableContent();body.createEl("p", {text: this.translate("export.image.help")});
    new Setting(body).setName(this.translate("export.image.scope")).addDropdown(/** Scope reuses the same immutable captured presentation. */ dropdown => dropdown
      .addOption("canvas", this.translate("export.image.canvas")).addOption("viewport", this.translate("export.image.viewport"))
      .onChange(/** Changing crop never changes the live canvas. */ value => {this.exportScope = value === "viewport" ? "viewport" : "canvas";void this.renderPreview();}));
    const label = this.translate("export.image.resolution");
    this.scaleControl = numberSlider(new Setting(body).setName(label), {label, value: this.scale, min: 1, max: 3, step: 1,
      format: /** Keep the permanent output independent of delayed raster completion. */ value => `${value}×`,
      isCurrent: /** Retired sliders cannot restart image work. */ () => this.canEdit(),
      onChange: /** The shared latest-value owner coalesces pending numeric gestures. */ async value => {this.scale = value;await this.renderPreview();}});
    this.preview = body.createEl("img", {cls: "kplex-image-export-preview", attr: {alt: this.translate("export.image.preview")}});
    this.details = body.createDiv({cls: "setting-item-description"});this.warnings = body.createDiv({cls: "setting-item-description"});
    this.status = body.createDiv({attr: {role: "status", "aria-live": "polite"}});
    new Setting(body).setName(this.translate("export.image.filename")).addText(/** Suggested filename only; the system owns its destination. */ text => {
      const stem = this.options.name.replace(/[\\/:*?"<>|#[\]\r\n]/g, " ").trim().slice(0, 100) || this.translate("export.image.filenameStem");
      this.filename = `${stem}.png`;text.inputEl.maxLength = 200;text.setValue(this.filename).onChange(/** No filesystem operation occurs while editing. */ value => {this.filename = value;this.status?.empty();});
    });
    new Setting(actions)
      .addButton(/** Encoding completes before this button can acquire clipboard activation. */ button => {this.copyButton = button;button.setButtonText(this.translate("export.image.copy")).setDisabled(true).onClick(/** The writer starts in this trusted handler turn. */ () => this.copy());appendIcon(button.buttonEl, "copy");})
      .addButton(/** Save uses exactly the encoded preview, never another scene read. */ button => {this.saveButton = button;button.setButtonText(this.translate("export.image.save")).setCta().setDisabled(true).onClick(/** Explicit native handoff remains independently guarded. */ () => {void this.save();});appendIcon(button.buttonEl, "save");})
      .addButton(/** Cancel retires capture/decode/clipboard work without touching the canvas. */ button => button.setButtonText(this.translate("common.cancel")).onClick(/** Native close/migration share the same cleanup. */ () => this.close()));
    this.status.setText(this.translate("export.image.loading"));void this.prepare();
  }

  /** Read the committed DOM once; format/scale changes subsequently use only captured data. */
  private async prepare(): Promise<void> {
    try {
      this.snapshot = await captureCanvasImage(this.options.sourceScope, {center: this.options.center, signal: this.capture.signal,
        maximumElements: this.options.mobile ? 8000 : undefined, maximumCharacters: this.options.mobile ? 8_000_000 : undefined,
        current: /** Source, modal, session and native window must all remain live. */ () => this.current()});
      if (this.current()) await this.renderPreview();
    } catch (error) {this.fail(error);}
  }

  /** Replace one preview transaction, immediately retiring older resolutions or crops. */
  private async renderPreview(): Promise<void> {
    if (!this.snapshot || !this.canEdit() || this.saving) return;
    const generation = ++this.generation;this.raster?.abort();this.raster = new AbortController();this.clipboard?.dispose();this.clipboard = null;
    this.output = null;this.copyButton?.setDisabled(true);this.saveButton?.setDisabled(true);this.status?.setText(this.translate("export.image.loading"));
    try {
      const result = await renderCanvasPng(this.modalEl.ownerDocument, this.snapshot, this.exportScope, {scale: this.scale,
        maximumPixels: this.options.mobile ? 4_000_000 : undefined, signal: this.raster.signal,
        current: /** A late raster cannot revive a newer crop or a migrated/changed source. */ () => generation === this.generation && this.current()});
      if (generation !== this.generation || !this.current()) return;
      this.releasePreview();this.output = result;
      const owner = this.modalEl.ownerDocument.defaultView;if (!owner || !this.preview) return;
      this.previewUrl = owner.URL.createObjectURL(result.blob);this.preview.src = this.previewUrl;
      this.details?.setText(this.translate("export.image.dimensions", {width: result.width, height: result.height}));this.warnings?.empty();
      for (const key of ["scroll", "media", "fonts"] as const) if (this.snapshot.warnings[key]) this.warnings?.createEl("p", {text: this.translate(key === "scroll" ? "export.image.clip" : `export.image.${key}`)});
      if (result.reduced) this.warnings?.createEl("p", {text: this.translate("export.image.reduced")});
      const clipboard = pngClipboardWriter(this.modalEl.ownerDocument), save = canSavePng(this.modalEl.ownerDocument, result.blob);
      this.copyButton?.setDisabled(!clipboard);this.saveButton?.setDisabled(!save);this.status?.empty();
      if (!clipboard) this.warnings?.createEl("p", {text: this.translate("export.image.copyUnavailable")});
      if (!save) this.warnings?.createEl("p", {text: this.translate("export.image.saveUnavailable")});
    } catch (error) {if (generation === this.generation) this.fail(error);}
  }

  /** Keep failure reasons useful without exposing native resource paths or claiming success. */
  private fail(error: unknown): void {
    if (!this.canEdit() || !this.modalEl.isConnected) return;
    const key = error instanceof CanvasImageError && error.reason === "limit" ? "export.image.limit" : error instanceof CanvasImageError && error.reason === "retired" || !this.options.current() ? "export.image.stale" : "export.image.failed";
    this.clipboard?.dispose();this.clipboard = null;this.status?.setText(this.translate(key));this.output = null;this.copyButton?.setDisabled(true);this.saveButton?.setDisabled(true);
  }
  /** Captured output can only be published while its native canvas/session remains the same. */
  private current(): boolean {return this.canEdit() && this.modalEl.isConnected && !this.styleChanged && !this.capture.signal.aborted && this.options.current();}

  /** Native copy is synchronous to activation; the state machine owns late promise retirement. */
  private copy(): void {
    if (!this.current()) {this.fail(new CanvasImageError("retired"));return;}
    if (!this.output || this.saving) return;this.clipboard?.dispose();
    this.clipboard = new ClipboardSession(this.output.blob, pngClipboardWriter(this.modalEl.ownerDocument));
    this.clipboard.listen(/** Closing or replacing the preview retires this exact payload's feedback. */ state => {
      this.copyButton?.setDisabled(state === "copying");if (state === "copied" || state === "failed") this.status?.setText(this.translate(state === "copied" ? "export.image.copied" : "export.image.copyFailed"));
    });this.clipboard.copy();
  }

  /** Native handoff starts from the prepared Blob and preserves source/editor/session state. */
  private async save(): Promise<void> {
    if (!this.current()) {this.fail(new CanvasImageError("retired"));return;}
    if (!this.output || this.saving) return;
    const filename = artifactFilename(this.filename, "png");if (!filename) {this.status?.setText(this.translate("export.image.invalidFilename"));return;}
    const controls = Array.from(this.contentEl.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>("input, select, button"));
    const disabled = controls.map(/** Preserve pre-existing capability/clipboard exclusions. */ control => control.disabled);
    for (const control of controls) if (control.textContent !== this.translate("common.cancel")) control.disabled = true;
    this.saving = true;
    try {await savePng(this.modalEl.ownerDocument, filename, this.output.blob, /** A retired source cannot start another system handoff. */ () => this.current());if (this.current()) this.status?.setText(this.translate("export.image.handedOff"));}
    catch (error: unknown) {if (this.current() && !(typeof error === "object" && error !== null && "name" in error && error.name === "AbortError")) this.status?.setText(this.translate("export.image.saveFailed"));}
    finally {this.saving = false;if (this.current()) controls.forEach(/** Detached controls cannot be revived by a share-sheet completion. */ (control, index) => {control.disabled = disabled[index];});}
  }

  /** Release object URLs before replacing/removing the actual owning-document image. */
  private releasePreview(): void {
    this.preview?.removeAttribute("src");if (this.previewUrl) (this.preview?.ownerDocument.defaultView?.URL ?? URL).revokeObjectURL(this.previewUrl);this.previewUrl = null;
  }
  /** Closing, Escape, source disposal and popout migration all stop every temporary owner. */
  onClose(): void {
    if (this.cssSubscription) this.app.workspace.offref(this.cssSubscription);this.cssSubscription = null;
    super.onClose();this.capture.abort();this.raster?.abort();this.generation++;this.clipboard?.dispose();this.scaleControl?.dispose();this.releasePreview();
    this.snapshot = null;this.output = null;this.contentEl.empty();this.options.closed();
  }
}
