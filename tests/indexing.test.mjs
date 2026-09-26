import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalGraph, canonicalNeighborhood, canonicalPair, canonicalScene } from "./support/canonicalGraph.mjs";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = join(root, "tests/fixtures/excalibrain-indexing/Vault");
const temp = mkdtempSync(join(tmpdir(), "kplex-index-test-"));

// Workspace ownership regression for issue #17. Sidecar actions are allowed to detach their own
// managed leaf, so the implementation must never adopt an arbitrary adjacent/pinned user tab.
const mainSource = readFileSync(join(root, "src/main.ts"), "utf8");

const appSource = readFileSync(join(root, "src/ui/App.tsx"), "utf8");
const newRelatedSource = readFileSync(join(root, "src/ui/NewRelatedNoteModal.ts"), "utf8");
const ghostModalSource = readFileSync(join(root, "src/ui/MaterializeGhostModal.ts"), "utf8");
const plexGraphSource = readFileSync(join(root, "src/ui/PlexGraph.tsx"), "utf8");
const deleteNodeModalSource = readFileSync(join(root, "src/ui/DeleteNodeModal.ts"), "utf8");
const createFolderNoteModalSource = readFileSync(join(root, "src/ui/CreateFolderNoteModal.ts"), "utf8");
const thoughtNodeSource = readFileSync(join(root, "src/ui/ThoughtNode.tsx"), "utf8");
const plexFilterSource = readFileSync(join(root, "src/ui/PlexFilter.tsx"), "utf8");
const simpleFilterSource = readFileSync(join(root, "src/lens/SimplePlexFilter.ts"), "utf8");
const longPressTooltipSource = readFileSync(join(root, "src/ui/LongPressTooltip.ts"), "utf8");
assert(newRelatedSource.includes('"aria-label": "Create placeholder node"'), "Create-related UI must offer a placeholder-only action");
assert(newRelatedSource.includes("plugin.createPlaceholderRelatedPage(origin, role"), "Placeholder action must create only a relationship-backed virtual node");
assert(newRelatedSource.includes("void createNew(defaultCreateType)"), "Ctrl/Cmd+Enter must keep using the shared Markdown/Excalidraw default rather than the placeholder action");
assert(ghostModalSource.includes('this.scope.register(["Mod"], "Enter"'), "Ghost materialization must support the same Ctrl/Cmd+Enter default action as create-related");
assert(ghostModalSource.includes('setName("Location")'), "Ambiguous ghost destinations must expose a location dropdown");
assert(ghostModalSource.includes('setButtonText("Excalidraw")'), "Ghost materialization must offer Excalidraw when the integration is available");
assert(!appSource.includes('void plugin.openSidecar(hostLeaf, page);'), "React mount must not create a sidecar during startup restore; plugin-level restore owns re-association");
assert(appSource.includes("plugin.isStartupInitializing() && plugin.settings.lastActivePath"), "A restored K-Plex view must keep its persisted center while Obsidian startup tab ordering is unstable");
assert(appSource.includes('setTitle("Show linked/pinned tab")'), "The pin/link menu must provide an explicit way to reveal the linked document tab");
assert(appSource.includes("plugin.showLinkedDocumentLeaf()"), "Show linked/pinned tab must reveal the actual resolved sync target");
const ensureSidecarStart = mainSource.indexOf("  private ensureSidecarLeaf(");
const ensureSidecarEnd = mainSource.indexOf("  async openMarkdownInSidecar(", ensureSidecarStart);
const ensureSidecarSource = mainSource.slice(ensureSidecarStart, ensureSidecarEnd);
assert(ensureSidecarStart >= 0 && ensureSidecarEnd > ensureSidecarStart);
assert(ensureSidecarSource.includes("createSidecarLeaf(hostLeaf, this.settings.sidecarPosition)"), "Sidecar must create a dedicated companion leaf");
assert(!ensureSidecarSource.includes("findVisibleAdjacentDocumentLeaf"), "Sidecar must not adopt an arbitrary adjacent document leaf");
assert(!ensureSidecarSource.includes("leaf = this.linkedDocumentLeaf"), "Sidecar must not adopt a separately pinned document leaf");
const sidecarPositionStart = mainSource.indexOf("  getSidecarPosition(");
const sidecarPositionEnd = mainSource.indexOf("  isSidecarOpen(", sidecarPositionStart);
const sidecarPositionSource = mainSource.slice(sidecarPositionStart, sidecarPositionEnd);
assert(sidecarPositionSource.includes("validateSidecarLeaf(hostLeaf)"));
assert(!sidecarPositionSource.includes("linkedDocumentLeaf"), "An adjacent pinned tab must not become sidecar-managed by geometry alone");
const closeSidecarStart = mainSource.indexOf("  async closeSidecar(");
const closeSidecarEnd = mainSource.indexOf("  /**", closeSidecarStart);
assert(!mainSource.slice(closeSidecarStart, closeSidecarEnd).includes("adjacentPinned"), "Closing a sidecar must never detach an ordinary adjacent pinned tab");
const releaseSidecarStart = mainSource.indexOf("  private async releaseSidecar(");
const releaseSidecarEnd = mainSource.indexOf("  async detachSidecar(", releaseSidecarStart);
const releaseSidecarSource = mainSource.slice(releaseSidecarStart, releaseSidecarEnd);
assert(releaseSidecarSource.includes("if (!leaf) return;"), "Closing K-Plex without a managed sidecar must preserve independent note-tab synchronization");

const settingsSource = readFileSync(join(root, "src/settings.ts"), "utf8");
assert(settingsSource.includes("sidecarLastFilePath: string"), "Persisted sidecar identity must remember its last document path");
assert(settingsSource.includes("sidecarLastUrl: string"), "Persisted sidecar identity must also support web sidecars");
const settingDefinitionsStart = settingsSource.indexOf("  getSettingDefinitions()");
const settingDefinitionsEnd = settingsSource.indexOf("  getControlValue(", settingDefinitionsStart);
const settingDefinitionsSource = settingsSource.slice(settingDefinitionsStart, settingDefinitionsEnd);
assert(!settingDefinitionsSource.includes('name: "Note tab link"'), "Live note-tab synchronization state must not be duplicated in Settings");
assert(settingDefinitionsSource.includes('name: "Sibling relative size (%)"'));
assert(settingDefinitionsSource.includes('name: "Cross-link opacity (%)"'));
assert(settingDefinitionsSource.includes('name: "Node styling"'), "Node styling must be a Visual styling subpage");
assert(settingDefinitionsSource.includes('name: "Link styling"'), "Link styling must be a Visual styling subpage");
assert(settingDefinitionsSource.includes('name: "Style property"'), "K-Plex must expose one clear property-value style selector");
assert(settingDefinitionsSource.includes('name: "Name fields"'), "Display-name field precedence must be configurable");
assert(settingsSource.includes('nameFields: "aliases"'), "Aliases must remain the default display-name field for backward compatibility");
assert(!settingDefinitionsSource.includes('name: "Primary tag field"'), "Legacy primaryTagField must remain migration-only instead of appearing as a second style selector");
assert(settingDefinitionsSource.includes('name: "Property-value styles"'), "Large node-style collections must open through the searchable manager");
assert(settingDefinitionsSource.includes('name: "Relationship-specific styles"'), "Relationship-specific link appearance must open through the searchable manager");
assert(!settingDefinitionsSource.includes('heading: "Connector styles by ontology"'), "Ontology must not expand one connector-style row per relationship field");
const ontologyPageStart = settingDefinitionsSource.indexOf('name: "Ontology"');
const visualStylingPageStart = settingDefinitionsSource.indexOf('name: "Visual styling"');
assert(ontologyPageStart >= 0 && visualStylingPageStart > ontologyPageStart);
const ontologyPageSource = settingDefinitionsSource.slice(ontologyPageStart, visualStylingPageStart);
assert(!ontologyPageSource.includes('Relationship-specific styles'), "Ontology semantics and visual link styling must stay separate");
assert(settingsSource.includes('text: "Custom styles"'), "Relationship link styles must default to a compact custom-only view");
assert(settingsSource.includes('placeholder: "Search relationship properties…"'), "Ontology link styles must be searchable");
assert(settingsSource.includes('placeholder: "Search node styles…"'), "Property-value node styles must be searchable");
assert(settingsSource.includes("class NodeStyleValueSuggest extends AbstractInputSuggest"), "Node style values must use an Obsidian input suggester");
assert(settingsSource.includes("getIconIds()"), "Lucide icon names must come from Obsidian's live icon registry");
assert(settingsSource.includes('private displayScope: "custom" | "all"'), "Ontology style filtering must not shadow Modal.scope");
assert(settingDefinitionsSource.includes('name: "Discovered fields"'), "Ontology discovery must live on a compact subpage");
assert(settingDefinitionsSource.includes('name: "Review unassigned fields"'), "Unassigned ontology fields must open in a searchable manager");
assert(!settingDefinitionsSource.includes('occurrence · assign this discovered property'), "Settings must not dump every unassigned field into the page");
assert(settingsSource.includes('class UnassignedOntologyManagerModal'), "Unassigned ontology fields need a dedicated manager");
assert(!settingsSource.includes('instead of expanding the entire collection'), "Settings UI must not contain implementation-facing copy");
assert(settingsSource.includes('kplex-style-manager-modal'), "Style managers need bounded responsive modal styling");

const moveSidecarStart = mainSource.indexOf("  async moveSidecar(");
const moveSidecarEnd = mainSource.indexOf("  async syncSidecarToPage(", moveSidecarStart);
const moveSidecarSource = mainSource.slice(moveSidecarStart, moveSidecarEnd);
assert(moveSidecarSource.includes("const replacement = this.createSidecarLeaf(hostLeaf, position)"), "Moving a sidecar must create the replacement before removing the old companion");
assert(moveSidecarSource.indexOf("this.sidecarLeaves.set(hostLeaf, replacement)") < moveSidecarSource.indexOf("previousSidecar.detach()"), "Replacement ownership must be established before the old sidecar is detached");
assert(!moveSidecarSource.includes("closeSidecar(hostLeaf, false)"), "Moving a sidecar must not collapse the old split before the replacement exists");
assert(mainSource.includes("private sidecarFootprint("), "Sidecar moves must measure the combined K-Plex + sidecar workspace footprint");
assert(mainSource.includes("getBoundingClientRect()"), "Sidecar footprint preservation must use settled workspace geometry");
assert(moveSidecarSource.includes("const preservedFootprint = this.sidecarFootprint(hostLeaf, previousSidecar)"));
assert(moveSidecarSource.indexOf("previousSidecar.detach()") < moveSidecarSource.indexOf("restoreSidecarFootprint(hostLeaf, replacement, preservedFootprint)"), "The saved bounding rectangle must be restored after the old pane collapses");
assert(mainSource.includes("Array.from(parent.children)"), "Workspace child enumeration must compile without relying on HTMLCollection iteration support");
assert(mainSource.includes("this.sidecarMovingHosts.has(host) || this.startupInitializing"), "Transient zero-width move/startup layout events must not orphan the managed sidecar leaf");
assert(mainSource.includes("restorePersistedSidecar"), "Persisted sidecar intent must be restored after workspace startup");
assert(mainSource.includes("restoredSidecarCandidate"), "Startup restore should re-associate a plausible native companion instead of duplicating it");
assert(mainSource.includes("leaf.getViewState()"), "Startup sidecar matching must work with Obsidian DeferredView state");
assert(mainSource.includes("private startupInitializing = true"), "Startup needs a short session-only guard against transient most-recent-tab state");
assert(mainSource.includes("if (this.startupInitializing) return false;"), "Normal note-tab following must be suppressed until startup re-association finishes");
assert(mainSource.includes("this.sidecarMovingHosts.has(host) || this.startupInitializing"), "Transient startup geometry must not release a just-restored sidecar before its split settles");
assert(mainSource.includes("sidecarLastFilePath"), "Sidecar content identity must be persisted independently of the graph center");
assert(mainSource.includes("leafMatchesPersistedSidecarTarget"), "Startup re-association must prefer the sidecar's actual persisted document/URL");
assert(mainSource.includes("leafTabIsActive"), "Startup re-association should inspect Obsidian's selected tab in the remembered group");
assert(mainSource.includes("navigationHistoryScoreForLeaf"), "Navigation history should provide a legacy fallback when older settings have no sidecar target identity");
const restoreSidecarStart = mainSource.indexOf("  private async restorePersistedSidecar(");
const restoreSidecarEnd = mainSource.indexOf("  private ensureSidecarLeaf(", restoreSidecarStart);
const restoreSidecarSource = mainSource.slice(restoreSidecarStart, restoreSidecarEnd);
assert(!restoreSidecarSource.includes("openSidecar(hostLeaf, page)"), "Startup restore must never create an extra workspace pane when native restoration cannot be identified safely");
assert(restoreSidecarSource.includes("waitForWorkspaceLayout(hostLeaf, 3)"), "Startup restore should wait for native split geometry before matching the companion");
assert(mainSource.includes("rememberedGroups.size === 1"), "Startup sidecar recovery must bind only to one unambiguous tab-group on the remembered side");
assert(mainSource.includes("this.adjacentPosition(hostLeaf, leaf) !== this.settings.sidecarPosition"), "Startup sidecar recovery must reject adjacent panes on the wrong side");
assert(mainSource.includes("const visible = candidates.filter((leaf) => this.leafIsVisible(leaf))"), "When the restored sidecar group has several tabs, K-Plex should adopt the tab Obsidian restored as visible");
assert(mainSource.includes("waitForRestoredSidecarCandidate"), "Startup sidecar recovery should briefly wait for DeferredView/tab-group geometry instead of creating a split");
assert(mainSource.includes("releaseSidecar(hostLeaf, true, true)"), "Closing a K-Plex host must preserve sidecar restore intent");

const stylesSource = readFileSync(join(root, "styles.css"), "utf8");
assert(stylesSource.includes(".kplex-linked-leaf-alert"), "Linked/pinned-tab feedback must highlight the entire target leaf");
assert(stylesSource.includes("var(--text-warning, var(--interactive-accent))"), "Linked-leaf feedback must use Obsidian theme variables rather than a hard-coded alert color");
assert(!stylesSource.includes("kplex-linked-tab-alert"), "The obsolete tab-header-only linked highlight must not remain in the stylesheet");
assert(mainSource.includes("element.classList.add(\"kplex-linked-leaf-alert\")"), "Linked-leaf feedback must use a temporary CSS class rather than inline styling");
assert(!mainSource.includes("element.style.flexBasis"), "Sidecar footprint restoration must use Obsidian DOM style helpers rather than direct style mutation");
assert(!mainSource.includes("tabHeaderForLeaf"), "Linked-tab feedback cleanup must not retain the obsolete tab-header bridge");
assert(mainSource.includes("viewWindow.requestAnimationFrame"), "Sidecar/link UI scheduling should use the target leaf window for pop-out compatibility");
const createGhostStart = mainSource.indexOf("  async createGhostNote(page: GraphPage)");
const createGhostSource = mainSource.slice(createGhostStart);
assert(createGhostSource.includes("ghostCreationLocations(page, validation.stem)"), "Ghost creation must resolve destinations from the graph rather than defaulting to vault root");
assert(!createGhostSource.includes("rebuildIndex("), "Materializing a ghost node must not trigger a full graph rebuild");
assert(mainSource.includes("this.index.semanticParentPages(page)"), "Ghost destination resolution must consider every semantic parent");
assert(mainSource.includes("getNewFileParent(sourcePath, proposedName)"), "Ghost/create-child locations must honor Obsidian's configured new-note folder logic");
assert(mainSource.includes("new MaterializeGhostModal("), "Ambiguous destinations or Excalidraw choices must use the materialization dialog");
assert(mainSource.includes("this.index.renameFile(page.path, file)"), "Materializing a ghost in another folder must remap the live virtual page instead of rebuilding the vault");
assert(mainSource.includes("this.index?.dematerializeFile(deleted.path)"), "Deleting an active Markdown file must dematerialize the existing GraphPage instead of rebuilding/falling back to root");
assert(mainSource.includes('this.app.vault.getFileByPath(file.path) !== file'), "Metadata events for already-deleted TFiles must be ignored instead of resurrecting a stale patch/rebuild");
assert(mainSource.includes("this.settlePatchOnlyBacklogIfIdle()"), "Deleting a note must clear metadata-only rebuild work once no dirty Markdown paths remain");
assert(appSource.includes("plugin.resolveNavigationFallbackPath(activePath)"), "A missing persisted center must fall back through navigation history before the vault root");
assert(mainSource.includes("this.settings.navigationHistory.length - 1"), "Navigation fallback must walk history newest-to-oldest");
assert(!appSource.includes("plugin.app.vault.getMarkdownFiles()[0]?.path"), "Startup must not choose an arbitrary first Markdown note when navigation history is exhausted");
assert(plexGraphSource.includes('setTitle(persistent.file ? "Delete note…" : "Delete placeholder…")'), "Every Markdown/placeholder node context menu must expose deletion");
assert(plexGraphSource.includes("plugin.deleteNode(persistent, hostLeaf, isCenter)"), "Node deletion must tell the workflow whether the deleted node is the active center");
assert(mainSource.includes("this.removeFromNavigationHistory(path)"), "Every deleted node must be removed from navigation history immediately");
assert(mainSource.includes("const fallback = this.deletionFallbackPath(path)"), "Deleting the active center must choose its replacement from remaining navigation history");
assert(mainSource.includes('return this.index.get("folder:/")?.path ?? null'), "Delete navigation must fall back to the vault root when no valid history entry remains");
assert(mainSource.indexOf("this.removeFromNavigationHistory(path)") < mainSource.indexOf("removePropertyReferencesToNode(ghost)"), "Delete navigation/history cleanup must happen before asynchronous relationship cleanup");
assert(mainSource.includes("removePropertyReferencesToNode"), "Node deletion must clean document-property references before considering a ghost removable");
assert(mainSource.includes("normalizedNoteReferenceMatches"), "Property cleanup must still recognize a note link after deleting its backing file makes Obsidian resolution unavailable");
assert(mainSource.includes("remainingBodyReferences"), "Deletion review must include parser-backed inline body relationships that may not appear in Obsidian's link cache");
assert(mainSource.includes("new RemainingNodeReferencesModal("), "Body references must be surfaced for manual cleanup rather than rewritten automatically");
assert(deleteNodeModalSource.includes("Always confirm before deleting files"), "The first delete prompt must capture the persistent file-delete confirmation preference");
assert(deleteNodeModalSource.includes("I understand, don\'t ask me again"), "Real-file delete confirmations must let the user disable future prompts from the dialog itself");
assert(mainSource.includes("const preferenceChanged = this.settings.confirmFileDelete !== confirmFileDelete"), "Delete confirmation preferences changed from the dialog must persist even after first use");
assert(settingsSource.includes("confirmFileDelete: boolean"), "File-delete confirmation preference must be persisted");
assert(createFolderNoteModalSource.includes('this.modalEl.addClass("kplex-create-folder-note-modal")'), "Folder creation must expose a scoped modal class for responsive layout styling");
assert(createFolderNoteModalSource.includes('nameSetting.settingEl.addClass("kplex-create-folder-note-name-setting")'), "Folder creation must mark the filename row so the input can use the full modal width");
assert(createFolderNoteModalSource.includes('this.scope.register(["Mod"], "Enter"'), "Folder creation must use the shared Ctrl/Cmd+Enter create default");
assert(createFolderNoteModalSource.includes('this.plugin.settings.newNodeDefaultType'), "Folder creation must share the create-child Markdown/Excalidraw default");
assert(!createFolderNoteModalSource.includes("Create placeholder"), "Folder creation must not offer a placeholder because folders require real files");
assert(plexGraphSource.includes('const folderChildCreation = node.page.isFolder && gate === "bottom"'), "A folder child gate must be a valid creation drag origin");
assert(plexGraphSource.includes('if (origin?.isFolder && drag.gate === "bottom")'), "Releasing a dragged folder child gate must open file-only folder creation");
assert(thoughtNodeSource.includes('"child gate · drag to create a note in this folder"'), "Folder child gates must explain their creation gesture");
assert(plexGraphSource.includes("plugin.openCreateInFolderModal(target, hostLeaf)"), "Dropping a regular note gate on a folder may continue to start the secondary file-only folder flow");
assert(mainSource.includes("createNewNodeInFolder(folder: GraphPage"), "Folder creation must materialize directly in the selected folder");
assert(newRelatedSource.includes('className: "kplex-add-related-control-row"'), "Ontology and open-for-editing controls must share the first responsive row");
assert(newRelatedSource.includes('className: "kplex-add-related-compose-row"'), "Name search and create/link actions must share the second row");
assert(newRelatedSource.indexOf("controlRow,") < newRelatedSource.indexOf("composeRow,"), "Relationship controls must render above the focused name row");
assert(newRelatedSource.includes('className: "kplex-create-alias-input"'), "Create-related UI must provide an optional alias field");
assert(newRelatedSource.includes("plugin.createWebLinkRelatedPage(origin, role, webUrl, alias, field)"), "Create-related UI must recognize and persist web-link relationships");
assert(mainSource.includes('const reference = alias ? `[${escapedAlias}](${url})` : url'), "Web-link aliases must be stored as Markdown link labels in document properties");
assert(mainSource.includes('frontmatter[key] = [...aliases, alias]'), "New-note aliases must be written through Obsidian frontmatter");
assert(appSource.includes("plugin.isManagedCreatedFile(trackedFile)"), "A selected optimistic note must survive an older in-flight index publication");
assert(mainSource.includes('this.scheduleRebuild("kplex:create-during-rebuild")'), "A note created during a full build must queue one authoritative catch-up pass");
assert(!appSource.includes("plugin.settings.toolbarExpanded ?"), "Visibility controls must no longer depend on an expanded-toolbar overflow state");
assert(plexFilterSource.includes("kplex-filter-visibility-grid"), "Node-type visibility controls must live in the Filter / Graph Lenses popover");
assert(plexFilterSource.includes('option value="connections-desc"'), "Filter panel must expose connection-count sorting");
assert(simpleFilterSource.includes("buildGraphLensSimpleConditionExpression"), "Quick filter must compile through the same field/operator model as Graph Lenses");
assert(plexFilterSource.includes('label: "does not have tag"'), "Quick lens must expose an explicit negative tag filter");
assert(!appSource.includes('title="Refresh K-Plex"'), "Manual full-index rebuild must stay out of the always-visible toolbar");
assert(!appSource.includes('icon={isPinned ? "bookmark-check" : "bookmark"}'), "Pinning belongs in node context menus, not the toolbar");
assert(appSource.includes('toggleToolbarSetting("renderAlias")'), "Display aliases must be an always-visible presentation toggle");
assert(!plexFilterSource.includes('["renderAlias", "Aliases"]'), "Display aliases is presentation state, not a graph filter");
assert(plexFilterSource.indexOf('>Node order<') < plexFilterSource.indexOf('>Quick lens<'), "Node order must precede Quick lens");
assert(plexFilterSource.indexOf('>Quick lens<') < plexFilterSource.indexOf('>Graph lenses<'), "Quick lens must precede Graph lenses");
assert(plexFilterSource.includes("data-kplex-long-press-tooltip"), "Filter toggles must expose touch-friendly tooltips");
assert(newRelatedSource.includes('{ value: "previous", label: "Previous" }') && newRelatedSource.includes('{ value: "next", label: "Next" }'), "Add-note relationship dropdown must include previous and next");
assert(newRelatedSource.includes('className: "kplex-create-alias-input"'), "Add-note dialog must retain its optional alias editor");
assert(plexGraphSource.includes('.setTitle("Add note…")'), "Node context menus must expose Add note");
assert(plexGraphSource.includes("TOUCH_GATE_LONG_PRESS_MS"), "Touch gate long-press must enter relationship drag mode");
assert(plexGraphSource.includes("Keep a deliberate gate hold stationary"), "A gate hold must not pan the canvas before becoming a relationship drag");
assert(plexGraphSource.includes("NODE_RELINK_MIN_DRAG_PX"), "Small accidental node nudges must not trigger relationship relinking");
assert(stylesSource.includes("min-inline-size: 14px") && stylesSource.includes("max-inline-size: 14px"), "The section unfold control must remain square on coarse-pointer/iPad layouts");
assert(mainSource.includes("showKplexMenuAtPosition") && mainSource.includes("kplexMenuOutsidePointerDown"), "K-Plex context menus must be centrally dismissed by outside pointer input");
assert(longPressTooltipSource.includes("event.stopImmediatePropagation()"), "Completed long presses must consume the synthesized button click");
assert(longPressTooltipSource.includes("showTooltip(activeTarget)"), "Completed long presses must show the active control tooltip");
const placeholderPathStart = mainSource.indexOf("  private placeholderPath(stem: string)");
const placeholderPathEnd = mainSource.indexOf("  async createPlaceholderRelatedPage(", placeholderPathStart);
assert(placeholderPathStart >= 0 && placeholderPathEnd > placeholderPathStart);
const placeholderPathSource = mainSource.slice(placeholderPathStart, placeholderPathEnd);
assert(placeholderPathSource.includes("return stem.trim()"), "New placeholders must use only their unresolved note name as identity");
assert(!placeholderPathSource.includes("getNewFileParent"), "A placeholder must not receive a physical folder before it is materialized");

globalThis.window = globalThis;

function compile(relativePath) {
  const sourcePath = join(root, relativePath);
  const outputPath = join(temp, relativePath.replace(/\.ts$/, ".js"));
  mkdirSync(dirname(outputPath), { recursive: true });
  const source = readFileSync(sourcePath, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2021,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      strict: true,
    },
    fileName: sourcePath,
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  if (errors.length) {
    throw new Error(errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n")).join("\n"));
  }
  writeFileSync(outputPath, result.outputText);
}

for (const file of [
  "src/lang/en.ts",
  "src/lang/index.ts",
  "src/types.ts",
  "src/core/plex/viewPresentation.ts",
  "src/core/graph/model.ts",
  "src/core/parser/metadata.ts",
  "src/core/graph/relations.ts",
  "src/core/graph/evidence.ts",
  "src/core/graph/resolver.ts",
  "src/core/graph/source.ts",
  "src/core/plex/predicate.ts",
  "src/core/plex/predicateParser.ts",
  "src/core/plex/lens.ts",
  "src/adapters/obsidian/graphContracts.ts",
  "src/adapters/obsidian/predicateContracts.ts",
  "src/adapters/obsidian/structuralSourceCollector.ts",
  "src/adapters/obsidian/hostLinkSourceCollector.ts",
  "src/adapters/obsidian/ontologySourceCollector.ts",
  "src/adapters/obsidian/metadataSourceCollector.ts",
  "src/util/perf.ts",
  "src/main.ts",
  "src/index/fieldParser.ts",
  "src/index/MetadataParser.ts",
  "src/index/RelationEvidence.ts",
  "src/index/RelationResolver.ts",
  "src/index/GraphState.ts",
  "src/index/IndexSnapshot.ts",
  "src/index/IndexedDbCache.ts",
  "src/index/GraphBuilder.ts",
  "src/index/GraphIndex.ts",
  "src/index/SectionExpansion.ts",
  "src/index/style.ts",
  "src/lens/GraphPredicate.ts",
  "src/lens/GraphPredicateParser.ts",
  "src/lens/GraphLens.ts",
  "src/lens/GraphLensSimple.ts",
  "src/lens/SimplePlexFilter.ts",
  "src/ui/layout.ts",
]) compile(file);

const obsidianModuleDir = join(temp, "node_modules/obsidian");
mkdirSync(obsidianModuleDir, { recursive: true });
writeFileSync(join(obsidianModuleDir, "index.js"), String.raw`
class TAbstractFile {
  constructor(path) {
    this.path = path;
    this.name = path.split('/').pop() || '';
    this.parent = null;
  }
}
class TFile extends TAbstractFile {
  constructor(path, mtime = 1) {
    super(path);
    const dot = this.name.lastIndexOf('.');
    this.extension = dot >= 0 ? this.name.slice(dot + 1) : '';
    this.basename = dot >= 0 ? this.name.slice(0, dot) : this.name;
    this.stat = { mtime, ctime: mtime, size: 0 };
  }
}
class TFolder extends TAbstractFile {
  constructor(path) {
    super(path);
    this.children = [];
  }
}
function getAllTags(cache) {
  const tags = new Set((cache?.tags || []).map((x) => x.tag));
  const raw = cache?.frontmatter?.tags ?? cache?.frontmatter?.tag;
  const values = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
  for (const value of values) {
    if (typeof value !== 'string') continue;
    for (const token of value.split(/[\s,]+/)) if (token) tags.add(token.startsWith('#') ? token : '#' + token);
  }
  return [...tags];
}
function moment(value, inputFormat, strict) {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const valid = Boolean(match) && (!strict || inputFormat === 'YYYY-MM-DD');
  return {
    isValid() { return valid; },
    format(fmt) {
      if (!valid) return 'Invalid date';
      const [, y, m, d] = match;
      const values = { YYYY: y, YY: y.slice(-2), MM: m, DD: d, M: String(Number(m)), D: String(Number(d)) };
      let out = '';
      for (let i = 0; i < fmt.length;) {
        if (fmt[i] === '[') {
          const close = fmt.indexOf(']', i + 1);
          if (close >= 0) { out += fmt.slice(i + 1, close); i = close + 1; continue; }
        }
        const token = ['YYYY', 'YY', 'MM', 'DD', 'M', 'D'].find((candidate) => fmt.startsWith(candidate, i));
        if (token) { out += values[token]; i += token.length; }
        else { out += fmt[i]; i += 1; }
      }
      return out;
    },
  };
}
const Platform = { isMobile: false };
class Plugin {
  constructor() { this.app = null; }
  async saveData() {}
  async loadData() { return {}; }
  registerEvent() {}
  registerView() {}
  addCommand() {}
  addSettingTab() {}
}
class FileView { constructor() { this.containerEl = null; } }
class MarkdownView extends FileView {}
class Menu {}
class Notice { constructor() {} }
function normalizePath(path) { return path; }
function setIcon() {}
module.exports = {
  TAbstractFile, TFile, TFolder, getAllTags, moment, Platform, Plugin, FileView, MarkdownView,
  Menu, Notice, normalizePath, setIcon,
};
`);

const obsidianTestApi = require(join(obsidianModuleDir, "index.js"));
const { TFile, TFolder } = obsidianTestApi;
// Production K-Plex uses Obsidian's host-provided `window.moment`, just like the Tasks plugin.
// Install the test double on the fake window instead of pretending Moment is a production import.
globalThis.window.moment = obsidianTestApi.moment;

// main.ts is compiled too so the coordinator cancellation regression exercises the production
// performRebuild method. Its unrelated UI/settings dependencies are inert stubs in this fixture.
function writeRuntimeStub(relativePath, source) {
  const path = join(temp, relativePath);
  assert(!existsSync(path), `Runtime stub must not replace compiled behavior: ${relativePath}`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, source);
}
writeRuntimeStub("src/settings.js", `
exports.DEFAULT_SETTINGS = {};
exports.ExcaliBrainSettingTab = class {};
exports.migrateAndMergeSettings = (_legacy, own) => own ?? {};
`);
writeRuntimeStub("src/ui/ExcaliBrainView.js", `
exports.EXCALIBRAIN_VIEW_TYPE = "kplex";
exports.KPLEX_SIDEPANEL_VIEW_TYPE = "kplex-sidepanel";
exports.ExcaliBrainView = class {};
exports.KplexSidepanelView = class {};
`);
for (const [path, name] of [
  ["src/ui/RelationModal.js", "RelationModal"],
  ["src/ui/NewRelatedNoteModal.js", "NewRelatedNoteModal"],
  ["src/ui/MaterializeGhostModal.js", "MaterializeGhostModal"],
  ["src/ui/CreateFolderNoteModal.js", "CreateFolderNoteModal"],
  ["src/editor/OntologySuggester.js", "OntologySuggester"],
  ["src/ui/AddToOntologyModal.js", "AddToOntologyModal"],
  ["src/ui/NoteTypeModal.js", "NoteTypeModal"],
]) writeRuntimeStub(path, `exports.${name} = class {};`);
writeRuntimeStub("src/ui/DeleteNodeModal.js", `exports.DeleteNodeConfirmationModal = class {}; exports.RemainingNodeReferencesModal = class {};`);
writeRuntimeStub("src/ui/viewProfile.js", `
exports.activeLayoutProfile = () => null;
exports.effectiveViewSettings = (_settings, view) => view ?? {};
exports.layoutProfileKey = () => "desktop";
`);
writeRuntimeStub("src/adapters/obsidian/presentationEnvironment.js", `
exports.readObsidianPresentationEnvironment = () => ({
  device: "desktop",
  keyConvention: "unknown",
  inputModes: { keyboard: true, pointer: true, touch: false },
  hostActions: { graphTab: true, sidepanel: true, popout: true },
});
`);
writeRuntimeStub("src/adapters/obsidian/localization.js", `
const { createTranslator } = require("../../lang");
exports.createObsidianTranslator = () => createTranslator("en");
`);

const { GraphIndex } = require(join(temp, "src/index/GraphIndex.js"));
const ExcaliBrainPlugin = require(join(temp, "src/main.js")).default;
const { persistedPageFromGraphPage, addPersistedPageToState, hydratePersistedRelations, computeIndexSettingsSignature, computeVaultSignature, persistedDeclarationFromEvidence } = require(join(temp, "src/index/IndexSnapshot.js"));
const { createGraphState } = require(join(temp, "src/index/GraphState.js"));
const { buildCentralSectionExpansion, canExpandCentralSections, projectCentralSectionExpansion } = require(join(temp, "src/index/SectionExpansion.js"));
const { parseBodyMetadata, parseBodyMetadataCore, parseBodyMetadataCooperative } = require(join(temp, "src/index/fieldParser.js"));
const { MetadataParser, MetadataParseCancelledError } = require(join(temp, "src/index/MetadataParser.js"));
const { RelationType, LinkDirection } = require(join(temp, "src/types.js"));
const { resolveNodeStyle } = require(join(temp, "src/index/style.js"));
const { RelationEvidenceStore } = require(join(temp, "src/index/RelationEvidence.js"));
const { buildScene, buildSectionExpandedScene } = require(join(temp, "src/ui/layout.js"));
const {
  GraphPredicateEngine,
  compileGraphPredicate,
  predicateCall,
  predicateCompare,
  predicateLiteral,
  predicateProperty,
} = require(join(temp, "src/lens/GraphPredicate.js"));
const { EMPTY_PLEX_FILTER, compilePlexFilter } = require(join(temp, "src/lens/SimplePlexFilter.js"));
const { compileGraphLensDefinitions, graphLensEdgeStyle, graphLensNodeStyle, matchesGraphLenses, sanitizeGraphLensDefinitions, validateGraphLensExpression } = require(join(temp, "src/lens/GraphLens.js"));
const { tryParseGraphPredicateExpression } = require(join(temp, "src/lens/GraphPredicateParser.js"));
const {
  buildGraphLensSimpleExpression,
  defaultGraphLensSimpleModel,
  tryParseGraphLensSimpleExpression,
} = require(join(temp, "src/lens/GraphLensSimple.js"));

function walk(dir) {
  const result = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(path));
    else if (entry.isFile()) result.push(path);
  }
  return result;
}

function unquote(value) {
  const text = value.trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) return text.slice(1, -1);
  return text;
}

function parseFrontmatter(content) {
  const lines = content.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return { frontmatter: {}, body: content };
  const frontmatter = {};
  let i = 1;
  for (; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === "---" || line.trim() === "...") { i += 1; break; }
    const match = line.match(/^([^:#][^:]*):\s*(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const rest = match[2].trim();
    if (rest) {
      frontmatter[key] = unquote(rest);
      continue;
    }
    const values = [];
    while (i + 1 < lines.length) {
      const list = lines[i + 1].match(/^\s+-\s+(.*)$/);
      if (!list) break;
      values.push(unquote(list[1]));
      i += 1;
    }
    frontmatter[key] = values;
  }
  return { frontmatter, body: lines.slice(i).join("\n") };
}

function maskInlineCode(text) {
  return text.replace(/`+[^`]*`+/g, "");
}

const filePaths = walk(fixtureRoot).filter((path) => path.endsWith(".md"));
const contents = new Map();
const files = new Map();
let mtime = 1;
for (const absolute of filePaths) {
  const path = relative(fixtureRoot, absolute).replaceAll("\\", "/");
  contents.set(path, readFileSync(absolute, "utf8"));
  files.set(path, new TFile(path, mtime++));
}

const folders = new Map();
const rootFolder = new TFolder("");
rootFolder.name = "";
folders.set("", rootFolder);
function ensureFolder(path) {
  if (folders.has(path)) return folders.get(path);
  const parentPath = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
  const parent = ensureFolder(parentPath);
  const folder = new TFolder(path);
  folder.parent = parent;
  parent.children.push(folder);
  folders.set(path, folder);
  return folder;
}
for (const [path, file] of files) {
  const folderPath = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
  const folder = ensureFolder(folderPath);
  file.parent = folder;
  folder.children.push(file);
}

function positionAt(content, offset) {
  const before = content.slice(0, offset);
  const lines = before.split(/\r?\n/);
  return { line: lines.length - 1, col: lines[lines.length - 1].length, offset };
}

function cacheLinks(content) {
  const links = [];
  const push = (link, start, end, original) => links.push({
    link, original, displayText: original,
    position: { start: positionAt(content, start), end: positionAt(content, end) },
  });
  for (const match of content.matchAll(/\[\[([^\]#|]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g)) {
    push(match[1], match.index, match.index + match[0].length, match[0]);
  }
  for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    if (!/^https?:\/\//i.test(match[1])) push(match[1], match.index, match.index + match[0].length, match[0]);
  }
  return links;
}

const caches = new Map();
for (const [path, content] of contents) {
  const { frontmatter, body } = parseFrontmatter(content);
  const bodyWithoutCode = maskInlineCode(body);
  const bodyTags = [...bodyWithoutCode.matchAll(/(^|[^\w])#([A-Za-z0-9_/-]+)/g)].map((m) => ({ tag: `#${m[2]}` }));
  caches.set(path, { frontmatter, tags: bodyTags, links: cacheLinks(content) });
}

function resolveCandidate(raw) {
  let candidate = raw.trim();
  try { candidate = decodeURIComponent(candidate); } catch {}
  candidate = candidate.split("#")[0].split("|")[0].replace(/^\.\//, "");
  if (/^https?:\/\//i.test(candidate)) return null;
  const direct = candidate.toLowerCase().endsWith(".md") ? candidate : `${candidate}.md`;
  if (files.has(direct)) return direct;
  const lowerDirect = direct.toLowerCase();
  for (const path of files.keys()) if (path.toLowerCase() === lowerDirect) return path;
  const base = candidate.replace(/\.md$/i, "").toLowerCase();
  for (const path of files.keys()) {
    const basename = path.split("/").pop().replace(/\.md$/i, "").toLowerCase();
    if (basename === base) return path;
  }
  return null;
}

const resolvedLinks = {};
const unresolvedLinks = {};
for (const [sourcePath, content] of contents) {
  const resolved = {};
  const unresolved = {};
  const candidates = [];
  for (const match of content.matchAll(/\[\[([^\]#|]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g)) candidates.push(match[1]);
  for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) if (!/^https?:\/\//i.test(match[1])) candidates.push(match[1]);
  for (const candidate of candidates) {
    const target = resolveCandidate(candidate);
    if (target) resolved[target] = (resolved[target] ?? 0) + 1;
    else unresolved[candidate] = (unresolved[candidate] ?? 0) + 1;
  }
  resolvedLinks[sourcePath] = resolved;
  unresolvedLinks[sourcePath] = unresolved;
}

const metadataCache = {
  resolvedLinks,
  unresolvedLinks,
  getFileCache(file) { return caches.get(file.path) ?? null; },
  getFirstLinkpathDest(candidate) {
    const target = resolveCandidate(candidate);
    return target ? files.get(target) : null;
  },
};

const app = {
  vault: {
    getName() { return "K-Plex test vault"; },
    getRoot() { return rootFolder; },
    getMarkdownFiles() { return [...files.values()]; },
    getFiles() { return [...files.values()]; },
    cachedRead(file) { return Promise.resolve(contents.get(file.path) ?? ""); },
    getFileByPath(path) { return files.get(path) ?? null; },
    getAbstractFileByPath(path) { return files.get(path) ?? folders.get(path) ?? null; },
    getResourcePath(file) { return `app://local/${encodeURIComponent(file.path)}`; },
  },
  metadataCache,
  metadataTypeManager: {
    getPropertyInfo(name) {
      return ["date", "review-date", "follow-up-date", "milestone-date"].includes(name) ? { widget: "date" } : { widget: "text" };
    },
    getAssignedWidget(name) {
      return ["date", "review-date", "follow-up-date", "milestone-date"].includes(name) ? "date" : "text";
    },
  },
  internalPlugins: {
    getPluginById(id) {
      if (id !== "daily-notes") return null;
      return { enabled: true, instance: { options: { folder: "Daily", format: "YYYY/MM/YYYYMMDD" } } };
    },
  },
  loadLocalStorage() { return null; },
  saveLocalStorage() {},
};

const hierarchy = {
  hidden: ["hidden"],
  parents: ["Parent", "Parents", "up", "u", "North", "origin", "inception", "source", "parent domain"],
  children: ["Children", "Child", "down", "d", "South", "leads to", "contributes to", "nurtures"],
  leftFriends: ["Friends", "Friend", "Jump", "Jumps", "j", "similar", "supports", "alternatives", "advantages", "pros"],
  rightFriends: ["opposes", "disadvantages", "missing", "cons", "Challenger"],
  previous: ["Previous", "Prev", "West", "w", "Before"],
  next: ["Next", "n", "East", "e", "After"],
  exclusions: [],
};

const settings = {
  hierarchy,
  excalibrainFilepath: "Excalibrain.md",
  noteTypeField: "Note type",
  primaryTagField: "Note type",
  tagStyleList: ["#project", "#person"],
  tagNodeStyles: {},
  noteTypeStyles: {},
  displayAllStylePrefixes: true,
  baseNodeStyle: { maxLabelLength: 30, fontSize: 20, padding: 10, gateRadius: 5 },
  centralNodeStyle: { fontSize: 30 },
  siblingNodeStyle: {},
  inferredNodeStyle: {},
  urlNodeStyle: {},
  virtualNodeStyle: {},
  attachmentNodeStyle: {},
  folderNodeStyle: {},
  tagNodeStyle: {},
  baseLinkStyle: {},
  inferredLinkStyle: {},
  folderLinkStyle: {},
  tagLinkStyle: {},
  hierarchyLinkStyles: {},
  centerEmbedHeight: 700,
  centerEmbedWidth: 550,
  compactingFactor: 2,
  minLinkLength: 18,
  parentColumns: 2,
  childColumns: 5,
  friendMaxHeight: 350,
  siblingMaxHeight: 250,
  parentMaxHeight: 300,
  childMaxHeight: 400,
  graphDepth: 1,
  inferAllLinksAsFriends: false,
  inverseInfer: false,
  showFullTagName: true,
  showInferredNodes: true,
  showVirtualNodes: true,
  showAttachments: true,
  showFolderNodes: true,
  showTagNodes: true,
  showPageNodes: true,
  showURLNodes: true,
  renderAlias: true,
  nameFields: "aliases",
  nodeTitleScript: "",
  excludeFilepaths: [],
  maxItemCount: 500,
  renderSiblings: true,
  siblingRelativeSize: 85,
  crossLinkOpacity: 85,
  thumbnailProperty: "thumbnail",
  nodeImageProperty: "node-image",
  attachmentImageDisplay: "thumbnail-label",
  editNewNodeAfterCreate: false,
  newNodeDefaultType: "markdown",
};

const plugin = { app, settings, getIndexSourceRevision: () => 0, recordDiagnostic() {}, manifest: { dir: "" } };
const index = new GraphIndex(plugin, app);

function expectRole(sourcePath, role, targetPath, type) {
  const source = index.get(sourcePath);
  assert(source, `Missing source ${sourcePath}`);
  const found = index.neighbours(source, role).find((item) => item.page.path === targetPath);
  assert(found, `Expected ${sourcePath} -> ${targetPath} as ${role}`);
  assert.equal(found.relationType, type, `${sourcePath} -> ${targetPath} ${role} type`);

  // Every asserted visible relationship must also be explainable from stored provenance.
  const explanation = index.explainRelationship(sourcePath, targetPath);
  assert(explanation, `Expected explanation for ${sourcePath} -> ${targetPath}`);
  assert(
    explanation.resolvedRoles.some((item) => item.role === role && item.relationType === type),
    `Explanation did not resolve ${sourcePath} -> ${targetPath} as ${role}`,
  );
  assert(explanation.decisions.some((item) => item.active), `Explanation has no active evidence for ${sourcePath} -> ${targetPath}`);
  return found;
}
function expectNoRole(sourcePath, role, targetPath) {
  const source = index.get(sourcePath);
  assert(source, `Missing source ${sourcePath}`);
  assert(!index.neighbours(source, role).some((item) => item.page.path === targetPath), `Did not expect ${sourcePath} -> ${targetPath} as ${role}`);
}

try {
  // Parser contract first: these cases failed in the old single-regex implementation.
  const legacyParserFixture = [
    "---",
    "Parent: \"[[IgnoredFrontmatter]]\"",
    "---",
    "Parent:: [[A]]",
    "Text before (Friend:: [[B]], [[C]]) but [[D]] stays outside.",
    "Text before [Challenger:: [[E]]] after.",
    "**source**:: [Alias](https://example.com/x)",
    "- Previous:: [[P]]",
    "Text (Friend:: [[F1]]) then [Challenger:: [[F2]]] on one line.",
    "`Fake:: [[Ignored]]`",
    "<!-- (Parent:: [[IgnoredComment]]) -->",
    "<!--",
    "Child:: [[IgnoredMultilineComment]]",
    "-->",
    "```",
    "Hidden:: [[Ignored2]]",
    "```",
  ].join("\n");
  const parsed = parseBodyMetadata(legacyParserFixture);
  assert.deepEqual(await parseBodyMetadataCooperative(legacyParserFixture), parsed, "Legacy fixture must match cooperative fallback grammar");
  assert.deepEqual(parsed.inlineFields.parent, ["[[A]]"]);
  assert.deepEqual(parsed.inlineFields.source, ["[Alias](https://example.com/x)"]);
  assert.deepEqual(parsed.inlineFields.previous, ["[[P]]"]);
  assert.deepEqual(parsed.inlineFields.friend, ["[[B]], [[C]]", "[[F1]]"]);
  assert.deepEqual(parsed.inlineFields.challenger, ["[[E]]", "[[F2]]"]);
  assert.equal(parsed.inlineFields.fake, undefined);
  assert.equal(parsed.inlineFields.hidden, undefined);
  assert.equal(parsed.inlineFields.child, undefined);
  assert.equal(parsed.inlineFields["ignoredfrontmatter"], undefined);

  // MetadataParser serializes this exact function into its Web Worker. Verify the function is
  // genuinely self-contained so worker and fallback parsing cannot silently diverge.
  const isolatedParser = Function(`return (${parseBodyMetadataCore.toString()})`)();
  assert.deepEqual(isolatedParser([
    "Parent:: [[A]]",
    "Text (Friend:: [[B]]) then [Challenger:: [[C]]]",
  ].join("\n")), parseBodyMetadata([
    "Parent:: [[A]]",
    "Text (Friend:: [[B]]) then [Challenger:: [[C]]]",
  ].join("\n")));

  // Large Excalidraw drawings live inside fenced JSON. The body parser must ignore the drawing
  // payload without materializing/parsing it as Dataview fields or URLs.
  const hugeDrawingPayload = `{"blob":"${"x".repeat(1024 * 1024)}","fake":"Friend:: [[IgnoredDrawingData]]"}`;
  const hugeDrawingParsed = parseBodyMetadata([
    "Parent:: [[A]]",
    "```json",
    hugeDrawingPayload,
    "```",
    "Child:: [[B]]",
  ].join("\n"));
  assert.deepEqual(hugeDrawingParsed.inlineFields.parent, ["[[A]]"]);
  assert.deepEqual(hugeDrawingParsed.inlineFields.child, ["[[B]]"]);
  assert.equal(hugeDrawingParsed.inlineFields.friend, undefined);

  await index.rebuild();

  const A = index.get("Note A.md");
  assert(A);
  const neighborhoodA = index.getNeighborhood("Note A.md");
  assert(neighborhoodA);

  // Capture published behavior before any of this suite's runtime edits. This fixture protects
  // every graph page, original declaration, precedence decision and ordinary Plex scene when
  // compilation and layout move into host-independent modules.
  const baseline = {
    graph: canonicalGraph(index),
    neighborhoods: Object.fromEntries(["Note A.md", "folder:/", "tag:project"]
      .map((path) => [path, canonicalNeighborhood(index, path)])),
    scene: canonicalScene(buildScene(neighborhoodA, index, settings)),
    searches: Object.fromEntries(["note a", "note b", "project", "folder", "https"]
      .map((query) => [query, index.search(query, 12).map((page) => page.path)])),
  };
  assert.deepEqual(baseline, JSON.parse(readFileSync(join(root, "tests/fixtures/excalibrain-indexing/graph-baseline.json"), "utf8")));

  // A custom style selected by the Style property is an explicit user choice. It must remain
  // visible on the central note instead of being masked by the generic central-node appearance.
  const originalCentralStyle = settings.centralNodeStyle;
  const originalNoteTypeStyles = settings.noteTypeStyles;
  const originalCenterNoteType = A.noteType;
  A.noteType = "testStyle";
  settings.centralNodeStyle = { backgroundColor: "#aaaaaaff", textColor: "#000000ff", fontSize: 30 };
  settings.noteTypeStyles = { testStyle: { backgroundColor: "#ff00ffff", textColor: "#ffffffff" } };
  const styledCenter = resolveNodeStyle(A, null, "center", settings);
  assert.equal(styledCenter.backgroundColor, "#ff00ffff", "Property-value styles must override the generic central background");
  assert.equal(styledCenter.textColor, "#ffffffff", "Property-value styles must override the generic central text color");
  assert.equal(styledCenter.fontSize, 30, "Unspecified properties still inherit the central style");
  settings.noteTypeStyles = { "#testStyle": { borderColor: "#123456ff" } };
  assert.equal(resolveNodeStyle(A, null, "center", settings).borderColor, "#123456ff", "Legacy/hash-prefixed style keys must normalize to the same logical value");
  settings.centralNodeStyle = originalCentralStyle;
  settings.noteTypeStyles = originalNoteTypeStyles;
  A.noteType = originalCenterNoteType;

  // Issues #7/#8: every semantic relationship between visible non-central notes is rendered as
  // a cross-link by default. The actual ontology role is retained so the renderer chooses the
  // same top/bottom/left/right gates as a center connection, and the visibility switch removes
  // only these secondary links.
  assert.equal(EMPTY_PLEX_FILTER.showCrossLinks, true, "Cross-links must be visible by default");
  const sceneA = buildScene(neighborhoodA, index, settings);
  const crossBC = sceneA.edges.find((edge) => edge.isCrossLink && edge.sourcePath === "Note B.md" && edge.targetPath === "Note C.md");
  assert(crossBC, "Visible parent/child notes must retain their cross-link");
  assert.equal(crossBC.role, "child", "Cross-links must use the resolved ontology role, not the sibling presentation role");
  const crossCD = sceneA.edges.find((edge) => edge.isCrossLink && edge.sourcePath === "Note C.md" && edge.targetPath === "Note D.md");
  assert(crossCD, "Visible related peers must retain their cross-link");
  assert.equal(crossCD.role, "left");
  const sceneAWithoutCrossLinks = buildScene(neighborhoodA, index, settings, false);
  assert.equal(sceneAWithoutCrossLinks.edges.some((edge) => edge.isCrossLink), false, "Cross-link visibility toggle must leave secondary links out of the scene");
  assert(sceneAWithoutCrossLinks.edges.some((edge) => edge.sourcePath === "Note A.md"), "Cross-link visibility toggle must not remove center spokes");

  // Issue #8 regression: a sibling can be the child of several visible parents. Every one of
  // those parent relationships must render; no parent may be arbitrarily prioritized.
  const fakePage = (path) => ({
    path,
    name: path.replace(/\.md$/, ""),
    file: null,
    aliases: [],
    tags: [],
    styleTags: [],
    neighbours: new Map(),
  });
  const fakeCenter = fakePage("Center.md");
  const fakeParentOne = fakePage("Parent One.md");
  const fakeParentTwo = fakePage("Parent Two.md");
  const fakeSibling = fakePage("Sibling.md");
  const fakeNeighbour = (page, role) => ({ page, role, relationType: RelationType.DEFINED, typeDefinition: role === "child" ? "Child" : "Parent", linkDirection: null });
  const emptyGateStats = () => ({
    top: { visibleCount: 0, hasAny: false },
    bottom: { visibleCount: 0, hasAny: false },
    left: { visibleCount: 0, hasAny: false },
    right: { visibleCount: 0, hasAny: false },
  });
  const fakeCrossIndex = {
    titleFor: (page) => page.name,
    neighbourCount: () => 0,
    gateStats: emptyGateStats,
    neighbours: () => [],
    visibleRelationshipsWithin: (source, targets) => {
      if ((source === fakeParentOne || source === fakeParentTwo) && targets.has(fakeSibling.path)) return [fakeNeighbour(fakeSibling, "child")];
      return [];
    },
  };
  const multiParentScene = buildScene({
    center: fakeCenter,
    parents: [fakeNeighbour(fakeParentOne, "parent"), fakeNeighbour(fakeParentTwo, "parent")],
    children: [],
    leftFriends: [],
    rightFriends: [],
    siblings: [fakeNeighbour(fakeSibling, "sibling")],
  }, fakeCrossIndex, settings);
  const siblingParentLinks = multiParentScene.edges.filter((edge) => !edge.isCrossLink && edge.targetPath === fakeSibling.path);
  assert.deepEqual(siblingParentLinks.map((edge) => edge.sourcePath).sort(), [fakeParentOne.path, fakeParentTwo.path]);
  assert(siblingParentLinks.every((edge) => edge.role === "child"));
  const multiParentWithoutCrossLinks = buildScene({
    center: fakeCenter,
    parents: [fakeNeighbour(fakeParentOne, "parent"), fakeNeighbour(fakeParentTwo, "parent")],
    children: [],
    leftFriends: [],
    rightFriends: [],
    siblings: [fakeNeighbour(fakeSibling, "sibling")],
  }, fakeCrossIndex, settings, false);
  const structuralSiblingLinks = multiParentWithoutCrossLinks.edges.filter((edge) => edge.targetPath === fakeSibling.path);
  assert.deepEqual(
    structuralSiblingLinks.map((edge) => edge.sourcePath).sort(),
    [fakeParentOne.path, fakeParentTwo.path],
    "Sibling-parent links must remain visible when cross-links are disabled",
  );
  assert(structuralSiblingLinks.every((edge) => !edge.isCrossLink), "Sibling-parent links are structural sibling context, not optional cross-links");

  // Ontology-specific connector styles are keyed by the normalized relationship field and apply
  // equally to center spokes, structural sibling links and optional cross-links.
  settings.hierarchyLinkStyles.child = { strokeColor: "#123456ff", strokeStyle: "dashed" };
  const styledSiblingScene = buildScene({
    center: fakeCenter,
    parents: [fakeNeighbour(fakeParentOne, "parent")],
    children: [],
    leftFriends: [],
    rightFriends: [],
    siblings: [fakeNeighbour(fakeSibling, "sibling")],
  }, fakeCrossIndex, settings, false);
  const styledSiblingLink = styledSiblingScene.edges.find((edge) => edge.sourcePath === fakeParentOne.path && edge.targetPath === fakeSibling.path);
  assert(styledSiblingLink);
  assert.equal(styledSiblingLink.style.strokeColor, "#123456ff");
  assert.equal(styledSiblingLink.style.strokeStyle, "dashed");
  delete settings.hierarchyLinkStyles.child;

  // Sibling sizing is a presentation multiplier, not a semantic/index setting. Verify the two
  // supported endpoints affect the sibling thought proportionally without changing other roles.
  const siblingAt85 = multiParentScene.nodes.find((node) => node.page.path === fakeSibling.path);
  const parentAt85 = multiParentScene.nodes.find((node) => node.page.path === fakeParentOne.path);
  assert(siblingAt85 && parentAt85);
  settings.siblingRelativeSize = 30;
  const siblingScaleScene = buildScene({
    center: fakeCenter,
    parents: [fakeNeighbour(fakeParentOne, "parent"), fakeNeighbour(fakeParentTwo, "parent")],
    children: [],
    leftFriends: [],
    rightFriends: [],
    siblings: [fakeNeighbour(fakeSibling, "sibling")],
  }, fakeCrossIndex, settings);
  const siblingAt30 = siblingScaleScene.nodes.find((node) => node.page.path === fakeSibling.path);
  const parentAt30 = siblingScaleScene.nodes.find((node) => node.page.path === fakeParentOne.path);
  assert(siblingAt30 && parentAt30);
  assert(Math.abs((siblingAt30.width / siblingAt85.width) - (30 / 85)) < 0.001, "Sibling width must follow the configured relative-size multiplier");
  assert.equal(parentAt30.width, parentAt85.width, "Sibling sizing must not resize parent thoughts");
  settings.siblingRelativeSize = 85;

  // Quick filter checkpoint: it is now exactly one Graph-Lens-style condition, including negative
  // operators, rather than a separate keyword/tag/note-type predicate language.
  const predicateEngine = new GraphPredicateEngine(app);
  const simplePredicate = compilePlexFilter({ field: "node.label", operator: "contains", value: "alpha hub", showCrossLinks: true });
  assert(simplePredicate);
  assert.equal(simplePredicate.dependencies.usesFrontmatter, false);
  assert.equal(predicateEngine.matches(simplePredicate, { node: { page: A, label: index.titleFor(A) }, center: A }), true);
  const noteBForPredicate = index.get("Note B.md");
  assert(noteBForPredicate);
  assert.equal(predicateEngine.matches(simplePredicate, { node: { page: noteBForPredicate, label: index.titleFor(noteBForPredicate) }, center: A }), false);

  const negativeTagPredicate = compilePlexFilter({ field: "file.tags", operator: "does-not-have", value: "#taxonomy/body", showCrossLinks: true });
  assert(negativeTagPredicate);
  assert.equal(predicateEngine.matches(negativeTagPredicate, { node: { page: A, label: index.titleFor(A) }, center: A }), false);
  assert.equal(predicateEngine.matches(negativeTagPredicate, { node: { page: noteBForPredicate, label: index.titleFor(noteBForPredicate) }, center: A }), true);

  const noteTypePredicate = compilePlexFilter({ field: "node.noteType", operator: "is", value: "PROJECT", showCrossLinks: true });
  assert(noteTypePredicate);
  assert.equal(predicateEngine.matches(noteTypePredicate, { node: { page: A, label: index.titleFor(A) }, center: A }), true);

  const noteACacheForPredicate = caches.get("Note A.md");
  noteACacheForPredicate.frontmatter["Lens Status"] = "Active";
  const metadataPredicate = compileGraphPredicate(predicateCall(
    "text.equals",
    predicateProperty("note", "Lens Status"),
    predicateLiteral("active"),
  ));
  assert.equal(metadataPredicate.dependencies.usesFrontmatter, true);
  assert(metadataPredicate.dependencies.noteProperties.has("Lens Status"));
  assert.equal(predicateEngine.matches(metadataPredicate, { node: { page: A }, center: A }), true);
  const simpleRelationshipLens = defaultGraphLensSimpleModel("edge");
  simpleRelationshipLens.conditions[0].value = "working-on";
  const simpleRelationshipExpression = buildGraphLensSimpleExpression(simpleRelationshipLens);
  assert.equal(simpleRelationshipExpression, 'edge.definition.equals("working-on")');
  assert.equal(tryParseGraphPredicateExpression(simpleRelationshipExpression).error, undefined);
  const roundTrippedSimpleLens = tryParseGraphLensSimpleExpression(simpleRelationshipExpression);
  assert(roundTrippedSimpleLens);
  assert.equal(roundTrippedSimpleLens.conditions[0].field, "edge.definition");
  assert.equal(roundTrippedSimpleLens.conditions[0].value, "working-on");
  const currentTargetLens = defaultGraphLensSimpleModel("evidence");
  currentTargetLens.conditions[0] = { ...currentTargetLens.conditions[0], field: "evidence.declaredTargetPath", operator: "is", value: "$this" };
  const currentTargetExpression = buildGraphLensSimpleExpression(currentTargetLens);
  assert.equal(currentTargetExpression, "evidence.declaredTargetPath == this.path");
  assert.equal(tryParseGraphLensSimpleExpression(currentTargetExpression).conditions[0].value, "$this");

  assert.match(validateGraphLensExpression('"working-on"') ?? "", /must reference/i, "A bare string selector must not silently hide the Plex");
  assert.match(validateGraphLensExpression('edge.role == "working-on"') ?? "", /relationship property/i, "Invalid edge.role values should point users toward edge.definition");

  assert.equal(sanitizeGraphLensDefinitions([{ id: "legacy", name: "Working-on", enabled: true, scope: "edge", mode: "include", expression: '"working-on"' }])[0].expression, 'edge.definition.equals("working-on")');
  assert.equal(sanitizeGraphLensDefinitions([{ id: "legacy-role", name: "Working-on", enabled: true, scope: "edge", mode: "include", expression: 'edge.role == "working-on"' }])[0].expression, 'edge.definition.equals("working-on")');

  noteACacheForPredicate.frontmatter["Lens Status"] = "Archived";
  assert.equal(predicateEngine.matches(metadataPredicate, { node: { page: A }, center: A }), false, "Metadata-backed predicates must see cached property changes without a graph rebuild");
  delete noteACacheForPredicate.frontmatter["Lens Status"];

  const evidenceForPredicate = index.evidenceBetween("Note A.md", "Note B.md").find((item) => item.sourceKind === "frontmatter-ontology");
  assert(evidenceForPredicate);
  const evidencePredicate = compileGraphPredicate(predicateCompare(
    "eq",
    predicateProperty("evidence", "sourceKind"),
    predicateLiteral("frontmatter-ontology"),
  ));
  assert.equal(predicateEngine.matches(evidencePredicate, { node: { page: noteBForPredicate }, center: A, evidence: evidenceForPredicate }), true);

  // Named Graph Lens checkpoint: safe Bases-inspired expressions compile into the same predicate
  // AST. Include lenses union together; excludes subtract; evidence lenses can query resolution
  // decisions without traversing beyond the already materialized candidate relationship.
  assert.equal(tryParseGraphPredicateExpression('file.hasTag("taxonomy") and note["Lens Status"] == "Active"').error, undefined);
  noteACacheForPredicate.frontmatter["Lens Status"] = "Active";
  const namedLensSet = compileGraphLensDefinitions([
    { id: "project", name: "Projects", enabled: true, scope: "node", mode: "include", expression: 'node.noteType == "project"' },
    { id: "parents", name: "Parents", enabled: true, scope: "edge", mode: "include", expression: 'edge.role == "parent"' },
    { id: "meetings", name: "No meetings", enabled: true, scope: "node", mode: "exclude", expression: 'file.hasTag("meeting")' },
  ]);
  assert.equal(namedLensSet.errors.length, 0);
  assert.equal(matchesGraphLenses(predicateEngine, index, namedLensSet, { page: A, label: index.titleFor(A), center: A }), true, "Include lenses must union: project note matches the first include lens");
  assert.equal(matchesGraphLenses(predicateEngine, index, namedLensSet, {
    page: noteBForPredicate,
    label: index.titleFor(noteBForPredicate),
    center: A,
    edge: { role: "parent", sourcePath: A.path, targetPath: noteBForPredicate.path },
  }), true, "Include lenses must union: a parent relationship can match even when the note lens does not");

  const evidenceLensSet = compileGraphLensDefinitions([
    { id: "yaml", name: "YAML evidence", enabled: true, scope: "evidence", mode: "include", expression: 'evidence.sourceKind == "frontmatter-ontology" and evidence.active == true' },
  ]);
  assert.equal(evidenceLensSet.errors.length, 0);
  assert.equal(matchesGraphLenses(predicateEngine, index, evidenceLensSet, {
    page: noteBForPredicate,
    label: index.titleFor(noteBForPredicate),
    center: A,
    edge: { role: "parent", sourcePath: A.path, targetPath: noteBForPredicate.path },
  }), true, "Evidence lenses must evaluate active relationship evidence for the candidate edge");

  const styleLensSet = compileGraphLensDefinitions([
    { id: "style-project", name: "Project style", enabled: true, scope: "node", mode: "style", expression: 'node.noteType == "project"', style: { node: { borderColor: "#ffb300", strokeWidth: 3 } } },
    { id: "style-parent", name: "Parent style", enabled: true, scope: "edge", mode: "style", expression: 'edge.role == "parent"', style: { edge: { strokeColor: "#00aaff", strokeStyle: "dashed", strokeWidth: 2.5 } } },
  ]);
  assert.equal(styleLensSet.errors.length, 0);
  assert.equal(matchesGraphLenses(predicateEngine, index, styleLensSet, { page: noteBForPredicate, label: index.titleFor(noteBForPredicate), center: A, edge: { role: "child", sourcePath: A.path, targetPath: noteBForPredicate.path } }), true, "Style-only lenses must never hide candidates");
  assert.deepEqual(graphLensNodeStyle(predicateEngine, index, styleLensSet, { page: A, label: index.titleFor(A), center: A }), { borderColor: "#ffb300", strokeWidth: 3 });
  assert.deepEqual(graphLensEdgeStyle(predicateEngine, index, styleLensSet, { page: noteBForPredicate, label: index.titleFor(noteBForPredicate), center: A, edge: { role: "parent", sourcePath: A.path, targetPath: noteBForPredicate.path } }), { strokeColor: "#00aaff", strokeStyle: "dashed", strokeWidth: 2.5 });
  const sanitizedStyleLens = sanitizeGraphLensDefinitions([{ id: "safe-style", name: "Safe", enabled: true, scope: "node", mode: "style", expression: 'node.noteType == "project"', style: { node: { borderColor: "red", textColor: "#ffffff", strokeWidth: 99 } } }])[0];
  assert.equal(sanitizedStyleLens.style.node.borderColor, undefined, "Lens style colors must be constrained rather than accepting arbitrary CSS");
  assert.equal(sanitizedStyleLens.style.node.textColor, "#ffffff");
  assert.equal(sanitizedStyleLens.style.node.strokeWidth, 8, "Lens style widths should be clamped to the supported range");
  noteACacheForPredicate.frontmatter["Lens Status"] = "Archived";
  expectRole("Note A.md", "parent", "Note B.md", RelationType.DEFINED);
  expectRole("Note A.md", "parent", "https://source.com/ontology-full-line", RelationType.DEFINED);
  expectRole("Note A.md", "parent", "https://source.com/ontology-inline", RelationType.DEFINED);

  expectRole("Note A.md", "child", "Note C.md", RelationType.DEFINED);
  expectRole("Note A.md", "child", "Note F.md", RelationType.INFERRED);
  expectRole("Note A.md", "child", "Note Y.md", RelationType.INFERRED);
  expectRole("Note A.md", "child", "https://source.com/inferred", RelationType.INFERRED);
  expectRole("Note A.md", "child", "https://youtu.be/excalibrain-fixture-video", RelationType.INFERRED);

  expectRole("Note A.md", "left", "Note D.md", RelationType.DEFINED);
  expectRole("Note A.md", "left", "Note X.md", RelationType.DEFINED);
  expectRole("Note A.md", "left", "Note G.md", RelationType.DEFINED);
  expectRole("Note A.md", "left", "Note H.md", RelationType.INFERRED);
  expectRole("Note A.md", "right", "Note E.md", RelationType.DEFINED);

  assert.equal(index.get("https://source.com/ontology-full-line")?.name, "Source URL full-line ontology alias");
  assert.equal(index.get("https://source.com/ontology-inline")?.name, "Source URL inline ontology alias");
  assert.equal(index.get("https://source.com/inferred")?.name, "Source URL inferred alias");
  assert.equal(index.get("Note C.md")?.path, "Note C.md", "Markdown-link alias/%20 must resolve to canonical Note C identity");
  assert.equal(index.get("C via Markdown-link alias.md"), undefined, "Alias text must never become target identity");

  // P1–P2: deliberate K-Plex deviation. Frontmatter Parent overrides conflicting body Child,
  // while the losing body evidence survives for explainability.
  expectRole("Note X.md", "parent", "Note Y.md", RelationType.DEFINED);
  expectNoRole("Note X.md", "child", "Note Y.md");
  const explainXY = index.explainRelationship("Note X.md", "Note Y.md");
  assert(explainXY);
  assert.match(explainXY.summary, /Frontmatter ontology takes precedence/i);
  assert(explainXY.decisions.some((d) => d.active && d.evidence.sourceKind === "frontmatter-ontology" && d.evidence.declaredRole === "parent"));
  assert(explainXY.decisions.some((d) => !d.active && d.evidence.sourceKind === "inline-ontology" && d.evidence.declaredRole === "child"));
  assert(explainXY.decisions.some((d) => d.active && d.evidence.sourceKind === "obsidian-link"));
  assert.equal(explainXY.decisions.filter((d) => d.evidence.sourceKind === "obsidian-link").length, 1);

  // Exact duplicate configured labels and assignments across roles retain legacy multiplicity.
  const savedParents = [...plugin.settings.hierarchy.parents];
  const savedChildren = [...plugin.settings.hierarchy.children];
  const ontologyForXY = () => index.state.evidence.declarationsForPair("Note X.md", "Note Y.md")
    .filter(item => item.sourceKind === "frontmatter-ontology" && item.definition === "parent" && !item.mirrored);
  const countXY = ontologyForXY().length;
  try {
    plugin.settings.hierarchy.parents.push("Parent");
    plugin.settings.hierarchy.children.push("Parent");
    await index.rebuild();
    assert.equal(ontologyForXY().length, countXY + 2, "Repeated configured field and competing role must both survive compilation");
    assert(ontologyForXY().some(item => item.declaredRole === "child"));
  } finally {
    plugin.settings.hierarchy.parents = savedParents;
    plugin.settings.hierarchy.children = savedChildren;
    await index.rebuild();
  }

  // The same precedence decision must survive the inverse perspective.
  expectRole("Note Y.md", "child", "Note X.md", RelationType.DEFINED);
  expectNoRole("Note Y.md", "parent", "Note X.md");
  const explainYX = index.explainRelationship("Note Y.md", "Note X.md");
  assert(explainYX);
  assert.match(explainYX.summary, /Frontmatter ontology takes precedence/i);
  assert(explainYX.decisions.some((d) => d.active && d.evidence.sourceKind === "frontmatter-ontology" && d.evidence.declaredRole === "parent"));
  assert(explainYX.decisions.some((d) => !d.active && d.evidence.sourceKind === "inline-ontology" && d.evidence.declaredRole === "child"));

  // Same-tier explicit conflict still resolves laterally.
  expectRole("Note A.md", "left", "Note G.md", RelationType.DEFINED);
  const explainAG = index.explainRelationship("Note A.md", "Note G.md");
  assert(explainAG);
  assert.match(explainAG.summary, /Multiple active defined ontology roles conflict/i);
  assert.equal(explainAG.decisions.filter((d) => !d.active).length, 0);

  // Reciprocal ordinary links become inferred friends.
  expectRole("Note A.md", "left", "Note H.md", RelationType.INFERRED);
  expectRole("Note H.md", "left", "Note A.md", RelationType.INFERRED);

  // Previous / next inverse semantics.
  expectRole("Note F.md", "previous", "Note D.md", RelationType.DEFINED);
  expectRole("Note D.md", "next", "Note F.md", RelationType.DEFINED);
  expectRole("Note F.md", "next", "Note E.md", RelationType.DEFINED);
  expectRole("Note E.md", "previous", "Note F.md", RelationType.DEFINED);

  // Hidden is indexed and explainable, but not visible from F.
  for (const role of ["parent", "child", "left", "right", "previous", "next"]) expectNoRole("Note F.md", role, "Note X.md");
  const explainFX = index.explainRelationship("Note F.md", "Note X.md");
  assert(explainFX?.hidden);
  assert(explainFX.decisions.some((d) => d.evidence.role === "hidden" && d.active));

  // Note type compatibility: frontmatter and body Dataview field normalize #type/type identically.
  assert.equal(index.get("Note A.md")?.noteType, "project");
  assert.equal(index.get("Note B.md")?.noteType, "person");
  assert.equal(index.get("Note C.md")?.noteType, "project");

  // Legacy Markdown link inside string-valued YAML ontology remains supported.
  expectRole("Note C.md", "left", "Note D.md", RelationType.DEFINED);

  // Shared nested tags must reuse one hierarchy declaration rather than duplicating prefix edges.
  const sharedNestedCache = caches.get("Note C.md");
  const sharedNestedOriginalTags = [...(sharedNestedCache?.tags ?? [])];
  assert(sharedNestedCache);
  sharedNestedCache.tags = [...sharedNestedOriginalTags, { tag: "#taxonomy/body/leaf" }];
  await index.rebuild();
  expectRole("tag:taxonomy/body/leaf", "child", "Note A.md", RelationType.DEFINED);
  expectRole("tag:taxonomy/body/leaf", "child", "Note C.md", RelationType.DEFINED);
  assert.equal(
    index.state.evidence.declarationsForPair("tag:taxonomy", "tag:taxonomy/body")
      .filter((item) => item.sourceKind === "tag-tree").length,
    1,
    "Shared nested tags must not duplicate the parent hierarchy declaration",
  );
  assert.equal(
    index.state.evidence.declarationsForPair("tag:taxonomy/body", "tag:taxonomy/body/leaf")
      .filter((item) => item.sourceKind === "tag-tree").length,
    1,
    "Shared nested tags must not duplicate the leaf hierarchy declaration",
  );
  sharedNestedCache.tags = sharedNestedOriginalTags;
  await index.rebuild();

  // Real getAllTags can retain repeated body/frontmatter memberships; the default double dedups.
  // Preserve membership multiplicity while keeping hierarchy deduplication in ensureTagPath.
  const originalGetAllTags = obsidianTestApi.getAllTags;
  const originalFixtureMemberships = index.state.evidence.declarationsForPair("tag:fixture", "Note C.md")
    .filter((item) => item.sourceKind === "tag-tree").length;
  try {
    obsidianTestApi.getAllTags = (cache) => {
      const tags = originalGetAllTags(cache);
      return cache === sharedNestedCache ? [...tags, "#fixture"] : tags;
    };
    await index.rebuild();
    assert.equal(index.state.evidence.declarationsForPair("tag:fixture", "Note C.md")
      .filter((item) => item.sourceKind === "tag-tree").length, originalFixtureMemberships + 1,
    "Repeated host tag memberships must retain original declaration multiplicity");
  } finally {
    obsidianTestApi.getAllTags = originalGetAllTags;
    await index.rebuild();
  }

  // Tags and hierarchical tag tree.
  expectRole("tag:body-tag", "child", "Note A.md", RelationType.DEFINED);
  expectRole("tag:project", "child", "Note A.md", RelationType.DEFINED);
  expectRole("tag:project", "child", "Note C.md", RelationType.DEFINED);
  expectRole("tag:person", "child", "Note B.md", RelationType.DEFINED);
  expectRole("tag:taxonomy", "child", "tag:taxonomy/body", RelationType.DEFINED);
  expectRole("tag:taxonomy/body", "child", "tag:taxonomy/body/leaf", RelationType.DEFINED);
  expectRole("tag:taxonomy/body/leaf", "child", "Note A.md", RelationType.DEFINED);
  expectRole("tag:taxonomy", "child", "tag:taxonomy/frontmatter", RelationType.DEFINED);
  expectRole("tag:taxonomy/frontmatter", "child", "tag:taxonomy/frontmatter/leaf", RelationType.DEFINED);
  expectRole("tag:taxonomy/frontmatter/leaf", "child", "Note D.md", RelationType.DEFINED);

  // Physical folder tree, with no synthetic folder for an unresolved October daily note.
  expectRole("folder:/", "child", "folder:Daily", RelationType.DEFINED);
  expectRole("folder:Daily", "child", "folder:Daily/2026", RelationType.DEFINED);
  expectRole("folder:Daily/2026", "child", "folder:Daily/2026/09", RelationType.DEFINED);
  expectRole("folder:Daily/2026/09", "child", "Daily/2026/09/20260918.md", RelationType.DEFINED);
  expectRole("folder:Daily/2026/09", "child", "Daily/2026/09/20260919.md", RelationType.DEFINED);
  expectRole("folder:/", "child", "Note A.md", RelationType.DEFINED);
  assert.equal(index.get("folder:Daily/2026/10"), undefined);

  // Native Date properties resolve through Daily Notes settings, including virtual targets.
  for (const target of [
    "Daily/2026/09/20260918.md",
    "Daily/2026/09/20260919.md",
    "Daily/2026/09/20260920.md",
  ]) expectRole("Note B.md", "child", target, RelationType.INFERRED);
  expectRole("Note C.md", "child", "Daily/2026/10/20261001.md", RelationType.INFERRED);
  assert(index.get("Daily/2026/09/20260920.md") && !index.get("Daily/2026/09/20260920.md").file);
  assert(index.get("Daily/2026/10/20261001.md") && !index.get("Daily/2026/10/20261001.md").file);
  assert.equal(index.get("2026-09-20"), undefined, "Raw ISO Date property values are not graph filenames");
  const explainDate = index.explainRelationship("Note B.md", "Daily/2026/09/20260920.md");
  assert(explainDate?.decisions.some((d) => d.evidence.sourceKind === "date-property" && d.evidence.fieldName === "follow-up-date"));
  assert.match(explainDate?.summary ?? "", /Date property/i);

  // URL frontmatter ontology and reverse/secondary cases.
  expectRole("Note B.md", "parent", "https://source.com/frontmatter", RelationType.DEFINED);
  expectRole("Note B.md", "child", "Note C.md", RelationType.DEFINED);
  expectRole("Note C.md", "parent", "Note B.md", RelationType.DEFINED);
  expectRole("Note Y.md", "parent", "Note A.md", RelationType.INFERRED);

  // Line-level provenance is present for body ontology.
  const explainAD = index.explainRelationship("Note A.md", "Note D.md");
  assert(explainAD?.decisions.some((d) =>
    d.evidence.sourceKind === "inline-ontology" &&
    d.evidence.fieldName === "Friend" &&
    Number.isInteger(d.evidence.line) &&
    Number.isInteger(d.evidence.start) &&
    Number.isInteger(d.evidence.end) &&
    d.evidence.end > d.evidence.start
  ));

  // Assertion 33: display formatting must never alter canonical tag identity.
  settings.showFullTagName = false;
  await index.rebuild();
  assert(index.get("tag:taxonomy/body/leaf"), "Canonical hierarchical tag path must survive showFullTagName=false");
  assert.equal(index.get("tag:taxonomy/body/leaf")?.name, "leaf");
  expectRole("tag:taxonomy/body/leaf", "child", "Note A.md", RelationType.DEFINED);
  settings.showFullTagName = true;
  await index.rebuild();

  // Assertions 34–42: central-note section expansion remains runtime-only.
  assert.equal(canExpandCentralSections(index.get("Note B.md"), "Note A.md"), false, "Non-central Markdown note must not be expandable");
  assert.equal(canExpandCentralSections(index.get("https://source.com/inferred"), "https://source.com/inferred"), false, "Non-Markdown nodes must not be expandable");
  assert.equal(canExpandCentralSections(index.get("Note A.md"), "Note A.md"), true);

  const expandedA = await buildCentralSectionExpansion(plugin, index, index.get("Note A.md"));
  assert(expandedA, "Expected Note A section expansion");
  assert.equal(expandedA.sections.length, 3, "Note A fixture must create exactly three transient sections");
  assert.deepEqual(expandedA.sections.map((section) => section.page.name), [
    "Friend and challenger cases",
    "Inference and conflict cases",
    "External URL cases",
  ]);
  for (const section of expandedA.sections) {
    assert.equal(index.get(section.page.path), undefined, `Transient section leaked into persistent index: ${section.page.path}`);
    assert.equal(section.page.transient?.kind, "section");
  }

  function expandedHas(neighborhood, role, actualPath, type) {
    const list = role === "parent" ? neighborhood.parents
      : role === "child" ? neighborhood.children
      : role === "left" ? neighborhood.leftFriends
      : neighborhood.rightFriends;
    const found = list.find((item) => (item.page.transient?.actualPath ?? item.page.path) === actualPath);
    assert(found, `Expanded view missing ${role} ${actualPath}`);
    assert.equal(found.relationType, type, `Expanded ${role} ${actualPath} type`);
    return found;
  }
  function expandedLacks(neighborhood, actualPath) {
    const all = [...neighborhood.parents, ...neighborhood.children, ...neighborhood.leftFriends, ...neighborhood.rightFriends];
    assert(!all.some((item) => (item.page.transient?.actualPath ?? item.page.path) === actualPath), `Expanded center unexpectedly retains ${actualPath}`);
  }

  expandedHas(expandedA.centerNeighborhood, "parent", "Note B.md", RelationType.DEFINED);
  expandedHas(expandedA.centerNeighborhood, "parent", "https://source.com/ontology-full-line", RelationType.DEFINED);
  expandedHas(expandedA.centerNeighborhood, "child", "Note C.md", RelationType.DEFINED);
  expandedHas(expandedA.centerNeighborhood, "left", "Note H.md", RelationType.INFERRED);
  expandedHas(expandedA.centerNeighborhood, "parent", "folder:/", RelationType.DEFINED);
  expandedHas(expandedA.centerNeighborhood, "parent", "tag:body-tag", RelationType.DEFINED);
  for (const moved of ["Note D.md", "Note X.md", "Note Y.md", "Note E.md", "Note F.md", "Note G.md", "https://source.com/ontology-inline", "https://source.com/inferred", "https://youtu.be/excalibrain-fixture-video"]) expandedLacks(expandedA.centerNeighborhood, moved);

  const friends = expandedA.sections.find((section) => section.page.name === "Friend and challenger cases");
  const conflict = expandedA.sections.find((section) => section.page.name === "Inference and conflict cases");
  const urls = expandedA.sections.find((section) => section.page.name === "External URL cases");
  assert(friends && conflict && urls);
  expandedHas(friends.neighborhood, "left", "Note D.md", RelationType.DEFINED);
  expandedHas(friends.neighborhood, "left", "Note X.md", RelationType.DEFINED);
  expandedHas(friends.neighborhood, "child", "Note Y.md", RelationType.INFERRED);
  expandedHas(friends.neighborhood, "right", "Note E.md", RelationType.DEFINED);
  expandedHas(conflict.neighborhood, "child", "Note F.md", RelationType.INFERRED);
  expandedHas(conflict.neighborhood, "left", "Note G.md", RelationType.DEFINED);
  expandedHas(urls.neighborhood, "parent", "https://source.com/ontology-inline", RelationType.DEFINED);
  expandedHas(urls.neighborhood, "child", "https://source.com/inferred", RelationType.INFERRED);
  expandedHas(urls.neighborhood, "child", "https://youtu.be/excalibrain-fixture-video", RelationType.INFERRED);

  // Section-target explanations use transient pair identity but retain original body provenance.
  const dTarget = friends.neighborhood.leftFriends.find((item) => item.page.transient?.actualPath === "Note D.md");
  assert(dTarget);
  const sectionExplanation = expandedA.explanations.get(`${friends.page.path}\u0000${dTarget.page.path}`);
  assert(sectionExplanation?.decisions.some((decision) => decision.active && decision.evidence.sourceKind === "inline-ontology" && decision.evidence.fieldName === "Friend"));

  // Collapsing is a pure view-state operation: the persistent whole-note graph was never changed.
  expectRole("Note A.md", "left", "Note D.md", RelationType.DEFINED);
  expectRole("Note A.md", "child", "Note F.md", RelationType.INFERRED);
  assert.equal(index.get(friends.page.path), undefined);

  // Assertions 43–47: nested headings form a runtime outline tree. This is the structural input
  // used by the fold/unfold renderer; it must not create persistent section identities.
  const sectionTree = await buildCentralSectionExpansion(plugin, index, index.get("Section Tree.md"));
  assert(sectionTree);
  assert.equal(sectionTree.sections.length, 5);
  const rootOne = sectionTree.sections.find((section) => section.page.name === "Root One");
  const childA = sectionTree.sections.find((section) => section.page.name === "Child A");
  const grandchild = sectionTree.sections.find((section) => section.page.name === "Grandchild");
  const childB = sectionTree.sections.find((section) => section.page.name === "Child B");
  const rootTwo = sectionTree.sections.find((section) => section.page.name === "Root Two");
  assert(rootOne && childA && grandchild && childB && rootTwo);
  assert.equal(rootOne.parentId, null);
  assert.deepEqual(rootOne.childIds, [childA.id, childB.id]);
  assert.equal(childA.parentId, rootOne.id);
  assert.deepEqual(childA.childIds, [grandchild.id]);
  assert.equal(grandchild.parentId, childA.id);
  assert.equal(rootTwo.parentId, null);
  for (const section of sectionTree.sections) assert.equal(index.get(section.page.path), undefined);

  // Assertions 48–50: folding is layout/view state only. A folded outline parent becomes the
  // visible projection source for all hidden-descendant relations, while provenance still points
  // back to the exact hidden section that declared each relation.
  const allExpandedIds = new Set(sectionTree.sections.filter((section) => section.childIds.length).map((section) => section.id));
  const fullTreeScene = buildSectionExpandedScene(sectionTree, index, settings, allExpandedIds);
  const fullSectionNodes = fullTreeScene.nodes.filter((node) => node.page.transient?.kind === "section");
  assert.equal(fullSectionNodes.length, 5);
  const foldedIds = new Set([...allExpandedIds].filter((id) => id !== rootOne.id));
  const foldedTreeScene = buildSectionExpandedScene(sectionTree, index, settings, foldedIds);
  const foldedSectionNodes = foldedTreeScene.nodes.filter((node) => node.page.transient?.kind === "section");
  assert.deepEqual(foldedSectionNodes.map((node) => node.page.name).sort(), ["Root One", "Root Two"]);
  const projectedGrandchild = foldedTreeScene.edges.find((edge) =>
    edge.sourcePath === rootOne.page.path && edge.explanationSourcePath === grandchild.page.path
  );
  assert(projectedGrandchild, "Folded Root One must project Grandchild relationship evidence upward");
  assert.equal(index.get(rootOne.page.path), undefined);

  // Assertions 51–53: warm-start cache and runtime patching. Resolved relations are persisted
  // alongside evidence so IndexedDB restore does not replay the full truth table, while a normal
  // single-note metadata change can be reconciled without rebuilding the vault.
  const savedPages = index.allPages().filter((page) => !page.transient).map(persistedPageFromGraphPage);
  const warmState = createGraphState();
  for (const saved of savedPages) addPersistedPageToState(warmState, saved, app);
  assert.equal(hydratePersistedRelations(warmState, savedPages), true);
  assert.equal(warmState.pages.get("Note A.md")?.neighbours.get("Note B.md")?.isParent, true);
  // C08P exercises the production restore and startup coordinator with deterministic stalled I/O.
  // Only the external cache and watchdog clock are controlled; graph semantics remain real.
  const snapshotEvidence = [...index.state.evidence.declarations()].map(persistedDeclarationFromEvidence);
  const snapshotMeta = {
    schema: 3, generation: "test-generation", createdAt: 123,
    settingsSignature: computeIndexSettingsSignature(settings), vaultSignature: computeVaultSignature(app),
    discoveredFields: [...index.state.discoveredFields],
  };
  const realNow = Date.now, realSetTimeout = window.setTimeout, realClearTimeout = window.clearTimeout;
  let clock = realNow(), timerId = -1;
  const watchdogTimers = new Map();
  Date.now = () => clock;
  window.setTimeout = (callback, ms, ...args) => {
    if (ms !== 5000) return realSetTimeout(callback, ms, ...args);
    const id = timerId--;
    watchdogTimers.set(id, callback);
    return id;
  };
  window.clearTimeout = (id) => {
    if (id < 0) watchdogTimers.delete(id);
    else realClearTimeout(id);
  };
  const settle = async () => { for (let n = 0; n < 24; n++) await Promise.resolve(); };
  const advanceWatchdog = async (ms) => {
    clock += ms;
    const callbacks = [...watchdogTimers.values()]; watchdogTimers.clear();
    callbacks.forEach((callback) => callback());
    await settle();
  };
  const controlledIndexes = [];
  const makeRestoreIndex = () => {
    const restored = new GraphIndex({ ...plugin, settings: { ...settings, pinnedNodes: [], maxItemCount: 100 } }, app);
    restored.indexedDb.readSnapshotMeta = async () => snapshotMeta;
    restored.indexedDb.snapshotUsesChunks = () => true;
    restored.indexedDb.getPages = async (_generation, paths) => new Map(savedPages.filter((page) => paths.includes(page.path)).map((page) => [page.path, page]));
    restored.indexedDb.iterateSnapshotPages = async (_meta, onPage, current) => {
      for (const page of savedPages) { if (!current()) return false; onPage(page); }
      return current();
    };
    restored.indexedDb.iterateSnapshotEvidence = async (_meta, onEvidence, current) => {
      for (const item of snapshotEvidence) { if (!current()) return false; onEvidence(item); }
      return current();
    };
    restored.scheduleOrphanCleanup = () => {};
    restored.scheduleSnapshotPersist = () => {};
    controlledIndexes.push(restored);
    return restored;
  };
  try {
    const normal = makeRestoreIndex();
    const normalResult = await normal.restoreIndexedDbSnapshot(["Note A.md"]);
    assert.equal(normalResult.partial, true);
    assert.equal((await normal.waitForSnapshotHydration()).restored, true);
    assert.equal(normal.size, index.size);
    assert.deepEqual(normal.search("Note A").map((page) => page.path), index.search("Note A").map((page) => page.path));
    const evidenceShape = (items) => JSON.parse(JSON.stringify(items.map(({ id, ...item }) => item)));
    assert.deepEqual(evidenceShape(normal.evidenceBetween("Note A.md", "Note B.md")), evidenceShape(index.evidenceBetween("Note A.md", "Note B.md")));
    assert.equal(normal.getSnapshotHydrationDiagnostics().outcome, "complete");
    assert.equal(normal.getSnapshotHydrationDiagnostics().pages, savedPages.length);
    assert.equal(watchdogTimers.size, 0);
    const copied = normal.getSnapshotHydrationDiagnostics(); copied.outcome = "failed";
    assert.equal(normal.getSnapshotHydrationDiagnostics().outcome, "complete");

    const failed = makeRestoreIndex();
    failed.indexedDb.readSnapshotMeta = async () => null;
    assert.equal((await failed.restoreIndexedDbSnapshot()).restored, false);
    assert.equal(failed.getSnapshotHydrationDiagnostics().outcome, "failed");
    assert.equal(failed.hasPendingSnapshotHydration(), false);
    assert.equal(watchdogTimers.size, 0);

    const legacy = makeRestoreIndex();
    legacy.indexedDb.readSnapshotMeta = async () => ({ ...snapshotMeta, schema: 1 });
    assert.equal((await legacy.restoreIndexedDbSnapshot()).restored, true);
    assert.equal(legacy.size, index.size);
    assert.equal(legacy.getSnapshotHydrationDiagnostics().outcome, "complete");
    assert.deepEqual(evidenceShape(legacy.evidenceBetween("Note A.md", "Note B.md")), evidenceShape(index.evidenceBetween("Note A.md", "Note B.md")));

    const replaced = makeRestoreIndex();
    let releaseReplaced;
    replaced.indexedDb.readSnapshotMeta = () => new Promise((resolve) => { releaseReplaced = resolve; });
    const oldRestore = replaced.restoreIndexedDbSnapshot();
    await settle();
    replaced.indexedDb.readSnapshotMeta = async () => snapshotMeta;
    const newRestore = await replaced.restoreIndexedDbSnapshot();
    assert.equal((await oldRestore).restored, false);
    assert.equal(newRestore.restored, true);
    const replacementState = replaced.state, replacementDiagnostics = replaced.getSnapshotHydrationDiagnostics();
    releaseReplaced(snapshotMeta); await settle();
    assert.equal(replaced.state, replacementState);
    assert.deepEqual(replaced.getSnapshotHydrationDiagnostics(), replacementDiagnostics);
    assert.equal(watchdogTimers.size, 0);

    for (const phase of ["metadata", "preview", "pages", "evidence", "preview-search"]) {
      const stalled = makeRestoreIndex();
      let release;
      const blocked = new Promise((resolve) => { release = resolve; });
      const method = { metadata: "readSnapshotMeta", preview: "getPages", pages: "iterateSnapshotPages", evidence: "iterateSnapshotEvidence", "preview-search": "prepareSearchIndex" }[phase];
      const owner = phase === "preview-search" ? stalled : stalled.indexedDb;
      const original = owner[method];
      owner[method] = async (...args) => { await blocked; return original.apply(owner, args); };
      const start = stalled.restoreIndexedDbSnapshot(["Note A.md"]);
      await settle();
      assert.equal(stalled.getSnapshotHydrationDiagnostics().phase, phase);
      await advanceWatchdog(89999);
      assert.equal(stalled.hasPendingSnapshotHydration(), true, "Watchdog must honor the inactivity window");
      await advanceWatchdog(1);
      await start;
      assert.equal((await stalled.waitForSnapshotHydration()).restored, false);
      assert.equal(stalled.hasPendingSnapshotHydration(), false);
      assert.equal(stalled.isFullSnapshotHydrated(), false);
      assert.equal(stalled.getSnapshotHydrationDiagnostics().outcome, "timed-out");
      assert.equal(stalled.getSnapshotHydrationDiagnostics().lastActivePhase, phase);
      assert.equal(watchdogTimers.size, 0);
      owner[method] = original;
      const coordinator = new ExcaliBrainPlugin();
      coordinator.index = stalled; coordinator.app = app; coordinator.layoutReady = true;
      coordinator.metadataStabilized = true; coordinator.initialIndexComplete = false;
      coordinator.refreshBookmarkedEntryPoints = async () => {};
      let rebuilds = 0;
      coordinator.performRebuild = async () => {
        rebuilds++;
        assert(coordinator.indexBacklogReasons.has("startup:partial-restore-incomplete") || stalled.size === 0);
        await stalled.rebuild();
        coordinator.indexDirty = false; coordinator.indexBacklogReasons.clear();
      };
      await coordinator.ensureInitialIndex();
      assert.equal(rebuilds, 1, "Timeout must route startup to an authoritative build");
      assert.equal(stalled.size, index.size);
      assert.equal(coordinator.getIndexStatus().upToDate, true);
      const rebuiltState = stalled.state;
      const terminal = stalled.getSnapshotHydrationDiagnostics();
      release(); await settle();
      assert.equal(stalled.state, rebuiltState, "Released old work must not publish over the rebuilt graph");
      assert.deepEqual(stalled.getSnapshotHydrationDiagnostics(), terminal, "Late work must not rewrite terminal diagnostics");
    }

    const rejected = makeRestoreIndex();
    let rejectRead;
    rejected.indexedDb.readSnapshotMeta = () => new Promise((_resolve, reject) => { rejectRead = reject; });
    const rejectRestore = rejected.restoreIndexedDbSnapshot();
    await advanceWatchdog(90000); await rejectRestore;
    rejectRead(new Error("Late cache failure")); await settle();
    assert.equal(rejected.getSnapshotHydrationDiagnostics().outcome, "timed-out");

    const cancelled = makeRestoreIndex();
    let releaseCancelled;
    cancelled.indexedDb.iterateSnapshotPages = () => new Promise((resolve) => { releaseCancelled = resolve; });
    await cancelled.restoreIndexedDbSnapshot(["Note A.md"]);
    const waiting = cancelled.waitForSnapshotHydration();
    const unloaded = new ExcaliBrainPlugin();
    unloaded.index = cancelled; unloaded.app = app; unloaded.layoutReady = true;
    unloaded.metadataStabilized = true;
    let unloadRebuilds = 0;
    unloaded.performRebuild = async () => { unloadRebuilds++; };
    const initialization = unloaded.ensureInitialIndex();
    unloaded.onunload();
    assert.equal((await waiting).restored, false);
    await initialization;
    assert.equal(unloadRebuilds, 0, "Unload cancellation must not start a replacement build");
    assert.equal(cancelled.getSnapshotHydrationDiagnostics().outcome, "cancelled");
    assert.equal(watchdogTimers.size, 0, "Unload must release the watchdog immediately");
    releaseCancelled(true); await settle();
    assert.equal(cancelled.getSnapshotHydrationDiagnostics().outcome, "cancelled");
    console.log("C08P restore watchdog: warm equality, five stalled phases, late completion/rejection and unload PASS");
  } finally {
    controlledIndexes.forEach((item) => item.destroy());
    controlledIndexes.length = 0;
    Date.now = realNow; window.setTimeout = realSetTimeout; window.clearTimeout = realClearTimeout;
  }
  const runtimePatch = await index.patchMarkdownPaths(["Note A.md"]);
  assert.deepEqual(runtimePatch, { outcome: "patched", count: 1 });
  expectRole("Note A.md", "parent", "Note B.md", RelationType.DEFINED);

  // Assertions 54–56: a semantic edit refreshes only the changed search entry; a prose-only edit
  // can then reuse the semantic signature without mutating the graph. Incremental patching must
  // also stop discovered-field counts from growing on every save.
  const aliasesCountBefore = index.discoveredFields().find((field) => field.normalized === "aliases")?.count ?? 0;
  const noteA = files.get("Note A.md");
  const noteACache = caches.get("Note A.md");
  const noteAIdentity = index.get("Note A.md");
  noteA.stat.mtime += 1000;
  noteACache.frontmatter.aliases = "RuntimeAliasZZZ";
  const aliasPatch = await index.patchMarkdownPaths(["Note A.md"]);
  assert.deepEqual(aliasPatch, { outcome: "patched", count: 1 });
  assert.equal(index.search("runtimealiaszzz", 5)[0]?.path, "Note A.md");
  noteACache.frontmatter.title = "Preferred scalar title";
  settings.nameFields = "title, aliases";
  index.refreshDisplayNames();
  assert.equal(index.titleFor(index.get("Note A.md")), "Preferred scalar title", "Ordered name fields must accept scalar text values");
  noteACache.frontmatter.title = ["Preferred project title", "Backup title"];
  index.refreshDisplayNames();
  assert.equal(index.titleFor(index.get("Note A.md")), "Preferred project title", "Ordered name fields must accept list values and use the first non-empty item");
  assert.equal(index.search("preferred project title", 5)[0]?.path, "Note A.md", "Configured display names must also participate in search");
  delete noteACache.frontmatter.title;
  index.refreshDisplayNames();
  assert.equal(index.titleFor(index.get("Note A.md")), "RuntimeAliasZZZ", "Missing higher-priority name fields must fall back to aliases");
  settings.nameFields = "aliases";
  index.refreshDisplayNames();
  const aliasesCountAfter = index.discoveredFields().find((field) => field.normalized === "aliases")?.count ?? 0;
  assert.equal(aliasesCountAfter, aliasesCountBefore, "Incremental saves must not inflate discovered-field counts");

  const proseBefore = contents.get("Note A.md");
  contents.set("Note A.md", `${proseBefore}\nPlain prose that does not affect K-Plex semantics.`);
  noteA.stat.mtime += 1000;
  const prosePatch = await index.patchMarkdownPaths(["Note A.md"]);
  assert.deepEqual(prosePatch, { outcome: "patched", count: 1 });
  assert.equal(index.search("runtimealiaszzz", 5)[0]?.path, "Note A.md");
  assert.equal(index.get("Note A.md"), noteAIdentity, "Incremental publication must preserve canonical GraphPage identity");
  for (const source of index.state.pages.values()) {
    for (const relation of source.neighbours.values()) {
      assert.equal(relation.target, index.get(relation.target.path), `Relation target must be canonical: ${source.path} -> ${relation.target.path}`);
    }
  }

  // Assertions 57–58: arbitrary frontmatter names/values are lens data, not graph semantics.
  // A newly discovered property may update the lightweight field catalogue, but neither adding it
  // nor changing its value may emit a semantic graph update.
  let semanticEmits = 0;
  const stopCountingEmits = index.subscribe(() => { semanticEmits += 1; });
  const emitsBeforeLensProperty = semanticEmits;
  noteA.stat.mtime += 1000;
  noteACache.frontmatter["Lens Status"] = "Active";
  await index.patchMarkdownPaths(["Note A.md"]);
  assert(index.discoveredFields().some((field) => field.normalized === "lens-status"));
  assert.equal(semanticEmits, emitsBeforeLensProperty, "Adding a non-semantic property name must not emit a graph update");
  noteA.stat.mtime += 1000;
  noteACache.frontmatter["Lens Status"] = "Archived";
  await index.patchMarkdownPaths(["Note A.md"]);
  assert.equal(semanticEmits, emitsBeforeLensProperty, "Changing a non-semantic property value must not emit a graph update");
  stopCountingEmits();

  // Assertion 59: evidence storage is declaration-compact. One original fact is retained once,
  // while both source perspectives remain queryable for classification/explainability. This is a
  // deliberate iOS memory safeguard for large vaults.
  const compactEvidence = new RelationEvidenceStore();
  compactEvidence.addPair("A.md", "B.md", "parent", RelationType.DEFINED, LinkDirection.FROM, { sourceKind: "frontmatter-ontology", fieldName: "Parent" });
  assert.equal([...compactEvidence.declarations()].length, 1);
  assert.equal(compactEvidence.between("A.md", "B.md")[0]?.role, "parent");
  assert.equal(compactEvidence.between("B.md", "A.md")[0]?.role, "child");

  // Assertions 60–61: K-Plex-created pages/relationships can be published synchronously before
  // Obsidian metadata reconciliation. This is the user-facing "new node appears immediately" path.
  const immediateFile = new TFile("Immediate New.md", noteA.stat.mtime + 1000);
  files.set(immediateFile.path, immediateFile);
  contents.set(immediateFile.path, "# Immediate New\n");
  caches.set(immediateFile.path, { frontmatter: {}, tags: [], links: [] });
  const immediatePage = index.insertCreatedFile(immediateFile);
  assert.equal(index.get(immediateFile.path), immediatePage);
  assert(index.applyRelationshipEdit("Note A.md", immediateFile.path, "child", "Children"));
  expectRole("Note A.md", "child", immediateFile.path, RelationType.DEFINED);

  // Placeholder creation is optimistic too: no TFile is required until the user materializes the
  // ghost. Materialization remaps the same semantic page/evidence to the created file path.
  const placeholderPage = index.insertVirtualPage("Future Child");
  assert.equal(placeholderPage.file, null);
  assert(index.applyRelationshipEdit("Note A.md", placeholderPage.path, "child", "Children"));
  expectRole("Note A.md", "child", "Future Child", RelationType.DEFINED);
  const materializedPlaceholder = new TFile("Future Child.md", noteA.stat.mtime + 1200);
  files.set(materializedPlaceholder.path, materializedPlaceholder);
  contents.set(materializedPlaceholder.path, "");
  caches.set(materializedPlaceholder.path, { frontmatter: {}, tags: [], links: [] });
  assert(index.renameFile("Future Child", materializedPlaceholder));
  assert.equal(index.get("Future Child.md")?.file, materializedPlaceholder);
  expectRole("Note A.md", "child", "Future Child.md", RelationType.DEFINED);

  // Deleting a real Markdown note dematerializes the same GraphPage into a ghost. Inbound
  // declarations survive; declarations owned by the deleted file and its tree/tag memberships do
  // not. A ghost can disappear only after its final inbound declaration has been removed.
  const deleteTargetFile = new TFile("Delete Target.md", noteA.stat.mtime + 1300);
  files.set(deleteTargetFile.path, deleteTargetFile);
  contents.set(deleteTargetFile.path, "# Delete Target\n");
  caches.set(deleteTargetFile.path, { frontmatter: {}, tags: [], links: [] });
  const deleteTargetPage = index.insertCreatedFile(deleteTargetFile);
  expectRole("folder:/", "child", deleteTargetPage.path, RelationType.DEFINED);
  assert(index.applyRelationshipEdit("Note B.md", deleteTargetPage.path, "child", "Children"));
  assert(index.applyRelationshipEdit(deleteTargetPage.path, "Note C.md", "child", "Children"));
  const ghostAfterDelete = index.dematerializeFile(deleteTargetPage.path);
  assert.equal(ghostAfterDelete, deleteTargetPage, "File deletion must preserve GraphPage identity for an active center");
  assert.equal(ghostAfterDelete?.file, null, "Deleted Markdown must become a virtual/ghost node");
  assert.equal(index.evidenceBetween("folder:/", deleteTargetPage.path).length, 0, "Deleted Markdown must lose physical file-tree evidence immediately");
  assert.equal(index.get("folder:/")?.neighbours.has(deleteTargetPage.path), false, "A deleted ghost must not remain a child of its former physical folder");
  expectRole("Note B.md", "child", deleteTargetPage.path, RelationType.DEFINED);
  assert.equal(index.evidenceBetween(deleteTargetPage.path, "Note C.md").length, 0, "Evidence owned by the deleted file must be removed");
  assert(index.removePropertyReferenceEvidence("Note B.md", deleteTargetPage.path, true));
  assert.equal(index.removeVirtualPageIfUnreferenced(deleteTargetPage.path), true, "Unreferenced ghost should be removable after property cleanup");
  assert.equal(index.get(deleteTargetPage.path), undefined);

  // Assertions 67–68: Connection details adds/specifies ontology without replacing existing
  // frontmatter ontology evidence for the same pair, and repeating the same ontology is idempotent.
  assert(index.applyAdditionalRelationshipEdit("Note A.md", immediateFile.path, "child", "Additional ontology"));
  let additiveFields = index.evidenceBetween("Note A.md", immediateFile.path)
    .filter((item) => item.sourceKind === "frontmatter-ontology")
    .map((item) => item.fieldName);
  assert(additiveFields.includes("Children"), "Existing ontology evidence must be preserved");
  assert(additiveFields.includes("Additional ontology"), "Additional ontology evidence must be added");
  const additiveCount = additiveFields.length;
  assert(index.applyAdditionalRelationshipEdit("Note A.md", immediateFile.path, "child", "Additional ontology"));
  additiveFields = index.evidenceBetween("Note A.md", immediateFile.path)
    .filter((item) => item.sourceKind === "frontmatter-ontology")
    .map((item) => item.fieldName);
  assert.equal(additiveFields.length, additiveCount, "Adding the same ontology twice must not duplicate live evidence");

  // Assertions 62–64: image metadata stays out of GraphPage. It is resolved lazily for requested
  // visible nodes; replacement imagery takes precedence over thumbnails, and image attachments use
  // the configured compact display mode.
  noteA.stat.mtime += 1000;
  noteACache.frontmatter.thumbnail = "https://example.com/thumb.png";
  let visuals = await index.resolveNodeVisuals([index.get("Note A.md")]);
  assert.equal(visuals.get("Note A.md")?.mode, "thumbnail");
  assert.equal(visuals.get("Note A.md")?.src, "https://example.com/thumb.png");
  assert.equal("visual" in index.get("Note A.md"), false, "Node visuals must not expand the semantic GraphPage index");

  noteA.stat.mtime += 1000;
  noteACache.frontmatter["node-image"] = "https://example.com/replacement.png";
  visuals = await index.resolveNodeVisuals([index.get("Note A.md")]);
  assert.equal(visuals.get("Note A.md")?.mode, "replace");
  assert.equal(visuals.get("Note A.md")?.src, "https://example.com/replacement.png");

  const imageFile = new TFile("Visuals/Picture.jpg", noteA.stat.mtime + 1000);
  files.set(imageFile.path, imageFile);
  const imagePage = index.insertCreatedFile(imageFile);
  settings.attachmentImageDisplay = "thumbnail-label";
  visuals = await index.resolveNodeVisuals([imagePage]);
  assert.equal(visuals.get(imagePage.path)?.mode, "thumbnail");
  settings.attachmentImageDisplay = "image";
  visuals = await index.resolveNodeVisuals([imagePage]);
  assert.equal(visuals.get(imagePage.path)?.mode, "replace");

  // Assertions 65–66: thumbnail/node-image references are presentation metadata. If the image is
  // referenced only by one of those fields, Obsidian's generic resolved-link evidence must not
  // also render it as a child. A second ontology link makes it graph-semantic again.
  noteA.stat.mtime += 1000;
  noteACache.frontmatter.thumbnail = `[[${imageFile.path}]]`;
  resolvedLinks["Note A.md"][imageFile.path] = 1;
  await index.patchMarkdownPaths(["Note A.md"]);
  expectNoRole("Note A.md", "child", imageFile.path);

  noteA.stat.mtime += 1000;
  const existingChildren = noteACache.frontmatter.Child;
  noteACache.frontmatter.Child = Array.isArray(existingChildren)
    ? [...existingChildren, `[[${imageFile.path}]]`]
    : [existingChildren, `[[${imageFile.path}]]`].filter(Boolean);
  resolvedLinks["Note A.md"][imageFile.path] = 2;
  await index.patchMarkdownPaths(["Note A.md"]);
  expectRole("Note A.md", "child", imageFile.path, RelationType.DEFINED);

  // Performance regression P3: malformed pasted text with thousands of unmatched delimiters must
  // retain parser semantics without the historical repeated suffix scan. Complexity is benchmarked
  // separately; the fixture deliberately avoids a brittle wall-clock threshold.
  const malformedRound = parseBodyMetadataCore("(".repeat(64 * 1024));
  const malformedSquare = parseBodyMetadataCore("[a".repeat(32 * 1024));
  assert.deepEqual(malformedRound, { inlineFields: {}, inlineFieldOccurrences: [], urls: [] });
  assert.deepEqual(malformedSquare, { inlineFields: {}, inlineFieldOccurrences: [], urls: [] });

  // P8: malformed Markdown-label text remains linear even when a real URL is present. Compare
  // worker-core and cooperative fallback grammar, then verify the fallback can be cancelled while
  // it is still scanning one long physical line.
  const malformedUrlInput = `${"[a".repeat(64 * 1024)} https://example.com/path`;
  const malformedUrlCore = parseBodyMetadataCore(malformedUrlInput);
  assert.deepEqual(malformedUrlCore.urls, [{ url: "https://example.com/path", line: 1 }]);
  assert.deepEqual(await parseBodyMetadataCooperative(malformedUrlInput), malformedUrlCore);

  const samples = [4_000, 8_000, 16_000, 32_000].map((size) => {
    const input = `${"[a".repeat(size / 2)} https://example.com`;
    const values = [];
    for (let i = 0; i < 5; i += 1) {
      const started = performance.now();
      parseBodyMetadataCore(input);
      values.push(performance.now() - started);
    }
    values.sort((a, b) => a - b);
    return values[2];
  });
  assert(samples.at(-1) <= samples[0] * 12 + 5, `Malformed URL-label parser scaling regressed: ${samples.join(", ")}`);

  // P13: cooperative checkpoints must exist in the expensive *post line-discovery* phases too.
  // A huge budget prevents timer yields, while the phase-aware cancellation predicate proves the
  // inline-field and list-marker whitespace loops themselves are observing cancellation.
  let inlinePhaseChecks = 0;
  await assert.rejects(
    parseBodyMetadataCooperative(`${"(".repeat(512 * 1024)}x:: y)`, (phase) => {
      if (phase !== "inline-field-scan") return true;
      inlinePhaseChecks += 1;
      return inlinePhaseChecks < 3;
    }, 60_000),
    /cancelled/,
  );
  assert(inlinePhaseChecks >= 3, "Inline-field scan must expose cooperative cancellation checkpoints");

  let whitespacePhaseChecks = 0;
  await assert.rejects(
    parseBodyMetadataCooperative(`- ${" ".repeat(512 * 1024)}Parent:: [[A]]`, (phase) => {
      if (phase !== "list-whitespace-scan") return true;
      whitespacePhaseChecks += 1;
      return whitespacePhaseChecks < 3;
    }, 60_000),
    /cancelled/,
  );
  assert(whitespacePhaseChecks >= 3, "List-marker whitespace scan must expose cooperative cancellation checkpoints");

  const maxTimerGapDuring = async (work) => {
    let running = true;
    let maxGap = 0;
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      maxGap = Math.max(maxGap, now - last);
      last = now;
      if (running) window.setTimeout(tick, 0);
    };
    window.setTimeout(tick, 0);
    await work();
    running = false;
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    return maxGap;
  };
  const inlineGap = await maxTimerGapDuring(() => parseBodyMetadataCooperative(`${"(".repeat(4 * 1024 * 1024)}x:: y)`, () => true, 4));
  const whitespaceGap = await maxTimerGapDuring(() => parseBodyMetadataCooperative(`- ${" ".repeat(4 * 1024 * 1024)}Parent:: [[A]]`, () => true, 4));
  assert(inlineGap < 45, `Inline-field cooperative parser blocked timers for ${inlineGap.toFixed(1)} ms`);
  assert(whitespaceGap < 45, `List-whitespace cooperative parser blocked timers for ${whitespaceGap.toFixed(1)} ms`);

  // P14: worker/core and cooperative fallback deliberately share one malformed-input grammar.
  // Incomplete schemes are not URLs; malformed empty list-field keys are ignored.
  const grammarSamples = [
    legacyParserFixture,
    "https://",
    "http://)",
    "HTTPS://",
    "- :: [[A]]",
    "- Parent:: [[A]]",
    "+ Friend:: [[C]]",
    "* Child:: [[B]]\r\nhttps://example.com/path",
    "\\(Parent:: [[A]]) https://example.com",
    "\\[Parent:: [[A]]] https://example.com",
    "(Parent:: [[A]])\n[Child:: [[B]]]",
    "(outer (Parent:: [[A]]))",
    "(Parent:: (Child:: [[A]]))",
    "[outer [Child:: [[B]]]]",
    "[Parent:: (Child:: [[B]])]",
    "((Parent:: [[A]]))",
    "`Parent:: [[ignored]]`\nParent:: [[A]]",
    "``Parent:: [[ignored]]``\r\nChild:: [[B]]",
    "[label](https://example.com/path).",
    "[ label ](https://example.com/path).",
    "[label](https://)",
    "[label](http://)",
    "Parent:: [[A]]\nFriend:: [[B]]\n",
    "Parent:: [[A]]\r\nFriend:: [[B]]\r\n",
    "---\r\ntags: [x]\r\n---\r\nParent:: [[A]]\r\n",
    "<!-- Parent:: [[ignored]] --> Child:: [[B]]",
  ];
  assert.deepEqual(parseBodyMetadataCore("https://").urls, [], "Incomplete https scheme is not a URL node");
  assert.deepEqual(parseBodyMetadataCore("http://)").urls, [], "A scheme followed immediately by a Markdown closer is incomplete");
  assert.equal(parseBodyMetadataCore("- :: [[A]]").inlineFieldOccurrences.length, 0, "A list marker without a field key is not a Dataview field");
  for (const sample of grammarSamples) {
    assert.deepEqual(await parseBodyMetadataCooperative(sample), parseBodyMetadataCore(sample), `Parser grammar differs for ${JSON.stringify(sample)}`);
  }

  const fallbackParser = new MetadataParser();
  for (const sample of grammarSamples) {
    assert.deepEqual(await fallbackParser.parse(sample), parseBodyMetadataCore(sample), `Fallback parser differs for ${JSON.stringify(sample)}`);
  }
  const cancellableInput = `${"[a".repeat(2 * 1024 * 1024)} https://example.com/cancel`;
  const fallbackPromise = fallbackParser.parse(cancellableInput);
  window.setTimeout(() => fallbackParser.cancelPending(), 0);
  await assert.rejects(fallbackPromise, MetadataParseCancelledError);
  fallbackParser.destroy();

  const originalWorker = globalThis.Worker;
  class FakeWorker {
    constructor() { this.onmessage = null; this.onerror = null; this.terminated = false; }
    postMessage(message) {
      const result = parseBodyMetadataCore(message.content);
      window.setTimeout(() => {
        if (!this.terminated) this.onmessage?.({ data: { id: message.id, ok: true, result } });
      }, 0);
    }
    terminate() { this.terminated = true; }
  }
  globalThis.Worker = FakeWorker;
  const workerParser = new MetadataParser();
  assert.deepEqual(await workerParser.parse(malformedUrlInput), malformedUrlCore);
  for (const sample of grammarSamples) {
    assert.deepEqual(await workerParser.parse(sample), parseBodyMetadataCore(sample), `Worker parser differs for ${JSON.stringify(sample)}`);
  }
  const workerCancelPromise = workerParser.parse("Parent:: [[cancel-worker]]");
  workerParser.cancelPending();
  await assert.rejects(workerCancelPromise, MetadataParseCancelledError, "Worker cancellation must reject pending parses with the production cancellation error");
  workerParser.destroy();
  if (originalWorker === undefined) delete globalThis.Worker; else globalThis.Worker = originalWorker;

  // Performance/correctness regression P4: url-origin is derived shared evidence. Repeated semantic
  // patches of the declaring note must neither accumulate duplicate declarations nor leave the
  // origin pair unresolved.
  const repeatUrl = "https://repeat.example/path";
  const repeatOrigin = "https://repeat.example";
  contents.set("Note A.md", `${contents.get("Note A.md")}\n${repeatUrl}\n`);
  for (let i = 0; i < 3; i += 1) {
    noteA.stat.mtime += 1000;
    noteACache.frontmatter.aliases = `RuntimeAliasRepeat${i}`;
    const repeatedPatch = await index.patchMarkdownPaths(["Note A.md"]);
    assert.deepEqual(repeatedPatch, { outcome: "patched", count: 1 });
    const origins = index.evidenceBetween(repeatOrigin, repeatUrl).filter((item) => item.sourceKind === "url-origin");
    assert.equal(origins.length, 1, "Derived URL origin evidence must remain idempotent across patches");
    assert(index.get(repeatOrigin)?.neighbours.has(repeatUrl), "Derived URL origin relationship must be resolved after a patch");
  }

  // P5: shared URL ownership survives one referrer disappearing, then releases both derived URL
  // nodes (and their search entries) after the final referrer disappears.
  const noteB = files.get("Note B.md");
  assert(noteB);
  contents.set("Note B.md", `${contents.get("Note B.md")}\n${repeatUrl}\n`);
  noteB.stat.mtime += 1000;
  assert.deepEqual(await index.patchMarkdownPaths(["Note B.md"]), { outcome: "patched", count: 1 });
  expectRole(repeatUrl, "parent", "Note A.md", RelationType.INFERRED);
  expectRole(repeatUrl, "parent", "Note B.md", RelationType.INFERRED);
  const sharedUrlParents = new Set(index.getNeighborhood(repeatUrl).parents.map((item) => item.page.path));
  assert(sharedUrlParents.has("Note A.md") && sharedUrlParents.has("Note B.md"), "A centered shared URL must expose both referrers in its neighborhood");
  contents.set("Note A.md", contents.get("Note A.md").replace(`\n${repeatUrl}\n`, "\n"));
  noteA.stat.mtime += 1000;
  assert.deepEqual(await index.patchMarkdownPaths(["Note A.md"]), { outcome: "patched", count: 1 });
  assert.equal(index.evidenceBetween(repeatOrigin, repeatUrl).filter((item) => item.sourceKind === "url-origin").length, 1);
  assert(index.get(repeatUrl), "Shared URL node must survive while another note still references it");

  contents.set("Note B.md", contents.get("Note B.md").replace(`\n${repeatUrl}\n`, "\n"));
  noteB.stat.mtime += 1000;
  assert.deepEqual(await index.patchMarkdownPaths(["Note B.md"]), { outcome: "patched", count: 1 });
  assert.equal(index.get(repeatUrl), undefined, "Unreferenced derived URL node must be released");
  assert.equal(index.get(repeatOrigin), undefined, "Unreferenced derived URL origin must be released");
  assert.equal(index.search("repeat.example").some((page) => page.path === repeatUrl || page.path === repeatOrigin), false, "Released URL nodes must leave the incremental search table");

  // P7: folder/tag visibility is presentation-only. The semantic snapshot signature must not
  // change, and a graph built while both classes are hidden must still contain their structural
  // nodes so revealing them is immediate and requires no rebuild.
  const visibilitySignature = computeIndexSettingsSignature(settings);
  const previousFolderVisibility = settings.showFolderNodes;
  const previousTagVisibility = settings.showTagNodes;
  const previousSiblingRelativeSize = settings.siblingRelativeSize;
  const previousCrossLinkOpacity = settings.crossLinkOpacity;
  settings.showFolderNodes = false;
  settings.showTagNodes = false;
  settings.siblingRelativeSize = 30;
  settings.crossLinkOpacity = 40;
  assert.equal(computeIndexSettingsSignature(settings), visibilitySignature, "Presentation-only visibility/sizing/opacity settings must not invalidate the semantic index");
  const hiddenStructuralIndex = new GraphIndex(plugin, app);
  try {
    assert.equal(await hiddenStructuralIndex.rebuild(), true);
    const hiddenFolder = hiddenStructuralIndex.get("folder:Daily");
    const hiddenTag = hiddenStructuralIndex.get("tag:project");
    assert(hiddenFolder, "Folder topology must be maintained while folder nodes are hidden");
    assert(hiddenTag, "Tag topology must be maintained while tag nodes are hidden");
    assert.equal(hiddenStructuralIndex.isVisiblePage(hiddenFolder), false);
    assert.equal(hiddenStructuralIndex.isVisiblePage(hiddenTag), false);

    settings.showFolderNodes = true;
    settings.showTagNodes = true;
    assert.equal(hiddenStructuralIndex.isVisiblePage(hiddenFolder), true);
    assert.equal(hiddenStructuralIndex.isVisiblePage(hiddenTag), true);
    assert(
      hiddenStructuralIndex.neighbours(hiddenStructuralIndex.get("folder:/"), "child").some((item) => item.page.path === "folder:Daily"),
      "Folder relationships must become visible immediately after the presentation toggle",
    );
    assert(
      hiddenStructuralIndex.neighbours(hiddenTag, "child").some((item) => item.page.path === "Note A.md" || item.page.path === "Note C.md"),
      "Tag relationships must become visible immediately after the presentation toggle",
    );
  } finally {
    hiddenStructuralIndex.destroy();
    settings.showFolderNodes = previousFolderVisibility;
    settings.showTagNodes = previousTagVisibility;
    settings.siblingRelativeSize = previousSiblingRelativeSize;
    settings.crossLinkOpacity = previousCrossLinkOpacity;
  }

  // P9/P16: expanded-section parsing is cached independently from presentation visibility. The
  // cached projection must derive siblings from the current structural graph, not from an earlier
  // filtered/truncated sibling list. Compare every projection to a fresh expansion while proving
  // the projection itself performs zero Markdown reads and preserves the caller-owned fold set.
  const expandedForVisibility = await buildCentralSectionExpansion(plugin, index, index.get("Note A.md"));
  assert(expandedForVisibility);
  const priorFolderToggle = settings.showFolderNodes;
  const priorTagToggle = settings.showTagNodes;
  const priorSiblingToggle = settings.renderSiblings;
  const expandedIdsForVisibility = new Set(expandedForVisibility.sections.filter((section) => section.childIds.length).map((section) => section.id));
  const originalExpandedIds = [...expandedIdsForVisibility].sort();
  let projectionReads = 0;
  const originalCachedReadForProjection = app.vault.cachedRead;
  app.vault.cachedRead = async (file) => { projectionReads += 1; return originalCachedReadForProjection(file); };
  const siblingPaths = (expansion) => expansion.centerNeighborhood.siblings.map((item) => item.page.path).sort();
  try {
    settings.renderSiblings = true;
    settings.showFolderNodes = false;
    settings.showTagNodes = false;
    const hiddenReadsBefore = projectionReads;
    const hiddenProjection = projectCentralSectionExpansion(plugin, index, expandedForVisibility);
    assert.equal(projectionReads, hiddenReadsBefore, "Hidden visibility projection must not reread Markdown");
    const hiddenScene = buildSectionExpandedScene(hiddenProjection, index, settings, expandedIdsForVisibility);
    assert.equal(hiddenScene.nodes.some((node) => node.page.isFolder || node.page.isTag), false);
    const hiddenFresh = await buildCentralSectionExpansion(plugin, index, index.get("Note A.md"));
    assert(hiddenFresh);
    assert.deepEqual(siblingPaths(hiddenProjection), siblingPaths(hiddenFresh), "Cached hidden sibling projection must match a fresh expansion");

    settings.showFolderNodes = true;
    settings.showTagNodes = true;
    const shownReadsBefore = projectionReads;
    const shownProjection = projectCentralSectionExpansion(plugin, index, expandedForVisibility);
    assert.equal(projectionReads, shownReadsBefore, "Shown visibility projection must not reread Markdown");
    const shownScene = buildSectionExpandedScene(shownProjection, index, settings, expandedIdsForVisibility);
    assert(shownScene.nodes.some((node) => node.page.isFolder), "Folder node must reappear in expanded projection");
    assert(shownScene.nodes.some((node) => node.page.isTag), "Tag node must reappear in expanded projection");
    const shownFresh = await buildCentralSectionExpansion(plugin, index, index.get("Note A.md"));
    assert(shownFresh);
    assert.deepEqual(siblingPaths(shownProjection), siblingPaths(shownFresh), "Cached shown sibling projection must include newly eligible siblings");

    settings.showFolderNodes = false;
    settings.showTagNodes = true;
    const tagOnlyReadsBefore = projectionReads;
    const tagOnlyProjection = projectCentralSectionExpansion(plugin, index, expandedForVisibility);
    assert.equal(projectionReads, tagOnlyReadsBefore);
    const tagOnlyFresh = await buildCentralSectionExpansion(plugin, index, index.get("Note A.md"));
    assert(tagOnlyFresh);
    assert.deepEqual(siblingPaths(tagOnlyProjection), siblingPaths(tagOnlyFresh), "Tag-only sibling projection must match fresh structural derivation");

    settings.showFolderNodes = true;
    settings.showTagNodes = false;
    const folderOnlyReadsBefore = projectionReads;
    const folderOnlyProjection = projectCentralSectionExpansion(plugin, index, expandedForVisibility);
    assert.equal(projectionReads, folderOnlyReadsBefore);
    const folderOnlyFresh = await buildCentralSectionExpansion(plugin, index, index.get("Note A.md"));
    assert(folderOnlyFresh);
    assert.deepEqual(siblingPaths(folderOnlyProjection), siblingPaths(folderOnlyFresh), "Folder-only sibling projection must match fresh structural derivation");

    settings.renderSiblings = false;
    const siblingOffReadsBefore = projectionReads;
    const siblingOffProjection = projectCentralSectionExpansion(plugin, index, expandedForVisibility);
    assert.equal(projectionReads, siblingOffReadsBefore, "Sibling presentation toggle must not reread Markdown");
    assert.deepEqual(siblingPaths(siblingOffProjection), [], "Sibling-off projection must remove cached siblings immediately");
    assert.deepEqual([...expandedIdsForVisibility].sort(), originalExpandedIds, "Visibility reprojection must preserve section fold state owned by the view");
  } finally {
    app.vault.cachedRead = originalCachedReadForProjection;
    settings.showFolderNodes = priorFolderToggle;
    settings.showTagNodes = priorTagToggle;
    settings.renderSiblings = priorSiblingToggle;
  }

  // Performance/correctness regression P6: with tag nodes enabled, a local tag edit stays on the
  // incremental path. New hierarchy edges are resolved immediately and unreachable old tag nodes
  // are pruned. Compare the affected relationships to a clean rebuild over the same metadata.
  contents.set("Note A.md", contents.get("Note A.md").replaceAll("#body-tag", "#runtime/perf"));
  noteACache.tags = noteACache.tags.filter((item) => item.tag !== "#body-tag");
  if (!noteACache.tags.some((item) => item.tag === "#runtime/perf")) noteACache.tags.push({ tag: "#runtime/perf" });
  noteA.stat.mtime += 1000;
  const tagPatch = await index.patchMarkdownPaths(["Note A.md"]);
  assert.deepEqual(tagPatch, { outcome: "patched", count: 1 });
  expectRole("tag:runtime", "child", "tag:runtime/perf", RelationType.DEFINED);
  expectRole("tag:runtime/perf", "child", "Note A.md", RelationType.DEFINED);
  assert.equal(index.get("tag:body-tag"), undefined, "Unreferenced tag nodes must be pruned after an incremental edit");

  const cleanIndex = new GraphIndex(plugin, app);
  try {
    assert.equal(await cleanIndex.rebuild(), true);
    for (const [sourcePath, targetPath] of [["tag:runtime", "tag:runtime/perf"], ["tag:runtime/perf", "Note A.md"]]) {
      assert.deepEqual(canonicalPair(index, sourcePath, targetPath), canonicalPair(cleanIndex, sourcePath, targetPath),
        `Incremental relation and provenance must match a full rebuild for ${sourcePath} -> ${targetPath}`);
    }
  } finally {
    cleanIndex.destroy();
  }

  // P10: cancellation after file A commits but while file B is awaiting input preserves A's search
  // publication, starts no snapshot, and a retry completes the retained backlog without repair build.
  index.cancelPendingPersistence();
  const originalCachedReadForCancel = app.vault.cachedRead;
  const cancelAliasA = "CancelledBatchAliasA";
  const cancelAliasB = "CancelledBatchAliasB";
  noteACache.frontmatter.aliases = cancelAliasA;
  const noteBCache = caches.get("Note B.md");
  noteBCache.frontmatter.aliases = cancelAliasB;
  noteA.stat.mtime += 1000;
  noteB.stat.mtime += 1000;
  let releaseB;
  let sawB;
  const bStarted = new Promise((resolve) => { sawB = resolve; });
  const bGate = new Promise((resolve) => { releaseB = resolve; });
  app.vault.cachedRead = async (file) => {
    if (file.path === "Note B.md") { sawB(); await bGate; }
    return contents.get(file.path) ?? "";
  };
  const cancelledBatchPromise = index.patchMarkdownPaths(["Note A.md", "Note B.md"]);
  await bStarted;
  index.cancelRebuild();
  releaseB();
  const cancelledBatch = await cancelledBatchPromise;
  assert.equal(cancelledBatch.outcome, "cancelled");
  assert.equal(cancelledBatch.count, 1);
  assert.deepEqual(cancelledBatch.pendingPaths, ["Note B.md"], "Cancellation must retain only uncommitted files");
  assert.equal(index.search(cancelAliasA.toLowerCase(), 5)[0]?.path, "Note A.md", "Committed file A search entry must survive cancellation");
  assert.equal(index.snapshotPersistTimer ?? null, null, "Cancelled patch must not schedule a snapshot");
  app.vault.cachedRead = originalCachedReadForCancel;
  assert.deepEqual(await index.patchMarkdownPaths(["Note A.md", "Note B.md"]), { outcome: "patched", count: 2 });
  assert.equal(index.search(cancelAliasA.toLowerCase(), 5)[0]?.path, "Note A.md");
  assert.equal(index.search(cancelAliasB.toLowerCase(), 5)[0]?.path, "Note B.md");

  // P11: K-Plex-created files get complete folder ancestry immediately, even while folders are
  // hidden. Revealing folders is presentation-only and matches a clean authoritative build.
  const createdFolder = ensureFolder("Created/Sub");
  const managedFile = new TFile("Created/Sub/Managed.md", noteA.stat.mtime + 5000);
  managedFile.parent = createdFolder;
  createdFolder.children.push(managedFile);
  files.set(managedFile.path, managedFile);
  contents.set(managedFile.path, "# Managed\n");
  caches.set(managedFile.path, { frontmatter: {}, tags: [], links: [] });
  resolvedLinks[managedFile.path] = {};
  unresolvedLinks[managedFile.path] = {};
  const oldFolderVisibilityForCreate = settings.showFolderNodes;
  settings.showFolderNodes = false;
  index.insertCreatedFile(managedFile);
  assert(index.evidenceBetween("folder:Created/Sub", managedFile.path).some((item) => item.sourceKind === "file-tree"));
  assert(index.evidenceBetween("folder:Created", "folder:Created/Sub").some((item) => item.sourceKind === "file-tree"));
  assert(index.evidenceBetween("folder:/", "folder:Created").some((item) => item.sourceKind === "file-tree"));
  assert.deepEqual(await index.patchMarkdownPaths([managedFile.path]), { outcome: "patched", count: 1 });
  settings.showFolderNodes = true;
  assert(index.neighbours(index.get("folder:Created/Sub"), "child").some((item) => item.page.path === managedFile.path));
  const cleanCreatedIndex = new GraphIndex(plugin, app);
  try {
    assert.equal(await cleanCreatedIndex.rebuild(), true);
    assert.equal(
      index.evidenceBetween("folder:Created/Sub", managedFile.path).filter((item) => item.sourceKind === "file-tree").length,
      cleanCreatedIndex.evidenceBetween("folder:Created/Sub", managedFile.path).filter((item) => item.sourceKind === "file-tree").length,
    );
  } finally {
    cleanCreatedIndex.destroy();
    settings.showFolderNodes = oldFolderVisibilityForCreate;
  }

  // P15: post-parse graph work for a URL-heavy note is staged and cooperatively sliced. Prime the
  // parsed-body hot cache so this measures signature/evidence/URL/resolution/commit work rather
  // than the parser itself. Cancelling after parsing must publish nothing; retry remains searchable.
  const originalManagedContent = contents.get(managedFile.path);
  const originalManagedSize = managedFile.stat.size;
  const managedPageIdentity = index.get(managedFile.path);
  const urlHeavyBody = Array.from({ length: 10_000 }, (_, i) => `https://perf-${i}.example/path/${i}`).join("\n");
  const urlHeavyParsed = parseBodyMetadataCore(urlHeavyBody);
  managedFile.stat.mtime += 1000;
  managedFile.stat.size = urlHeavyBody.length;
  contents.set(managedFile.path, urlHeavyBody);
  index.fieldCache.set(managedFile.path, { mtime: managedFile.stat.mtime, body: urlHeavyParsed });
  const graphPatchGap = await maxTimerGapDuring(async () => {
    assert.deepEqual(await index.patchMarkdownPaths([managedFile.path]), { outcome: "patched", count: 1 });
  });
  assert(graphPatchGap < 50, `URL-heavy post-parse graph patch blocked timers for ${graphPatchGap.toFixed(1)} ms`);
  assert(index.get("https://perf-9999.example/path/9999"), "URL-heavy staged patch must publish all URL nodes");
  assert.equal(index.get(managedFile.path), managedPageIdentity, "Bulk publication must preserve existing GraphPage identity");
  for (const source of index.state.pages.values()) {
    for (const relation of source.neighbours.values()) {
      assert.equal(relation.target, index.get(relation.target.path), `Bulk relation target must be canonical: ${source.path} -> ${relation.target.path}`);
    }
  }

  const cancelUrlBody = `${urlHeavyBody}\nhttps://cancel-after-parse.example/path`;
  const cancelUrlParsed = parseBodyMetadataCore(cancelUrlBody);
  managedFile.stat.mtime += 1000;
  managedFile.stat.size = cancelUrlBody.length;
  contents.set(managedFile.path, cancelUrlBody);
  index.fieldCache.set(managedFile.path, { mtime: managedFile.stat.mtime, body: cancelUrlParsed });
  const cancelAfterParsePromise = index.patchMarkdownPaths([managedFile.path]);
  window.setTimeout(() => index.cancelRebuild(), 0);
  const cancelAfterParse = await cancelAfterParsePromise;
  assert.equal(cancelAfterParse.outcome, "cancelled");
  assert.equal(index.get("https://cancel-after-parse.example/path"), undefined, "Cancelled staged work must not leak into the published graph");
  assert.equal(index.search("cancel-after-parse", 5).length, 0, "Cancelled staged work must not leak into search");
  assert.deepEqual(await index.patchMarkdownPaths([managedFile.path]), { outcome: "patched", count: 1 });
  assert(index.search("cancel-after-parse", 5).some((page) => page.path === "https://cancel-after-parse.example/path"), "Retry must publish graph and search at one commit boundary");

  managedFile.stat.mtime += 1000;
  managedFile.stat.size = originalManagedSize;
  contents.set(managedFile.path, originalManagedContent);
  index.fieldCache.set(managedFile.path, { mtime: managedFile.stat.mtime, body: parseBodyMetadataCore(originalManagedContent) });
  assert.deepEqual(await index.patchMarkdownPaths([managedFile.path]), { outcome: "patched", count: 1 });

  // P17: copy-on-write publication must remain bounded across a long editing session. Alternate
  // URL-heavy add/remove patches so page, lowercase-path and evidence overlays all cross their
  // compaction limit, then verify no-op saves do not create evidence layers at all.
  for (let cycle = 0; cycle < 5; cycle += 1) {
    const boundedBody = Array.from({ length: 600 }, (_, i) => `https://bounded-${cycle}.example/path/${i}`).join("\n");
    managedFile.stat.mtime += 1000;
    managedFile.stat.size = boundedBody.length;
    contents.set(managedFile.path, boundedBody);
    index.fieldCache.set(managedFile.path, { mtime: managedFile.stat.mtime, body: parseBodyMetadataCore(boundedBody) });
    assert.deepEqual(await index.patchMarkdownPaths([managedFile.path]), { outcome: "patched", count: 1 });

    managedFile.stat.mtime += 1000;
    managedFile.stat.size = originalManagedSize;
    contents.set(managedFile.path, originalManagedContent);
    index.fieldCache.set(managedFile.path, { mtime: managedFile.stat.mtime, body: parseBodyMetadataCore(originalManagedContent) });
    assert.deepEqual(await index.patchMarkdownPaths([managedFile.path]), { outcome: "patched", count: 1 });
  }
  assert((index.state.pages.depth ?? 0) <= 8, "Published page overlay depth must remain bounded");
  assert(index.state.evidence.depth <= 8, "Published evidence overlay depth must remain bounded");
  const evidenceDepthBeforeNoops = index.state.evidence.depth;
  for (let i = 0; i < 12; i += 1) {
    managedFile.stat.mtime += 1000;
    assert.deepEqual(await index.patchMarkdownPaths([managedFile.path]), { outcome: "patched", count: 1 });
  }
  assert.equal(index.state.evidence.depth, evidenceDepthBeforeNoops, "Semantic no-op saves must not retain evidence layers");
  assert.equal(index.get(managedFile.path), managedPageIdentity, "Compaction must preserve canonical GraphPage identity");
  for (const source of index.state.pages.values()) {
    for (const relation of source.neighbours.values()) {
      assert.equal(relation.target, index.get(relation.target.path), `Compacted relation target must be canonical: ${source.path} -> ${relation.target.path}`);
    }
  }

  // P12: exercise the production rebuild coordinator. If the last visible K-Plex surface closes
  // while an incremental patch is awaiting work, cancellation must not fall through to a hidden
  // full rebuild. Reopening resumes the retained backlog exactly once.
  const coordinator = new ExcaliBrainPlugin();
  let coordinatorVisible = true;
  let coordinatorFullBuilds = 0;
  const coordinatorPatchCalls = [];
  let releaseCoordinatorPatch;
  let signalCoordinatorPatch;
  const coordinatorPatchStarted = new Promise((resolve) => { signalCoordinatorPatch = resolve; });
  const coordinatorPatchGate = new Promise((resolve) => { releaseCoordinatorPatch = resolve; });
  coordinator.index = {
    size: 1,
    patchMarkdownPaths: async (paths) => {
      coordinatorPatchCalls.push([...paths]);
      if (coordinatorPatchCalls.length === 1) {
        signalCoordinatorPatch();
        await coordinatorPatchGate;
        return { outcome: "cancelled", count: 0, pendingPaths: [...paths] };
      }
      return { outcome: "patched", count: paths.length };
    },
    rebuild: async () => { coordinatorFullBuilds += 1; return true; },
  };
  coordinator.hasVisibleKplexSurface = () => coordinatorVisible;
  coordinator.refreshBookmarkedEntryPoints = async () => {};
  coordinator.notifyIndexStatus = () => {};
  coordinator.initialIndexComplete = true;
  coordinator.indexDirty = true;
  coordinator.indexDirtyRevision = 1;
  coordinator.indexBacklogReasons.add("metadata:changed");
  coordinator.dirtyMarkdownPaths.add("Note A.md");
  const hiddenCancellation = coordinator.performRebuild(false, false, "metadata:changed", false);
  await coordinatorPatchStarted;
  coordinatorVisible = false;
  releaseCoordinatorPatch();
  await hiddenCancellation;
  assert.equal(coordinatorFullBuilds, 0, "Hidden cancellation must not start a fallback full rebuild");
  assert.equal(coordinator.indexDirty, true);
  assert.deepEqual([...coordinator.dirtyMarkdownPaths], ["Note A.md"], "Uncommitted path must remain queued while hidden");
  coordinatorVisible = true;
  await coordinator.performRebuild(false, false, "view-open", false);
  assert.equal(coordinatorFullBuilds, 0);
  assert.equal(coordinatorPatchCalls.length, 2, "Revealing K-Plex must resume the backlog exactly once");
  assert.equal(coordinator.indexDirty, false);
  assert.equal(coordinator.dirtyMarkdownPaths.size, 0);

  // Rename performance regression: a TFile rename must remap the already-published semantic graph
  // in place. No Markdown is reparsed and all evidence/search/relationship paths follow the same
  // TFile object to its new basename.
  const renamePage = index.get("Note A.md");
  assert(renamePage?.file);
  const renameFile = renamePage.file;
  renameFile.path = "Note A Renamed.md";
  renameFile.name = "Note A Renamed.md";
  renameFile.basename = "Note A Renamed";
  const sizeBeforeRename = index.size;
  assert.equal(index.renameFile("Note A.md", renameFile), true);
  assert.equal(index.size, sizeBeforeRename, "A basename-only rename must not rebuild or change graph cardinality");
  assert.equal(index.get("Note A.md"), undefined);
  assert.equal(index.get("Note A Renamed.md"), renamePage, "GraphPage identity must survive a TFile rename");
  assert(index.evidenceBetween("Note A Renamed.md", "Note B.md").length > 0, "Evidence touching the renamed path must be remapped locally");
  assert(index.search("note a renamed").some((page) => page === renamePage), "Search index must update immediately after rename");
  assert(index.neighbours(renamePage, "parent").some((item) => item.page.path === "Note B.md"), "Connected notes must remain connected after rename");

  // The reactive coordinator must not turn the rename event (or Obsidian's unchanged follow-up
  // metadata event) into indexing work. Persisted navigation paths are still remapped immediately.
  const renameCoordinator = new ExcaliBrainPlugin();
  const renameHandlers = new Map();
  const rebuildReasons = [];
  const fastRenameCalls = [];
  renameCoordinator.app = {
    vault: {
      on: (name, callback) => { renameHandlers.set(`vault:${name}`, callback); return {}; },
      getFileByPath: (path) => path === renamedCentral?.path ? renamedCentral : null,
    },
    metadataCache: {
      on: (name, callback) => { renameHandlers.set(`metadata:${name}`, callback); return {}; },
    },
  };
  renameCoordinator.index = { renameFile: (oldPath, file) => { fastRenameCalls.push([oldPath, file.path]); return true; } };
  renameCoordinator.settings = {
    ...settings,
    primaryTagField: "Note type",
    lastActivePath: "Folder/Old.md",
    navigationHistory: ["Start.md", "Folder/Old.md", "Folder/Old.md"],
    pinnedNodes: ["Folder/Old.md", "Pinned.md"],
  };
  renameCoordinator.saveSettings = async () => {};
  renameCoordinator.scheduleRebuild = (reason) => { rebuildReasons.push(reason); };
  renameCoordinator.registerReactiveIndexListeners();
  const renamedCentral = new TFile("Moved/New.md", 123);
  const renameHandler = renameHandlers.get("vault:rename");
  const metadataChangedHandler = renameHandlers.get("metadata:changed");
  assert(renameHandler && metadataChangedHandler, "Rename and metadata listeners must be registered");
  renameHandler(renamedCentral, "Folder/Old.md");
  assert.equal(renameCoordinator.settings.lastActivePath, "Moved/New.md");
  assert.deepEqual(renameCoordinator.settings.navigationHistory, ["Start.md", "Moved/New.md"]);
  assert.deepEqual(renameCoordinator.settings.pinnedNodes, ["Moved/New.md", "Pinned.md"]);
  assert.deepEqual(fastRenameCalls, [["Folder/Old.md", "Moved/New.md"]]);
  assert.equal(renameCoordinator.dirtyMarkdownPaths.size, 0, "A clean rename must not enqueue a Markdown patch");
  assert.deepEqual(rebuildReasons, [], "A TFile rename must not schedule a full rebuild");

  metadataChangedHandler(renamedCentral);
  assert.equal(renameCoordinator.dirtyMarkdownPaths.size, 0, "Rename-generated metadata event with identical revision must be ignored");
  assert.deepEqual(rebuildReasons, []);

  renamedCentral.stat.mtime += 1;
  renamedCentral.stat.size += 1;
  metadataChangedHandler(renamedCentral);
  assert(renameCoordinator.dirtyMarkdownPaths.has("Moved/New.md"), "A real content revision after rename must still use the incremental patch path");
  assert.deepEqual(rebuildReasons, ["metadata:changed"]);

  console.log("K-Plex indexing fixture: assertions 1–33 + P1–P17 PASS");
  console.log("Central section expansion fixture: assertions 34–50 PASS");
  console.log("Warm cache + predicate/lens foundation + incremental runtime patch: assertions 51–59 PASS");
  console.log("Immediate creation + lazy node imagery: assertions 60–66 PASS");
  console.log("Additive connection ontology: assertions 67–68 PASS");
  console.log("Placeholder creation + ghost materialization PASS");
} finally {
  index.destroy();
  rmSync(temp, { recursive: true, force: true });
}
