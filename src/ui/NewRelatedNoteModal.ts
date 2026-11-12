/**
 * Native Obsidian shell and shared React composer for related-note creation. The plugin owns mutations and separate link/create completion preferences; the modal owns operation-local choices, focus, suggestions, failure-only recovery and cleanup, and consumes localized copy. Recovery retains the exact durable file and displays the failure reason without enabling fresh creation.
 */
import {KplexModal as Modal} from "../adapters/obsidian/KplexModal";
import { DrawingTemplateSelect } from "./features/DrawingTemplateSelect";
import { SavedRelationshipPendingError } from "../adapters/obsidian/relationshipMetadataWrite";
import {ReciprocalRelationshipWriteError, reciprocalPreflight, reciprocalApprovalCurrent, type ReciprocalApproval} from "../adapters/obsidian/reciprocalRelationshipWrite";
import {drawingAutomation} from "../adapters/obsidian/drawingTemplates";
import {Notice, type TFile, type Scope, type WorkspaceLeaf} from "obsidian";
import { createElement, useCallback, useEffect, useMemo, useRef, useState, useId } from "react";
import {FormField, FormActions} from "./components/FormField";
import { createRoot, type Root } from "react-dom/client";
import type KplexPlugin from "../main";
import type { GraphPage, RelationshipRole } from "../types";
import { FuzzySearchInput, fuzzyFilterStrings, type FuzzySearchInputProps } from "./FuzzySearchInput";
import {ontologyConfiguration} from '../core/contracts/ontologyConfiguration';
import {normalizeFieldName} from '../core/contracts/fieldName';
import {ontologyFieldViews,ontologyFieldDetail,ontologyFuzzyMatches,ontologySelectionFields} from './features/ontologyPresentation';
import { FolderPathInput } from "./FolderPathInput";
import { readObsidianPresentationEnvironment } from "../adapters/obsidian/presentationEnvironment";
import { enableDraggableDialog } from "./components/DraggableDialog";
import { ObsidianIcon } from "./ObsidianIcon";
import { PartialRelatedFileError } from "../adapters/obsidian/relatedFileOutcome";
import type { CompletionIntent } from "../core/plex/actions";
import {resolveCreationAfterSaving, type CreationAfterSavingAction} from "../core/plex/createdNoteDestination";
import { CreationCompletionSelect } from "./features/CreationCompletionSelect";
import {RelationshipFieldControl} from "./features/RelationshipFieldControl";
import {SelectedOntologyEditor} from "./SelectedOntologyEditor";
import {RelationshipDirectionControl} from "./features/RelationshipDirectionControl";
import {eligibleRelationshipOwner} from "../adapters/obsidian/relationshipOwner";
import {copyExternalFile, validateExternalImportName} from "../adapters/obsidian/externalFileImport";

/**
 * Confirmed saved relationship state; a pending publication remains a committed vault write.
 * Commit callbacks may arrive after dismissal; consumers must fence their own transient UI effects.
 */
export type RelatedNoteCommit = { state: "saved-published" | "saved-pending"; page: GraphPage };

/** Ephemeral originating-surface capabilities; never persisted with action preferences. */
export type RelatedNoteInvocation = {
  /** Add relationship starts with the full vocabulary while keeping a concrete fallback role. */
  initialRoleFilter?: "all";
  continuation?: CompletionIntent;
  current?: () => boolean;
  focusGraph?: () => void;
  onClosed?: () => void;
  /** Existing-target native imports may append ontology but cannot inherit the legacy automatic-relink policy. */
  additiveOnly?: boolean;
  /** Chronological journal actions may restore a field whose semantic role is Parent/Child. */
  initialOntology?: string;
  onOntologySelected?: (field: string) => Promise<void>;
  /** Confirm one browser File through the same destination/ontology/recovery composer. */
  importSource?: File;
  importedFile?: TFile;
  onImported?: (file: TFile) => void;
  onImportFailure?: (error: string) => void;
};

/** Detach the bounded endpoint reference from mutable published page metadata while retaining its exact TFile. */
export function captureRelatedEndpoint(page: GraphPage): GraphPage { return { ...page, file: page.file }; }

/** Follow same-file renames while refusing a replacement file at the captured path. */
export function refreshCapturedPage(plugin: KplexPlugin, captured: GraphPage): GraphPage {
  const file = captured.file;
  if (file && plugin.app.vault.getFileByPath(file.path) !== file) {
    throw new Error(plugin.translator("addRelated.endpointChanged"));
  }
  if (!file) return captured;
  const indexed = plugin.index.get(file.path);
  return indexed?.file === file ? captureRelatedEndpoint(indexed) : { ...captured, path: file.path, file };
}

/** Only physical Markdown targets participate in this existing-note composer. */
function isNoteTarget(page: GraphPage, originPath: string): boolean {
  if (page.path === originPath || page.isFolder || page.isTag || page.url) return false;
  return page.file?.extension === "md";
}

/** Render the reusable related-node form with localized labels and injected creation actions; note/query values remain user data. */
function RelatedNoteComposer({
  plugin,
  origin,
  initialRole,
  fixedTarget,
  onCommitted,
  onClose,
  hostLeaf,
  session,
}: {
  plugin: KplexPlugin;
  origin: GraphPage;
  initialRole: RelationshipRole;
  fixedTarget?: GraphPage;
  onCommitted?: (result: RelatedNoteCommit) => void;
  onClose: () => void;
  hostLeaf?: WorkspaceLeaf;
  session: NewRelatedNoteModal;
}) {
  const [,setVocabularyRevision]=useState(0);
  useEffect(/** Update clean selection annotations after saved configuration publications without replacing typed drafts. */ ()=>plugin.index.subscribePresentation?.(/** Bump only this composer's current rendering. */ ()=>setVocabularyRevision(value=>value+1)),[plugin]);
  const [roleFilter, setRoleFilter] = useState<RelationshipRole | "all">(session.initialRoleFilter ?? initialRole);
  const [query, setQuery] = useState(/** Import names retain their extension and exact recovery file; historical endpoints keep the existing preselection. */ () => session.importedFile?.name ?? session.importSource?.name ?? (fixedTarget ? plugin.index.titleFor(fixedTarget) : ""));
  const [alias, setAlias] = useState("");
  const noteId = useId(), aliasId = useId();
  const [noteTyped, setNoteTyped] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<GraphPage | null>(fixedTarget ?? null);
  const [ontology, setOntology] = useState(() => session.initialOntology ?? plugin.defaultOntologyField(initialRole));
  const [editedOntology, setEditedOntology] = useState<string | null>(null);
  const assignedRole = plugin.ontologyRoleForField(ontology);
  const knownRole = assignedRole === "parent" || assignedRole === "child" || assignedRole === "left" || assignedRole === "right"
    || assignedRole === "previous" || assignedRole === "next" ? assignedRole : null;
  const role = roleFilter === "all" ? knownRole ?? initialRole : roleFilter;
  const ontologySelectionInvalid = Boolean(assignedRole && assignedRole !== role || editedOntology === normalizeFieldName(ontology) && !assignedRole);
  const [ontologyTyped, setOntologyTyped] = useState(false);
  const [storeOnTarget, setStoreOnTarget] = useState(false);
  const [browseOntology, setBrowseOntology] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [createContinuation, setCreateContinuation] = useState<CreationAfterSavingAction>(/** Explicit invocation intents remain local to each operation. */ () =>
    resolveCreationAfterSaving(session.continuation, plugin.createdNoteCompletionControl(hostLeaf).value));
  const [linkContinuation, setLinkContinuation] = useState<CreationAfterSavingAction>(/** Linking starts from its own persisted preference. */ () =>
    resolveCreationAfterSaving(session.continuation, plugin.createdNoteCompletionControl(hostLeaf, {operation: "link"}).value));
  const [savedPending, setSavedPending] = useState<GraphPage | null>(null);
  const [partialFile, setPartialFile] = useState<TFile | null>(session.importedFile ?? null);
  const [partialFailure, setPartialFailure] = useState<string | null>(null);
  const [reciprocalRecovery, setReciprocalRecovery] = useState<{error: ReciprocalRelationshipWriteError; target: GraphPage; intent: CompletionIntent | CreationAfterSavingAction} | null>(null);
  const excalidrawAvailable = !session.importSource && plugin.isExcalidrawAvailable();
  const [templateChoices] = useState(() => plugin.creationTemplateOptions());
  const [templatePath, setTemplatePath] = useState(() => templateChoices?.selected ?? "");
  const [defaultCreateType, setDefaultCreateType] = useState<"markdown" | "excalidraw">(() =>
    excalidrawAvailable && (templateChoices.files.some(file => file.path === templateChoices.selected && file.kind === "excalidraw")
      || plugin.settings.newNodeDefaultType === "excalidraw") ? "excalidraw" : "markdown",
  );
  const [folderOverride, setFolderOverride] = useState<string | null>(null);
  const folderPaths = useMemo(/** Capture only folder metadata once for this native dialog; no note/source work. */ () =>
    plugin.app.vault.getAllFolders(true).map(folder => folder.path === "/" ? "/" : folder.path), [plugin]);
  const folderPath = folderOverride ?? plugin.newRelatedNoteFolder(origin, query, defaultCreateType);
  const folderValidation = plugin.validateNoteFolderPath(folderPath);

  useEffect(/** Track same-file target renames for this bounded composer, without a permanent identity index. */ () => {
    const rename = plugin.app.vault.on("rename", /** Refresh the chosen target's displayed path while retaining its exact captured file identity. */ file => {
      if (file !== selectedTarget?.file) return;
      const target = refreshCapturedPage(plugin, selectedTarget);
      setSelectedTarget(target); setQuery(plugin.index.titleFor(target));
    });
    return /** Retire only the rename subscription from this selected-target render. */ () => plugin.app.vault.offref(rename);
  }, [plugin, selectedTarget]);

  const getNoteResults = useCallback(/** Filename-only selection needs no graph visibility evaluation or prepared incidence. */ (value: string) => {
    if (session.importSource) return [];
    const trimmed = value.trim();
    return trimmed ? plugin.index.search(trimmed, 48, "vault-files").filter((page) => isNoteTarget(page, origin.path)).slice(0, 18) : [];
  }, [plugin, origin.path]);

  const ontologyFields = ontologySelectionFields(roleFilter === "all" ? plugin.allOntologyFields() : plugin.ontologyFieldsForRole(role));
  const ontologyViews=ontologyFieldViews(ontologyConfiguration(plugin.settings),[],plugin.settings.ontologyDescriptions);
  const ontologyByKey=new Map(ontologyViews.map(/** Current annotations remain separate from physical selection values. */ field=>[field.key,field]));
  const ontologyResults = useMemo(
    /** Explicit disclosure shows every role-appropriate field; typing retains fuzzy ranking. */
    () => browseOntology
      ? fuzzyFilterStrings(ontologyFields, "", Number.MAX_SAFE_INTEGER)
      : ontologyTyped && ontology.trim()
        ? ontologyFuzzyMatches(ontologyFields,ontologyViews,ontology,fuzzyFilterStrings,18)
        : [],
    [ontologyFields, ontology, ontologyTyped, browseOntology],
  );

  const webUrl = useMemo(() => {
    if (session.importSource) return null;
    const value = query.trim();
    if (!/^https?:\/\//i.test(value)) return null;
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:" ? value : null;
    } catch {
      return null;
    }
  }, [query]);
  const linking = Boolean(selectedTarget || webUrl);
  const selectedContinuation = linking ? linkContinuation : createContinuation;
  const continuation = session.importSource && selectedContinuation === "another" ? "return" : selectedContinuation;
  const nameValidation = useMemo(() => session.importSource
    ? validateExternalImportName(plugin.app, session.importSource, query, folderValidation.folderPath, plugin.translator)
    : plugin.validateRelatedNoteName(query, folderValidation.folderPath), [plugin, session, query, folderValidation.folderPath]);

  useEffect(() => {
    setRoleFilter(session.initialRoleFilter ?? initialRole);
    setOntology(session.initialOntology ?? plugin.defaultOntologyField(initialRole));
    setOntologyTyped(false);
    setBrowseOntology(false);
  }, [initialRole, plugin, session]);

  /** Validate both writable endpoints and the authored inverse before creating any physical file. */
  const reciprocalCheck = (field: string, kind?: "markdown" | "excalidraw", target = selectedTarget) => {
    if (!plugin.settings.alsoWriteInverseOntology) return {approval: {enabled: false} as ReciprocalApproval};
    let writable = Boolean(eligibleRelationshipOwner(plugin.app, origin)) && !webUrl;
    if (target) writable = writable && Boolean(eligibleRelationshipOwner(plugin.app, target)) && target.file !== origin.file;
    else if (session.importSource) writable = writable && /\.md$/i.test(session.importSource.name);
    else if (kind === "excalidraw") {
      try {writable = writable && drawingAutomation()?.getDrawingFilePath?.(query, folderPath).endsWith(".md") === true;}
      catch {writable = false;}
    } else writable = writable && kind === "markdown";
    return reciprocalPreflight(ontologyConfiguration(plugin.settings), plugin.settings.alsoWriteInverseOntology === true, field, role, writable);
  };
  /** The selected inverse and opt-in consent remain the same across template and settings awaits. */
  const assertReciprocalApproval = (approval: ReciprocalApproval, field: string): void => {
    if (!reciprocalApprovalCurrent(approval, ontologyConfiguration(plugin.settings), plugin.settings.alsoWriteInverseOntology === true, field, role))
      throw new Error(plugin.translator("addRelated.endpointChanged"));
  };

  /** Validate remembered ontology before mutation; completion revalidates captured endpoints afterward. */
  const prepareField = async (): Promise<string | null> => {
    if (session.importSource && !/\.md$/i.test(session.importSource.name) && !eligibleRelationshipOwner(plugin.app, origin)) {
      new Notice(plugin.translator("relationship.flipUnavailable")); return null;
    }
    if (storeOnTarget && (webUrl || selectedTarget && !eligibleRelationshipOwner(plugin.app, selectedTarget))) {
      new Notice(plugin.translator("relationship.flipUnavailable")); return null;
    }
    if (roleFilter === "all" && !knownRole || ontologySelectionInvalid) {
      new Notice(plugin.translator("addRelated.chooseDirection"), 1800);
      return null;
    }
    const field = ontology.trim();
    if (!field) {
      new Notice(plugin.translator("addRelated.enterOntologyField"), 1800);
      return null;
    }
    const selected = await plugin.rememberRelationshipOntology(role, field);
    await session.rememberOntology(selected);
    return selected;
  };

  /** Complete a durable save using one remembered outcome; non-files cannot inherit editor actions. */
  const complete = async (page: GraphPage, intent: CompletionIntent | CreationAfterSavingAction, _createdFile: boolean, state: RelatedNoteCommit["state"] = "saved-published"): Promise<void> => {
    onCommitted?.({state, page});
    if (!session.canComplete()) return;
    plugin.requestNodeFlair(page.path);
    let action = resolveCreationAfterSaving(intent, continuation);
    if (!page.file && action !== "return" && action !== "another" && action !== "follow") action = "return";
    if (action === "another") {
      setSelectedTarget(null); setQuery(""); setAlias(""); setNoteTyped(false);
      setPartialFile(null); setPartialFailure(null); setOntologyTyped(false); setBrowseOntology(false);
      setReciprocalRecovery(null);
      session.focusName(); return;
    }
    session.closeForCompletion(action);
    try {
      if (action !== "return") await plugin.finishNewRelatedNode(page, hostLeaf, action, /** Delayed opening retains the original completion owner. */ () => session.canComplete());
      if (action === "follow" && session.canComplete()) session.focusGraph();
    } finally {session.finishCompletion();}
  };

  /** Acquire synchronously, before React can rerender, and suppress duplicate requests while saved publication is pending. */
  const beginWrite = (): boolean => {
    if (busyRef.current || savedPending || !session.isSessionOpen()) return false;
    busyRef.current = true; session.setWriting(true); setBusy(true);
    return true;
  };

  /** Report saved versus failed outcomes once, retaining recoverable file identity after a partial creation. */
  const reportFailure = (error: unknown, target?: GraphPage, file?: TFile, intent: CompletionIntent | CreationAfterSavingAction = continuation): void => {
    if (error instanceof ReciprocalRelationshipWriteError) {
      const endpoint = target ?? (file ? plugin.index.get(file.path) : null);
      if (session.isSessionOpen() && endpoint) {
        setReciprocalRecovery({error, target: captureRelatedEndpoint(endpoint), intent});
        setPartialFile(endpoint.file);setPartialFailure(error.message);
      }
      new Notice(error.message, 6000);return;
    }
    if (error instanceof SavedRelationshipPendingError) {
      const affected = target ?? (file ? plugin.index.get(file.path) : null);
      if (affected) {
        if (session.isSessionOpen()) setSavedPending(affected);
        onCommitted?.({ state: "saved-pending", page: affected });
      } else {
        // A saved writer may finish before its virtual target is indexed. Block further submit regardless.
        const pending = { ...origin, path: webUrl ?? nameValidation.stem, file: null };
        if (session.isSessionOpen()) setSavedPending(pending);
        onCommitted?.({ state: "saved-pending", page: pending });
      }
      if (session.isSessionOpen() && !error.noticeReported) new Notice(error.message, 5000);
      return;
    }
    if (!session.isSessionOpen()) return;
    const existingFile = error instanceof PartialRelatedFileError ? error.file : file;
    const detail = error instanceof Error ? error.message : String(error);
    if (session.importSource) session.reportImportFailure(detail);
    if (existingFile) {
      setPartialFile(existingFile);
      setPartialFailure(detail);
      return;
    }
    new Notice(plugin.translator("addRelated.createFailed", { error: detail }), 5000);
  };

  /** Link the captured note, with validity checked after remembered ontology awaits. */
  const linkExisting = async (intent: CompletionIntent | CreationAfterSavingAction = continuation) => {
    const target = selectedTarget;
    if (!target || !beginWrite()) return;
    try {
      const preflight = reciprocalCheck(ontology, undefined, target);
      if (!preflight.approval) throw new Error(plugin.translator(preflight.reasonKey!));
      const field = await prepareField();
      if (!field || !session.isSessionOpen()) return;
      assertReciprocalApproval(preflight.approval, field);
      const currentOrigin = refreshCapturedPage(plugin, origin), currentTarget = refreshCapturedPage(plugin, target);
      const result = session.additiveOnly
        ? await plugin.createRelationToPage(currentOrigin, role, currentTarget, field, undefined, true, storeOnTarget)
        : await plugin.createRelationToPage(currentOrigin, role, currentTarget, field, undefined, false, storeOnTarget);
      if (result.state === "unavailable") return;
      await complete(result.page, intent, false);
    } catch (error) { reportFailure(error, target, undefined, intent); }
    finally { busyRef.current = false; session.setWriting(false); if (session.isSessionOpen()) setBusy(false); }
  };

  /** Create once; retained partial files are linked explicitly on recovery instead of created again. */
  const createNew = async (kind: "markdown" | "excalidraw", intent: CompletionIntent | CreationAfterSavingAction = continuation) => {
    if (selectedTarget || webUrl || folderValidation.error || (!partialFile && (!nameValidation.valid || nameValidation.existing)) || !beginWrite()) return;
    let file: TFile | null = partialFile;
    try {
      const preflight = reciprocalCheck(ontology, kind, null);
      if (!preflight.approval) throw new Error(plugin.translator(preflight.reasonKey!));
      if (!file && !session.importSource) templateChoices.validate?.(templatePath, kind);
      const field = await prepareField();
      if (!field || !session.isSessionOpen()) return;
      assertReciprocalApproval(preflight.approval, field);
      const currentOrigin = refreshCapturedPage(plugin, origin);
      if (!file && !session.importSource) templateChoices.validate?.(templatePath, kind);
      if (!file && session.importSource) {
        const destination = folderValidation.folderPath ? plugin.app.vault.getFolderByPath(folderValidation.folderPath) : plugin.app.vault.getRoot();
        if (!destination) throw new Error(plugin.translator("fileImport.existingFolder"));
        file = await plugin.createFileWithAutomation(() => copyExternalFile(plugin.app, session.importSource!, query, destination, plugin.translator, /** Copy acceptance requires the same original endpoint and live surface. */ () => {
          if (!session.isSessionOpen()) return false;
          return !origin.file || plugin.app.vault.getFileByPath(origin.file.path) === origin.file;
        }));
        session.rememberImported(file);
      }
      if (!file) file = await plugin.createNewRelatedFileForOrigin(currentOrigin, query, kind, alias, folderPath, templateChoices ? templatePath : undefined);
      if (!file) return;
      assertReciprocalApproval(preflight.approval, field);
      if (!session.isSessionOpen()) return;
      if (plugin.app.vault.getFileByPath(file.path) !== file) throw new Error(plugin.translator("addRelated.endpointChanged"));
      // Retain recovery state only after a failure. A durable file is normal progress while linking.
      if (!partialFile && !session.importSource) { setDefaultCreateType(kind); void plugin.rememberNewNodeDefaultType(kind); }
      const result = await plugin.linkNewRelatedFile(refreshCapturedPage(plugin, origin), role, file, field, session.importSource ? "" : alias, session.importSource ? "" : query, Boolean(partialFile) && !session.importSource, storeOnTarget);
      await complete(result.page, intent, true, result.state);
    } catch (error) { reportFailure(error, undefined, file ?? undefined, intent); }
    finally { busyRef.current = false; session.setWriting(false); if (session.isSessionOpen()) setBusy(false); }
  };

  /** Save an unresolved target through the existing writer without materializing a file. */
  const createPlaceholder = async (intent: CompletionIntent | CreationAfterSavingAction = continuation) => {
    if (storeOnTarget || selectedTarget || webUrl || folderValidation.error || !nameValidation.valid || nameValidation.existing || !beginWrite()) return;
    try {
      if (plugin.settings.alsoWriteInverseOntology) throw new Error(plugin.translator("reciprocal.requiresMarkdown"));
      const field = await prepareField();
      if (!field || !session.isSessionOpen()) return;
      const page = await plugin.createPlaceholderRelatedPage(refreshCapturedPage(plugin, origin), role, nameValidation.stem, field, folderPath, alias);
      if (page) await complete(page, intent === "edit" ? "return" : intent, false);
    } catch (error) { reportFailure(error); }
    finally { busyRef.current = false; session.setWriting(false); if (session.isSessionOpen()) setBusy(false); }
  };

  /** Save a URL target while keeping its non-editable completion policy explicit. */
  const createWebLink = async (intent: CompletionIntent | CreationAfterSavingAction = continuation) => {
    if (selectedTarget || !webUrl || origin.file?.extension !== "md" || !beginWrite()) return;
    try {
      if (plugin.settings.alsoWriteInverseOntology) throw new Error(plugin.translator("reciprocal.requiresMarkdown"));
      const field = await prepareField();
      if (!field || !session.isSessionOpen()) return;
      const page = await plugin.createWebLinkRelatedPage(refreshCapturedPage(plugin, origin), role, webUrl, alias, field);
      if (page) await complete(page, intent === "edit" ? "return" : intent, false);
    } catch (error) { reportFailure(error); }
    finally { busyRef.current = false; session.setWriting(false); if (session.isSessionOpen()) setBusy(false); }
  };

  /** Retry the retained two-file receipt directly; never repeat physical creation or a saved declaration. */
  const retryReciprocal = async (): Promise<void> => {
    const retained = reciprocalRecovery;if (!retained || !beginWrite()) return;
    try {
      await retained.error.receipt.retry();
      const target = refreshCapturedPage(plugin, retained.target);
      setReciprocalRecovery(null);setPartialFile(null);setPartialFailure(null);
      await complete(target, retained.intent, false, retained.error.outcomes.some(item => item.state === "saved-pending") ? "saved-pending" : "saved-published");
    } catch (error) {reportFailure(error, retained.target, undefined, retained.intent);}
    finally {busyRef.current = false;session.setWriting(false);if (session.isSessionOpen()) setBusy(false);}
  };

  /** One semantic submit route shared by native buttons, modal Scope and local form key delivery. */
  const submit = (override?: CompletionIntent, kind?: "markdown" | "excalidraw" | "placeholder"): void => {
    if (reciprocalRecovery) {void retryReciprocal();return;}
    const requested = override ?? continuation;
    const intent = session.importSource && requested === "another" ? "return" : requested;
    if (kind === "placeholder") void createPlaceholder(intent);
    else if (selectedTarget) void linkExisting(intent);
    else if (webLinkAvailable) void createWebLink(intent);
    else if (createAvailable || partialFile) void createNew(kind ?? defaultCreateType, intent);
  };
  useEffect(/** Install only the live React commit's submit callback; stale renders cannot dispose a newer callback. */ () => session.registerSubmit(submit), [session, submit]);

  /** Retain the exact selected file identity while displaying its readable label. */
  const chooseExisting = (page: GraphPage) => {
    setSelectedTarget(captureRelatedEndpoint(page));
    setQuery(plugin.index.titleFor(page));
  };

  /** Editing a name explicitly discards an existing-note selection. */
  const onNoteChange = (value: string) => {
    setNoteTyped(true);
    setSelectedTarget(null);
    setQuery(value);
  };

  /** Editing exits explicit browsing and resumes the normal fuzzy ontology search. */
  const onOntologyChange = (value: string) => {
    setEditedOntology(null);
    setBrowseOntology(false);
    setOntologyTyped(true);
    setOntology(value);
  };

  const createAvailable = !ontologySelectionInvalid && !savedPending && !partialFile && !selectedTarget && !webUrl && !folderValidation.error && nameValidation.valid && !nameValidation.existing;
  const placeholderAvailable = !plugin.settings.alsoWriteInverseOntology && !session.importSource && createAvailable && origin.file?.extension === "md";
  const webLinkAvailable = !plugin.settings.alsoWriteInverseOntology && !selectedTarget && Boolean(webUrl) && origin.file?.extension === "md";
  const reciprocalReason = reciprocalCheck(ontology, selectedTarget ? undefined : defaultCreateType).reasonKey;
  const selectedTemplateKind = templateChoices.files.find(file => file.path === templatePath)?.kind;
  const noteSearch = createElement(FuzzySearchInput<GraphPage>, {
    inputId: noteId, labelledBy: `${noteId}-label`,
    value: query,
    onChange: onNoteChange,
    getResults: getNoteResults,
    onChoose: chooseExisting,
    getKey: (page: GraphPage) => page.path,
    getLabel: (page: GraphPage) => plugin.index.titleFor(page),
    getDetail: (page: GraphPage) => page.path,
    placeholder: plugin.translator("addRelated.searchPlaceholder"),
    ariaLabel: plugin.translator("addRelated.searchAria"),
    autoFocus: true,
    disabled: busy || Boolean(savedPending) || Boolean(partialFile),
    className: `kplex-add-related-note-search${selectedTarget ? " has-selection" : ""}`,
    openResultsOnFocus: false,
    floating: true,
    floatingMode: "viewport",
    maxFloatingHeight: 320,
    resultsOwnerId: session.suggestionOwnerId,
    preferSuggestionOnModifiedEnter: true,

  });

  const aliasInput = !selectedTarget && !session.importSource ? createElement("input", {
    type: "text",
    className: "kplex-create-alias-input",
    id: aliasId,
    value: alias,
    placeholder: plugin.translator("addRelated.aliasPlaceholder"),
    disabled: busy || Boolean(savedPending) || Boolean(partialFile),
    onChange: (event: { currentTarget: HTMLInputElement }) => setAlias(event.currentTarget.value),
  }) : null;

  const nameEditor = createElement(
    "div",
    { className: `kplex-create-name-pair${selectedTarget ? " has-selection" : ""}` },
    createElement(FormField, {label: plugin.translator("addRelated.searchAria"), controlId: noteId, children: noteSearch}),
    aliasInput ? createElement(FormField, {label: plugin.translator("addRelated.aliasAria"), controlId: aliasId, children: aliasInput}) : null,
  );

  const ontologySearch: FuzzySearchInputProps<string> = {
    value: ontology,
    onChange: onOntologyChange,
    results: ontologyResults,
    onChoose: /** Retain the chosen field while closing the disclosure's complete list. */ (field: string) => {
      setOntology(field); setOntologyTyped(false); setBrowseOntology(false);
    },
    disclosure: {
      label: plugin.translator("addRelated.showOntologyFields"),
      icon: createElement(ObsidianIcon, { name: "chevron-down", size: 16 }),
      onOpen: /** Browse the complete role vocabulary even after the input is cleared. */ () => setBrowseOntology(true),
    },
    getKey: (field: string) => field.toLocaleLowerCase(),
    getLabel: (field: string) => field,
    getDetail: /** Annotate partner matches only when that tier actually matched, not an own-description result. */ (field:string)=>{
      const view=ontologyByKey.get(normalizeFieldName(field));
      return ontologyFieldDetail(view,plugin.translator,Boolean(ontologyTyped&&!fuzzyFilterStrings([field],ontology,1).length&&view?.partner&&fuzzyFilterStrings([view.partner],ontology,1).length));
    },
    placeholder: plugin.translator("addRelated.ontologyPlaceholder", { field: plugin.defaultOntologyField(role) }),
    ariaLabel: plugin.translator("addRelated.ontologyAria"),
    icon: "tags",
    disabled: busy || Boolean(savedPending) || Boolean(partialFile),
    className: "kplex-add-related-ontology-search",
    resultsClassName: "kplex-ontology-results",
    openResultsOnFocus: false,
    floating: true,
    floatingMode: "viewport",
    maxFloatingHeight: 280,
    resultsOwnerId: session.suggestionOwnerId,
    preferSuggestionOnModifiedEnter: true,
  };

  const markdownButton = createElement(
    "button",
    {
      type: "button",
      className: `kplex-add-related-type-button${defaultCreateType === "markdown" ? " is-default mod-cta" : ""}`,
      "aria-label": session.importSource ? plugin.translator("fileImport.import") : plugin.translator(createAvailable ? "addRelated.createMarkdownLink" : "addRelated.createMarkdown"),
      "aria-keyshortcuts": "Control+Enter Meta+Enter",
      disabled: !createAvailable || busy || selectedTemplateKind === "excalidraw" || Boolean(reciprocalCheck(ontology, "markdown", null).reasonKey),
      "data-kplex-primary-action": defaultCreateType === "markdown" ? "true" : undefined,
      onClick: /** The Markdown button and session shortcut share submit validation. */ () => submit(undefined, "markdown"),
    },
    createElement(ObsidianIcon, { name: session.importSource ? "file-down" : "text-initial", size: 20 }),
    session.importSource ? plugin.translator("fileImport.import") : null,
  );

  const excalidrawButton = excalidrawAvailable
    ? createElement(
        "button",
        {
          type: "button",
          className: `kplex-add-related-type-button${defaultCreateType === "excalidraw" ? " is-default mod-cta" : ""}`,
          "aria-label": plugin.translator(createAvailable ? "addRelated.createExcalidrawLink" : "addRelated.createExcalidraw"),
          "aria-keyshortcuts": "Control+Enter Meta+Enter",
          disabled: !createAvailable || busy || selectedTemplateKind === "markdown" || Boolean(reciprocalCheck(ontology, "excalidraw", null).reasonKey),
          "data-kplex-primary-action": defaultCreateType === "excalidraw" ? "true" : undefined,
          onClick: /** Explicit drawing creation changes only the requested creation type. */ () => submit(undefined, "excalidraw"),
        },
        createElement(ObsidianIcon, { name: "palette", size: 20 }),
      )
    : null;

  const placeholderButton = session.importSource ? null : createElement(
    "button",
    {
      type: "button",
      className: "kplex-add-related-type-button",
      "aria-label": plugin.translator("addRelated.createPlaceholder"),
      disabled: !placeholderAvailable || busy || storeOnTarget,
      onClick: /** Explicit unresolved creation retains the same captured session policy. */ () => submit(undefined, "placeholder"),
    },
    createElement(ObsidianIcon, { name: "circle-dashed", size: 20 }),
  );

  const webLinkButton = webUrl
    ? createElement(
        "button",
        {
          type: "button",
          className: "kplex-add-related-link-button kplex-icon-action mod-cta",
          "aria-label": plugin.translator(origin.file?.extension === "md" ? "addRelated.addWebLink" : "addRelated.webLinkRequiresMarkdown"),
          disabled: !webLinkAvailable || busy,
          "data-kplex-primary-action": webLinkAvailable ? "true" : undefined,
          onClick: /** Submit the same URL intent used by native keyboard delivery. */ () => submit(),
        },
        createElement(ObsidianIcon, { name: "globe", size: 19 }),
        createElement("span", {className: "kplex-icon-action-label"}, plugin.translator("addRelated.addLink")),
      )
    : null;

  const linkButton = selectedTarget
    ? createElement(
        "button",
        {
          type: "button",
          className: "kplex-add-related-link-button kplex-icon-action mod-cta",
          "aria-label": plugin.translator("addRelated.linkTo", { title: plugin.index.titleFor(selectedTarget) }),
          disabled: busy || Boolean(savedPending) || ontologySelectionInvalid || Boolean(reciprocalReason),
          "data-kplex-primary-action": "true",
          onClick: /** Submit the same selected-target intent as the keyboard route. */ () => submit(),
        },
        createElement(ObsidianIcon, { name: "link", size: 19 }),
        createElement("span", {className: "kplex-icon-action-label"}, plugin.translator("addRelated.link")),
      )
    : null;

  const actionArea = createElement(
    "div",
    { className: "kplex-add-related-action-area" },
    selectedTarget
      ? linkButton
      : webUrl
        ? webLinkButton
        : createElement(
            "div",
            { className: `kplex-add-related-create-actions${excalidrawAvailable ? " has-three-actions" : ""}` },
            markdownButton,
            excalidrawButton,
            placeholderButton,
          ),
  );

  const configuredCompletion = plugin.createdNoteCompletionControl(hostLeaf, {operation: linking ? "link" : "create", editable: Boolean(selectedTarget?.file || !selectedTarget && !webUrl)});
  const completion = session.importSource ? {...configuredCompletion, choices: configuredCompletion.choices.filter(/** One source file has one accepted import identity in this batch. */ choice => choice !== "another")} : configuredCompletion;
  const completionSelect = createElement(CreationCompletionSelect, {...completion,
    translate: plugin.translator, value: completion.choices.includes(continuation) ? continuation : "return",
    disabled: busy || Boolean(savedPending) || Boolean(partialFile),
    onChange: /** Changing operation restores its separate selection without overwriting the other preference. */ value => {
      if (linking) setLinkContinuation(value); else setCreateContinuation(value);
      completion.onChange(value);
    },
  });
  const recovery = reciprocalRecovery ? createElement("div", {className: "kplex-add-related-recovery", role: "alert"},
    createElement("div", null, plugin.translator("reciprocal.partial")),
    ...reciprocalRecovery.error.outcomes.map(outcome => createElement("div", {key: `${outcome.path}:${outcome.field}`}, plugin.translator("reciprocal.outcome", {
      path: outcome.path, field: outcome.field, state: plugin.translator(outcome.state === "pending" ? "reciprocal.pending" : "reciprocal.saved"),
    }))),
    createElement("button", {type: "button", disabled: busy, onClick: /** Retry only the captured missing property writes. */ () => {void retryReciprocal();}}, plugin.translator("reciprocal.retry")),
  ) : savedPending ? createElement("div", { className: "kplex-add-related-recovery", role: "status" },
    createElement("div", null, plugin.translator("addRelated.savedPending")),
    createElement("div", { className: "kplex-add-related-recovery-actions" },
      createElement("button", { type: "button", onClick: /** Reconcile saved content without reissuing its mutation. */ () => {
      void plugin.index.prepareRelationshipPair(origin.file?.path ?? origin.path, savedPending.path).then(/** Clear the form only after explicit confirmed reconciliation. */ ready => {
        if (!ready || !session.isSessionOpen()) return;
        setSavedPending(null); setPartialFile(null); setPartialFailure(null); setSelectedTarget(null); setQuery(""); setAlias(""); setNoteTyped(false); session.focusName();
      }).catch(/** Keep saved status and input on an unsuccessful reconciliation. */ () => {});
    } }, plugin.translator("addRelated.refreshSaved"))),
  ) : partialFile ? createElement("div", { className: "kplex-add-related-recovery", role: "alert" },
    createElement("div", null, plugin.translator("addRelated.recoverFile", { path: partialFile.path })),
    partialFailure ? createElement("div", { className: "kplex-add-related-recovery-reason" }, plugin.translator("addRelated.failureReason", { error: partialFailure })) : null,
    createElement("div", { className: "kplex-add-related-recovery-actions" },
      createElement("button", { type: "button", disabled: busy || Boolean(savedPending), onClick: /** Recover the existing file relationship rather than creating a duplicate. */ () => submit() }, plugin.translator("addRelated.linkCreatedFile")),
      createElement("button", { type: "button", disabled: busy, onClick: /** Deliberately inspect the retained file in the supported editor. */ () => { void plugin.openInDocumentLeaf(partialFile, hostLeaf); } }, plugin.translator("addRelated.openCreatedFile"))),
  ) : null;
  const controlRow = createElement(RelationshipFieldControl, {
    icons: {tag: createElement(ObsidianIcon, {name: "tags", size: 16}), edit: createElement(ObsidianIcon, {name: "pencil", size: 18})},
    role: roleFilter, search: ontologySearch, translate: plugin.translator,
    detail: ontologyViews.find(value => value.key === normalizeFieldName(ontology))?.description,
    disabled: busy || Boolean(savedPending) || Boolean(partialFile), canEdit: Boolean(assignedRole),
    onRoleChange: /** Changing the shared direction preserves validation and explicit new-field assignment. */ value => {
      if (busyRef.current) return;
      setRoleFilter(value);
      if (value !== "all") setOntology(plugin.defaultOntologyField(value));
      setOntologyTyped(false); setBrowseOntology(false);
    },
    onEdit: /** Every surface uses the same selected-ontology editor and exact parent lifetime. */ invoker =>
      session.editOntology(ontology, invoker, () => {setEditedOntology(normalizeFieldName(ontology)); setVocabularyRevision(value => value + 1);}),
  });
  const onTarget = storeOnTarget || !eligibleRelationshipOwner(plugin.app, origin);
  const targetName = selectedTarget ? plugin.index.titleFor(selectedTarget) : query || plugin.translator("relationship.newNote");
  const direction = createElement(RelationshipDirectionControl, {translate: plugin.translator, icon: createElement(ObsidianIcon, {name: "arrow-left-right", size: 18}),
    owner: onTarget ? targetName : plugin.index.titleFor(origin), target: onTarget ? plugin.index.titleFor(origin) : targetName,
    field: onTarget ? plugin.inverseOntologyField(ontology, role) : ontology,
    canFlip: Boolean(eligibleRelationshipOwner(plugin.app, origin)) && !webUrl && (!session.importSource || /\.md$/i.test(session.importSource.name)) && (!selectedTarget || Boolean(eligibleRelationshipOwner(plugin.app, selectedTarget))),
    disabled: busy || Boolean(savedPending) || Boolean(partialFile),
    onFlip: /** Change physical authorship only; canonical roles and the selected physical field stay explicit. */ () => setStoreOnTarget(value => !value),
  });
  const composeRow = createElement("div", { className: "kplex-add-related-compose-row" }, nameEditor);
  const folderRow = !selectedTarget && !webUrl ? createElement("div", { className: "kplex-create-folder-row" },
    createElement("span", { className: "kplex-create-folder-caption" }, plugin.translator("folderPicker.label")),
    createElement(FolderPathInput, {
      value: folderPath, onChange: setFolderOverride, folders: folderPaths, translate: plugin.translator,
      disabled: busy || Boolean(savedPending) || Boolean(partialFile), resultsOwnerId: session.suggestionOwnerId,
    })) : null;

  let statusText: string | null = null;
  let statusError = false;
  if (selectedTarget) {
    statusText = plugin.translator("addRelated.selectedExisting", { path: selectedTarget.path });
  } else if (webUrl) {
    if (origin.file?.extension !== "md") {
      statusText = plugin.translator("addRelated.webMarkdownExplanation");
      statusError = true;
    } else {
      statusText = alias.trim() ? plugin.translator("addRelated.webAliasStatus", { alias: alias.trim() }) : plugin.translator("addRelated.webStatus");
    }
  } else if (noteTyped && query.trim()) {
    if (folderValidation.error) {
      statusText = folderValidation.error;
      statusError = true;
    } else if (nameValidation.error) {
      statusText = nameValidation.error;
      statusError = true;
    } else if (nameValidation.existing) {
      statusText = plugin.translator("addRelated.existingName");
    } else if (session.importSource) {
      statusText = plugin.translator("fileImport.ready", {name: nameValidation.stem});
    } else {
      statusText = plugin.translator(excalidrawAvailable ? "addRelated.createStatusWithExcalidraw" : "addRelated.createStatus", { name: nameValidation.stem });
    }
  }

  const status = statusText && !partialFile && !savedPending
    ? createElement("div", { className: `kplex-add-related-create-hint${statusError ? " is-error" : ""}` }, statusText)
    : null;
  const footer = createElement("div", {className: "kplex-add-related-footer"}, completionSelect,
    createElement(FormActions, {status},
      createElement("button", {type: "button", className: "kplex-icon-action", "aria-label": plugin.translator("common.cancel"),
        onClick: /** Dismissal retires this session while any accepted native write retains its owner. */ () => session.close()},
      createElement(ObsidianIcon, {name: "x", size: 18})), actionArea));

  return createElement(
    "div",
    { className: "kplex-add-related-form" },
    controlRow,
    ontologySelectionInvalid ? createElement("div", {className: "kplex-add-related-create-hint is-error", role: "alert"}, plugin.translator("addRelated.chooseDirection")) : null,
    reciprocalReason ? createElement("div", {className: "kplex-add-related-create-hint is-error", role: "alert"}, plugin.translator(reciprocalReason)) : null,
    session.importSource ? createElement("p", {className: "setting-item-description"}, plugin.translator("fileImport.incoming", {name: session.importSource.name})) : null,
    session.importSource ? null : direction,
    composeRow,
    folderRow,
    templateChoices && !session.importSource && !selectedTarget && !webUrl ? createElement(DrawingTemplateSelect, {
      choices: templateChoices, value: templatePath, kind: defaultCreateType, translate: plugin.translator,
      onChange: /** A template's actual kind selects the visible creation action; typing alone never changes it. */ (path, kind) => {setTemplatePath(path);if (kind) setDefaultCreateType(kind);},
      disabled: busy || Boolean(savedPending) || Boolean(partialFile),
    }) : null,
    recovery,
    footer,
  );
}


let composerSequence = 0;

/** Native modal session owns submit routing, captured identity, focus leases and shell cleanup. */
export class NewRelatedNoteModal extends Modal {
  private readonly ontologyEditor: SelectedOntologyEditor;
  private root: Root | null = null;
  private releaseDesktopDrag: (() => void) | null = null;
  private nativeHandlers: Array<ReturnType<Scope["register"]>> = [];
  private opened = false;
  private completing = false;
  private closingForCompletion = false;
  private nameFocusFrame: number | null = null;
  private ignoreInvokerFocus = false;
  private invalidated = false;
  private closedNotified = false;
  private submitCallback: ((intent?: CompletionIntent) => void) | null = null;
  private invokingElement: HTMLElement | null;
  private invokingDocument: Document;
  private hostContainer: HTMLElement | null;
  private releaseIdentity: (() => void) | null = null;
  private releaseInteraction: (() => void) | null = null;
  readonly continuation: CompletionIntent;
  readonly additiveOnly: boolean;
  readonly initialOntology?: string;
  readonly initialRoleFilter?: "all";
  readonly suggestionOwnerId = `related-composer-${++composerSequence}`;
  readonly importSource?: File;
  importedFile?: TFile;

  /** Capture origin and invoker now; future shared-center changes never replace them. */
  constructor(
    private plugin: KplexPlugin,
    private origin: GraphPage,
    private role: RelationshipRole,
    private onCommitted?: (result: RelatedNoteCommit) => void,
    private hostLeaf?: WorkspaceLeaf,
    private fixedTarget?: GraphPage,
    private invocation: RelatedNoteInvocation = {},
  ) {
    super(plugin.app);
    this.importSource = invocation.importSource; this.importedFile = invocation.importedFile;
    this.ontologyEditor = new SelectedOntologyEditor(plugin, /** Child callbacks require this exact connected parent invocation. */ () => this.canComplete() && this.opened);
    this.origin = captureRelatedEndpoint(origin);
    this.fixedTarget = fixedTarget ? captureRelatedEndpoint(fixedTarget) : undefined;
    this.hostContainer = hostLeaf?.view.containerEl ?? null;
    this.invokingDocument = this.hostContainer?.ownerDocument ?? this.modalEl.ownerDocument;
    const active = this.invokingDocument.activeElement;
    this.invokingElement = active && "focus" in active ? active as HTMLElement : null;
    this.continuation = invocation.continuation ?? "configured";
    this.additiveOnly = invocation.additiveOnly === true;
    this.initialOntology = invocation.initialOntology;
    this.initialRoleFilter = invocation.initialRoleFilter;
  }

  /** Retain an invocation's independent field memory through the existing serialized host writer. */
  async rememberOntology(field: string): Promise<void> {await this.invocation.onOntologySelected?.(field);}

  /** Protect role changes during the exact asynchronous save, independently of React state. */
  setWriting(writing: boolean): void {
    const select = this.contentEl.querySelector<HTMLSelectElement>(".kplex-add-related-role-select");
    if (select) select.disabled = writing;
  }

  /** A close cancels unstarted work; completed disk writes remain truthful after dismissal.
   * @remarks Native Modal owns an `isOpen` boolean, so session readiness uses a distinct name.
   */
  isSessionOpen(): boolean { return this.opened && !this.invalidated && !this.ontologyEditor.active && this.invocation.current?.() !== false; }

  /** Open the exact selected physical field without replacing any React composer draft. */
  editOntology(field: string, invoker: HTMLElement, saved: () => void): void {this.ontologyEditor.open(field, invoker, saved);}

  /** The batch retains the exact durable copy even when its linking composer is dismissed. */
  rememberImported(file: TFile): void {this.importedFile = file; this.invocation.onImported?.(file);}

  /** Per-file batch receipts retain actual failed outcomes without replacing the composer's recovery. */
  reportImportFailure(error: string): void {this.invocation.onImportFailure?.(error);}

  /** Fence UI effects against owner-document migration, view retirement and intervening interaction. */
  canComplete(): boolean {
    return !this.invalidated && (this.opened || this.completing) && this.invocation.current?.() !== false
      && (!this.hostContainer || this.hostContainer.isConnected && this.hostContainer.ownerDocument === this.invokingDocument)
      && Boolean(this.invokingDocument.defaultView);
  }

  /** Replace the semantic submit callback; cleanup cannot retire a callback installed by a later render. */
  registerSubmit(callback: (intent?: CompletionIntent) => void): () => void {
    this.submitCallback = callback;
    return /** Release only this render's exact callback. */ () => { if (this.submitCallback === callback) this.submitCallback = null; };
  }

  /** Focus the cleared field only after React has enabled it; cancel exact owner-window work on close. */
  focusName(): void {
    const owner = this.contentEl.ownerDocument.defaultView;
    if (!owner) return;
    if (this.nameFocusFrame !== null) owner.cancelAnimationFrame(this.nameFocusFrame);
    let attempts = 0;
    const focusReadyField = /** Await actual enabled DOM state rather than assuming Promise state updates already committed. */ (): void => {
      this.nameFocusFrame = null;
      if (!this.isSessionOpen()) return;
      const input = this.contentEl.querySelector<HTMLInputElement>(".kplex-add-related-note-search input");
      if (input && !input.disabled) { input.focus(); return; }
      if (++attempts < 16) this.nameFocusFrame = owner.requestAnimationFrame(focusReadyField);
    };
    this.nameFocusFrame = owner.requestAnimationFrame(focusReadyField);
  }

  /** Explicit follow focuses only the originating graph surface. */
  focusGraph(): void {
    if (!this.canComplete()) return;
    if (this.invocation.focusGraph) this.invocation.focusGraph();
    else this.hostContainer?.querySelector<HTMLElement>(".kplex-app")?.focus();
  }

  /** Preserve completion permission across intentional close, while return restores a still-valid invoker. */
  closeForCompletion(intent: CompletionIntent | CreationAfterSavingAction): void {
    if (!this.canComplete()) return;
    this.completing = true; this.closingForCompletion = true; this.ignoreInvokerFocus = true;
    try { this.close(); } finally { this.closingForCompletion = false; }
    if (intent === "return" || intent === "configured") {
      this.releaseInteraction?.(); this.releaseInteraction = null;
      this.restoreInvoker();
    }
  }

  /** Release post-close interaction observation once completion settles or is suppressed. */
  finishCompletion(): void { this.releaseInteraction?.(); this.releaseInteraction = null; this.completing = false; }

  /** Restore only the connected original control; never guess an unrelated workspace editor. */
  private restoreInvoker(): void {
    if (!this.canComplete()) return;
    if (this.invokingElement?.isConnected && this.invokingElement.ownerDocument === this.invokingDocument) this.invokingElement.focus();
    else this.focusGraph();
  }

  /** Suggestions own Escape and modified Enter before the composer session owns them. */
  private dismissOpenSuggestions(): boolean {
    const expanded = this.contentEl.querySelector<HTMLInputElement>('.kplex-fuzzy-search input[aria-expanded="true"]');
    const shell = expanded?.closest<HTMLElement>(".kplex-fuzzy-search");
    if (!shell) return false;
    const EventCtor = shell.ownerDocument.defaultView?.CustomEvent ?? CustomEvent;
    shell.dispatchEvent(new EventCtor("kplex-dismiss-suggestions"));
    expanded?.focus();
    return true;
  }

  /** Accept synchronously, invoke the same form callback once, and leave open suggestions to their widget. */
  private submitKey(event: KeyboardEvent, intent?: CompletionIntent): false | undefined {
    if (event.defaultPrevented || event.isComposing || event.key === "Dead" || event.getModifierState?.("AltGraph")) return undefined;
    if (this.contentEl.querySelector('input[aria-expanded="true"]')) return undefined;
    if (!this.isSessionOpen() || !this.submitCallback) return undefined;
    event.preventDefault(); event.stopPropagation();
    if (!event.repeat) this.submitCallback(intent);
    return false;
  }

  /** Suggestion-first Escape keeps one event from both closing a list and dismissing its parent session. */
  override onEscapeKey(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.isComposing) return;
    event.preventDefault(); event.stopPropagation();
    if (!this.dismissOpenSuggestions()) this.close();
  }

  /** Recognize only this modal and its exact portaled suggester identity, never another modal's list. */
  private ownsInteractionTarget(target: EventTarget): boolean {
    if (this.modalEl.contains(target as Node) || this.ontologyEditor.owns(target)) return true;
    return "closest" in target && typeof target.closest === "function"
      && Boolean((target as Element).closest(`[data-fuzzy-owner="${this.suggestionOwnerId}"]`));
  }

  /** Track owned interaction and same-file rename notifications for the bounded session only. */
  onOpen(): void {
    this.opened = true;
    this.nativeHandlers.push(this.scope.register(["Mod"], "Enter", /** Native submit and DOM submit share one synchronous callback. */ event => this.submitKey(event)));
    this.nativeHandlers.push(this.scope.register(["Mod", "Shift"], "Enter", /** Explicit another keeps captured origin and useful configuration. */ event => this.submitKey(event, "another")));
    const domSubmit = /** Native scope may not deliver a form key; exact event consumption prevents duplication. */ (event: KeyboardEvent): void => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && !event.altKey) this.submitKey(event, event.shiftKey ? "another" : undefined);
    };
    const outsideInteraction = /** Deliberate interaction elsewhere invalidates pending navigation/focus, never disk commitment. */ (event: Event): void => {
      const target = event.target;
      // Native Modal.close may synchronously restore its invoker. That expected focus transition
      // does not supersede the explicitly selected follow/edit intent; later user interaction does.
      if (event.type === "focusin" && (this.closingForCompletion || this.completing && this.ignoreInvokerFocus && target === this.invokingElement)) {
        this.ignoreInvokerFocus = false; return;
      }
      if (event.type === "pointerdown") this.ignoreInvokerFocus = false;
      if (target && target !== this.invokingDocument.body && !this.ownsInteractionTarget(target)) this.invalidated = true;
    };
    const rename = this.plugin.app.vault.on("rename", /** The same file object follows a new path; deleted replacements are rejected on submit. */ file => {
      if (file !== this.origin.file && file !== this.fixedTarget?.file) return;
      if (this.origin.file === file) this.origin = { ...this.origin, path: file.path };
      if (this.fixedTarget?.file === file) this.fixedTarget = { ...this.fixedTarget, path: file.path };
      this.renderTitle(); this.renderComposer();
    });
    const releaseMigration = this.hostContainer?.onWindowMigrated?.(/** Native view migration retires this parent and its nested ontology editor. */ () => this.close());
    this.contentEl.addEventListener("keydown", domSubmit);
    this.invokingDocument.addEventListener("pointerdown", outsideInteraction, true);
    this.invokingDocument.addEventListener("focusin", outsideInteraction, true);
    this.releaseIdentity = /** Release every exact shell-owned listener on cancel, completion or close. */ () => {
      this.plugin.app.vault.offref(rename);
      releaseMigration?.();
      this.contentEl.removeEventListener("keydown", domSubmit);
    };
    this.releaseInteraction = /** Retain post-close interaction fencing only until explicit completion settles. */ () => {
      this.invokingDocument.removeEventListener("pointerdown", outsideInteraction, true);
      this.invokingDocument.removeEventListener("focusin", outsideInteraction, true);
    };
    this.renderTitle();
    this.modalEl.addClass("kplex-add-related-modal");
    const environment = readObsidianPresentationEnvironment(this.modalEl.ownerDocument.defaultView ?? undefined);
    if (environment.device === "desktop") this.releaseDesktopDrag = enableDraggableDialog({ modalEl: this.modalEl, handleEl: this.titleEl });
    this.modalEl.setAttr("data-kplex-tooltip-scope", "");
    this.contentEl.empty(); this.root = createRoot(this.contentEl); this.renderComposer();
  }

  /** Keep the native draggable title separate from editable form controls. */
  private renderTitle(): void {
    this.titleEl.empty(); this.titleEl.addClass("kplex-add-related-title");
    this.titleEl.createSpan({ text: this.plugin.translator("addRelated.originTitle", { origin: this.plugin.index.titleFor(this.origin) }) });
  }

  /** Reuse one React root so another and same-file rename retain form configuration. */
  private renderComposer(): void {
    this.root?.render(createElement(RelatedNoteComposer, {
      plugin: this.plugin, origin: this.origin, initialRole: this.role, fixedTarget: this.fixedTarget,
      onCommitted: this.onCommitted, onClose: /** The native shell owns cancellation cleanup. */ () => this.close(), hostLeaf: this.hostLeaf, session: this,
    }));
  }

  /** Close prevents late write UI effects, releases listeners, and notifies the host's single-flight owner exactly once. */
  onClose(): void {
    this.ontologyEditor.close();
    if (this.nameFocusFrame !== null) this.contentEl.ownerDocument.defaultView?.cancelAnimationFrame(this.nameFocusFrame);
    this.nameFocusFrame = null;
    const restore = !this.completing && this.canComplete();
    this.releaseIdentity?.(); this.releaseIdentity = null;
    if (!this.completing) { this.releaseInteraction?.(); this.releaseInteraction = null; }
    if (restore) { this.completing = true; this.restoreInvoker(); this.completing = false; }
    this.opened = false;
    if (!this.completing) this.invalidated = true;
    this.submitCallback = null;
    for (const handler of this.nativeHandlers) this.scope.unregister(handler); this.nativeHandlers = [];
    this.releaseDesktopDrag?.(); this.releaseDesktopDrag = null;
    this.root?.unmount(); this.root = null; this.contentEl.empty();
    if (!this.closedNotified) { this.closedNotified = true; this.invocation.onClosed?.(); }
  }
}
