/** Session-owned native select inside Views and lenses; selection never follows global keyboard focus. */
import {useEffect, useId, useState, useSyncExternalStore} from "react";
import type {PlexViewSession} from "../../application/PlexViewSession";
import type {Translator} from "../../lang";
import {viewLabel} from "./labels";

/** Read the successful selection from the existing owner, including rejected or retired transitions. */
export function PlexViewSelector({session, translate}: {
  session: PlexViewSession; translate: Translator;
}) {
  useSyncExternalStore(session.subscribe, session.getSnapshot);
  const selected = session.definition.id;
  const [restriction, setRestriction] = useState<"editor" | "unavailable" | null>(null);
  const id = useId();
  useEffect(/** A later successful selection retires only the old explanation, never a lens draft. */ () => {setRestriction(null);}, [session, selected]);
  const definitions = [...session.registry.available].sort((first, second) =>
    Number(second.id === session.registry.fallbackId) - Number(first.id === session.registry.fallbackId));
  return <section className="kplex-filter-section kplex-view-selector">
    <label htmlFor={id}>{translate("view.choose")}
      <select id={id} value={selected} disabled={definitions.length === 1}
        aria-describedby={restriction ? `${id}-restriction` : undefined}
        onChange={event => {
          const requested = event.currentTarget.value;
          const current = session.capture();
          if (!current() || !session.registry.has(requested)) setRestriction("unavailable");
          else if (!session.canSelect(requested)) setRestriction("editor");
          else {session.select(requested);setRestriction(session.definition.id === requested ? null : "unavailable");}
          // Native select changes its DOM value before React receives the event. Restore the actual
          // owner value synchronously even when a repeated rejection does not schedule another render.
          event.currentTarget.value = session.definition.id;
        }}>
        {definitions.map(definition => <option key={definition.id} value={definition.id}>{viewLabel(definition.labelKey, translate)}</option>)}
      </select>
    </label>
    {restriction && <div id={`${id}-restriction`} role="status" className="kplex-lens-help">
      {translate(restriction === "editor" ? "view.editorTransitionBlocked" : "view.unavailable")}
    </div>}
  </section>;
}
