/** Portable labelled form structure shared by authored text and finite option rows.
 * The caller supplies a stable control ID and owns the control, draft and validation. */
import type {ReactNode} from "react";

/** Labels remain visibly associated with their controls without redundant tooltip attributes. */
export function FormField({label, controlId, children, layout = "stacked", className = ""}: {
  label: string; controlId: string; children: ReactNode; layout?: "stacked" | "option"; className?: string;
}) {
  return <div className={`${layout === "option" ? "kplex-form-option" : "kplex-form-field kplex-react-field"} ${className}`}>
    <label id={`${controlId}-label`} htmlFor={controlId}>{label}</label>
    {children}
  </div>;
}

/** React forms use the same progress-left/actions-right footer structure as native forms. */
export function FormActions({status, children}: {status?: ReactNode; children?: ReactNode}) {
  return <div className="kplex-form-actions">
    <div className="setting-item-info kplex-form-status">{status}</div>
    <div className="setting-item-control">{children}</div>
  </div>;
}
