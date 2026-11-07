/** Portable calendar navigation over supplied local dates. The native shell owns dismissal,
 * Daily Notes lookup and effects; this component owns month/keyboard focus and exact-date input. */
import {useId, useLayoutEffect, useRef, useState, type KeyboardEvent} from "react";
import {calendarDay, calendarDayKey, calendarMonthDays, shiftCalendarDay, shiftCalendarMonth} from "../../core/plex/calendarDates";
import type {Translator} from "../../lang";
import {FormField, FormActions} from "../components/FormField";

/** Render a stable six-week calendar with native buttons, roving keyboard focus and a labelled date field. */
export function CalendarDatePicker({initialDate, today, dates, locale, weekStart, ready, translate, onChoose}: {
  initialDate: string; today: string; dates: ReadonlySet<string>; locale: string; weekStart: number;
  ready: boolean; translate: Translator; onChoose: (date: string) => void;
}) {
  const [selected, setSelected] = useState(initialDate), [month, setMonth] = useState(initialDate), [typed, setTyped] = useState(initialDate);
  const grid = useRef<HTMLDivElement>(null), focusDay = useRef(false), inputId = useId();
  const days = calendarMonthDays(month, weekStart), date = calendarDay(month)!;
  const monthLabel = new Intl.DateTimeFormat(locale, {month: "long", year: "numeric"}).format(date);
  const fullLabel = new Intl.DateTimeFormat(locale, {dateStyle: "full"});
  const weekdays = Array.from({length: 7}, /** The fixed reference Sunday is formatting input only. */ (_, index) => {
    const day = calendarDay(shiftCalendarDay("2026-11-01", (weekStart + index) % 7))!;
    return new Intl.DateTimeFormat(locale, {weekday: "short"}).format(day);
  });
  useLayoutEffect(/** Focus only a keyboard-requested day in this component's actual owning document. */ () => {
    if (focusDay.current) {focusDay.current = false; grid.current?.querySelector<HTMLButtonElement>(`[data-calendar-date="${selected}"]`)?.focus();}
  }, [selected, month]);
  /** Arrow/Page/Home/End navigation changes focus; Enter/Space retain native button selection. */
  const key = (event: KeyboardEvent<HTMLButtonElement>, value: string): void => {
    let next: string;
    const weekday = calendarDay(value)!.getDay(), offset = (weekday - weekStart + 7) % 7;
    switch (event.key) {
      case "ArrowLeft": next = shiftCalendarDay(value, -1); break;
      case "ArrowRight": next = shiftCalendarDay(value, 1); break;
      case "ArrowUp": next = shiftCalendarDay(value, -7); break;
      case "ArrowDown": next = shiftCalendarDay(value, 7); break;
      case "Home": next = shiftCalendarDay(value, -offset); break;
      case "End": next = shiftCalendarDay(value, 6 - offset); break;
      case "PageUp": next = shiftCalendarMonth(value, event.shiftKey ? -12 : -1); break;
      case "PageDown": next = shiftCalendarMonth(value, event.shiftKey ? 12 : 1); break;
      default: return;
    }
    event.preventDefault();event.stopPropagation();focusDay.current = true;setSelected(next);setMonth(next);setTyped(next);
  };
  return <div className="kplex-calendar-picker">
    <div className="kplex-calendar-heading">
      <button type="button" aria-label={translate("daily.previousMonth")} onClick={/** Month browsing does not select or create a note. */ () => {const next = shiftCalendarMonth(month, -1);setMonth(next);setSelected(next);}}>‹</button>
      <span aria-live="polite">{monthLabel}</span>
      <button type="button" aria-label={translate("daily.nextMonth")} onClick={/** Next month retains exact local calendar arithmetic. */ () => {const next = shiftCalendarMonth(month, 1);setMonth(next);setSelected(next);}}>›</button>
    </div>
    <div className="kplex-calendar-weekdays" aria-hidden="true">{weekdays.map(/** Weekday order follows the host locale. */ (label, index) => <span key={index}>{label}</span>)}</div>
    <div ref={grid} className="kplex-calendar-grid" role="group" aria-label={monthLabel}>
      {days.map(/** Date availability is supplied metadata, never an implicit note read or creation. */ value => <button type="button" key={value} data-calendar-date={value}
        className={`${value.slice(0, 7) === month.slice(0, 7) ? "" : "is-other-month"}${value === today ? " is-today" : ""}${dates.has(value) ? " has-note" : ""}`}
        aria-label={fullLabel.format(calendarDay(value)!)} aria-current={value === today ? "date" : undefined} tabIndex={value === selected ? 0 : -1} disabled={!ready}
        onFocus={/** The focused native day becomes the single keyboard entry point. */ () => setSelected(value)}
        onKeyDown={/** Keep focus navigation inside this owned calendar, including cross-month moves. */ event => key(event, value)}
        onClick={/** Only explicit activation navigates or requests creation confirmation. */ () => onChoose(value)}>{Number(value.slice(-2))}<span className="kplex-calendar-note-dot" aria-hidden="true">{dates.has(value) ? "•" : ""}</span></button>)}
    </div>
    <FormField label={translate("daily.date")} controlId={inputId}><input id={inputId} type="date" value={typed} onChange={/** Native date editing selects a local value without navigating. */ event => {const value = event.currentTarget.value;setTyped(value);if (calendarDay(value)) {setSelected(value);setMonth(value);}}}
      onKeyDown={/** A valid exact date can be submitted directly from the field. */ event => {if (event.key === "Enter" && ready && calendarDay(typed)) {event.preventDefault();event.stopPropagation();onChoose(typed);}}} /></FormField>
    <FormActions status={!ready ? translate("daily.loading") : translate("daily.existingHint")}>
      <button type="button" onClick={/** Today changes the browsed month without creating a note. */ () => {const value = calendarDayKey(calendarDay(today)!);setSelected(value);setMonth(value);setTyped(value);}}>{translate("pins.today")}</button>
      <button type="button" className="mod-cta" disabled={!ready || !calendarDay(typed)} onClick={/** Submit only the date still shown in the labelled field. */ () => onChoose(typed)}>{translate("daily.go")}</button>
    </FormActions>
  </div>;
}
