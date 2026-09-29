/**
 * Host-bound central-note content and relationship pane. Display labels are localized while note text, semantic paths and vault properties retain their original values.
 */
import { MarkdownRenderer, type Component } from "obsidian";
import { useEffect, useRef, useState } from "react";
import type KplexPlugin from "../main";
import type { GraphPage, Role } from "../types";
import type { GraphIndex } from "../index/GraphIndex";
import { ObsidianIcon } from "./ObsidianIcon";
import type { PlainTranslationKey } from "../lang";
const CONTENT_ROLE_LABEL: Record<Role, PlainTranslationKey> = {
  parent: "content.roleParent",
  child: "content.roleChild",
  left: "content.roleLeft",
  right: "content.roleRight",
  previous: "content.rolePrevious",
  next: "content.roleNext",
  sibling: "content.roleSibling",
};


/** Render the current note/relationship content with localized role headings while preserving user-authored content. */
export function ContentPane({ plugin, index, page, owner, onOpen, onActivate }: {
  plugin: KplexPlugin;
  index: GraphIndex;
  page: GraphPage;
  owner: Component;
  onOpen: () => void;
  onActivate: (page: GraphPage) => void;
}) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.replaceChildren();
    let cancelled = false;

    const render = async () => {
      if (!page.file || page.file.extension !== "md") return;
      setLoading(true);
      const markdown = await plugin.app.vault.cachedRead(page.file);
      if (cancelled) return;
      el.replaceChildren();
      await MarkdownRenderer.render(plugin.app, markdown, el, page.file.path, owner);
      if (!cancelled) setLoading(false);
    };
    void render();
    return () => { cancelled = true; };
  }, [page.path, page.file, owner, plugin]);

  const neighbours = [
    ...index.neighbours(page, "parent"),
    ...index.neighbours(page, "child"),
    ...index.neighbours(page, "left"),
    ...index.neighbours(page, "right"),
    ...index.neighbours(page, "previous"),
    ...index.neighbours(page, "next")
  ];
  const unique = [...new Map(neighbours.map((n) => [n.page.path, n])).values()].slice(0, 24);

  return <aside className="kplex-content-pane">
    <header className="kplex-content-header">
      <div className="kplex-content-kicker">{plugin.translator("content.activeThought")}</div>
      <h2>{index.titleFor(page)}</h2>
      <div className="kplex-content-path">{page.path}</div>
      <div className="kplex-content-actions">
        {(page.file || page.url) && <button onClick={onOpen}>{plugin.translator("common.open")}</button>}
        {!page.file && !page.url && !page.isFolder && !page.isTag && <button onClick={() => void plugin.createGhostNote(page)}>{plugin.translator("content.createNote")}</button>}
      </div>
    </header>

    <div className="kplex-content-scroll">
      {page.url && <div className="kplex-special-content"><div className="kplex-special-icon"><ObsidianIcon name="globe" size={32} /></div><a className="external-link" href={page.url} target="_blank" rel="noopener">{page.url}</a></div>}
      {page.isFolder && <div className="kplex-special-content"><div className="kplex-special-icon"><ObsidianIcon name="folder" size={32} /></div><p>{plugin.translator("content.folderThought")}</p></div>}
      {page.isTag && <div className="kplex-special-content"><div className="kplex-special-icon"><ObsidianIcon name="tag" size={32} /></div><p>{plugin.translator("content.tagThought")}</p></div>}
      {page.file && page.file.extension !== "md" && <div className="kplex-special-content"><div className="kplex-special-icon"><ObsidianIcon name="paperclip" size={32} /></div><p>{page.file.name}</p></div>}
      {loading && <div className="kplex-loading">{plugin.translator("content.rendering")}</div>}
      <div ref={contentRef} className="kplex-markdown markdown-rendered" />

      {unique.length > 0 && <section className="kplex-mapped-links">
        <h3>{plugin.translator("content.mappedLinks")}</h3>
        <div className="kplex-mapped-list">
          {unique.map((n) => <button key={n.page.path} onClick={() => onActivate(n.page)}><span>{index.titleFor(n.page)}</span><small>{plugin.translator(CONTENT_ROLE_LABEL[n.role])}</small></button>)}
        </div>
      </section>}
    </div>
  </aside>;
}
