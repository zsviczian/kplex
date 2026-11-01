/**
 * Owner-document Footprints disclosure. The native view owns visits; this UI resolves only a
 * bounded scroll window and routes selection back through normal Plex activation. No settings,
 * graph acquisition, camera or navigation work occurs on open/close/reset.
 */
import { useCallback, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { PlexFootprints, FootprintVisit } from "../application/PlexFootprints";
import type {ClipboardSession, ClipboardState} from "../application/ClipboardSession";
import type { Translator } from "../lang";
import { FloatingLayer } from "./components/FloatingLayer";
import { ActionButton } from "./components/ActionButton";
import { collectionRange } from "./components/collectionWindow";
import { ObsidianIcon } from "./ObsidianIcon";
import {footprintsMarkdownSession} from "./footprintsMarkdown";

const ROW_HEIGHT = 40;
const WINDOW_SIZE = 40;

/** Project one visible reference through existing node-list identity/presentation owners. */
export type FootprintRow = {label: string; icon: string; available: boolean};

/** Show newest visits first without reversing/copying the retained chronological trail. */
export function PlexFootprintsPanel({trail, translate, readRow, formatLink, navigate}: {
  trail: PlexFootprints; translate: Translator; readRow: (visit: FootprintVisit) => FootprintRow;
  formatLink: (visit: FootprintVisit) => string;
  navigate: (visit: FootprintVisit) => void;
}) {
  const revision = useSyncExternalStore(trail.subscribe, trail.getSnapshot);
  const [open, setOpen] = useState(false);
  const [windowState, setWindowState] = useState({start: 0, length: trail.length});
  const {start, length: previousLength} = windowState;
  const length = trail.length;
  /** Commit the offset and its length together, including a short list whose offset stays zero. */
  const setStart = useCallback((next: number): void => {
    setWindowState(previous => previous.start === next && previous.length === length ? previous : {start: next, length});
  }, [length]);
  const [focused, setFocused] = useState(0);
  const anchor = useRef<HTMLButtonElement>(null), panel = useRef<HTMLDivElement>(null), list = useRef<HTMLDivElement>(null);
  const following = useRef(true), initialFocus = useRef(false);
  const scrollPosition = useRef(0);
  const clipboard = useRef<ClipboardSession | null>(null);
  const [copyState, setCopyState] = useState<ClipboardState>("idle");
  useLayoutEffect(/** Closing/unmounting retires clipboard feedback without cancelling an accepted native write. */ () => {
    if (!open) setCopyState("idle");
    return () => {clipboard.current?.dispose();clipboard.current = null;};
  }, [open]);
  /** Snapshot every visit only on explicit copy; invoke the owning writer before any await. */
  const copyMarkdown = (button: HTMLButtonElement): void => {
    if (clipboard.current?.state === "copying") return;
    clipboard.current?.dispose();
    const session = footprintsMarkdownSession(trail, formatLink, button.ownerDocument);
    clipboard.current = session;session.listen(setCopyState);session.copy();
  };
  // A prepend shifts display positions, but older readers keep the same visit and focus anchor.
  const added = open && !following.current ? Math.max(0, trail.length - previousLength) : 0;
  const range = collectionRange(open ? trail.length : 0, start + added, WINDOW_SIZE);
  // Scroll anchoring/focus can render the same window again; resolve its rows only when it changes.
  const rows = useMemo(() => {
    const visible: Array<{visit: FootprintVisit; ordinal: number; row: FootprintRow}> = [];
    for (let position = range.start; position < range.end; position++) {
      const ordinal = length - 1 - position;
      const visit = trail.at(ordinal);if (visit) visible.push({visit, ordinal, row: readRow(visit)});
    }
    return visible;
  }, [trail, revision, length, range.start, range.end, readRow]);
  /** Existing shared layer owns Escape, outside dismissal and Escape focus return. */
  const dismiss = useCallback((): void => setOpen(false), []);
  useLayoutEffect(/** Reveal latest on opening; subsequent appends do not pull a reader away from older visits. */ () => {
    const delta = trail.length - previousLength;
    if (!open || !list.current) return;
    if (following.current) {
      const ordinal = Math.max(0, trail.length - 1);
      if (list.current.contains(list.current.ownerDocument.activeElement)) initialFocus.current = true;
      setStart(0);setFocused(ordinal);
      list.current.scrollTop = 0;scrollPosition.current = 0;
    } else if (delta > 0) {
      // Chromium may already anchor this prepend. Use the last observed offset, not its adjusted one.
      list.current.scrollTop = scrollPosition.current + delta * ROW_HEIGHT;
      scrollPosition.current = list.current.scrollTop;
      setStart(Math.max(0, Math.floor(scrollPosition.current / ROW_HEIGHT) - 4));
    }
  }, [open, revision, trail, previousLength, setStart]);
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
        following.current = true;initialFocus.current = true;scrollPosition.current = 0;setStart(0);setFocused(Math.max(0, trail.length - 1));setOpen(value => !value);
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
          <ActionButton label={translate("footprints.copyMarkdown")} icon={<ObsidianIcon name={copyState === "copied" ? "check" : "copy"} size={16} />} disabled={!trail.length || copyState === "copying"}
            onClick={/** Copy the whole displayed trail order, including repeated visits outside the rendered window. */ event => copyMarkdown(event.currentTarget)} />
          <ActionButton label={translate("footprints.startHere")} icon={<ObsidianIcon name="map-pin" size={16} />} disabled={trail.length < 2}
            onClick={/** Reset only this owner; global history, center and other trails are unchanged. */ () => {following.current = true;trail.startHere();}} /></div>
        {copyState !== "idle" && <div role="status" className={`kplex-footprints-empty${copyState === "failed" ? " mod-warning" : ""}`}>{translate(copyState === "copied" ? "footprints.copied" : copyState === "failed" ? "footprints.copyFailed" : "footprints.copying")}</div>}
        {!trail.length && <div className="kplex-footprints-empty">{translate("footprints.empty")}</div>}
        <div ref={list} className="kplex-footprints-list" role="list"
          onScroll={/** Resolve only the scroll viewport plus bounded overscan. */ event => {
            const el = event.currentTarget;scrollPosition.current = el.scrollTop;following.current = el.scrollTop <= 1;
            setStart(Math.max(0, Math.floor(el.scrollTop / ROW_HEIGHT) - 4));
          }} onKeyDown={/** Move in displayed order: Home is newest, End is oldest. */ event => {
            const key = event.key;if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(key)) return;
            event.preventDefault();event.stopPropagation();
            const ordinal = key === "Home" ? trail.length - 1 : key === "End" ? 0 : Math.max(0, Math.min(trail.length - 1, focused + (key === "ArrowDown" ? -1 : 1)));
            const position = trail.length - 1 - ordinal;
            following.current = ordinal === trail.length - 1;
            initialFocus.current = true;setFocused(ordinal);setStart(Math.max(0, position - 4));
            if (list.current) list.current.scrollTop = Math.max(0, position * ROW_HEIGHT - list.current.clientHeight / 2);
          }}>
          <div aria-hidden="true" style={{height: range.start * ROW_HEIGHT}} />
          {rows.map(({visit, ordinal, row}) => <div role="listitem" key={visit.id} aria-posinset={trail.length - ordinal} aria-setsize={trail.length}>
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
