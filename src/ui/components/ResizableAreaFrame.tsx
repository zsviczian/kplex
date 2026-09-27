/**
 * Portable frame for a bounded canvas region. The host owns pointer capture,
 * coordinate conversion and persistence; this component supplies a reusable
 * visual boundary and a keyboard-accessible height control.
 */
import type { KeyboardEvent } from "react";

/** Render a region boundary and expose its current height when editing is enabled. */
export function ResizableAreaFrame({ className, left, top, width, height, edge, editing, label, value, min, max, onHeightChange }: {
  className: string;
  left: number;
  top: number;
  width: number;
  height: number;
  edge: "top" | "bottom";
  editing: boolean;
  label: string;
  value: number;
  min: number;
  max: number;
  onHeightChange: (height: number) => void;
}) {
  /** Change the height within the host's limits without triggering canvas navigation. */
  const keyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    let next: number;
    if (event.key === "Home") next = min;
    else if (event.key === "End") next = max;
    else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const direction = event.key === "ArrowUp" ? -1 : 1;
      next = value + direction * (edge === "top" ? -10 : 10);
    } else return;
    event.preventDefault();
    event.stopPropagation();
    onHeightChange(Math.max(min, Math.min(max, next)));
  };

  return <div className={className} style={{ left, top, width, height }}>
    {editing && <div
      className="kplex-area-keyboard-handle"
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation="horizontal"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      onKeyDown={keyDown}
    />}
  </div>;
}
