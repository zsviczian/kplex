/** One confirmation for one external drop. Copy-only imports into folders proceed independently
 * of template work. Durable per-file receipts make partial imports resumable without copying twice. */
import {FormSetting as Setting, KplexModal as Modal, formActions, formField, labelIconButton} from "../adapters/obsidian/KplexModal";

import {type TFile, type TFolder, type WorkspaceLeaf, type ButtonComponent} from "obsidian";
import {createElement} from "react";
import {createRoot, type Root} from "react-dom/client";
import type KplexPlugin from "../main";
import type {GraphPage, RelationshipRole} from "../types";
import {captureRelatedEndpoint} from "./NewRelatedNoteModal";
import {FolderPathInput} from "./FolderPathInput";
import {RelationshipSelectionControl} from "./RelationshipSelectionControl";
import {SelectedOntologyEditor} from "./SelectedOntologyEditor";

import {CreationCompletionSelect} from "./features/CreationCompletionSelect";
import {SavedRelationshipPendingError} from "../adapters/obsidian/relationshipMetadataWrite";
import {copyExternalFile, discoverExternalImports, externalImportName, type ExternalImportPayload} from "../adapters/obsidian/externalFileImport";
import {PartialRelatedFileError} from "../adapters/obsidian/relatedFileOutcome";
import {graphFolder} from "../adapters/obsidian/graphFolder";
import type {CreationAfterSavingAction} from "../core/plex/createdNoteDestination";

type ImportRow = {source: File; relativePath: string; name: string; file?: TFile; destination?: string; completion?: CreationAfterSavingAction; saved: boolean; editor?: HTMLInputElement; status?: HTMLElement};

/** The inventory has validated literal segments; no traversal is involved in taking its parent. */
function parentPath(relative: string): string {
  return relative.slice(0, Math.max(0, relative.lastIndexOf("/")));
}

export class ExternalFileImportBatchModal extends Modal {
  private opened = false;
  private busy = false;
  private ready = false;
  private completing = false;
  private rows: ImportRow[] = [];
  private directories: readonly string[] = [];
  private readonly createdDirectories = new Map<string, TFolder>();
  private readonly origin: GraphPage;
  private readonly nativeOriginFolder: TFolder | null;
  private readonly roots: Root[] = [];
  private renderControls: (() => void) | null = null;
  private folderPath = "";
  private folder: TFolder | null = null;
  private ontology = "";
  private roleFilter: RelationshipRole | "all";
  private readonly ontologyEditor: SelectedOntologyEditor;
  private fieldWasDefined = false;
  private button: ButtonComponent | null = null;
  private feedback: HTMLElement | null = null;
  private releaseWindow: (() => void) | null = null;
  private releaseMigration: (() => void) | null = null;

  /** Keep the drop's endpoint and surface identities independent of later document focus. */
  constructor(private readonly plugin: KplexPlugin, origin: GraphPage, private readonly payload: ExternalImportPayload,
    role: RelationshipRole, private readonly hostLeaf: WorkspaceLeaf,
    private readonly current: () => boolean, private readonly retired: () => void) {
    super(plugin.app); this.origin = captureRelatedEndpoint(origin); this.nativeOriginFolder = graphFolder(plugin.app, origin);
    this.folder = this.nativeOriginFolder ?? origin.file?.parent ?? plugin.app.vault.getRoot();
    this.folderPath = this.folder.path === "/" ? "" : this.folder.path;
    this.roleFilter = role; this.ontology = plugin.defaultOntologyField(role); this.fieldWasDefined = Boolean(plugin.ontologyRoleForField(this.ontology));
    this.ontologyEditor = new SelectedOntologyEditor(plugin, () => this.live() && !this.busy && !this.locked());
  }

  /** All-direction browsing derives the selected field's configured role; it never classifies graph evidence. */
  private selectedRole(): RelationshipRole {
    const assigned = this.plugin.ontologyRoleForField(this.ontology);
    return this.roleFilter !== "all" ? this.roleFilter : assigned === "parent" || assigned === "child" || assigned === "left" || assigned === "right" || assigned === "previous" || assigned === "next" ? assigned : "child";
  }

  /** Source replacement or native migration cannot authorize the next copy or property write. */
  private live(): boolean {
    if (!this.opened || !this.current()) return false;
    if (this.nativeOriginFolder) return graphFolder(this.plugin.app, this.origin) === this.nativeOriginFolder;
    if (this.origin.file) return this.plugin.app.vault.getFileByPath(this.origin.path) === this.origin.file && this.origin.file.path === this.origin.path;
    const page = this.plugin.index.get(this.origin.path);
    return !!page && !page.isFolder && !page.isTag && !page.transient && page.url === this.origin.url;
  }

  /** Once copying starts, the common configuration remains fixed across partial-file retries. */
  private locked(): boolean {return this.rows.some(/** Any durable copy keeps its exact destination. */ row => !!row.file) || this.createdDirectories.size > 0;}

  /** A filename edit affects its leaf only; imported directory structure is preserved. */
  private relative(row: ImportRow): string {
    const name = externalImportName(row.source, row.name);
    if (!name) throw new Error(this.plugin.translator("fileImport.invalidName"));
    const parent = parentPath(row.relativePath);
    return parent ? `${parent}/${name}` : name;
  }

  /** Keep the chosen Vault folder's exact prefix and append an already normalized relative path. */
  private vaultPath(relative: string): string {
    return this.folderPath ? `${this.folderPath}/${relative}` : relative;
  }

  /** An awaited copy must still belong to the selected base and each captured imported ancestor. */
  private destinationCurrent(base: TFolder, relative: string): boolean {
    const {vault} = this.plugin.app;
    if (!this.live() || this.folder !== base || (this.folderPath ? vault.getFolderByPath(this.folderPath) : vault.getRoot()) !== base) return false;
    for (let parent = relative; parent; parent = parentPath(parent)) {
      const path = this.vaultPath(parent), folder = this.createdDirectories.get(parent);
      if (!folder || folder.path !== path || vault.getFolderByPath(path) !== folder) return false;
    }
    return true;
  }

  /** Preflight the whole batch before creating even one directory or file. */
  private validate(): TFolder {
    const app = this.plugin.app, folder = this.folder;
    if (!this.live() || !folder || (this.folderPath ? app.vault.getFolderByPath(this.folderPath) : app.vault.getRoot()) !== folder) throw new Error(this.plugin.translator("addRelated.endpointChanged"));
    const paths = new Set<string>(), receipts = new Map<string, TFile>();
    for (const row of this.rows) if (row.file && row.destination) receipts.set(row.destination, row.file);
    for (const relative of [...this.directories, ...this.rows.map(/** Every renamed leaf participates in one collision check. */ row => this.relative(row))]) {
      const path = this.vaultPath(relative);
      if (paths.has(path)) throw new Error(this.plugin.translator("moveNode.conflict")); paths.add(path);
      const existing = app.vault.getAbstractFileByPath(path), created = this.createdDirectories.get(relative);
      // Only an exact already committed copy may occupy a retry destination.
      if (existing && existing !== created && receipts.get(path) !== existing) throw new Error(this.plugin.translator("fileImport.collision", {path}));
      if (created && (created.path !== path || existing !== created)) throw new Error(this.plugin.translator("addRelated.endpointChanged"));
    }
    for (const row of this.rows) {
      if (row.file && (row.file.path !== row.destination || app.vault.getFileByPath(row.destination) !== row.file)) throw new Error(this.plugin.translator("addRelated.endpointChanged"));
    }
    return folder;
  }

  /** Copy serially, retain committed identities before linking, and stop after cancellation. */
  private async submit(): Promise<void> {
    if (!this.ready || this.busy || !this.live()) return;
    this.busy = true; this.renderControls?.();
    try {
      const base = this.validate();
      const singleFileDrop = !this.payload.directory && this.rows.length === 1;
      const completion = singleFileDrop ? this.rows[0].completion ?? this.plugin.createdNoteCompletionControl(this.hostLeaf, {another: false, follow: false}).value : "return";
      // A structural copy alone has no K-Plex property write or editor opening to fence.
      const waitForAutomation = !this.nativeOriginFolder || completion !== "return";
      if (!this.nativeOriginFolder) {
        const assigned = this.plugin.ontologyRoleForField(this.ontology);
        if (!this.ontology.trim() || this.roleFilter === "all" && !assigned
          || assigned && assigned !== this.selectedRole() || this.fieldWasDefined && !assigned) throw new Error(this.plugin.translator("addRelated.chooseDirection"));
        await this.plugin.rememberRelationshipOntology(this.selectedRole(), this.ontology.trim());
        if (!this.live()) return; this.validate();
      }
      for (const relative of this.directories) {
        if (!this.live()) return; this.validate();
        if (this.createdDirectories.has(relative)) continue;
        if (!this.destinationCurrent(base, parentPath(relative))) throw new Error(this.plugin.translator("addRelated.endpointChanged"));
        const path = this.vaultPath(relative);
        this.feedback?.setText(this.plugin.translator("fileImport.creatingFolder", {path}));
        const folder = await this.plugin.app.vault.createFolder(path);
        if (!folder) throw new Error(this.plugin.translator("folderActions.failed"));
        this.createdDirectories.set(relative, folder);
      }
      for (const row of this.rows) {
        if (!this.live()) return; this.validate();
        if (row.saved) continue;
        const relative = this.relative(row), parent = parentPath(relative), destination = this.vaultPath(relative);
        const destinationFolder = parent ? this.createdDirectories.get(parent) : base;
        if (!destinationFolder || !this.destinationCurrent(base, parent)) throw new Error(this.plugin.translator("addRelated.endpointChanged"));
        if (!row.file) {
          this.feedback?.setText(this.plugin.translator("fileImport.copying", {name: row.name, current: this.rows.indexOf(row) + 1, total: this.rows.length}));
          const copy = () => copyExternalFile(this.plugin.app, row.source, row.name, destinationFolder, this.plugin.translator,
            /** Byte loading must not cross destination replacement or cancellation. */ () => this.destinationCurrent(base, parent));
          try {
            row.file = await (waitForAutomation ? this.plugin.createFileWithAutomation(copy) : copy());
          }
          catch (error) {
            if (error instanceof PartialRelatedFileError) row.file = error.file;
            throw error;
          } finally {
            // Retain the accepted opening choice with the exact file and its template receipt.
            if (row.file) {row.destination = destination; row.completion = completion;}
          }
        }
        if (!this.live()) return;
        if (waitForAutomation) await this.plugin.waitForCreatedFileAutomation(row.file);
        if (!this.live()) return;
        if (!this.destinationCurrent(base, parent) || row.file.path !== destination || this.plugin.app.vault.getFileByPath(destination) !== row.file)
          throw new Error(this.plugin.translator("addRelated.endpointChanged"));
        try {
          if (this.nativeOriginFolder) this.plugin.index.insertCreatedFile(row.file);
          else {this.feedback?.setText(this.plugin.translator("fileImport.linking", {name: row.name})); await this.plugin.linkNewRelatedFile(this.origin, this.selectedRole(), row.file, this.ontology.trim());}
        } catch (error) {if (!(error instanceof SavedRelationshipPendingError)) throw error;}
        row.saved = true; row.status?.setText(this.plugin.translator("fileImport.saved", {path: row.file.path}));
        this.feedback?.setText(this.plugin.translator("fileImport.progress", {completed: this.rows.filter(/** Progress counts only durable copies whose requested relation is saved. */ item => item.saved).length, total: this.rows.length}));
      }
      if (!this.live()) return;
      this.validate();
      const file = singleFileDrop ? this.rows[0].file : null;
      this.completing = true; this.close();
      if (file && completion !== "return") {
        const page = this.plugin.index.get(file.path) ?? this.plugin.index.insertCreatedFile(file);
        await this.plugin.finishNewRelatedNode(page, this.hostLeaf, completion, /** Intentional close preserves only this accepted opening. */ () => this.completing && this.current());
      }
    } catch (error) {
      if (this.live()) this.feedback?.setText(error instanceof Error ? error.message : this.plugin.translator("fileImport.failed"));
      for (const row of this.rows) if (row.file && !row.saved) row.status?.setText(this.plugin.translator("fileImport.copied", {path: row.file.path}));
    } finally {this.completing = false; this.busy = false; if (this.opened) this.renderControls?.();}
  }

  /** Show one immediately usable form; asynchronous directory discovery never mutates the vault. */
  onOpen(): void {
    this.opened = true; const t = this.plugin.translator, folders = this.plugin.app.vault.getAllFolders(true);
    this.setTitle(t(!this.payload.directory && this.payload.files.length === 1 ? "fileImport.import" : "fileImport.title")); this.modalEl.addClass("kplex-import-modal");
    this.modalEl.setAttr("data-kplex-tooltip-scope", "");
    this.contentEl.createEl("p", {text: t(this.nativeOriginFolder ? "fileImport.folderHelp" : "fileImport.sharedHelp"), cls: "setting-item-description"});
    const folderRow = formField(new Setting(this.contentEl).setName(t("folderPicker.label")));
    const folderRoot = createRoot(folderRow.controlEl.createDiv()); this.roots.push(folderRoot);
    const fieldRoot = this.nativeOriginFolder ? null : createRoot(this.contentEl.createDiv()); if (fieldRoot) this.roots.push(fieldRoot);
    const listing = this.contentEl.createDiv({cls: "kplex-import-files"});
    const actions = formActions(this.contentEl);
    this.feedback = actions.infoEl.createDiv({cls: "kplex-form-status", attr: {role: "status", "aria-live": "polite"}});
    let completionRoot: Root | null = null;
    this.renderControls = /** Re-render shared controls without remounting native filename drafts. */ () => {
      const disabled = this.busy || this.locked();
      for (const row of this.rows) if (row.editor) row.editor.disabled = disabled;
      folderRoot.render(createElement(FolderPathInput, {value: this.folderPath, folders: folders.map(/** Suggestions retain native folder objects for final validation. */ folder => folder.path), translate: t, disabled,
        onChange: /** Common destination changes before confirmation, never after a durable partial copy. */ value => {
          if (this.busy || this.locked()) return;
          this.folderPath = value === "/" ? "" : value;
          this.folder = folders.find(folder => folder.path === value || value === "/" && folder === this.plugin.app.vault.getRoot()) ?? null;
          this.renderControls?.();
        }}));
      fieldRoot?.render(createElement(RelationshipSelectionControl, {plugin: this.plugin, role: this.roleFilter, field: this.ontology, disabled,
        onChange: /** The drag default is editable until the first durable copy locks the common configuration. */ (role, field) => {
          if (disabled) return; this.roleFilter = role; this.ontology = field; this.fieldWasDefined = Boolean(this.plugin.ontologyRoleForField(field)); this.renderControls?.();
        },
        onEdit: /** Keep a selected-field editor in the same native parent lifetime as the import draft. */ invoker =>
          this.ontologyEditor.open(this.ontology, invoker, () => {this.fieldWasDefined = true; this.renderControls?.();}),
      }));
      if (completionRoot) {const control = this.plugin.createdNoteCompletionControl(this.hostLeaf, {another: false, follow: false});
        completionRoot.render(createElement(CreationCompletionSelect, {...control, value: this.rows[0].completion ?? control.value, translate: t, disabled,
          onChange: /** Only a draft can change the opening action used to accept its copy. */ value => {
            if (!this.busy && !this.locked()) {control.onChange(value); this.renderControls?.();}
          }}));}
      this.button?.setDisabled(this.busy || !this.ready || !this.live());
    };
    actions
      .addButton(/** Cancel leaves already copied items intact but starts no remaining copy. */ button => {labelIconButton(button.buttonEl, t("common.cancel"), "x"); button.onClick(/** Retire directory discovery and future mutation acceptance. */ () => this.close());})
      .addButton(/** One confirmation imports all displayed entries with the common configuration. */ button => {this.button = button; labelIconButton(button.buttonEl, t("fileImport.importAll"), "file-down"); button.setCta().onClick(/** Serialize ordinary imports and exact-file retries. */ () => {void this.submit();});});
    const owner = this.contentEl.ownerDocument.defaultView, close = /** Realm teardown cancels all unaccepted discovery/copies. */ (): void => this.close();
    owner?.addEventListener("pagehide", close, {once: true}); this.releaseWindow = /** Release only this document's subscription. */ () => owner?.removeEventListener("pagehide", close);
    this.releaseMigration = this.hostLeaf.view.containerEl.onWindowMigrated?.(/** A new document needs a new drop confirmation. */ () => this.close()) ?? null;
    this.renderControls();
    void discoverExternalImports(this.payload, t, /** Discovery can outlive the drop event but not the accepting canvas. */ () => this.live(),
      /** Progress describes metadata discovery before any import is possible. */ (files, directories) => {if (this.live()) this.feedback?.setText(t("fileImport.discovering", {files, folders: directories}));})
      .then(/** Render the complete bounded inventory before enabling the only Import button. */ inventory => {
        if (!this.live()) return;
        this.directories = inventory.directories;
        this.rows = inventory.files.map(/** Keep the source handle and show the normalized destination leaf in the preview. */ item => ({
          source: item.file, relativePath: item.relativePath, name: item.relativePath.slice(item.relativePath.lastIndexOf("/") + 1), saved: false,
        }));
        for (const directory of this.directories) listing.createDiv({text: directory + "/", cls: "setting-item-description"});
        for (const row of this.rows) {
          const setting = new Setting(listing).setName(row.relativePath);
          setting.addText(/** One direct file can be renamed without opening a second dialog. */ input => {row.editor = input.inputEl; input.setValue(row.name); input.inputEl.setAttribute("aria-label", t("fileImport.filename"));
            input.onChange(/** Renames remain draft-only until the common confirmation. */ value => {if (!this.busy && !this.locked()) row.name = value; else input.setValue(row.name);});});
          row.status = setting.descEl.createDiv({attr: {role: "status"}});
        }
        if (!this.payload.directory && this.rows.length === 1) {const container = this.contentEl.createDiv(); listing.after(container); completionRoot = createRoot(container); this.roots.push(completionRoot);}
        this.ready = this.rows.length + this.directories.length > 0; this.feedback?.setText(t("fileImport.summary", {files: this.rows.length, folders: this.directories.length})); this.renderControls?.();
      }).catch(/** A rejected inventory cannot import a silently truncated subset. */ error => {if (this.live()) this.feedback?.setText(error instanceof Error ? error.message : t("fileImport.failed"));});
  }

  /** Close disposes controls and native lifetime hooks; committed external copies remain in the vault. */
  onClose(): void {this.opened = false; this.ontologyEditor.close(); this.releaseMigration?.(); this.releaseMigration = null; this.releaseWindow?.(); this.releaseWindow = null; for (const root of this.roots) root.unmount(); this.roots.length = 0; this.renderControls = null; this.contentEl.empty(); this.retired();}
}
