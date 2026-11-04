/** Host vocabulary binding shared by import and connection-property forms. The portable
 * relationship row owns selection geometry; the native parent owns mutations and child lifetime. */
import {useEffect, useState} from "react";
import type KplexPlugin from "../main";
import type {RelationshipRole} from "../types";
import {ontologyConfiguration} from "../core/contracts/ontologyConfiguration";
import {normalizeFieldName} from "../core/contracts/fieldName";
import {fuzzyFilterStrings} from "./FuzzySearchInput";
import {ontologyFieldViews, ontologyFieldDetail, ontologyFuzzyMatches, ontologySelectionFields} from "./features/ontologyPresentation";
import {ObsidianIcon} from "./ObsidianIcon";
import {RelationshipFieldControl} from "./features/RelationshipFieldControl";

/** Search uses the canonical field/partner/description matcher, not an import-only vocabulary. */
export function RelationshipSelectionControl({plugin, role, field, disabled, onChange, onEdit, showDirection = true, onCreate}: {
  plugin: KplexPlugin; role: RelationshipRole | "all"; field: string; disabled: boolean;
  onChange: (role: RelationshipRole | "all", field: string) => void; onEdit: (invoker: HTMLButtonElement) => void;
  showDirection?: boolean; onCreate?: (invoker: HTMLButtonElement) => void;
}) {
  const [typed, setTyped] = useState(false), [browse, setBrowse] = useState(false), [, render] = useState(0);
  useEffect(/** Saved vocabulary changes refresh annotations without replacing this form's field draft. */ () =>
    plugin.index.subscribePresentation?.(/** Only this mounted picker receives a render request. */ () => render(value => value + 1)), [plugin]);
  const fields = ontologySelectionFields(role === "all" ? plugin.allOntologyFields() : plugin.ontologyFieldsForRole(role));
  const views = ontologyFieldViews(ontologyConfiguration(plugin.settings), [], plugin.settings.ontologyDescriptions);
  const results = browse ? fuzzyFilterStrings(fields, "", Number.MAX_SAFE_INTEGER) : typed ? ontologyFuzzyMatches(fields, views, field, fuzzyFilterStrings, 18) : [];
  const selected = views.find(candidate => candidate.key === normalizeFieldName(field));
  return <RelationshipFieldControl role={role} disabled={disabled} canEdit={Boolean(plugin.ontologyRoleForField(field))} translate={plugin.translator}
    showDirection={showDirection} detail={selected?.description} onCreate={onCreate}
    icons={{tag: <ObsidianIcon name="tags" size={16}/>, edit: <ObsidianIcon name="pencil" size={18}/>, create: <ObsidianIcon name="plus" size={18}/>}}
    onRoleChange={/** A direction change selects its remembered field, without copying or linking. */ value => {
      setTyped(false); setBrowse(false); onChange(value, value === "all" ? field : plugin.defaultOntologyField(value));
    }} onEdit={onEdit} search={{value: field, results, floating: true, floatingMode: "viewport", openResultsOnFocus: false,
      preferSuggestionOnModifiedEnter: true,
      placeholder: plugin.translator("addRelated.ontologyPlaceholder", {field: plugin.defaultOntologyField(role === "all" ? "child" : role)}),
      ariaLabel: plugin.translator("addRelated.ontologyAria"),
      getKey: /** Physical property spelling remains separate from annotations. */ value => value.toLocaleLowerCase(),
      getLabel: /** Do not insert translated descriptions as properties. */ value => value,
      getDetail: /** Share partner/description annotations with ordinary linking. */ value => {
        const view = views.find(candidate => candidate.key === normalizeFieldName(value));
        return ontologyFieldDetail(view, plugin.translator, Boolean(typed && !fuzzyFilterStrings([value], field, 1).length && view?.partner && fuzzyFilterStrings([view.partner], field, 1).length));
      },
      onChange: /** Authored text is a local draft until the common import confirmation. */ value => {setTyped(true); setBrowse(false); onChange(role, value);},
      onChoose: /** Selection closes browsing while retaining the exact physical name. */ value => {setTyped(false); setBrowse(false); onChange(role, value);},
      disclosure: {label: plugin.translator("addRelated.showOntologyFields"), icon: <ObsidianIcon name="chevron-down" size={16}/>,
        onOpen: /** Browse all role-appropriate fields using the same explicit disclosure. */ () => setBrowse(true)},
    }}/>;
}
