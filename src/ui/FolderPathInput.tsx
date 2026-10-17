/**
 * Shared folder-path field for native note creation and placeholder materialization. Callers supply
 * a one-time native folder inventory and own validation/writes; this control only edits text and
 * delegates bounded suggestions, keyboard ownership and owner-document portals to FuzzySearchInput.
 */
import { createElement, useMemo, useState } from "react";
import type { Translator } from "../lang";
import { FuzzySearchInput, fuzzyFilterStrings } from "./FuzzySearchInput";
import { ObsidianIcon } from "./ObsidianIcon";

export type FolderPathInputProps = {
  value: string;
  onChange: (value: string) => void;
  folders: readonly string[];
  translate: Translator;
  disabled?: boolean;
  autoFocus?: boolean;
  resultsOwnerId?: string;
};

/** Keep normal quick-create focus in the name field; folders disclose only while deliberately edited. */
export function FolderPathInput({ value, onChange, folders, translate, disabled, autoFocus, resultsOwnerId }: FolderPathInputProps) {
  const [browseAll, setBrowseAll] = useState(false);
  const results = useMemo(/** Only an explicit folder interaction ranks the already captured paths. */ () =>
    fuzzyFilterStrings(folders, browseAll || value === "/" ? "" : value, 24, { caseSensitiveIdentity: true }), [browseAll, folders, value]);
  return createElement(FuzzySearchInput<string>, {
    value: value || "/", results,
    onChange: /** Typing searches the captured paths without changing the native inventory. */ next => { setBrowseAll(false); onChange(next); },
    onChoose: /** A chosen suggestion becomes ordinary editable text. */ next => { setBrowseAll(false); onChange(next); },
    getKey: /** A folder's native case-sensitive path is its stable suggestion key. */ folder => folder,
    getLabel: /** Root remains an explicit, localized destination. */ folder => folder === "/" ? translate("common.vaultRoot") : folder,
    placeholder: translate("folderPicker.placeholder"), ariaLabel: translate("folderPicker.label"),
    className: "kplex-folder-path-input", icon: "folder", disabled, autoFocus,
    floating: true, floatingMode: "viewport", maxFloatingHeight: 240, resultsOwnerId,
    preferSuggestionOnModifiedEnter: true, openResultsOnFocus: true,
    disclosure: {
      label: translate("folderPicker.browse"), icon: createElement(ObsidianIcon, { name: "chevron-down", size: 16 }),
      onOpen: /** Explicit browsing starts at the folder vocabulary, independently of the current destination. */ () => setBrowseAll(true),
    },
  });
}
