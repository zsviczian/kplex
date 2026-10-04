/**
 * Native Obsidian shell and shared React composer for related-note creation. The plugin owns mutations; the modal owns focus, suggestions and cleanup, and consumes localized copy.
 */
import { Modal, Notice, type WorkspaceLeaf } from "obsidian";
import { createElement, useEffect, useMemo, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import type KplexPlugin from "../main";
import type { GraphPage, RelationshipRole } from "../types";
import { FuzzySearchInput, fuzzyFilterStrings } from "./FuzzySearchInput";
import { readObsidianPresentationEnvironment } from "../adapters/obsidian/presentationEnvironment";
import { enableDraggableDialog } from "./components/DraggableDialog";
import { ObsidianIcon } from "./ObsidianIcon";
import { fitMobileModalToViewport } from "./mobileModalViewport";

function isNoteTarget(page: GraphPage, originPath: string): boolean {
  if (page.path === originPath || page.isFolder || page.isTag || page.url) return false;
  return page.file?.extension === "md";
}

/** Render the reusable related-node form with localized labels and injected creation actions; note/query values remain user data. */
function RelatedNoteComposer({
  plugin,
  origin,
  initialRole,
  onCommitted,
  onClose,
  hostLeaf,
}: {
  plugin: KplexPlugin;
  origin: GraphPage;
  initialRole: RelationshipRole;
  onCommitted?: () => void;
  onClose: () => void;
  hostLeaf?: WorkspaceLeaf;
}) {
  const [role, setRole] = useState<RelationshipRole>(initialRole);
  const [query, setQuery] = useState("");
  const [alias, setAlias] = useState("");
  const [aliasFocused, setAliasFocused] = useState(false);
  const [noteTyped, setNoteTyped] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<GraphPage | null>(null);
  const [ontology, setOntology] = useState(() => plugin.defaultOntologyField(initialRole));
  const [ontologyTyped, setOntologyTyped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editAfterCreate, setEditAfterCreate] = useState(() => plugin.settings.editNewNodeAfterCreate);
  const excalidrawAvailable = plugin.isExcalidrawAvailable();
  const [defaultCreateType, setDefaultCreateType] = useState<"markdown" | "excalidraw">(() =>
    plugin.settings.newNodeDefaultType === "excalidraw" && excalidrawAvailable ? "excalidraw" : "markdown",
  );

  const noteResults = useMemo(() => {
    const trimmed = query.trim();
    if (!noteTyped || !trimmed) return [];
    return plugin.index.search(trimmed, 48).filter((page) => isNoteTarget(page, origin.path)).slice(0, 18);
  }, [plugin, origin.path, query, noteTyped]);

  const ontologyResults = useMemo(
    () => ontologyTyped && ontology.trim()
      ? fuzzyFilterStrings(plugin.ontologyFieldsForRole(role), ontology, 18)
      : [],
    [plugin, role, ontology, ontologyTyped],
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
  }, [initialRole, plugin]);

  const prepareField = async (): Promise<string | null> => {
    const field = ontology.trim();
    if (!field) {
      new Notice(plugin.translator("addRelated.enterOntologyField"), 1800);
      return null;
    }
    return plugin.rememberRelationshipOntology(role, field);
  };

  const linkExisting = async () => {
    const target = selectedTarget;
    if (busy || !target) return;
    setBusy(true);
    try {
      const field = await prepareField();
      if (!field) return;
      await plugin.createRelationToPage(origin, role, target, field);
      plugin.requestNodeFlair(target.path);
      onCommitted?.();
      onClose();
    } catch (error) {
      new Notice(plugin.translator("addRelated.relationshipFailed", { error: error instanceof Error ? error.message : String(error) }), 5000);
    } finally {
      setBusy(false);
    }
  };

  const createNew = async (kind: "markdown" | "excalidraw") => {
    if (busy || selectedTarget || webUrl || !nameValidation.valid || nameValidation.existing) return;
    setBusy(true);
    try {
      const field = await prepareField();
      if (!field) return;
      const file = await plugin.createNewRelatedFileForOrigin(origin, query, kind, alias);
      if (!file) return;
      setDefaultCreateType(kind);
      void plugin.rememberNewNodeDefaultType(kind);
      const page = await plugin.linkNewRelatedFile(origin, role, file, field, alias, query);
      plugin.requestNodeFlair(file.path);
      onCommitted?.();
      onClose();
      if (editAfterCreate) await plugin.finishNewRelatedNode(page, hostLeaf, true);
    } catch (error) {
      new Notice(plugin.translator("addRelated.createFailed", { error: error instanceof Error ? error.message : String(error) }), 5000);
    } finally {
      setBusy(false);
    }
  };

  const createPlaceholder = async () => {
    if (busy || selectedTarget || webUrl || !nameValidation.valid || nameValidation.existing) return;
    if (alias.trim()) {
      new Notice(plugin.translator("addRelated.placeholderAliasNotSaved"), 4_000);
    }
    setBusy(true);
    try {
      const field = await prepareField();
      if (!field) return;
      const page = await plugin.createPlaceholderRelatedPage(origin, role, nameValidation.stem, field);
      if (!page) return;
      plugin.requestNodeFlair(page.path);
      onCommitted?.();
      onClose();
    } catch (error) {
      new Notice(plugin.translator("addRelated.placeholderFailed", { error: error instanceof Error ? error.message : String(error) }), 5000);
    } finally {
      setBusy(false);
    }
  };

  const createWebLink = async () => {
    if (busy || selectedTarget || !webUrl || origin.file?.extension !== "md") return;
    setBusy(true);
    try {
      const field = await prepareField();
      if (!field) return;
      const page = await plugin.createWebLinkRelatedPage(origin, role, webUrl, alias, field);
      if (!page) return;
      plugin.requestNodeFlair(page.path);
      onCommitted?.();
      onClose();
    } catch (error) {
      new Notice(plugin.translator("addRelated.webLinkFailed", { error: error instanceof Error ? error.message : String(error) }), 5000);
    } finally {
      setBusy(false);
    }
  };

  const chooseExisting = (page: GraphPage) => {
    setSelectedTarget(page);
    setQuery(plugin.index.titleFor(page));
  };

  const onNoteChange = (value: string) => {
    setNoteTyped(true);
    setSelectedTarget(null);
    setQuery(value);
  };

  const onOntologyChange = (value: string) => {
    setOntologyTyped(true);
    setOntology(value);
  };

  const createAvailable = !selectedTarget && !webUrl && nameValidation.valid && !nameValidation.existing;
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
    disabled: busy,
    className: `kplex-add-related-note-search${selectedTarget ? " has-selection" : ""}`,
    openResultsOnFocus: false,
    floating: true,
    floatingMode: "viewport",
    maxFloatingHeight: 320,
    onCtrlEnter: () => {
      if (selectedTarget) void linkExisting();
      else if (webLinkAvailable) void createWebLink();
      else if (createAvailable) void createNew(defaultCreateType);
    },
  });

  const aliasInput = !selectedTarget ? createElement("input", {
    type: "text",
    className: "kplex-create-alias-input",
    value: alias,
    placeholder: plugin.translator("addRelated.aliasPlaceholder"),
    "aria-label": plugin.translator("addRelated.aliasAria"),
    disabled: busy,
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
    onChoose: (field: string) => { setOntology(field); setOntologyTyped(false); },
    getKey: (field: string) => field.toLocaleLowerCase(),
    getLabel: (field: string) => field,
    placeholder: plugin.translator("addRelated.ontologyPlaceholder", { field: plugin.defaultOntologyField(role) }),
    ariaLabel: plugin.translator("addRelated.ontologyAria"),
    icon: "tags",
    disabled: busy,
    className: "kplex-add-related-ontology-search",
    openResultsOnFocus: false,
    floating: true,
    floatingMode: "viewport",
    maxFloatingHeight: 280,
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
      onClick: () => { void createNew("markdown"); },
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
          onClick: () => { void createNew("excalidraw"); },
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
      onClick: () => { void createPlaceholder(); },
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
          onClick: () => { void createWebLink(); },
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
          disabled: busy,
          "data-kplex-primary-action": "true",
          onClick: () => { void linkExisting(); },
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
        disabled: busy,
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

  const controlRow = createElement("div", { className: "kplex-add-related-control-row" }, ontologySearch, editToggle);
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
  );
}


export class NewRelatedNoteModal extends Modal {
  private root: Root | null = null;
  private releaseMobileViewport: (() => void) | null = null;
  private releaseDesktopDrag: (() => void) | null = null;

  constructor(
    private plugin: KplexPlugin,
    private origin: GraphPage,
    private role: RelationshipRole,
    private onCommitted?: () => void,
    private hostLeaf?: WorkspaceLeaf,
  ) {
    super(plugin.app);
  }

  private dismissOpenSuggestions(): boolean {
    const expanded = this.contentEl.querySelector<HTMLInputElement>('.kplex-fuzzy-search input[aria-expanded="true"]');
    const shell = expanded?.closest<HTMLElement>(".kplex-fuzzy-search");
    if (!shell) return false;
    const EventCtor = shell.ownerDocument.defaultView?.CustomEvent ?? CustomEvent;
    shell.dispatchEvent(new EventCtor("kplex-dismiss-suggestions"));
    expanded?.focus();
    return true;
  }

  private triggerPrimaryAction(): boolean {
    const button = this.contentEl.querySelector<HTMLButtonElement>('button[data-kplex-primary-action="true"]:not(:disabled)');
    if (!button) return false;
    button.click();
    return true;
  }

  override onEscapeKey(event: KeyboardEvent): void {
    // Obsidian calls this runtime Modal hook before closing on Escape. If a fuzzy list is open,
    // consume this Escape by dismissing only the list; a subsequent Escape closes the modal.
    if (event.defaultPrevented) return;
    if (this.dismissOpenSuggestions()) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    this.close();
  }

  /** Render the related-node composer and opt its native shell into desktop-only draggable positioning. */
  onOpen(): void {
    this.scope.register(["Mod"], "Enter", (event) => {
      if (!this.triggerPrimaryAction()) return false;
      event.preventDefault();
      return true;
    });
    this.titleEl.empty();
    this.titleEl.addClass("kplex-add-related-title");
    this.titleEl.createSpan({ text: this.plugin.translator("addRelated.title") });
    const roleSelect = this.titleEl.createEl("select", {
      cls: "kplex-add-related-role-select",
      attr: { "aria-label": this.plugin.translator("addRelated.relationshipType") },
    });
    const roleChoices: Array<{ value: RelationshipRole; label: string }> = [
      { value: "child", label: this.plugin.translator("role.child") }, { value: "parent", label: this.plugin.translator("role.parent") },
      { value: "left", label: this.plugin.translator("role.friend") }, { value: "right", label: this.plugin.translator("role.challenger") },
      { value: "previous", label: this.plugin.translator("role.previous") }, { value: "next", label: this.plugin.translator("role.next") },
    ];
    for (const choice of roleChoices) roleSelect.createEl("option", { text: choice.label, attr: { value: choice.value } });
    roleSelect.value = this.role;
    roleSelect.addEventListener("change", () => {
      const next = roleSelect.value as RelationshipRole;
      if (next === this.role) return;
      this.role = next;
      this.renderComposer();
    });
    this.modalEl.addClass("kplex-add-related-modal");
    this.releaseMobileViewport = fitMobileModalToViewport(this.modalEl);
    const environment = readObsidianPresentationEnvironment(this.modalEl.ownerDocument.defaultView ?? undefined);
    if (environment.device === "desktop") {
      this.releaseDesktopDrag = enableDraggableDialog({ modalEl: this.modalEl, handleEl: this.titleEl });
    }
    this.modalEl.setAttr("data-kplex-tooltip-scope", "");
    this.contentEl.empty();
    this.root = createRoot(this.contentEl);
    this.renderComposer();
  }

  private renderComposer(): void {
    this.root?.render(createElement(RelatedNoteComposer, {
      plugin: this.plugin,
      origin: this.origin,
      initialRole: this.role,
      onCommitted: this.onCommitted,
      onClose: () => this.close(),
      hostLeaf: this.hostLeaf,
    }));
  }

  /** Release drag/mobile shell resources before unmounting the related-node composer. */
  onClose(): void {
    this.releaseDesktopDrag?.();
    this.releaseDesktopDrag = null;
    this.releaseMobileViewport?.();
    this.releaseMobileViewport = null;
    this.root?.unmount();
    this.root = null;
    this.contentEl.empty();
  }
}
