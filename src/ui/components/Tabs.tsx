/** Accessible tab navigation. Hosts retain panel drafts and own selection persistence. */
import type {KeyboardEvent} from "react";

/** Stable ids identify caller-owned panels; only enabled rendered tabs can be selected. */
export function Tabs({items, value, onChange, label, prefix, disabled = false}: {
  items: readonly {id: string; label: string}[]; value: string; onChange: (id: string) => void;
  label: string; prefix: string; disabled?: boolean;
}) {
  /** Keyboard activation keeps the mounted panel and its draft intact. */
  const key = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    const rtl = event.currentTarget.ownerDocument.defaultView?.getComputedStyle(event.currentTarget).direction === "rtl";
    const delta = event.key === "ArrowRight" ? rtl ? -1 : 1 : event.key === "ArrowLeft" ? rtl ? 1 : -1 : 0;
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : delta ? (index + delta + items.length) % items.length : -1;
    if (disabled || next < 0 || !items[next]) return;
    event.preventDefault(); onChange(items[next].id);
    event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[id="${prefix}-tab-${items[next].id}"]`)?.focus();
  };
  return <div className="kplex-tabs" role="tablist" aria-label={label}>{items.map(/** Selection and focus order share one caller-owned value. */ (item, index) =>
    <button key={item.id} id={`${prefix}-tab-${item.id}`} type="button" role="tab" aria-selected={item.id === value}
      aria-controls={`${prefix}-panel-${item.id}`} tabIndex={item.id === value ? 0 : -1} disabled={disabled}
      onKeyDown={/** Handle supported tab-navigation keys only. */ event => key(event, index)}
      onClick={/** Pointer selection uses the same enabled item. */ () => {if (!disabled) onChange(item.id);}}>{item.label}</button>)}</div>;
}
