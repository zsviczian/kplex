/** Shared saved-pin presentation over caller-supplied cached rows. The existing node-list style
 * owner supplies paint; host callbacks own activation, unpin and native reorder-menu effects.
 * Generic drag mechanics retain their document lifetime without acquiring graph/source data.
 * Editing is local to this mounted row; navigation and grab scrolling remain available in both modes. */
import {useState, type CSSProperties, type MouseEvent} from "react";
import type {Translator} from "../lang";
import {ObsidianIcon} from "./ObsidianIcon";
import {ReorderableList, type ReorderMove} from "./components/ReorderableList";
import {TooltipButton} from "./components/TooltipButton";

/** Unavailable saved entries remain visible and keep their canonical slot and reorder identity. */
export type PinnedNodeRow = Readonly<{id: string; path: string | null; label: string; icon: string; style?: CSSProperties; active: boolean; available: boolean; actionable?: boolean; detail?: string}>;

/** Render one finite globally saved list. Stationary/keyboard handle activation opens the same
 * host-native movement menu; a committed pointer drag requests exactly one guarded relative move. */
export function PinnedNodeBar({rows, translate, onActivate, onRemove, onMove, onMenu, onCalendar}: {
  rows: readonly PinnedNodeRow[]; translate: Translator; onActivate: (id: string) => void; onRemove: (id: string) => void;
  onMove: (move: ReorderMove) => void; onMenu: (id: string, button: HTMLButtonElement) => void;
  onCalendar?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  return <div className="kplex-pinned-row">
    <div className="kplex-pin-tools">
      <TooltipButton className={`kplex-icon-button kplex-pin-edit-toggle${editing ? " is-on" : ""}`} label={translate("pins.edit")} aria-pressed={editing}
        onClick={/** A view-local switch reveals mutations without changing the saved pin order. */ () => setEditing(value => !value)}><ObsidianIcon name="pencil" size={15} /></TooltipButton>
      {onCalendar && <TooltipButton className="kplex-icon-button kplex-pin-calendar" label={translate("daily.calendar")} aria-haspopup="dialog"
        onClick={/** The host retains date formatting and navigation ownership. */ onCalendar}><ObsidianIcon name="calendar-days" size={15} /></TooltipButton>}
    </div>
    <ReorderableList ids={rows.map(/** Ordering includes missing entries rather than graph-filtered rows. */ row => row.id)} className="kplex-pinned-bar" label={translate("app.pinnedNodes")} onMove={onMove} reorderEnabled={editing} grabScroll>
    {rows.map(/** Keep legacy paint/selectors and per-entry actions independent of the drag handle. */ row => <div key={row.id} role="listitem" data-reorder-id={row.id}
      style={row.style} className={`kplex-pinned-chip${row.active ? " is-active" : ""}${row.available ? "" : " is-unavailable"}`}>
      {editing && <button type="button" className="kplex-pin-reorder-handle" data-reorder-handle aria-label={translate("pins.reorder", {title: row.label})}
        onClick={/** Native menus provide the keyboard-accessible alternative to pointer dragging. */ event => onMenu(row.id, event.currentTarget)}
        onContextMenu={/** Context invocation retains the same captured saved entry. */ (event: MouseEvent<HTMLButtonElement>) => {event.preventDefault();onMenu(row.id, event.currentTarget);}}><ObsidianIcon name="grip-vertical" size={12} /></button>}
      <button type="button" className="kplex-pinned-open" data-kplex-pinned-path={row.path ?? undefined} disabled={!(row.actionable ?? row.available)} aria-label={`${row.label}\n${row.detail ?? row.path ?? ""}`}
        onClick={/** Only the host performs explicit guarded navigation. */ () => onActivate(row.id)}><ObsidianIcon name={row.icon} size={12} /><span>{row.label}</span></button>
      {editing && <button type="button" className="kplex-pinned-remove" aria-label={translate("app.unpinNode", {title: row.label})}
        onClick={/** Removing an unavailable bookmark never requires a graph page or a note write. */ () => onRemove(row.id)}><ObsidianIcon name="x" size={11} /></button>}
    </div>)}
    </ReorderableList>
  </div>;
}
