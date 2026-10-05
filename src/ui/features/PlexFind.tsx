/** Current-Plex Find field: caller-owned projected matches/reveal actions, local focus/disclosure and displayed-value/path mode, no dropdown. */
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Match a literal case-insensitive term against caller-selected displayed values. */
export function matchesFindText(query: string, values: readonly string[]): boolean {
  const term = query.trim().toLocaleLowerCase();
  return Boolean(term) && values.some(/** Each caller-projected facet is independently searchable. */ (value) => value.toLocaleLowerCase().includes(term));
}

/** Search the full selected display label, including an ellipsized suffix; a local mode adds its path. */
export function matchesFindNode(query: string, label: string, path: string, includePath: boolean): boolean {
  return matchesFindText(query, includePath ? [label, path] : [label]);
}

/** Match published ontology definitions only; inferred wiki links and structural labels are not Find targets. */
export function matchesOntologyFind(query: string, definition?: string): boolean {
  const structural = new Set(["file-tree", "tag-tree", "url-origin", "inferred", "inferred-link", "sibling", "section"]);
  const fields = (definition ?? "").replace(/\[\[[\s\S]*?\]\]/g, "").split(",").map(/** Definitions publish comma-separated ontology names. */ (field) => field.trim())
    .filter(/** Synthetic link destinations describe connected notes rather than ontology fields. */ (field) => field && !structural.has(field.toLowerCase()));
  return matchesFindText(query, fields);
}

/** Expose a touch-accessible magnifier and a Find field independent of Vault search. */
export function PlexFind({ query, onChange, onNext, focusRequest, visible = true, includePath, onIncludePathChange, pathIcon, pathLabel, icon, closeIcon, label, placeholder, closeLabel, matchLabel }: {
  query: string; onChange: (query: string) => void; onNext: (backward: boolean) => void; focusRequest: number;
  visible?: boolean; includePath: boolean; onIncludePathChange: (includePath: boolean) => void; pathIcon: ReactNode; pathLabel: string;
  icon: ReactNode; closeIcon: ReactNode; label: string; placeholder: string; closeLabel: string; matchLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const handledFocusRequest = useRef(0);
  useEffect(/** Shortcuts disclose only the mounted surface's field. */ () => {
    if (handledFocusRequest.current === focusRequest) return;
    handledFocusRequest.current = focusRequest;
    if (visible && focusRequest > 0) setOpen(true);
  }, [focusRequest, visible]);
  useEffect(/** Focus after disclosure commits; repeated shortcuts select the current term. */ () => {
    if (!open || !visible) return;
    input.current?.focus(); input.current?.select();
  }, [open, focusRequest, visible]);
  /** Clear highlights, dismiss Find and restore focus to its persistent trigger. */
  const close = (): void => { onChange(""); setOpen(false); button.current?.focus({ preventScroll: true }); };
  return <div className={`kplex-find${visible ? "" : " is-suspended"}`} aria-hidden={!visible} inert={!visible} onPointerDown={/** Editing Find must not start a canvas pan or resize. */ (event) => event.stopPropagation()}>
    <button ref={button} type="button" className="kplex-icon-button" aria-label={label} aria-expanded={open}
      onClick={/** The persistent magnifier supports tablets without a hardware keyboard. */ () => {
        if (open) input.current?.focus(); else setOpen(true);
      }}>{icon}</button>
    {open && <>
      <input ref={input} type="search" className="kplex-find-input" value={query} placeholder={placeholder} aria-label={label}
        onChange={/** Publish the literal term to the caller's projected matching/highlighting policy. */ (event) => onChange(event.currentTarget.value)}
        onKeyDown={/** Enter cycles matches; Escape dismisses only this Find session. */ (event) => {
          if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
          else if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); onNext(event.shiftKey); }
        }} />
      <button type="button" className="kplex-icon-button" aria-label={pathLabel} aria-pressed={includePath}
        onClick={/** Extend only this Find session; Vault search and its vocabulary remain independent. */ () => onIncludePathChange(!includePath)}>{pathIcon}</button>
      <span className="kplex-find-count" role="status" aria-live="polite">{matchLabel}</span>
      <button type="button" className="kplex-icon-button" aria-label={closeLabel} onClick={close}>{closeIcon}</button>
    </>}
  </div>;
}
