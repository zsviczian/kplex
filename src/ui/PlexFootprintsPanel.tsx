/**
 * Owner-document Footprints disclosure. The native view owns visits; this UI resolves only a
 * bounded scroll window and routes selection back through normal Plex activation. No settings,
 * graph acquisition, camera or navigation work occurs on open/close/reset.
 */
import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { PlexFootprints, FootprintVisit } from "../application/PlexFootprints";
import type { Translator } from "../lang";
import { FloatingLayer } from "./components/FloatingLayer";
import { collectionRange } from "./components/collectionWindow";
import { ObsidianIcon } from "./ObsidianIcon";

const ROW_HEIGHT = 40;
const WINDOW_SIZE = 40;

/** Project one visible reference through existing node-list identity/presentation owners. */
export type FootprintRow = {label: string; icon: string; available: boolean};

/** Render chronological repeated visits with a bounded DOM, native icons and shared dismissal. */
export function PlexFootprintsPanel({trail, translate, readRow, navigate}: {
  trail: PlexFootprints; translate: Translator; readRow: (visit: FootprintVisit) => FootprintRow;
  navigate: (visit: FootprintVisit) => void;
}) {
  const revision = useSyncExternalStore(trail.subscribe, trail.getSnapshot);
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(0);
  const [focused, setFocused] = useState(0);
  const anchor = useRef<HTMLButtonElement>(null), panel = useRef<HTMLDivElement>(null), list = useRef<HTMLDivElement>(null);
  const following = useRef(true), initialFocus = useRef(false);
  const range = collectionRange(open ? trail.length : 0, start, WINDOW_SIZE);
  const rows: Array<{visit: FootprintVisit; ordinal: number; row: FootprintRow}> = [];
  for (let ordinal = range.start; ordinal < range.end; ordinal++) {
    const visit = trail.at(ordinal);if (visit) rows.push({visit, ordinal, row: readRow(visit)});
  }
  /** Existing shared layer owns Escape, outside dismissal and Escape focus return. */
  const dismiss = useCallback((): void => setOpen(false), []);
  useLayoutEffect(/** Reveal latest on opening; subsequent appends do not pull a reader away from older visits. */ () => {
    if (!open || !list.current) return;
    if (following.current) {
      const ordinal = Math.max(0, trail.length - 1);
      if (list.current.contains(list.current.ownerDocument.activeElement)) initialFocus.current = true;
      setStart(Math.max(0, ordinal - WINDOW_SIZE + 1));setFocused(ordinal);
      list.current.scrollTop = trail.length * ROW_HEIGHT;
    }
  }, [open, revision, trail]);
  useLayoutEffect(/** Opening/keyboard movement focuses only an already-mounted row in this document. */ () => {
    if (!open || !initialFocus.current) return;
    const row = panel.current?.querySelector<HTMLButtonElement>(`[data-footprint-ordinal="${focused}"]`);
    if (row) {row.focus({preventScroll: true});initialFocus.current = false;}
  }, [open, start, focused]);
  return <>
    <button ref={anchor} type="button" className="kplex-icon-button kplex-action-button kplex-footprints-trigger"
      aria-label={translate("footprints.title")} aria-expanded={open} aria-haspopup="dialog"
      onPointerDown={/** Disclosing a trail must not begin a graph gesture. */ event => event.stopPropagation()}
      onClick={/** Each disclosure starts at the latest visit; retained visits remain native-view owned. */ () => {
        following.current = true;initialFocus.current = true;setStart(Math.max(0, trail.length - WINDOW_SIZE));setFocused(Math.max(0, trail.length - 1));setOpen(value => !value);
      }}><ObsidianIcon name="footprints" size={14} /></button>
    <FloatingLayer open={open} anchorRef={anchor} panelRef={panel} insideRoots={/** Retain trigger and panel as one disclosure. */ () => [anchor.current, panel.current]}
      onDismiss={dismiss} dismissWhenAnchorHidden portalTarget={/** Body portal remains above native adjacent panes in the owning document. */ doc => doc.body}
      positioning={{preferredWidth: 360, minimumWidth: 220, viewportMargin: 12, anchorGap: 6, minimumMaxHeight: 140}}>
      {/** Shared geometry owns viewport clamping; only the list scrolls. */ style => <div ref={panel} className="kplex-footprints-panel" style={style}
        role="dialog" aria-label={translate("footprints.title")} data-kplex-tooltip-scope
        onPointerDown={/** Touch/selection inside the portal cannot initiate graph pan. */ event => event.stopPropagation()}
        onWheel={/** Retain list wheel scrolling independently from the Plex camera. */ event => event.stopPropagation()}
        onTouchMove={/** Native scrolling stays in this single bounded region. */ event => event.stopPropagation()}>
        <div className="kplex-footprints-heading"><strong>{translate("footprints.title")}</strong><span>{translate("footprints.count", {count: trail.length})}</span>
          <button type="button" className="kplex-icon-button kplex-action-button" aria-label={translate("footprints.startHere")} disabled={trail.length < 2}
            onClick={/** Reset only this owner; global history, center and other trails are unchanged. */ () => {following.current = true;trail.startHere();}}><ObsidianIcon name="map-pin" size={16} /></button></div>
        {!trail.length && <div className="kplex-footprints-empty">{translate("footprints.empty")}</div>}
        <div ref={list} className="kplex-footprints-list" role="list"
          onScroll={/** Resolve only the scroll viewport plus bounded overscan. */ event => {
            const el = event.currentTarget;following.current = el.scrollHeight - el.clientHeight - el.scrollTop <= ROW_HEIGHT;
            setStart(Math.max(0, Math.floor(el.scrollTop / ROW_HEIGHT) - 4));
          }} onKeyDown={/** Roving rows support chronological keyboard navigation without activating on movement. */ event => {
            const key = event.key;if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(key)) return;
            event.preventDefault();event.stopPropagation();
            const ordinal = key === "Home" ? 0 : key === "End" ? trail.length - 1 : Math.max(0, Math.min(trail.length - 1, focused + (key === "ArrowDown" ? 1 : -1)));
            following.current = ordinal === trail.length - 1;
            initialFocus.current = true;setFocused(ordinal);setStart(Math.max(0, ordinal - 4));
            if (list.current) list.current.scrollTop = Math.max(0, ordinal * ROW_HEIGHT - list.current.clientHeight / 2);
          }}>
          <div aria-hidden="true" style={{height: range.start * ROW_HEIGHT}} />
          {rows.map(({visit, ordinal, row}) => <div role="listitem" key={visit.id} aria-posinset={ordinal + 1} aria-setsize={trail.length}>
            <button type="button" className="kplex-footprints-row" data-footprint-ordinal={ordinal} tabIndex={ordinal === focused ? 0 : -1}
              aria-current={ordinal === trail.length - 1 ? "location" : undefined} aria-disabled={!row.available}
              onFocus={/** Keyboard/tab focus tracks this exact occurrence and preserves readers inspecting older visits. */ () => {if (ordinal < trail.length - 1) following.current = false;setFocused(ordinal);}}
              onClick={/** Missing/deleted references never create notes; selection appends through ordinary activation. */ () => {
                if (ordinal < trail.length - 1) following.current = false;
                if (row.available) navigate(visit);
              }}>
              <ObsidianIcon name={row.icon} size={16} /><span>{row.label}</span>{!row.available && <small>{translate("footprints.unavailable")}</small>}
            </button></div>)}
          <div aria-hidden="true" style={{height: Math.max(0, trail.length - range.end) * ROW_HEIGHT}} />
        </div>
      </div>}
    </FloatingLayer>
  </>;
}
