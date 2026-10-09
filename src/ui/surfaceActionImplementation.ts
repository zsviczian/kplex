/**
 * Small shared adapter for catalog-backed surface controls. Implementations may return explicit
 * workflow/mutation outcomes; ordinary native control callbacks return void/booleans and complete
 * without claiming a vault write. Availability is synchronous and effects execute only after acceptance.
 */
import type { ActionContext, ActionImplementation } from "../application/ActionManager";
import type { ActionOutcome } from "../core/plex/actions";

/** Recognize explicit code-owned outcomes without interpreting arbitrary host return values as commits. */
function isOutcome(value: unknown): value is ActionOutcome {
  if (!value || typeof value !== "object") return false;
  const status: unknown = Reflect.get(value, "status");
  return typeof status === "string" && ["completed", "opened", "committed", "saved-pending", "cancelled", "unavailable", "failed"].includes(status);
}

/** Wrap an existing surface operation without duplicating dispatch, graph state or mutation policy. */
export function surfaceAction(execute: (context: ActionContext) => unknown,
  available: (context: ActionContext) => boolean = /** Most presentation controls need only a live surface. */ () => true): ActionImplementation {
  return {
    availability: /** Callers supply bounded current-state predicates; no effects run while checking. */ context => available(context)
      ? { state: "enabled" } : { state: "disabled", reasonKey: "actions.unavailable" },
    execute: /** Preserve the actual opened/committed/pending outcome through the common manager. */ async context => {
      const outcome = await execute(context);
      return isOutcome(outcome) ? outcome : { status: "completed" };
    },
  };
}
