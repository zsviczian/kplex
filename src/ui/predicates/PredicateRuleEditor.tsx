/** Bounded rule authoring using the same controlled condition rows as Graph Lenses. The native
 * parent retains its draft/save/lifetime; this component never reads metadata or writes settings. */
import {useId, useState} from "react";
import type {Translator} from "../../lang";
import {buildGraphLensSimpleExpression, defaultGraphLensSimpleModel, tryParseLosslessGraphLensSimpleExpression, type GraphLensSimpleCondition} from "../../lens/GraphLensSimple";
import {tryParseGraphPredicateExpression} from "../../core/plex/predicateParser";
import {PredicateConditions} from "./PredicateConditions";
import {PredicateExpressionField} from "./PredicateExpressionField";
import {fieldOptions, simpleValidation, finiteValueChoices} from "./conditionChoices";
import {graphLensValidationMessage} from "./predicateMessages";
import {ObsidianIcon} from "../ObsidianIcon";

export type PredicateSuggestions = Readonly<{properties: readonly string[]; tags: readonly string[]; folders: readonly string[]; noteTypes: readonly string[]}>;
/** Each mounted category retains input focus while updating the owning native draft. */
export function PredicateRuleEditor({initial, onChange, translate, suggestions}: {initial: string; onChange: (source: string) => void;
  translate: Translator; suggestions?: PredicateSuggestions}) {
  const parsed = initial.trim() ? tryParseLosslessGraphLensSimpleExpression(initial) : defaultGraphLensSimpleModel("node");
  const [simple, setSimple] = useState(parsed), [expression, setExpression] = useState(initial), [mode, setMode] = useState<"simple" | "code">(parsed ? "simple" : "code");
  const [conversionError, setConversionError] = useState(false), id = useId();
  const fields = fieldOptions(translate), options = [...fields.node, ...fields.edge, ...fields.evidence];
  /** Reuse canonical finite values while keeping this detached editor's note-type suggestions local. */
  const valueChoices = (condition: GraphLensSimpleCondition) => finiteValueChoices(condition.field, translate)
    ?? (condition.field === "node.noteType" ? suggestions?.noteTypes.map(value => ({value, label: value})) ?? null : null);
  const issue = expression.trim() ? tryParseGraphPredicateExpression(expression).error : undefined;
  const error = conversionError ? translate("filter.advancedCannotSimple") : mode === "simple" && simple ? simpleValidation(simple, translate)
    : issue ? graphLensValidationMessage({code: "parse", issue}, translate) : null;
  const update = (source: string): void => {setExpression(source);setConversionError(false);onChange(source);};
  return <div className="kplex-predicate-rule-editor">
    <div className="kplex-lens-editor-mode" role="group" aria-label={translate("filter.editorMode")}>
      <button type="button" className={mode === "simple" ? "is-on" : ""} onClick={() => {
        if (mode === "simple") return;
        const model = expression.trim() ? tryParseLosslessGraphLensSimpleExpression(expression) : defaultGraphLensSimpleModel("node");
        if (!model) {setConversionError(true);return;}setSimple(model);setMode("simple");setConversionError(false);
      }}><ObsidianIcon name="list-filter" size={13} /> {translate("filter.simple")}</button>
      <button type="button" className={mode === "code" ? "is-on" : ""} onClick={() => {setMode("code");setConversionError(false);}}><ObsidianIcon name="code-2" size={13} /> {translate("filter.code")}</button>
    </div>
    {mode === "simple" && simple ? <PredicateConditions model={simple} onChange={model => {setSimple(model);update(buildGraphLensSimpleExpression(model));}}
      scope="node" fields={options} translate={translate} propertyListId={`${id}-properties`} valueChoices={valueChoices}
      maximumConditions={32} datalistForField={field => field === "file.tags" ? `${id}-tags` : field === "file.folder" ? `${id}-folders` : field === "evidence.fieldName" ? `${id}-properties` : undefined} />
      : <PredicateExpressionField label={translate("filter.expression")} maxLength={2048} value={expression} onChange={update} />}
    <datalist id={`${id}-properties`}>{suggestions?.properties.map(value => <option key={value} value={value} />)}</datalist>
    <datalist id={`${id}-tags`}>{suggestions?.tags.map(value => <option key={value} value={value} />)}</datalist>
    <datalist id={`${id}-folders`}>{suggestions?.folders.map(value => <option key={value} value={value} />)}</datalist>
    {error && <div className="kplex-lens-error" role="status">{error}</div>}
  </div>;
}
