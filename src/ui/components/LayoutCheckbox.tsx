/**
 * Shared native checkbox card for the pane-fit layout rail. Callers supply localized copy,
 * effective context values and persistence; this component owns accessible input presentation
 * and delegates hints to the existing control-tooltip owner. It never accesses settings or graphs.
 */
import type { ChangeEvent } from "react";

/** Render a layout toggle with the same card, caption and focus treatment as the numeric rails. */
export function LayoutCheckbox({ label, hint, checked, controlId, onChange }: Readonly<{
  label: string;
  hint?: string;
  checked: boolean;
  controlId: string;
  onChange: (checked: boolean) => void;
}>) {
  return <label className="kplex-density-control kplex-wrap-label-control" aria-label={hint ?? label} data-kplex-control-tooltip>
    <input type="checkbox" checked={checked} aria-label={label} data-kplex-control={controlId}
      onChange={/** Emit only the caller-owned boolean; native keyboard and pointer behavior remain intact. */ (event: ChangeEvent<HTMLInputElement>) => onChange(event.currentTarget.checked)} />
    <span className="kplex-wrap-label-caption">{label}</span>
  </label>;
}
