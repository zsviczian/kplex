/** Current-Plex Find field: caller-owned projected matches/reveal actions, local focus and disclosure, no dropdown. */
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Match a literal case-insensitive term against visible labels, aliases and identities. */
export function matchesFindText(query: string, values: readonly string[]): boolean {
  const term = query.trim().toLocaleLowerCase();
  return Boolean(term) && values.some(/** Each caller-projected facet is independently searchable. */ (value) => value.toLocaleLowerCase().includes(term));
}

/** Expose a touch-accessible magnifier and a Find field independent of Vault search. */
export function PlexFind({ query, onChange, onNext, focusRequest, icon, closeIcon, label, placeholder, closeLabel, matchLabel }: {
  query: string; onChange: (query: string) => void; onNext: (backward: boolean) => void; focusRequest: number;
  icon: ReactNode; closeIcon: ReactNode; label: string; placeholder: string; closeLabel: string; matchLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(/** Shortcuts disclose only the mounted surface's field. */ () => {
    if (focusRequest > 0) setOpen(true);
  }, [focusRequest]);
  useEffect(/** Focus after disclosure commits; repeated shortcuts select the current term. */ () => {
    if (!open) return;
    input.current?.focus(); input.current?.select();
  }, [open, focusRequest]);
  /** Clear highlights, dismiss Find and restore focus to its persistent trigger. */
  const close = (): void => { onChange(""); setOpen(false); button.current?.focus({ preventScroll: true }); };
  return <div className="kplex-find" onPointerDown={/** Editing Find must not start a canvas pan or resize. */ (event) => event.stopPropagation()}>
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
      <span className="kplex-find-count" role="status" aria-live="polite">{matchLabel}</span>
      <button type="button" className="kplex-icon-button" aria-label={closeLabel} onClick={close}>{closeIcon}</button>
    </>}
  </div>;
}
