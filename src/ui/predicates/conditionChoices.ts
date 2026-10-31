/** Shared predicate condition vocabulary extracted from PlexFilter. Labels and suggestions stay separate from executable selector values. */
import type {Translator, PlainTranslationKey} from "../../lang";
import type {GraphLensScope} from "../../lens/GraphLens";
import {graphLensSimpleConditionNeedsValue, type GraphLensSimpleCondition, type GraphLensSimpleField, type GraphLensSimpleModel, type GraphLensSimpleOperator} from "../../lens/GraphLensSimple";
export type Choice = { value: string; label: string };
export type ChoiceSpec = { value: string; labelKey: PlainTranslationKey };

export const ROLE_CHOICE_SPECS: ChoiceSpec[] = [
  { value: "parent", labelKey: "role.parent" },
  { value: "child", labelKey: "role.child" },
  { value: "left", labelKey: "filter.roleFriendLeft" },
  { value: "right", labelKey: "filter.roleChallengerRight" },
  { value: "previous", labelKey: "role.previous" },
  { value: "next", labelKey: "role.next" },
  { value: "sibling", labelKey: "filter.roleSibling" },
];
export const EDGE_KIND_SPECS: ChoiceSpec[] = [{ value: "defined", labelKey: "filter.edgeDefined" }, { value: "inferred", labelKey: "filter.edgeInferred" }];
export const DIRECTION_SPECS: ChoiceSpec[] = [{ value: "from", labelKey: "filter.directionFrom" }, { value: "to", labelKey: "filter.directionTo" }, { value: "both", labelKey: "filter.directionBoth" }];
export const EVIDENCE_SOURCE_SPECS: ChoiceSpec[] = [
  { value: "frontmatter-ontology", labelKey: "filter.sourceFrontmatter" }, { value: "inline-ontology", labelKey: "filter.sourceInline" },
  { value: "obsidian-link", labelKey: "filter.sourceMarkdown" }, { value: "unresolved-link", labelKey: "filter.sourceUnresolved" },
  { value: "date-property", labelKey: "filter.sourceDate" }, { value: "body-url", labelKey: "filter.sourceBodyUrl" },
  { value: "property-url", labelKey: "filter.sourcePropertyUrl" },
  { value: "file-tree", labelKey: "filter.sourceFolder" }, { value: "tag-tree", labelKey: "filter.sourceTag" },
  { value: "url-origin", labelKey: "filter.sourceUrlOrigin" },
];
export const BOOLEAN_SPECS: ChoiceSpec[] = [{ value: "true", labelKey: "filter.active" }, { value: "false", labelKey: "filter.suppressed" }];

/** Resolve parameter-free catalog keys for select choices while retaining their machine-readable values. */
export function localizeChoices(specs: readonly ChoiceSpec[], translate: Translator): Choice[] {
  return specs.map(({ value, labelKey }) => ({ value, label: translate(labelKey) }));
}

/** Share finite predicate values across lens and preset editors; free-text suggestions remain caller-owned. */
export function finiteValueChoices(field: GraphLensSimpleField, translate: Translator): Choice[] | null {
  switch (field) {
    case "edge.role": return localizeChoices(ROLE_CHOICE_SPECS, translate);
    case "edge.kind": return localizeChoices(EDGE_KIND_SPECS, translate);
    case "edge.direction": return localizeChoices(DIRECTION_SPECS, translate);
    case "evidence.sourceKind": return localizeChoices(EVIDENCE_SOURCE_SPECS, translate);
    case "evidence.active": return localizeChoices(BOOLEAN_SPECS, translate);
    case "evidence.declaredRole": return [
      ...localizeChoices(ROLE_CHOICE_SPECS.filter(/** Sibling is derived, never declared by a source. */ row => row.value !== "sibling"), translate),
      {value: "hidden", label: translate("role.hidden")},
    ];
    default: return null;
  }
}

/** Build localized selector choices appropriate to the lens scope without changing selector paths. */
export function fieldOptions(translate: Translator): Record<GraphLensScope, Array<{ value: GraphLensSimpleField; label: string; title?: string }>> {
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

/** Build localized operators while retaining the simple-lens model’s stable operator values. */
export function operatorChoices(condition: GraphLensSimpleCondition, translate: Translator): Choice[] {
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

export function defaultOperator(field: GraphLensSimpleField): GraphLensSimpleOperator {
  if (field === "file.tags") return "has";
  if (field === "file.folder") return "in-folder";
  if (field === "node.label") return "contains";
  return "is";
}

/** Validate the simple-lens form and return localized feedback through the shared expression validation path. */
export function simpleValidation(model: GraphLensSimpleModel, translate: Translator): string | null {
  if (!model.conditions.length) return translate("filter.validationAddCondition");
  for (const condition of model.conditions) {
    if (condition.field === "note.property" && !condition.propertyName?.trim()) return translate("filter.validationChooseProperty");
    if (graphLensSimpleConditionNeedsValue(condition) && !condition.value.trim()) return translate("filter.validationChooseValue");
  }
  return null;
}


