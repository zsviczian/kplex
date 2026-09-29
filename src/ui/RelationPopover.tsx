/**
 * Legacy React relationship popover with localized role, target and field controls. The plugin performs relationship writes; this component owns presentation and dismiss behavior.
 */
import { useEffect, useMemo, useState, type ChangeEvent, type PointerEvent } from "react";
import type { TFile } from "obsidian";
import type KplexPlugin from "../main";
import type { GateRole, GraphPage, LinkDirection } from "../types";
import { ObsidianIcon } from "./ObsidianIcon";

/** Render the legacy relationship picker with localized headings/actions and original candidate/field values. */
export function RelationPopover({
  plugin,
  origin,
  semanticRole,
  fixedTarget,
  existingDirection,
  x,
  y,
  onClose,
  onCommitted,
}: {
  plugin: KplexPlugin;
  origin: GraphPage;
  semanticRole: GateRole;
  fixedTarget?: GraphPage;
  existingDirection?: LinkDirection | null;
  x: number;
  y: number;
  onClose: () => void;
  onCommitted: () => void;
}) {
  const originIsMarkdown = origin.file?.extension === "md";
  const fields = plugin.ontologyFieldsForRole(semanticRole);
  const [selectedField, setSelectedField] = useState(() => plugin.defaultOntologyField(semanticRole));
  const [query, setQuery] = useState("");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [onClose]);

  const candidates = useMemo(() => {
    if (fixedTarget) return [];
    const q = query.trim().toLowerCase();
    return plugin.app.vault.getMarkdownFiles()
      .filter((file) => file.path !== origin.path)
      .filter((file) => !plugin.index.isConnected(origin, file.path))
      .filter((file) => !q || file.basename.toLowerCase().includes(q) || file.path.toLowerCase().includes(q))
      .sort((a, b) => a.basename.localeCompare(b.basename, undefined, { numeric: true, sensitivity: "base" }))
      .slice(0, 14);
  }, [fixedTarget, origin.path, plugin, query]);

  const selectedFile: TFile | null = selectedPath
    ? plugin.app.vault.getMarkdownFiles().find((file) => file.path === selectedPath) ?? null
    : null;

  const confirm = async () => {
    if (busy) return;
    if (!fixedTarget && !selectedFile) return;
    setBusy(true);
    try {
      if (fixedTarget) await plugin.relinkCentralNeighbour(origin, fixedTarget, semanticRole, selectedField, existingDirection ?? null);
      else await plugin.createRelationFromGate(origin, semanticRole, selectedFile!, selectedField);
      onCommitted();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const translate = plugin.translator;
  const relationName = ({
    parent: translate("role.parent"), child: translate("role.child"), left: translate("role.friend"), right: translate("role.challenger"),
  } satisfies Record<GateRole, string>)[semanticRole];
  const storageNote = !originIsMarkdown && !fixedTarget;
  const inverseField = plugin.inverseOntologyField(selectedField, semanticRole);

  return <div
    className="kplex-relation-popover"
    style={{ left: x, top: y }}
    onPointerDown={(e: PointerEvent<HTMLDivElement>) => e.stopPropagation()}
  >
    <div className="kplex-relation-popover-title">
      <strong>{fixedTarget ? translate("relation.move") : translate("relation.addRole", { role: relationName.toLowerCase() })}</strong>
      <button className="kplex-popover-icon" aria-label={translate("common.cancel")} onClick={onClose}><ObsidianIcon name="x" size={16} /></button>
    </div>

    {fixedTarget ? <div className="kplex-relation-summary">
      <span className="kplex-relation-direction">{relationName}</span>
      <span title={fixedTarget.path}>{plugin.index.titleFor(fixedTarget)}</span>
    </div> : <>
      <label className="kplex-relation-label" htmlFor="kplex-relation-search">{translate("relation.markdownNote")}</label>
      <div className="kplex-relation-search-wrap">
        <ObsidianIcon name="search" size={15} />
        <input
          id="kplex-relation-search"
          autoFocus
          value={query}
          placeholder={translate("relation.searchNotes")}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.currentTarget.value)}
        />
      </div>
      <div className="kplex-relation-results">
        {candidates.map((file) => <button
          key={file.path}
          className={selectedPath === file.path ? "is-selected" : ""}
          title={file.path}
          onClick={() => setSelectedPath(file.path)}
        >
          <ObsidianIcon name="file-text" size={14} />
          <span className="kplex-relation-file-name">{file.basename}</span>
          <small>{file.path}</small>
        </button>)}
        {candidates.length === 0 && <div className="kplex-relation-empty">{translate("relation.noUnconnectedMatches")}</div>}
      </div>
    </>}

    <label className="kplex-relation-label" htmlFor="kplex-relation-field">{translate("relation.noteProperty")}</label>
    <select id="kplex-relation-field" value={selectedField} onChange={(event: ChangeEvent<HTMLSelectElement>) => setSelectedField(event.currentTarget.value)}>
      {fields.map((field) => <option key={field} value={field}>{field}</option>)}
    </select>
    {(storageNote || (!originIsMarkdown && fixedTarget)) && <div className="kplex-relation-hint">
      {translate("relation.inverseStorage", { role: relationName, property: inverseField })}
    </div>}

    <div className="kplex-relation-actions">
      <button aria-label={translate("common.cancel")} onClick={onClose}><ObsidianIcon name="x" size={17} /></button>
      <button className="mod-cta" disabled={busy || (!fixedTarget && !selectedFile)} aria-label={translate("relation.save")} onClick={() => void confirm()}>
        <ObsidianIcon name="check" size={17} />
      </button>
    </div>
  </div>;
}
