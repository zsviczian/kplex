/** Shared authored-direction disclosure. Callers own native eligibility, the actual canonical
 * inverse field and submission; this component never derives semantics from screen placement. */
import type {Translator} from "../../lang";
import type {ReactNode} from "react";
import {TooltipButton} from "../components/TooltipButton";

/** Show direction editing only when both endpoints can own the authored Markdown properties. */
export function RelationshipDirectionControl({owner, field, target, canFlip, disabled, onFlip, translate, icon}: {
  owner: string; field: string; target: string; canFlip: boolean; disabled?: boolean; onFlip: () => void; translate: Translator; icon?: ReactNode;
}) {
  if (!canFlip) return null;
  return <div className="kplex-relationship-direction">
    <div className="setting-item-description" role="status">{translate("relationship.directionPreview", {owner, field, target})}</div>
    <TooltipButton className={icon ? "kplex-icon-action" : undefined} disabled={disabled || !canFlip} onClick={onFlip} label={translate("relationship.flip")}>{icon ?? translate("relationship.flip")}</TooltipButton>
  </div>;
}
