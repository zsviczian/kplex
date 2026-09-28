/**
 * English is K-Plex's source catalog and fallback language.
 *
 * Keys describe the product surface rather than the current English wording so they can remain
 * stable when copy is refined. `context` is translator-facing guidance. Named `params` must match
 * every `{placeholder}` used by the message. Do not put vault/user data into keys.
 */
export const englishCatalog = {
  "position.physicalAbove": { message: "above", context: "Sidecar position embedded in a sentence; lowercase preserves existing English.", params: [] },
  "position.physicalBelow": { message: "below", context: "Sidecar position embedded in a sentence; lowercase preserves existing English.", params: [] },
  "position.physicalTop": { message: "top", context: "Physical gate/sidecar position embedded in a sentence; lowercase preserves existing English.", params: [] },
  "position.physicalBottom": { message: "bottom", context: "Physical gate/sidecar position embedded in a sentence; lowercase preserves existing English.", params: [] },
  "position.physicalLeft": { message: "left", context: "Physical gate/sidecar position embedded in a sentence; lowercase preserves existing English.", params: [] },
  "position.physicalRight": { message: "right", context: "Physical gate/sidecar position embedded in a sentence; lowercase preserves existing English.", params: [] },
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

  "common.save": {
    message: "Save",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "common.cancel": {
    message: "Cancel",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "common.delete": {
    message: "Delete",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "common.open": {
    message: "Open",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "common.done": {
    message: "Done",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "common.clear": {
    message: "Clear",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "common.rename": {
    message: "Rename",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "common.markdown": {
    message: "Markdown",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "common.excalidraw": {
    message: "Excalidraw",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "common.location": {
    message: "Location",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "common.name": {
    message: "Name",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "common.vaultRoot": {
    message: "Vault root",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "role.parent": {
    message: "Parent",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "role.child": {
    message: "Child",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "role.friend": {
    message: "Friend",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "role.challenger": {
    message: "Challenger",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "role.friendLeft": {
    message: "Friend / left",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "role.challengerRight": {
    message: "Challenger / right",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "role.previous": {
    message: "Previous",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "role.next": {
    message: "Next",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "role.hidden": {
    message: "Hidden",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "role.sibling": {
    message: "Sibling",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "role.excludedMetadata": {
    message: "Excluded / metadata only",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "ontology.addTitle": {
    message: "Add “{field}” to K-Plex ontology",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: ["field"],
  },
  "ontology.chooseRoleHelp": {
    message: "Choose how links stored in this field should appear in K-Plex. The field is removed from any previous ontology group first.",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "ontology.relationshipRole": {
    message: "Relationship role",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "note.validation.enterValid": {
    message: "Enter a valid note name.",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "note.validation.enter": {
    message: "Enter a note name.",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "note.validation.type": {
    message: "Type a note name.",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "note.validation.prohibitedCharacters": {
    message: "The note name contains a prohibited filename character: < > : \" / \\ | ? *",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "note.validation.trailingPeriodSpace": {
    message: "A note name cannot end with a period or space.",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "note.validation.chooseDifferent": {
    message: "Choose a different note name.",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "note.validation.reserved": {
    message: "That note name is reserved by the filesystem.",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "note.existsNamed": {
    message: "A note named “{name}” already exists in the vault.",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: ["name"],
  },
  "file.existsAt": {
    message: "A file already exists at {path}.",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: ["path"],
  },
  "note.createFailed": {
    message: "Could not create note: {error}",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: ["error"],
  },
  "folderNote.title": {
    message: "Add note to folder",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "folderNote.help": {
    message: "Create a file in {folder}. Its folder location defines the relationship, so no note-to-note link will be added.",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: ["folder"],
  },
  "folderNote.noteName": {
    message: "Note name",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "folderNote.placeholder": {
    message: "New note",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "folderNote.openForEditing": {
    message: "Open for editing",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "folderNote.openForEditingHelp": {
    message: "Center the new note and open it in the Sidecar.",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "delete.noteTitle": {
    message: "Delete note",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "delete.placeholderTitle": {
    message: "Delete placeholder",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "delete.noteConfirm": {
    message: "Delete “{name}”? The file will be deleted using Obsidian's configured trash behavior. K-Plex will remove references stored in note properties and leave Markdown-body links for manual review.",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: ["name"],
  },
  "delete.placeholderConfirm": {
    message: "Delete “{name}”? K-Plex will remove references stored in note properties. Markdown-body links are left in place for manual review.",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: ["name"],
  },
  "delete.dontAskAgain": {
    message: "I understand, don't ask me again",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "delete.dontAskAgainHelp": {
    message: "Skip this confirmation for future file deletions. You can turn confirmations back on in K-Plex settings.",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "delete.alwaysConfirm": {
    message: "Always confirm before deleting files",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "delete.alwaysConfirmHelp": {
    message: "Choose whether K-Plex should ask before future file deletions. You can change this later in K-Plex settings.",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "delete.fileButton": {
    message: "Delete file",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "delete.placeholderButton": {
    message: "Delete placeholder",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "references.title": {
    message: "Remaining references",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "references.help": {
    message: "K-Plex removed property references to “{name}”. The links below are in Markdown content and are left for you to review manually.",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: ["name"],
  },
  "references.markdownLink": {
    message: "Markdown link",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "references.unresolvedMarkdownLink": {
    message: "Unresolved Markdown link",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "references.inlineRelationship": {
    message: "Inline relationship",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "references.bodyUrl": {
    message: "Body URL",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "references.reference": {
    message: "Reference",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "references.sourceLine": {
    message: "{source} · line {line}",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: ["source", "line"],
  },
  "ghost.createTitle": {
    message: "Create “{name}”",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: ["name"],
  },
  "ghost.createHelpWithExcalidraw": {
    message: "Choose where to create this note and whether it should be Markdown or an Excalidraw drawing.",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "ghost.createHelp": {
    message: "Choose where to create this note.",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "ghost.locationConflictHelp": {
    message: "Its parent notes resolve to different new-note folders. Choose the location to use.",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "noteType.title": {
    message: "Set note type",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "noteType.placeholder": {
    message: "e.g. project",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "rename.title": {
    message: "Rename note",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "rename.folderSeparators": {
    message: "Rename changes the note name only. Folder separators are not allowed.",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "rename.failed": {
    message: "Could not rename note: {error}",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: ["error"],
  },
  "rename.placeholder": {
    message: "Note name",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "content.activeThought": {
    message: "ACTIVE THOUGHT",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "content.createNote": {
    message: "Create note",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "content.folderThought": {
    message: "Folder thought",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "content.tagThought": {
    message: "Tag thought",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "content.rendering": {
    message: "Rendering note…",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "content.mappedLinks": {
    message: "Mapped links",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "node.accessibleLabel": {
    message: "{label} — {path}",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: ["label", "path"],
  },
  "node.foldSectionChildren": {
    message: "Fold section children",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "node.unfoldSectionChildren": {
    message: "Unfold section children",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "node.hiddenCount": {
    message: "{count} hidden",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: ["count"],
  },
  "node.gateTagDisabled": {
    message: "{gate} gate · drag linking is disabled for tag thoughts",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: ["gate"],
  },
  "node.gateFolderChild": {
    message: "child gate · drag to create a note in this folder",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "node.gateFolderDisabled": {
    message: "{gate} gate · folder relationship editing is disabled",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: ["gate"],
  },
  "node.gateVisible": {
    message: "{gate} gate · {count} visible",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: ["gate", "count"],
  },
  "node.gateEmpty": {
    message: "{gate} gate · no relationships",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: ["gate"],
  },
  "relation.move": {
    message: "Move relationship",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "relation.addRole": {
    message: "Add {role}",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: ["role"],
  },
  "relation.markdownNote": {
    message: "Markdown note",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "relation.searchNotes": {
    message: "Search notes…",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "relation.noUnconnectedMatches": {
    message: "No unconnected Markdown notes match.",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "relation.noteProperty": {
    message: "Note property",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },
  "relation.inverseStorage": {
    message: "{role} is stored on the Markdown note using the inverse document property {property}.",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: ["role", "property"],
  },
  "relation.save": {
    message: "Save relationship",
    context: "Legacy K-Plex user-facing copy migrated during the full English catalog pass.",
    params: [],
  },


  "command.rebuildIndex": {
    message: "Rebuild index",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "command.openPopout": {
    message: "Open in pop-out window",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "command.openSidepanel": {
    message: "Open in side panel",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "command.search": {
    message: "Search",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "command.addChild": {
    message: "Add child",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "command.addParent": {
    message: "Add parent",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "command.addFriend": {
    message: "Add friend",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "command.addChallenger": {
    message: "Add challenger",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "command.syncRecentTabFromNode": {
    message: "Sync most recent note tab with current node",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "command.syncNodeFromRecentTab": {
    message: "Sync current node with most recent note tab",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "command.focusActiveNote": {
    message: "Focus active note",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "ribbon.open": {
    message: "Open K-Plex",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "notice.rebuildingIndex": {
    message: "Rebuilding K-Plex index…",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "sidecar.unfoldPlex": {
    message: "Unfold K-Plex",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "index.statusReady": {
    message: "Index status: up to date",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "index.statusUpdating": {
    message: "Index status: updating — the graph may be temporarily incomplete",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "index.incompleteBubble": {
    message: "Indexing in progress. Graph and search results are incomplete.",
    context: "Startup info bubble shown beside the updating index indicator while K-Plex is still building or hydrating its authoritative graph.",
    params: [],
  },
  "infoBubble.dismiss": {
    message: "Dismiss",
    context: "Reusable K-Plex info bubble action that closes the current guidance callout.",
    params: [],
  },
  "app.syncRecentTabWithPlex": {
    message: "Sync most recent note tab with K-Plex",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "app.syncPlexWithRecentTab": {
    message: "Sync K-Plex with most recent note tab",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "app.syncModeOff": {
    message: "K-Plex not linked to a note tab",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "app.syncModeRecent": {
    message: "K-Plex linked to most recent note tab",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "app.syncModePinned": {
    message: "K-Plex pinned to one fixed note tab",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "app.showLinkedTab": {
    message: "Show linked/pinned tab",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "app.buildingIndex": {
    message: "Building K-Plex index…",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "app.syncStatusOff": {
    message: "K-Plex is not linked to a note tab",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "app.syncStatusRecent": {
    message: "K-Plex is linked to the most recent note tab",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "app.syncStatusNoRecent": {
    message: "No recent note tab is currently available",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "app.syncStatusPinned": {
    message: "K-Plex is pinned to a fixed note tab{suffix}",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: ["suffix"],
  },
  "app.syncStatusPinnedUnavailable": {
    message: "K-Plex has a pinned-tab preference, but the tab is not currently connected",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "app.syncActions": {
    message: "{status}. Click for sync actions and link mode.",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: ["status"],
  },
  "app.displayAliasesOn": {
    message: "Display aliases: on",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "app.displayAliasesOff": {
    message: "Display aliases: off",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "app.singleLevelView": {
    message: "Single-level view",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "app.expandedView": {
    message: "Expanded view: show each node’s children",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "app.useStraightConnectors": {
    message: "Use straight connectors",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "app.useCurvedConnectors": {
    message: "Use curved connectors",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "app.openSettings": {
    message: "Open K-Plex settings",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "app.pinnedNodes": {
    message: "Pinned nodes",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "app.unpinNode": {
    message: "Unpin {title}",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: ["title"],
  },
  "app.zoneParents": {
    message: "PARENTS",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "app.zoneFriendsPrevious": {
    message: "FRIENDS / PREVIOUS",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "app.zoneChallengersNext": {
    message: "CHALLENGERS / NEXT",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "app.zoneChildren": {
    message: "CHILDREN",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "app.sidecarControls": {
    message: "Sidecar controls",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "app.closeSidecar": {
    message: "Close companion Sidecar",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "app.openSidecarAt": {
    message: "Open Sidecar on the {position}",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: ["position"],
  },
  "app.foldForSidecar": {
    message: "Fold K-Plex and give the companion document the full split",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "app.moveSidecar": {
    message: "Move Sidecar",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "app.detachSidecar": {
    message: "Detach Sidecar — keep this tab open independently",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "app.pastNodes": {
    message: "PAST NODES",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "position.right": {
    message: "Right",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "position.left": {
    message: "Left",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "position.above": {
    message: "Above",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },
  "position.below": {
    message: "Below",
    context: "K-Plex host shell, command, toolbar, and status copy.",
    params: [],
  },


  "notice.webViewerUnavailable": {
    message: "Obsidian's Web viewer is not available. Open the link from the node instead.",
    context: "K-Plex notices, ontology actions, validation, or evidence navigation copy.",
    params: [],
  },
  "notice.sidepanelUnavailable": {
    message: "The Obsidian sidepanel is not available in this workspace.",
    context: "K-Plex notices, ontology actions, validation, or evidence navigation copy.",
    params: [],
  },
  "notice.popoutUnavailable": {
    message: "Pop-out windows are not available on this platform.",
    context: "K-Plex notices, ontology actions, validation, or evidence navigation copy.",
    params: [],
  },
  "notice.folder": {
    message: "Folder: {name}",
    context: "K-Plex notices, ontology actions, validation, or evidence navigation copy.",
    params: ["name"],
  },
  "notice.tag": {
    message: "Tag: #{name}",
    context: "K-Plex notices, ontology actions, validation, or evidence navigation copy.",
    params: ["name"],
  },
  "notice.openPluginSettings": {
    message: "Open Settings → Community plugins → K-Plex.",
    context: "K-Plex notices, ontology actions, validation, or evidence navigation copy.",
    params: [],
  },
  "notice.selectedNoteNotIndexed": {
    message: "The selected note is not in the K-Plex index yet.",
    context: "K-Plex notices, ontology actions, validation, or evidence navigation copy.",
    params: [],
  },
  "notice.alreadyConnected": {
    message: "These nodes are already connected through this gate.",
    context: "K-Plex notices, ontology actions, validation, or evidence navigation copy.",
    params: [],
  },
  "notice.dragOriginRequiresMarkdownTarget": {
    message: "When the drag origin is not a Markdown note, the target must be a Markdown note.",
    context: "K-Plex notices, ontology actions, validation, or evidence navigation copy.",
    params: [],
  },
  "notice.relationshipNeedsMarkdown": {
    message: "At least one side of the relationship must be a Markdown note.",
    context: "K-Plex notices, ontology actions, validation, or evidence navigation copy.",
    params: [],
  },
  "notice.excalidrawLegacyDrawing": {
    message: "Excalidraw created a legacy non-Markdown drawing. Enable Markdown Excalidraw files in Excalidraw settings to use it as a K-Plex note.",
    context: "K-Plex notices, ontology actions, validation, or evidence navigation copy.",
    params: [],
  },
  "notice.excalidrawUnavailable": {
    message: "Excalidraw is not available.",
    context: "K-Plex notices, ontology actions, validation, or evidence navigation copy.",
    params: [],
  },
  "error.excalidrawCreatedFileMissing": {
    message: "Excalidraw did not return a created file.",
    context: "Error surfaced when an Excalidraw creation request completes without a usable file.",
    params: [],
  },
  "error.relationshipRequiresMarkdownEndpoint": {
    message: "A new K-Plex relationship requires at least one Markdown endpoint.",
    context: "Error surfaced when a new relationship cannot be persisted because neither endpoint is a Markdown note.",
    params: [],
  },
  "notice.webLinkMarkdownOnly": {
    message: "Web links can only be added from a Markdown node.",
    context: "K-Plex notices, ontology actions, validation, or evidence navigation copy.",
    params: [],
  },
  "notice.invalidWebLink": {
    message: "Enter a valid http:// or https:// web link.",
    context: "K-Plex notices, ontology actions, validation, or evidence navigation copy.",
    params: [],
  },
  "notice.placeholderNeedsMarkdown": {
    message: "A placeholder relationship must be stored in a Markdown note.",
    context: "K-Plex notices, ontology actions, validation, or evidence navigation copy.",
    params: [],
  },
  "notice.placeholderInvalidName": {
    message: "The placeholder does not have a valid note name.",
    context: "K-Plex notices, ontology actions, validation, or evidence navigation copy.",
    params: [],
  },
  "ontology.contextMenu": {
    message: "Add/change “{field}” in K-Plex ontology",
    context: "K-Plex notices, ontology actions, validation, or evidence navigation copy.",
    params: ["field"],
  },
  "command.ontologySelect": {
    message: "Assign field to K-Plex ontology…",
    context: "K-Plex notices, ontology actions, validation, or evidence navigation copy.",
    params: [],
  },
  "command.ontologyParent": {
    message: "Assign field as Parent ontology",
    context: "K-Plex notices, ontology actions, validation, or evidence navigation copy.",
    params: [],
  },
  "command.ontologyChild": {
    message: "Assign field as Child ontology",
    context: "K-Plex notices, ontology actions, validation, or evidence navigation copy.",
    params: [],
  },
  "command.ontologyFriend": {
    message: "Assign field as Friend / left ontology",
    context: "K-Plex notices, ontology actions, validation, or evidence navigation copy.",
    params: [],
  },
  "command.ontologyChallenger": {
    message: "Assign field as Challenger / right ontology",
    context: "K-Plex notices, ontology actions, validation, or evidence navigation copy.",
    params: [],
  },
  "command.ontologyPrevious": {
    message: "Assign field as Previous ontology",
    context: "K-Plex notices, ontology actions, validation, or evidence navigation copy.",
    params: [],
  },
  "command.ontologyNext": {
    message: "Assign field as Next ontology",
    context: "K-Plex notices, ontology actions, validation, or evidence navigation copy.",
    params: [],
  },
  "command.ontologyHidden": {
    message: "Assign field as Hidden ontology",
    context: "K-Plex notices, ontology actions, validation, or evidence navigation copy.",
    params: [],
  },
  "command.ontologyExcluded": {
    message: "Assign field as Excluded / metadata-only ontology",
    context: "K-Plex notices, ontology actions, validation, or evidence navigation copy.",
    params: [],
  },
  "evidence.navigateLine": {
    message: "Navigate to line {line}",
    context: "K-Plex notices, ontology actions, validation, or evidence navigation copy.",
    params: ["line"],
  },
  "evidence.navigateLink": {
    message: "Navigate to link",
    context: "K-Plex notices, ontology actions, validation, or evidence navigation copy.",
    params: [],
  },
  "evidence.navigateLinkNumber": {
    message: "Navigate to link {index}",
    context: "K-Plex notices, ontology actions, validation, or evidence navigation copy.",
    params: ["index"],
  },
  "evidence.navigateProperty": {
    message: "Navigate to property “{field}”",
    context: "K-Plex notices, ontology actions, validation, or evidence navigation copy.",
    params: ["field"],
  },
  "evidence.property": {
    message: "Property “{field}”",
    context: "K-Plex notices, ontology actions, validation, or evidence navigation copy.",
    params: ["field"],
  },
  "evidence.paragraphAroundLine": {
    message: "Paragraph around line {line}",
    context: "K-Plex notices, ontology actions, validation, or evidence navigation copy.",
    params: ["line"],
  },
  "evidence.linkOccurrenceLine": {
    message: "Link occurrence · line {line}",
    context: "K-Plex notices, ontology actions, validation, or evidence navigation copy.",
    params: ["line"],
  },
  "evidence.linkLine": {
    message: "Link · line {line}",
    context: "K-Plex notices, ontology actions, validation, or evidence navigation copy.",
    params: ["line"],
  },


  "addRelated.enterOntologyField": {
    message: "Enter an ontology field.",
    context: "Add-related-note dialog copy and accessibility labels.",
    params: [],
  },
  "addRelated.relationshipFailed": {
    message: "Could not add relationship: {error}",
    context: "Add-related-note dialog copy and accessibility labels.",
    params: ["error"],
  },
  "addRelated.createFailed": {
    message: "Could not create related note: {error}",
    context: "Add-related-note dialog copy and accessibility labels.",
    params: ["error"],
  },
  "addRelated.placeholderAliasNotSaved": {
    message: "Placeholder nodes cannot persist aliases. The alias will not be saved.",
    context: "Add-related-note dialog copy and accessibility labels.",
    params: [],
  },
  "addRelated.placeholderFailed": {
    message: "Could not create placeholder: {error}",
    context: "Add-related-note dialog copy and accessibility labels.",
    params: ["error"],
  },
  "addRelated.webLinkFailed": {
    message: "Could not add web link: {error}",
    context: "Add-related-note dialog copy and accessibility labels.",
    params: ["error"],
  },
  "addRelated.searchPlaceholder": {
    message: "Find a note, type a new name, or paste a web link…",
    context: "Add-related-note dialog copy and accessibility labels.",
    params: [],
  },
  "addRelated.searchAria": {
    message: "Related note name or web link",
    context: "Add-related-note dialog copy and accessibility labels.",
    params: [],
  },
  "addRelated.aliasPlaceholder": {
    message: "Alias",
    context: "Add-related-note dialog copy and accessibility labels.",
    params: [],
  },
  "addRelated.aliasAria": {
    message: "Alias (optional)",
    context: "Add-related-note dialog copy and accessibility labels.",
    params: [],
  },
  "addRelated.ontologyPlaceholder": {
    message: "Ontology · {field}",
    context: "Add-related-note dialog copy and accessibility labels.",
    params: ["field"],
  },
  "addRelated.ontologyAria": {
    message: "Ontology field",
    context: "Add-related-note dialog copy and accessibility labels.",
    params: [],
  },
  "addRelated.createMarkdownLink": {
    message: "Create Markdown note and link it",
    context: "Add-related-note dialog copy and accessibility labels.",
    params: [],
  },
  "addRelated.createMarkdown": {
    message: "Create Markdown note",
    context: "Add-related-note dialog copy and accessibility labels.",
    params: [],
  },
  "addRelated.createExcalidrawLink": {
    message: "Create Excalidraw drawing and link it",
    context: "Add-related-note dialog copy and accessibility labels.",
    params: [],
  },
  "addRelated.createExcalidraw": {
    message: "Create Excalidraw drawing",
    context: "Add-related-note dialog copy and accessibility labels.",
    params: [],
  },
  "addRelated.createPlaceholder": {
    message: "Create placeholder node",
    context: "Add-related-note dialog copy and accessibility labels.",
    params: [],
  },
  "addRelated.addWebLink": {
    message: "Add web link",
    context: "Add-related-note dialog copy and accessibility labels.",
    params: [],
  },
  "addRelated.webLinkRequiresMarkdown": {
    message: "Web links require a Markdown origin node",
    context: "Add-related-note dialog copy and accessibility labels.",
    params: [],
  },
  "addRelated.addLink": {
    message: "Add link",
    context: "Add-related-note dialog copy and accessibility labels.",
    params: [],
  },
  "addRelated.linkTo": {
    message: "Link to {title}",
    context: "Add-related-note dialog copy and accessibility labels.",
    params: ["title"],
  },
  "addRelated.link": {
    message: "Link",
    context: "Add-related-note dialog copy and accessibility labels.",
    params: [],
  },
  "addRelated.openForEditing": {
    message: "Open for editing",
    context: "Add-related-note dialog copy and accessibility labels.",
    params: [],
  },
  "addRelated.openNewForEditing": {
    message: "Open the new note for editing",
    context: "Add-related-note dialog copy and accessibility labels.",
    params: [],
  },
  "addRelated.selectedExisting": {
    message: "Selected existing note: {path}",
    context: "Add-related-note dialog copy and accessibility labels.",
    params: ["path"],
  },
  "addRelated.webMarkdownExplanation": {
    message: "Web links can only be added from a Markdown node because the relationship is stored in document properties.",
    context: "Add-related-note dialog copy and accessibility labels.",
    params: [],
  },
  "addRelated.webAliasStatus": {
    message: "Add “{alias}” as a web link.",
    context: "Add-related-note dialog copy and accessibility labels.",
    params: ["alias"],
  },
  "addRelated.webStatus": {
    message: "Add this web link. Add an optional alias for its display text.",
    context: "Add-related-note dialog copy and accessibility labels.",
    params: [],
  },
  "addRelated.existingName": {
    message: "A note with this name already exists. Select it from the search results to link it.",
    context: "Add-related-note dialog copy and accessibility labels.",
    params: [],
  },
  "addRelated.createStatus": {
    message: "Create “{name}” as Markdown, or a placeholder. Alias is optional.",
    context: "Add-related-note dialog copy and accessibility labels when Excalidraw creation is unavailable.",
    params: ["name"],
  },
  "addRelated.createStatusWithExcalidraw": {
    message: "Create “{name}” as Markdown, Excalidraw, or a placeholder. Alias is optional.",
    context: "Add-related-note dialog copy and accessibility labels when Excalidraw creation is available.",
    params: ["name"],
  },
  "addRelated.title": {
    message: "Add",
    context: "Add-related-note dialog copy and accessibility labels.",
    params: [],
  },
  "addRelated.relationshipType": {
    message: "Relationship type",
    context: "Add-related-note dialog copy and accessibility labels.",
    params: [],
  },


  "relation.noAvailableMatches": {
    message: "No available Markdown notes match.",
    context: "Relationship create/relink dialog copy.",
    params: [],
  },
  "relation.updateFailed": {
    message: "Could not update relationship: {error}",
    context: "Relationship create/relink dialog copy.",
    params: ["error"],
  },
  "relation.specifyOntology": {
    message: "Specify connection ontology",
    context: "Relationship create/relink dialog copy.",
    params: [],
  },
  "relation.addOntologyTitle": {
    message: "Add connection ontology",
    context: "Relationship create/relink dialog copy.",
    params: [],
  },
  "relation.directionRole": {
    message: "Direction / role",
    context: "Relationship create/relink dialog copy.",
    params: [],
  },
  "relation.writePropertyToNote": {
    message: "Write property to note",
    context: "Relationship create/relink dialog copy.",
    params: [],
  },
  "relation.recommendedSuffix": {
    message: "{title} — recommended",
    context: "Relationship create/relink dialog copy.",
    params: ["title"],
  },
  "relation.ontologyEvidenceRecommendation": {
    message: "K-Plex recommends the note that already contains the strongest relationship evidence. The new ontology is added there; existing ontology sources are kept.",
    context: "Relationship create/relink dialog copy.",
    params: [],
  },
  "relation.ontologyEitherNote": {
    message: "Either Markdown note can store the new ontology. Existing ontology sources are kept.",
    context: "Relationship create/relink dialog copy.",
    params: [],
  },
  "relation.moveEvidenceRecommendation": {
    message: "K-Plex recommends the note that already contains the strongest relationship evidence. You can deliberately move the defining property to the other note.",
    context: "Relationship create/relink dialog copy.",
    params: [],
  },
  "relation.moveEitherNote": {
    message: "Either Markdown note can own the relationship property. K-Plex recommends the current note by default.",
    context: "Relationship create/relink dialog copy.",
    params: [],
  },
  "relation.specifyOntologyHelp": {
    message: "K-Plex adds the selected ontology as a document property so this inferred connection has an explicit ontology. Existing links and source text are kept.",
    context: "Relationship create/relink dialog copy.",
    params: [],
  },
  "relation.addOntologyHelp": {
    message: "K-Plex adds the selected ontology as an additional document property. Existing ontology properties and Markdown-body relationship text are kept; use Connection details → Go to source to edit an existing source.",
    context: "Relationship create/relink dialog copy.",
    params: [],
  },
  "relation.willAddProperty": {
    message: "K-Plex will add {field} in {note}. Existing ontology sources are kept.",
    context: "Relationship create/relink dialog copy.",
    params: ["field", "note"],
  },
  "relation.willWriteProperty": {
    message: "K-Plex will write {field} in {note}.",
    context: "Relationship create/relink dialog copy.",
    params: ["field", "note"],
  },
  "relation.inverseTargetStorage": {
    message: "The relationship is stored on the Markdown target using the inverse property {property}.",
    context: "Relationship create/relink dialog copy.",
    params: ["property"],
  },
  "relation.specifyOntologyButton": {
    message: "Specify ontology",
    context: "Relationship create/relink dialog copy.",
    params: [],
  },
  "relation.addOntologyButton": {
    message: "Add ontology",
    context: "Relationship create/relink dialog copy.",
    params: [],
  },


  "filter.roleFriendLeft": {
    message: "Friend (left)",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.roleChallengerRight": {
    message: "Challenger (right)",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.roleSibling": {
    message: "Sibling",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.edgeDefined": {
    message: "Defined",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.edgeInferred": {
    message: "Inferred",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.directionFrom": {
    message: "From source",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.directionTo": {
    message: "To source",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.directionBoth": {
    message: "Both",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.sourceFrontmatter": {
    message: "Frontmatter property",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.sourceInline": {
    message: "Inline property",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.sourceMarkdown": {
    message: "Markdown link",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.sourceUnresolved": {
    message: "Unresolved Markdown link",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.sourceDate": {
    message: "Date property",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.sourceBodyUrl": {
    message: "Body URL",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.sourceFolder": {
    message: "Folder hierarchy",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.sourceTag": {
    message: "Tag hierarchy",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.sourceUrlOrigin": {
    message: "URL origin",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.active": {
    message: "Active",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.suppressed": {
    message: "Suppressed",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.fieldTitle": {
    message: "Title",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.fieldPath": {
    message: "Path",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.fieldFolder": {
    message: "Folder",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.fieldTag": {
    message: "Tag",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.fieldNoteType": {
    message: "Note type",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.fieldFileType": {
    message: "File type",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.fieldProperty": {
    message: "Property…",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.fieldPropertyHelp": {
    message: "Any Markdown frontmatter property",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.fieldRelationshipProperty": {
    message: "Relationship property",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.fieldRelationshipPropertyHelp": {
    message: "The property/definition that produced the displayed relationship, e.g. working-on",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.fieldPlexPosition": {
    message: "Plex position",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.fieldDefinedInferred": {
    message: "Defined / inferred",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.fieldDirection": {
    message: "Direction",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.fieldSourcePath": {
    message: "Source path",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.fieldTargetPath": {
    message: "Target path",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.fieldPropertyField": {
    message: "Property / field",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.fieldRelationshipDefinition": {
    message: "Relationship definition",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.fieldEvidenceSource": {
    message: "Evidence source",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.fieldResolutionStatus": {
    message: "Resolution status",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.fieldDeclaredPlexPosition": {
    message: "Declared Plex position",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.fieldDeclaredBy": {
    message: "Declared by",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.fieldDeclaredTarget": {
    message: "Declared target",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.fieldSuppressionReason": {
    message: "Suppression reason",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.operatorHasTag": {
    message: "has tag",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.operatorDoesNotHaveTag": {
    message: "does not have tag",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.operatorInFolder": {
    message: "is in folder",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.operatorNotInFolder": {
    message: "is not in folder",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.operatorIs": {
    message: "is",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.operatorIsNot": {
    message: "is not",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.operatorContains": {
    message: "contains",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.operatorDoesNotContain": {
    message: "does not contain",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.operatorStartsWith": {
    message: "starts with",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.operatorEndsWith": {
    message: "ends with",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.operatorExists": {
    message: "exists",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.operatorNotExists": {
    message: "does not exist",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.scopeRelationship": {
    message: "Relationship",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.scopeEvidence": {
    message: "Evidence",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.scopeNote": {
    message: "Note",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.modeInclude": {
    message: "Include",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.modeExclude": {
    message: "Exclude",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.modeStyle": {
    message: "Style",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.validationAddCondition": {
    message: "Add at least one condition.",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.validationChooseProperty": {
    message: "Choose a note property.",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.validationChooseValue": {
    message: "Choose or enter a value for every condition.",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.advancedCannotSimple": {
    message: "This advanced expression cannot be represented by the simple builder. Keep Code view, or replace it with a new simple filter.",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.addFilterCondition": {
    message: "Add a filter condition.",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.currentCenterNote": {
    message: "Current center note",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.choose": {
    message: "Choose…",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.exampleWorkingOn": {
    message: "e.g. working-on",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.valuePlaceholder": {
    message: "Value",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.visibility": {
    message: "Visibility",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.visibilityMarkdown": {
    message: "Markdown",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.visibilityMarkdownHelp": {
    message: "Show or hide Markdown notes",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.visibilityAttachments": {
    message: "Attachments",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.visibilityAttachmentsHelp": {
    message: "Show or hide attachment nodes",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.visibilityFolders": {
    message: "Folders",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.visibilityFoldersHelp": {
    message: "Show or hide folder nodes",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.visibilityTags": {
    message: "Tags",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.visibilityTagsHelp": {
    message: "Show or hide tag nodes",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.visibilityWebLinks": {
    message: "Web links",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.visibilityWebLinksHelp": {
    message: "Show or hide web-link nodes",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.visibilityPlaceholders": {
    message: "Placeholders",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.visibilityPlaceholdersHelp": {
    message: "Show or hide placeholder notes",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.visibilityInferred": {
    message: "Inferred",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.visibilityInferredHelp": {
    message: "Show or hide inferred relationships and nodes",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.showLabel": {
    message: "Show {label}",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: ["label"],
  },
  "filter.siblings": {
    message: "Siblings",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.siblingsHelp": {
    message: "Show or hide sibling nodes",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.showSiblings": {
    message: "Show siblings",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.crossLinks": {
    message: "Cross-links",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.crossLinksHelp": {
    message: "Show or hide connections between peripheral nodes",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.showCrossLinks": {
    message: "Show cross-links",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.nodeOrder": {
    message: "Node order",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.sortWithinZone": {
    message: "Sort within each zone",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.sortNameAsc": {
    message: "Name · A → Z",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.sortNameDesc": {
    message: "Name · Z → A",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.sortModifiedDesc": {
    message: "Modified · newest first",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.sortModifiedAsc": {
    message: "Modified · oldest first",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.sortCreatedDesc": {
    message: "Created · newest first",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.sortCreatedAsc": {
    message: "Created · oldest first",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.sortConnectionsDesc": {
    message: "Connections · most first",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.sortConnectionsAsc": {
    message: "Connections · fewest first",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.quickLens": {
    message: "Quick lens",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.reflow": {
    message: "Reflow",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.reflowHelp": {
    message: "Repack filtered nodes instead of leaving layout gaps",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.reflowAria": {
    message: "Reflow filtered nodes",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.scope": {
    message: "Scope",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.noteName": {
    message: "Note name",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.match": {
    message: "Match",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.value": {
    message: "Value",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.tagPlaceholder": {
    message: "#tag",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.textPlaceholder": {
    message: "Text",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.clearQuick": {
    message: "Clear quick lens",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.graphLenses": {
    message: "Graph lenses",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.turnAllOff": {
    message: "Turn all off",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.newLens": {
    message: "New graph lens",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.emptyLenses": {
    message: "Create a named lens to show, hide, or style matching notes or relationships in the current Plex.",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.turnOffLens": {
    message: "Turn off {name}",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: ["name"],
  },
  "filter.turnOnLens": {
    message: "Turn on {name}",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: ["name"],
  },
  "filter.on": {
    message: "On",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.off": {
    message: "Off",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.editLens": {
    message: "Edit {name}",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: ["name"],
  },
  "filter.deleteLens": {
    message: "Delete {name}",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: ["name"],
  },
  "filter.name": {
    message: "Name",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.optional": {
    message: "(optional)",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.namePlaceholder": {
    message: "Defaults to the first filter value",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.effect": {
    message: "Effect",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.showMatching": {
    message: "Show matching",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.hideMatching": {
    message: "Hide matching",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.styleMatching": {
    message: "Style matching",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.editorMode": {
    message: "Lens editor mode",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.simple": {
    message: "Simple",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.code": {
    message: "Code",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.matchHeading": {
    message: "Match",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.allFollowing": {
    message: "all of the following",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.anyFollowing": {
    message: "any of the following",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.where": {
    message: "where",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.propertyName": {
    message: "Property name",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.removeCondition": {
    message: "Remove condition",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.addFilter": {
    message: "Add filter",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.edgeSimpleHelp": {
    message: "To show connections such as working-on, choose Relationship property → is → working-on. No expression syntax is required.",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.expression": {
    message: "Expression",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.expressionPlaceholder": {
    message: "edge.definition == \"working-on\"",
    context: "Example expression placeholder in the advanced Graph Lens editor.",
    params: [],
  },
  "filter.advancedHelp": {
    message: "Advanced Bases-inspired expression mode. Example: edge.definition.equals(\"working-on\"). Use and, or, not and parentheses. No JavaScript is executed.",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.appearance": {
    message: "Appearance",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.fill": {
    message: "Fill",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.border": {
    message: "Border",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.text": {
    message: "Text",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.borderStyle": {
    message: "Border style",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.borderWidth": {
    message: "Border width",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.fillStyle": {
    message: "Fill style",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.line": {
    message: "Line",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.label": {
    message: "Label",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.lineStyle": {
    message: "Line style",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.lineWidth": {
    message: "Line width",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.showRelationshipLabel": {
    message: "Show relationship label",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.solid": {
    message: "Solid",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.dashed": {
    message: "Dashed",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.dotted": {
    message: "Dotted",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.hachure": {
    message: "Hachure",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.crossHatch": {
    message: "Cross-hatch",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.styleHelp": {
    message: "Style lenses do not hide anything. If several style lenses match, later lenses override only the appearance fields they set.",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.saveLens": {
    message: "Save lens",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.trigger": {
    message: "Filter visible Plex / Graph Lenses",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: [],
  },
  "filter.activeLensCount": {
    message: "{count} active lenses",
    context: "Graph Lens and visible-Plex filter user interface copy.",
    params: ["count"],
  },

  "graph.zoneParents": {
    message: "Parents",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.zoneChildren": {
    message: "Children",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.zoneFriendsPrevious": {
    message: "Friends / Previous",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.zoneChallengersNext": {
    message: "Challengers / Next",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.zoneSiblings": {
    message: "Siblings",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.sourceResolvedLink": {
    message: "Resolved link",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.sourceUnresolvedLink": {
    message: "Unresolved link",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.sourceDocumentProperty": {
    message: "Document property",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.sourceBodyProperty": {
    message: "Body property",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.sourceBodyUrl": {
    message: "Body URL",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.sourceDateProperty": {
    message: "Date property",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.sourceFolderTree": {
    message: "Folder tree",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.sourceTagTree": {
    message: "Tag tree",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.sourceUrlOrigin": {
    message: "URL origin",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.relationDefined": {
    message: "Defined",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.relationInferred": {
    message: "Inferred",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.resolved": {
    message: "Resolved: {roles}",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: ["roles"],
  },
  "graph.resolvedHidden": {
    message: "Resolved: Hidden",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.evidenceDecision": {
    message: "{source} — {resolution}",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: ["source", "resolution"],
  },
  "graph.evidenceDecisionOverridden": {
    message: "{source} — {resolution} · overridden",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: ["source", "resolution"],
  },
  "graph.selectNote": {
    message: "Select a note to start navigating K-Plex.",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.addNote": {
    message: "Add note…",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.openMenu": {
    message: "Open",
    context: "Parent submenu in a Plex node context menu for choosing where a file opens.",
    params: [],
  },
  "graph.focusOpenTab": {
    message: "Focus open tab",
    context: "Plex node Open submenu action shown only when the file is already open in a workspace tab.",
    params: [],
  },
  "graph.openNewTab": {
    message: "Open in new tab",
    context: "Plex node Open submenu action available on all supported platforms.",
    params: [],
  },
  "graph.openAdjacentPane": {
    message: "Open in adjacent pane",
    context: "Plex node Open submenu action available on desktop and tablet, where Obsidian can create a split pane.",
    params: [],
  },
  "graph.openPopoutWindow": {
    message: "Open in pop-out window",
    context: "Plex node Open submenu action available on desktop.",
    params: [],
  },
  "graph.setNoteType": {
    message: "Set note type…",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.renameNote": {
    message: "Rename note…",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.unpinNote": {
    message: "Unpin note",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.pinNote": {
    message: "Pin note",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.deleteNote": {
    message: "Delete note…",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.deletePlaceholder": {
    message: "Delete placeholder…",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.collapseSections": {
    message: "Collapse note sections",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.expandSections": {
    message: "Expand note to sections",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.foldAllSections": {
    message: "Fold all sections",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.unfoldAllSections": {
    message: "Unfold all sections",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.openSection": {
    message: "Open section",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.foldOneLevel": {
    message: "Fold one level",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.unfoldOneLevel": {
    message: "Unfold one level",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.foldAllDescendants": {
    message: "Fold all descendants",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.unfoldAllDescendants": {
    message: "Unfold all descendants",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.connectionDetails": {
    message: "Connection details…",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.unlinkConnection": {
    message: "Unlink connection",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.filterZonePlaceholder": {
    message: "Filter {zone}…",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: ["zone"],
  },
  "graph.filterZone": {
    message: "Filter {zone}",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: ["zone"],
  },
  "graph.zoneCount": {
    message: "{count} {zone}",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: ["count", "zone"],
  },
  "graph.updatingRelationship": {
    message: "Updating relationship…",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.density": {
    message: "Density",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.compactness": {
    message: "Compactness",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.columns": {
    message: "Columns",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.parentChildColumns": {
    message: "Parent and child columns",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.zoomIn": {
    message: "Zoom in",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.zoomOut": {
    message: "Zoom out",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.fitGraph": {
    message: "Fit graph",
    context: "Plex graph controls, menus, relationship evidence, and accessibility copy.",
    params: [],
  },
  "graph.moreEvidence": {
    plural: { one: "+{count} more evidence item", other: "+{count} more evidence items" },
    countParam: "count",
    context: "Count of additional relationship evidence items not shown in the hover summary.",
    params: ["count"],
  },

  "explain.sourceResolvedNoteLink": {
    message: "Resolved note link",
    context: "Connection-details explanation modal copy.",
    params: [],
  },
  "explain.sourceUnresolvedNoteLink": {
    message: "Unresolved note link",
    context: "Connection-details explanation modal copy.",
    params: [],
  },
  "explain.sourceDocumentProperty": {
    message: "Document property",
    context: "Connection-details explanation modal copy.",
    params: [],
  },
  "explain.sourceMarkdownBodyProperty": {
    message: "Markdown body property",
    context: "Connection-details explanation modal copy.",
    params: [],
  },
  "explain.sourceBodyUrl": {
    message: "Body URL",
    context: "Connection-details explanation modal copy.",
    params: [],
  },
  "explain.sourceDateProperty": {
    message: "Date property",
    context: "Connection-details explanation modal copy.",
    params: [],
  },
  "explain.sourcePhysicalFolderTree": {
    message: "Physical folder tree",
    context: "Connection-details explanation modal copy.",
    params: [],
  },
  "explain.sourceTagTree": {
    message: "Tag tree",
    context: "Connection-details explanation modal copy.",
    params: [],
  },
  "explain.sourceUrlOriginHierarchy": {
    message: "URL origin hierarchy",
    context: "Connection-details explanation modal copy.",
    params: [],
  },
  "explain.line": {
    message: "line {line}",
    context: "Connection-details explanation modal copy.",
    params: ["line"],
  },
  "explain.overriddenSuffix": {
    message: "{resolution} · Overridden",
    context: "Connection-details explanation modal copy.",
    params: ["resolution"],
  },
  "explain.evidenceResolution": {
    message: "Evidence resolution",
    context: "Connection-details explanation modal copy.",
    params: [],
  },
  "explain.ontology": {
    message: "Ontology",
    context: "Connection-details explanation modal copy.",
    params: [],
  },
  "explain.noOntology": {
    message: "Inferred / no ontology property",
    context: "Connection-details explanation modal copy.",
    params: [],
  },
  "explain.addOntology": {
    message: "Add ontology…",
    context: "Connection-details explanation modal copy.",
    params: [],
  },
  "explain.specifyOntology": {
    message: "Specify ontology…",
    context: "Connection-details explanation modal copy.",
    params: [],
  },
  "explain.used": {
    message: "USED",
    context: "Connection-details explanation modal copy.",
    params: [],
  },
  "explain.overridden": {
    message: "OVERRIDDEN",
    context: "Connection-details explanation modal copy.",
    params: [],
  },
  "explain.usedAria": {
    message: "This source contributes to the resolved connection.",
    context: "Connection-details explanation modal copy.",
    params: [],
  },
  "explain.overriddenAria": {
    message: "This source is retained but currently loses a precedence decision.",
    context: "Connection-details explanation modal copy.",
    params: [],
  },
  "explain.detectedAs": {
    message: "Detected as: {signals}",
    context: "Connection-details explanation modal copy.",
    params: ["signals"],
  },
  "explain.goToSource": {
    message: "Go to source",
    context: "Connection-details explanation modal copy.",
    params: [],
  },
  "explain.title": {
    message: "Connection details",
    context: "Connection-details explanation modal copy.",
    params: [],
  },
  "explain.siblingOf": {
    message: "Displayed as a sibling of {center}. The connector shown here is the underlying parent → child relationship that makes the sibling derivation possible.",
    context: "Connection-details explanation modal copy.",
    params: ["center"],
  },
  "explain.sibling": {
    message: "Displayed as a sibling. The connector shown here is the underlying parent → child relationship that makes the sibling derivation possible.",
    context: "Connection-details explanation modal copy.",
    params: [],
  },
  "explain.why": {
    message: "Why this connection exists",
    context: "Connection-details explanation modal copy.",
    params: [],
  },
  "explain.resolvedAs": {
    message: "Resolved as: {roles}",
    context: "Connection-details explanation modal copy.",
    params: ["roles"],
  },
  "explain.resolvedAsHidden": {
    message: "Resolved as: Hidden",
    context: "Connection-details explanation modal copy.",
    params: [],
  },
  "explain.sourceOccurrences": {
    message: "Source occurrences",
    context: "Connection-details explanation modal copy.",
    params: [],
  },
  "explain.sourceIntro": {
    message: "These are the Markdown locations that contribute to this connection. Go to source opens the real note at the relevant location, using the Sidecar when available.",
    context: "Connection-details explanation modal copy.",
    params: [],
  },
  "explain.noEvidence": {
    message: "No stored evidence was found for this pair.",
    context: "Connection-details explanation modal copy.",
    params: [],
  },
  "explain.loadingSources": {
    message: "Loading source occurrences…",
    context: "Connection-details explanation modal copy.",
    params: [],
  },
  "explain.sourceLoadFailed": {
    message: "Source text could not be loaded. You can still navigate from the connection evidence.",
    context: "Connection-details explanation modal copy.",
    params: [],
  },

  "styles.vaultTag": {
    message: "Vault tag",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.configuredStyle": {
    message: "Configured style",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.existingPropertyValue": {
    message: "Existing style-property value",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.lucidePlaceholder": {
    message: "Search Lucide icons, e.g. book-open",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.lucideIcon": {
    message: "Lucide icon",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.background": {
    message: "Background",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.text": {
    message: "Text",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.border": {
    message: "Border",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.fontSize": {
    message: "Font size",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.linkEditorTitle": {
    message: "Link style · {field}",
    context: "Settings, style editors, and manager copy.",
    params: ["field"],
  },
  "styles.linkEditorHelp": {
    message: "Change the appearance of links created by this relationship field. Reset returns it to the default link style.",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.lineColor": {
    message: "Line color",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.lineWidth": {
    message: "Line width",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.lineStyle": {
    message: "Line style",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.startArrowhead": {
    message: "Start arrowhead",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.endArrowhead": {
    message: "End arrowhead",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.showOntologyLabel": {
    message: "Show ontology label",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.labelColor": {
    message: "Label color",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.labelSize": {
    message: "Label size",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.reset": {
    message: "Reset",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.solid": {
    message: "Solid",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.dashed": {
    message: "Dashed",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.dotted": {
    message: "Dotted",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.arrowNone": {
    message: "None",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.arrowArrow": {
    message: "Arrow",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.arrowTriangle": {
    message: "Triangle",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.arrowDot": {
    message: "Dot",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.arrowBar": {
    message: "Bar",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.relationshipTitle": {
    message: "Relationship link styles",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.relationshipHelp": {
    message: "Customize only the relationship properties that should look different from the default link style.",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.searchRelationshipPlaceholder": {
    message: "Search relationship properties…",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.searchRelationshipAria": {
    message: "Search relationship properties",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.linkStyleScope": {
    message: "Link style scope",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.customStyles": {
    message: "Custom styles",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.allRelationshipFields": {
    message: "All relationship fields",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.ontologyRole": {
    message: "Ontology role",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.allRoles": {
    message: "All roles",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.noCustomMatches": {
    message: "No customized link styles match. The remaining relationship fields use the global link style.",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.noRelationshipMatches": {
    message: "No relationship fields match this filter.",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.browseAllRelationships": {
    message: "Browse all relationship fields",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.customSummary": {
    message: "Custom · {summary}",
    context: "Settings, style editors, and manager copy.",
    params: ["summary"],
  },
  "styles.defaultSummary": {
    message: "Default · {summary}",
    context: "Settings, style editors, and manager copy.",
    params: ["summary"],
  },
  "styles.searchNodePlaceholder": {
    message: "Search node styles…",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.searchNodeAria": {
    message: "Search node styles",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.addStyle": {
    message: "Add style",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.summaryLabel": {
    message: "label",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "styles.summaryRoughness": {
    message: "roughness {value}",
    context: "Settings, style editors, and manager copy.",
    params: ["value"],
  },
  "styles.summaryFont": {
    message: "font {value}",
    context: "Settings, style editors, and manager copy.",
    params: ["value"],
  },
  "styles.summaryIcon": {
    message: "icon: {icon}",
    context: "Settings, style editors, and manager copy.",
    params: ["icon"],
  },
  "styles.inheritedNodeDefaults": {
    message: "Uses inherited node defaults",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "settings.unassignedTitle": {
    message: "Unassigned relationship fields",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "settings.unassignedHelp": {
    message: "Review properties K-Plex has discovered but does not yet use as relationship fields.",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "settings.searchDiscoveredPlaceholder": {
    message: "Search discovered fields…",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "settings.searchDiscoveredAria": {
    message: "Search discovered fields",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "settings.sortDiscovered": {
    message: "Sort discovered fields",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "settings.mostUsed": {
    message: "Most used",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "settings.az": {
    message: "A–Z",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "settings.refresh": {
    message: "Refresh",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "settings.noDiscoveredMatches": {
    message: "No discovered fields match this search.",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "settings.allDiscoveredAssigned": {
    message: "All discovered fields are assigned to an ontology role.",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "settings.importTitle": {
    message: "Import ExcaliBrain settings",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "settings.importHelp": {
    message: "Choose an ExcaliBrain data.json backup. K-Plex will migrate compatible ontology, visibility, navigation and appearance settings, then rebuild the index.",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "settings.noFileSelected": {
    message: "No file selected.",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "settings.fileReadFailed": {
    message: "Could not read file: {error}",
    context: "Settings, style editors, and manager copy.",
    params: ["error"],
  },
  "settings.importButton": {
    message: "Import",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "settings.chooseFileFirst": {
    message: "Choose an ExcaliBrain data.json file first.",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "settings.invalidJson": {
    message: "Invalid JSON: {error}",
    context: "Settings, style editors, and manager copy.",
    params: ["error"],
  },
  "settings.importedNotice": {
    message: "ExcaliBrain settings imported into K-Plex.",
    context: "Settings, style editors, and manager copy.",
    params: [],
  },
  "settings.importFailed": {
    message: "Import failed: {error}",
    context: "Settings, style editors, and manager copy.",
    params: ["error"],
  },
  "styles.statusCustom11": {
    message: "{scopeCount} custom style · {matches} result",
    context: "Settings, style editors, and manager copy.",
    params: ["scopeCount", "matches"],
  },
  "styles.statusCustom1n": {
    message: "{scopeCount} custom style · {matches} results",
    context: "Settings, style editors, and manager copy.",
    params: ["scopeCount", "matches"],
  },
  "styles.statusCustomn1": {
    message: "{scopeCount} custom styles · {matches} result",
    context: "Settings, style editors, and manager copy.",
    params: ["scopeCount", "matches"],
  },
  "styles.statusCustomnn": {
    message: "{scopeCount} custom styles · {matches} results",
    context: "Settings, style editors, and manager copy.",
    params: ["scopeCount", "matches"],
  },
  "styles.statusFields11": {
    message: "{scopeCount} relationship field · {matches} result",
    context: "Settings, style editors, and manager copy.",
    params: ["scopeCount", "matches"],
  },
  "styles.statusFields1n": {
    message: "{scopeCount} relationship field · {matches} results",
    context: "Settings, style editors, and manager copy.",
    params: ["scopeCount", "matches"],
  },
  "styles.statusFieldsn1": {
    message: "{scopeCount} relationship fields · {matches} result",
    context: "Settings, style editors, and manager copy.",
    params: ["scopeCount", "matches"],
  },
  "styles.statusFieldsnn": {
    message: "{scopeCount} relationship fields · {matches} results",
    context: "Settings, style editors, and manager copy.",
    params: ["scopeCount", "matches"],
  },
  "settings.unassignedStatus11": {
    message: "{count} unassigned field · {results} result",
    context: "Settings, style editors, and manager copy.",
    params: ["count", "results"],
  },
  "settings.unassignedStatus1n": {
    message: "{count} unassigned field · {results} results",
    context: "Settings, style editors, and manager copy.",
    params: ["count", "results"],
  },
  "settings.unassignedStatusn1": {
    message: "{count} unassigned fields · {results} result",
    context: "Settings, style editors, and manager copy.",
    params: ["count", "results"],
  },
  "settings.unassignedStatusnn": {
    message: "{count} unassigned fields · {results} results",
    context: "Settings, style editors, and manager copy.",
    params: ["count", "results"],
  },
  "settings.occurrenceOne": {
    message: "{count} occurrence",
    context: "Settings, style editors, and manager copy.",
    params: ["count"],
  },
  "settings.occurrenceMany": {
    message: "{count} occurrences",
    context: "Settings, style editors, and manager copy.",
    params: ["count"],
  },

  "settings.ui.buy.me.a.coffee": {
    message: "Buy me a coffee",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.read.sketch.your.mind": {
    message: "Read Sketch Your Mind",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.join.sym.community": {
    message: "Join SYM Community",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.plex.behavior": {
    message: "Plex behavior",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.navigation.layout.visibility.and.relationship.behavior.i": {
    message: "Navigation, layout, visibility and relationship behavior inside the Plex.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.navigation.interaction": {
    message: "Navigation & interaction",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.animation.speed": {
    message: "Animation speed",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.speed.multiplier.0.off.0.5.slow.1.normal.1.5.fast.2.very": {
    message: "Speed multiplier: 0 = off, 0.5 = slow, 1 = normal, 1.5 = fast, 2 = very fast. Shared nodes visibly migrate to their new position while the newly selected center arrives a little sooner.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.auto.fit.on.navigation": {
    message: "Auto fit on navigation",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.open.k.plex.in.a.pop.out.window": {
    message: "Open K-Plex in a pop-out window",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.when.k.plex.is.opened.and.no.k.plex.view.already.exists": {
    message: "When K-Plex is opened and no K-Plex view already exists, create it in a pop-out window. Desktop only.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.confirm.before.deleting.files": {
    message: "Confirm before deleting files",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.ask.before.a.node.context.menu.action.deletes.a.note.usi": {
    message: "Ask before a node context-menu action deletes a note using Obsidian's configured trash behavior. Placeholder cleanup is still explained the first time you use Delete node.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.mouse.navigation": {
    message: "Mouse navigation",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.smart.reserves.right.click.for.context.menus.left.drag.e": {
    message: "Smart reserves right-click for context menus: left-drag empty canvas or middle-drag anywhere to pan. Legacy allows any mouse button to pan. Wheel zoom never requires a modifier.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.layout.sizing": {
    message: "Layout & sizing",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.parent.maximum.height": {
    message: "Parent maximum height",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.parent.rows.become.vertically.scrollable.above.this.heig": {
    message: "Parent rows become vertically scrollable above this height.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.friend.challenger.maximum.height": {
    message: "Friend / challenger maximum height",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.friend.and.challenger.lists.become.vertically.scrollable": {
    message: "Friend and challenger lists become vertically scrollable above this height.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.sibling.maximum.height": {
    message: "Sibling maximum height",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.sibling.lists.become.vertically.scrollable.above.this.he": {
    message: "Sibling lists become vertically scrollable above this height.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.sibling.relative.size": {
    message: "Sibling relative size (%)",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.scale.sibling.nodes.and.their.expanded.descendants.relat": {
    message: "Scale sibling nodes and their expanded descendants relative to other nodes. 30% is smallest; 85% is largest.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.child.maximum.height": {
    message: "Child maximum height",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.child.rows.become.vertically.scrollable.above.this.heigh": {
    message: "Child rows become vertically scrollable above this height.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.maximum.nodes.per.zone": {
    message: "Maximum nodes per zone",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.compact.view": {
    message: "Compact view",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.minimum.link.length": {
    message: "Minimum link length",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.minimum.spacing.target.for.connected.nodes": {
    message: "Minimum spacing target for connected nodes.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.content.visibility": {
    message: "Content visibility",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.show.siblings": {
    message: "Show siblings",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.show.inferred.relationships": {
    message: "Show inferred relationships",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.ghost.unresolved.nodes": {
    message: "Ghost / unresolved nodes",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.web.links": {
    message: "Web links",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.attachments": {
    message: "Attachments",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.folders": {
    message: "Folders",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.tags": {
    message: "Tags",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.markdown.pages": {
    message: "Markdown pages",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.excluded.path.prefixes": {
    message: "Excluded path prefixes",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.comma.separated.path.prefixes.that.stay.hidden.from.the": {
    message: "Comma-separated path prefixes that stay hidden from the Plex.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.gate.counts": {
    message: "Gate counts",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.show.the.number.of.currently.visible.relationships.besid": {
    message: "Show the number of currently visible relationships beside each gate.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.relationship.behavior": {
    message: "Relationship behavior",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.infer.normal.links.as.friends": {
    message: "Infer normal links as friends",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.inverse.inferred.parent.child.direction": {
    message: "Inverse inferred parent/child direction",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.reverse.displayed.arrow.direction": {
    message: "Reverse displayed arrow direction",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.reverse.the.displayed.link.arrow.direction.without.chang": {
    message: "Reverse the displayed link arrow direction without changing relationship semantics.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.ontology": {
    message: "Ontology",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.define.which.note.properties.create.relationships.and.ho": {
    message: "Define which note properties create relationships and how quickly you can enter them while editing.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.relationship.fields": {
    message: "Relationship fields",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.choose.which.properties.appear.as.parents.children.frien": {
    message: "Choose which properties appear as parents, children, friends, challengers and sequence links.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.parent.fields": {
    message: "Parent fields",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.child.fields": {
    message: "Child fields",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.left.friend.jump.fields": {
    message: "Left friend / jump fields",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.right.friend.challenger.fields": {
    message: "Right friend / challenger fields",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.previous.fields": {
    message: "Previous fields",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.next.fields": {
    message: "Next fields",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.hidden.fields": {
    message: "Hidden fields",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.relationships.stored.in.these.properties.stay.out.of.the": {
    message: "Relationships stored in these properties stay out of the Plex.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.editor.suggester": {
    message: "Editor suggester",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.configure.shortcuts.for.inserting.ontology.fields.while": {
    message: "Configure shortcuts for inserting ontology fields while writing notes.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.ontology.suggester": {
    message: "Ontology suggester",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.enable.ontology.suggester": {
    message: "Enable ontology suggester",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.parent.trigger": {
    message: "Parent trigger",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.child.trigger": {
    message: "Child trigger",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.left.friend.trigger": {
    message: "Left friend trigger",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.right.friend.trigger": {
    message: "Right friend trigger",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.previous.trigger": {
    message: "Previous trigger",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.next.trigger": {
    message: "Next trigger",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.all.ontology.trigger": {
    message: "All ontology trigger",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.suggest.fields.from.every.ontology.role": {
    message: "Suggest fields from every ontology role.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.mid.sentence.prefix": {
    message: "Mid-sentence prefix",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.prefix.used.before.a.trigger.for.dataview.style.inline.f": {
    message: "Prefix used before a trigger for Dataview-style inline fields, for example (::p → (Parent:: …).",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.bold.inserted.field.names": {
    message: "Bold inserted field names",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.discovered.fields": {
    message: "Discovered fields",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.review.note.properties.that.are.not.currently.assigned.t": {
    message: "Review note properties that are not currently assigned to an ontology role.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.unassigned.relationship.fields": {
    message: "Unassigned relationship fields",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.review.unassigned.fields": {
    message: "Review unassigned fields",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.refresh.discovered.fields": {
    message: "Refresh discovered fields",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.rescan.note.properties.now.this.can.take.longer.in.a.lar": {
    message: "Rescan note properties now. This can take longer in a large vault.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.visual.styling": {
    message: "Visual styling",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.canvas.node.and.link.appearance": {
    message: "Canvas, node and link appearance.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.canvas.labels": {
    message: "Canvas & labels",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.plex.background": {
    message: "Plex background",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.use.frontmatter.display.names": {
    message: "Use frontmatter display names",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.use.the.first.non.empty.value.from.the.configured.name.f": {
    message: "Use the first non-empty value from the configured name fields. Turn this off to always show the file name.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.name.fields": {
    message: "Name fields",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.comma.separated.frontmatter.fields.checked.in.order.text": {
    message: "Comma-separated frontmatter fields checked in order. Text and list values are supported; the first non-empty value is used, then K-Plex falls back to the file name. Example: title, aliases, backup_names.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.show.full.tag.names": {
    message: "Show full tag names",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.node.styling": {
    message: "Node styling",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.node.shape.details.property.based.colors.and.node.images": {
    message: "Node shape details, property-based colors and node images.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.node.appearance": {
    message: "Node appearance",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.gate.radius": {
    message: "Gate radius",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.radius.of.the.relationship.gates.around.nodes.in.pixels": {
    message: "Radius of the relationship gates around nodes, in pixels.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.style.property": {
    message: "Style property",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.a.yaml.or.dataview.style.property.whose.value.can.select": {
    message: "A YAML or Dataview-style property whose value can select a custom node style. Default: Note type.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.node.images": {
    message: "Node images",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.thumbnail.property": {
    message: "Thumbnail property",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.image.link.shown.as.a.small.preview.before.the.node.labe": {
    message: "Image link shown as a small preview before the node label. Works with YAML or Dataview-style inline fields.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.node.image.property": {
    message: "Node image property",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.image.link.that.replaces.the.node.label.with.a.compact.v": {
    message: "Image link that replaces the node label with a compact visual node. Works with YAML or Dataview-style inline fields.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.image.attachment.nodes": {
    message: "Image attachment nodes",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.how.jpg.png.gif.svg.webp.and.similar.image.attachments.a": {
    message: "How JPG, PNG, GIF, SVG, WebP and similar image attachments appear in the Plex.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.link.styling": {
    message: "Link styling",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.connector.shape.default.appearance.cross.link.opacity.an": {
    message: "Connector shape, default appearance, cross-link opacity and relationship-specific overrides.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.link.appearance": {
    message: "Link appearance",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.link.shape": {
    message: "Link shape",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.default.line.color": {
    message: "Default line color",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.default.line.width": {
    message: "Default line width",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.default.line.style": {
    message: "Default line style",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.start.arrowhead": {
    message: "Start arrowhead",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.end.arrowhead": {
    message: "End arrowhead",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.show.relationship.labels": {
    message: "Show relationship labels",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.relationship.label.color": {
    message: "Relationship label color",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.relationship.label.size": {
    message: "Relationship label size",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.cross.link.opacity": {
    message: "Cross-link opacity (%)",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.opacity.of.extra.links.between.visible.non.central.nodes": {
    message: "Opacity of extra links between visible non-central nodes. Hovered or highlighted links are shown at full opacity.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.relationship.specific.styles": {
    message: "Relationship-specific styles",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.sidecar": {
    message: "Sidecar",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.dedicated.companion.document.pane.placement.and.behavior": {
    message: "Dedicated companion document pane placement and behavior.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.companion.document": {
    message: "Companion document",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.default.position": {
    message: "Default position",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.where.k.plex.creates.its.dedicated.companion.document.pa": {
    message: "Where K-Plex creates its dedicated companion document pane. Existing neighboring tabs are never reused as the sidecar.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.default.markdown.mode": {
    message: "Default Markdown mode",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.open.markdown.notes.in.the.sidecar.in.reading.view.or.so": {
    message: "Open Markdown notes in the sidecar in reading view or source/edit mode.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.condensed.plex.breakpoint": {
    message: "Condensed Plex breakpoint",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.when.the.remaining.k.plex.width.is.at.or.below.this.valu": {
    message: "When the remaining K-Plex width is at or below this value, use the compact sidecar toolbar layout.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.compatibility": {
    message: "Compatibility",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.migration.and.legacy.excalibrain.interoperability": {
    message: "Migration and legacy ExcaliBrain interoperability.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.excalibrain": {
    message: "ExcaliBrain",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.import.excalibrain.settings": {
    message: "Import ExcaliBrain settings",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.import.a.backed.up.excalibrain.data.json.file.and.migrat": {
    message: "Import a backed-up ExcaliBrain data.json file and migrate compatible settings into K-Plex.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.smart.recommended": {
    message: "Smart (recommended)",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.legacy.any.button.pans": {
    message: "Legacy: any button pans",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.middle.button.pans": {
    message: "Middle button pans",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.file.name": {
    message: "File name",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.thumbnail.file.name": {
    message: "Thumbnail + file name",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.image.only": {
    message: "Image only",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.curved": {
    message: "Curved",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.straight": {
    message: "Straight",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.solid": {
    message: "Solid",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.dashed": {
    message: "Dashed",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.dotted": {
    message: "Dotted",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.right": {
    message: "Right",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.left": {
    message: "Left",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.above": {
    message: "Above",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.below": {
    message: "Below",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.edit.mode": {
    message: "Edit mode",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.reading.view": {
    message: "Reading view",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.all.currently.discovered.fields.are.assigned.you.can.ref": {
    message: "All currently discovered fields are assigned. You can refresh after adding new properties to your vault.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.ui.all.relationship.properties.currently.use.the.default.li": {
    message: "All relationship properties currently use the default link style.",
    context: "Declarative K-Plex settings page copy.",
    params: [],
  },
  "settings.unassignedSummary": {
    plural: { one: "{count} discovered field is not assigned to an ontology role. Search, sort and assign them from one compact list.", other: "{count} discovered fields are not assigned to an ontology role. Search, sort and assign them from one compact list." },
    countParam: "count",
    context: "Summary of discovered ontology fields that are not assigned.",
    params: ["count"],
  },
  "styles.relationshipSettingsSummary": {
    plural: { one: "{count} custom relationship style. Search by property or filter by role.", other: "{count} custom relationship styles. Search by property or filter by role." },
    countParam: "count",
    context: "Settings summary for customized relationship-specific link styles.",
    params: ["count"],
  },

  "styles.propertyValuePlaceholder": {
    message: "project",
    context: "Example placeholder for a note type or imported tag style value.",
    params: [],
  },
  "graph.foldNoteSections": {
    message: "Fold note sections",
    context: "Tooltip for the central note section-fold control while sections are expanded.",
    params: [],
  },
  "graph.unfoldNoteSections": {
    message: "Unfold note sections",
    context: "Tooltip for the central note section-fold control while sections are folded.",
    params: [],
  },
  "graph.relatedNotePath": {
    message: "{label} — {path}",
    context: "Tooltip for a compact related-note item; label and path are vault content.",
    params: ["label", "path"],
  },
  "graph.compactnessValue": {
    message: "Compactness {value}",
    context: "Tooltip for the graph compactness control with its current numeric value.",
    params: ["value"],
  },
  "graph.columnCounts": {
    message: "{parent} parent / {child} child columns",
    context: "Tooltip for the graph parent/child column layout control.",
    params: ["parent", "child"],
  },

  "explain.summaryHidden": {
    message: "The relationship is indexed but hidden from this source note's visible neighbourhood.",
    context: "Explanation of why an indexed relationship is not visible from the current source note.",
    params: [],
  },
  "explain.summaryOntologyPrecedence": {
    message: "Frontmatter ontology takes precedence over conflicting body ontology; the overridden body evidence is retained for explanation.",
    context: "Relationship explanation when frontmatter ontology overrides conflicting body ontology.",
    params: [],
  },
  "explain.summaryConflictingDefinedRoles": {
    message: "Multiple active defined ontology roles conflict, so the pair is presented laterally as a friend relationship.",
    context: "Relationship explanation for conflicting explicit ontology roles.",
    params: [],
  },
  "explain.summaryBidirectionalInferred": {
    message: "Ordinary links provide evidence in both directions, so the pair resolves to an inferred friend relationship.",
    context: "Relationship explanation for reciprocal ordinary links.",
    params: [],
  },
  "explain.summaryDefinedOntology": {
    message: "Defined ontology determines the visible relationship; inferred link evidence remains recorded but does not override it.",
    context: "Relationship explanation when defined ontology wins over inferred link evidence.",
    params: [],
  },
  "explain.summaryDateProperty": {
    message: "An Obsidian Date property maps to a Daily Notes target and is treated as an inferred outgoing relationship.",
    context: "Relationship explanation for an Obsidian Date property relation.",
    params: [],
  },
  "explain.summaryNoActiveEvidence": {
    message: "No active evidence currently resolves to a visible relationship.",
    context: "Relationship explanation when no evidence resolves visibly.",
    params: [],
  },
  "explain.summaryTransientSection": {
    message: "This is a transient heading section of the expanded central Markdown note. It is parsed on demand and is not stored in the persistent K-Plex index.",
    context: "Relationship explanation for an on-demand transient Markdown heading section.",
    params: [],
  },
  "explain.summarySourceFrontmatterOntology": {
    message: "The visible relationship is derived from frontmatter ontology evidence.",
    context: "Relationship explanation when frontmatter ontology is the active evidence source.",
    params: [],
  },
  "explain.summarySourceInlineOntology": {
    message: "The visible relationship is derived from body ontology evidence.",
    context: "Relationship explanation when Markdown body ontology is the active evidence source.",
    params: [],
  },
  "explain.summarySourceResolvedNoteLink": {
    message: "The visible relationship is derived from resolved note link evidence.",
    context: "Relationship explanation when a resolved note link is the active evidence source.",
    params: [],
  },
  "explain.summarySourceUnresolvedNoteLink": {
    message: "The visible relationship is derived from unresolved note link evidence.",
    context: "Relationship explanation when an unresolved note link is the active evidence source.",
    params: [],
  },
  "explain.summarySourceBodyUrl": {
    message: "The visible relationship is derived from body URL evidence.",
    context: "Relationship explanation when a body URL is the active evidence source.",
    params: [],
  },
  "explain.summarySourceDateProperty": {
    message: "The visible relationship is derived from Date property evidence.",
    context: "Relationship explanation when a Date property is the active evidence source.",
    params: [],
  },
  "explain.summarySourceFolderTree": {
    message: "The visible relationship is derived from physical folder tree evidence.",
    context: "Relationship explanation when the physical folder tree is the active evidence source.",
    params: [],
  },
  "explain.summarySourceTagTree": {
    message: "The visible relationship is derived from tag tree evidence.",
    context: "Relationship explanation when the tag tree is the active evidence source.",
    params: [],
  },
  "explain.summarySourceUrlOrigin": {
    message: "The visible relationship is derived from URL origin hierarchy evidence.",
    context: "Relationship explanation when URL origin hierarchy is the active evidence source.",
    params: [],
  },
  "explain.suppressionOntologyPrecedence": {
    message: "Conflicting body ontology is overridden by frontmatter ontology for this note pair.",
    context: "Reason shown on relationship evidence suppressed by frontmatter ontology precedence.",
    params: [],
  },

  "filter.validationSelectorReferenceRequired": {
    message: "The selector must reference a note, relationship, evidence, file, or this.",
    context: "Graph Lens validation error when an expression has no graph or property dependency.",
    params: [],
  },
  "filter.validationUnknownPlexPosition": {
    message: "Unknown Plex position “{value}”. To match a relationship property such as working-on, use Relationship property in Simple view (edge.definition in Code view).",
    context: "Graph Lens validation error for an invalid edge.role value.",
    params: ["value"],
  },
  "filter.validationUnknownRelationshipKind": {
    message: "Unknown relationship kind “{value}”. Use defined or inferred.",
    context: "Graph Lens validation error for an invalid edge.kind value.",
    params: ["value"],
  },
  "filter.validationUnknownRelationshipDirection": {
    message: "Unknown relationship direction “{value}”. Use from, to, or both.",
    context: "Graph Lens validation error for an invalid edge.direction value.",
    params: ["value"],
  },
  "filter.validationUnterminatedString": {
    message: "Unterminated string at character {position}",
    context: "Graph Lens Code-view parser error.",
    params: ["position"],
  },
  "filter.validationInvalidNumber": {
    message: "Invalid number '{value}' at character {position}",
    context: "Graph Lens Code-view parser error.",
    params: ["value", "position"],
  },
  "filter.validationUnexpectedToken": {
    message: "Unexpected '{value}' at character {position}",
    context: "Graph Lens Code-view parser error.",
    params: ["value", "position"],
  },
  "filter.validationEmptyExpression": {
    message: "Expression is empty at character {position}",
    context: "Graph Lens Code-view parser error.",
    params: ["position"],
  },
  "filter.validationExpectedToken": {
    message: "Expected {expected}, found '{found}' at character {position}",
    context: "Graph Lens Code-view parser error.",
    params: ["expected", "found", "position"],
  },
  "filter.validationExpectedTokenAtEnd": {
    message: "Expected {expected}, found 'end of expression' at character {position}",
    context: "Graph Lens Code-view parser error when input ends before the expected token.",
    params: ["expected", "position"],
  },
  "filter.validationTokenIdentifier": {
    message: "identifier",
    context: "Graph Lens parser token name embedded in validation feedback.",
    params: [],
  },
  "filter.validationTokenString": {
    message: "string",
    context: "Graph Lens parser token name embedded in validation feedback.",
    params: [],
  },
  "filter.validationTokenNumber": {
    message: "number",
    context: "Graph Lens parser token name embedded in validation feedback.",
    params: [],
  },
  "filter.validationTokenOperator": {
    message: "operator",
    context: "Graph Lens parser token name embedded in validation feedback.",
    params: [],
  },
  "filter.validationTokenPunctuation": {
    message: "punct",
    context: "Graph Lens parser token kind embedded in validation feedback; preserves the existing English parser wording.",
    params: [],
  },
  "filter.validationTokenEndOfExpression": {
    message: "eof",
    context: "Graph Lens parser end-of-file token name embedded in validation feedback; preserves the existing English parser wording.",
    params: [],
  },
  "filter.validationComparisonRightValue": {
    message: "The right side of a comparison must be a value at character {position}",
    context: "Graph Lens Code-view parser error.",
    params: ["position"],
  },
  "filter.validationExpectedValue": {
    message: "Expected a value, found '{found}' at character {position}",
    context: "Graph Lens Code-view parser error.",
    params: ["found", "position"],
  },
  "filter.validationExpectedValueAtEnd": {
    message: "Expected a value, found 'end of expression' at character {position}",
    context: "Graph Lens Code-view parser error when input ends before a value.",
    params: ["position"],
  },
  "filter.validationUnknownNamespace": {
    message: "Unknown namespace '{value}' at character {position}",
    context: "Graph Lens Code-view parser error.",
    params: ["value", "position"],
  },
  "filter.validationExpectedProperty": {
    message: "Expected a property after '{namespace}' at character {position}",
    context: "Graph Lens Code-view parser error.",
    params: ["namespace", "position"],
  },
  "filter.validationFunctionArgumentsValues": {
    message: "Function arguments must be values at character {position}",
    context: "Graph Lens Code-view parser error.",
    params: ["position"],
  },
  "filter.validationUnknownFunction": {
    message: "Unknown function '{value}' at character {position}",
    context: "Graph Lens Code-view parser error.",
    params: ["value", "position"],
  },
  "filter.validationUnknownMethod": {
    message: "Unknown method '{value}' at character {position}",
    context: "Graph Lens Code-view parser error.",
    params: ["value", "position"],
  },
  "filter.validationInvalidExpression": {
    message: "Invalid expression",
    context: "Fallback Graph Lens Code-view parser error.",
    params: [],
  },

  "content.roleParent": {
    message: "parent",
    context: "Compact relationship-role label in the mapped-links content pane; preserves the previous lowercase wording.",
    params: [],
  },
  "content.roleChild": {
    message: "child",
    context: "Compact relationship-role label in the mapped-links content pane; preserves the previous lowercase wording.",
    params: [],
  },
  "content.roleLeft": {
    message: "left",
    context: "Compact relationship-role label in the mapped-links content pane; preserves the previous lowercase wording.",
    params: [],
  },
  "content.roleRight": {
    message: "right",
    context: "Compact relationship-role label in the mapped-links content pane; preserves the previous lowercase wording.",
    params: [],
  },
  "content.rolePrevious": {
    message: "previous",
    context: "Compact relationship-role label in the mapped-links content pane; preserves the previous lowercase wording.",
    params: [],
  },
  "content.roleNext": {
    message: "next",
    context: "Compact relationship-role label in the mapped-links content pane; preserves the previous lowercase wording.",
    params: [],
  },
  "content.roleSibling": {
    message: "sibling",
    context: "Compact relationship-role label in the mapped-links content pane; preserves the previous lowercase wording.",
    params: [],
  },

  "view.displayName": {
    message: "K-Plex",
    context: "Display name for K-Plex workspace views.",
    params: [],
  },

  "shortcut.shift": { message: "Shift", context: "Platform shortcut modifier label.", params: [] },
  "shortcut.command": { message: "Command", context: "macOS/iOS shortcut modifier label.", params: [] },
  "shortcut.control": { message: "Control", context: "Windows/Android shortcut modifier label.", params: [] },
  "shortcut.option": { message: "Option", context: "macOS/iOS shortcut modifier label.", params: [] },
  "shortcut.alt": { message: "Alt", context: "Windows/Android shortcut modifier label.", params: [] },
  "explain.fieldAtLine": {
    message: "{field} at line {line}",
    context: "Deletion/reference review label for an inline relationship field occurrence.",
    params: ["field", "line"],
  },
  "explain.inlineRelationshipAtLine": {
    message: "Inline relationship at line {line}",
    context: "Deletion/reference review label for an inline relationship occurrence with no field name.",
    params: ["line"],
  },
  "explain.linkAtLine": {
    message: "Link at line {line}",
    context: "Deletion/reference review label for a Markdown link occurrence.",
    params: ["line"],
  },

  "app.useCentralNodeEditor": { message: "Use editor as central node", context: "Toolbar action that replaces the compact center thought with an embedded native Markdown view.", params: [] },
  "app.useNormalCentralNode": { message: "Use normal central node", context: "Toolbar action that restores the compact center thought instead of the embedded Markdown view.", params: [] },
  "centralEditor.toolbar": { message: "Central note editor", context: "Accessible label for controls over the Markdown view embedded in the central Plex node.", params: [] },
  "centralEditor.showPreview": { message: "Show reading view", context: "Switch the embedded central Markdown note from source editing to reading view.", params: [] },
  "centralEditor.showEditor": { message: "Edit note", context: "Switch the embedded central Markdown note from reading view to source editing.", params: [] },
  "centralEditor.showDrawing": { message: "Show Excalidraw drawing", context: "Switch an Excalidraw-backed central note from its Markdown representation to the drawing canvas.", params: [] },
  "centralEditor.showMarkdown": { message: "Show Markdown", context: "Switch an Excalidraw-backed central note from the drawing canvas to its Markdown representation.", params: [] },
  "centralEditor.maximize": { message: "Expand editor", context: "Grow the embedded central note to nearly fill the Plex canvas while retaining a small graph margin.", params: [] },
  "centralEditor.restore": { message: "Restore editor", context: "Restore the embedded central note from its expanded size to the normal Plex layout.", params: [] },
  "centralEditor.loading": { message: "Loading note…", context: "Short transient status while the native central Markdown leaf opens its note.", params: [] },
  "centralEditor.unavailable": { message: "Embedded editor unavailable", context: "Status shown if Obsidian cannot create or open the native central Markdown leaf.", params: [] },
  "settings.centralNodeEditor.heading": { message: "Central node editor", context: "Settings group for the Markdown editor that can replace the central Plex node.", params: [] },
  "settings.centralNodeEditor.defaultMode": { message: "Default Markdown mode", context: "Setting for whether the embedded central Markdown note starts in edit or reading view.", params: [] },
  "settings.centralNodeEditor.defaultModeDesc": { message: "Choose whether the central node editor opens Markdown notes in reading view or edit mode.", context: "Description of the default mode setting for the embedded central Markdown editor.", params: [] },

  "filter.untitledLens": {
    message: "Untitled lens",
    context: "Fallback display name for a legacy or malformed Graph Lens whose persisted name is blank.",
    params: [],
  },

} as const;

export type EnglishCatalog = typeof englishCatalog;
