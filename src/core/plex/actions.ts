/**
 * Portable, finite action inventory and invocation contracts. Metadata contains no executable
 * permissions or host objects; application implementations and bounded surface snapshots own work.
 */
import type { RelationshipRole } from "../graph/relations";

export type ActionSource = "obsidian-command" | "local-hotkey" | "local-menu" | "toolbar" | "context-menu" | "composer" | "internal";
export type FocusRegion = "graph" | "search" | "find" | "pins" | "history" | "toolbar" | "embedded-editor" | "sidecar-editor" | "native-control" | "composer" | "action-menu" | "external";
export type CompletionIntent = "configured" | "return" | "another" | "follow" | "edit";
export type NodeRef = Readonly<{ identity: string; kind: "file" | "url" | "ghost" | "folder" | "tag" | "section"; path: string; fileIdentity?: string }>;
export type TargetRequest = Readonly<{ kind: "none" } | { kind: "center" } | { kind: "selected" } | { kind: "selected-or-center" } | { kind: "explicit"; node: NodeRef; occurrenceId?: string } | { kind: "edge"; origin: NodeRef; target: NodeRef; evidenceId?: string } | { kind: "editor-field"; editorInvocationId: string }>;
export type ResolvedTarget = Readonly<{ kind: "none" } | { kind: "node"; node: NodeRef; occurrenceId?: string } | { kind: "edge"; origin: NodeRef; target: NodeRef; evidenceId?: string } | { kind: "editor-field"; editorInvocationId: string }>;
export type Availability = Readonly<{ state: "enabled" } | { state: "preparable"; reasonKey: string } | { state: "disabled"; reasonKey: string }>;
export type ActionOutcome = Readonly<{ status: "completed" } | { status: "opened"; sessionId: string } | { status: "committed"; affected: readonly NodeRef[] } | { status: "saved-pending"; affected: readonly NodeRef[]; reasonKey: string } | { status: "cancelled" } | { status: "unavailable"; reasonKey: string } | { status: "failed"; reasonKey: string; diagnosticId?: string }>;
export const ACTION_DIRECTIONS = ["up", "down", "left", "right"] as const;
export const ACTION_RELATION_ROLES = ["parent", "child", "left", "right", "previous", "next"] as const satisfies readonly RelationshipRole[];
export const ACTION_PIN_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const SIMPLE_IDS = ["actions.open", "actions.configure", "keyboard.help", "graph.focus", "editor.focus", "selection.center", "node.activate", "node.open", "node.rename", "node.edit", "node.context-menu", "node.copy-link", "node.note-type", "node.delete", "node.open.focus-tab", "node.open.new-tab", "node.open.split", "node.open.window", "node.open.browser", "node.open.web-viewer", "nodes.open", "sections.toggle", "sections.fold-all", "sections.unfold-all", "section.toggle-level", "section.fold-descendants", "section.unfold-descendants", "search.focus", "find.focus", "history.back", "history.forward", "history.open", "pin.toggle", "pin.add", "pin.remove", "pins.open", "relationship.connect", "relationship.connect-visible", "relationship.details", "relationship.relink", "relationship.unlink", "view.depth.toggle", "view.aliases.toggle", "view.connectors.toggle", "view.filters.open", "view.lens.choose", "view.sort.choose", "view.visibility.open", "view.areas.toggle", "view.layout-controls", "view.zoom-in", "view.zoom-out", "view.fit", "view.center-editor.toggle", "view.sidecar.toggle", "view.sync.choose", "view.sidecar.position", "view.sidecar.detach", "view.sidecar.collapse-plex", "surface.open-tab", "surface.open-popout", "surface.open-sidepanel", "index.rebuild", "index.copy-diagnostics", "document.sync-from-center", "center.sync-from-document", "center.focus-active-note", "ontology.assign.select", "ontology.assign.parent", "ontology.assign.child", "ontology.assign.left", "ontology.assign.right", "ontology.assign.previous", "ontology.assign.next", "ontology.assign.hidden", "ontology.assign.excluded", "composer.submit", "composer.another", "composer.follow", "composer.edit", "composer.cancel"] as const;
export type ActionId = typeof SIMPLE_IDS[number] | `selection.${"move" | "section"}.${typeof ACTION_DIRECTIONS[number]}` | `view.pan.${typeof ACTION_DIRECTIONS[number]}` | `relationship.create-${"center" | "selected"}.${RelationshipRole}` | `pin.open-slot.${typeof ACTION_PIN_SLOTS[number]}`;
export type ActionMetadata = Readonly<{ id: ActionId; labelKey: string; descriptionKey: string; category: "navigation" | "nodes" | "relationships" | "view" | "tools"; keywordKeys: readonly string[]; target: TargetRequest["kind"]; localContexts: readonly FocusRegion[]; repeat: "allow" | "coalesce" | "deny"; effect: "read" | "ui" | "workflow" | "vault-write" | "semantic-setting"; command?: Readonly<{ id: string; kind: "ordinary" | "editor"; defaultPublished: boolean }> }>;
type CreateId = Extract<ActionId, `relationship.create-${string}`>;
/** Fixed variants carry their semantic role in the ID; only continuation is user input. */
export type ActionArgs<Id extends ActionId> = Id extends CreateId ? Readonly<{ continuation?: CompletionIntent }> : Id extends "view.sidecar.position" ? Readonly<{ position?: "left" | "right" | "above" | "below" }> : Readonly<Record<string, never>>;
export type ActionRequest = { [Id in ActionId]: Readonly<{ id: Id; source: ActionSource; surfaceId?: string; target?: TargetRequest; args?: ActionArgs<Id>; windowId?: string }> }[ActionId] | Readonly<{ id: ActionId; source: ActionSource; surfaceId?: string; target?: TargetRequest; args?: never; windowId?: string }>;
const LEGACY_COMMANDS: Partial<Record<ActionId, string>> = {
  "surface.open-tab": "kplex-start", "index.rebuild": "kplex-rebuild-index", "index.copy-diagnostics": "kplex-copy-index-diagnostics", "surface.open-popout": "kplex-open-popout", "surface.open-sidepanel": "kplex-open-sidepanel", "search.focus": "kplex-search",
  "relationship.create-center.child": "kplex-add-child", "relationship.create-center.parent": "kplex-add-parent", "relationship.create-center.left": "kplex-add-friend", "relationship.create-center.right": "kplex-add-challenger", "document.sync-from-center": "kplex-sync-tab-from-plex", "center.sync-from-document": "kplex-sync-plex-from-tab", "center.focus-active-note": "kplex-focus-active-note",
  "ontology.assign.select": "kplex-ontology-select", "ontology.assign.parent": "kplex-ontology-parent", "ontology.assign.child": "kplex-ontology-child", "ontology.assign.left": "kplex-ontology-left", "ontology.assign.right": "kplex-ontology-right", "ontology.assign.previous": "kplex-ontology-previous", "ontology.assign.next": "kplex-ontology-next", "ontology.assign.hidden": "kplex-ontology-hidden", "ontology.assign.excluded": "kplex-ontology-excluded",
};
const NEW_PUBLISHED: Partial<Record<ActionId, string>> = { "actions.open": "kplex-actions", "actions.configure": "kplex-configure-actions", "graph.focus": "kplex-focus-graph", "history.back": "kplex-history-back", "history.forward": "kplex-history-forward", "pin.toggle": "kplex-toggle-pin", "pins.open": "kplex-open-pins" };
const GRAPH: readonly FocusRegion[] = ["graph"];
const OWNED: readonly FocusRegion[] = ["graph", "search", "find", "pins", "history", "toolbar", "embedded-editor", "sidecar-editor", "native-control"];
/** Establish one target policy and maximum local context per finite descriptor. */
function descriptor(id: ActionId): ActionMetadata {
  const editor = id.startsWith("ontology.assign.");
  const session = id.startsWith("composer.");
  const target: TargetRequest["kind"] = editor ? "editor-field" : id.startsWith("relationship.create-center.") || id === "document.sync-from-center" || id.startsWith("sections.") ? "center" : id.startsWith("relationship.create-selected.") || id === "node.delete" || id.startsWith("section.") ? "selected" : id.startsWith("node.") || id.startsWith("pin.") && !id.startsWith("pin.open-slot.") || id.startsWith("relationship.") ? "selected-or-center" : "none";
  const commandId = LEGACY_COMMANDS[id] ?? NEW_PUBLISHED[id] ?? `kplex-action-${id.replaceAll(".", "-")}`;
  return { id, labelKey: `actions.${id}`, descriptionKey: `actions.${id}.description`, keywordKeys: [], target,
    category: id.startsWith("relationship.") ? "relationships" : id.startsWith("node.") || id.startsWith("pin.") ? "nodes" : id.startsWith("view.") || id.startsWith("section") ? "view" : id.startsWith("selection.") || id.startsWith("history.") || id.endsWith("focus") ? "navigation" : "tools",
    localContexts: editor ? ["embedded-editor", "sidecar-editor"] : session ? ["composer"] : ["graph.focus", "editor.focus", "search.focus"].includes(id) ? OWNED : id === "keyboard.help" ? OWNED.filter(/** Editors own their native help keys. */ region => !region.endsWith("editor")) : GRAPH,
    repeat: id.startsWith("selection.") || id.startsWith("view.pan.") ? "allow" : id.startsWith("history.") ? "coalesce" : "deny",
    effect: editor ? "semantic-setting" : id.startsWith("relationship.") && !id.endsWith("details") || id === "node.delete" || id === "node.rename" || id === "node.open" || id === "node.edit" || id === "node.note-type" ? "vault-write" : id.startsWith("pin.") || id.startsWith("view.") ? "workflow" : "ui",
    ...(session ? {} : { command: { id: commandId, kind: editor ? "editor" : "ordinary", defaultPublished: !!(LEGACY_COMMANDS[id] ?? NEW_PUBLISHED[id]) } }),
  };
}
/** Construct the bounded inventory once; generated variants never derive IDs from vault contents. */
function buildCatalog(): readonly ActionMetadata[] {
  const ids: ActionId[] = [...SIMPLE_IDS];
  for (const direction of ACTION_DIRECTIONS) ids.push(`selection.move.${direction}`, `selection.section.${direction}`, `view.pan.${direction}`);
  for (const role of ACTION_RELATION_ROLES) ids.push(`relationship.create-center.${role}`, `relationship.create-selected.${role}`);
  for (const slot of ACTION_PIN_SLOTS) ids.push(`pin.open-slot.${slot}`);
  const catalog = ids.map(/** Freeze metadata and its nested lists; executable ports are attached elsewhere. */ id => {
    const item = descriptor(id);
    return Object.freeze({...item, keywordKeys: Object.freeze([...item.keywordKeys]), localContexts: Object.freeze([...item.localContexts]), ...(item.command ? {command: Object.freeze({...item.command})} : {})});
  });
  if (new Set(ids).size !== ids.length || new Set(catalog.flatMap(/** Session actions have no host ID. */ item => item.command ? [item.command.id] : [])).size !== catalog.filter(/** Count publishable entries. */ item => item.command).length) throw new Error("Duplicate action or command ID");
  return Object.freeze(catalog);
}
export const ACTION_CATALOG = buildCatalog();
export const ACTION_BY_ID: ReadonlyMap<ActionId, ActionMetadata> = new Map(ACTION_CATALOG.map(/** Index immutable metadata by its stable ID. */ item => [item.id, item]));
/** Guard untrusted IDs before looking up executable implementations. */
export function isActionId(value: unknown): value is ActionId { return typeof value === "string" && ACTION_BY_ID.has(value as ActionId); }
/** Reject executable overrides and payloads inappropriate for the requested fixed operation. */
export function validActionArguments(id: ActionId, value: unknown): boolean {
  if (value === undefined) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  if (id.startsWith("relationship.create-")) return keys.every(/** Only invocation continuation may override compatibility behavior. */ key => key === "continuation") && (Reflect.get(value, "continuation") === undefined || ["configured", "return", "another", "follow", "edit"].some(/** Match a finite completion intent. */ intent => intent === Reflect.get(value, "continuation")));
  if (id === "view.sidecar.position") return keys.every(/** Position is a finite supported UI choice. */ key => key === "position") && (Reflect.get(value, "position") === undefined || ["left", "right", "above", "below"].some(/** Match supported sidecar placement. */ position => position === Reflect.get(value, "position")));
  return keys.length === 0;
}
