/**
 * English is K-Plex's source catalog and fallback language.
 *
 * Keys describe the product surface rather than the current English wording so they can remain
 * stable when copy is refined. `context` is translator-facing guidance. Named `params` must match
 * every `{placeholder}` used by the message. Do not put vault/user data into keys.
 */
export const englishCatalog = {
  "styles.nodeTitle": {
    message: "Node styles",
    context: "Node style settings and legacy ExcaliBrain style management.",
    params: [],
  },
  "styles.editNode": {
    message: "Edit node style",
    context: "Node style settings and legacy ExcaliBrain style management.",
    params: [],
  },
  "styles.addNode": {
    message: "Add node style",
    context: "Node style settings and legacy ExcaliBrain style management.",
    params: [],
  },
  "styles.legacyTagHelp": {
    message: "Style notes whose primary style tag starts with this prefix. Imported tag styles keep their original matching order.",
    context: "Node style settings and legacy ExcaliBrain style management.",
    params: [],
  },
  "styles.propertyHelp": {
    message: "Style notes where “{property}” matches this value. Existing values and vault tags are suggested as you type.",
    context: "Node style settings and legacy ExcaliBrain style management.",
    params: ["property"],
  },
  "styles.tagPrefix": {
    message: "Tag prefix",
    context: "Node style settings and legacy ExcaliBrain style management.",
    params: [],
  },
  "styles.labelPrefix": {
    message: "Label prefix",
    context: "Node style settings and legacy ExcaliBrain style management.",
    params: [],
  },
  "styles.legacyTag": {
    message: "Imported tag style",
    context: "Node style settings and legacy ExcaliBrain style management.",
    params: [],
  },
  "styles.propertyValue": {
    message: "Property value",
    context: "Node style settings and legacy ExcaliBrain style management.",
    params: [],
  },
  "styles.managerHelp": {
    message: "Manage styles for values of “{property}” and imported tag styles.",
    context: "Node style settings and legacy ExcaliBrain style management.",
    params: ["property"],
  },
  "styles.resultCount": {
    message: "{count} styles · {results} results",
    context: "Node style settings and legacy ExcaliBrain style management.",
    params: ["count", "results"],
  },
  "styles.noMatches": {
    message: "No node styles match this search.",
    context: "Node style settings and legacy ExcaliBrain style management.",
    params: [],
  },
  "styles.noneConfigured": {
    message: "No custom node styles configured yet.",
    context: "Node style settings and legacy ExcaliBrain style management.",
    params: [],
  },
  "styles.settingsSummary": {
    message: "{count} custom styles. Search and edit property-value and imported tag styles.",
    context: "Node style settings and legacy ExcaliBrain style management.",
    params: ["count"],
  },

  "collection.showMore": {
    message: "Show {count} more",
    context: "Button that renders the next bounded batch in a settings manager list.",
    params: ["count"],
  },
  "command.openGraph": {
    message: "Open graph",
    context: "Command palette action that opens K-Plex in a normal graph tab.",
    params: [],
  },
  "notice.excaliBrainSettingsImported": {
    message: "Imported ExcaliBrain settings into K-Plex.",
    context: "Brief notice after K-Plex imports compatible settings from the legacy ExcaliBrain plugin.",
    params: [],
  },
  "notice.indexedNodes": {
    plural: {
      one: "K-Plex indexed {count} nodes.",
      other: "K-Plex indexed {count} nodes.",
    },
    countParam: "count",
    context: "Brief notice after an index rebuild. Both English forms intentionally preserve the existing wording in L00.",
    params: ["count"],
  },
  "search.ariaLabel": {
    message: "Search nodes",
    context: "Accessible name for the K-Plex node search input.",
    params: [],
  },
  "search.placeholder": {
    message: "Search nodes…",
    context: "Placeholder in the K-Plex node search input when no keyboard shortcut hint is appropriate.",
    params: [],
  },
  "search.placeholderWithShortcut": {
    message: "Search nodes… ({shortcut})",
    context: "Node-search placeholder. {shortcut} is the complete keyboard shortcut that focuses this field, currently F4.",
    params: ["shortcut"],
  },
  "toolbar.navigateBack": {
    message: "Navigate back",
    context: "Accessible label/tooltip for the top-bar button that navigates backward in K-Plex history.",
    params: [],
  },
  "toolbar.navigateForward": {
    message: "Navigate forward",
    context: "Accessible label/tooltip for the top-bar button that navigates forward in K-Plex history.",
    params: [],
  },
} as const;

export type EnglishCatalog = typeof englishCatalog;
