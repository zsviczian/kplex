/** One host-composed relationship selection row for creation, linking and import. Semantic
 * vocabulary/ranking and local drafts remain caller-owned; role options, tag/disclosure
 * treatment, edit action, accessibility and geometry cannot drift between forms. */
import type {ReactNode} from "react";
import type {OntologyRole} from "../../core/contracts/ontologyConfiguration";
import type {Translator} from "../../lang";
import {FuzzySuggester, type FuzzySuggesterProps} from "../components/FuzzySuggester";
import {TooltipButton} from "../components/TooltipButton";

type RelationshipRole = Exclude<OntologyRole, "hidden" | "excluded">;

export const RELATIONSHIP_ROLE_CHOICES = [
  ["all", "addRelated.allDirections"], ["child", "role.child"], ["parent", "role.parent"],
  ["left", "role.friend"], ["right", "role.challenger"], ["previous", "role.previous"], ["next", "role.next"],
] as const;

/** The drag supplies a default; every supported direction remains an explicit editable choice. */
export function RelationshipFieldControl({role, onRoleChange, search, canEdit, onEdit, disabled, translate, icons, showDirection = true, detail, onCreate}: {
  role: RelationshipRole | "all"; onRoleChange: (role: RelationshipRole | "all") => void;
  search: FuzzySuggesterProps<string>; canEdit: boolean; disabled?: boolean;
  icons: Readonly<{tag: ReactNode; edit: ReactNode; create?: ReactNode}>;
  onEdit: (invoker: HTMLButtonElement) => void; translate: Translator;
  showDirection?: boolean; detail?: string;
  onCreate?: (invoker: HTMLButtonElement) => void;
}) {
  return <div className="kplex-relationship-selection">
    <div className="kplex-add-related-control-row kplex-relationship-field-control">
    {showDirection && <select className="dropdown kplex-add-related-role-select" value={role} disabled={disabled}
      aria-label={translate("addRelated.relationshipType")}
      onChange={/** Reject values outside the shared relationship-direction inventory. */ event => {
        const selected = RELATIONSHIP_ROLE_CHOICES.find(([value]) => value === event.currentTarget.value);
        if (selected && !disabled) onRoleChange(selected[0]);
      }}>{RELATIONSHIP_ROLE_CHOICES.map(/** Native select values remain stable role IDs. */ ([value, key]) =>
        <option key={value} value={value}>{translate(key)}</option>)}</select>}
    <FuzzySuggester {...search} icon={icons.tag} disabled={disabled || search.disabled}
      disclosure={search.disclosure ? {...search.disclosure, icon: null} : undefined}
      className={`kplex-add-related-ontology-search dropdown kplex-native-combobox${disabled || search.disabled ? " mod-disabled" : ""}`} resultsClassName="kplex-ontology-results" />
    <TooltipButton className="kplex-edit-selected-ontology kplex-icon-action" disabled={disabled || !canEdit}
      label={translate("ontology.editSelected", {field: search.value})}
      onClick={/** The caller owns the exact selected editor and its parent lifetime. */ event => onEdit(event.currentTarget)}>
      {icons.edit}
    </TooltipButton>
    {onCreate && <TooltipButton className="kplex-icon-action" disabled={disabled}
      label={translate("ontology.createField")}
      onClick={/** Vocabulary creation remains an explicit action, separate from saving this connection. */ event => onCreate(event.currentTarget)}>
      {icons.create}
    </TooltipButton>}
    </div>
    {detail && <div className="kplex-relationship-selection-detail setting-item-description">{detail}</div>}
  </div>;
}
