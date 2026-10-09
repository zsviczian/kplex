/**
 * DOM ownership policy and accepted-event arbitration for focused K-Plex action regions. These
 * host-bound helpers derive nodes from the owning document without realm-sensitive constructors.
 * Acceptance marks a native event only after eligibility succeeds; unrelated surfaces never consume it.
 * Explicitly modified physical Dead-key candidates share the portable preference predicate, while
 * the dispatcher keeps every Dead key in native editing/search/control regions under host ownership.
 */
import type { FocusRegion } from "../core/plex/actions";
import { isModifiedPhysicalDeadKey } from "../core/plex/actionPreferences";

const acceptedEvents = new WeakSet<KeyboardEvent>();

/** Classify only elements contained by this surface; native widget protocols retain their region. */
export function plexFocusRegion(root: HTMLElement, target: EventTarget | null): FocusRegion {
  if (!target || !("nodeType" in target) || !root.contains(target as Node)) return "external";
  const element = target as Element;
  if (element.closest(".kplex-central-editor-content")) return "embedded-editor";
  if (element.closest(".kplex-search")) return "search";
  if (element.closest(".kplex-find")) return "find";
  if (element.closest("input, textarea, select, button, a, [contenteditable]:not([contenteditable='false']), [role='button'], [role='textbox'], [role='combobox'], [role='slider'], [role='menu'], [role='dialog'], .kplex-filter-panel")) return "native-control";
  return "graph";
}

/** Preserve composition and native Dead keys while admitting explicit physical-code candidates for graph matching. */
export function usablePlexKeyEvent(event: KeyboardEvent): boolean {
  if (event.defaultPrevented || event.isComposing || event.key === "Process" || event.getModifierState?.("AltGraph")) return false;
  return event.key !== "Dead" || isModifiedPhysicalDeadKey({ key: event.key, code: event.code,
    ctrlKey: event.ctrlKey, metaKey: event.metaKey, altKey: event.altKey, shiftKey: event.shiftKey,
    isComposing: event.isComposing, altGraph: event.getModifierState?.("AltGraph") ?? false });
}

/** Consume and mark an accepted event before asynchronous execution can yield to another transport. */
export function acceptPlexKeyEvent(event: KeyboardEvent): void {
  acceptedEvents.add(event);
  event.preventDefault();
  event.stopPropagation();
}

/** Identify repeated Scope/DOM/React deliveries of the same accepted native event. */
export function isAcceptedPlexKeyEvent(event: KeyboardEvent): boolean { return acceptedEvents.has(event); }
