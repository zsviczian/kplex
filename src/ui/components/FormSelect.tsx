/** Shared portable labelled select. Native keyboard/selection semantics remain intact;
 * form layout, typography and spacing come from the same classes as native form fields. */
import {useId, type ReactNode} from "react";
import {FormField} from "./FormField";

/** A select has one visible label and no redundant hover tooltip on its own label text. */
export function FormSelect({label, value, onChange, disabled, children, className = "", control, layout = "option"}: {
  label: string; value: string; onChange: (value: string) => void; disabled?: boolean;
  children: ReactNode; className?: string; control?: string; layout?: "option" | "inline";
}) {
  const id = useId();
  return <FormField label={label} controlId={id} layout={layout} className={className}>
    <select id={id} className="dropdown" value={value} disabled={disabled} data-kplex-control={control}
      onChange={/** Native and keyboard selection share the caller's offered-value validation. */ event => onChange(event.currentTarget.value)}>{children}</select>
  </FormField>;
}
