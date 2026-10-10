/**
 * Native Connection details dialog over pair-scoped semantic explanations and provenance. This host UI
 * formats stable reason codes and offers additive ontology, source navigation and confirmed selected
 * frontmatter removal. Generation fences own reads/confirmation UI; saved writes remain plugin-owned.
 */
import { Modal, Notice, setIcon, type WorkspaceLeaf } from "obsidian";
import type KplexPlugin from "../main";
import type { RelationshipSourceSection } from "../main";
import { RelationType, type GateRole, type Role } from "../types";
import { ONTOLOGY_PRECEDENCE_SUPPRESSION, type EvidenceDecision, type EvidenceSourceKind, type EvidenceSuppressionReason } from "../index/RelationEvidence";
import type { RelationshipExplanation, RelationshipSummary } from "../index/RelationResolver";
import type { Translator, PlainTranslationKey } from "../lang";
import { frontmatterDeclarationKey, selectedFrontmatterDeclarations } from "../application/frontmatterUnlink";
import { SavedRelationshipPendingError } from "../adapters/obsidian/relationshipMetadataWrite";
import { RemoveRelationshipSourceModal } from "./RemoveRelationshipSourceModal";
import type { RelationEvidence } from "../index/RelationEvidence";

const ROLE_LABEL: Record<string, PlainTranslationKey> = {
  parent: "role.parent",
  child: "role.child",
  left: "role.friend",
  right: "role.challenger",
  previous: "role.previous",
  next: "role.next",
  hidden: "role.hidden",
};

const SOURCE_LABEL: Record<EvidenceSourceKind, PlainTranslationKey> = {
  "obsidian-link": "explain.sourceResolvedNoteLink",
  "unresolved-link": "explain.sourceUnresolvedNoteLink",
  "frontmatter-ontology": "explain.sourceDocumentProperty",
  "inline-ontology": "explain.sourceMarkdownBodyProperty",
  "body-url": "explain.sourceBodyUrl",
  "property-url": "explain.sourcePropertyUrl",
  "date-property": "explain.sourceDateProperty",
  "file-tree": "explain.sourcePhysicalFolderTree",
  "tag-tree": "explain.sourceTagTree",
  "url-origin": "explain.sourceUrlOriginHierarchy",
};

/** Translate defined/inferred evidence classification without changing the semantic enum. */
function relationTypeLabel(type: RelationType, translate: Translator): string {
  return translate(type === RelationType.DEFINED ? "graph.relationDefined" : "graph.relationInferred");
}
/** Translate stable semantic reasons; Date copy describes configured/default roles without changing historical locale keys. */
function relationshipSummaryLabel(summary: RelationshipSummary, translate: Translator): string {
  switch (summary) {
    case "hidden": return translate("explain.summaryHidden");
    case "ontology-precedence": return translate("explain.summaryOntologyPrecedence");
    case "conflicting-defined-roles": return translate("explain.summaryConflictingDefinedRoles");
    case "bidirectional-inferred": return translate("explain.summaryBidirectionalInferred");
    case "defined-ontology": return translate("explain.summaryDefinedOntology");
    case "date-property": return translate("explain.summaryDatePropertyPolicy");
    case "no-active-evidence": return translate("explain.summaryNoActiveEvidence");
    case "transient-section": return translate("explain.summaryTransientSection");
    case "source:frontmatter-ontology": return translate("explain.summarySourceFrontmatterOntology");
    case "source:inline-ontology": return translate("explain.summarySourceInlineOntology");
    case "source:obsidian-link": return translate("explain.summarySourceResolvedNoteLink");
    case "source:unresolved-link": return translate("explain.summarySourceUnresolvedNoteLink");
    case "source:body-url": return translate("explain.summarySourceBodyUrl");
    case "source:property-url": return translate("explain.summarySourcePropertyUrl");
    case "source:date-property": return translate("explain.summarySourceDateProperty");
    case "source:file-tree": return translate("explain.summarySourceFolderTree");
    case "source:tag-tree": return translate("explain.summarySourceTagTree");
    case "source:url-origin": return translate("explain.summarySourceUrlOrigin");
  }
}

/** Translate an ontology suppression code for explanation UI independently of persisted predicate compatibility values. */
function suppressionReasonLabel(reason: EvidenceSuppressionReason, translate: Translator): string {
  switch (reason) {
    case ONTOLOGY_PRECEDENCE_SUPPRESSION: return translate("explain.suppressionOntologyPrecedence");
  }
}


/** Format localized source/role/line annotations while preserving original field names and source provenance. */
function evidenceDescription(decision: EvidenceDecision, translate: Translator): string {
  const item = decision.evidence;
  const roleKey = ROLE_LABEL[item.role];
  const pieces = [translate(SOURCE_LABEL[item.sourceKind]), `${roleKey ? translate(roleKey) : item.role} · ${relationTypeLabel(item.relationType, translate)}`];
  if (item.fieldName) pieces.push(item.fieldName);
  if (item.line) pieces.push(translate("explain.line", { line: item.line }));
  return pieces.join(" · ");
}

/** Only explicit four-gate roles are supported by the current relink shell; sequence roles stay semantic. */
function gateRoleForDisplayRole(role: Role): GateRole | null {
  if (role === "parent" || role === "child" || role === "left" || role === "right") return role;
  return null;
}

/** Mount a localized native-icon action with one accessible name and no duplicate tooltip. */
function iconButton(parent: HTMLElement, icon: string, label: string, action: () => void): HTMLButtonElement {
  const button = parent.createEl("button", { cls: "kplex-edge-source-action", attr: { type: "button", "aria-label": label } });
  setIcon(button, icon);
  button.createSpan({ text: label });
  button.addEventListener("click", action);
  return button;
}

/** Format a decision’s localized role/type and overridden state without altering its active flag. */
function decisionResolutionLabel(decision: EvidenceDecision, translate: Translator): string {
  const evidence = decision.evidence;
  const roleKey = ROLE_LABEL[evidence.role];
  const role = roleKey ? translate(roleKey) : evidence.role;
  const base = `${role} · ${relationTypeLabel(evidence.relationType, translate)}`;
  return decision.active ? base : translate("explain.overriddenSuffix", { resolution: base });
}

/** Render deduplicated evidence evaluation badges with localized accessibility and classification copy. */
function renderDecisionEvaluations(parent: HTMLElement, decisions: readonly EvidenceDecision[], translate: Translator): void {
  const unique = new Map<string, { text: string; active: boolean }>();
  for (const decision of decisions) {
    const text = decisionResolutionLabel(decision, translate);
    unique.set(`${decision.evidence.role}:${decision.evidence.relationType}:${decision.active}`, { text, active: decision.active });
  }
  if (!unique.size) return;
  const evaluations = parent.createDiv({ cls: "kplex-edge-source-evaluations", attr: { "aria-label": translate("explain.evidenceResolution") } });
  for (const item of unique.values()) {
    evaluations.createSpan({
      cls: `kplex-edge-source-evaluation${item.active ? " is-active" : " is-overridden"}`,
      text: item.text,
    });
  }
}

/** One source-of-truth view for understanding a connection and navigating its provenance. */
export class RelationshipExplanationModal extends Modal {
  private closed = false;
  private loadGeneration = 0;
  private operation: "idle" | "confirming" | "removing" | "saved-pending" = "idle";
  private confirmation: RemoveRelationshipSourceModal | null = null;
  private removalButtons: HTMLButtonElement[] = [];
  private mutationNavigationButtons: HTMLButtonElement[] = [];
  private renderedDeclarations = new Set<string>();
  private statusText = "";
  private pendingDeclaration: string | null = null;
  private releaseIndex: (() => void) | null = null;

  /** Capture one pair explanation and optional native-dialog lease; source reads are cancelled on close. */
  constructor(
    private plugin: KplexPlugin,
    private explanation: RelationshipExplanation,
    private displayContext?: {
      role: Role;
      centerPath?: string;
      sourceTitle?: string;
      targetTitle?: string;
      hostLeaf?: WorkspaceLeaf;
      initialFocus?: "why" | "sources";
    },
    private onClosed: () => void = () => {},
  ) {
    super(plugin.app);
  }

  /** Project active field names for additive ontology display without rewriting declaration provenance. */
  private currentOntologies(): string[] {
    return [...new Set(this.explanation.decisions
      .filter((decision) => decision.active)
      .map((decision) => decision.evidence.fieldName ?? decision.evidence.definition ?? "")
      .map((value) => value.trim())
      .filter(Boolean))];
  }

  /** Render the additive ontology action for the inspected pair with localized captions; existing sources remain preserved. */
  private addOntologyEditor(parent: HTMLElement): void {
    const row = parent.createDiv({ cls: "kplex-edge-ontology-row" });
    const copy = row.createDiv({ cls: "kplex-edge-ontology-copy" });
    copy.createEl("strong", { text: this.plugin.translator("explain.ontology") });
    const ontologies = this.currentOntologies();
    copy.createDiv({ cls: "kplex-edge-ontology-value", text: ontologies.length ? ontologies.join(", ") : this.plugin.translator("explain.noOntology") });

    const activeDefined = this.explanation.decisions.filter((decision) =>
      decision.active && decision.evidence.relationType === RelationType.DEFINED,
    );
    const definingDecision = activeDefined.find((decision) =>
      decision.evidence.sourceKind === "frontmatter-ontology" || decision.evidence.sourceKind === "inline-ontology",
    );
    const hasExplicitOntology = Boolean(definingDecision);

    let semanticRole = this.displayContext ? gateRoleForDisplayRole(this.displayContext.role) : null;
    let source = this.plugin.index.get(this.explanation.sourcePath);
    let target = this.plugin.index.get(this.explanation.targetPath);
    let storagePath: string | undefined;
    if (definingDecision) {
      const evidence = definingDecision.evidence;
      if (evidence.declaredRole !== "hidden") semanticRole = gateRoleForDisplayRole(evidence.declaredRole);
      source = this.plugin.index.get(evidence.declaredByPath);
      target = this.plugin.index.get(evidence.declaredTargetPath);
      storagePath = evidence.declaredByPath;
    }
    if (!semanticRole || !source || !target) return;

    const actionLabel = this.plugin.translator(hasExplicitOntology ? "explain.addOntology" : "explain.specifyOntology");
    const button = row.createEl("button", { text: actionLabel, cls: "mod-cta", attr: { type: "button" } });
    button.disabled = this.operation !== "idle";
    this.mutationNavigationButtons.push(button);
    button.addEventListener("click", () => {
      if (this.closed || this.operation !== "idle") return;
      this.close();
      this.plugin.openRelationModal({
        mode: "relink",
        purpose: hasExplicitOntology ? "ontology-add" : "ontology-specify",
        origin: source,
        fixedTarget: target,
        semanticRole,
        initialStoragePath: storagePath,
        hostLeaf: this.displayContext?.hostLeaf,
      });
    });
  }

  /** Render one evidence source and its localized annotations while retaining original Markdown text and navigation locations. */
  private renderEvidenceSource(container: HTMLElement, decision: EvidenceDecision, sections: readonly RelationshipSourceSection[]): void {
    const evidence = decision.evidence;
    if (!sections.length) {
      const row = container.createDiv({ cls: `kplex-edge-source-card is-metadata${decision.active ? " is-active" : " is-overridden"}` });
      const header = row.createDiv({ cls: "kplex-edge-source-header" });
      header.createDiv({ cls: "kplex-edge-source-meta", text: evidenceDescription(decision, this.plugin.translator) });
      const status = header.createDiv({ cls: "kplex-edge-source-status" });
      renderDecisionEvaluations(status, [decision], this.plugin.translator);
      status.createSpan({
        cls: `kplex-edge-source-state${decision.active ? " is-used" : " is-overridden"}`,
        text: this.plugin.translator(decision.active ? "explain.used" : "explain.overridden"),
        attr: { "aria-label": this.plugin.translator(decision.active ? "explain.usedAria" : "explain.overriddenAria") },
      });
      if (evidence.rawValue) row.createEl("code", { text: evidence.rawValue });
      if (decision.suppressionReason) row.createDiv({ cls: "kplex-edge-source-reason", text: suppressionReasonLabel(decision.suppressionReason, this.plugin.translator) });
      this.renderRemovalActions(row, [decision]);
      return;
    }

    for (const section of sections) this.renderSourceOccurrence(container, section, [decision]);
  }

  /** Render a grouped physical source occurrence with localized evidence labels and original source content. */
  private renderSourceOccurrence(container: HTMLElement, section: RelationshipSourceSection, decisions: readonly EvidenceDecision[]): void {
      const active = decisions.some((decision) => decision.active);
      const card = container.createDiv({ cls: `kplex-edge-source-card${active ? " is-active" : " is-overridden"}` });
      const header = card.createDiv({ cls: "kplex-edge-source-header" });
      const title = header.createDiv({ cls: "kplex-edge-source-title" });
      title.createEl("strong", { text: section.label });
      title.createSpan({ text: ` · ${section.path}` });
      const status = header.createDiv({ cls: "kplex-edge-source-status" });
      renderDecisionEvaluations(status, decisions, this.plugin.translator);
      status.createSpan({
        cls: `kplex-edge-source-state${active ? " is-used" : " is-overridden"}`,
        text: this.plugin.translator(active ? "explain.used" : "explain.overridden"),
        attr: { "aria-label": this.plugin.translator(active ? "explain.usedAria" : "explain.overriddenAria") },
      });

      card.createEl("pre", { cls: "kplex-edge-source-text" }).createEl("code", { text: section.text });
      const signals = [...new Set(decisions.map((decision) => this.plugin.translator(SOURCE_LABEL[decision.evidence.sourceKind])))];
      if (signals.length > 1) card.createDiv({ cls: "kplex-edge-source-reason", text: this.plugin.translator("explain.detectedAs", { signals: signals.join(" · ") }) });
      const reasons = [...new Set(decisions.map((decision) => decision.suppressionReason).filter((value): value is EvidenceSuppressionReason => Boolean(value)))];
      for (const reason of reasons) card.createDiv({ cls: "kplex-edge-source-reason", text: suppressionReasonLabel(reason, this.plugin.translator) });

      const actions = card.createDiv({ cls: "kplex-edge-source-actions" });
      const navigate = iconButton(actions, "locate-fixed", this.plugin.translator("explain.goToSource"), () => {
        if (this.closed || this.operation !== "idle") return;
        void this.plugin.openRelationshipEvidenceLocation({ path: section.path, line: section.startLine }, this.displayContext?.hostLeaf).then(() => this.close());
      });
      navigate.disabled = this.operation !== "idle";
      this.mutationNavigationButtons.push(navigate);
      this.renderRemovalActions(card, decisions);
  }

  /** Render one independently editable declaration, not one action per overlapping visual source card. */
  private renderRemovalActions(parent: HTMLElement, decisions: readonly EvidenceDecision[]): void {
    for (const evidence of selectedFrontmatterDeclarations(decisions.map(/** Projection preserves declaration coordinates. */ decision => decision.evidence))) {
      const key = frontmatterDeclarationKey(evidence)!;
      if (this.renderedDeclarations.has(key)) continue;
      const expected = this.plugin.captureFrontmatterUnlinkExpectation(evidence);
      if (!expected) continue;
      this.renderedDeclarations.add(key);
      const generation = this.loadGeneration;
      const row = parent.createDiv({ cls: "kplex-edge-source-removal" });
      row.createDiv({ cls: "kplex-edge-source-removal-coordinate", text: this.plugin.translator("explain.removeCoordinate", {
        note: expected.storagePath, field: expected.fieldKey, target: expected.targetPath,
      }) });
      const button = iconButton(row, "unlink", this.plugin.translator("explain.removeRelationship"), /** Capture one still-current physical declaration before showing native confirmation. */ () => {
        if (!this.isCurrent(generation) || this.operation !== "idle") return;
        const actual = this.plugin.captureFrontmatterUnlinkExpectation(evidence);
        if (!actual || actual.storage !== expected.storage || actual.target !== expected.target || actual.fieldKey !== expected.fieldKey) {
          this.refreshDetails(this.plugin.translator("explain.removeSourceChanged"));
          return;
        }
        this.setOperation("confirming");
        this.confirmation = new RemoveRelationshipSourceModal(this.app, this.plugin.translator,
          { note: actual.storagePath, field: actual.fieldKey, target: actual.targetPath }, /** Only this mounted generation can resume an explicit approval. */ confirmed => {
            this.confirmation = null;
            if (!this.isCurrent(generation)) return;
            if (!confirmed) { this.setOperation("idle"); return; }
            void this.removeDeclaration(evidence, actual, generation);
          });
        this.confirmation.open();
      });
      button.dataset.kplexRemoveField = expected.fieldKey;
      button.disabled = this.operation !== "idle";
      this.removalButtons.push(button);
    }
  }

  /** A closed modal or superseded source generation cannot resume confirmation or append old cards. */
  private isCurrent(generation: number): boolean {
    return !this.closed && generation === this.loadGeneration && this.contentEl.isConnected;
  }

  /** Serialize destructive activation across every candidate while retaining retry-free saved-pending state. */
  private setOperation(operation: typeof this.operation): void {
    this.operation = operation;
    for (const button of this.removalButtons) button.disabled = operation !== "idle";
    for (const button of this.mutationNavigationButtons) button.disabled = operation !== "idle";
  }

  /** Persist through the canonical selected-property writer; detached UI cannot cancel an already saved edit. */
  private async removeDeclaration(evidence: RelationEvidence, expected: NonNullable<ReturnType<KplexPlugin["captureFrontmatterUnlinkExpectation"]>>, generation: number): Promise<void> {
    if (!this.isCurrent(generation) || this.operation !== "confirming") return;
    this.setOperation("removing");
    try {
      const changed = await this.plugin.unlinkFrontmatterEvidence(evidence, expected, /** Pre-persistence disposal fences native callback continuation. */ () => this.isCurrent(generation));
      if (!this.isCurrent(generation)) return;
      this.setOperation("idle");
      this.refreshDetails(changed ? this.removalOutcome() : this.plugin.translator("explain.removeSourceChanged"));
    } catch (error) {
      if (error instanceof SavedRelationshipPendingError) {
        if (!error.noticeReported) new Notice(error.message, 5000);
        if (!this.isCurrent(generation)) return;
        this.pendingDeclaration = frontmatterDeclarationKey(evidence);
        this.setOperation("saved-pending");
        this.refreshDetails(error.message);
        this.refreshPendingRemoval();
        return;
      }
      if (!this.isCurrent(generation)) return;
      this.setOperation("idle");
      this.refreshDetails(this.plugin.translator("relation.updateFailed", { error: error instanceof Error ? error.message : String(error) }));
    }
  }

  /** Determine the remaining visible pair from canonical resolution, including hidden/overridden evidence. */
  private removalOutcome(): string {
    const current = this.plugin.index.explainRelationship(this.explanation.sourcePath, this.explanation.targetPath);
    return this.plugin.translator(current && !current.hidden && current.resolvedRoles.length
      ? "explain.sourceRemovedRemaining" : "explain.sourceRemoved");
  }

  /** Canonical publication completes a saved-pending UI without issuing another destructive mutation. */
  private refreshPendingRemoval(): void {
    if (this.closed || this.operation !== "saved-pending" || !this.pendingDeclaration) return;
    if (!this.plugin.index.isSemanticWriteReady(this.explanation.sourcePath, this.explanation.targetPath)) return;
    const current = this.plugin.index.explainRelationship(this.explanation.sourcePath, this.explanation.targetPath);
    if (current?.decisions.some(/** A retained old declaration cannot prove publication finished. */ decision => frontmatterDeclarationKey(decision.evidence) === this.pendingDeclaration)) return;
    this.pendingDeclaration = null;
    this.setOperation("idle");
    this.refreshDetails(this.removalOutcome());
  }

  /** Reacquire pair provenance and replace content in place, retiring earlier source reads and confirmation. */
  private refreshDetails(statusText = this.statusText): void {
    if (this.closed) return;
    this.loadGeneration++;
    this.confirmation?.close();
    this.confirmation = null;
    this.statusText = statusText;
    const current = this.plugin.index.explainRelationship(this.explanation.sourcePath, this.explanation.targetPath);
    this.explanation = current ?? { ...this.explanation, decisions: [], resolvedRoles: [], hidden: false, summary: "no-active-evidence" };
    this.contentEl.empty();
    this.removalButtons = [];
    this.mutationNavigationButtons = [];
    this.renderedDeclarations.clear();
    this.renderContents();
  }

  /** Render the pair’s Connection details, evidence evaluations and provenance actions with localized captions and feedback; the native Modal owns its open/close shell. */
  onOpen(): void {
    this.closed = false;
    this.releaseIndex = this.plugin.index.subscribe(/** Only a saved-pending operation needs publication-driven refresh. */ () => this.refreshPendingRemoval());
    this.refreshDetails();
  }

  /** Build one mounted generation; asynchronous source reads retain its explanation snapshot. */
  private renderContents(): void {
    const generation = this.loadGeneration;
    const explanation = this.explanation;
    const source = this.plugin.index.get(this.explanation.sourcePath);
    const target = this.plugin.index.get(this.explanation.targetPath);
    const sourceTitle = this.displayContext?.sourceTitle ?? (source ? this.plugin.index.titleFor(source) : this.explanation.sourcePath);
    const targetTitle = this.displayContext?.targetTitle ?? (target ? this.plugin.index.titleFor(target) : this.explanation.targetPath);

    this.titleEl.setText(this.plugin.translator("explain.title"));
    this.modalEl.addClass("kplex-explanation-modal", "kplex-edge-properties-modal");

    if (this.statusText) this.contentEl.createDiv({ cls: "kplex-edge-removal-status", text: this.statusText,
      attr: { role: "status", "aria-live": "polite" } });

    const pair = this.contentEl.createDiv({ cls: "kplex-explanation-pair" });
    pair.createEl("strong", { text: sourceTitle, attr: { title: this.explanation.sourcePath } });
    pair.createSpan({ text: " → " });
    pair.createEl("strong", { text: targetTitle, attr: { title: this.explanation.targetPath } });

    this.addOntologyEditor(this.contentEl);

    if (this.displayContext?.role === "sibling") {
      const center = this.displayContext.centerPath ? this.plugin.index.get(this.displayContext.centerPath) : null;
      const centerTitle = center ? this.plugin.index.titleFor(center) : this.displayContext.centerPath;
      this.contentEl.createDiv({
        cls: "kplex-explanation-display-context",
        text: centerTitle
          ? this.plugin.translator("explain.siblingOf", { center: centerTitle })
          : this.plugin.translator("explain.sibling"),
      });
    }

    const why = this.contentEl.createDiv({ cls: "kplex-edge-why" });
    why.createEl("h4", { text: this.plugin.translator("explain.why") });
    if (this.explanation.resolvedRoles.length) {
      const roles = this.explanation.resolvedRoles.map((item) => { const key = ROLE_LABEL[item.role]; return `${key ? this.plugin.translator(key) : item.role} · ${relationTypeLabel(item.relationType, this.plugin.translator)}`; }).join(", ");
      why.createDiv({ cls: "kplex-explanation-result", text: this.plugin.translator("explain.resolvedAs", { roles }) });
    } else if (this.explanation.hidden) {
      why.createDiv({ cls: "kplex-explanation-result", text: this.plugin.translator("explain.resolvedAsHidden") });
    }
    why.createDiv({ cls: "kplex-explanation-summary", text: relationshipSummaryLabel(this.explanation.summary, this.plugin.translator) });

    this.contentEl.createEl("h4", { text: this.plugin.translator("explain.sourceOccurrences") });
    this.contentEl.createDiv({ cls: "kplex-edge-source-intro", text: this.plugin.translator("explain.sourceIntro") });
    const list = this.contentEl.createDiv({ cls: "kplex-edge-source-list" });
    if (!this.explanation.decisions.length) {
      list.createDiv({ cls: "kplex-explanation-empty", text: this.plugin.translator("explain.noEvidence") });
    } else {
      const loading = list.createDiv({ cls: "kplex-explanation-empty", text: this.plugin.translator("explain.loadingSources") });
      const evidence = explanation.decisions.map(/** Source acquisition uses this generation's exact explanation snapshot. */ (decision) => decision.evidence);
      void this.plugin.relationshipEvidenceSectionsBatch(evidence).then(/** Render only still-mounted results and combine overlapping physical occurrence views. */ (sectionsByEvidence) => {
        if (!this.isCurrent(generation) || !list.isConnected) return;
        loading.remove();
        const occurrenceGroups = new Map<string, { section: RelationshipSourceSection; decisions: EvidenceDecision[]; priority: number }>();
        /** Prefer explicit ontology provenance when generic cache ranges overlap the same occurrence. */
        const priorityFor = (decision: EvidenceDecision): number => {
          if (decision.evidence.sourceKind === "frontmatter-ontology" || decision.evidence.sourceKind === "inline-ontology") return 0;
          if (decision.evidence.sourceKind === "body-url" || decision.evidence.sourceKind === "property-url" || decision.evidence.sourceKind === "date-property") return 1;
          return 2;
        };
        for (const decision of explanation.decisions) {
          const sections = sectionsByEvidence.get(decision.evidence.id) ?? [];
          if (!sections.length) {
            this.renderEvidenceSource(list, decision, sections);
            continue;
          }
          for (const section of sections) {
            const key = `${section.path}\u0000${section.startLine}\u0000${section.endLine}`;
            const priority = priorityFor(decision);
            const existing = occurrenceGroups.get(key);
            if (!existing) {
              occurrenceGroups.set(key, { section, decisions: [decision], priority });
            } else {
              existing.decisions.push(decision);
              if (priority < existing.priority) {
                existing.section = section;
                existing.priority = priority;
              }
            }
          }
        }
        // A single physical Markdown occurrence can be detected through more than one evidence
        // path. The common case is a frontmatter ontology link that Obsidian also reports as a
        // generic resolved link. Exact range matching is insufficient because the generic link
        // range may expand to a larger YAML paragraph while the ontology evidence identifies the
        // precise property range. Prefer the most specific/higher-priority section and fold any
        // overlapping lower-priority detections into it so Connection details never shows the
        // same source text twice.
        const mergedGroups: Array<{ section: RelationshipSourceSection; decisions: EvidenceDecision[]; priority: number }> = [];
        const groups = [...occurrenceGroups.values()].sort((a, b) => (
          a.priority - b.priority
          || (a.section.endLine - a.section.startLine) - (b.section.endLine - b.section.startLine)
          || a.section.startLine - b.section.startLine
        ));
        for (const group of groups) {
          const existing = mergedGroups.find((candidate) => (
            candidate.section.path === group.section.path
            && candidate.section.startLine <= group.section.endLine
            && group.section.startLine <= candidate.section.endLine
          ));
          if (!existing) {
            mergedGroups.push(group);
            continue;
          }
          existing.decisions.push(...group.decisions);
        }
        for (const group of mergedGroups.sort((a, b) => (
          a.section.path.localeCompare(b.section.path)
          || a.section.startLine - b.section.startLine
          || a.priority - b.priority
        ))) {
          this.renderSourceOccurrence(list, group.section, group.decisions);
        }
      }).catch(() => {
        if (!this.isCurrent(generation) || !list.isConnected) return;
        loading.setText(this.plugin.translator("explain.sourceLoadFailed"));
      });
    }

    const viewWindow = this.contentEl.ownerDocument.defaultView ?? window;
    viewWindow.requestAnimationFrame(() => {
      if (!this.isCurrent(generation)) return;
      const focus = this.displayContext?.initialFocus === "why" ? why : list;
      focus.scrollIntoView({ block: "nearest" });
    });
  }

  /** Retire pending evidence UI and release the originating surface session exactly once. */
  onClose(): void {
    if (this.closed) return;
    this.closed = true;
    this.loadGeneration++;
    this.confirmation?.close();
    this.confirmation = null;
    this.releaseIndex?.();
    this.releaseIndex = null;
    this.removalButtons = [];
    this.mutationNavigationButtons = [];
    this.onClosed();
    this.onClosed = () => {};
    this.contentEl.empty();
  }
}
