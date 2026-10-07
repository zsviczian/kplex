/**
 * Host-bound Plex filter and Graph Lens editor. Shared predicates own matching; this surface localizes
 * choices and validation. FloatingLayer owns portaling, dismissal and header drag in the owning document.
 */
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import type { GraphIndex } from "../index/GraphIndex";
import type { GraphPage, Role } from "../types";
import type { NodeSortOrder } from "../settings";
import { createGraphLensId, defaultGraphLensStyle, validateGraphLensExpression, type GraphLensDefinition, type GraphLensMode, type GraphLensScope, type GraphLensStyle, type GraphLensValidationIssue } from "../lens/GraphLens";
import {
  buildGraphLensSimpleExpression,
  createGraphLensConditionId,
  defaultGraphLensSimpleModel,
  graphLensSimpleConditionNeedsValue,
  tryParseGraphLensSimpleExpression,
  type GraphLensSimpleCondition,
  type GraphLensSimpleField,
  type GraphLensSimpleModel,
  type GraphLensSimpleOperator,
} from "../lens/GraphLensSimple";
import { EMPTY_PLEX_FILTER, isPlexFilterActive, type PlexFilterState } from "../lens/SimplePlexFilter";
import { ObsidianIcon } from "./ObsidianIcon";
import { FloatingLayer, type FloatingLayerPositioning } from "./components/FloatingLayer";
import type { Translator, PlainTranslationKey } from "../lang";

export type { PlexFilterState } from "../lens/SimplePlexFilter";
export { EMPTY_PLEX_FILTER } from "../lens/SimplePlexFilter";

export type GraphFilterLayoutMode = "keep" | "reflow";
export type PlexVisibilitySetting =
  | "showAttachments"
  | "showVirtualNodes"
  | "showInferredNodes"
  | "showPageNodes"
  | "showFolderNodes"
  | "showTagNodes"
  | "showURLNodes";

type LensEditorMode = "simple" | "code";
type LensDraft = Pick<GraphLensDefinition, "id" | "name" | "scope" | "mode" | "expression"> & {
  editorMode: LensEditorMode;
  simple: GraphLensSimpleModel | null;
  style?: GraphLensStyle;
};

type Choice = { value: string; label: string };
type ChoiceSpec = { value: string; labelKey: PlainTranslationKey };

const ROLE_CHOICE_SPECS: ChoiceSpec[] = [
  { value: "parent", labelKey: "role.parent" },
  { value: "child", labelKey: "role.child" },
  { value: "left", labelKey: "filter.roleFriendLeft" },
  { value: "right", labelKey: "filter.roleChallengerRight" },
  { value: "previous", labelKey: "role.previous" },
  { value: "next", labelKey: "role.next" },
  { value: "sibling", labelKey: "filter.roleSibling" },
];
const EDGE_KIND_SPECS: ChoiceSpec[] = [{ value: "defined", labelKey: "filter.edgeDefined" }, { value: "inferred", labelKey: "filter.edgeInferred" }];
const DIRECTION_SPECS: ChoiceSpec[] = [{ value: "from", labelKey: "filter.directionFrom" }, { value: "to", labelKey: "filter.directionTo" }, { value: "both", labelKey: "filter.directionBoth" }];
const EVIDENCE_SOURCE_SPECS: ChoiceSpec[] = [
  { value: "frontmatter-ontology", labelKey: "filter.sourceFrontmatter" }, { value: "inline-ontology", labelKey: "filter.sourceInline" },
  { value: "obsidian-link", labelKey: "filter.sourceMarkdown" }, { value: "unresolved-link", labelKey: "filter.sourceUnresolved" },
  { value: "date-property", labelKey: "filter.sourceDate" }, { value: "body-url", labelKey: "filter.sourceBodyUrl" },
  { value: "property-url", labelKey: "filter.sourcePropertyUrl" },
  { value: "file-tree", labelKey: "filter.sourceFolder" }, { value: "tag-tree", labelKey: "filter.sourceTag" },
  { value: "url-origin", labelKey: "filter.sourceUrlOrigin" },
];
const BOOLEAN_SPECS: ChoiceSpec[] = [{ value: "true", labelKey: "filter.active" }, { value: "false", labelKey: "filter.suppressed" }];

/** Resolve parameter-free catalog keys for select choices while retaining their machine-readable values. */
function localizeChoices(specs: readonly ChoiceSpec[], translate: Translator): Choice[] {
  return specs.map(({ value, labelKey }) => ({ value, label: translate(labelKey) }));
}

/** Use the stored lens name when present, otherwise supply the localized display-only fallback. */
function lensDisplayName(name: string, translate: Translator): string {
  return name.trim() || translate("filter.untitledLens");
}

/** Format a parser token kind for user feedback; punctuation and unknown machine tokens retain their literal grammar spelling. */
function graphLensExpectedTokenLabel(token: string, translate: Translator): string {
  switch (token) {
    case "identifier": return translate("filter.validationTokenIdentifier");
    case "string": return translate("filter.validationTokenString");
    case "number": return translate("filter.validationTokenNumber");
    case "operator": return translate("filter.validationTokenOperator");
    case "punct": return translate("filter.validationTokenPunctuation");
    case "eof": return translate("filter.validationTokenEndOfExpression");
    default: return token;
  }
}

/** Format structured parser/semantic issues at the UI boundary, preserving source values and one-based character positions. */
function graphLensValidationMessage(error: GraphLensValidationIssue, translate: Translator): string {
  if (error.code === "selector-reference-required") return translate("filter.validationSelectorReferenceRequired");
  if (error.code === "unknown-edge-role") return translate("filter.validationUnknownPlexPosition", { value: error.value });
  if (error.code === "unknown-edge-kind") return translate("filter.validationUnknownRelationshipKind", { value: error.value });
  if (error.code === "unknown-edge-direction") return translate("filter.validationUnknownRelationshipDirection", { value: error.value });

  const issue = error.issue;
  switch (issue.code) {
    case "unterminated-string": return translate("filter.validationUnterminatedString", { position: issue.position });
    case "invalid-number": return translate("filter.validationInvalidNumber", { value: issue.value, position: issue.position });
    case "unexpected-token": return translate("filter.validationUnexpectedToken", { value: issue.value, position: issue.position });
    case "empty-expression": return translate("filter.validationEmptyExpression", { position: issue.position });
    case "expected-token": {
      const expected = graphLensExpectedTokenLabel(issue.expected, translate);
      return issue.found === null
        ? translate("filter.validationExpectedTokenAtEnd", { expected, position: issue.position })
        : translate("filter.validationExpectedToken", { expected, found: issue.found, position: issue.position });
    }
    case "comparison-right-value": return translate("filter.validationComparisonRightValue", { position: issue.position });
    case "expected-value": return issue.found === null
      ? translate("filter.validationExpectedValueAtEnd", { position: issue.position })
      : translate("filter.validationExpectedValue", { found: issue.found, position: issue.position });
    case "unknown-namespace": return translate("filter.validationUnknownNamespace", { value: issue.value, position: issue.position });
    case "expected-property": return translate("filter.validationExpectedProperty", { namespace: issue.namespace, position: issue.position });
    case "function-arguments-values": return translate("filter.validationFunctionArgumentsValues", { position: issue.position });
    case "unknown-function": return translate("filter.validationUnknownFunction", { value: issue.value, position: issue.position });
    case "unknown-method": return translate("filter.validationUnknownMethod", { value: issue.value, position: issue.position });
    case "invalid-expression": return translate("filter.validationInvalidExpression");
  }
}


const openFilterPanels = new WeakMap<Document, number>();

const FILTER_PANEL_POSITIONING: FloatingLayerPositioning = {
  preferredWidth: 560,
  minimumWidth: 300,
  viewportMargin: 8,
  anchorGap: 6,
  minimumMaxHeight: 180,
};

/** Portal to the trigger's document so the filter floats above adjacent native panes and pop-outs. */
function ownerDocumentBody(doc: Document): HTMLElement {
  return doc.body;
}

/** Retain the document's tooltip stacking class until its final filter panel closes. */
function registerOpenFilterPanel(doc: Document): () => void {
  const count = (openFilterPanels.get(doc) ?? 0) + 1;
  openFilterPanels.set(doc, count);
  doc.body.classList.add("kplex-filter-panel-open");
  return /** Remove stacking only after every panel in this owning document has closed. */ () => {
    const next = Math.max(0, (openFilterPanels.get(doc) ?? 1) - 1);
    if (next > 0) {
      openFilterPanels.set(doc, next);
      return;
    }
    openFilterPanels.delete(doc);
    doc.body.classList.remove("kplex-filter-panel-open");
  };
}

/** Build localized selector choices appropriate to the lens scope without changing selector paths. */
function fieldOptions(translate: Translator): Record<GraphLensScope, Array<{ value: GraphLensSimpleField; label: string; title?: string }>> {
  return {
    node: [
      { value: "node.label", label: translate("filter.fieldTitle") }, { value: "file.path", label: translate("filter.fieldPath") },
      { value: "file.folder", label: translate("filter.fieldFolder") }, { value: "file.tags", label: translate("filter.fieldTag") },
      { value: "node.noteType", label: translate("filter.fieldNoteType") }, { value: "file.extension", label: translate("filter.fieldFileType") },
      { value: "note.property", label: translate("filter.fieldProperty"), title: translate("filter.fieldPropertyHelp") },
    ],
    edge: [
      { value: "edge.definition", label: translate("filter.fieldRelationshipProperty"), title: translate("filter.fieldRelationshipPropertyHelp") },
      { value: "edge.role", label: translate("filter.fieldPlexPosition") }, { value: "edge.kind", label: translate("filter.fieldDefinedInferred") },
      { value: "edge.direction", label: translate("filter.fieldDirection") }, { value: "edge.sourcePath", label: translate("filter.fieldSourcePath") },
      { value: "edge.targetPath", label: translate("filter.fieldTargetPath") },
    ],
    evidence: [
      { value: "evidence.fieldName", label: translate("filter.fieldPropertyField") }, { value: "evidence.definition", label: translate("filter.fieldRelationshipDefinition") },
      { value: "evidence.sourceKind", label: translate("filter.fieldEvidenceSource") }, { value: "evidence.active", label: translate("filter.fieldResolutionStatus") },
      { value: "evidence.declaredRole", label: translate("filter.fieldDeclaredPlexPosition") }, { value: "evidence.declaredByPath", label: translate("filter.fieldDeclaredBy") },
      { value: "evidence.declaredTargetPath", label: translate("filter.fieldDeclaredTarget") }, { value: "evidence.suppressionReason", label: translate("filter.fieldSuppressionReason") },
    ],
  };
}

function EMPTY_DRAFT(): LensDraft {
  const scope: GraphLensScope = "node";
  const simple = defaultGraphLensSimpleModel(scope);
  return {
    id: createGraphLensId(),
    name: "",
    scope,
    mode: "include",
    expression: buildGraphLensSimpleExpression(simple),
    editorMode: "simple",
    simple,
    style: undefined,
  };
}

/** Build localized operators while retaining the simple-lens model’s stable operator values. */
function operatorChoices(condition: GraphLensSimpleCondition, translate: Translator): Choice[] {
  if (condition.field === "file.tags") return [
    { value: "has", label: translate("filter.operatorHasTag") }, { value: "does-not-have", label: translate("filter.operatorDoesNotHaveTag") },
  ];
  if (condition.field === "file.folder") return [
    { value: "in-folder", label: translate("filter.operatorInFolder") }, { value: "not-in-folder", label: translate("filter.operatorNotInFolder") },
  ];
  if (["edge.role", "edge.kind", "edge.direction", "evidence.sourceKind", "evidence.active", "evidence.declaredRole"].includes(condition.field)) {
    return [{ value: "is", label: translate("filter.operatorIs") }, { value: "is-not", label: translate("filter.operatorIsNot") }];
  }
  return [
    { value: "is", label: translate("filter.operatorIs") }, { value: "is-not", label: translate("filter.operatorIsNot") },
    { value: "contains", label: translate("filter.operatorContains") }, { value: "does-not-have", label: translate("filter.operatorDoesNotContain") },
    { value: "starts-with", label: translate("filter.operatorStartsWith") }, { value: "ends-with", label: translate("filter.operatorEndsWith") },
    { value: "exists", label: translate("filter.operatorExists") }, { value: "not-exists", label: translate("filter.operatorNotExists") },
  ];
}

function defaultOperator(field: GraphLensSimpleField): GraphLensSimpleOperator {
  if (field === "file.tags") return "has";
  if (field === "file.folder") return "in-folder";
  if (field === "node.label") return "contains";
  return "is";
}

/** Reuse the simple-lens operator vocabulary for quick-filter choices, with localized display labels. */
function quickOperatorChoices(field: PlexFilterState["field"], translate: Translator): Choice[] {
  if (field === "file.tags") return [
    { value: "has", label: translate("filter.operatorHasTag") }, { value: "does-not-have", label: translate("filter.operatorDoesNotHaveTag") },
  ];
  if (field === "node.noteType") return [
    { value: "is", label: translate("filter.operatorIs") }, { value: "is-not", label: translate("filter.operatorIsNot") },
  ];
  return [
    { value: "contains", label: translate("filter.operatorContains") }, { value: "does-not-have", label: translate("filter.operatorDoesNotContain") },
    { value: "is", label: translate("filter.operatorIs") }, { value: "is-not", label: translate("filter.operatorIsNot") },
    { value: "starts-with", label: translate("filter.operatorStartsWith") }, { value: "ends-with", label: translate("filter.operatorEndsWith") },
  ];
}

/** Translate a lens scope for display without changing its persisted scope value. */
function scopeLabel(scope: GraphLensScope, translate: Translator): string {
  if (scope === "edge") return translate("filter.scopeRelationship");
  if (scope === "evidence") return translate("filter.scopeEvidence");
  return translate("filter.scopeNote");
}
/** Translate a lens mode for display without changing include/exclude/style evaluation. */
function modeLabel(mode: GraphLensMode, translate: Translator): string {
  return mode === "include" ? translate("filter.modeInclude") : mode === "exclude" ? translate("filter.modeExclude") : translate("filter.modeStyle");
}
function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set([...values].map((value) => value.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}
/** Derive the suggested display name from localized scope/field labels and the user-entered condition. */
function deriveLensName(draft: LensDraft, translate: Translator): string {
  const first = draft.simple?.conditions[0];
  if (first?.value.trim()) return first.value.trim();
  if (first?.field === "note.property" && first.propertyName?.trim()) return first.propertyName.trim();
  return `${modeLabel(draft.mode, translate)} ${scopeLabel(draft.scope, translate).toLocaleLowerCase()}`;
}
/** Validate the simple-lens form and return localized feedback through the shared expression validation path. */
function simpleValidation(model: GraphLensSimpleModel, translate: Translator): string | null {
  if (!model.conditions.length) return translate("filter.validationAddCondition");
  for (const condition of model.conditions) {
    if (condition.field === "note.property" && !condition.propertyName?.trim()) return translate("filter.validationChooseProperty");
    if (graphLensSimpleConditionNeedsValue(condition) && !condition.value.trim()) return translate("filter.validationChooseValue");
  }
  return null;
}


/** Render the localized quick-filter and named-lens editor; evaluation and persisted definitions remain owned by shared lens contracts. */
export function PlexFilter({
  index,
  center,
  revision,
  value,
  onChange,
  lenses,
  onLensesChange,
  layoutMode,
  onLayoutModeChange,
  showSiblings,
  onShowSiblingsChange,
  visibility,
  onVisibilityChange,
  sortOrder,
  onSortOrderChange,
  translate,
}: {
  index: GraphIndex;
  center?: GraphPage;
  revision: number;
  value: PlexFilterState;
  onChange: (value: PlexFilterState) => void;
  lenses: GraphLensDefinition[];
  onLensesChange: (lenses: GraphLensDefinition[]) => void;
  layoutMode: GraphFilterLayoutMode;
  onLayoutModeChange: (mode: GraphFilterLayoutMode) => void;
  showSiblings: boolean;
  onShowSiblingsChange: (show: boolean) => void;
  visibility: Record<PlexVisibilitySetting, boolean>;
  onVisibilityChange: (key: PlexVisibilitySetting) => void;
  sortOrder: NodeSortOrder;
  onSortOrderChange: (order: NodeSortOrder) => void;
  translate: Translator;
}) {
  const roleChoices = localizeChoices(ROLE_CHOICE_SPECS, translate);
  const evidenceRoleChoices = [...roleChoices.filter((choice) => choice.value !== "sibling"), { value: "hidden", label: translate("role.hidden") }];
  const edgeKindChoices = localizeChoices(EDGE_KIND_SPECS, translate);
  const directionChoices = localizeChoices(DIRECTION_SPECS, translate);
  const evidenceSourceChoices = localizeChoices(EVIDENCE_SOURCE_SPECS, translate);
  const booleanChoices = localizeChoices(BOOLEAN_SPECS, translate);
  const localizedFieldOptions = fieldOptions(translate);
  const idPrefix = useId().replaceAll(":", "");
  const tagListId = `kplex-filter-tags-${idPrefix}`;
  const relationshipListId = `kplex-filter-relationships-${idPrefix}`;
  const propertyListId = `kplex-filter-properties-${idPrefix}`;
  const pathListId = `kplex-filter-paths-${idPrefix}`;
  const folderListId = `kplex-filter-folders-${idPrefix}`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<LensDraft | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);

  const suggestions = useMemo(() => {
    // The editor is normally closed. Avoid touching the whole index until the user asks for it;
    // GraphIndex keeps the global catalogs cached by semantic publication revision.
    if (!open) return {
      tags: [] as string[], noteTypes: [] as string[], folders: [] as string[], properties: [] as string[],
      relationshipDefinitions: [] as string[], evidenceFields: [] as string[], relatedPaths: [] as string[],
    };
    const catalog = index.suggestionCatalog();
    const definitions = new Set<string>();
    const evidenceFields = new Set<string>(catalog.properties);
    const relatedPaths = new Set<string>();
    if (center) {
      relatedPaths.add(center.path);
      const roles: Role[] = ["parent", "child", "left", "right", "previous", "next"];
      for (const role of roles) {
        for (const relation of index.neighbours(center, role)) {
          relatedPaths.add(relation.page.path);
          if (relation.typeDefinition) definitions.add(relation.typeDefinition);
        }
      }
      for (const relation of index.evidenceFrom(center.path)) {
        relatedPaths.add(relation.targetPath);
        for (const evidence of relation.evidence) {
          if (evidence.definition) definitions.add(evidence.definition);
          if (evidence.fieldName) evidenceFields.add(evidence.fieldName);
        }
      }
    }
    return {
      ...catalog,
      relationshipDefinitions: uniqueSorted(definitions),
      evidenceFields: uniqueSorted(evidenceFields),
      relatedPaths: uniqueSorted(relatedPaths),
    };
  }, [open, index, center?.path, revision]);

  const activeLensCount = lenses.filter((lens) => lens.enabled).length;
  const active = isPlexFilterActive(value) || !value.showCrossLinks || showSiblings || activeLensCount > 0;
  const ownerDocument = triggerRef.current?.ownerDocument ?? null;

  useEffect(/** Release the open-panel tooltip class on close and owner-document migration. */ () => {
    if (!open || !ownerDocument) return;
    return registerOpenFilterPanel(ownerDocument);
  }, [open, ownerDocument]);

  const editLens = (lens: GraphLensDefinition) => {
    let simple = tryParseGraphLensSimpleExpression(lens.expression);
    // Early checkpoint-2 builds exposed raw selector syntax. A quoted relationship name was a
    // tempting but ineffective input, and `edge.role == "working-on"` confused Plex position
    // with the relationship-property definition. Recover those two common drafts into the
    // visual builder instead of forcing the user to delete/recreate the lens.
    if (lens.scope === "edge") {
      const quoted = lens.expression.trim().match(/^(["'])(.*)\1$/s);
      if (!simple && quoted) {
        simple = defaultGraphLensSimpleModel("edge");
        simple.conditions[0].value = quoted[2];
      }
      const first = simple?.conditions[0];
      if (first?.field === "edge.role" && !roleChoices.some((choice) => choice.value === first.value.trim().toLocaleLowerCase())) {
        first.field = "edge.definition";
        first.operator = "is";
      }
    }
    setDraft({
      id: lens.id,
      name: lens.name,
      scope: lens.scope,
      mode: lens.mode,
      expression: simple ? buildGraphLensSimpleExpression(simple) : lens.expression,
      editorMode: simple ? "simple" : "code",
      simple,
      style: lens.style,
    });
    setDraftError(null);
  };

  const updateSimple = (simple: GraphLensSimpleModel) => {
    setDraft((current) => current ? { ...current, simple, expression: buildGraphLensSimpleExpression(simple) } : current);
    setDraftError(null);
  };

  const updateCondition = (id: string, patch: Partial<GraphLensSimpleCondition>) => {
    if (!draft?.simple) return;
    const conditions = draft.simple.conditions.map((condition) => {
      if (condition.id !== id) return condition;
      const next = { ...condition, ...patch };
      if (patch.field) {
        next.operator = defaultOperator(patch.field);
        next.value = "";
        if (patch.field !== "note.property") next.propertyName = undefined;
      }
      return next;
    });
    updateSimple({ ...draft.simple, conditions });
  };

  const setScope = (scope: GraphLensScope) => {
    setDraft((current) => {
      if (!current) return current;
      const style = current.mode === "style" ? defaultGraphLensStyle(scope) : current.style;
      if (current.editorMode === "code") return { ...current, scope, style };
      const simple = defaultGraphLensSimpleModel(scope);
      return { ...current, scope, simple, expression: buildGraphLensSimpleExpression(simple), style };
    });
    setDraftError(null);
  };

  const setMode = (mode: GraphLensMode) => {
    setDraft((current) => {
      if (!current) return current;
      return { ...current, mode, style: mode === "style" ? (current.style ?? defaultGraphLensStyle(current.scope)) : current.style };
    });
    setDraftError(null);
  };

  const updateStyle = (patch: GraphLensStyle) => {
    setDraft((current) => current ? { ...current, style: { ...(current.style ?? {}), ...patch } } : current);
  };

  const switchEditorMode = (mode: LensEditorMode) => {
    if (!draft || draft.editorMode === mode) return;
    if (mode === "code") {
      setDraft({ ...draft, editorMode: "code", expression: draft.simple ? buildGraphLensSimpleExpression(draft.simple) : draft.expression });
      setDraftError(null);
      return;
    }
    const simple = tryParseGraphLensSimpleExpression(draft.expression);
    if (!simple) {
      setDraftError(translate("filter.advancedCannotSimple"));
      return;
    }
    setDraft({ ...draft, editorMode: "simple", simple });
    setDraftError(null);
  };

  const saveDraft = () => {
    if (!draft) return;
    let expression = draft.expression.trim();
    if (draft.editorMode === "simple") {
      if (!draft.simple) { setDraftError(translate("filter.addFilterCondition")); return; }
      const simpleError = simpleValidation(draft.simple, translate);
      if (simpleError) { setDraftError(simpleError); return; }
      expression = buildGraphLensSimpleExpression(draft.simple);
    }
    const error = validateGraphLensExpression(expression);
    if (error) { setDraftError(graphLensValidationMessage(error, translate)); return; }
    const existing = lenses.find((lens) => lens.id === draft.id);
    const next: GraphLensDefinition = {
      id: draft.id,
      name: draft.name.trim() || deriveLensName(draft, translate),
      scope: draft.scope,
      mode: draft.mode,
      expression,
      enabled: existing?.enabled ?? true,
      style: draft.mode === "style" ? (draft.style ?? defaultGraphLensStyle(draft.scope)) : draft.style,
    };
    onLensesChange(existing ? lenses.map((lens) => lens.id === next.id ? next : lens) : [...lenses, next]);
    setDraft(null);
    setDraftError(null);
  };

  const valueChoices = (condition: GraphLensSimpleCondition): Choice[] | null => {
    if (condition.field === "edge.role") return roleChoices;
    if (condition.field === "edge.kind") return edgeKindChoices;
    if (condition.field === "edge.direction") return directionChoices;
    if (condition.field === "evidence.sourceKind") return evidenceSourceChoices;
    if (condition.field === "evidence.active") return booleanChoices;
    if (condition.field === "evidence.declaredRole") return evidenceRoleChoices;
    if (condition.field === "node.noteType") return suggestions.noteTypes.map((item) => ({ value: item, label: item }));
    if (["edge.sourcePath", "edge.targetPath", "evidence.declaredByPath", "evidence.declaredTargetPath"].includes(condition.field)) {
      return [{ value: "$this", label: translate("filter.currentCenterNote") }, ...suggestions.relatedPaths.map((item) => ({ value: item, label: item }))];
    }
    return null;
  };

  const datalistForField = (field: GraphLensSimpleField): string | undefined => {
    if (field === "file.tags") return tagListId;
    if (field === "file.folder") return folderListId;
    if (field === "edge.definition" || field === "evidence.definition") return relationshipListId;
    if (field === "evidence.fieldName") return propertyListId;
    if (["edge.sourcePath", "edge.targetPath", "evidence.declaredByPath", "evidence.declaredTargetPath"].includes(field)) return pathListId;
    return undefined;
  };

  const renderConditionValue = (condition: GraphLensSimpleCondition) => {
    if (!graphLensSimpleConditionNeedsValue(condition)) return null;
    const choices = valueChoices(condition);
    if (choices?.length) return <select className="kplex-lens-condition-value" value={condition.value} onChange={(event) => updateCondition(condition.id, { value: event.currentTarget.value })}>
      <option value="">{translate("filter.choose")}</option>
      {choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
    </select>;
    return <input
      className="kplex-lens-condition-value"
      value={condition.value}
      list={datalistForField(condition.field)}
      placeholder={condition.field === "edge.definition" ? translate("filter.exampleWorkingOn") : translate("filter.valuePlaceholder")}
      onChange={(event) => updateCondition(condition.id, { value: event.currentTarget.value })}
    />;
  };

  /** Render caller-owned filter content with a dedicated drag header that excludes its close control. */
  const panel = (panelStyle: CSSProperties) => <div
    ref={panelRef}
    className="kplex-filter-panel kplex-filter-portal"
    data-kplex-tooltip-scope
    style={panelStyle}
    onPointerDown={(event) => event.stopPropagation()}
  >
    <div ref={dragHandleRef} className="kplex-filter-panel-header">
      <span>{translate("filter.panelTitle")}</span>
      <button type="button" className="kplex-icon-button" aria-label={translate("filter.closePanel")}
        onClick={/** Closing the panel restores its toolbar trigger without changing any filters. */ () => {
          setOpen(false); triggerRef.current?.focus({ preventScroll: true });
        }}><ObsidianIcon name="x" size={16} /></button>
    </div>
    <datalist id={tagListId}>{suggestions.tags.map((tag) => <option key={tag} value={tag} />)}</datalist>
    <datalist id={relationshipListId}>{suggestions.relationshipDefinitions.map((definition) => <option key={definition} value={definition} />)}</datalist>
    <datalist id={propertyListId}>{suggestions.properties.map((property) => <option key={property} value={property} />)}</datalist>
    <datalist id={pathListId}>{suggestions.relatedPaths.map((path) => <option key={path} value={path} />)}</datalist>
    <datalist id={folderListId}>{suggestions.folders.map((folder) => <option key={folder} value={folder} />)}</datalist>

    <section className="kplex-filter-section">
      <div className="kplex-filter-section-heading">{translate("filter.visibility")}</div>
      <div className="kplex-filter-visibility-grid">
        {[
          ["showPageNodes", translate("filter.visibilityMarkdown"), translate("filter.visibilityMarkdownHelp")],
          ["showAttachments", translate("filter.visibilityAttachments"), translate("filter.visibilityAttachmentsHelp")],
          ["showFolderNodes", translate("filter.visibilityFolders"), translate("filter.visibilityFoldersHelp")],
          ["showTagNodes", translate("filter.visibilityTags"), translate("filter.visibilityTagsHelp")],
          ["showURLNodes", translate("filter.visibilityWebLinks"), translate("filter.visibilityWebLinksHelp")],
          ["showVirtualNodes", translate("filter.visibilityPlaceholders"), translate("filter.visibilityPlaceholdersHelp")],
          ["showInferredNodes", translate("filter.visibilityInferred"), translate("filter.visibilityInferredHelp")],
        ].map(([key, label, tooltip]) => <label key={key} className="kplex-filter-layout-toggle" aria-label={tooltip} data-tooltip-position="top" data-kplex-long-press-tooltip>
          <span>{label}</span>
          <input
            type="checkbox"
            checked={visibility[key as PlexVisibilitySetting]}
            aria-label={translate("filter.showLabel", { label: label.toLocaleLowerCase() })}
            onChange={() => onVisibilityChange(key as PlexVisibilitySetting)}
          />
          <span className="kplex-filter-switch" aria-hidden="true" />
        </label>)}
        <label className="kplex-filter-layout-toggle" aria-label={translate("filter.siblingsHelp")} data-tooltip-position="top" data-kplex-long-press-tooltip>
          <span>{translate("filter.siblings")}</span>
          <input type="checkbox" checked={showSiblings} aria-label={translate("filter.showSiblings")} onChange={(event) => onShowSiblingsChange(event.currentTarget.checked)} />
          <span className="kplex-filter-switch" aria-hidden="true" />
        </label>
        <label className="kplex-filter-layout-toggle" aria-label={translate("filter.crossLinksHelp")} data-tooltip-position="top" data-kplex-long-press-tooltip>
          <span>{translate("filter.crossLinks")}</span>
          <input type="checkbox" checked={value.showCrossLinks} aria-label={translate("filter.showCrossLinks")} onChange={(event) => onChange({ ...value, showCrossLinks: event.currentTarget.checked })} />
          <span className="kplex-filter-switch" aria-hidden="true" />
        </label>
      </div>
    </section>

    <section className="kplex-filter-section">
      <div className="kplex-filter-section-heading">{translate("filter.nodeOrder")}</div>
      <label>{translate("filter.sortWithinZone")}<select value={sortOrder} onChange={(event) => onSortOrderChange(event.currentTarget.value as NodeSortOrder)}>
        <option value="name-asc">{translate("filter.sortNameAsc")}</option>
        <option value="name-desc">{translate("filter.sortNameDesc")}</option>
        <option value="modified-desc">{translate("filter.sortModifiedDesc")}</option>
        <option value="modified-asc">{translate("filter.sortModifiedAsc")}</option>
        <option value="created-desc">{translate("filter.sortCreatedDesc")}</option>
        <option value="created-asc">{translate("filter.sortCreatedAsc")}</option>
        <option value="connections-desc">{translate("filter.sortConnectionsDesc")}</option>
        <option value="connections-asc">{translate("filter.sortConnectionsAsc")}</option>
      </select></label>
    </section>

    <section className="kplex-filter-section">
      <div className="kplex-filter-section-heading kplex-filter-heading-row">
        <span>{translate("filter.quickLens")}</span>
        <label className="kplex-filter-layout-toggle" aria-label={translate("filter.reflowHelp")} data-tooltip-position="top" data-kplex-long-press-tooltip>
          <span>{translate("filter.reflow")}</span>
          <input type="checkbox" checked={layoutMode === "reflow"} aria-label={translate("filter.reflowAria")} onChange={(event) => onLayoutModeChange(event.currentTarget.checked ? "reflow" : "keep")} />
          <span className="kplex-filter-switch" aria-hidden="true" />
        </label>
      </div>
      <div className="kplex-quick-lens-row">
        <label>{translate("filter.scope")}<select
          value={value.field}
          onChange={(event) => {
            const field = event.currentTarget.value as PlexFilterState["field"];
            onChange({ ...value, field, operator: defaultOperator(field), value: "" });
          }}
        >
          <option value="node.label">{translate("filter.noteName")}</option>
          <option value="file.tags">{translate("filter.fieldTag")}</option>
          <option value="node.noteType">{translate("filter.fieldNoteType")}</option>
        </select></label>
        <label>{translate("filter.match")}<select value={value.operator} onChange={(event) => onChange({ ...value, operator: event.currentTarget.value as GraphLensSimpleOperator })}>
          {quickOperatorChoices(value.field, translate).map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
        </select></label>
        {value.field === "node.noteType"
          ? <label>{translate("filter.value")}<select value={value.value} onChange={(event) => onChange({ ...value, value: event.currentTarget.value })}>
              <option value="">{translate("filter.choose")}</option>{suggestions.noteTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select></label>
          : <label>{translate("filter.value")}<input
              value={value.value}
              list={value.field === "file.tags" ? tagListId : undefined}
              placeholder={value.field === "file.tags" ? translate("filter.tagPlaceholder") : translate("filter.textPlaceholder")}
              onChange={(event) => onChange({ ...value, value: event.currentTarget.value })}
            /></label>}
      </div>
      {isPlexFilterActive(value) && <button className="kplex-filter-clear" onClick={() => onChange({ ...EMPTY_PLEX_FILTER, showCrossLinks: value.showCrossLinks })}>{translate("filter.clearQuick")}</button>}
    </section>

    <section className="kplex-filter-section kplex-lens-section">
      <div className="kplex-filter-section-heading kplex-lens-heading">
        <span>{translate("filter.graphLenses")}</span>
        <div className="kplex-lens-heading-actions">
          {activeLensCount > 0 && <button className="kplex-lens-disable-all" onClick={() => onLensesChange(lenses.map((lens) => ({ ...lens, enabled: false })))}>{translate("filter.turnAllOff")}</button>}
          <button className="kplex-icon-button" aria-label={translate("filter.newLens")} onClick={() => { setDraft(EMPTY_DRAFT()); setDraftError(null); }}>
            <ObsidianIcon name="plus" size={15} />
          </button>
        </div>
      </div>
      {!lenses.length && <div className="kplex-lens-empty">{translate("filter.emptyLenses")}</div>}
      <div className="kplex-lens-list">
        {lenses.map((lens) => {
          const expressionError = validateGraphLensExpression(lens.expression);
          const expressionErrorMessage = expressionError ? graphLensValidationMessage(expressionError, translate) : null;
          const displayName = lensDisplayName(lens.name, translate);
          return <div key={lens.id} className={`kplex-lens-row${lens.enabled ? " is-enabled" : ""}${expressionError ? " has-error" : ""}`}>
            <button
              className={`kplex-lens-enable-button${lens.enabled ? " is-on" : ""}`}
              aria-label={translate(lens.enabled ? "filter.turnOffLens" : "filter.turnOnLens", { name: displayName })}
              aria-pressed={lens.enabled}
              onClick={() => onLensesChange(lenses.map((item) => item.id === lens.id ? { ...item, enabled: !item.enabled } : item))}
            ><ObsidianIcon name={lens.enabled ? "eye" : "eye-off"} size={14} /></button>
            <button className="kplex-lens-main" onClick={() => editLens(lens)} title={expressionErrorMessage ?? lens.expression}>
              <span className="kplex-lens-name">{displayName}</span>
              <span className="kplex-lens-meta">{translate(lens.enabled ? "filter.on" : "filter.off")} · {modeLabel(lens.mode, translate)} · {scopeLabel(lens.scope, translate)}</span>
            </button>
            {expressionErrorMessage && <span className="kplex-lens-error-dot" title={expressionErrorMessage}>!</span>}
            <button className="kplex-icon-button" aria-label={translate("filter.editLens", { name: displayName })} onClick={() => editLens(lens)}><ObsidianIcon name="pencil" size={13} /></button>
            <button className="kplex-icon-button" aria-label={translate("filter.deleteLens", { name: displayName })} onClick={() => onLensesChange(lenses.filter((item) => item.id !== lens.id))}><ObsidianIcon name="trash-2" size={13} /></button>
          </div>;
        })}
      </div>

      {draft && <div className="kplex-lens-editor">
        <label>{translate("filter.name")} <span className="kplex-lens-optional">{translate("filter.optional")}</span><input value={draft.name} placeholder={translate("filter.namePlaceholder")} onChange={(event) => setDraft({ ...draft, name: event.currentTarget.value })} /></label>
        <div className="kplex-lens-editor-row">
          <label>{translate("filter.scope")}<select value={draft.scope} onChange={(event) => setScope(event.currentTarget.value as GraphLensScope)}>
            <option value="node">{translate("filter.scopeNote")}</option><option value="edge">{translate("filter.scopeRelationship")}</option><option value="evidence">{translate("filter.scopeEvidence")}</option>
          </select></label>
          <label>{translate("filter.effect")}<select value={draft.mode} onChange={(event) => setMode(event.currentTarget.value as GraphLensMode)}>
            <option value="include">{translate("filter.showMatching")}</option><option value="exclude">{translate("filter.hideMatching")}</option><option value="style">{translate("filter.styleMatching")}</option>
          </select></label>
        </div>

        <div className="kplex-lens-editor-mode" role="group" aria-label={translate("filter.editorMode")}>
          <button className={draft.editorMode === "simple" ? "is-on" : ""} onClick={() => switchEditorMode("simple")}><ObsidianIcon name="list-filter" size={13} /> {translate("filter.simple")}</button>
          <button className={draft.editorMode === "code" ? "is-on" : ""} onClick={() => switchEditorMode("code")}><ObsidianIcon name="code-2" size={13} /> {translate("filter.code")}</button>
        </div>

        {draft.editorMode === "simple" && draft.simple ? <div className="kplex-lens-simple-builder">
          <div className="kplex-lens-group-heading">
            <span>{translate("filter.matchHeading")}</span>
            <select value={draft.simple.combinator} onChange={(event) => updateSimple({ ...draft.simple!, combinator: event.currentTarget.value as "all" | "any" })}>
              <option value="all">{translate("filter.allFollowing")}</option>
              <option value="any">{translate("filter.anyFollowing")}</option>
            </select>
          </div>
          <div className="kplex-lens-conditions">
            {draft.simple.conditions.map((condition) => <div key={condition.id} className="kplex-lens-condition">
              <span className="kplex-lens-where">{translate("filter.where")}</span>
              <select
                className="kplex-lens-condition-field"
                value={condition.field}
                title={localizedFieldOptions[draft.scope].find((option) => option.value === condition.field)?.title}
                onChange={(event) => updateCondition(condition.id, { field: event.currentTarget.value as GraphLensSimpleField })}
              >
                {localizedFieldOptions[draft.scope].map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              {condition.field === "note.property" && <input
                className="kplex-lens-condition-property"
                list={propertyListId}
                value={condition.propertyName ?? ""}
                placeholder={translate("filter.propertyName")}
                onChange={(event) => updateCondition(condition.id, { propertyName: event.currentTarget.value })}
              />}
              <select className="kplex-lens-condition-operator" value={condition.operator} onChange={(event) => updateCondition(condition.id, { operator: event.currentTarget.value as GraphLensSimpleOperator })}>
                {operatorChoices(condition, translate).map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
              </select>
              {renderConditionValue(condition)}
              <button
                className="kplex-icon-button kplex-lens-condition-remove"
                aria-label={translate("filter.removeCondition")}
                disabled={draft.simple!.conditions.length <= 1}
                onClick={() => updateSimple({ ...draft.simple!, conditions: draft.simple!.conditions.filter((item) => item.id !== condition.id) })}
              ><ObsidianIcon name="trash-2" size={13} /></button>
            </div>)}
          </div>
          <button className="kplex-lens-add-condition" onClick={() => updateSimple({ ...draft.simple!, conditions: [...draft.simple!.conditions, { ...defaultGraphLensSimpleModel(draft.scope).conditions[0], id: createGraphLensConditionId() }] })}>
            <ObsidianIcon name="plus" size={13} /> {translate("filter.addFilter")}
          </button>
          {draft.scope === "edge" && <div className="kplex-lens-help">{translate("filter.edgeSimpleHelp")}</div>}
        </div> : <>
          <label>{translate("filter.expression")}<textarea rows={4} value={draft.expression} placeholder={translate("filter.expressionPlaceholder")} onChange={(event) => { setDraft({ ...draft, expression: event.currentTarget.value, simple: null }); setDraftError(null); }} /></label>
          <div className="kplex-lens-help">{translate("filter.advancedHelp")}</div>
        </>}
        {draft.mode === "style" && <div className="kplex-lens-style-editor">
          <div className="kplex-lens-style-heading">{translate("filter.appearance")}</div>
          {draft.scope === "node" ? <div className="kplex-lens-style-grid">
            <label>{translate("filter.fill")} <input type="color" value={draft.style?.node?.backgroundColor ?? "#1f4f78"} onChange={(event) => updateStyle({ node: { ...(draft.style?.node ?? {}), backgroundColor: event.currentTarget.value } })} /></label>
            <label>{translate("filter.border")} <input type="color" value={draft.style?.node?.borderColor ?? "#ffb300"} onChange={(event) => updateStyle({ node: { ...(draft.style?.node ?? {}), borderColor: event.currentTarget.value } })} /></label>
            <label>{translate("filter.text")} <input type="color" value={draft.style?.node?.textColor ?? "#ffffff"} onChange={(event) => updateStyle({ node: { ...(draft.style?.node ?? {}), textColor: event.currentTarget.value } })} /></label>
            <label>{translate("filter.borderStyle")} <select value={draft.style?.node?.strokeStyle ?? "solid"} onChange={(event) => updateStyle({ node: { ...(draft.style?.node ?? {}), strokeStyle: event.currentTarget.value as "solid" | "dashed" | "dotted" } })}><option value="solid">{translate("filter.solid")}</option><option value="dashed">{translate("filter.dashed")}</option><option value="dotted">{translate("filter.dotted")}</option></select></label>
            <label>{translate("filter.borderWidth")} <input type="number" min="0.5" max="8" step="0.5" value={draft.style?.node?.strokeWidth ?? 2} onChange={(event) => updateStyle({ node: { ...(draft.style?.node ?? {}), strokeWidth: Number(event.currentTarget.value) || 1 } })} /></label>
            <label>{translate("filter.fillStyle")} <select value={draft.style?.node?.fillStyle ?? "solid"} onChange={(event) => updateStyle({ node: { ...(draft.style?.node ?? {}), fillStyle: event.currentTarget.value as "solid" | "hachure" | "cross-hatch" } })}><option value="solid">{translate("filter.solid")}</option><option value="hachure">{translate("filter.hachure")}</option><option value="cross-hatch">{translate("filter.crossHatch")}</option></select></label>
          </div> : <div className="kplex-lens-style-grid">
            <label>{translate("filter.line")} <input type="color" value={draft.style?.edge?.strokeColor ?? "#ffb300"} onChange={(event) => updateStyle({ edge: { ...(draft.style?.edge ?? {}), strokeColor: event.currentTarget.value } })} /></label>
            <label>{translate("filter.label")} <input type="color" value={draft.style?.edge?.textColor ?? "#ffffff"} onChange={(event) => updateStyle({ edge: { ...(draft.style?.edge ?? {}), textColor: event.currentTarget.value } })} /></label>
            <label>{translate("filter.lineStyle")} <select value={draft.style?.edge?.strokeStyle ?? "solid"} onChange={(event) => updateStyle({ edge: { ...(draft.style?.edge ?? {}), strokeStyle: event.currentTarget.value as "solid" | "dashed" | "dotted" } })}><option value="solid">{translate("filter.solid")}</option><option value="dashed">{translate("filter.dashed")}</option><option value="dotted">{translate("filter.dotted")}</option></select></label>
            <label>{translate("filter.lineWidth")} <input type="number" min="0.5" max="8" step="0.5" value={draft.style?.edge?.strokeWidth ?? 2} onChange={(event) => updateStyle({ edge: { ...(draft.style?.edge ?? {}), strokeWidth: Number(event.currentTarget.value) || 1 } })} /></label>
            <label className="kplex-lens-style-check"><input type="checkbox" checked={draft.style?.edge?.showLabel === true} onChange={(event) => updateStyle({ edge: { ...(draft.style?.edge ?? {}), showLabel: event.currentTarget.checked } })} /> {translate("filter.showRelationshipLabel")}</label>
          </div>}
          <div className="kplex-lens-help">{translate("filter.styleHelp")}</div>
        </div>}
        {draftError && <div className="kplex-lens-editor-error">{draftError}</div>}
        <div className="kplex-lens-editor-actions"><button onClick={() => { setDraft(null); setDraftError(null); }}>{translate("common.cancel")}</button><button className="mod-cta" onClick={saveDraft}>{translate("filter.saveLens")}</button></div>
      </div>}
    </section>

  </div>;

  return <div className={`kplex-filter${active ? " is-active" : ""}${open ? " is-open" : ""}`}>
    <button
      ref={triggerRef}
      className="kplex-icon-button kplex-filter-trigger"
      aria-label={translate("filter.trigger")}
      aria-expanded={open}
      onClick={() => setOpen((current) => !current)}
    >
      <ObsidianIcon name="list-filter" size={16} />
      {activeLensCount > 0 && <span className="kplex-lens-count" aria-label={translate("filter.activeLensCount", { count: String(activeLensCount) })}>{activeLensCount}</span>}
    </button>
    <FloatingLayer
      open={open}
      anchorRef={triggerRef}
      panelRef={panelRef}
      dragHandleRef={dragHandleRef}
      insideRoots={() => [triggerRef.current, panelRef.current]}
      onDismiss={() => setOpen(false)}
      portalTarget={ownerDocumentBody}
      positioning={FILTER_PANEL_POSITIONING}
    >
      {panel}
    </FloatingLayer>
  </div>;
}
