/** Portable labelled form structure shared by authored text and finite option rows.
 * The caller supplies a stable control ID and owns the control, draft and validation. */
import type {ReactNode} from "react";

/** Labels remain visibly associated with their controls without redundant tooltip attributes. */
export function FormField({label, controlId, children, layout = "stacked", actions, className = ""}: {
  label: string; controlId: string; children: ReactNode; layout?: "stacked" | "option" | "inline"; actions?: ReactNode; className?: string;
}) {
  return <div className={`${layout === "option" ? "kplex-form-option" : layout === "inline" ? "kplex-form-inline" : "kplex-form-field kplex-react-field"}${actions ? " has-actions" : ""} ${className}`}>
    <label id={`${controlId}-label`} htmlFor={controlId}>{label}</label>
    {children}
    {actions ? <div className="kplex-field-actions">{actions}</div> : null}
  </div>;
}

/** React forms use the same progress-left/actions-right footer structure as native forms. */
export function FormActions({status, children}: {status?: ReactNode; children?: ReactNode}) {
  return <div className="kplex-form-actions">
    <div className="setting-item-info kplex-form-status">{status}</div>
    <div className="setting-item-control">{children}</div>
  </div>;
}
