/**
 * Native Obsidian shell and shared React composer for related-note creation. The plugin owns mutations; the modal owns focus, suggestions and cleanup, and consumes localized copy.
 */
import { SavedRelationshipPendingError } from "../adapters/obsidian/relationshipMetadataWrite";
import { Modal, Notice, type TFile, type Scope, type WorkspaceLeaf } from "obsidian";
import { createElement, useEffect, useMemo, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import type KplexPlugin from "../main";
import type { GraphPage, RelationshipRole } from "../types";
import { FuzzySearchInput, fuzzyFilterStrings } from "./FuzzySearchInput";
import { readObsidianPresentationEnvironment } from "../adapters/obsidian/presentationEnvironment";
import { enableDraggableDialog } from "./components/DraggableDialog";
import { ObsidianIcon } from "./ObsidianIcon";
import { fitMobileModalToViewport } from "./mobileModalViewport";
import { PartialRelatedFileError } from "../adapters/obsidian/relatedFileOutcome";
import type { CompletionIntent } from "../core/plex/actions";

/**
 * Confirmed saved relationship state; a pending publication remains a committed vault write.
 * Commit callbacks may arrive after dismissal; consumers must fence their own transient UI effects.
 */
export type RelatedNoteCommit = { state: "saved-published" | "saved-pending"; page: GraphPage };

/** Ephemeral originating-surface capabilities; never persisted with action preferences. */
export type RelatedNoteInvocation = {
  continuation?: CompletionIntent;
  current?: () => boolean;
  focusGraph?: () => void;
  onClosed?: () => void;
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
  const [role, setRole] = useState<RelationshipRole>(initialRole);
  const [query, setQuery] = useState(/** Preselect the historical endpoint without requiring a second search. */ () => fixedTarget ? plugin.index.titleFor(fixedTarget) : "");
  const [alias, setAlias] = useState("");
  const [aliasFocused, setAliasFocused] = useState(false);
  const [noteTyped, setNoteTyped] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<GraphPage | null>(fixedTarget ?? null);
  const [ontology, setOntology] = useState(() => plugin.defaultOntologyField(initialRole));
  const [ontologyTyped, setOntologyTyped] = useState(false);
  const [browseOntology, setBrowseOntology] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [continuation, setContinuation] = useState<CompletionIntent>(session.continuation);
  const [savedPending, setSavedPending] = useState<GraphPage | null>(null);
  const [partialFile, setPartialFile] = useState<TFile | null>(null);
  const [editAfterCreate, setEditAfterCreate] = useState(() => plugin.settings.editNewNodeAfterCreate);
  const excalidrawAvailable = plugin.isExcalidrawAvailable();
  const [defaultCreateType, setDefaultCreateType] = useState<"markdown" | "excalidraw">(() =>
    plugin.settings.newNodeDefaultType === "excalidraw" && excalidrawAvailable ? "excalidraw" : "markdown",
  );

  useEffect(/** Track same-file target renames for this bounded composer, without a permanent identity index. */ () => {
    const rename = plugin.app.vault.on("rename", /** Refresh the chosen target's displayed path while retaining its exact captured file identity. */ file => {
      if (file !== selectedTarget?.file) return;
      const target = refreshCapturedPage(plugin, selectedTarget);
      setSelectedTarget(target); setQuery(plugin.index.titleFor(target));
    });
    return /** Retire only the rename subscription from this selected-target render. */ () => plugin.app.vault.offref(rename);
  }, [plugin, selectedTarget]);

  const noteResults = useMemo(() => {
    const trimmed = query.trim();
    if (!noteTyped || !trimmed) return [];
    return plugin.index.search(trimmed, 48).filter((page) => isNoteTarget(page, origin.path)).slice(0, 18);
  }, [plugin, origin.path, query, noteTyped]);

  const ontologyResults = useMemo(
    /** Explicit disclosure shows every role-appropriate field; typing retains fuzzy ranking. */
    () => browseOntology
      ? fuzzyFilterStrings(plugin.ontologyFieldsForRole(role), "", Number.MAX_SAFE_INTEGER)
      : ontologyTyped && ontology.trim()
        ? fuzzyFilterStrings(plugin.ontologyFieldsForRole(role), ontology, 18)
        : [],
    [plugin, role, ontology, ontologyTyped, browseOntology],
  );

  const webUrl = useMemo(() => {
    const value = query.trim();
    if (!/^https?:\/\//i.test(value)) return null;
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:" ? value : null;
    } catch {
      return null;
    }
  }, [query]);
  const nameValidation = useMemo(() => plugin.validateRelatedNoteName(query), [plugin, query]);

  useEffect(() => {
    setRole(initialRole);
    setOntology(plugin.defaultOntologyField(initialRole));
    setOntologyTyped(false);
    setBrowseOntology(false);
  }, [initialRole, plugin]);

  /** Validate remembered ontology before mutation; completion revalidates captured endpoints afterward. */
  const prepareField = async (): Promise<string | null> => {
    const field = ontology.trim();
    if (!field) {
      new Notice(plugin.translator("addRelated.enterOntologyField"), 1800);
      return null;
    }
    return plugin.rememberRelationshipOntology(role, field);
  };

  /** Complete only the still-current invocation; another resets only after confirmed publication. */
  const complete = async (page: GraphPage, intent: CompletionIntent, createdFile: boolean): Promise<void> => {
    onCommitted?.({ state: "saved-published", page });
    if (!session.canComplete()) return;
    plugin.requestNodeFlair(page.path);
    if (intent === "another") {
      setSelectedTarget(null); setQuery(""); setAlias(""); setNoteTyped(false); setAliasFocused(false);
      setPartialFile(null); setOntologyTyped(false); setBrowseOntology(false);
      session.focusName();
      return;
    }
    const edit = intent === "edit" || (intent === "configured" && createdFile && editAfterCreate);
    session.closeForCompletion(intent);
    try {
      if (intent === "follow" || edit) {
        await plugin.finishNewRelatedNode(page, hostLeaf, edit, /** Fence delayed editor work after deliberate navigation or migration. */ () => session.canComplete());
        if (!edit && session.canComplete()) session.focusGraph();
      }
    } finally { session.finishCompletion(); }
  };

  /** Acquire synchronously, before React can rerender, and suppress duplicate requests while saved publication is pending. */
  const beginWrite = (): boolean => {
    if (busyRef.current || savedPending || !session.isSessionOpen()) return false;
    busyRef.current = true; session.setWriting(true); setBusy(true);
    return true;
  };

  /** Report saved versus failed outcomes once, retaining recoverable file identity after a partial creation. */
  const reportFailure = (error: unknown, target?: GraphPage, file?: TFile): void => {
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
    if (existingFile) setPartialFile(existingFile);
    new Notice(existingFile
      ? plugin.translator("addRelated.partialCreation", { path: existingFile.path, error: error instanceof Error ? error.message : String(error) })
      : plugin.translator("addRelated.createFailed", { error: error instanceof Error ? error.message : String(error) }), 5000);
  };

  /** Link the captured note, with validity checked after remembered ontology awaits. */
  const linkExisting = async (intent: CompletionIntent = continuation) => {
    const target = selectedTarget;
    if (!target || !beginWrite()) return;
    try {
      const field = await prepareField();
      if (!field || !session.isSessionOpen()) return;
      const result = await plugin.createRelationToPage(refreshCapturedPage(plugin, origin), role, refreshCapturedPage(plugin, target), field);
      if (result.state === "unavailable") return;
      await complete(result.page, intent, false);
    } catch (error) { reportFailure(error, target); }
    finally { busyRef.current = false; session.setWriting(false); if (session.isSessionOpen()) setBusy(false); }
  };

  /** Create once; retained partial files are linked explicitly on recovery instead of created again. */
  const createNew = async (kind: "markdown" | "excalidraw", intent: CompletionIntent = continuation) => {
    if (selectedTarget || webUrl || (!partialFile && (!nameValidation.valid || nameValidation.existing)) || !beginWrite()) return;
    let file: TFile | null = partialFile;
    try {
      const field = await prepareField();
      if (!field || !session.isSessionOpen()) return;
      const currentOrigin = refreshCapturedPage(plugin, origin);
      if (!file) file = await plugin.createNewRelatedFileForOrigin(currentOrigin, query, kind, alias);
      if (!file) return;
      if (!session.isSessionOpen()) return;
      if (plugin.app.vault.getFileByPath(file.path) !== file) throw new Error(plugin.translator("addRelated.endpointChanged"));
      setPartialFile(file);
      setDefaultCreateType(kind); void plugin.rememberNewNodeDefaultType(kind);
      const page = await plugin.linkNewRelatedFile(refreshCapturedPage(plugin, origin), role, file, field, alias, query, Boolean(partialFile));
      await complete(page, intent, true);
    } catch (error) { reportFailure(error, undefined, file ?? undefined); }
    finally { busyRef.current = false; session.setWriting(false); if (session.isSessionOpen()) setBusy(false); }
  };

  /** Save an unresolved target through the existing writer without materializing a file. */
  const createPlaceholder = async (intent: CompletionIntent = continuation) => {
    if (selectedTarget || webUrl || !nameValidation.valid || nameValidation.existing || !beginWrite()) return;
    try {
      if (alias.trim()) new Notice(plugin.translator("addRelated.placeholderAliasNotSaved"), 4000);
      const field = await prepareField();
      if (!field || !session.isSessionOpen()) return;
      const page = await plugin.createPlaceholderRelatedPage(refreshCapturedPage(plugin, origin), role, nameValidation.stem, field);
      if (page) await complete(page, intent === "edit" ? "return" : intent, false);
    } catch (error) { reportFailure(error); }
    finally { busyRef.current = false; session.setWriting(false); if (session.isSessionOpen()) setBusy(false); }
  };

  /** Save a URL target while keeping its non-editable completion policy explicit. */
  const createWebLink = async (intent: CompletionIntent = continuation) => {
    if (selectedTarget || !webUrl || origin.file?.extension !== "md" || !beginWrite()) return;
    try {
      const field = await prepareField();
      if (!field || !session.isSessionOpen()) return;
      const page = await plugin.createWebLinkRelatedPage(refreshCapturedPage(plugin, origin), role, webUrl, alias, field);
      if (page) await complete(page, intent === "edit" ? "return" : intent, false);
    } catch (error) { reportFailure(error); }
    finally { busyRef.current = false; session.setWriting(false); if (session.isSessionOpen()) setBusy(false); }
  };

  /** One semantic submit route shared by native buttons, modal Scope and local form key delivery. */
  const submit = (override?: CompletionIntent, kind?: "markdown" | "excalidraw" | "placeholder"): void => {
    const intent = override ?? continuation;
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
    setBrowseOntology(false);
    setOntologyTyped(true);
    setOntology(value);
  };

  const createAvailable = !savedPending && !selectedTarget && !webUrl && (Boolean(partialFile) || nameValidation.valid && !nameValidation.existing);
  const placeholderAvailable = createAvailable && origin.file?.extension === "md";
  const webLinkAvailable = !selectedTarget && Boolean(webUrl) && origin.file?.extension === "md";
  const noteSearch = createElement(FuzzySearchInput<GraphPage>, {
    value: query,
    onChange: onNoteChange,
    results: noteResults,
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

  const aliasInput = !selectedTarget ? createElement("input", {
    type: "text",
    className: "kplex-create-alias-input",
    value: alias,
    placeholder: plugin.translator("addRelated.aliasPlaceholder"),
    "aria-label": plugin.translator("addRelated.aliasAria"),
    disabled: busy || Boolean(savedPending) || Boolean(partialFile),
    onFocus: () => setAliasFocused(true),
    onBlur: () => setAliasFocused(false),
    onChange: (event: { currentTarget: HTMLInputElement }) => setAlias(event.currentTarget.value),
  }) : null;

  const nameEditor = createElement(
    "div",
    { className: `kplex-create-name-pair${aliasFocused ? " is-alias-focused" : ""}${selectedTarget ? " has-selection" : ""}` },
    noteSearch,
    aliasInput,
  );

  const ontologySearch = createElement(FuzzySearchInput<string>, {
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
    placeholder: plugin.translator("addRelated.ontologyPlaceholder", { field: plugin.defaultOntologyField(role) }),
    ariaLabel: plugin.translator("addRelated.ontologyAria"),
    icon: "tags",
    disabled: busy || Boolean(savedPending) || Boolean(partialFile),
    className: "kplex-add-related-ontology-search",
    openResultsOnFocus: false,
    floating: true,
    floatingMode: "viewport",
    maxFloatingHeight: 280,
    resultsOwnerId: session.suggestionOwnerId,
    preferSuggestionOnModifiedEnter: true,
  });

  const markdownButton = createElement(
    "button",
    {
      type: "button",
      className: `kplex-add-related-type-button${defaultCreateType === "markdown" ? " is-default" : ""}`,
      "aria-label": plugin.translator(createAvailable ? "addRelated.createMarkdownLink" : "addRelated.createMarkdown"),
      "aria-keyshortcuts": "Control+Enter Meta+Enter",
      disabled: !createAvailable || busy,
      "data-kplex-primary-action": defaultCreateType === "markdown" ? "true" : undefined,
      onClick: /** The Markdown button and session shortcut share submit validation. */ () => submit(undefined, "markdown"),
    },
    createElement(ObsidianIcon, { name: "text-initial", size: 20 }),
  );

  const excalidrawButton = excalidrawAvailable
    ? createElement(
        "button",
        {
          type: "button",
          className: `kplex-add-related-type-button${defaultCreateType === "excalidraw" ? " is-default" : ""}`,
          "aria-label": plugin.translator(createAvailable ? "addRelated.createExcalidrawLink" : "addRelated.createExcalidraw"),
          "aria-keyshortcuts": "Control+Enter Meta+Enter",
          disabled: !createAvailable || busy,
          "data-kplex-primary-action": defaultCreateType === "excalidraw" ? "true" : undefined,
          onClick: /** Explicit drawing creation changes only the requested creation type. */ () => submit(undefined, "excalidraw"),
        },
        createElement(ObsidianIcon, { name: "palette", size: 20 }),
      )
    : null;

  const placeholderButton = createElement(
    "button",
    {
      type: "button",
      className: "kplex-add-related-type-button",
      "aria-label": plugin.translator("addRelated.createPlaceholder"),
      disabled: !placeholderAvailable || busy,
      onClick: /** Explicit unresolved creation retains the same captured session policy. */ () => submit(undefined, "placeholder"),
    },
    createElement(ObsidianIcon, { name: "circle-dashed", size: 20 }),
  );

  const webLinkButton = webUrl
    ? createElement(
        "button",
        {
          type: "button",
          className: "kplex-add-related-link-button",
          "aria-label": plugin.translator(origin.file?.extension === "md" ? "addRelated.addWebLink" : "addRelated.webLinkRequiresMarkdown"),
          disabled: !webLinkAvailable || busy,
          "data-kplex-primary-action": webLinkAvailable ? "true" : undefined,
          onClick: /** Submit the same URL intent used by native keyboard delivery. */ () => submit(),
        },
        createElement(ObsidianIcon, { name: "globe", size: 19 }),
        createElement("span", null, plugin.translator("addRelated.addLink")),
      )
    : null;

  const linkButton = selectedTarget
    ? createElement(
        "button",
        {
          type: "button",
          className: "kplex-add-related-link-button",
          "aria-label": plugin.translator("addRelated.linkTo", { title: plugin.index.titleFor(selectedTarget) }),
          disabled: busy || Boolean(savedPending),
          "data-kplex-primary-action": "true",
          onClick: /** Submit the same selected-target intent as the keyboard route. */ () => submit(),
        },
        createElement(ObsidianIcon, { name: "link", size: 19 }),
        createElement("span", null, plugin.translator("addRelated.link")),
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

  const editToggle = !selectedTarget && !webUrl ? createElement(
    "label",
    { className: "kplex-create-edit-toggle" },
    createElement("span", { className: "kplex-create-edit-copy" }, createElement("strong", null, plugin.translator("addRelated.openForEditing"))),
    createElement(
      "span",
      { className: `checkbox-container${editAfterCreate ? " is-enabled" : ""}` },
      createElement("input", {
        type: "checkbox",
        checked: editAfterCreate,
        disabled: busy || Boolean(savedPending) || Boolean(partialFile),
        "aria-label": plugin.translator("addRelated.openNewForEditing"),
        onChange: (event: { currentTarget: HTMLInputElement }) => {
          const enabled = event.currentTarget.checked;
          setEditAfterCreate(enabled);
          plugin.settings.editNewNodeAfterCreate = enabled;
          void plugin.saveSettings(false, false);
        },
      }),
    ),
  ) : null;

  const completionSelect = createElement("label", null,
    createElement("span", null, plugin.translator("addRelated.completionMode")),
    createElement("select", {
      value: continuation, disabled: busy || Boolean(savedPending), "aria-label": plugin.translator("addRelated.completionMode"),
      onChange: /** Keep explicit intent local to this invocation. */ (event: { currentTarget: HTMLSelectElement }) => setContinuation(event.currentTarget.value as CompletionIntent),
    }, ...(["configured", "return", "another", "follow", "edit"] as const)
      .filter(/** URLs and unresolved notes do not support an editor completion. */ intent => intent !== "edit" || Boolean(selectedTarget?.file || !webUrl))
      .map(/** Localized finite choices cannot inject executable preferences. */ intent => createElement("option", { key: intent, value: intent }, plugin.translator(`addRelated.completion.${intent}`)))),
  );
  const recovery = savedPending ? createElement("div", { role: "status" },
    plugin.translator("addRelated.savedPending"),
    createElement("button", { type: "button", onClick: /** Reconcile saved content without reissuing its mutation. */ () => {
      void plugin.index.prepareRelationshipPair(origin.file?.path ?? origin.path, savedPending.path).then(/** Clear the form only after explicit confirmed reconciliation. */ ready => {
        if (!ready || !session.isSessionOpen()) return;
        setSavedPending(null); setPartialFile(null); setSelectedTarget(null); setQuery(""); setAlias(""); setNoteTyped(false); session.focusName();
      }).catch(/** Keep saved status and input on an unsuccessful reconciliation. */ () => {});
    } }, plugin.translator("addRelated.refreshSaved")),
  ) : partialFile ? createElement("div", { role: "status" },
    plugin.translator("addRelated.recoverFile", { path: partialFile.path }),
    createElement("button", { type: "button", disabled: busy || Boolean(savedPending), onClick: /** Recover the existing file relationship rather than creating a duplicate. */ () => submit() }, plugin.translator("addRelated.linkCreatedFile")),
    createElement("button", { type: "button", onClick: /** Deliberately inspect the retained file in the supported editor. */ () => { void plugin.openInDocumentLeaf(partialFile); } }, plugin.translator("addRelated.openCreatedFile")),
  ) : null;
  const controlRow = createElement("div", { className: "kplex-add-related-control-row" }, ontologySearch, editToggle, completionSelect);
  const composeRow = createElement("div", { className: "kplex-add-related-compose-row" }, nameEditor, actionArea);

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
    if (nameValidation.error) {
      statusText = nameValidation.error;
      statusError = true;
    } else if (nameValidation.existing) {
      statusText = plugin.translator("addRelated.existingName");
    } else {
      statusText = plugin.translator(excalidrawAvailable ? "addRelated.createStatusWithExcalidraw" : "addRelated.createStatus", { name: nameValidation.stem });
    }
  }

  const status = statusText
    ? createElement("div", { className: `kplex-add-related-create-hint${statusError ? " is-error" : ""}` }, statusText)
    : null;

  return createElement(
    "div",
    { className: "kplex-add-related-form" },
    controlRow,
    composeRow,
    status,
    recovery,
  );
}


let composerSequence = 0;

/** Native modal session owns submit routing, captured identity, focus leases and shell cleanup. */
export class NewRelatedNoteModal extends Modal {
  private root: Root | null = null;
  private releaseMobileViewport: (() => void) | null = null;
  private releaseDesktopDrag: (() => void) | null = null;
  private nativeHandlers: Array<ReturnType<Scope["register"]>> = [];
  private opened = false;
  private writing = false;
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
  readonly suggestionOwnerId = `related-composer-${++composerSequence}`;

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
    this.origin = captureRelatedEndpoint(origin);
    this.fixedTarget = fixedTarget ? captureRelatedEndpoint(fixedTarget) : undefined;
    this.hostContainer = hostLeaf?.view.containerEl ?? null;
    this.invokingDocument = this.hostContainer?.ownerDocument ?? this.modalEl.ownerDocument;
    const active = this.invokingDocument.activeElement;
    this.invokingElement = active && "focus" in active ? active as HTMLElement : null;
    this.continuation = invocation.continuation ?? "configured";
  }

  /** Protect role changes during the exact asynchronous save, independently of React state. */
  setWriting(writing: boolean): void { this.writing = writing; }

  /** A close cancels unstarted work; completed disk writes remain truthful after dismissal.
   * @remarks Native Modal owns an `isOpen` boolean, so session readiness uses a distinct name.
   */
  isSessionOpen(): boolean { return this.opened && !this.invalidated && this.invocation.current?.() !== false; }

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
  closeForCompletion(intent: CompletionIntent): void {
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
    if (this.modalEl.contains(target as Node)) return true;
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
    this.contentEl.addEventListener("keydown", domSubmit);
    this.invokingDocument.addEventListener("pointerdown", outsideInteraction, true);
    this.invokingDocument.addEventListener("focusin", outsideInteraction, true);
    this.releaseIdentity = /** Release every exact shell-owned listener on cancel, completion or close. */ () => {
      this.plugin.app.vault.offref(rename);
      this.contentEl.removeEventListener("keydown", domSubmit);
    };
    this.releaseInteraction = /** Retain post-close interaction fencing only until explicit completion settles. */ () => {
      this.invokingDocument.removeEventListener("pointerdown", outsideInteraction, true);
      this.invokingDocument.removeEventListener("focusin", outsideInteraction, true);
    };
    this.renderTitle();
    this.modalEl.addClass("kplex-add-related-modal");
    this.releaseMobileViewport = fitMobileModalToViewport(this.modalEl);
    const environment = readObsidianPresentationEnvironment(this.modalEl.ownerDocument.defaultView ?? undefined);
    if (environment.device === "desktop") this.releaseDesktopDrag = enableDraggableDialog({ modalEl: this.modalEl, handleEl: this.titleEl });
    this.modalEl.setAttr("data-kplex-tooltip-scope", "");
    this.contentEl.empty(); this.root = createRoot(this.contentEl); this.renderComposer();
  }

  /** Announce captured origin beside the accessible six-role selector. */
  private renderTitle(): void {
    this.titleEl.empty(); this.titleEl.addClass("kplex-add-related-title");
    this.titleEl.createSpan({ text: this.plugin.translator("addRelated.originTitle", { origin: this.plugin.index.titleFor(this.origin) }) });
    const roleSelect = this.titleEl.createEl("select", { cls: "kplex-add-related-role-select", attr: { "aria-label": this.plugin.translator("addRelated.relationshipType") } });
    const roleChoices = [
      { value: "child", label: this.plugin.translator("role.child") }, { value: "parent", label: this.plugin.translator("role.parent") },
      { value: "left", label: this.plugin.translator("role.friend") }, { value: "right", label: this.plugin.translator("role.challenger") },
      { value: "previous", label: this.plugin.translator("role.previous") }, { value: "next", label: this.plugin.translator("role.next") },
    ] as const;
    for (const choice of roleChoices) roleSelect.createEl("option", { text: choice.label, attr: { value: choice.value } });
    roleSelect.value = this.role;
    roleSelect.addEventListener("change", /** Keep only valid finite roles and do not change role while a mutation is in flight. */ () => {
      const choice = roleChoices.find(/** Ignore unknown selector values rather than casting a gate role. */ item => item.value === roleSelect.value);
      if (this.writing) { roleSelect.value = this.role; return; }
      if (!choice || choice.value === this.role) return;
      this.role = choice.value; this.renderComposer();
    });
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
    this.releaseMobileViewport?.(); this.releaseMobileViewport = null;
    this.root?.unmount(); this.root = null; this.contentEl.empty();
    if (!this.closedNotified) { this.closedNotified = true; this.invocation.onClosed?.(); }
  }
}
