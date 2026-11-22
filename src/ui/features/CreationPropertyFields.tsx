/** Creation-only optional values. Shared form controls own layout; the host supplies native
 * types, localization and draft updates without exposing metadata or persistence to this feature. */
import {createElement, useId} from "react";
import {FormField} from "../components/FormField";
import {FormSelect} from "../components/FormSelect";
import {normalizeFieldName} from "../../core/contracts/fieldName";
import type {NodeProperty} from "../../core/plex/nodeProperties";
import type {CreationPropertyKind} from "../../application/creationProperties";
import type {Translator} from "../../lang";

/** Render one optional field, preserving native input semantics and an explicit unset checkbox state. */
function CreationPropertyField({row, value, kind, disabled, onChange, translate}: {
  row: NodeProperty; value: string; kind: CreationPropertyKind; disabled: boolean;
  onChange: (value: string) => void; translate: Translator;
}) {
  const id = useId(), alias = ["aliases", "alias"].includes(normalizeFieldName(row.field));
  const label = row.label ?? (alias ? translate("creation.alias") : row.field);
  if (kind === "checkbox") return createElement(FormSelect, {value, disabled, label, layout: "inline",
    onChange, children: [
      createElement("option", {key: "unset", value: ""}, translate("creation.propertyUnset")),
      createElement("option", {key: "true", value: "true"}, translate("creation.propertyTrue")),
      createElement("option", {key: "false", value: "false"}, translate("creation.propertyFalse")),
    ]});
  const multiline = kind === "list" && !alias;
  return createElement(FormField, {label, layout: multiline ? "stacked" : "inline", controlId: id,
    children: createElement(multiline ? "textarea" : "input", {id, value, disabled,
      ...(multiline ? {rows: 2, placeholder: translate("creation.propertyListHint")} : {type: alias || kind === "list" ? "text" : kind, step: kind === "number" ? "any" : undefined}),
      className: alias ? "kplex-create-alias-input" : "kplex-create-property-input",
      "data-kplex-creation-property": row.field,
      onChange: /** Keep native scalar/list drafts local until the parent submits the current row set. */ (event: {currentTarget: HTMLInputElement | HTMLTextAreaElement}) => onChange(event.currentTarget.value),
    })});
}

/** Keep normalized field identity stable across type refinements and render each active row once. */
export function CreationPropertyFields({rows, drafts, kind, disabled, onChange, translate}: {
  rows: readonly NodeProperty[]; drafts: Readonly<Record<string, string>>; kind: (field: string) => CreationPropertyKind;
  disabled: boolean; onChange: (field: string, value: string) => void; translate: Translator;
}) {
  return createElement("div", {className: "kplex-creation-properties"}, rows.filter(/** Creation visibility is independent of supplementary node details. */ row => row.creationVisible !== false).map(/** Reuse one normalized field key when the selected type refines a common row. */ row =>
    createElement(CreationPropertyField, {key: normalizeFieldName(row.field), row, value: drafts[normalizeFieldName(row.field)] ?? "",
      kind: kind(row.field), disabled, onChange: /** Route this field's draft without changing unrelated or hidden type drafts. */ value => onChange(row.field, value), translate})));
}
