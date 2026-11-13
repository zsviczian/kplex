/** Creation-kind navigation composes shared tabs and the type-scoped Template field.
 * Native shells retain authored drafts, mutations, completion and resource lifetime. */
import {useId, type ReactNode} from "react";
import type {Translator} from "../../lang";
import {Tabs} from "../components/Tabs";
import {DrawingTemplateSelect, type DrawingTemplateChoices} from "./DrawingTemplateSelect";

export type CreationType = "markdown" | "excalidraw" | "placeholder";
/** The host owns persistence; unavailable-kind projection and modal drafts never invoke this writer. */
export type CreationTypeTabControl = Readonly<{value: CreationType | null; onChange: (type: CreationType) => void}>;

/** Only the selected kind mounts a picker, so a retired tab cannot retain a portalled list. */
export function CreationTypeTabs({value, types, onChange, disabled = false, translate, template, children}: {
  value: CreationType; types: readonly CreationType[]; onChange: (type: CreationType) => void;
  disabled?: boolean; translate: Translator; children?: ReactNode;
  template?: {choices: DrawingTemplateChoices; value: string; onChange: (path: string) => void};
}) {
  const prefix = useId();
  return <section className="kplex-creation-types">
    <Tabs prefix={prefix} label={translate("creation.type")} value={value} disabled={disabled}
      items={types.map(/** Type names are localized choices, never persisted labels. */ type => ({id: type, label: translate(`common.${type}`)}))}
      onChange={/** Reject unavailable and synthetic values at the shared navigation boundary. */ type => {
        const offered = types.find(item => item === type);
        if (!disabled && offered) onChange(offered);
      }}/>
    {types.map(/** Stable panel references coexist, but inactive controls and their portals retire. */ type => <div key={type} hidden={type !== value} className="kplex-creation-type-panel" id={`${prefix}-panel-${type}`} role="tabpanel" aria-labelledby={`${prefix}-tab-${type}`}>
      {type === value && template && type !== "placeholder" ? <DrawingTemplateSelect choices={template.choices} value={template.value} kind={type}
        disabled={disabled} translate={translate} onChange={/** The active tab owns the output kind; choosing a template changes only its path. */ path => template.onChange(path)}/> : null}
      {type === value ? children : null}
    </div>)}
  </section>;
}
