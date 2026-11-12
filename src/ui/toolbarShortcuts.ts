/** Finite toolbar click choices and their localized, platform-aware hints share one policy. */
import type {PresentationEnvironment} from "../core/contracts/presentationEnvironment";
import type {ActionRequest} from "../core/plex/actions";
import type {Translator} from "../lang";
import type {ModifierClick} from "./components/modifierClick";
import {formatActionBinding} from "./actionPresentation";

/** Match Obsidian's primary navigation modifier without treating macOS Control as Command. */
function primaryModifier(event: ModifierClick, environment: PresentationEnvironment): boolean {
  return environment.keyConvention === "macos" || environment.keyConvention === "ios" ? event.metaKey
    : environment.keyConvention === "unknown" ? event.ctrlKey || event.metaKey : event.ctrlKey;
}

/** Preserve ordinary new-group behavior; modified clicks follow Obsidian's tab/split/window order. */
export function canvasToolbarRequest(event: ModifierClick, environment: PresentationEnvironment): ActionRequest | null {
  if (primaryModifier(event, environment)) {
    if (event.altKey && event.shiftKey) return environment.device === "desktop" && environment.hostActions.popout
      ? {id: "surface.open-popout", source: "toolbar"} : null;
    return {id: "surface.new-tab", source: "toolbar", args: {placement: event.altKey ? "split" : "tab"}};
  }
  if (event.altKey) return environment.hostActions.sidepanel ? {id: "surface.open-sidepanel", source: "toolbar"} : null;
  return {id: "surface.new-tab", source: "toolbar"};
}

/** Plugin settings takes primary-modifier precedence; area editing stays an existing surface action. */
export function settingsToolbarChoice(event: ModifierClick, environment: PresentationEnvironment): "plugin" | "areas" | "menu" {
  return primaryModifier(event, environment) ? "plugin" : event.altKey ? "areas" : "menu";
}

/** Include only supported gestures and confirmed keyboard conventions; no mobile popout hint. */
export function toolbarShortcutHints(kind: "canvas" | "settings", environment: PresentationEnvironment, translate: Translator): string {
  const click = translate("toolbar.click");
  const gestures: Array<[string, Array<"mod" | "alt" | "shift">]> = kind === "canvas"
    ? [[translate("toolbar.newTabGroup"), ["mod", "alt"]], [translate("toolbar.sameGroupTab"), ["mod"]],
      ...(environment.device === "desktop" && environment.hostActions.popout ? [[translate("actions.surface.open-popout"), ["mod", "alt", "shift"]] as [string, Array<"mod" | "alt" | "shift">]] : []),
      ...(environment.hostActions.sidepanel ? [[translate("actions.surface.open-sidepanel"), ["alt"]] as [string, Array<"mod" | "alt" | "shift">]] : [])]
    : [[translate("app.pluginSettings"), ["mod"]], [translate("app.areaSettings"), ["alt"]]];
  return gestures.flatMap(([action, modifiers]) => {
    const shortcut = formatActionBinding({match: "key", value: click, modifiers}, environment, translate);
    return shortcut ? [translate("toolbar.clickHint", {shortcut, action})] : [];
  }).join("\n");
}
