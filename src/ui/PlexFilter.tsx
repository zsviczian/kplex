/**
 * Host-bound Plex filter and Graph Lens editor. Shared predicates own matching; this surface localizes
 * choices and validation. FloatingLayer owns portaling, dismissal and header drag in the owning document.
 * Portalled controls opt into the shell's shared delayed hover hints without browser title duplicates.
 */
import {PredicateExpressionField} from "./predicates/PredicateExpressionField";
import {LayoutSlider} from "./components/LayoutSlider";
import type {AppearanceOwner} from "../core/plex/appearanceThemes";
import type {SemanticColorPair} from "../core/plex/colorPreferences";
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import type {PlexViewSession} from "../application/PlexViewSession";
import {PlexViewSelector} from "./plexViews/PlexViewSelector";
import {CanvasViewChoices} from "./plexViews/CanvasViewChoices";
import type {CanvasViewContributionController} from "./plexViews/CanvasViewContributionController";
import type { GraphIndex } from "../index/GraphIndex";
import type { GraphPage, Role, NodeStyle, LinkStyle } from "../types";
import type { NodeSortOrder } from "../settings";
import {colorIdentityText, type ColorValue} from "../core/contracts/colorValue";
import { createGraphLensId, defaultGraphLensStyle, validateGraphLensExpression, type GraphLensDefinition, type GraphLensMode, type GraphLensScope, type GraphLensStyle } from "../lens/GraphLens";
import {
  buildGraphLensSimpleExpression,
  defaultGraphLensSimpleModel,
  tryParseGraphLensSimpleExpression,
  type GraphLensSimpleCondition,
  type GraphLensSimpleField,
  type GraphLensSimpleModel,
  type GraphLensSimpleOperator,
} from "../lens/GraphLensSimple";
import { EMPTY_PLEX_FILTER, isPlexFilterActive, type PlexFilterState } from "../lens/SimplePlexFilter";
import { ObsidianIcon } from "./ObsidianIcon";
import { FloatingLayer, type FloatingLayerPositioning } from "./components/FloatingLayer";
import type { Translator } from "../lang";
import {graphLensValidationMessage} from "./predicates/predicateMessages";
import {PredicateConditions} from "./predicates/PredicateConditions";
import {ROLE_CHOICE_SPECS, localizeChoices, finiteValueChoices, fieldOptions, defaultOperator, simpleValidation, type Choice} from "./predicates/conditionChoices";

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

import type {StyleCommitResult} from "./StyleEditorModal";
import type {ColorPreviewTarget} from "./ColorPreview";

/** Opening-theme ownership is supplied by the host; the filter never discovers a plugin or theme library. */
export type LensAppearanceContext = Readonly<{capture: () => AppearanceOwner; isCurrent: (owner: AppearanceOwner) => boolean;
  subscribe: (changed: () => void) => () => void; name: () => string}>;

/** Native composition port: the filter owns the detached draft and retires its single source dialog. */
export type LensColorRequest = Readonly<{owner?: AppearanceOwner; sourceScope: HTMLElement; title: string; target: Exclude<ColorPreviewTarget, {kind: "compass"}>; initial: ColorValue | undefined;
  nodeStyle: () => NodeStyle; linkStyle: () => LinkStyle; apply: (value: ColorValue | undefined) => boolean}>;

/** The parent owns a nested native surface through its concrete root and exact retirement action. */
export type LensColorDialog = Readonly<{element: HTMLElement; retire: () => void}>;
/** Native package UI uses the same invoking-document and exact-child retirement contract. */
export type LensSharingRequest = Readonly<{mode: "import" | "export" | "prompt"; lens?: GraphLensDefinition; sourceScope: HTMLElement}>;

type LensEditorMode = "simple" | "code";
type LensDraft = Pick<GraphLensDefinition, "id" | "name" | "scope" | "mode" | "expression"> & {
  initialDefinition?: GraphLensDefinition;
  appearanceOwner?: AppearanceOwner; themeName?: string; session?: number;
  editorMode: LensEditorMode;
  simple: GraphLensSimpleModel | null;
  style?: GraphLensStyle;
};

/** Use the stored lens name when present, otherwise supply the localized display-only fallback. */
function lensDisplayName(name: string, translate: Translator): string {
  return name.trim() || translate("filter.untitledLens");
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
/** Render the localized quick-filter and named-lens editor; evaluation and persisted definitions remain owned by shared lens contracts. */
export function PlexFilter({
  index,
  center,
  revision,
  value,
  onChange,
  lenses,
  onLensesChange, onEditColor, onShareLens, lensesReadOnly = false, colorPalette = [], appearance,
  layoutMode,
  onLayoutModeChange,
  showSiblings,
  onShowSiblingsChange,
  visibility,
  onVisibilityChange,
  sortOrder,
  onSortOrderChange,
  translate,
  viewSession,
  viewContributions,
}: {
  index: GraphIndex;
  center?: GraphPage;
  revision: number;
  value: PlexFilterState;
  onChange: (value: PlexFilterState) => void;
  lenses: GraphLensDefinition[];
  appearance?: LensAppearanceContext;
  onLensesChange: (lenses: GraphLensDefinition[], baseline?: GraphLensDefinition[], owner?: AppearanceOwner) => Promise<StyleCommitResult> | void;
  onEditColor?: (request: LensColorRequest) => LensColorDialog;
  onShareLens?: (request: LensSharingRequest) => LensColorDialog;
  lensesReadOnly?: boolean;
  colorPalette?: readonly SemanticColorPair[];
  layoutMode: GraphFilterLayoutMode;
  onLayoutModeChange: (mode: GraphFilterLayoutMode) => void;
  showSiblings: boolean;
  onShowSiblingsChange: (show: boolean) => void;
  visibility: Record<PlexVisibilitySetting, boolean>;
  onVisibilityChange: (key: PlexVisibilitySetting) => void;
  sortOrder: NodeSortOrder;
  onSortOrderChange: (order: NodeSortOrder) => void;
  translate: Translator;
  /** The exact canvas that owns this panel; never resolve a global active leaf at submission. */
  viewSession?: PlexViewSession;
  viewContributions?: CanvasViewContributionController;
}) {
  const roleChoices = localizeChoices(ROLE_CHOICE_SPECS, translate);
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
  const openingViewSession = useRef<PlexViewSession | undefined>(undefined);
  const openingContributions = useRef<CanvasViewContributionController | undefined>(undefined);
  const [draft, setDraft] = useState<LensDraft | null>(null);
  const draftSequence = useRef(0);
  const [, setThemeRevision] = useState(0);
  useEffect(/** Inactive metadata has no render effect; activation epochs retire drafts even after A→B→A. */ () => {
    if (!appearance) return;
    let owner = appearance.capture();
    return appearance.subscribe(/** Compare only activation proof, without reading/scanning saved appearances. */ () => {
      const next = appearance.capture(); if (next.themeId === owner.themeId && next.activation === owner.activation) return;
      owner = next; setThemeRevision(/** Recheck the current opening draft through the same host capability. */ revision => revision + 1);
    });
  }, [appearance]);

  const draftStale = !!draft?.appearanceOwner && appearance?.isCurrent(draft.appearanceOwner) === false;
  const [draftError, setDraftError] = useState<string | null>(null);
  const [pending, setPending] = useState(false), [operationMessage, setOperationMessage] = useState<string | null>(null);
  const operation = useRef({alive: true, busy: false, token: 0});
  const childColor = useRef<LensColorDialog | null>(null), draftRef = useRef(draft); draftRef.current = draft;
  const childSharing = useRef<LensColorDialog | null>(null);
  useEffect(() => () => {childSharing.current?.retire();childSharing.current = null;}, [open, triggerRef.current?.ownerDocument]);
  /** Keep unsaved lens drafts intact while a source-scoped native transfer surface is open. */
  const shareLens = (element: HTMLElement, mode: LensSharingRequest["mode"], lens?: GraphLensDefinition): void => {
    if (!onShareLens || operation.current.busy || lensesReadOnly || draftStale) return;
    childSharing.current?.retire();childSharing.current = onShareLens({mode, lens, sourceScope: element});
  };
  useEffect(() => {const owner = operation.current; owner.alive = true; return () => {owner.alive = false; owner.token++; childColor.current?.retire(); childColor.current = null;};}, []);
  useEffect(() => () => {childColor.current?.retire(); childColor.current = null;}, [draft?.id, draft?.session, open, triggerRef.current?.ownerDocument]);

  /** Capture one action; failures keep its draft and durable completion cannot become an unsaved retry. */
  const submitLenses = (next: GraphLensDefinition[], baseline = lenses, saved?: () => void, openingOwner?: AppearanceOwner): void => {
    const owner = operation.current; if (owner.busy || lensesReadOnly) return;
    owner.busy = true; const token = ++owner.token; setPending(true); setOperationMessage(null);
    const finish = async (): Promise<void> => {
      let result: StyleCommitResult | void;
      try {result = await onLensesChange(next, baseline, openingOwner ?? appearance?.capture());}
      catch (error) {console.error("K-Plex lens edit was not saved", error); if (owner.alive && owner.token === token) {owner.busy = false; setPending(false); setOperationMessage(translate("styles.operation.notSaved"));} return;}
      if (!owner.alive || owner.token !== token) return;
      owner.busy = false; setPending(false);
      try {saved?.(); setOperationMessage(result?.refreshPending ? translate("styles.operation.savedRefreshPending") : null);}
      catch (error) {console.error("K-Plex saved lens UI refresh failed", error); setOperationMessage(translate("styles.operation.savedRefreshPending"));}
    };
    void finish();
  };

  /** Source selection updates only this exact live parent draft; the parent Save remains authoritative. */
  const editColor = (element: HTMLElement, label: string, target: LensColorRequest["target"], initial: ColorValue | undefined): void => {
    const opening = draftRef.current; if (!opening || operation.current.busy || lensesReadOnly || !onEditColor || (opening.appearanceOwner && appearance?.isCurrent(opening.appearanceOwner) === false)) return;
    childColor.current?.retire();
    childColor.current = onEditColor({owner: opening.appearanceOwner, sourceScope: element, title: label, target, initial,
      nodeStyle: () => draftRef.current?.style?.node ?? {}, linkStyle: () => draftRef.current?.style?.edge ?? {},
      apply: value => {
        if (!operation.current.alive || operation.current.busy || draftRef.current?.id !== opening.id || draftRef.current?.session !== opening.session || (opening.appearanceOwner && appearance?.isCurrent(opening.appearanceOwner) === false)) return false;
        setDraft(current => {
          if (!current || current.id !== opening.id || current.session !== opening.session) return current;
          const layer = target.kind === "node" ? {...current.style?.node} : {...current.style?.edge};
          if (target.kind === "canvas") return current;
          if (value === undefined) Reflect.deleteProperty(layer, target.field); else Object.assign(layer, {[target.field]: value});
          return {...current, style: {...current.style, [target.kind === "node" ? "node" : "edge"]: layer}};
        }); return true;
      },
    });
  };

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
    if (operation.current.busy || lensesReadOnly || draftStale) return;
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
      initialDefinition: structuredClone(lens),
      appearanceOwner: appearance?.capture(), themeName: appearance?.name(), session: ++draftSequence.current,
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
    if (!draft || operation.current.busy || lensesReadOnly || draftStale) return;
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
      enabled: draft.initialDefinition?.enabled ?? existing?.enabled ?? true,
      style: draft.mode === "style" ? (draft.style ?? defaultGraphLensStyle(draft.scope)) : draft.style,
    };
    const opening = draft.initialDefinition;
    const baseline = opening ? lenses.map(lens => lens.id === opening.id ? opening : lens) : lenses;
    if (opening && !baseline.some(lens => lens.id === opening.id)) baseline.push(opening);
    submitLenses(existing ? lenses.map(lens => lens.id === next.id ? next : lens) : [...lenses, next], baseline, () => {setDraft(null); setDraftError(null);}, draft.appearanceOwner);
  };

  /** Canonical finite values are shared; center-relative paths and indexed suggestions belong to this lens. */
  const valueChoices = (condition: GraphLensSimpleCondition): Choice[] | null => {
    if (condition.field === "edge.role") return roleChoices;
    const finite = finiteValueChoices(condition.field, translate);
    if (finite) return finite;
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

  const panelViewSession = openingViewSession.current ?? viewSession;
  const panelContributions = openingContributions.current ?? viewContributions;
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
          if (operation.current.busy) return; setOpen(false); triggerRef.current?.focus({ preventScroll: true });
        }}><ObsidianIcon name="x" size={16} /></button>
    </div>
    <datalist id={tagListId}>{suggestions.tags.map((tag) => <option key={tag} value={tag} />)}</datalist>
    <datalist id={relationshipListId}>{suggestions.relationshipDefinitions.map((definition) => <option key={definition} value={definition} />)}</datalist>
    <datalist id={propertyListId}>{suggestions.properties.map((property) => <option key={property} value={property} />)}</datalist>
    <datalist id={pathListId}>{suggestions.relatedPaths.map((path) => <option key={path} value={path} />)}</datalist>
    <datalist id={folderListId}>{suggestions.folders.map((folder) => <option key={folder} value={folder} />)}</datalist>

    <div className="kplex-view-controls">
      {panelViewSession && <PlexViewSelector session={panelViewSession} translate={translate} contributions={panelContributions} />}
      {panelContributions && <CanvasViewChoices controller={panelContributions} translate={translate} />}
    </div>

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
      {lensesReadOnly && <div role="status">{translate("colors.readOnly")}</div>}
      {operationMessage && <div role="status">{operationMessage}</div>}
      <fieldset className="kplex-lens-fields" disabled={pending || lensesReadOnly} aria-busy={pending}>
      <div className="kplex-filter-section-heading kplex-lens-heading">
        <span>{translate("filter.graphLenses")}</span>
        <div className="kplex-lens-heading-actions">
          {onShareLens && <>
            <button onClick={event => shareLens(event.currentTarget, "import")}>{translate("sharing.importLens")}</button>
            <button onClick={event => shareLens(event.currentTarget, "prompt")}>{translate("sharing.copyPrompt")}</button>
          </>}
          {activeLensCount > 0 && <button className="kplex-lens-disable-all" onClick={() => submitLenses(lenses.map((lens) => ({ ...lens, enabled: false })))}>{translate("filter.turnAllOff")}</button>}
          <button className="kplex-icon-button" aria-label={translate("filter.newLens")} disabled={pending || lensesReadOnly || draftStale} onClick={() => { if (operation.current.busy || lensesReadOnly || draftStale) return; setDraft({...EMPTY_DRAFT(), appearanceOwner: appearance?.capture(), themeName: appearance?.name(), session: ++draftSequence.current}); setDraftError(null); }}>
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
              onClick={() => submitLenses(lenses.map((item) => item.id === lens.id ? { ...item, enabled: !item.enabled } : item))}
            ><ObsidianIcon name={lens.enabled ? "eye" : "eye-off"} size={14} /></button>
            <button className="kplex-lens-main" disabled={draftStale} onClick={() => editLens(lens)} aria-label={`${displayName}\n${expressionErrorMessage ?? lens.expression}`}>
              <span className="kplex-lens-name">{displayName}</span>
              <span className="kplex-lens-meta">{translate(lens.enabled ? "filter.on" : "filter.off")} · {modeLabel(lens.mode, translate)} · {scopeLabel(lens.scope, translate)}</span>
            </button>
            {expressionErrorMessage && <span className="kplex-lens-error-dot" aria-label={expressionErrorMessage} data-kplex-control-tooltip>!</span>}
            {onShareLens && !expressionError && <button className="kplex-icon-button" disabled={draftStale} aria-label={translate("sharing.exportLens")} onClick={event => shareLens(event.currentTarget, "export", lens)}><ObsidianIcon name="download" size={13} /></button>}
            <button className="kplex-icon-button" disabled={draftStale} aria-label={translate("filter.editLens", { name: displayName })} onClick={() => editLens(lens)}><ObsidianIcon name="pencil" size={13} /></button>
            <button className="kplex-icon-button" aria-label={translate("filter.deleteLens", { name: displayName })} onClick={() => submitLenses(lenses.filter((item) => item.id !== lens.id))}><ObsidianIcon name="trash-2" size={13} /></button>
          </div>;
        })}
      </div>

      {draft && <div className="kplex-lens-editor">
        {draftStale && <div role="status" className="kplex-lens-editor-error">{translate("themes.staleDraft", {name: draft.themeName ?? translate("themes.userName")})}</div>}
        <fieldset className="kplex-lens-fields" disabled={draftStale}>
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

        {draft.editorMode === "simple" && draft.simple ? <PredicateConditions model={draft.simple} onChange={updateSimple} scope={draft.scope} fields={localizedFieldOptions[draft.scope]} translate={translate} propertyListId={propertyListId} valueChoices={valueChoices} datalistForField={datalistForField} /> : <>
          <PredicateExpressionField label={translate("filter.expression")} value={draft.expression} placeholder={translate("filter.expressionPlaceholder")}
            onChange={expression => {setDraft({...draft, expression, simple: null});setDraftError(null);}} hint={translate("filter.advancedHelp")} />
        </>}
        {draft.mode === "style" && <div className="kplex-lens-style-editor">
          <div className="kplex-lens-style-heading">{translate("filter.appearance")}</div>
          {draft.scope === "node" ? <div className="kplex-lens-style-grid">
            <label>{translate("filter.fill")} <button type="button" disabled={!onEditColor} onClick={event => editColor(event.currentTarget, translate("filter.fill"), {kind: "node", field: "backgroundColor"}, draft.style?.node?.backgroundColor)}>{colorIdentityText(draft.style?.node?.backgroundColor, colorPalette) || translate("colors.inherit")}</button></label>
            <label>{translate("filter.border")} <button type="button" disabled={!onEditColor} onClick={event => editColor(event.currentTarget, translate("filter.border"), {kind: "node", field: "borderColor"}, draft.style?.node?.borderColor)}>{colorIdentityText(draft.style?.node?.borderColor, colorPalette) || translate("colors.inherit")}</button></label>
            <label>{translate("filter.text")} <button type="button" disabled={!onEditColor} onClick={event => editColor(event.currentTarget, translate("filter.text"), {kind: "node", field: "textColor"}, draft.style?.node?.textColor)}>{colorIdentityText(draft.style?.node?.textColor, colorPalette) || translate("colors.inherit")}</button></label>
            <label>{translate("filter.borderStyle")} <select value={draft.style?.node?.strokeStyle ?? "solid"} onChange={(event) => updateStyle({ node: { ...(draft.style?.node ?? {}), strokeStyle: event.currentTarget.value as "solid" | "dashed" | "dotted" } })}><option value="solid">{translate("filter.solid")}</option><option value="dashed">{translate("filter.dashed")}</option><option value="dotted">{translate("filter.dotted")}</option></select></label>
            <LayoutSlider label={translate("filter.borderWidth")} caption={translate("filter.borderWidth")} icon={null} min={0.5} max={8} step={0.5} value={draft.style?.node?.strokeWidth ?? 2} displayValue={String}
              onChange={strokeWidth => updateStyle({node: {...(draft.style?.node ?? {}), strokeWidth}})} />
            <label>{translate("filter.fillStyle")} <select value={draft.style?.node?.fillStyle ?? "solid"} onChange={(event) => updateStyle({ node: { ...(draft.style?.node ?? {}), fillStyle: event.currentTarget.value as "solid" | "hachure" | "cross-hatch" } })}><option value="solid">{translate("filter.solid")}</option><option value="hachure">{translate("filter.hachure")}</option><option value="cross-hatch">{translate("filter.crossHatch")}</option></select></label>
          </div> : <div className="kplex-lens-style-grid">
            <label>{translate("filter.line")} <button type="button" disabled={!onEditColor} onClick={event => editColor(event.currentTarget, translate("filter.line"), {kind: "link", field: "strokeColor"}, draft.style?.edge?.strokeColor)}>{colorIdentityText(draft.style?.edge?.strokeColor, colorPalette) || translate("colors.inherit")}</button></label>
            <label>{translate("filter.label")} <button type="button" disabled={!onEditColor} onClick={event => editColor(event.currentTarget, translate("filter.label"), {kind: "link", field: "textColor"}, draft.style?.edge?.textColor)}>{colorIdentityText(draft.style?.edge?.textColor, colorPalette) || translate("colors.inherit")}</button></label>
            <label>{translate("filter.lineStyle")} <select value={draft.style?.edge?.strokeStyle ?? "solid"} onChange={(event) => updateStyle({ edge: { ...(draft.style?.edge ?? {}), strokeStyle: event.currentTarget.value as "solid" | "dashed" | "dotted" } })}><option value="solid">{translate("filter.solid")}</option><option value="dashed">{translate("filter.dashed")}</option><option value="dotted">{translate("filter.dotted")}</option></select></label>
            <LayoutSlider label={translate("filter.lineWidth")} caption={translate("filter.lineWidth")} icon={null} min={0.5} max={8} step={0.5} value={draft.style?.edge?.strokeWidth ?? 2} displayValue={String}
              onChange={strokeWidth => updateStyle({edge: {...(draft.style?.edge ?? {}), strokeWidth}})} />
            <label className="kplex-lens-style-check"><input type="checkbox" checked={draft.style?.edge?.showLabel === true} onChange={(event) => updateStyle({ edge: { ...(draft.style?.edge ?? {}), showLabel: event.currentTarget.checked } })} /> {translate("filter.showRelationshipLabel")}</label>
          </div>}
          <div className="kplex-lens-help">{translate("filter.styleHelp")}</div>
        </div>}
        </fieldset>
        {draftError && <div className="kplex-lens-editor-error">{draftError}</div>}
        <div className="kplex-lens-editor-actions"><button onClick={() => { if (operation.current.busy) return; setDraft(null); setDraftError(null); }}>{translate(draftStale ? "themes.discardDraft" : "common.cancel")}</button><button className="mod-cta" disabled={draftStale} onClick={saveDraft}>{translate("filter.saveLens")}</button></div>
      </div>}
      </fieldset>
    </section>

  </div>;

  return <div className={`kplex-filter${active ? " is-active" : ""}${open ? " is-open" : ""}`}>
    <button
      ref={triggerRef}
      className="kplex-icon-button kplex-filter-trigger"
      aria-label={translate("filter.trigger")}
      aria-expanded={open}
      onClick={() => {if (!operation.current.busy) {if (!open) {openingViewSession.current = viewSession; openingContributions.current = viewContributions;}setOpen(current => !current);}}}
    >
      <ObsidianIcon name="list-filter" size={16} />
      {activeLensCount > 0 && <span className="kplex-lens-count" aria-label={translate("filter.activeLensCount", { count: String(activeLensCount) })}>{activeLensCount}</span>}
    </button>
    <FloatingLayer
      open={open}
      anchorRef={triggerRef}
      panelRef={panelRef}
      dragHandleRef={dragHandleRef}
      insideRoots={() => [triggerRef.current, panelRef.current, childColor.current?.element, childSharing.current?.element]}
      handleEscape={event => [childColor.current?.element, childSharing.current?.element].every(child => !child || (!child.isConnected && !event.composedPath().includes(child)))}
      onDismiss={() => {if (!operation.current.busy && !childColor.current?.element.isConnected && !childSharing.current?.element.isConnected) setOpen(false);}}
      portalTarget={ownerDocumentBody}
      positioning={FILTER_PANEL_POSITIONING}
    >
      {panel}
    </FloatingLayer>
  </div>;
}
