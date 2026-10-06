/**
 * Compact, accessible layout rail shared by density axes, columns and typography. The caller owns
 * localization, numeric policy and persistence; this component only displays and emits values.
 */
import type { ChangeEvent, ReactNode } from "react";

/** Render a bounded rail with its exact value, preserving the established Plex control footprint. */
export function LayoutSlider({ label, caption, hint, icon, value, displayValue, min, max, step, onChange }: {
  label: string;
  caption: string;
  hint?: string;
  icon: ReactNode;
  value: number;
  displayValue: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const percent = Math.max(0, Math.min(100, (value - min) / (max - min) * 100));
  return <label className="kplex-density-control" title={hint}>
    <span className="kplex-density-heading">{icon}<span>{caption}</span><output>{displayValue}</output></span>
    <span className={`kplex-density-rail${step === 1 ? " is-stepped" : ""}`}>
      <span className="kplex-density-fill" style={{ width: `${percent}%` }} />
      <input type="range" min={min} max={max} step={step} value={value} aria-label={label}
        onChange={/** Emit a number without owning the caller's layout or storage policy. */ (event: ChangeEvent<HTMLInputElement>) => onChange(Number(event.currentTarget.value))} />
    </span>
  </label>;
}
