/**
 * Native Obsidian dialog for adding or moving an ontology relationship. The plugin owns vault changes; this shell owns localized controls, validation feedback and close cleanup.
 */
import { SavedRelationshipPendingError } from "../adapters/obsidian/relationshipMetadataWrite";
import { Modal, Notice, type TFile, setIcon, type WorkspaceLeaf } from "obsidian";
import type KplexPlugin from "../main";
import type { GateRole, GateSide, GraphPage, LinkDirection, RelationshipRole } from "../types";

import { captureRelatedEndpoint, refreshCapturedPage, type RelatedNoteCommit, type RelatedNoteInvocation } from "./NewRelatedNoteModal";

/** Creation supports all semantic roles without pretending previous/next are physical gates. */
export type CreateRelationModalOptions = {
  mode: "create";
  origin: GraphPage;
  semanticRole: RelationshipRole;
  fixedTarget?: GraphPage;
  onCommitted?: (result: RelatedNoteCommit) => void;
  hostLeaf?: WorkspaceLeaf;
  invocation?: RelatedNoteInvocation;
  /** Retained creation caller flag; the shared composer always exposes its six-role selector. */
  allowRoleSelection?: boolean;
};

/** Relink retains the existing four-gate interaction contract and canonical evidence storage controls. */
export type RelinkRelationModalOptions = {
  mode: "relink";
  /** Relink is also reused by Connection details to add/specify an ontology property. */
  purpose?: "move" | "ontology-add" | "ontology-specify";
  initialField?: string;
  initialStoragePath?: string;
  origin: GraphPage;
  semanticRole: GateRole;
  fixedTarget?: GraphPage;
  existingDirection?: LinkDirection | null;
  onCommitted?: (result: RelatedNoteCommit) => void;
  onCommitStart?: (role: GateRole) => void;
  onCommitEnd?: (success: boolean) => void;
  /** Release an optional action-manager dialog session on native close or surface teardown. */
  onClosed?: () => void;
  allowRoleSelection?: boolean;
  hostLeaf?: WorkspaceLeaf;
};


export type RelationModalOptions = CreateRelationModalOptions | RelinkRelationModalOptions;

/** Map only the four validated relink roles to physical gates. */
function gateForRole(role: GateRole): GateSide {
  if (role === "parent") return "top";
  if (role === "child") return "bottom";
  if (role === "left") return "left";
  return "right";
}

/** Render the established Obsidian Lucide icon and theme class. */
function addIcon(el: HTMLElement, name: string): void {
  setIcon(el, name);
  el.querySelector("svg")?.classList.add("kplex-lucide");
}

export class RelationModal extends Modal {
  private selectedField: string;
  private semanticRole: GateRole;
  private selectedPath: string | null = null;
  private query = "";
  private activeIndex = 0;
  private busy = false;
  private resultsEl: HTMLDivElement | null = null;
  private saveButton: HTMLButtonElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private selectedStoragePath: string | null = null;
  private opened = false;
  private pending = false;
  private selectedIdentity: TFile | null = null;
  private storageIdentity: TFile | null = null;
  private releaseRename: (() => void) | null = null;

  /** Capture the exact endpoints/storage file before the modal takes focus. */
  constructor(private plugin: KplexPlugin, private options: RelinkRelationModalOptions) {
    super(plugin.app);
    this.options = { ...options, origin: captureRelatedEndpoint(options.origin), fixedTarget: options.fixedTarget ? captureRelatedEndpoint(options.fixedTarget) : undefined };
    this.semanticRole = options.semanticRole;
    this.selectedField = options.initialField?.trim() || plugin.defaultOntologyField(this.semanticRole);
    if (options.mode === "relink" && options.fixedTarget) {
      const candidates = plugin.index.relationshipStorageCandidates(options.origin.path, options.fixedTarget.path);
      this.selectedStoragePath = options.initialStoragePath && candidates.includes(options.initialStoragePath)
        ? options.initialStoragePath
        : candidates[0] ?? null;
    }
    this.storageIdentity = this.selectedStoragePath ? plugin.app.vault.getFileByPath(this.selectedStoragePath) : null;
  }

  /** Rank bounded native note candidates without allowing the captured origin as target. */
  private candidates(): TFile[] {
    if (this.options.fixedTarget) return [];
    const q = this.query.trim().toLowerCase();
    const blocked = this.plugin.index.gateNeighbourPaths(this.options.origin, gateForRole(this.semanticRole));
    return this.plugin.app.vault.getMarkdownFiles()
      .filter((file) => file.path !== this.options.origin.path)
      .filter((file) => !blocked.has(file.path))
      .filter((file) => !q || file.basename.toLowerCase().includes(q) || file.path.toLowerCase().includes(q))
      .sort((a, b) => a.basename.localeCompare(b.basename, undefined, { numeric: true, sensitivity: "base" }))
      .slice(0, 60);
  }

  /** A selected path is insufficient if a deleted note was recreated at that path. */
  private selectedFile(): TFile | null {
    const file = this.selectedIdentity;
    return file && this.plugin.app.vault.getFileByPath(file.path) === file ? file : null;
  }

  /** Require an actual captured endpoint and no previously saved pending write. */
  private canSave(): boolean {
    return !this.pending && Boolean(this.options.fixedTarget || this.selectedFile());
  }

  /** Keep native save availability aligned with the synchronous operation guard. */
  private updateSaveButton(): void {
    if (this.saveButton) this.saveButton.disabled = this.busy || !this.canSave();
  }

  /** Render candidate notes with localized empty/help copy while preserving ranking and actual vault labels. */
  private renderResults(): void {
    if (!this.resultsEl) return;
    this.resultsEl.empty();
    const files = this.candidates();
    if (this.activeIndex >= files.length) this.activeIndex = Math.max(0, files.length - 1);

    if (!files.length) {
      this.resultsEl.createDiv({ cls: "kplex-relation-empty", text: this.plugin.translator("relation.noAvailableMatches") });
      this.selectedPath = null;
      this.updateSaveButton();
      return;
    }

    if (!this.selectedPath || !files.some((file) => file.path === this.selectedPath)) {
      this.selectedPath = files[this.activeIndex]?.path ?? null;
      this.selectedIdentity = files[this.activeIndex] ?? null;
    } else {
      this.activeIndex = Math.max(0, files.findIndex((file) => file.path === this.selectedPath));
    }

    files.forEach((file, index) => {
      const button = this.resultsEl!.createEl("button", {
        cls: index === this.activeIndex ? "is-selected" : "",
        attr: { type: "button", title: file.path },
      });
      addIcon(button, "file-text");
      button.createSpan({ cls: "kplex-relation-file-name", text: file.basename });
      button.createEl("small", { text: file.path });
      button.addEventListener("click", () => {
        const wasSelected = this.selectedPath === file.path && this.activeIndex === index;
        this.activeIndex = index;
        this.selectedPath = file.path;
        this.selectedIdentity = file;
        this.resultsEl?.querySelectorAll("button").forEach((item) => item.classList.remove("is-selected"));
        button.classList.add("is-selected");
        button.focus();
        this.updateSaveButton();
        // A second click on the selected result behaves like pressing Enter. This keeps the
        // explicit check button workflow while making an already-highlighted result actionable.
        if (wasSelected) void this.confirm();
      });
      button.addEventListener("keydown", (event) => {
        if (event.isComposing || event.repeat || event.getModifierState("AltGraph")) return;
        if (event.key === "Enter") {
          event.preventDefault();
          this.activeIndex = index;
          this.selectedPath = file.path;
        this.selectedIdentity = file;
          void this.confirm();
        }
      });
      button.addEventListener("dblclick", () => {
        this.activeIndex = index;
        this.selectedPath = file.path;
        this.selectedIdentity = file;
        void this.confirm();
      });
    });
    this.updateSaveButton();
  }

  /** Persist once, distinguish saved-pending from failure, and never report an early writer return as a commit. */
  private async confirm(): Promise<void> {
    if (!this.opened || this.busy || !this.canSave()) return;
    this.busy = true; this.updateSaveButton();
    let success = false;
    this.options.onCommitStart?.(this.semanticRole);
    const capturedTarget = this.options.fixedTarget;
    try {
      if (!capturedTarget) return;
      const origin = refreshCapturedPage(this.plugin, this.options.origin);
      const target = refreshCapturedPage(this.plugin, capturedTarget);
      if (this.storageIdentity) {
        if (this.plugin.app.vault.getFileByPath(this.storageIdentity.path) !== this.storageIdentity) throw new Error(this.plugin.translator("addRelated.endpointChanged"));
        this.selectedStoragePath = this.storageIdentity.path;
      }
      const result = this.options.purpose === "ontology-add" || this.options.purpose === "ontology-specify"
        ? await this.plugin.addOntologyToConnection(origin, target, this.semanticRole, this.selectedField, this.selectedStoragePath)
        : await this.plugin.relinkCentralNeighbour(origin, target, this.semanticRole, this.selectedField, this.options.existingDirection ?? null, this.selectedStoragePath);
      if (result.state === "unavailable") return;
      success = true;
      this.options.onCommitted?.({ state: "saved-published", page: result.page });
      if (this.opened) this.close();
    } catch (error) {
      if (error instanceof SavedRelationshipPendingError && capturedTarget) {
        this.pending = true; success = true;
        this.options.onCommitted?.({ state: "saved-pending", page: capturedTarget });
        if (this.opened && this.contentEl) {
          const status = this.contentEl.createDiv({ attr: { role: "status" }, text: this.plugin.translator("addRelated.savedPending") });
          const refresh = status.createEl("button", { text: this.plugin.translator("addRelated.refreshSaved"), attr: { type: "button" } });
          refresh.addEventListener("click", /** Reconcile the saved pair explicitly without issuing a second relationship mutation. */ () => {
            if (!this.opened || refresh.disabled) return;
            refresh.disabled = true;
            void this.plugin.index.prepareRelationshipPair(this.options.origin.file?.path ?? this.options.origin.path, capturedTarget.file?.path ?? capturedTarget.path)
              .then(/** A targeted current-pair publication confirms the already saved relationship. */ ready => {
                if (ready && this.opened) { this.options.onCommitted?.({ state: "saved-published", page: capturedTarget }); this.close(); }
              }).catch(/** Retain saved status and permit another explicit refresh after a transient failure. */ () => {})
              .finally(/** Detached controls are ignored when the dialog closed during reconciliation. */ () => { if (this.opened) refresh.disabled = false; });
          });
        }
      }
      if (!(error instanceof SavedRelationshipPendingError) || !error.noticeReported) {
        new Notice(error instanceof SavedRelationshipPendingError ? error.message : this.plugin.translator("relation.updateFailed", { error: error instanceof Error ? error.message : String(error) }), 5000);
      }
    } finally {
      this.options.onCommitEnd?.(success); this.busy = false; if (this.opened) this.updateSaveButton();
    }
  }

  /** Render the relationship/ontology picker with localized captions and feedback; the native Modal owns its open/close shell. */
  onOpen(): void {
    this.opened = true;
    const rename = this.plugin.app.vault.on("rename", /** Follow renamed identities and expose updated endpoint labels. */ file => {
      if (file === this.options.origin.file) this.options.origin = { ...this.options.origin, path: file.path };
      if (file === this.options.fixedTarget?.file) this.options.fixedTarget = { ...this.options.fixedTarget, path: file.path };
      if (file === this.storageIdentity) this.selectedStoragePath = file.path;
      this.contentEl.querySelector<HTMLElement>(".kplex-relation-origin")?.setText(this.plugin.index.titleFor(this.options.origin));
    });
    this.releaseRename = /** Native close releases the exact listener owned by this invocation. */ () => this.plugin.app.vault.offref(rename);
    this.contentEl.createDiv({ cls: "kplex-relation-origin", text: this.plugin.index.titleFor(this.options.origin) });
    const roleLabel = (role: GateRole): string => ({ parent: this.plugin.translator("role.parent"), child: this.plugin.translator("role.child"), left: this.plugin.translator("role.friend"), right: this.plugin.translator("role.challenger") } satisfies Record<GateRole, string>)[role];
    let roleName = roleLabel(this.semanticRole);
    this.titleEl.setText(
      this.options.mode === "relink"
        ? (this.options.purpose === "ontology-specify"
            ? this.plugin.translator("relation.specifyOntology")
            : this.options.purpose === "ontology-add"
              ? this.plugin.translator("relation.addOntologyTitle")
              : this.plugin.translator("relation.move"))
        : this.plugin.translator("relation.addRole", { role: roleName.toLowerCase() }),
    );
    this.modalEl.addClass("kplex-relation-modal");
    this.contentEl.addClass("kplex-relation-modal-content");

    let fieldSelect: HTMLSelectElement | null = null;
    const repopulateFields = () => {
      if (!fieldSelect) return;
      fieldSelect.empty();
      const fields = [...this.plugin.ontologyFieldsForRole(this.semanticRole)];
      const ontologyAction = this.options.purpose === "ontology-add" || this.options.purpose === "ontology-specify";
      const preferred = ontologyAction ? this.options.initialField?.trim() : "";
      if (preferred && !fields.some((field) => field.toLocaleLowerCase() === preferred.toLocaleLowerCase())) fields.unshift(preferred);
      for (const field of fields) fieldSelect.createEl("option", { text: field, attr: { value: field } });
      this.selectedField = preferred || this.plugin.defaultOntologyField(this.semanticRole);
      fieldSelect.value = this.selectedField;
    };
    if (this.options.allowRoleSelection) {
      this.contentEl.createEl("label", { cls: "kplex-relation-label", text: this.plugin.translator("relation.directionRole"), attr: { for: "kplex-relation-modal-role" } });
      const roleSelect = this.contentEl.createEl("select", { attr: { id: "kplex-relation-modal-role" } });
      for (const role of ["parent", "child", "left", "right"] as GateRole[]) roleSelect.createEl("option", { text: roleLabel(role), attr: { value: role } });
      roleSelect.value = this.semanticRole;
      roleSelect.addEventListener("change", () => {
        if (this.busy || this.pending) { roleSelect.value = this.semanticRole; return; }
        this.semanticRole = roleSelect.value as GateRole;
        roleName = roleLabel(this.semanticRole);
        this.selectedPath = null;
        this.activeIndex = 0;
        repopulateFields();
        this.renderResults();
      });
    }

    if (this.options.fixedTarget) {
      const summary = this.contentEl.createDiv({ cls: "kplex-relation-summary" });
      summary.createSpan({ cls: "kplex-relation-direction", text: roleName });
      summary.createSpan({ text: this.plugin.index.titleFor(this.options.fixedTarget), attr: { title: this.options.fixedTarget.path } });
    } else {
      this.contentEl.createEl("label", { cls: "kplex-relation-label", text: this.plugin.translator("relation.markdownNote"), attr: { for: "kplex-relation-modal-search" } });
      const searchWrap = this.contentEl.createDiv({ cls: "kplex-relation-search-wrap" });
      const searchIcon = searchWrap.createSpan({ cls: "kplex-icon" });
      addIcon(searchIcon, "search");
      const searchInput = searchWrap.createEl("input", {
        attr: { id: "kplex-relation-modal-search", type: "text", placeholder: this.plugin.translator("relation.searchNotes"), autocomplete: "off" },
      });
      this.searchInput = searchInput;
      this.resultsEl = this.contentEl.createDiv({ cls: "kplex-relation-results" });
      searchInput.addEventListener("input", () => {
        this.query = searchInput.value;
        this.activeIndex = 0;
        this.selectedPath = null;
        this.renderResults();
      });
      searchInput.addEventListener("keydown", (event) => {
        if (event.isComposing || event.key === "Dead" || event.getModifierState("AltGraph") || event.key === "Enter" && event.repeat) return;
        const files = this.candidates();
        if (event.key === "ArrowDown") {
          event.preventDefault();
          this.activeIndex = Math.min(Math.max(0, files.length - 1), this.activeIndex + 1);
          this.selectedPath = files[this.activeIndex]?.path ?? null;
      this.selectedIdentity = files[this.activeIndex] ?? null;
          this.renderResults();
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          this.activeIndex = Math.max(0, this.activeIndex - 1);
          this.selectedPath = files[this.activeIndex]?.path ?? null;
      this.selectedIdentity = files[this.activeIndex] ?? null;
          this.renderResults();
        } else if (event.key === "Enter") {
          event.preventDefault();
          if (!this.selectedPath && files[0]) this.selectedPath = files[0].path;
          void this.confirm();
        }
      });
      this.renderResults();
    }

    let storageHint: HTMLDivElement | null = null;
    if (this.options.mode === "relink" && this.options.fixedTarget) {
      const storageCandidates = this.plugin.index.relationshipStorageCandidates(this.options.origin.path, this.options.fixedTarget.path);
      const evidence = this.plugin.index.evidenceBetween(this.options.origin.path, this.options.fixedTarget.path);
      const rankFor = (path: string): number => {
        let rank = 9;
        for (const item of evidence) {
          if (item.declaredByPath !== path) continue;
          const score = item.sourceKind === "frontmatter-ontology" ? 0
            : item.sourceKind === "inline-ontology" ? 1
              : item.sourceKind === "obsidian-link" || item.sourceKind === "unresolved-link" ? 2 : 4;
          rank = Math.min(rank, score);
        }
        return rank;
      };
      if (storageCandidates.length > 1) {
        this.contentEl.createEl("label", { cls: "kplex-relation-label", text: this.plugin.translator("relation.writePropertyToNote"), attr: { for: "kplex-relation-modal-storage" } });
        const storageSelect = this.contentEl.createEl("select", { attr: { id: "kplex-relation-modal-storage" } });
        for (let candidateIndex = 0; candidateIndex < storageCandidates.length; candidateIndex += 1) {
          const path = storageCandidates[candidateIndex];
          const page = this.plugin.index.get(path);
          const title = page ? this.plugin.index.titleFor(page) : path;
          storageSelect.createEl("option", { text: candidateIndex === 0 ? this.plugin.translator("relation.recommendedSuffix", { title }) : title, attr: { value: path } });
        }
        this.selectedStoragePath = this.selectedStoragePath && storageCandidates.includes(this.selectedStoragePath)
          ? this.selectedStoragePath : storageCandidates[0];
        storageSelect.value = this.selectedStoragePath ?? storageCandidates[0];
        storageHint = this.contentEl.createDiv({ cls: "kplex-relation-hint" });
        const ontologyAction = this.options.purpose === "ontology-add" || this.options.purpose === "ontology-specify";
        storageHint.setText(ontologyAction
          ? (rankFor(storageCandidates[0]) < 9
              ? this.plugin.translator("relation.ontologyEvidenceRecommendation")
              : this.plugin.translator("relation.ontologyEitherNote"))
          : (rankFor(storageCandidates[0]) < 9
              ? this.plugin.translator("relation.moveEvidenceRecommendation")
              : this.plugin.translator("relation.moveEitherNote")));
        storageSelect.addEventListener("change", () => {
          this.selectedStoragePath = storageSelect.value;
          this.storageIdentity = this.plugin.app.vault.getFileByPath(storageSelect.value);
          updateStorageHint();
        });
      } else if (storageCandidates[0]) {
        this.selectedStoragePath = storageCandidates[0];
      }
      if (this.options.purpose === "ontology-add" || this.options.purpose === "ontology-specify") {
        this.contentEl.createDiv({
          cls: "kplex-relation-hint",
          text: this.options.purpose === "ontology-specify"
            ? this.plugin.translator("relation.specifyOntologyHelp")
            : this.plugin.translator("relation.addOntologyHelp"),
        });
      }
    }

    const updateStorageHint = () => {
      if (!storageHint || !this.options.fixedTarget || !this.selectedStoragePath) return;
      const storingOnOrigin = this.selectedStoragePath === this.options.origin.path;
      const page = this.plugin.index.get(this.selectedStoragePath);
      const effectiveField = storingOnOrigin ? this.selectedField : this.plugin.inverseOntologyField(this.selectedField, this.semanticRole);
      const ontologyAction = this.options.purpose === "ontology-add" || this.options.purpose === "ontology-specify";
      storageHint.setText(ontologyAction
        ? this.plugin.translator("relation.willAddProperty", { field: effectiveField, note: page ? this.plugin.index.titleFor(page) : this.selectedStoragePath })
        : this.plugin.translator("relation.willWriteProperty", { field: effectiveField, note: page ? this.plugin.index.titleFor(page) : this.selectedStoragePath }));
    };

    this.contentEl.createEl("label", { cls: "kplex-relation-label", text: this.plugin.translator("relation.noteProperty"), attr: { for: "kplex-relation-modal-field" } });
    const select = this.contentEl.createEl("select", { attr: { id: "kplex-relation-modal-field" } });
    fieldSelect = select;
    repopulateFields();

    const originIsMarkdown = this.options.origin.file?.extension === "md";
    const hint = !originIsMarkdown ? this.contentEl.createDiv({ cls: "kplex-relation-hint" }) : null;
    const updateInverseHint = () => {
      if (!hint) return;
      const inverseField = this.plugin.inverseOntologyField(this.selectedField, this.semanticRole);
      hint.setText(this.plugin.translator("relation.inverseTargetStorage", { property: inverseField }));
    };
    select.addEventListener("change", () => {
      this.selectedField = select.value;
      updateInverseHint();
      updateStorageHint();
    });
    updateInverseHint();
    updateStorageHint();

    const actions = this.contentEl.createDiv({ cls: "kplex-relation-actions" });
    const cancel = actions.createEl("button", { attr: { type: "button", "aria-label": this.plugin.translator("common.cancel") } });
    addIcon(cancel, "x");
    cancel.addEventListener("click", () => this.close());

    const ontologySave = this.options.purpose === "ontology-add" || this.options.purpose === "ontology-specify";
    const saveLabel = ontologySave ? this.plugin.translator(this.options.purpose === "ontology-specify" ? "relation.specifyOntologyButton" : "relation.addOntologyButton") : this.plugin.translator("relation.save");
    const saveButton = actions.createEl("button", { cls: "mod-cta", attr: { type: "button", "aria-label": saveLabel } });
    this.saveButton = saveButton;
    addIcon(saveButton, "check");
    saveButton.addEventListener("click", () => void this.confirm());
    this.updateSaveButton();

    this.contentEl.ownerDocument.defaultView?.queueMicrotask(/** Focus only a still-mounted native input. */ () => { if (this.opened) this.searchInput?.focus(); });
  }

  /** Invalidate delayed completion UI and release captured rename resources before clearing controls. */
  onClose(): void {
    if (!this.opened) return;
    this.opened = false; this.options.onClosed?.(); this.releaseRename?.(); this.releaseRename = null;
    this.contentEl.empty();
  }
}
