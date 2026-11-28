/** Native publication authoring, review and download. Selection, mutation and graph authority are separate owners. */
import {getAllTags, type App, type ButtonComponent} from "obsidian";
import {createRoot, type Root} from "react-dom/client";
import {readPublicationProfiles, type PublicationProfiles} from "../../application/publish/profiles";
import {DEFAULT_PUBLISH_UUID_PROPERTY, parsePublishProfile, publicationMediaAllowed, type PublishProfile, type PublishRule, type PublishSelectionIssue} from "../../application/publish/selection";
import {readRuntimePack, RUNTIME_PACK_MAX_BYTES, type PublicationDigest, type RuntimePack} from "../../application/publish/runtimePack";
import {assemblePublicationSite, zipPublication} from "../../application/publish/sitePackage";
import {publicationNotePath} from "../../core/plex/publication";
import {suggestedArtifactFilename} from "../../core/plex/export/artifactFilename";
import type {GraphIndex} from "../../index/GraphIndex";
import type {Translator} from "../../lang";
import type {KplexSettings} from "../../settings";
import {ActionTargetPicker, type ActionPickerItem} from "../../ui/ActionTargetPicker";
import {PredicateExpressionField} from "../../ui/predicates/PredicateExpressionField";
import {formActions, formSelect, FormSetting, KplexModal} from "./KplexModal";
import {createPublishSelection, type NativePublishSelection, type PublishSelectionPreview, type PublishUuidOutcome} from "./publishSelection";
import {capturePublishGraph, PublishGraphError} from "./publishGraph";
import {capturePublicationContent, inspectPublicationContent, PublicationContentError} from "./publishContent";
import {downloadNativeArtifact} from "./pngExport";

type RuleGroup = "include" | "exclude";
type RuleKind = PublishRule["kind"];
const ruleKinds: readonly RuleKind[] = ["note", "folder", "tag", "predicate"];
type PublishPorts = Readonly<{
  translate: Translator; version: string; index: GraphIndex; revision: () => number;
  settings: () => KplexSettings; saveProfiles: (opening: unknown, next: PublicationProfiles, current: () => boolean) => Promise<boolean>;
  indexActivity: () => void;
  closed: () => void;
}>;
type PreviewContent = Awaited<ReturnType<typeof inspectPublicationContent>>;
type PreviewGraph = Awaited<ReturnType<typeof capturePublishGraph>>;
type Work = Readonly<{signal: AbortSignal; current: () => boolean}>;

/** A native modal keeps the editable profile separate from read-only review and consent. */
export class PublishModal extends KplexModal {
  readonly #selection;
  private opened = false;
  private generation = 0;
  private work: AbortController | null = null;
  private graphAudit: AbortSignal | null = null;
  private draft: PublishProfile;
  private opening: unknown;
  private profiles: PublicationProfiles | null;
  private review: PublishSelectionPreview | null = null;
  private ids: PublishUuidOutcome | null = null;
  private graph: PreviewGraph | null = null;
  private media: PreviewContent | null = null;
  private pack: RuntimePack | null = null;
  private approvedMedia = new Set<string>();
  private omitDrawings = false;
  private prepareAvailable = false;
  private confirmDelete = false;
  private previewEl: HTMLElement | null = null;
  private statusEl: HTMLElement | null = null;
  private exportButton: ButtonComponent | null = null;
  private cancelButton: ButtonComponent | null = null;
  private previewButton: ButtonComponent | null = null;
  private picker: ActionTargetPicker<string> | null = null;
  private ruleRoots: Root[] = [];

  /** Capture profile settings when invoked. Opening Publish never runs a graph or a vault scan. */
  constructor(app: App, private readonly ports: PublishPorts) {
    super(app);
    this.opening = ports.settings().publishProfiles;
    this.profiles = readPublicationProfiles(this.opening);
    this.draft = this.profiles?.profiles[0] ?? this.newProfile();
    this.#selection = createPublishSelection(app, {
      current: () => this.opened,
      createId: () => this.owner().crypto.randomUUID(),
      yield: () => this.yieldWork(),
    });
  }

  /** Always use the native form's current open document. */
  private owner() {
    const owner = this.contentEl.ownerDocument.defaultView;
    if (!owner || owner.closed) throw new Error("Publication owner retired");
    return owner;
  }

  /** Local draft identity never derives from a path, title or existing publishable UUID. */
  private newProfile(): PublishProfile {
    return {version: 1, id: this.owner().crypto.randomUUID(), title: "", entryPath: "", uuidProperty: DEFAULT_PUBLISH_UUID_PROPERTY,
      include: [], exclude: [], includePaths: [], excludePaths: [], properties: [], aliases: false, fullText: false, includeMedia: false, theme: false};
  }

  /** Render fields with the complete shared native layout and preserve edited controls during review. */
  override onOpen(): void {
    this.opened = true;
    this.setTitle(this.ports.translate("publish.title"));
    this.modalEl.addClass("kplex-publish-modal");
    this.renderForm();
  }

  /** Retire async results, file readers, predicate controls and the exact captured review. */
  override onClose(): void {
    if (!this.opened) return;
    this.opened = false;
    this.generation++;
    this.work?.abort();
    this.work = null;
    this.graphAudit = null;
    this.ports.indexActivity();
    this.#selection.dispose();
    this.picker?.close();
    this.releaseRules();
    this.contentEl.replaceChildren();
    this.ports.closed();
  }

  /** Only explicitly approved graph preparation counts as foreground index work. */
  indexPreparationFocused(): boolean {
    const document = this.contentEl.ownerDocument;
    return this.opened && Boolean(this.graphAudit && !this.graphAudit.aborted) && document.visibilityState !== "hidden" && document.hasFocus();
  }

  /** Cancel in-flight work and retire review whenever the underlying private draft changes. */
  private update(patch: Partial<PublishProfile>): void {
    this.draft = {...this.draft, ...patch};
    this.retireReview();
    this.status(this.ports.translate("publish.unsaved"));
    this.renderReview();
  }

  /** Preserve per-file receipts only until another author action changes the review. */
  private retireReview(): void {
    this.generation++;
    this.work?.abort();
    this.work = null;
    this.#selection.invalidate();
    this.review = this.graph = this.media = null;
    this.ids = null;
    this.approvedMedia.clear();
    this.omitDrawings = false;
    this.prepareAvailable = false;
  }

  /** Unmount shared predicate fields before replacing their host rows. */
  private releaseRules(): void {
    for (const root of this.ruleRoots.splice(0)) root.unmount();
  }

  /** Reuse native dropdown labels and host-owned picker behavior for profile and selection. */
  private renderForm(): void {
    const t = this.ports.translate;
    this.releaseRules();
    this.contentEl.replaceChildren();
    const sections = this.contentEl.createDiv({cls: "kplex-publish-sections"});
    const fields = sections.createDiv({cls: "kplex-publish-fields"});
    this.previewEl = sections.createDiv({cls: "kplex-publish-review"});
    formSelect(new FormSetting(fields).setName(t("publish.profile"))).addDropdown(control => {
      control.addOption("", t("publish.newProfile"));
      for (const profile of this.profiles?.profiles ?? []) control.addOption(profile.id, profile.title);
      control.setValue(this.profiles?.profiles.some(item => item.id === this.draft.id) ? this.draft.id : "").onChange(id => {
        this.retireReview();
        this.confirmDelete = false;
        this.draft = this.profiles?.profiles.find(item => item.id === id) ?? this.newProfile();
        this.renderForm();
      });
    });
    new FormSetting(fields).setName(t("publish.name")).addText(input => input.setValue(this.draft.title).onChange(title => this.update({title})));
    new FormSetting(fields).setName(t("publish.entry")).setDesc(this.draft.entryPath).addButton(button => button.setButtonText(t("publish.choose"))
      .onClick(() => this.openPicker("note", entryPath => {this.update({entryPath});this.renderForm();})));
    this.renderRuleGroup(fields, "include");
    this.renderRuleGroup(fields, "exclude");
    new FormSetting(fields).setName(t("publish.idProperty")).addText(input => input.setValue(this.draft.uuidProperty).onChange(uuidProperty => this.update({uuidProperty})));
    new FormSetting(fields).setName(t("publish.properties")).setDesc(t("publish.propertiesHelp")).addTextArea(input => input.setValue(this.draft.properties.join("\n"))
      .onChange(text => this.update({properties: text.split("\n").map(name => name.trim()).filter(Boolean)})));
    for (const [key, label] of [["aliases", "publish.aliases"], ["fullText", "publish.fullText"], ["includeMedia", "publish.media"], ["theme", "publish.theme"]] as const) {
      new FormSetting(fields).setName(t(label)).addToggle(input => input.setValue(this.draft[key]).onChange(value => this.update({[key]: value})));
    }
    const pack = new FormSetting(fields).setName(t("publish.pack")).setDesc(t("publish.packHelp"));
    formSelect(pack);
    const fileInput = pack.controlEl.createEl("input", {attr: {type: "file", accept: ".json", "aria-label": t("publish.pack")}});
    fileInput.addEventListener("change", () => {void this.importPack(fileInput.files?.[0]);});
    const localActions = formActions(fields);
    localActions.addButton(button => button.setButtonText(t("publish.save")).setDisabled(!this.profiles).onClick(() => {void this.saveDraft(false);}));
    localActions.addButton(button => button.setButtonText(t("publish.duplicate")).setDisabled(!this.profiles).onClick(() => {
      this.update({id: this.owner().crypto.randomUUID()});this.renderForm();
    }));
    const saved = this.profiles?.profiles.some(item => item.id === this.draft.id);
    if (saved) localActions.addButton(button => button.setButtonText(t(this.confirmDelete ? "publish.deleteConfirm" : "publish.delete")).onClick(() => {
      if (this.confirmDelete) {void this.saveDraft(true);return;}
      this.confirmDelete = true;
      this.renderForm();
    }));
    const actions = formActions(this.contentEl);
    this.statusEl = actions.descEl;
    this.statusEl.setAttribute("role", "status");
    this.previewButton = this.exportButton = this.cancelButton = null;
    actions.addButton(button => {this.cancelButton = button;button.setButtonText(t("publish.cancelWork")).onClick(() => {
      this.work?.abort();this.status(t("publish.stale"));
    });});
    actions.addButton(button => {this.previewButton = button;button.setButtonText(t("publish.preview")).onClick(() => {void this.preview();});});
    actions.addButton(button => {this.exportButton = button;button.setButtonText(t("publish.export")).setCta().onClick(() => {void this.exportSite();});});
    this.renderReview();
    if (this.pack) this.status(t("publish.packReady"));
  }

  /** Use the same rule controls and native item selectors for inclusion and exclusion. */
  private renderRuleGroup(container: HTMLElement, group: RuleGroup): void {
    const t = this.ports.translate;
    const section = container.createDiv({cls: "kplex-publish-rules"});
    section.createEl("h3", {text: t(group === "include" ? "publish.include" : "publish.exclude")});
    for (const [index, rule] of this.draft[group].entries()) {
      const value = rule.kind === "predicate" ? rule.expression : rule.kind === "tag" ? rule.tag : rule.path;
      new FormSetting(section).setName(value).setDesc(t(`publish.${rule.kind}`)).addButton(button => button.setButtonText(t("publish.remove"))
        .onClick(() => {this.update({[group]: this.draft[group].filter((_, position) => position !== index)});this.renderForm();}));
    }
    let kind: RuleKind = "note", recursive = false, expression = "";
    const row = formSelect(new FormSetting(section).setName(t("publish.rule")));
    const extra = section.createDiv();
    const folder = new FormSetting(extra).setName(t("publish.recursive")).addToggle(input => input.onChange(value => {recursive = value;}));
    const predicate = extra.createDiv();
    folder.settingEl.hidden = predicate.hidden = true;
    const expressionRoot = createRoot(predicate);
    this.ruleRoots.push(expressionRoot);
    expressionRoot.render(<PredicateExpressionField label={t("filter.expression")} value={expression} maxLength={2048} onChange={change} />);
    /** Let the shared field retain focus as its private draft changes. */
    function change(value: string): void {
      expression = value;
      expressionRoot.render(<PredicateExpressionField label={t("filter.expression")} value={expression} maxLength={2048} onChange={change} />);
    }
    row.addDropdown(control => {
      for (const option of ruleKinds) control.addOption(option, t(`publish.${option}`));
      control.onChange(value => {
        kind = value as RuleKind;folder.settingEl.hidden = kind !== "folder";predicate.hidden = kind !== "predicate";
      });
    });
    row.addButton(button => button.setButtonText(t("publish.add")).onClick(() => {
      const add = (rule: PublishRule): void => {this.update({[group]: [...this.draft[group], rule]});this.renderForm();};
      if (kind === "predicate") {if (expression.trim()) add({kind, expression: expression.trim()});return;}
      const type = kind;
      this.openPicker(type, value => {
        if (type === "folder") add({kind: type, path: value, recursive});
        else if (type === "tag") add({kind: type, tag: value});
        else add({kind: type, path: value});
      });
    }));
  }

  /** Capture candidate paths only when the author opens an actual native search picker. */
  private openPicker(kind: Exclude<RuleKind, "predicate">, select: (value: string) => void): void {
    this.picker?.close();
    const {vault, metadataCache} = this.app;
    let items: ActionPickerItem<string>[];
    if (kind === "note") items = vault.getMarkdownFiles().map(file => ({label: file.basename, detail: file.path, value: file.path, icon: "file-text"}));
    else if (kind === "folder") items = vault.getAllFolders(true).map(folder => ({label: folder.path, value: folder.path, icon: "folder"}));
    else {
      const tags = new Set<string>();
      for (const file of vault.getMarkdownFiles()) {const cache = metadataCache.getFileCache(file);if (cache) for (const tag of getAllTags(cache) ?? []) tags.add(tag);}
      items = [...tags].sort().map(tag => ({label: tag, value: tag, icon: "tag"}));
    }
    const picked = new ActionTargetPicker(this.app, items, this.ports.translate("publish.choose"), value => {
      if (this.opened) select(value);
    }, () => {if (this.picker === picked) this.picker = null;});
    this.picker = picked;
    picked.open();
  }

  /** Persist only profile settings through the host's existing serialized write owner. */
  private async saveDraft(remove: boolean): Promise<void> {
    if (this.work || !this.profiles) return;
    const t = this.ports.translate;
    let committed: PublishProfile;
    try {committed = remove ? this.draft : parsePublishProfile(this.draft);} catch {this.status(t("publish.invalid"));return;}
    const rows = [...this.profiles.profiles.filter(profile => profile.id !== committed.id), ...(remove ? [] : [committed])];
    if (rows.length > 100) {this.status(t("publish.scopeLimit"));return;}
    const next: PublicationProfiles = {version: 1, profiles: rows};
    const generation = this.generation;
    try {
      const saved = await this.ports.saveProfiles(this.opening, next, () => this.opened && generation === this.generation);
      if (!this.opened) return;
      if (!saved) {this.status(t("publish.stale"));return;}
      this.opening = this.ports.settings().publishProfiles;
      this.profiles = readPublicationProfiles(this.opening);
      this.confirmDelete = false;
      if (remove && generation === this.generation) {this.retireReview();this.draft = this.newProfile();this.renderForm();}
      else if (generation === this.generation) this.renderForm();
      this.status(t("publish.saved"));
    } catch {this.status(t("publish.failed"));}
  }

  /** Work ownership fences every asynchronous command, including cancellation and draft edits. */
  private async run(task: (work: Work) => Promise<void>): Promise<void> {
    if (!this.opened || this.work) return;
    const t = this.ports.translate, controller = new (this.owner().AbortController)(), generation = this.generation;
    this.work = controller;
    delete this.contentEl.dataset.publishDrawingDiagnostic;
    const current = (): boolean => this.opened && !controller.signal.aborted && generation === this.generation;
    this.status(t("publish.working"));this.updateActions();
    try {await task({current, signal: controller.signal});}
    catch (error) {
      if (current() && error instanceof PublicationContentError && error.drawing) {
        this.contentEl.dataset.publishDrawingDiagnostic = `${error.drawing.phase}:${error.drawing.stage}`;
      }
      if (current()) this.status(error instanceof PublishGraphError ? t(error.reason === "stale" ? "publish.stale" : error.reason === "limit" ? "publish.scopeLimit" : "publish.unavailable")
        : error instanceof PublicationContentError && error.reason === "drawing-unsupported" ? t("publish.drawing") : t("publish.failed"));
    } finally {
      if (this.work === controller) this.work = null;
      if (this.opened) this.renderReview();
    }
  }

  /** Only use the owning window's SHA-256 implementation, with no remote runtime sources. */
  private digest(): PublicationDigest {
    const subtle = this.owner().crypto.subtle;
    return async bytes => Array.from(new Uint8Array(await subtle.digest("SHA-256", bytes)), byte => byte.toString(16).padStart(2, "0")).join("");
  }

  /** File input grants inert bytes for this modal, subject to strict format and version validation. */
  private async importPack(file: File | undefined): Promise<void> {
    if (!file || this.work) return;
    const t = this.ports.translate;
    await this.run(async ({current, signal}) => {
      try {
        if (file.size > RUNTIME_PACK_MAX_BYTES * 2) throw Error("Runtime pack too large");
        const contents = await file.text();
        if (!current()) return;
        const pack = await readRuntimePack(JSON.parse(contents), this.ports.version, this.digest(), signal);
        if (current()) {this.pack = pack;this.status(t("publish.packReady"));}
      } catch {if (current()) this.status(t("publish.packInvalid"));}
    });
  }

  /** Resolve the exact selection and detached graph only for the current reviewed profile. */
  private async preview(allowPreparation = false): Promise<void> {
    if (this.work) return;
    const t = this.ports.translate;
    let profile: PublishProfile;
    try {profile = parsePublishProfile(this.draft);} catch {this.status(t("publish.invalid"));return;}
    this.retireReview();
    await this.run(async work => {
      const review = await this.#selection.preview(profile, work.current);
      if (!work.current()) return;
      this.review = review;
      this.status(review.issues.length ? this.issueText(review.issues[0]) : "");
      if (!review.reviewId || review.changes.length) return;
      const scope = this.#selection.capture(review.reviewId);
      if (!scope) {this.status(t("publish.stale"));return;}
      let graph: PreviewGraph;
      try {graph = await this.captureGraph(scope, work.signal, allowPreparation);}
      catch (error) {
        if (error instanceof PublishGraphError && error.reason === "approval") {this.prepareAvailable = true;this.status(t("publish.prepareHelp"));return;}
        throw error;
      }
      if (!work.current() || !graph.isCurrent()) return;
      this.graph = graph;
      const notes = new Map(review.identities.map(({path, id}) => [path, id]));
      const media = await inspectPublicationContent({app: this.app, notes, current: graph.isCurrent, signal: work.signal,
        mediaAllowed: file => publicationMediaAllowed(profile, file.path), yieldWork: () => this.yieldWork()});
      if (work.current()) {this.media = media;this.status("");}
    });
  }

  /** A graph request always uses the exact selection lease and host configuration revision. */
  private async captureGraph(scope: NativePublishSelection, signal: AbortSignal, allowPreparation: boolean): Promise<PreviewGraph> {
    if (allowPreparation) {this.graphAudit = signal;this.ports.indexActivity();}
    try {
      return await capturePublishGraph({app: this.app, index: this.ports.index, settings: this.ports.settings, revision: this.ports.revision,
        owner: this.owner(), document: this.contentEl.ownerDocument, scope, signal, allowPreparation});
    } finally {
      if (this.graphAudit === signal) {this.graphAudit = null;this.ports.indexActivity();}
    }
  }

  /** `Apply these note IDs` is the only write authority and consumes the exact review once. */
  private async applyIds(): Promise<void> {
    const review = this.review, reviewId = review?.reviewId;
    if (!reviewId || !review?.changes.length) return;
    const generation = this.generation;
    await this.run(async ({current}) => {
      const result = await this.#selection.applyIds(reviewId, true, current);
      if (!this.opened || this.generation !== generation) return;
      this.review = null;
      this.ids = result;
      this.status(this.ports.translate("publish.idsApplied"));
    });
  }

  /** Finalize every resource and digest before handing off the complete immutable archive. */
  private async exportSite(): Promise<void> {
    const {graph, review, pack} = this;
    const t = this.ports.translate;
    if (!graph || !review?.reviewId || !pack || !this.media) return;
    const scope = this.#selection.capture(review.reviewId);
    if (!scope || !graph.isCurrent()) {this.status(t("publish.stale"));this.updateActions();return;}
    const approved = new Set(review.profile.includeMedia ? this.approvedMedia : []), allowUnsupportedDrawings = this.omitDrawings;
    await this.run(async work => {
      const live = (): boolean => work.current() && graph.isCurrent();
      const document = this.contentEl.ownerDocument;
      const notes = new Map(review.identities.map(({path, id}) => [path, id]));
      const content = await capturePublicationContent({app: this.app, ownerDocument: document, notes, current: live, signal: work.signal,
        approvedMedia: approved, allowUnsupportedDrawings, mediaAllowed: file => publicationMediaAllowed(review.profile, file.path), yieldWork: () => this.yieldWork()});
      const current = (): boolean => live() && content.isCurrent();
      if (!current() || !scope.files.every(scope.fileIsCurrent)) {this.status(t("publish.stale"));return;}
      const encoder = new TextEncoder();
      const files = [...content.notes].map(([id, note]) => ({path: publicationNotePath(id), bytes: encoder.encode(note.html)})).concat(content.assets);
      const search = review.profile.fullText ? [...content.notes].map(([id, note]) => ({id, text: note.text.slice(0, 100_000)})) : undefined;
      const assetPaths = new Map(content.assets.map(asset => [notes.get(asset.sourcePath), asset.path]));
      const nodes = graph.nodes.map(node => ({...node, asset: assetPaths.get(node.id)}));
      const site = await assemblePublicationSite({...graph, nodes}, files, pack, {digest: this.digest(), current, signal: work.signal, theme: graph.theme, search});
      const parts = await zipPublication(site.files, work.signal, current, () => this.yieldWork());
      if (!current()) {this.status(t("publish.stale"));return;}
      const owner = this.owner();
      downloadNativeArtifact(document, suggestedArtifactFilename(graph.title, "zip"), new owner.Blob([...parts], {type: "application/zip"}));
      this.status(t("publish.handedOff") + " " + t("publish.instructions"));
    });
  }

  /** Keep local-only issue labels near debug paths, away from every exported file. */
  private issueText(issue: PublishSelectionIssue): string {
    const t = this.ports.translate;
    return t(issue.code === "metadata-unavailable" ? "publish.metadata" : issue.code === "uuid-conflict" || issue.code === "unsupported-uuid-value" ? "publish.conflict"
      : issue.code === "limit" ? "publish.scopeLimit" : issue.code === "stale" ? "publish.stale" : "publish.invalid");
  }

  /** Show exactly what the review covers and keep every consent action distinct. */
  private renderReview(): void {
    const root = this.previewEl, t = this.ports.translate;
    if (!root) return;
    root.replaceChildren();
    root.createEl("h3", {text: t("publish.previewHeading")});
    root.createEl("p", {text: t("publish.publicWarning")});
    if (this.ids) this.renderList(root, t("publish.ids"), this.ids.receipts.map(({path, state}) => `${path} · ${state}`));
    const {review, graph, media} = this;
    if (review) {
      this.renderList(root, `${t("publish.notes")} · ${review.selectedPaths.length}`, review.selectedPaths);
      if (review.issues.length) this.renderList(root, t("publish.contentWarning"), review.issues.map(issue => [this.issueText(issue), issue.path].filter(Boolean).join(" ")));
      if (review.changes.length) {
        this.renderList(root, `${t("publish.ids")} · ${review.changes.length}`,
          review.changes.map(({path, property, before, after}) => `${path} · ${property} · ${before === undefined ? "∅" : JSON.stringify(before)} → ${after}`));
        new FormSetting(root).addButton(button => button.setButtonText(t("publish.applyIds")).setDisabled(!review.reviewId || Boolean(this.work)).onClick(() => {void this.applyIds();}));
      }
    }
    if (this.prepareAvailable) new FormSetting(root).setDesc(t("publish.prepareHelp")).addButton(button => button.setButtonText(t("publish.prepare"))
      .setDisabled(Boolean(this.work)).onClick(() => {void this.preview(true);}));
    if (graph) new FormSetting(root).setName(t("publish.relations")).setDesc(String(graph.relations.length));
    if (media && review) {
      const blocks = media.warnings.some(warning => warning.blocking);
      if (media.warnings.length) this.renderList(root, t("publish.contentWarning"), media.warnings.map(warning => `${warning.source}${warning.target ? ` · ${warning.target}` : ""}`));
      if (blocks || graph?.nodes.some(node => node.kind === "drawing")) new FormSetting(root).setName(t("publish.drawingsOmit")).addToggle(input => input.setValue(this.omitDrawings)
        .onChange(value => {this.omitDrawings = value;}));
      if (review.profile.includeMedia && media.assets.length) {
        const assets = root.createEl("details", {cls: "kplex-publish-list"});
        assets.createEl("summary", {text: `${t("publish.assets")} · ${media.assets.length}`});
        assets.createEl("p", {text: t("publish.mediaWarning")});
        for (const {path, bytes} of media.assets) new FormSetting(assets).setName(path).setDesc(new Intl.NumberFormat().format(bytes) + " B")
          .addToggle(input => input.setValue(this.approvedMedia.has(path)).onChange(value => {
            if (value) this.approvedMedia.add(path);else this.approvedMedia.delete(path);
          }));
      }
    }
    this.updateActions();
  }

  /** Large reviews render their exact list only when the author opens the disclosure. */
  private renderList(parent: HTMLElement, title: string, items: readonly string[]): void {
    const details = parent.createEl("details", {cls: "kplex-publish-list"});
    details.createEl("summary", {text: title});
    details.addEventListener("toggle", () => {
      if (!details.open || details.querySelector("ul")) return;
      const list = details.createEl("ul");
      for (const item of items) list.createEl("li", {text: item});
    });
  }

  /** A cancelled or stale result cannot enable Export. */
  private updateActions(): void {
    this.exportButton?.setDisabled(Boolean(this.work) || !this.pack || !this.media || !this.graph?.isCurrent());
    this.previewButton?.setDisabled(Boolean(this.work));
    this.cancelButton?.setDisabled(!this.work);
  }

  /** One shared footer owns local status and action spacing. */
  private status(text: string): void {if (this.opened) this.statusEl?.setText(text);}

  /** Yield archive work in its owning native window. */
  private yieldWork(): Promise<void> {return new Promise(resolve => this.owner().setTimeout(resolve, 0));}
}
