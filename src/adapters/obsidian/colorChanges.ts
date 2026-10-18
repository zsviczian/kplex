/** Existing presentation notifications drive open color surfaces without rescanning configuration on source events. */
import {STYLE_SETTINGS_KEYS} from "../../core/contracts/appearance";

type AppearanceOwners = Readonly<Partial<Record<typeof STYLE_SETTINGS_KEYS[number], unknown>>>;
type AppearanceChange = Readonly<{changedKeys?: readonly string[]}>;

/** Observe published appearance owners and explicit in-place legacy edits through the existing event channel. */
export function subscribeAppearanceSources(
  subscribe: (changed: (event?: AppearanceChange) => void) => () => void,
  read: () => AppearanceOwners,
  changed: () => void,
): () => void {
  const initial = read();
  let alive = true, owners = STYLE_SETTINGS_KEYS.map(key => initial[key]);
  const release = subscribe(event => {
    if (!alive) return;
    const current = read();
    const signaled = event?.changedKeys?.some(key => STYLE_SETTINGS_KEYS.some(field => field === key));
    if (!signaled && STYLE_SETTINGS_KEYS.every((key, index) => current[key] === owners[index])) return;
    owners = STYLE_SETTINGS_KEYS.map(key => current[key]); changed();
  });
  return () => {if (!alive) return; alive = false; release(); owners = [];};
}
