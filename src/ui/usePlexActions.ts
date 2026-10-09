/**
 * Host-bound surface registration and focused-region keyboard delivery. App and graph provide
 * fresh implementation/snapshot ports; one dispatcher accepts native events before asynchronous
 * work and serves both the focus-leased Obsidian Scope and root-local DOM fallback. Migration,
 * unmount and preference changes release precisely their own leases, listeners and registrations.
 */
import { useEffect, useRef, useState, type RefObject } from "react";
import { Notice, Scope } from "obsidian";
import type KplexPlugin from "../main";
import type { WorkspaceLeaf } from "obsidian";
import type { GraphPage } from "../types";
import type { KeyConvention } from "../core/contracts/presentationEnvironment";
import { ACTION_CATALOG, type ActionId, type ActionRequest, type NodeRef } from "../core/plex/actions";
import { actionBindingContexts, compileActionBindings, effectiveActionBindings } from "../core/plex/actionPreferences";
import type { ActionImplementation, SurfaceSnapshot } from "../application/ActionManager";
import { getEmbeddedMarkdownScope } from "../adapters/obsidian/embeddedMarkdownLeaf";
import { forwardActionScopeKey } from "../adapters/obsidian/actionScope";
import { actionNodeRef } from "../adapters/obsidian/actionNode";
import { acceptPlexKeyEvent, isAcceptedPlexKeyEvent, plexFocusRegion, usablePlexKeyEvent } from "./actionKeyboardOwnership";
import { translateActionText } from "./actionPresentation";
import { registerActionHotkeys } from "./internalHotkeyScope";

export type SurfaceActionImplementations = Partial<Record<ActionId, ActionImplementation>>;
export interface GraphActionPorts {
  implementations: SurfaceActionImplementations;
  readSelected: () => { node: NodeRef; occurrenceId: string } | null;
  normalMode: boolean;
  clearSelection?: () => void;
  prepareDisplayResize?: () => void;
  handleSessionKey?: (event: KeyboardEvent, matchedAction: ActionId | null) => boolean;
}
let surfaceCounter = 0;

/** Register one App generation and deliver actions only inside its actually focused native region. */
export function usePlexActions(options: {
  plugin: KplexPlugin; hostLeaf: WorkspaceLeaf; root: RefObject<HTMLDivElement | null>;
  convention: KeyConvention; center: GraphPage | undefined; graph: RefObject<GraphActionPorts | null>;
  implementations: SurfaceActionImplementations; historyBack: boolean; historyForward: boolean;
  mounted: boolean; onReady?: () => void; readEscapeAction?: () => ActionId | null;
}): { surfaceId: string; dispatch: (request: ActionRequest) => void; readSnapshot: () => SurfaceSnapshot } {
  const [surfaceId] = useState(/** IDs are opaque and do not depend on undocumented workspace leaf IDs. */ () => `kplex-surface-${++surfaceCounter}`);
  const current = useRef(options);
  current.current = options;
  const interactionRevision = useRef(0);
  const [, refreshPreferences] = useState(0);
  const generation = useRef(0);
  const commandFocusRegion = useRef<SurfaceSnapshot["focusRegion"]>("external");

  /** Snapshot bounded view state synchronously; selected identity belongs to an exact displayed occurrence. */
  const readSnapshot = (): SurfaceSnapshot => {
    const latest = current.current;
    const root = latest.root.current;
    return {
      mounted: Boolean(root?.isConnected), visible: latest.plugin.isKplexLeafVisible(latest.hostLeaf),
      windowId: latest.plugin.actionWindowId(root?.ownerDocument.defaultView),
      center: latest.center ? actionNodeRef(latest.center) : null,
      selected: latest.graph.current?.readSelected() ?? null,
      focusRegion: root ? plexFocusRegion(root, root.ownerDocument.activeElement) : "external",
      commandFocusRegion: commandFocusRegion.current,
      interactionRevision: interactionRevision.current, historyBack: latest.historyBack, historyForward: latest.historyForward,
      editorAvailable: Boolean(root?.querySelector(".kplex-central-editor-content")) || latest.plugin.hasAssociatedEditor(latest.hostLeaf),
    };
  };
  const snapshotRef = useRef(readSnapshot);
  snapshotRef.current = readSnapshot;

  useEffect(/** Register surface lifetime separately from key preferences; rebinding must not retire composers. */ () => {
    const root = options.root.current;
    if (!root) return;
    const plugin = options.plugin;
    const ownGeneration = ++generation.current;
    const implementations: SurfaceActionImplementations = {};
    const ownedIds = new Set<ActionId>([...Object.keys(current.current.implementations), ...Object.keys(current.current.graph.current?.implementations ?? {})] as ActionId[]);
    for (const id of ownedIds) {
      implementations[id] = {
        availability: /** Resolve the latest callback without retaining graph render closures. */ context => {
          const owner = current.current.graph.current?.implementations[id] ?? current.current.implementations[id];
          return owner?.availability(context) ?? { state: "disabled", reasonKey: "actions.unavailable" };
        },
        execute: /** Preserve one operation owner and let the manager recheck its accepted target. */ context => {
          const owner = current.current.graph.current?.implementations[id] ?? current.current.implementations[id];
          return owner?.execute(context) ?? { status: "unavailable", reasonKey: "actions.unavailable" };
        },
      };
    }
    const releaseHost = plugin.registerActionSurfaceHost(surfaceId, ownGeneration, options.hostLeaf);
    const releaseSurface = plugin.actionManager.registerSurface({ id: surfaceId, generation: ownGeneration,
      readSnapshot: /** Read the committed/current render's snapshot without stale closure capture. */ () => snapshotRef.current(), implementations });
    current.current.onReady?.();
    return /** Dispose precisely this native surface generation after React teardown. */ () => { releaseSurface(); releaseHost(); };
  }, [options.plugin, options.hostLeaf, options.root, options.mounted, surfaceId]);

  useEffect(/** Acquire native/surface resources only once this generation has an actual mounted root. */ () => {
    const root = options.root.current;
    if (!root) return;
    const plugin = options.plugin;
    let preferences = plugin.settings.actionPreferences;
    let compiler = compileActionBindings(preferences, options.convention);
    let scope: Scope | null = null;
    let parentScope: Scope | null = null;
    let registeredRegion: SurfaceSnapshot["focusRegion"] | null = null;
    let releaseKeys = /** No registrations exist before the first eligible focus region. */ (): void => {};
    let leased = false;
    let active = true;
    const forwardedParentEvents = new WeakSet<KeyboardEvent>();

    /** Release child Scope as soon as focused ownership ends; visibility is never sufficient. */
    const releaseLease = (): void => {
      if (!leased) return;
      leased = false;
      if (scope) plugin.app.keymap.popScope(scope);
    };
    /** Acquire native precedence only while an element in this surface owns focus. */
    const updateLease = (): void => {
      if (!active || !root.isConnected || !root.ownerDocument.hasFocus() || !plugin.isKplexLeafVisible(options.hostLeaf)) { releaseLease(); return; }
      const region = plexFocusRegion(root, root.ownerDocument.activeElement);
      if (region === "external") { releaseLease(); return; }
      const parent = region === "embedded-editor" ? getEmbeddedMarkdownScope(root.ownerDocument.activeElement) : options.hostLeaf.view.scope ?? plugin.app.scope;
      if (!parent) { releaseLease(); return; }
      if (parent !== parentScope || region !== registeredRegion) {
        releaseLease(); releaseKeys();
        parentScope = parent; registeredRegion = region; scope = new Scope(parent);
        const registeredScope = scope;
        releaseKeys = registerActionHotkeys(scope, [...ACTION_CATALOG.flatMap(/** Concrete native handlers must exist only where the action owns focus; undefined does not delegate a matching native Scope handler. */ item => effectiveActionBindings(preferences, item.id).filter(/** Register exactly the compiler-owned contexts; ordinary editor typing needs no forwarding handler. */ binding => actionBindingContexts(item, binding).includes(region))),
          // Query controls need finite native precedence while graph focus is leased. The graph
          // owner declines inactive queries, then this existing callback forwards the exact event
          // to its parent. Exact empty/Shift text fallbacks follow all concrete actions so graph
          // typing wins before parent letter shortcuts; no all-modifier capture is installed.
          ...(region === "graph" ? [
            { match: "key" as const, value: "Enter", modifiers: [] }, { match: "key" as const, value: "Escape", modifiers: [] },
            { match: "key" as const, value: "Tab", modifiers: [] }, { match: "key" as const, value: "Tab", modifiers: ["shift" as const] },
            { match: "key" as const, value: "Backspace", modifiers: [] }, { match: "key" as const, value: "Backspace", modifiers: ["shift" as const] },
          ] : [])], /** A declined concrete/text callback needs explicit original-event delegation; native Scope does not perform it automatically. */ (event, context) => {
          if (!active || scope !== registeredScope || !leased || !root.isConnected || !root.ownerDocument.hasFocus() || !plugin.isKplexLeafVisible(options.hostLeaf)) return;
          const result = dispatchKey(event);
          if (result === false) return false;
          if (forwardedParentEvents.has(event)) return;
          forwardedParentEvents.add(event);
          if (forwardActionScopeKey(parent, event, context) === false) { acceptPlexKeyEvent(event); return false; }
          return;
        }, region === "graph");
      }
      if (!leased && scope) { leased = true; plugin.app.keymap.pushScope(scope); }
    };
    /** Common synchronous dispatcher for both transports; native Dead/accent input remains host-owned outside graph focus. */
    const dispatchKey = (event: KeyboardEvent): false | undefined => {
      if (isAcceptedPlexKeyEvent(event)) return false;
      if (forwardedParentEvents.has(event)) return;
      if (!usablePlexKeyEvent(event) || !active || !root.isConnected || !root.ownerDocument.hasFocus() || !plugin.isKplexLeafVisible(options.hostLeaf)) return;
      const latest = current.current;
      const region = plexFocusRegion(root, event.target);
      if (region === "external") return;
      // A configured physical shortcut may intentionally use an Option accent position on the
      // graph. Native editors and fields retain that accent/composition gesture even when the
      // same explicit focus-action binding is eligible in their ordinary keyboard context.
      if (event.key === "Dead" && region !== "graph") return;
      const match = compiler.resolve({ key: event.key, code: event.code, ctrlKey: event.ctrlKey, metaKey: event.metaKey,
        shiftKey: event.shiftKey, altKey: event.altKey, isComposing: event.isComposing,
        altGraph: event.getModifierState?.("AltGraph") ?? false, repeat: event.repeat }, region);
      if (match.state === "ambiguous") {
        acceptPlexKeyEvent(event);
        if (!event.repeat) new Notice(translateActionText(plugin.translator, "actions.shortcutConflict"));
        return false;
      }
      if (region === "graph" && latest.graph.current?.handleSessionKey?.(event, match.state === "matched" ? match.id : null)) {
        acceptPlexKeyEvent(event); return false;
      }
      // Display recovery is subordinate to query/connection handling, custom shortcuts and
      // native fields/menus/dialogs. Only a bare, unclaimed graph Escape can exit a mode.
      const displayEscape = match.state === "none" && region === "graph" && event.key === "Escape"
        && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && latest.graph.current?.normalMode
        && !Array.from(root.ownerDocument.querySelectorAll<HTMLElement>(".menu, .modal-container, .prompt")).some(/** Native shells retain their own Escape while displayed in the owning window. */ element => element.getClientRects().length > 0)
        ? latest.readEscapeAction?.() : null;
      const id = match.state === "matched" ? match.id : displayEscape;
      if (!id) return;
      if (!id || region === "graph" && latest.graph.current?.normalMode === false) return;
      const prepared = plugin.actionManager.prepare({ id, source: "local-hotkey", surfaceId });
      if (prepared.state !== "accepted") {
        // An owned history boundary is a graph no-op, not browser navigation. A held modal key
        // likewise stays owned while its session is alive and must not reach the parent shortcut.
        if (id === "history.back" || id === "history.forward" || id.startsWith("relationship.") || event.repeat) {
          acceptPlexKeyEvent(event);
          if (!event.repeat && id.startsWith("relationship.")) new Notice(translateActionText(plugin.translator, prepared.reasonKey));
          return false;
        }
        return;
      }
      if (event.repeat && ACTION_CATALOG.find(item => item.id === id)?.repeat === "deny") {
        prepared.cancel(); acceptPlexKeyEvent(event); return false;
      }
      acceptPlexKeyEvent(event);
      void prepared.run();
      return false;
    };
    /** Bare graph pointer interaction deliberately retires selection, while controls keep native focus. */
    const interacted = (): void => { interactionRevision.current++; plugin.actionManager.recordInteraction(surfaceId); };
    /** Focus events reflect the actual sidebar/popout region even if Obsidian active leaf differs. */
    const focused = (): void => {
      interacted(); commandFocusRegion.current = plexFocusRegion(root, root.ownerDocument.activeElement); updateLease();
    };
    /** Preserve a graph-launched native palette context; external editor/control focus retires it. */
    const documentFocused = (event: FocusEvent): void => {
      const target = event.target;
      if (!target || !("nodeType" in target)) return;
      if (root.contains(target as Node)) return;
      const element = target as Element;
      if (!element.closest(".prompt")) commandFocusRegion.current = "external";
    };
    /** Focusout settles synchronously for known related targets, with an owning-window microtask fallback. */
    const blurred = (event: FocusEvent): void => {
      if (event.relatedTarget && !("nodeType" in event.relatedTarget && root.contains(event.relatedTarget as Node))) releaseLease();
      else root.ownerDocument.defaultView?.queueMicrotask(updateLease);
    };
    /** Forward only root-local events; no document-wide graph interception is installed. */
    const keydown = (event: KeyboardEvent): void => { dispatchKey(event); };
    /** Persisted preferences and native bindings form one synchronous keyboard generation, independent of React presentation updates. */
    const preferencesChanged = (): void => {
      if (!active) return;
      releaseLease(); releaseKeys(); scope = null; parentScope = null; registeredRegion = null;
      preferences = plugin.settings.actionPreferences;
      compiler = compileActionBindings(preferences, options.convention);
      updateLease(); refreshPreferences(value => value + 1);
    };
    /** Owner-window focus determines which native keymap may lease this view's child Scope. */
    const windowFocused = (): void => { updateLease(); };
    const ownerWindow = root.ownerDocument.defaultView;
    root.addEventListener("keydown", keydown, true);
    root.addEventListener("focusin", focused);
    root.addEventListener("focusout", blurred);
    root.ownerDocument.addEventListener("focusin", documentFocused);
    root.addEventListener("pointerdown", interacted, true);
    ownerWindow?.addEventListener("blur", releaseLease);
    ownerWindow?.addEventListener("focus", windowFocused);
    const releasePreferences = plugin.subscribeActionPreferences(preferencesChanged);
    const releaseVisibility = plugin.subscribeKplexVisibility(updateLease);
    updateLease();
    return /** Old preference cleanup cannot unregister a replacement surface. */ () => {
      active = false; releaseLease(); releaseKeys(); releaseVisibility(); releasePreferences();
      root.removeEventListener("keydown", keydown, true);
      root.removeEventListener("focusin", focused);
      root.removeEventListener("focusout", blurred);
      root.ownerDocument.removeEventListener("focusin", documentFocused);
      root.removeEventListener("pointerdown", interacted, true);
      ownerWindow?.removeEventListener("blur", releaseLease);
      ownerWindow?.removeEventListener("focus", windowFocused);
    };
  }, [options.plugin, options.hostLeaf, options.root, options.mounted, options.convention, surfaceId]);

  return { surfaceId, readSnapshot, dispatch: /** Buttons and menus dispatch through the same policy without keyboard interception. */ request => {
    const plugin = current.current.plugin;
    void plugin.actionManager.dispatch({ ...request, surfaceId }).then(/** Surface dispatch reports unavailable targets once; manager owns execution failures. */ outcome => {
      if (outcome.status === "unavailable") new Notice(translateActionText(plugin.translator, outcome.reasonKey));
    });
  } };
}
