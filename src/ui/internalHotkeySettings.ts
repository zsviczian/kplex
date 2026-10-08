/**
 * Native declarative settings content for Plex-local shortcuts. Each registry action offers a key
 * native hotkey pill, delete, customize and restore icons. The row owns its temporary recording
 * scope and DOM listeners; the caller owns persistence and supplies Obsidian's public keymap.
 * Conflicts are rejected before saving and platform labels derive from the owning window.
 */
import { ExtraButtonComponent, Scope, type Keymap, type SettingDefinitionItem, type Setting } from "obsidian";
import { readObsidianPresentationEnvironment } from "../adapters/obsidian/presentationEnvironment";
import { captureInternalHotkey, internalBindingEvent, INTERNAL_HOTKEY_ACTIONS, INTERNAL_HOTKEY_DEFAULTS, matchesInternalHotkey, type InternalHotkeyAction, type InternalHotkeys } from "../core/plex/internalHotkeys";
import { formatShortcut, type ShortcutSpec } from "../core/plex/shortcutPresentation";
import type { PlainTranslationKey, Translator } from "../lang";

const ACTION_LABELS: Record<InternalHotkeyAction, PlainTranslationKey> = {
  moveUp: "hotkeys.moveUp", moveDown: "hotkeys.moveDown", moveLeft: "hotkeys.moveLeft", moveRight: "hotkeys.moveRight",
  sectionUp: "hotkeys.sectionUp", sectionDown: "hotkeys.sectionDown", sectionLeft: "hotkeys.sectionLeft", sectionRight: "hotkeys.sectionRight",
  activate: "hotkeys.activate", addParent: "command.addParent", addChild: "command.addChild",
  focusSearch: "command.search", focusFind: "find.ariaLabel",
  addFriend: "command.addFriend", addChallenger: "command.addChallenger",
};

/** Render and clean up one recorder; modifier-only input stays pending and Escape cancels. */
function renderHotkeyRow(setting: Setting, action: InternalHotkeyAction, read: () => InternalHotkeys, save: (action: InternalHotkeyAction, binding: ShortcutSpec | null) => void, translate: Translator, keymap: Pick<Keymap, "pushScope" | "popScope">): () => void {
  const environment = readObsidianPresentationEnvironment(setting.settingEl.ownerDocument.defaultView ?? undefined);
  let recording = false;
  let recordingScope: Scope | null = null;
  const label = translate(ACTION_LABELS[action]);
  const releaseButtons: Array<() => void> = [];
  /** Show the actual saved chord even on touch devices configuring an external keyboard. */
  const bindingText = (): string => {
    const binding = read()[action];
    const key = binding?.key === " " ? translate("hotkeys.space")
      : binding?.key === "ArrowUp" ? "↑" : binding?.key === "ArrowDown" ? "↓"
        : binding?.key === "ArrowLeft" ? "←" : binding?.key === "ArrowRight" ? "→" : binding?.key;
    const mac = environment.keyConvention === "macos" || environment.keyConvention === "ios";
    return binding ? formatShortcut({ ...binding, key: key! }, { ...environment, inputModes: { ...environment.inputModes, keyboard: true } }, {
      shift: mac ? "⇧" : translate("shortcut.shift"), command: mac ? "⌘" : translate("shortcut.command"),
      control: mac ? "⌃" : translate("shortcut.control"), option: mac ? "⌥" : translate("shortcut.option"), alt: translate("shortcut.alt"),
    }, true, " ") ?? binding.key : translate("hotkeys.disabled");
  };
  setting.settingEl.addClass("kplex-hotkey-setting");
  const display = setting.controlEl.createDiv("setting-command-hotkeys");
  const pill = display.createSpan("setting-hotkey");
  const caption = pill.createSpan();
  const deleteButton = new ExtraButtonComponent(pill).setIcon("x").setTooltip(translate("hotkeys.disable"))
    .onClick(/** Null disables this action without restoring its default. */ () => { stopRecording(); save(action, null); refresh(); });
  deleteButton.extraSettingsEl.addClass("setting-hotkey-icon", "setting-delete-hotkey");
  // The pill's native delete icon has no generic icon-button padding or settings-button margin.
  deleteButton.extraSettingsEl.removeClass("clickable-icon", "extra-setting-button");
  const restoreButton = new ExtraButtonComponent(setting.controlEl).setIcon("rotate-ccw").setTooltip(translate("hotkeys.reset"))
    .onClick(/** Restore only this action, checking conflicts with the current other bindings. */ () => commit(INTERNAL_HOTKEY_DEFAULTS[action]));
  restoreButton.extraSettingsEl.addClass("setting-restore-hotkey-button");
  restoreButton.extraSettingsEl.removeClass("extra-setting-button");
  const customizeButton = new ExtraButtonComponent(setting.controlEl).setIcon("circle-plus").setTooltip(translate("hotkeys.change", { action: label }))
    .onClick(/** Record with a temporary native scope so Settings cannot intercept the chord. */ () => {
      if (recording) { stopRecording(); return; }
      customizeButton.extraSettingsEl.focus();
      recording = true;
      recordingScope = new Scope();
      recordingScope.register(null, null, /** The recorder exclusively owns all keys until completion or cancellation. */ event => {
        keydown(event); return false;
      });
      keymap.pushScope(recordingScope);
      refresh();
    });
  const recordButton = customizeButton.extraSettingsEl;
  recordButton.addClass("setting-add-hotkey-button");
  recordButton.removeClass("extra-setting-button");
  for (const button of [deleteButton, restoreButton, customizeButton]) {
    const element = button.extraSettingsEl;
    element.setAttr("role", "button"); element.tabIndex = 0;
    /** Public icon components provide pointer activation; supply equivalent keyboard activation. */
    const activate = (event: KeyboardEvent): void => {
      if (recording || (event.key !== "Enter" && event.key !== " ") || event.repeat) return;
      event.preventDefault(); event.stopPropagation(); element.click();
    };
    element.addEventListener("keydown", activate);
    releaseButtons.push(/** Release only this icon's keyboard listener. */ () => element.removeEventListener("keydown", activate));
  }
  /** Refresh native affordances; the default chord needs no restore control. */
  function refresh(): void {
    const binding = read()[action];
    caption.setText(recording ? translate("hotkeys.pressKeys") : bindingText());
    display.toggle(binding !== null || recording);
    deleteButton.extraSettingsEl.toggle(binding !== null && !recording);
    const defaultBinding = INTERNAL_HOTKEY_DEFAULTS[action];
    restoreButton.extraSettingsEl.toggle(binding === null || !matchesInternalHotkey(
      internalBindingEvent(binding, environment.keyConvention), defaultBinding, environment.keyConvention));
    recordButton.toggleClass("is-recording", recording);
    recordButton.setAttr("aria-pressed", String(recording));
    setting.setDesc("");
  }
  /** Reject ambiguous chords, including platform-equivalent Mod/Control combinations. */
  function commit(binding: ShortcutSpec): void {
    const event = internalBindingEvent(binding, environment.keyConvention);
    const conflict = INTERNAL_HOTKEY_ACTIONS.find(other => other !== action && read()[other] !== null
      && matchesInternalHotkey(event, read()[other]!, environment.keyConvention));
    stopRecording();
    if (conflict) {
      refresh();
      setting.setDesc(translate("hotkeys.conflict", { action: translate(ACTION_LABELS[conflict]) }));
      return;
    }
    save(action, binding); refresh();
  }
  /** Consume only recorder input, leaving the Settings window's normal shortcuts intact otherwise. */
  const keydown = (event: KeyboardEvent): void => {
    if (!recording || event.isComposing) return;
    event.preventDefault(); event.stopPropagation();
    if (event.key === "Escape") { stopRecording(); return; }
    const binding = captureInternalHotkey(event, environment.keyConvention);
    if (binding && !event.repeat) commit(binding);
  };
  recordButton.addEventListener("keydown", keydown, true);
  recordButton.addEventListener("blur", stopRecording);
  /** Blur, Escape, completion and teardown all release the exact temporary native scope. */
  function stopRecording(): void {
    if (!recording && !recordingScope) return;
    if (recordingScope) { keymap.popScope(recordingScope); recordingScope = null; }
    recording = false; refresh();
  }
  refresh();
  return /** Settings teardown releases only this row's detached DOM handlers. */ () => {
    stopRecording();
    recordButton.removeEventListener("keydown", keydown, true);
    recordButton.removeEventListener("blur", stopRecording);
    for (const release of releaseButtons) release();
  };
}

/** Produce a searchable declarative page, with one independently configurable row per action. */
export function internalHotkeySettings<K extends string>(read: () => InternalHotkeys, save: (action: InternalHotkeyAction, binding: ShortcutSpec | null) => void, translate: Translator, keymap: Pick<Keymap, "pushScope" | "popScope">): SettingDefinitionItem<K> {
  return {
    type: "page", name: translate("hotkeys.heading"), desc: `${translate("hotkeys.description")} ${translate("hotkeys.rowHelp")}`,
    items: INTERNAL_HOTKEY_ACTIONS.map(/** The registry is the single inventory for defaults and controls. */ action => ({
      name: translate(ACTION_LABELS[action]),
      render: /** Native Settings owns mounting and invokes recorder cleanup when the page closes. */ setting => renderHotkeyRow(setting, action, read, save, translate, keymap),
    })),
  };
}
