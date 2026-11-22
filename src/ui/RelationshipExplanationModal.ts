/**
 * Native Connection details dialog over pair-scoped semantic explanations and provenance. This host UI
 * formats stable reason codes and offers additive ontology, source navigation and confirmed selected
 * frontmatter removal and additive Hidden declarations that preserve original links. Generation
 * fences own reads and child setup/confirmation UI through a narrow close capability;
 * saved writes remain plugin-owned. Incomplete previews acquire only the inspected pair before
 * exposing its canonical property sources, including declarations owned by the opposite endpoint.
 */
import {labelIconButton, KplexModal as Modal} from "../adapters/obsidian/KplexModal";

import {activeOntologyFields} from "../core/plex/relationshipOntology";
import { connectionActionAllowed } from "./structuralConnectionActions";
import {Notice, type WorkspaceLeaf} from "obsidian";
import type KplexPlugin from "../main";
import type { RelationshipSourceSection } from "../main";
import { RelationType, type RelationshipRole, type Role } from "../types";
import { ONTOLOGY_PRECEDENCE_SUPPRESSION, type EvidenceDecision, type EvidenceSourceKind, type EvidenceSuppressionReason } from "../index/RelationEvidence";
import type { RelationshipExplanation, RelationshipSummary } from "../index/RelationResolver";
import type { Translator, PlainTranslationKey } from "../lang";
import { frontmatterDeclarationKey, selectedFrontmatterDeclarations } from "../application/frontmatterUnlink";
import { SavedRelationshipPendingError } from "../adapters/obsidian/relationshipMetadataWrite";
import { RemoveRelationshipSourceModal } from "./RemoveRelationshipSourceModal";
import type { RelationEvidence } from "../index/RelationEvidence";
import {SelectedOntologyEditor} from "./SelectedOntologyEditor";
import {ReverseRelationshipModal} from "./ReverseRelationshipModal";
import {eligibleRelationshipOwner} from "../adapters/obsidian/relationshipOwner";
import {groupRelationshipSourceOccurrences} from "./features/relationshipSourceOccurrences";
import {selectConnectionOntology} from "../application/connectionOntology";
import {ontologyConfiguration} from "../core/contracts/ontologyConfiguration";
import type {RelinkRelationModalOptions} from "./RelationModal";

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

/** Preserve every semantic direction without treating sequence roles as physical gates. */
function relationshipRoleForDisplay(role: Role): RelationshipRole | null {
  if (role === "parent" || role === "child" || role === "left" || role === "right" || role === "previous" || role === "next") return role;
  return null;
}

/** Mount a localized native-icon action with one accessible name and no duplicate tooltip. */
function iconButton(parent: HTMLElement, icon: string, label: string, action: () => void): HTMLButtonElement {
  const button = parent.createEl("button", { cls: "kplex-edge-source-action", attr: { type: "button", "aria-label": label } });
  labelIconButton(button, label, icon);
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
  private readonly ontologyEditor: SelectedOntologyEditor;
  private closed = false;
  private loadGeneration = 0;
  private operation: "idle" | "confirming" | "removing" | "saved-pending" = "idle";
  private confirmation: { close(): void } | null = null;
  private removalButtons: HTMLButtonElement[] = [];
  private mutationNavigationButtons: HTMLButtonElement[] = [];
  private renderedDeclarations = new Set<string>();
  private statusText = "";
  private pendingDeclaration: string | null = null;
  private releaseIndex: (() => void) | null = null;
  private releaseMigration: (() => void) | null = null;
  private initialFocusHandled = false;

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
      onStyle?: (invoker: HTMLButtonElement) => void;
    },
    private onClosed: () => void = () => {},
  ) {
    super(plugin.app);
    const doc = this.modalEl.ownerDocument;
    this.ontologyEditor = new SelectedOntologyEditor(plugin, /** Retire selected-field callbacks when the pair inspection closes or migrates. */ () => !this.closed && this.modalEl.isConnected && this.modalEl.ownerDocument === doc);
  }

  /** Project active field names for additive ontology display without rewriting declaration provenance. */
  private currentOntologies(): string[] {
    return activeOntologyFields(this.explanation);
  }

  /** Every physical field uses the same exact editor and parent lifetime, including overridden sources. */
  private ontologyEditButton(parent: HTMLElement, field: string): HTMLButtonElement {
    const generation = this.loadGeneration;
    const edit = iconButton(parent, "pencil", this.plugin.translator("ontology.editSelected", {field}), /** Vocabulary changes never mutate the inspected connection. */ () => {
      if (!this.isCurrent(generation) || this.operation !== "idle") return;
      this.ontologyEditor.open(field, edit, /** Saved annotations reacquire the current inspected pair. */ () => this.refreshDetails());
    });
    edit.disabled = this.operation !== "idle"; this.mutationNavigationButtons.push(edit); return edit;
  }

  /** Keep the existing inspector mounted behind its one exact relationship editor. */
  private openRelationshipEditor(options: RelinkRelationModalOptions): void {
    const generation = this.loadGeneration;
    if (!this.isCurrent(generation) || this.operation !== "idle" || this.ontologyEditor.active) return;
    this.setOperation("confirming");
    const dialog = this.plugin.openRelationModal({...options,
      current: /** Closing, migration or refresh retires unaccepted child work. */ () => this.isCurrent(generation),
      onClosed: /** Cancel and successful Save both return to the current canonical inspector. */ () => {
        if (this.confirmation !== dialog) return;
        this.confirmation = null;
        if (this.isCurrent(generation)) { this.setOperation("idle"); this.refreshDetails(); }
      }});
    this.confirmation = dialog;
  }

  /** Render physical ontology names and compact connection actions without changing their sources. */
  private addOntologyEditor(parent: HTMLElement, actions: HTMLElement): void {
    const generation = this.loadGeneration;
    const row = parent.createDiv({ cls: "kplex-edge-ontology-row" });
    const copy = row.createDiv({ cls: "kplex-edge-ontology-copy" });
    copy.createEl("strong", { text: this.plugin.translator("explain.ontology") });
    const ontologies = this.currentOntologies();
    const values = copy.createDiv({cls: "kplex-edge-ontology-value"});
    if (!ontologies.length) values.setText(this.plugin.translator("explain.noOntology"));
    for (const field of ontologies) {
      const value = values.createDiv({cls: "kplex-edge-ontology-field"}); value.createSpan({text: field});
      this.ontologyEditButton(value, field);
    }
    if (this.explanation.decisions.some(decision => decision.evidence.sourceKind === "inline-ontology")) {
      copy.createDiv({cls: "kplex-edge-body-ontology-hint setting-item-description", text: this.plugin.translator("explain.bodyOntologyHint")});
    }

    const activeDefined = this.explanation.decisions.filter((decision) =>
      decision.active && decision.evidence.relationType === RelationType.DEFINED,
    );
    const definingDecision = activeDefined.find((decision) =>
      decision.evidence.sourceKind === "frontmatter-ontology" || decision.evidence.sourceKind === "inline-ontology",
    );
    const hasExplicitOntology = Boolean(definingDecision);

    let semanticRole = this.displayContext ? relationshipRoleForDisplay(this.displayContext.role) : null;
    if (!semanticRole) semanticRole = this.explanation.resolvedRoles.map(/** Sibling placement is contextual; the pair retains its actual semantic direction. */
      resolved => relationshipRoleForDisplay(resolved.role)).find(/** Hidden/context-only roles cannot initialize the six-direction selector. */ role => role !== null) ?? null;
    let source = this.plugin.index.get(this.explanation.sourcePath);
    let target = this.plugin.index.get(this.explanation.targetPath);
    let storagePath: string | undefined;
    if (definingDecision) {
      const evidence = definingDecision.evidence;
      if (evidence.declaredRole !== "hidden") semanticRole = relationshipRoleForDisplay(evidence.declaredRole);
      source = this.plugin.index.get(evidence.declaredByPath);
      target = this.plugin.index.get(evidence.declaredTargetPath);
      storagePath = evidence.declaredByPath;
    }
    if (!semanticRole || !source || !target || !connectionActionAllowed("relationship.relink", source, target)
      || !eligibleRelationshipOwner(this.app, source) && !eligibleRelationshipOwner(this.app, target)) return;

    const actionLabel = this.plugin.translator(hasExplicitOntology ? "explain.addOntology" : "explain.specifyOntology");
    const button = iconButton(actions, "plus", actionLabel, /** Add and define retain every existing declaration. */ () => {
      if (!this.isCurrent(generation)) return;
      this.openRelationshipEditor({
        mode: "relink", purpose: hasExplicitOntology ? "ontology-add" : "ontology-specify",
        origin: source, fixedTarget: target, semanticRole, initialStoragePath: storagePath,
        allowRoleSelection: true, hostLeaf: this.displayContext?.hostLeaf,
      });
    });
    button.dataset.kplexAddOntology = "true";
    button.disabled = this.operation !== "idle";
    this.mutationNavigationButtons.push(button);

    const {sourcePath, targetPath} = this.explanation;
    const approved = this.plugin.captureConnectionOntologyChange(sourcePath, targetPath);
    if (approved) {
      const replace = iconButton(actions, "replace", this.plugin.translator("actions.relationship.relink"), /** Reacquire native approval at activation, not just when rendering the toolbar. */ () => {
        if (!this.isCurrent(generation) || this.operation !== "idle") return;
        const current = this.plugin.captureConnectionOntologyChange(sourcePath, targetPath);
        if (!current || current.selection.signature !== approved.selection.signature) {
          this.refreshDetails(this.plugin.translator("explain.removeSourceChanged")); return;
        }
        const primary = current.selection.primary;
        const owner = this.plugin.index.get(primary.declaredByPath), destination = this.plugin.index.get(primary.declaredTargetPath);
        if (!owner || !destination) return;
        this.openRelationshipEditor({mode: "relink", purpose: "ontology-change", ontologyChange: current,
          origin: owner, fixedTarget: destination, semanticRole: primary.declaredRole,
          initialField: primary.fieldName, initialStoragePath: primary.declaredByPath,
          hostLeaf: this.displayContext?.hostLeaf});
      });
      replace.dataset.kplexChangeOntology = "true";
      replace.disabled = this.operation !== "idle"; this.mutationNavigationButtons.push(replace);
    }
    const explicit = this.explanation.decisions.map(/** Only physical property provenance can explain a declaration conflict. */ decision => decision.evidence)
      .filter(/** Generic inference and unsupported native endpoints are not conflicting ontology declarations. */ evidence => evidence.sourceKind === "frontmatter-ontology" || evidence.sourceKind === "inline-ontology");
    const physical = new Set(explicit.map(/** Repeated evidence for one physical property is one declaration. */ evidence =>
      JSON.stringify([evidence.sourceKind, evidence.declaredByPath, evidence.declaredTargetPath, evidence.fieldName])));
    if (physical.size > 1 && !selectConnectionOntology(explicit, ontologyConfiguration(this.plugin.settings), sourcePath, targetPath)) {
      copy.createDiv({cls: "kplex-edge-ontology-conflict setting-item-description", text: this.plugin.translator("explain.changeOntologyConflict")});
    }
  }

  /** Reuse exact directional Hidden provenance and additive writes, preserving all source links. */
  private addHiddenAction(parent: HTMLElement): void {
    const generation = this.loadGeneration;
    const hidden = this.explanation.decisions.map(/** Visibility removal retains authored provenance from either inspected endpoint. */ decision => decision.evidence)
      .filter(/** Other relationship declarations are preserved, including when this perspective stays visible. */ evidence => evidence.declaredRole === "hidden");
    if (hidden.length) {
      const declarations = selectedFrontmatterDeclarations(hidden);
      const coordinates = new Set(hidden.map(/** Generic repeats of the same physical declaration are one visibility source. */ evidence =>
        evidence.sourceKind === "frontmatter-ontology" ? frontmatterDeclarationKey(evidence) : JSON.stringify([evidence.sourceKind, evidence.declaredByPath, evidence.fieldName, evidence.line])));
      if (coordinates.size !== 1 || declarations.length !== 1) return;
      const evidence = declarations[0], expected = this.plugin.captureFrontmatterUnlinkExpectation(evidence);
      if (!expected) return;
      const show = iconButton(parent, "eye", this.plugin.translator("hide.removeDeclaration"), /** A reversible visibility flag can be removed directly while preserving every source link. */ () => {
        if (!this.isCurrent(generation) || this.operation !== "idle") return;
        const actual = this.plugin.captureFrontmatterUnlinkExpectation(evidence);
        if (!actual || actual.storage !== expected.storage || actual.target !== expected.target || actual.fieldKey !== expected.fieldKey) {
          this.refreshDetails(this.plugin.translator("explain.removeSourceChanged")); return;
        }
        this.setOperation("confirming");
        void this.removeDeclaration(evidence, actual, generation);
      });
      show.dataset.kplexShowConnection = "true";
      show.disabled = this.operation !== "idle"; this.removalButtons.push(show);
      return;
    }
    if (this.explanation.hidden) return;
    if (!this.plugin.hideRelationship || !connectionActionAllowed("relationship.hide", this.plugin.index.get(this.explanation.sourcePath), this.plugin.index.get(this.explanation.targetPath))) return;
    const button = iconButton(parent,"eye-off",this.plugin.translator("hide.title"), /** Parent close or refresh retires confirmation authority. */ () => {
      if (!this.isCurrent(generation) || this.operation !== "idle") return;
      this.setOperation("confirming");
      void this.plugin.hideRelationship(this.explanation.sourcePath,this.explanation.targetPath, /** Keep one mounted inspection generation through native mutation. */ () => this.isCurrent(generation),
        /** Parent refresh/close owns the exact native confirmation, while saved writes remain plugin-owned. */ modal => {this.confirmation = modal;}).then(
        /** Return to source inspection after cancellation or show truthful persisted status. */ outcome => {
          if (!this.isCurrent(generation)) return;
          this.setOperation(outcome.status === "saved-pending" ? "saved-pending" : "idle");
          this.refreshDetails();
        }, /** Preparation failures retire the operation without creating unhandled native UI work. */ () => {
          if (!this.isCurrent(generation)) return;
          this.setOperation("idle");
          this.refreshDetails(this.plugin.translator("explain.removeSourceChanged"));
        });
    });
    button.disabled = this.operation !== "idle";
    button.dataset.kplexHideConnection = "true";
    this.mutationNavigationButtons.push(button);
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
      const actions = header.createDiv({cls: "kplex-edge-source-actions"});
      if (evidence.fieldName && (evidence.sourceKind === "frontmatter-ontology" || evidence.sourceKind === "inline-ontology")) {
        this.ontologyEditButton(actions, evidence.fieldName);
      }
      if (this.plugin.index.get(evidence.declaredByPath)?.file) {
        const generation = this.loadGeneration;
        const navigate = iconButton(actions, "locate-fixed", this.plugin.translator("explain.goToSource"), /** Missing occurrence text still retains the exact physical document owner. */ () => {
          if (!this.isCurrent(generation) || this.operation !== "idle") return;
          void this.plugin.openRelationshipEvidenceLocation({path: evidence.declaredByPath, line: evidence.line ?? 1}, this.displayContext?.hostLeaf).then(() => this.close());
        });
        navigate.disabled = this.operation !== "idle"; this.mutationNavigationButtons.push(navigate);
      }
      this.renderRemovalActions(row, [decision]);
      return;
    }

    for (const section of sections) this.renderSourceOccurrence(container, section, [decision]);
  }

  /** Render a grouped physical source occurrence with localized evidence labels and original source content. */
  private renderSourceOccurrence(container: HTMLElement, section: RelationshipSourceSection, decisions: readonly EvidenceDecision[]): void {
      const generation = this.loadGeneration;
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

      const actions = header.createDiv({ cls: "kplex-edge-source-actions" });
      for (const field of new Set(decisions.filter(/** Overridden properties retain their own physical editing identity. */ decision =>
        decision.evidence.sourceKind === "frontmatter-ontology" || decision.evidence.sourceKind === "inline-ontology")
        .map(/** Field names are source facts, not combined connector captions. */ decision => decision.evidence.fieldName).filter(/** Body/property sources without a physical field have no ontology editor target. */ (field): field is string => Boolean(field)))) this.ontologyEditButton(actions, field);
      const navigate = iconButton(actions, "locate-fixed", this.plugin.translator("explain.goToSource"), () => {
        if (!this.isCurrent(generation) || this.operation !== "idle") return;
        void this.plugin.openRelationshipEvidenceLocation({ path: section.path, line: section.occurrence?.line ?? section.startLine }, this.displayContext?.hostLeaf).then(() => this.close());
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
      const actions = row.createDiv({cls: "kplex-edge-declaration-actions"});
      const button = iconButton(actions, "unlink", this.plugin.translator("explain.removeRelationship"), /** Capture one still-current physical declaration before showing native confirmation. */ () =>
        this.confirmDeclarationRemoval(evidence, expected, generation));
      button.dataset.kplexRemoveField = expected.fieldKey;
      button.disabled = this.operation !== "idle";
      this.removalButtons.push(button);
      if (evidence.declaredRole === "hidden") continue;
      const receiving = this.plugin.index.get(expected.targetPath);
      const reversible = receiving && eligibleRelationshipOwner(this.app, receiving)
        && ["parent", "child", "left", "right", "previous", "next"].includes(evidence.declaredRole);
      const reverseLabel = this.plugin.translator("relationship.flip");
      const reverse = iconButton(actions, "arrow-left-right", reversible ? reverseLabel : `${reverseLabel} · ${this.plugin.translator("relationship.flipUnavailable")}`, /** Each action names one independent declaration, even when the pair has several evidence sources. */ () => {
        if (!reversible || !this.isCurrent(generation) || this.operation !== "idle" || this.ontologyEditor.active) return;
        const actual = this.plugin.captureFrontmatterUnlinkExpectation(evidence);
        if (!actual || actual.storage !== expected.storage || actual.target !== expected.target || actual.fieldKey !== expected.fieldKey) {
          this.refreshDetails(this.plugin.translator("explain.removeSourceChanged")); return;
        }
        this.setOperation("confirming");
        const dialog = new ReverseRelationshipModal(this.app, this.plugin.translator, {
          owner: actual.storagePath, field: actual.fieldKey, target: actual.targetPath,
          inverse: this.plugin.inverseOntologyField(actual.fieldKey, evidence.declaredRole as import("../types").RelationshipRole),
        }, /** Parent close/migration revokes unaccepted cross-file work. */ () => this.isCurrent(generation),
        /** The canonical writer creates the replacement before removing this exact selected property. */ () => this.plugin.reverseFrontmatterEvidence(evidence, actual, () => this.isCurrent(generation)),
        /** Refresh is observation-only and restores pair authority before an explicit retry. */ () => this.plugin.index.prepareRelationshipPair(actual.storagePath, actual.targetPath),
        /** Close restores the current details, including any durable partial result. */ () => {
          if (this.confirmation !== dialog) return; this.confirmation = null;
          if (this.isCurrent(generation)) {this.setOperation("idle"); this.refreshDetails();}
        });
        this.confirmation = dialog; dialog.open();
      });
      actions.insertBefore(reverse, button);
      reverse.disabled = !reversible || this.operation !== "idle";
      if (reversible) this.removalButtons.push(reverse);
    }
  }

  /** Physical source unlink retains one exact, explicitly confirmed declaration edit. */
  private confirmDeclarationRemoval(evidence: RelationEvidence, expected: NonNullable<ReturnType<KplexPlugin["captureFrontmatterUnlinkExpectation"]>>, generation: number): void {
    if (!this.isCurrent(generation) || this.operation !== "idle") return;
    const actual = this.plugin.captureFrontmatterUnlinkExpectation(evidence);
    if (!actual || actual.storage !== expected.storage || actual.target !== expected.target || actual.fieldKey !== expected.fieldKey) {
      this.refreshDetails(this.plugin.translator("explain.removeSourceChanged")); return;
    }
    this.setOperation("confirming");
    const confirmation = new RemoveRelationshipSourceModal(this.app, this.plugin.translator,
      {note: actual.storagePath, field: actual.fieldKey, target: actual.targetPath}, /** Only this mounted generation can resume an explicit approval. */ confirmed => {
        this.confirmation = null;
        if (!this.isCurrent(generation)) return;
        if (!confirmed) { this.setOperation("idle"); return; }
        void this.removeDeclaration(evidence, actual, generation);
      });
    this.confirmation = confirmation;
    confirmation.open();
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
    this.initialFocusHandled = false;
    this.releaseMigration = this.displayContext?.hostLeaf?.view.containerEl.onWindowMigrated?.(/** A migrated inspector cannot retain nested ontology or cross-file mutation prompts. */ () => this.close()) ?? null;
    this.releaseIndex = this.plugin.index.subscribe(/** Only a saved-pending operation needs publication-driven refresh. */ () => this.refreshPendingRemoval());
    this.refreshDetails();
    void this.prepareEditablePair(this.loadGeneration);
  }

  /**
   * Resolve an incoming preview through the existing exact-pair owner. A filename/backlink preview
   * may show the connection without its other note's ontology; centering that note must not be
   * required to discover its editable property. Ready pairs and structural membership need no work.
   * Closing or replacing this dialog generation retires the result without refreshing stale UI.
   */
  private async prepareEditablePair(generation: number): Promise<void> {
    const { sourcePath, targetPath } = this.explanation;
    const source = this.plugin.index.get(sourcePath), target = this.plugin.index.get(targetPath);
    if (!source || !target || source.isFolder || target.isFolder || source.isTag || target.isTag
      || this.plugin.index.isSemanticWriteReady(sourcePath, targetPath)) return;
    try {
      const prepared = await this.plugin.index.prepareRelationshipPair(sourcePath, targetPath);
      if (prepared && this.isCurrent(generation) && this.operation === "idle") this.refreshDetails();
    } catch {
      if (this.isCurrent(generation) && this.operation === "idle") this.refreshDetails(this.plugin.translator("explain.sourceLoadFailed"));
    }
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

    const actions = this.contentEl.createDiv({cls: "kplex-edge-connection-actions", attr: {"aria-label": this.plugin.translator("explain.connectionActions"), role: "group"}});
    this.addOntologyEditor(this.contentEl, actions);
    this.addHiddenAction(actions);
    if (this.displayContext?.onStyle) {
      const style = iconButton(actions, "paintbrush", this.plugin.translator("styleSources.menu"), /** Appearance navigation belongs to the caller's captured style sources. */ () => {
        if (this.isCurrent(generation) && this.operation === "idle") this.displayContext?.onStyle?.(style);
      });
      style.dataset.kplexConnectionStyle = "true";
      style.disabled = this.operation !== "idle"; this.mutationNavigationButtons.push(style);
    }

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
        const grouped = groupRelationshipSourceOccurrences(explanation.decisions, sectionsByEvidence);
        for (const decision of grouped.unlocated) this.renderEvidenceSource(list, decision, []);
        for (const group of grouped.groups) this.renderSourceOccurrence(list, group.section, group.decisions);
      }).catch(() => {
        if (!this.isCurrent(generation) || !list.isConnected) return;
        loading.setText(this.plugin.translator("explain.sourceLoadFailed"));
      });
    }

    const initialFocus = this.displayContext?.initialFocus;
    if (initialFocus && !this.initialFocusHandled) {
      const viewWindow = this.contentEl.ownerDocument.defaultView ?? window;
      viewWindow.requestAnimationFrame(() => {
        if (!this.isCurrent(generation) || this.initialFocusHandled) return;
        this.initialFocusHandled = true;
        (initialFocus === "why" ? why : list).scrollIntoView({ block: "nearest" });
      });
    }
  }

  /** Retire pending evidence UI and release the originating surface session exactly once. */
  onClose(): void {
    if (this.closed) return;
    this.closed = true;
    this.ontologyEditor.close();
    this.releaseMigration?.(); this.releaseMigration = null;
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
