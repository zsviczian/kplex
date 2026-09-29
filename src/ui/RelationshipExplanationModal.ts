/**
 * Native Connection details dialog over pair-scoped semantic explanations and provenance. This host UI formats stable reason codes and offers additive ontology/source navigation actions.
 */
import { Modal, setIcon, type WorkspaceLeaf } from "obsidian";
import type KplexPlugin from "../main";
import type { RelationshipSourceSection } from "../main";
import { RelationType, type GateRole, type Role } from "../types";
import { ONTOLOGY_PRECEDENCE_SUPPRESSION, type EvidenceDecision, type EvidenceSourceKind, type EvidenceSuppressionReason } from "../index/RelationEvidence";
import type { RelationshipExplanation, RelationshipSummary } from "../index/RelationResolver";
import type { Translator, PlainTranslationKey } from "../lang";

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
  "date-property": "explain.sourceDateProperty",
  "file-tree": "explain.sourcePhysicalFolderTree",
  "tag-tree": "explain.sourceTagTree",
  "url-origin": "explain.sourceUrlOriginHierarchy",
};

/** Translate defined/inferred evidence classification without changing the semantic enum. */
function relationTypeLabel(type: RelationType, translate: Translator): string {
  return translate(type === RelationType.DEFINED ? "graph.relationDefined" : "graph.relationInferred");
}
/** Translate every stable relationship summary code at the presentation boundary; core emits no display sentence. */
function relationshipSummaryLabel(summary: RelationshipSummary, translate: Translator): string {
  switch (summary) {
    case "hidden": return translate("explain.summaryHidden");
    case "ontology-precedence": return translate("explain.summaryOntologyPrecedence");
    case "conflicting-defined-roles": return translate("explain.summaryConflictingDefinedRoles");
    case "bidirectional-inferred": return translate("explain.summaryBidirectionalInferred");
    case "defined-ontology": return translate("explain.summaryDefinedOntology");
    case "date-property": return translate("explain.summaryDateProperty");
    case "no-active-evidence": return translate("explain.summaryNoActiveEvidence");
    case "transient-section": return translate("explain.summaryTransientSection");
    case "source:frontmatter-ontology": return translate("explain.summarySourceFrontmatterOntology");
    case "source:inline-ontology": return translate("explain.summarySourceInlineOntology");
    case "source:obsidian-link": return translate("explain.summarySourceResolvedNoteLink");
    case "source:unresolved-link": return translate("explain.summarySourceUnresolvedNoteLink");
    case "source:body-url": return translate("explain.summarySourceBodyUrl");
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

function gateRoleForDisplayRole(role: Role): GateRole | null {
  if (role === "parent" || role === "child" || role === "left" || role === "right") return role;
  if (role === "previous") return "left";
  if (role === "next") return "right";
  return null;
}

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
  ) {
    super(plugin.app);
  }

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
    button.addEventListener("click", () => {
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
      iconButton(actions, "locate-fixed", this.plugin.translator("explain.goToSource"), () => {
        void this.plugin.openRelationshipEvidenceLocation({ path: section.path, line: section.startLine }, this.displayContext?.hostLeaf).then(() => this.close());
      });
  }

  /** Render the pair’s Connection details, evidence evaluations and provenance actions with localized captions and feedback; the native Modal owns its open/close shell. */
  onOpen(): void {
    this.closed = false;
    const source = this.plugin.index.get(this.explanation.sourcePath);
    const target = this.plugin.index.get(this.explanation.targetPath);
    const sourceTitle = this.displayContext?.sourceTitle ?? (source ? this.plugin.index.titleFor(source) : this.explanation.sourcePath);
    const targetTitle = this.displayContext?.targetTitle ?? (target ? this.plugin.index.titleFor(target) : this.explanation.targetPath);

    this.titleEl.setText(this.plugin.translator("explain.title"));
    this.modalEl.addClass("kplex-explanation-modal", "kplex-edge-properties-modal");

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
      const evidence = this.explanation.decisions.map((decision) => decision.evidence);
      void this.plugin.relationshipEvidenceSectionsBatch(evidence).then((sectionsByEvidence) => {
        if (this.closed || !list.isConnected) return;
        loading.remove();
        const occurrenceGroups = new Map<string, { section: RelationshipSourceSection; decisions: EvidenceDecision[]; priority: number }>();
        const priorityFor = (decision: EvidenceDecision): number => {
          if (decision.evidence.sourceKind === "frontmatter-ontology" || decision.evidence.sourceKind === "inline-ontology") return 0;
          if (decision.evidence.sourceKind === "body-url" || decision.evidence.sourceKind === "date-property") return 1;
          return 2;
        };
        for (const decision of this.explanation.decisions) {
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
        if (this.closed || !list.isConnected) return;
        loading.setText(this.plugin.translator("explain.sourceLoadFailed"));
      });
    }

    const viewWindow = this.contentEl.ownerDocument.defaultView ?? window;
    viewWindow.requestAnimationFrame(() => {
      if (this.closed) return;
      const focus = this.displayContext?.initialFocus === "why" ? why : list;
      focus.scrollIntoView({ block: "nearest" });
    });
  }

  onClose(): void {
    this.closed = true;
    this.contentEl.empty();
  }
}
