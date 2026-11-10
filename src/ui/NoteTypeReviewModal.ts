/** Manual, native YAML maintenance UI. Discovery, file-level preview and sequential repair
 * are separate states; closing cancels pending files without rolling back accepted native writes. */
import type {TFile, ButtonComponent} from "obsidian";
import {KplexModal, FormSetting as Setting, formActions, iconButton} from "../adapters/obsidian/KplexModal";
import {reviewNoteTypes, inspectNoteType, repairNoteTypes, type NoteTypeFinding, type NoteTypeReport, type NoteTypeOutcome} from "../adapters/obsidian/noteTypeReview";
import {noteTypeAsTag} from "../adapters/obsidian/tagNoteType";
import {StyleManagerList} from "./StyleManagerList";
import {collectionWindow} from "./components/collectionWindow";
import {TagNameSuggest} from "./TagNameSuggest";
import type KplexPlugin from "../main";

export class NoteTypeReviewModal extends KplexModal {
  private alive = false;
  private generation = 0;
  private cancelled = false;
  private running = false;
  private report: NoteTypeReport | null = null;
  private scanFailed = false;
  private query = "";
  private expanded = new Set<string>();
  private excluded = new Set<NoteTypeFinding>();
  private visibleFiles = 40;
  private manager: StyleManagerList | null = null;
  private status: HTMLElement | null = null;
  private preview: readonly NoteTypeFinding[] | null = null;
  private replacement = "";
  private outcomes: readonly NoteTypeOutcome[] = [];
  private suggestion?: TagNameSuggest;
  private releaseYield: (() => void) | null = null;
  private confirmButton?: ButtonComponent;

  /** An individual initializer uses the same reviewed workflow with one captured note. */
  constructor(private readonly plugin: KplexPlugin, private readonly file?: TFile, private onClosed?: () => void) {super(plugin.app);}

  /** Start exactly one on-demand metadata pass; mounting never mutates a document. */
  onOpen(): void {this.alive = true;this.titleEl.setText(this.plugin.translator("noteType.review"));void this.scan();}

  /** Yield in the modal's actual window; close cancels and settles its sole pending timer. */
  private yieldToOwner(): Promise<void> {
    return new Promise(resolve => {const owner = this.modalEl.ownerDocument.defaultView;if (!owner) {resolve();return;}
      const timer = owner.setTimeout(() => {this.releaseYield = null;resolve();}, 0);
      this.releaseYield = () => {owner.clearTimeout(timer);this.releaseYield = null;resolve();};
    });
  }

  /** Cache gaps and lack of YAML are coverage information, not assumed clean inline selectors. */
  private async scan(): Promise<void> {
    if (this.running) return;const generation = ++this.generation;this.cancelled = false;this.running = true;this.scanFailed = false;this.report = null;this.preview = null;this.outcomes = [];this.excluded.clear();this.render();
    const field = this.plugin.settings.noteTypeField, configuration = this.plugin.settings.noteTypeProperties;
    try {
      if (this.file) {
        const metadata = this.app.metadataCache.getFileCache(this.file), valid = this.app.vault.getFileByPath(this.file.path) === this.file;
        this.report = {findings: metadata && valid ? inspectNoteType(this.file, metadata.frontmatter ?? {}, field, configuration) : [], scanned: 1, total: 1, unavailable: !metadata || !valid ? 1 : 0, withoutYaml: !metadata?.frontmatter ? 1 : 0, cancelled: false};
        const findings = this.report.findings.filter(finding => finding.kind === "missing-properties");if (findings.length) this.preview = findings;
      } else this.report = await reviewNoteTypes(this.app, field, configuration, () => this.alive && this.generation === generation && !this.cancelled,
        () => this.yieldToOwner(), (scanned, total) => {if (this.alive && this.generation === generation) this.status?.setText(this.plugin.translator("noteType.scanning", {scanned, total}));});
    } catch (error) {console.error("K-Plex note type review failed", error);this.scanFailed = true;}
    finally {if (this.alive && this.generation === generation) {this.running = false;this.render();}}
  }

  /** Native list mechanics bound mounted groups; preview state never submits automatically. */
  private render(): void {
    if (!this.alive) return;this.suggestion?.close();this.suggestion = undefined;this.confirmButton = undefined;this.contentEl.empty();this.manager = null;const t = this.plugin.translator;
    this.contentEl.createEl("p", {text: t("noteType.reviewHelp"), cls: "setting-item-description"});
    this.status = this.contentEl.createDiv({cls: "setting-item-description", attr: {role: "status", "aria-live": "polite"}});
    if (this.report) this.status.setText(t("noteType.coverage", {scanned: this.report.scanned, total: this.report.total, unavailable: this.report.unavailable, withoutYaml: this.report.withoutYaml}));
    if (this.scanFailed) this.status.setText(t("actions.failed"));
    if (this.preview) {this.renderPreview();return;}
    this.manager = new StyleManagerList(this.contentEl, t, {placeholder: t("nodeProperties.search"), aria: t("nodeProperties.search")}, query => {this.query = query;this.renderGroups();});
    this.manager.search.value = this.query;
    this.manager.action(t("noteType.recheck"), "refresh-cw", () => {void this.scan();}).disabled = this.running;
    this.renderGroups();
    formActions(this.contentEl).addButton(button => iconButton(button, t(this.running ? "common.cancel" : "common.done"), "x").onClick(() => {if (this.running) this.cancelled = true;else this.close();}));
  }

  /** Each affected value has a distinct-note count, inspect disclosure and explicit repair action. */
  private renderGroups(): void {
    const manager = this.manager;if (!manager) return;manager.list.empty();const t = this.plugin.translator;
    const groups = new Map<string, NoteTypeFinding[]>();
    for (const finding of this.report?.findings ?? []) {
      if (this.query && !`${finding.value} ${finding.path}`.toLocaleLowerCase().includes(this.query)) continue;
      const key = JSON.stringify([finding.kind, finding.value]);const rows = groups.get(key) ?? [];rows.push(finding);groups.set(key, rows);
    }
    for (const kind of ["invalid", "missing-tag", "missing-properties", "manual"] as const) {
      const entries = [...groups].filter(([, rows]) => rows[0].kind === kind);if (!entries.length) continue;
      manager.list.createEl("h3", {text: t(`noteType.group.${kind}`)});
      const windowed = manager.window(entries);
      for (const [key, rows] of windowed.visible) {
        const group = manager.list.createDiv({cls: "kplex-note-type-review-group"});
        new Setting(group).setName(rows[0].value.slice(0, 256)).setDesc(t("noteType.affected", {count: rows.length}))
          .addButton(button => iconButton(button, t("noteType.fix"), "wrench").setDisabled(kind === "manual" || this.running).onClick(() => {this.preview = rows;this.replacement = "";this.outcomes = [];this.visibleFiles = 40;this.render();}))
          .addButton(button => iconButton(button, t("noteType.viewNotes"), "eye").onClick(() => {if (this.expanded.has(key)) this.expanded.delete(key);else this.expanded.add(key);this.renderGroups();}));
        if (this.expanded.has(key)) this.renderFiles(group, rows, false);
      }
      manager.more(windowed, () => this.renderGroups());
    }
    if (!groups.size && !this.running && !this.scanFailed && !this.report?.unavailable && !this.report?.cancelled) manager.list.createEl("p", {text: t("noteType.noFindings")});
  }

  /** The replacement prompt, per-file effects and exclusions are visible before one Confirm action. */
  private renderPreview(): void {
    const rows = this.preview;if (!rows?.length) return;const t = this.plugin.translator, kind = rows[0].kind;
    this.contentEl.createEl("h3", {text: t(`noteType.group.${kind}`)});
    let changePreview: HTMLElement | undefined;
    /** The exact canonical value and matching YAML tag stay visible beside the replacement prompt. */
    const showChange = (): void => {
      const tag = noteTypeAsTag(this.replacement);
      // These are literal YAML keys/values, not translated labels: copying the preview must retain source spelling.
      const diff = tag ? `${rows[0].field}: ${JSON.stringify(rows[0].value)} → ${JSON.stringify(tag)}\ntags: +${JSON.stringify(tag)}` : t("noteType.invalidTag");
      changePreview?.setText(diff);
    };
    if (kind === "invalid") new Setting(this.contentEl).setName(t("noteType.replacement")).setDesc(t("noteType.replacementHelp")).addText(input => {
      input.setValue(this.replacement).onChange(value => {this.replacement = value;this.refreshApply();showChange();});
      this.suggestion = new TagNameSuggest(this.app, input.inputEl, []);
    });
    if (kind === "invalid") {changePreview = this.contentEl.createEl("pre", {cls: "kplex-note-type-change-preview"});showChange();}
    const explanation = kind === "invalid" ? t("noteType.replacePreview", {value: rows[0].value}) : kind === "missing-tag" ? t("noteType.tagPreview", {tag: `#${rows[0].tag ?? ""}`}) : t("noteType.defaultsPreview");
    this.contentEl.createEl("p", {text: explanation, cls: "setting-item-description"});
    this.renderFiles(this.contentEl, rows, true);
    formActions(this.contentEl)
      .addButton(button => iconButton(button, t(this.running ? "common.cancel" : "noteType.back"), this.running ? "square" : "arrow-left").onClick(() => {if (this.running) this.cancelled = true;else {this.preview = null;this.render();}}))
      .addButton(button => iconButton(button, t("noteType.recheck"), "refresh-cw").setDisabled(this.running).onClick(() => {void this.scan();}))
      .addButton(button => {this.confirmButton = iconButton(button, t("noteType.apply"), "check").setCta();button.onClick(() => {void this.apply();});});
    this.refreshApply();
    if (this.outcomes.length) this.showResults(this.outcomes);
  }

  /** Inspectable paths and exact missing fields reuse native rows; only preview checkboxes grant inclusion. */
  private renderFiles(container: HTMLElement, rows: readonly NoteTypeFinding[], editable: boolean): void {
    const t = this.plugin.translator, windowed = collectionWindow(rows, this.visibleFiles, 40);
    for (const finding of windowed.visible) {
      const row = new Setting(container).setDesc(finding.missing.join(", "));
      const link = row.nameEl.createEl("a", {text: finding.path, href: "#", cls: "internal-link"});
      link.addEventListener("click", event => {event.preventDefault();if (this.app.vault.getFileByPath(finding.path) === finding.file) void this.plugin.openOntologyUsageDocument(finding.path, false);});
      if (editable) row.addToggle(toggle => {toggle.toggleEl.setAttribute("aria-label", t("noteType.includeFile", {path: finding.path}));toggle.setValue(!this.excluded.has(finding)).setDisabled(this.running || this.outcomes.length > 0).onChange(include => {if (include) this.excluded.delete(finding);else this.excluded.add(finding);this.refreshApply();});});
      const outcome = this.outcomes.find(result => result.finding === finding);if (outcome) row.descEl.createDiv({text: t(`noteType.result.${outcome.status}`)});
    }
    if (windowed.remaining) new Setting(container).addButton(button => button.setButtonText(t("collection.showMore", {count: windowed.nextCount})).onClick(() => {this.visibleFiles += 40;this.render();}));
  }

  /** Progress updates only one status node; large batches never rebuild the file form after every write. */
  private async apply(): Promise<void> {
    if (!this.alive || this.running || this.outcomes.length || !this.preview) return;
    const selected = this.preview.filter(finding => !this.excluded.has(finding));if (!selected.length) return;
    this.running = true;this.cancelled = false;this.render();
    try {this.outcomes = await repairNoteTypes(this.app, selected, this.replacement, {
      field: () => this.plugin.settings.noteTypeField, properties: () => this.plugin.settings.noteTypeProperties,
      set: (file, field, opening, value, current, stamp) => this.plugin.editNoteType(file, field, opening, value, false, current, stamp),
      ensureMembership: (file, field, opening, current, stamp) => this.plugin.ensureNoteTypeTag(file, field, opening, current, stamp),
      initialize: (file, field, opening, rows, current) => this.plugin.addNoteTypeProperties(file, field, opening, rows, current),
    }, () => this.alive && !this.cancelled, outcomes => {if (this.alive) this.status?.setText(this.plugin.translator("noteType.processing", {count: outcomes.length, total: selected.length}));});}
    finally {this.running = false;if (this.alive) this.render();}
  }

  /** Keep native component state and its event gate aligned, including an empty selected-file set. */
  private refreshApply(): void {
    this.confirmButton?.setDisabled(this.running || this.outcomes.length > 0 || !this.preview?.some(finding => !this.excluded.has(finding))
      || this.preview[0]?.kind === "invalid" && !noteTypeAsTag(this.replacement));
  }

  /** Distinguish durable success, no-op, stale skip, failure and unprocessed cancellation. */
  private showResults(outcomes: readonly NoteTypeOutcome[]): void {
    const count = (status: NoteTypeOutcome["status"]): number => outcomes.filter(result => result.status === status).length;
    this.status?.setText(this.plugin.translator("noteType.results", {changed: count("changed"), unchanged: count("unchanged"), skipped: count("skipped"), failed: count("failed"), pending: count("pending")}));
  }

  /** Cancel future discoveries/writes, settle the owner-window yield and release the originating session. */
  onClose(): void {this.alive = false;this.cancelled = true;this.generation++;this.releaseYield?.();this.suggestion?.close();this.contentEl.empty();const closed = this.onClosed;this.onClosed = undefined;closed?.();}
}
