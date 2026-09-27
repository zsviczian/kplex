import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import type { GraphIndex } from "../index/GraphIndex";
import type { GraphPage, Role } from "../types";
import type { NodeSortOrder } from "../settings";
import { createGraphLensId, defaultGraphLensStyle, validateGraphLensExpression, type GraphLensDefinition, type GraphLensMode, type GraphLensScope, type GraphLensStyle } from "../lens/GraphLens";
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

const ROLE_CHOICES: Choice[] = [
  { value: "parent", label: "Parent" },
  { value: "child", label: "Child" },
  { value: "left", label: "Friend (left)" },
  { value: "right", label: "Challenger (right)" },
  { value: "previous", label: "Previous" },
  { value: "next", label: "Next" },
  { value: "sibling", label: "Sibling" },
];
const EVIDENCE_ROLE_CHOICES: Choice[] = [...ROLE_CHOICES.filter((choice) => choice.value !== "sibling"), { value: "hidden", label: "Hidden" }];
const EDGE_KIND_CHOICES: Choice[] = [{ value: "defined", label: "Defined" }, { value: "inferred", label: "Inferred" }];
const DIRECTION_CHOICES: Choice[] = [{ value: "from", label: "From source" }, { value: "to", label: "To source" }, { value: "both", label: "Both" }];
const EVIDENCE_SOURCE_CHOICES: Choice[] = [
  { value: "frontmatter-ontology", label: "Frontmatter property" },
  { value: "inline-ontology", label: "Inline property" },
  { value: "obsidian-link", label: "Markdown link" },
  { value: "unresolved-link", label: "Unresolved Markdown link" },
  { value: "date-property", label: "Date property" },
  { value: "body-url", label: "Body URL" },
  { value: "file-tree", label: "Folder hierarchy" },
  { value: "tag-tree", label: "Tag hierarchy" },
  { value: "url-origin", label: "URL origin" },
];
const BOOLEAN_CHOICES: Choice[] = [{ value: "true", label: "Active" }, { value: "false", label: "Suppressed" }];

const openFilterPanels = new WeakMap<Document, number>();

const FILTER_PANEL_POSITIONING: FloatingLayerPositioning = {
  preferredWidth: 560,
  minimumWidth: 300,
  viewportMargin: 8,
  anchorGap: 6,
  minimumMaxHeight: 180,
};

function ownerDocumentBody(doc: Document): HTMLElement {
  return doc.body;
}

function registerOpenFilterPanel(doc: Document): () => void {
  const count = (openFilterPanels.get(doc) ?? 0) + 1;
  openFilterPanels.set(doc, count);
  doc.body.classList.add("kplex-filter-panel-open");
  return () => {
    const next = Math.max(0, (openFilterPanels.get(doc) ?? 1) - 1);
    if (next > 0) {
      openFilterPanels.set(doc, next);
      return;
    }
    openFilterPanels.delete(doc);
    doc.body.classList.remove("kplex-filter-panel-open");
  };
}

const FIELD_OPTIONS: Record<GraphLensScope, Array<{ value: GraphLensSimpleField; label: string; title?: string }>> = {
  node: [
    { value: "node.label", label: "Title" },
    { value: "file.path", label: "Path" },
    { value: "file.folder", label: "Folder" },
    { value: "file.tags", label: "Tag" },
    { value: "node.noteType", label: "Note type" },
    { value: "file.extension", label: "File type" },
    { value: "note.property", label: "Property…", title: "Any Markdown frontmatter property" },
  ],
  edge: [
    { value: "edge.definition", label: "Relationship property", title: "The property/definition that produced the displayed relationship, e.g. working-on" },
    { value: "edge.role", label: "Plex position" },
    { value: "edge.kind", label: "Defined / inferred" },
    { value: "edge.direction", label: "Direction" },
    { value: "edge.sourcePath", label: "Source path" },
    { value: "edge.targetPath", label: "Target path" },
  ],
  evidence: [
    { value: "evidence.fieldName", label: "Property / field" },
    { value: "evidence.definition", label: "Relationship definition" },
    { value: "evidence.sourceKind", label: "Evidence source" },
    { value: "evidence.active", label: "Resolution status" },
    { value: "evidence.declaredRole", label: "Declared Plex position" },
    { value: "evidence.declaredByPath", label: "Declared by" },
    { value: "evidence.declaredTargetPath", label: "Declared target" },
    { value: "evidence.suppressionReason", label: "Suppression reason" },
  ],
};

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

function operatorChoices(condition: GraphLensSimpleCondition): Choice[] {
  if (condition.field === "file.tags") return [
    { value: "has", label: "has tag" },
    { value: "does-not-have", label: "does not have tag" },
  ];
  if (condition.field === "file.folder") return [
    { value: "in-folder", label: "is in folder" },
    { value: "not-in-folder", label: "is not in folder" },
  ];
  if (["edge.role", "edge.kind", "edge.direction", "evidence.sourceKind", "evidence.active", "evidence.declaredRole"].includes(condition.field)) {
    return [{ value: "is", label: "is" }, { value: "is-not", label: "is not" }];
  }
  return [
    { value: "is", label: "is" },
    { value: "is-not", label: "is not" },
    { value: "contains", label: "contains" },
    { value: "does-not-have", label: "does not contain" },
    { value: "starts-with", label: "starts with" },
    { value: "ends-with", label: "ends with" },
    { value: "exists", label: "exists" },
    { value: "not-exists", label: "does not exist" },
  ];
}

function defaultOperator(field: GraphLensSimpleField): GraphLensSimpleOperator {
  if (field === "file.tags") return "has";
  if (field === "file.folder") return "in-folder";
  if (field === "node.label") return "contains";
  return "is";
}

function quickOperatorChoices(field: PlexFilterState["field"]): Choice[] {
  if (field === "file.tags") return [
    { value: "has", label: "has tag" },
    { value: "does-not-have", label: "does not have tag" },
  ];
  if (field === "node.noteType") return [
    { value: "is", label: "is" },
    { value: "is-not", label: "is not" },
  ];
  return [
    { value: "contains", label: "contains" },
    { value: "does-not-have", label: "does not contain" },
    { value: "is", label: "is" },
    { value: "is-not", label: "is not" },
    { value: "starts-with", label: "starts with" },
    { value: "ends-with", label: "ends with" },
  ];
}

function scopeLabel(scope: GraphLensScope): string {
  if (scope === "edge") return "Relationship";
  if (scope === "evidence") return "Evidence";
  return "Note";
}

function modeLabel(mode: GraphLensMode): string { return mode === "include" ? "Include" : mode === "exclude" ? "Exclude" : "Style"; }

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set([...values].map((value) => value.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

function deriveLensName(draft: LensDraft): string {
  const first = draft.simple?.conditions[0];
  if (first?.value.trim()) return first.value.trim();
  if (first?.field === "note.property" && first.propertyName?.trim()) return first.propertyName.trim();
  return `${modeLabel(draft.mode)} ${scopeLabel(draft.scope).toLocaleLowerCase()}`;
}

function simpleValidation(model: GraphLensSimpleModel): string | null {
  if (!model.conditions.length) return "Add at least one condition.";
  for (const condition of model.conditions) {
    if (condition.field === "note.property" && !condition.propertyName?.trim()) return "Choose a note property.";
    if (graphLensSimpleConditionNeedsValue(condition) && !condition.value.trim()) return "Choose or enter a value for every condition.";
  }
  return null;
}


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
}) {
  const idPrefix = useId().replaceAll(":", "");
  const tagListId = `kplex-filter-tags-${idPrefix}`;
  const relationshipListId = `kplex-filter-relationships-${idPrefix}`;
  const propertyListId = `kplex-filter-properties-${idPrefix}`;
  const pathListId = `kplex-filter-paths-${idPrefix}`;
  const folderListId = `kplex-filter-folders-${idPrefix}`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
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
      if (first?.field === "edge.role" && !ROLE_CHOICES.some((choice) => choice.value === first.value.trim().toLocaleLowerCase())) {
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
      setDraftError("This advanced expression cannot be represented by the simple builder. Keep Code view, or replace it with a new simple filter.");
      return;
    }
    setDraft({ ...draft, editorMode: "simple", simple });
    setDraftError(null);
  };

  const saveDraft = () => {
    if (!draft) return;
    let expression = draft.expression.trim();
    if (draft.editorMode === "simple") {
      if (!draft.simple) { setDraftError("Add a filter condition."); return; }
      const simpleError = simpleValidation(draft.simple);
      if (simpleError) { setDraftError(simpleError); return; }
      expression = buildGraphLensSimpleExpression(draft.simple);
    }
    const error = validateGraphLensExpression(expression);
    if (error) { setDraftError(error); return; }
    const existing = lenses.find((lens) => lens.id === draft.id);
    const next: GraphLensDefinition = {
      id: draft.id,
      name: draft.name.trim() || deriveLensName(draft),
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
    if (condition.field === "edge.role") return ROLE_CHOICES;
    if (condition.field === "edge.kind") return EDGE_KIND_CHOICES;
    if (condition.field === "edge.direction") return DIRECTION_CHOICES;
    if (condition.field === "evidence.sourceKind") return EVIDENCE_SOURCE_CHOICES;
    if (condition.field === "evidence.active") return BOOLEAN_CHOICES;
    if (condition.field === "evidence.declaredRole") return EVIDENCE_ROLE_CHOICES;
    if (condition.field === "node.noteType") return suggestions.noteTypes.map((item) => ({ value: item, label: item }));
    if (["edge.sourcePath", "edge.targetPath", "evidence.declaredByPath", "evidence.declaredTargetPath"].includes(condition.field)) {
      return [{ value: "$this", label: "Current center note" }, ...suggestions.relatedPaths.map((item) => ({ value: item, label: item }))];
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
      <option value="">Choose…</option>
      {choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
    </select>;
    return <input
      className="kplex-lens-condition-value"
      value={condition.value}
      list={datalistForField(condition.field)}
      placeholder={condition.field === "edge.definition" ? "e.g. working-on" : "Value"}
      onChange={(event) => updateCondition(condition.id, { value: event.currentTarget.value })}
    />;
  };

  const panel = (panelStyle: CSSProperties) => <div
    ref={panelRef}
    className="kplex-filter-panel kplex-filter-portal"
    data-kplex-tooltip-scope
    style={panelStyle}
    onPointerDown={(event) => event.stopPropagation()}
  >
    <datalist id={tagListId}>{suggestions.tags.map((tag) => <option key={tag} value={tag} />)}</datalist>
    <datalist id={relationshipListId}>{suggestions.relationshipDefinitions.map((definition) => <option key={definition} value={definition} />)}</datalist>
    <datalist id={propertyListId}>{suggestions.properties.map((property) => <option key={property} value={property} />)}</datalist>
    <datalist id={pathListId}>{suggestions.relatedPaths.map((path) => <option key={path} value={path} />)}</datalist>
    <datalist id={folderListId}>{suggestions.folders.map((folder) => <option key={folder} value={folder} />)}</datalist>

    <section className="kplex-filter-section">
      <div className="kplex-filter-section-heading">Visibility</div>
      <div className="kplex-filter-visibility-grid">
        {[
          ["showPageNodes", "Markdown", "Show or hide Markdown notes"],
          ["showAttachments", "Attachments", "Show or hide attachment nodes"],
          ["showFolderNodes", "Folders", "Show or hide folder nodes"],
          ["showTagNodes", "Tags", "Show or hide tag nodes"],
          ["showURLNodes", "Web links", "Show or hide web-link nodes"],
          ["showVirtualNodes", "Placeholders", "Show or hide placeholder notes"],
          ["showInferredNodes", "Inferred", "Show or hide inferred relationships and nodes"],
        ].map(([key, label, tooltip]) => <label key={key} className="kplex-filter-layout-toggle" aria-label={tooltip} data-tooltip-position="top" data-kplex-long-press-tooltip>
          <span>{label}</span>
          <input
            type="checkbox"
            checked={visibility[key as PlexVisibilitySetting]}
            aria-label={`Show ${label.toLocaleLowerCase()}`}
            onChange={() => onVisibilityChange(key as PlexVisibilitySetting)}
          />
          <span className="kplex-filter-switch" aria-hidden="true" />
        </label>)}
        <label className="kplex-filter-layout-toggle" aria-label="Show or hide sibling nodes" data-tooltip-position="top" data-kplex-long-press-tooltip>
          <span>Siblings</span>
          <input type="checkbox" checked={showSiblings} aria-label="Show siblings" onChange={(event) => onShowSiblingsChange(event.currentTarget.checked)} />
          <span className="kplex-filter-switch" aria-hidden="true" />
        </label>
        <label className="kplex-filter-layout-toggle" aria-label="Show or hide connections between peripheral nodes" data-tooltip-position="top" data-kplex-long-press-tooltip>
          <span>Cross-links</span>
          <input type="checkbox" checked={value.showCrossLinks} aria-label="Show cross-links" onChange={(event) => onChange({ ...value, showCrossLinks: event.currentTarget.checked })} />
          <span className="kplex-filter-switch" aria-hidden="true" />
        </label>
      </div>
    </section>

    <section className="kplex-filter-section">
      <div className="kplex-filter-section-heading">Node order</div>
      <label>Sort within each zone<select value={sortOrder} onChange={(event) => onSortOrderChange(event.currentTarget.value as NodeSortOrder)}>
        <option value="name-asc">Name · A → Z</option>
        <option value="name-desc">Name · Z → A</option>
        <option value="modified-desc">Modified · newest first</option>
        <option value="modified-asc">Modified · oldest first</option>
        <option value="created-desc">Created · newest first</option>
        <option value="created-asc">Created · oldest first</option>
        <option value="connections-desc">Connections · most first</option>
        <option value="connections-asc">Connections · fewest first</option>
      </select></label>
    </section>

    <section className="kplex-filter-section">
      <div className="kplex-filter-section-heading kplex-filter-heading-row">
        <span>Quick lens</span>
        <label className="kplex-filter-layout-toggle" aria-label="Repack filtered nodes instead of leaving layout gaps" data-tooltip-position="top" data-kplex-long-press-tooltip>
          <span>Reflow</span>
          <input type="checkbox" checked={layoutMode === "reflow"} aria-label="Reflow filtered nodes" onChange={(event) => onLayoutModeChange(event.currentTarget.checked ? "reflow" : "keep")} />
          <span className="kplex-filter-switch" aria-hidden="true" />
        </label>
      </div>
      <div className="kplex-quick-lens-row">
        <label>Scope<select
          value={value.field}
          onChange={(event) => {
            const field = event.currentTarget.value as PlexFilterState["field"];
            onChange({ ...value, field, operator: defaultOperator(field), value: "" });
          }}
        >
          <option value="node.label">Note name</option>
          <option value="file.tags">Tag</option>
          <option value="node.noteType">Note type</option>
        </select></label>
        <label>Match<select value={value.operator} onChange={(event) => onChange({ ...value, operator: event.currentTarget.value as GraphLensSimpleOperator })}>
          {quickOperatorChoices(value.field).map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
        </select></label>
        {value.field === "node.noteType"
          ? <label>Value<select value={value.value} onChange={(event) => onChange({ ...value, value: event.currentTarget.value })}>
              <option value="">Choose…</option>{suggestions.noteTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select></label>
          : <label>Value<input
              value={value.value}
              list={value.field === "file.tags" ? tagListId : undefined}
              placeholder={value.field === "file.tags" ? "#tag" : "Text"}
              onChange={(event) => onChange({ ...value, value: event.currentTarget.value })}
            /></label>}
      </div>
      {isPlexFilterActive(value) && <button className="kplex-filter-clear" onClick={() => onChange({ ...EMPTY_PLEX_FILTER, showCrossLinks: value.showCrossLinks })}>Clear quick lens</button>}
    </section>

    <section className="kplex-filter-section kplex-lens-section">
      <div className="kplex-filter-section-heading kplex-lens-heading">
        <span>Graph lenses</span>
        <div className="kplex-lens-heading-actions">
          {activeLensCount > 0 && <button className="kplex-lens-disable-all" onClick={() => onLensesChange(lenses.map((lens) => ({ ...lens, enabled: false })))}>Turn all off</button>}
          <button className="excalibrain-icon-button" aria-label="New graph lens" onClick={() => { setDraft(EMPTY_DRAFT()); setDraftError(null); }}>
            <ObsidianIcon name="plus" size={15} />
          </button>
        </div>
      </div>
      {!lenses.length && <div className="kplex-lens-empty">Create a named lens to show, hide, or style matching notes or relationships in the current Plex.</div>}
      <div className="kplex-lens-list">
        {lenses.map((lens) => {
          const expressionError = validateGraphLensExpression(lens.expression);
          return <div key={lens.id} className={`kplex-lens-row${lens.enabled ? " is-enabled" : ""}${expressionError ? " has-error" : ""}`}>
            <button
              className={`kplex-lens-enable-button${lens.enabled ? " is-on" : ""}`}
              aria-label={lens.enabled ? `Turn off ${lens.name}` : `Turn on ${lens.name}`}
              aria-pressed={lens.enabled}
              onClick={() => onLensesChange(lenses.map((item) => item.id === lens.id ? { ...item, enabled: !item.enabled } : item))}
            ><ObsidianIcon name={lens.enabled ? "eye" : "eye-off"} size={14} /></button>
            <button className="kplex-lens-main" onClick={() => editLens(lens)} title={expressionError ?? lens.expression}>
              <span className="kplex-lens-name">{lens.name}</span>
              <span className="kplex-lens-meta">{lens.enabled ? "On" : "Off"} · {modeLabel(lens.mode)} · {scopeLabel(lens.scope)}</span>
            </button>
            {expressionError && <span className="kplex-lens-error-dot" title={expressionError}>!</span>}
            <button className="excalibrain-icon-button" aria-label={`Edit ${lens.name}`} onClick={() => editLens(lens)}><ObsidianIcon name="pencil" size={13} /></button>
            <button className="excalibrain-icon-button" aria-label={`Delete ${lens.name}`} onClick={() => onLensesChange(lenses.filter((item) => item.id !== lens.id))}><ObsidianIcon name="trash-2" size={13} /></button>
          </div>;
        })}
      </div>

      {draft && <div className="kplex-lens-editor">
        <label>Name <span className="kplex-lens-optional">(optional)</span><input value={draft.name} placeholder="Defaults to the first filter value" onChange={(event) => setDraft({ ...draft, name: event.currentTarget.value })} /></label>
        <div className="kplex-lens-editor-row">
          <label>Scope<select value={draft.scope} onChange={(event) => setScope(event.currentTarget.value as GraphLensScope)}>
            <option value="node">Note</option><option value="edge">Relationship</option><option value="evidence">Evidence</option>
          </select></label>
          <label>Effect<select value={draft.mode} onChange={(event) => setMode(event.currentTarget.value as GraphLensMode)}>
            <option value="include">Show matching</option><option value="exclude">Hide matching</option><option value="style">Style matching</option>
          </select></label>
        </div>

        <div className="kplex-lens-editor-mode" role="group" aria-label="Lens editor mode">
          <button className={draft.editorMode === "simple" ? "is-on" : ""} onClick={() => switchEditorMode("simple")}><ObsidianIcon name="list-filter" size={13} /> Simple</button>
          <button className={draft.editorMode === "code" ? "is-on" : ""} onClick={() => switchEditorMode("code")}><ObsidianIcon name="code-2" size={13} /> Code</button>
        </div>

        {draft.editorMode === "simple" && draft.simple ? <div className="kplex-lens-simple-builder">
          <div className="kplex-lens-group-heading">
            <span>Match</span>
            <select value={draft.simple.combinator} onChange={(event) => updateSimple({ ...draft.simple!, combinator: event.currentTarget.value as "all" | "any" })}>
              <option value="all">all of the following</option>
              <option value="any">any of the following</option>
            </select>
          </div>
          <div className="kplex-lens-conditions">
            {draft.simple.conditions.map((condition) => <div key={condition.id} className="kplex-lens-condition">
              <span className="kplex-lens-where">where</span>
              <select
                className="kplex-lens-condition-field"
                value={condition.field}
                title={FIELD_OPTIONS[draft.scope].find((option) => option.value === condition.field)?.title}
                onChange={(event) => updateCondition(condition.id, { field: event.currentTarget.value as GraphLensSimpleField })}
              >
                {FIELD_OPTIONS[draft.scope].map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              {condition.field === "note.property" && <input
                className="kplex-lens-condition-property"
                list={propertyListId}
                value={condition.propertyName ?? ""}
                placeholder="Property name"
                onChange={(event) => updateCondition(condition.id, { propertyName: event.currentTarget.value })}
              />}
              <select className="kplex-lens-condition-operator" value={condition.operator} onChange={(event) => updateCondition(condition.id, { operator: event.currentTarget.value as GraphLensSimpleOperator })}>
                {operatorChoices(condition).map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
              </select>
              {renderConditionValue(condition)}
              <button
                className="excalibrain-icon-button kplex-lens-condition-remove"
                aria-label="Remove condition"
                disabled={draft.simple!.conditions.length <= 1}
                onClick={() => updateSimple({ ...draft.simple!, conditions: draft.simple!.conditions.filter((item) => item.id !== condition.id) })}
              ><ObsidianIcon name="trash-2" size={13} /></button>
            </div>)}
          </div>
          <button className="kplex-lens-add-condition" onClick={() => updateSimple({ ...draft.simple!, conditions: [...draft.simple!.conditions, { ...defaultGraphLensSimpleModel(draft.scope).conditions[0], id: createGraphLensConditionId() }] })}>
            <ObsidianIcon name="plus" size={13} /> Add filter
          </button>
          {draft.scope === "edge" && <div className="kplex-lens-help">To show connections such as <strong>working-on</strong>, choose <strong>Relationship property → is → working-on</strong>. No expression syntax is required.</div>}
        </div> : <>
          <label>Expression<textarea rows={4} value={draft.expression} placeholder={'edge.definition == "working-on"'} onChange={(event) => { setDraft({ ...draft, expression: event.currentTarget.value, simple: null }); setDraftError(null); }} /></label>
          <div className="kplex-lens-help">Advanced Bases-inspired expression mode. Example: <code>edge.definition.equals("working-on")</code>. Use <code>and</code>, <code>or</code>, <code>not</code> and parentheses. No JavaScript is executed.</div>
        </>}
        {draft.mode === "style" && <div className="kplex-lens-style-editor">
          <div className="kplex-lens-style-heading">Appearance</div>
          {draft.scope === "node" ? <div className="kplex-lens-style-grid">
            <label>Fill <input type="color" value={draft.style?.node?.backgroundColor ?? "#1f4f78"} onChange={(event) => updateStyle({ node: { ...(draft.style?.node ?? {}), backgroundColor: event.currentTarget.value } })} /></label>
            <label>Border <input type="color" value={draft.style?.node?.borderColor ?? "#ffb300"} onChange={(event) => updateStyle({ node: { ...(draft.style?.node ?? {}), borderColor: event.currentTarget.value } })} /></label>
            <label>Text <input type="color" value={draft.style?.node?.textColor ?? "#ffffff"} onChange={(event) => updateStyle({ node: { ...(draft.style?.node ?? {}), textColor: event.currentTarget.value } })} /></label>
            <label>Border style <select value={draft.style?.node?.strokeStyle ?? "solid"} onChange={(event) => updateStyle({ node: { ...(draft.style?.node ?? {}), strokeStyle: event.currentTarget.value as "solid" | "dashed" | "dotted" } })}><option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option></select></label>
            <label>Border width <input type="number" min="0.5" max="8" step="0.5" value={draft.style?.node?.strokeWidth ?? 2} onChange={(event) => updateStyle({ node: { ...(draft.style?.node ?? {}), strokeWidth: Number(event.currentTarget.value) || 1 } })} /></label>
            <label>Fill style <select value={draft.style?.node?.fillStyle ?? "solid"} onChange={(event) => updateStyle({ node: { ...(draft.style?.node ?? {}), fillStyle: event.currentTarget.value as "solid" | "hachure" | "cross-hatch" } })}><option value="solid">Solid</option><option value="hachure">Hachure</option><option value="cross-hatch">Cross-hatch</option></select></label>
          </div> : <div className="kplex-lens-style-grid">
            <label>Line <input type="color" value={draft.style?.edge?.strokeColor ?? "#ffb300"} onChange={(event) => updateStyle({ edge: { ...(draft.style?.edge ?? {}), strokeColor: event.currentTarget.value } })} /></label>
            <label>Label <input type="color" value={draft.style?.edge?.textColor ?? "#ffffff"} onChange={(event) => updateStyle({ edge: { ...(draft.style?.edge ?? {}), textColor: event.currentTarget.value } })} /></label>
            <label>Line style <select value={draft.style?.edge?.strokeStyle ?? "solid"} onChange={(event) => updateStyle({ edge: { ...(draft.style?.edge ?? {}), strokeStyle: event.currentTarget.value as "solid" | "dashed" | "dotted" } })}><option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option></select></label>
            <label>Line width <input type="number" min="0.5" max="8" step="0.5" value={draft.style?.edge?.strokeWidth ?? 2} onChange={(event) => updateStyle({ edge: { ...(draft.style?.edge ?? {}), strokeWidth: Number(event.currentTarget.value) || 1 } })} /></label>
            <label className="kplex-lens-style-check"><input type="checkbox" checked={draft.style?.edge?.showLabel === true} onChange={(event) => updateStyle({ edge: { ...(draft.style?.edge ?? {}), showLabel: event.currentTarget.checked } })} /> Show relationship label</label>
          </div>}
          <div className="kplex-lens-help">Style lenses do not hide anything. If several style lenses match, later lenses override only the appearance fields they set.</div>
        </div>}
        {draftError && <div className="kplex-lens-editor-error">{draftError}</div>}
        <div className="kplex-lens-editor-actions"><button onClick={() => { setDraft(null); setDraftError(null); }}>Cancel</button><button className="mod-cta" onClick={saveDraft}>Save lens</button></div>
      </div>}
    </section>

  </div>;

  return <div className={`kplex-filter${active ? " is-active" : ""}${open ? " is-open" : ""}`}>
    <button
      ref={triggerRef}
      className="excalibrain-icon-button kplex-filter-trigger"
      aria-label="Filter visible Plex / Graph Lenses"
      aria-expanded={open}
      onClick={() => setOpen((current) => !current)}
    >
      <ObsidianIcon name="list-filter" size={16} />
      {activeLensCount > 0 && <span className="kplex-lens-count" aria-label={`${activeLensCount} active lenses`}>{activeLensCount}</span>}
    </button>
    <FloatingLayer
      open={open}
      anchorRef={triggerRef}
      panelRef={panelRef}
      insideRoots={() => [triggerRef.current, panelRef.current]}
      onDismiss={() => setOpen(false)}
      portalTarget={ownerDocumentBody}
      positioning={FILTER_PANEL_POSITIONING}
    >
      {panel}
    </FloatingLayer>
  </div>;
}
