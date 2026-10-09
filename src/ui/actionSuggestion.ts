/**
 * Shared native suggestion-row presentation for the executable Plex command palette and read-only
 * shortcut reference. Callers provide translated text and effective formatted chords; this renderer
 * owns only detached row content and never registers listeners, resolves targets or executes actions.
 */

/** Render native complex-suggestion content with explanations left and read-only shortcut chips right. */
export function renderActionSuggestion(element: HTMLElement, label: string, description: string, chords: readonly string[]): void {
  element.addClass("mod-complex", "kplex-action-suggestion");
  const content = element.createDiv({ cls: "suggestion-content" });
  content.createDiv({ cls: "suggestion-title", text: label });
  content.createDiv({ cls: "suggestion-note", text: description });
  const auxiliary = element.createDiv({ cls: "suggestion-aux" });
  if (!chords.length) return;
  const hotkeys = auxiliary.createDiv({ cls: "setting-command-hotkeys" });
  for (const chord of chords) hotkeys.createSpan({ cls: "suggestion-hotkey setting-hotkey", text: chord });
}
