/**
 * Shared localized action labels and effective local shortcut presentation. Catalog metadata stays
 * portable; this assembly validates its string keys against English and formats actual preferences
 * with explicit environment facts. Familiar physical keycaps use readable labels while matching
 * remains code-based; uncommon codes retain their explicit physical-position label. It neither
 * reads host hotkeys nor invents global assignments.
 */
import type { PresentationEnvironment } from "../core/contracts/presentationEnvironment";
import { physicalBindingKeycap, type LocalBinding } from "../core/plex/actionPreferences";
import { formatShortcut } from "../core/plex/shortcutPresentation";
import type { PlainTranslationKey, Translator } from "../lang";
import { englishCatalog } from "../lang/en";

/** Narrow catalog metadata to validated interpolation-free translation identifiers. */
function isPlainKey(key: string): key is PlainTranslationKey {
  const entry: unknown = Reflect.get(englishCatalog, key);
  return Boolean(entry && typeof entry === "object" && Array.isArray(Reflect.get(entry, "params"))
    && (Reflect.get(entry, "params") as unknown[]).length === 0);
}

/** Translate catalog text only after confirming its English contract; invalid assembly fails fast. */
export function translateActionText(translate: Translator, key: string): string {
  if (!isPlainKey(key)) throw new Error(`Invalid action translation key: ${key}`);
  return translate(key);
}

/** Format actual effective chords; native chips use Obsidian's platform glyphs and space separators. */
export function formatActionBinding(binding: LocalBinding, environment: PresentationEnvironment,
  translate: Translator, configuring = false,
): string | null {
  const keycap = binding.match === "code" ? physicalBindingKeycap(binding) : null;
  const rawValue = keycap ?? binding.value;
  const value = rawValue === " " || rawValue === "Space" ? translate("hotkeys.space")
    : rawValue === "ArrowUp" ? "↑" : rawValue === "ArrowDown" ? "↓"
      : rawValue === "ArrowLeft" ? "←" : rawValue === "ArrowRight" ? "→" : rawValue;
  const mac = environment.keyConvention === "macos" || environment.keyConvention === "ios";
  const result = formatShortcut({ key: value, modifiers: binding.modifiers }, configuring
    ? { ...environment, inputModes: { ...environment.inputModes, keyboard: true } } : environment, {
    shift: configuring && mac ? "⇧" : translate("shortcut.shift"),
    command: configuring && mac ? "⌘" : translate("shortcut.command"),
    control: configuring && mac ? "⌃" : translate("shortcut.control"),
    option: configuring && mac ? "⌥" : translate("shortcut.option"), alt: translate("shortcut.alt"),
  }, true, configuring ? " " : "+");
  return result && binding.match === "code" && keycap === null ? translate("actions.physicalBinding", { binding: result }) : result;
}
