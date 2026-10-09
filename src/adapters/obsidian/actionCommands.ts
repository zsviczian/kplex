/**
 * Public Obsidian command publication adapter. A stable-ID diff owns registered state independently
 * of persisted desired state; editor invocation handles stay in the host and expire after execution.
 */
import type { Command, Editor, MarkdownFileInfo, MarkdownView, Plugin } from "obsidian";
import { ACTION_CATALOG, type ActionId, type ActionRequest } from "../../core/plex/actions";
import { isActionPublished, type ActionPreferencesV1 } from "../../core/plex/actionPreferences";
import type { ActionManager } from "../../application/ActionManager";
export type ActionCommandOptions = Readonly<{host: Pick<Plugin, "addCommand" | "removeCommand">; manager: ActionManager; translate: (key: string) => string; makeRequest: (id: ActionId, editor?: Editor, context?: MarkdownView | MarkdownFileInfo) => ActionRequest; releaseRequest?: (request: ActionRequest) => void}>;
export type CommandPublicationResult = Readonly<{registered: readonly string[]; failures: readonly Readonly<{id: string; error: unknown}>[]}>;
/** Own only actual registered commands; local action availability never depends on publication. */
export class ActionCommandPublisher {
  private readonly actual = new Map<string, string>();
  /** Inject the public plugin command API and short-lived editor invocation adapter. */
  constructor(private readonly options: ActionCommandOptions) {}
  /** Reconcile add/remove changes, retaining accurate actual state when one native call fails. */
  sync(preferences: ActionPreferencesV1): CommandPublicationResult {
    const desired = new Map(ACTION_CATALOG.filter(/** Only publishable enabled descriptors appear globally. */ action => action.command && isActionPublished(preferences, action.id)).map(/** Local IDs remain literal metadata. */ action => [action.command!.id, action]));
    const failures: {id: string; error: unknown}[] = [];
    for (const [id, label] of this.actual) {
      const action = desired.get(id), currentLabel = action ? this.options.translate(action.labelKey) : null;
      if (action && currentLabel === label) continue;
      try { this.options.host.removeCommand(id); this.actual.delete(id); } catch (error) { failures.push({id, error}); }
    }
    for (const [id, action] of desired) {
      if (this.actual.has(id)) continue;
      const name = this.options.translate(action.labelKey);
      const command: Command = {id, name};
      if (action.command!.kind === "editor") {
        /** Resolve the supplied editor afresh for checking and execution; never infer graph fields. */
        command.editorCheckCallback = (checking, editor, context): boolean => this.invoke(checking, this.options.makeRequest(action.id, editor, context));
      } else {
        /** Ordinary commands carry no invented key event or palette/hotkey distinction. */
        command.checkCallback = (checking): boolean => this.invoke(checking, this.options.makeRequest(action.id));
      }
      try { this.options.host.addCommand(command); this.actual.set(id, name); } catch (error) { failures.push({id, error}); }
    }
    return {registered: [...this.actual.keys()], failures};
  }
  /** Expose a copy of actual native publication, including partial-failure reconciliation state. */
  registeredIds(): readonly string[] { return [...this.actual.keys()]; }
  /** Remove the adapter's registrations using unprefixed local IDs and public APIs only. */
  dispose(): CommandPublicationResult {
    const failures: {id: string; error: unknown}[] = [];
    for (const id of this.actual.keys()) { try { this.options.host.removeCommand(id); this.actual.delete(id); } catch (error) { failures.push({id, error}); } }
    return {registered: [...this.actual.keys()], failures};
  }
  /** Release checking tokens immediately; execution tokens survive until dispatch settles. */
  private invoke(checking: boolean, request: ActionRequest): boolean {
    let accepted = false;
    try {
      accepted = this.options.manager.check(request).state !== "disabled";
      if (!checking && accepted) {
        void this.options.manager.dispatch(request).finally(/** Short-lived editor capabilities cannot outlive their invocation. */ () => this.options.releaseRequest?.(request));
        return true;
      }
      return accepted;
    } finally { if (checking || !accepted) this.options.releaseRequest?.(request); }
  }
}
/** Construct the public-API publisher without taking ownership of plugin lifecycle. */
export function createActionCommandPublisher(options: ActionCommandOptions): ActionCommandPublisher { return new ActionCommandPublisher(options); }
