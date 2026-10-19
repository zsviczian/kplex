/**
 * Public Obsidian RGB picker adapter. The caller owns literal alpha, text drafts and persistence;
 * this boundary exposes only six-digit RGB and retires native callbacks with its owning control.
 */
import { ColorComponent } from "obsidian";

export type RgbColorControl = Readonly<{
  setValue: (hex: string) => void; setDisabled: (disabled: boolean) => void; dispose: () => void;
}>;

/** Mount one native ColorComponent in its destination document without experimental alpha fields. */
export function mountRgbColorControl(container: HTMLElement, value: string, label: string, onChange: (rgb: string) => void): RgbColorControl {
  let alive = true, synchronizing = false;
  const component = new ColorComponent(container).setValue(value);
  const input = container.querySelector("input");
  input?.setAttribute("aria-label", label);
  component.onChange(/** Ignore retired/programmatic deliveries; alpha remains exclusively in the caller's draft. */ rgb => {
    if (alive && !synchronizing && /^#[\da-f]{6}$/i.test(rgb)) onChange(rgb);
  });
  return {
    /** Synchronize RGB after a text/opacity action without re-entering user-change handlers. */
    setValue: hex => { if (!alive) return; synchronizing = true; try { component.setValue(hex); } finally { synchronizing = false; } },
    /** Preserve the public component's disabled contract during explicit durable saves. */
    setDisabled: disabled => { if (alive) component.setDisabled(disabled); },
    /** Release this dedicated native container; queued callbacks cannot mutate its retired draft. */
    dispose: () => { if (!alive) return; alive = false; container.empty(); },
  };
}
