/** Shared pointer/keyboard-activation modifier check for React and native recovery controls.
 * Reads only the delivered event; no global key state or listeners outlive the interaction. */
export type ModifierClick = Readonly<{ altKey: boolean; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }>;

/** Match one advertised connector modifier without stealing combined drag/navigation gestures. */
export function matchesSourceModifier(event: ModifierClick, preference: "none" | "mod" | "shift", primary: "meta" | "control" | null): boolean {
  if (preference === "none" || event.altKey) return false;
  if (preference === "shift") return event.shiftKey && !event.ctrlKey && !event.metaKey;
  return !event.shiftKey && (primary === "meta" ? event.metaKey && !event.ctrlKey : primary === "control" && event.ctrlKey && !event.metaKey);
}

/** Any modifier opts into the control's advertised alternate click action, including combinations. */
export function hasClickModifier(event: ModifierClick): boolean {
  return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
}
