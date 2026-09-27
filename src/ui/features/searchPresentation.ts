import type { PresentationEnvironment } from "../../core/contracts/presentationEnvironment";
import { formatShortcut, SEARCH_FOCUS_SHORTCUT } from "../../core/plex/shortcutPresentation";
import type { Translator } from "../../lang";

export type SearchFieldCopy = Readonly<{
  placeholder: string;
  ariaLabel: string;
  shortcutHint: string | null;
}>;

/** Host-free copy selection for the search control rendered by the legacy React shell. */
export function searchFieldCopy(
  translate: Translator,
  environment: Pick<PresentationEnvironment, "keyConvention" | "inputModes">,
  actionAvailable = true,
): SearchFieldCopy {
  const shortcutHint = formatShortcut(SEARCH_FOCUS_SHORTCUT, environment, actionAvailable);
  return {
    placeholder: shortcutHint
      ? translate("search.placeholderWithShortcut", { shortcut: shortcutHint })
      : translate("search.placeholder"),
    ariaLabel: translate("search.ariaLabel"),
    shortcutHint,
  };
}
