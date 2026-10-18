/**
 * Shared folder-path field for native note creation and placeholder materialization. Callers supply
 * a one-time native folder inventory and own validation/writes; this control only edits text and
 * delegates bounded suggestions, keyboard ownership and owner-document portals to FuzzySearchInput.
 */
import { createElement, useMemo } from "react";
import type { Translator } from "../lang";
import { FuzzySearchInput, fuzzyFilterStrings } from "./FuzzySearchInput";

export type FolderPathInputProps = {
  value: string;
  onChange: (value: string) => void;
  folders: readonly string[];
  translate: Translator;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Native materialization may prefill/focus a destination without opening suggestions. */
  openResultsOnFocus?: boolean;
  resultsOwnerId?: string;
};

/** Keep normal quick-create focus in the name field; folders disclose only while deliberately edited. */
export function FolderPathInput({ value, onChange, folders, translate, disabled, autoFocus, openResultsOnFocus = true, resultsOwnerId }: FolderPathInputProps) {
  // Vault-relative inventory paths omit a root slash. Keep that input spelling out of search
  // matching/highlighting while retaining the user's destination text for native validation.
  const query = value.replaceAll("\\", "/").replace(/^\/+/, "");
  const results = useMemo(/** Only an explicit folder interaction ranks the already captured paths. */ () =>
    fuzzyFilterStrings(folders, query, 24, { caseSensitiveIdentity: true }), [folders, query]);
  return createElement(FuzzySearchInput<string>, {
    value: value || "/", results,
    onChange,
    onChoose: onChange,
    getKey: /** A folder's native case-sensitive path is its stable suggestion key. */ folder => folder,
    getLabel: /** Root remains an explicit, localized destination. */ folder => folder === "/" ? translate("common.vaultRoot") : folder,
    placeholder: translate("folderPicker.placeholder"), ariaLabel: translate("folderPicker.label"),
    className: "kplex-folder-path-input", icon: "", disabled, autoFocus,
    floating: true, floatingMode: "viewport", maxFloatingHeight: 320, minFloatingWidth: 560, resultsOwnerId,
    resultsClassName: "kplex-folder-path-results", matchingQuery: query,
    preferSuggestionOnModifiedEnter: true, openResultsOnFocus,
  });
}
