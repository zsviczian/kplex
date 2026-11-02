/** Portable section-wide visibility controls. Shared finite policy supplies no-op state; the host
 * owns one durable write and presentation refresh. Unmount retires only transient button state. */
import {useEffect, useRef, useState} from "react";
import {contentVisibilityPatch, type ContentVisibilityScope, type ContentVisibilityValues} from "../../core/plex/contentVisibility";
import type {Translator} from "../../lang";

/** Render explicit accessible choices without changing lenses, filters or unrelated preferences. */
export function ContentVisibilityActions({values, scope, onSet, translate}: Readonly<{
  values: ContentVisibilityValues; scope: ContentVisibilityScope; onSet: (enabled: boolean) => Promise<void>; translate: Translator;
}>) {
  const operation = useRef({alive: true, pending: false});
  const [pending, setPending] = useState(false), [failed, setFailed] = useState(false);
  useEffect(/** React owns no persistent work; stale completions may not touch a retired surface. */ () => {
    const owner = operation.current;owner.alive = true;return /** Release transient rendering authority, not the submitted host save. */ () => {owner.alive = false;};
  }, []);
  /** Admit one explicit value, and leave current controls unchanged if persistence rejects. */
  const apply = async (enabled: boolean): Promise<void> => {
    const owner = operation.current;if (!owner.alive || owner.pending || !Object.keys(contentVisibilityPatch(values, scope, enabled)).length) return;
    owner.pending = true;setPending(true);setFailed(false);
    try {await onSet(enabled);} catch {if (owner.alive) setFailed(true);}
    finally {owner.pending = false;if (owner.alive) setPending(false);}
  };
  return <div className="kplex-visibility-bulk">
    <div className="kplex-visibility-bulk-buttons">{[true, false].map(/** Explicit states make mixed values predictable. */ enabled =>
      <button key={String(enabled)} type="button" disabled={pending || !Object.keys(contentVisibilityPatch(values, scope, enabled)).length}
        aria-label={translate(enabled ? "visibility.enableAll" : "visibility.disableAll")}
        onClick={/** This local gesture submits one shared bulk operation. */ () => {void apply(enabled);}}>{translate(enabled ? "visibility.enableAll" : "visibility.disableAll")}</button>)}</div>
    {failed && <span role="alert">{translate("visibility.saveFailed")}</span>}
  </div>;
}
