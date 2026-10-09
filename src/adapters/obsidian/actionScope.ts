/**
 * Narrow native Scope fall-through for one already-delivered key event. A concrete public
 * Scope.register handler ends native matching even when its callback returns undefined, so
 * rejected local actions cannot otherwise retain the captured parent's normal shortcuts.
 * This feature-detected unofficial method preserves the original event/context and receiver;
 * it neither registers a wildcard nor synthesizes input or discovers global command handlers.
 *
 * Minimum supported host is 1.13.0; the method is feature-detected rather than assumed.
 * Reviewed declarations (both return unknown and mark this method unofficial):
 * https://raw.githubusercontent.com/obsidian-typings/obsidian-typings/release/obsidian-public/1.13.4/src/obsidian/augmentations/Scope.d.ts
 * https://raw.githubusercontent.com/obsidian-typings/obsidian-typings/release/obsidian-public/1.14.4/src/obsidian/augmentations/Scope.d.ts
 */
import type { KeymapInfo, Scope } from "obsidian";

type DispatchableScope = Scope & { handleKey: (event: KeyboardEvent, keypress: KeymapInfo) => unknown };

/** Narrow only the reviewed callable boundary; hosts without it safely decline delegation. */
function isDispatchableScope(scope: Scope): scope is DispatchableScope {
  return "handleKey" in scope && typeof scope.handleKey === "function";
}

/** Forward once through the exact parent chosen by the owning native region, retaining its receiver. */
export function forwardActionScopeKey(parent: Scope, event: KeyboardEvent, keypress: KeymapInfo): unknown {
  if (!isDispatchableScope(parent)) return;
  return parent.handleKey(event, keypress);
}
