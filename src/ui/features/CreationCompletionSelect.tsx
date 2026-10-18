/**
 * Shared native select for note-creation completion. Host shells supply ephemeral intent and
 * the effective editing preference; this portable control owns only localized choices and
 * validation of selection events. It never changes persisted preferences or performs graph work.
 */
import { createElement } from "react";
import type { CompletionIntent } from "../../core/plex/actions";
import type { Translator } from "../../lang";

/** Explicit choices shown to users; the compatibility-only configured intent stays internal. */
export type CreationCompletionChoice = Exclude<CompletionIntent, "configured">;

/** Resolve the compatibility default for display without replacing the caller's stored intent. */
export function creationCompletionValue(intent: CompletionIntent, editAfterCreate: boolean): CreationCompletionChoice {
  return intent === "configured" ? editAfterCreate ? "edit" : "return" : intent;
}

/** Render the same accessible native control in React composers and native Obsidian modal rows. */
export function CreationCompletionSelect({ translate, intent, editAfterCreate, canEdit = true, disabled = false, onChange }: Readonly<{
  translate: Translator;
  intent: CompletionIntent;
  editAfterCreate: boolean;
  canEdit?: boolean;
  disabled?: boolean;
  onChange: (choice: CreationCompletionChoice) => void;
}>) {
  const choices = (["return", "another", "follow", "edit"] as const).filter(
    /** Non-editable targets retain the existing restricted choice inventory. */ choice => choice !== "edit" || canEdit,
  );
  return createElement("label", {className: "kplex-creation-completion kplex-add-related-completion"},
    createElement("span", {className: "kplex-creation-completion-caption"}, translate("addRelated.completionMode")),
    createElement("select", {
      className: "dropdown",
      value: creationCompletionValue(intent, editAfterCreate), disabled,
      "aria-label": translate("addRelated.completionMode"), "data-kplex-control": "creation-completion",
      onChange: /** Only a currently offered explicit choice can enter the invocation protocol. */ (event: {currentTarget: HTMLSelectElement}) => {
        const choice = choices.find(value => value === event.currentTarget.value);
        if (choice && !disabled) onChange(choice);
      },
    }, ...choices.map(/** Reuse all existing localized outcome labels. */ choice => createElement("option", {
      key: choice, value: choice,
    }, translate(`addRelated.completion.${choice}`)))));
}
