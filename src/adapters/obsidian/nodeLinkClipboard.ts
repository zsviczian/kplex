/**
 * Obsidian clipboard boundary for explicit K-Plex node copies. A private HTML receipt identifies
 * owned pastes; native link generation runs with the actual receiving Markdown file. Plain text
 * remains a full vault-path wikilink when rich clipboard/paste support is unavailable. No editor
 * shortcut, arbitrary text matching, source acquisition or file mutation is owned here.
 */
import type {App, Editor, MarkdownFileInfo, MarkdownView, TFile} from "obsidian";
import type {GraphPage} from "../../types";
import {tagDisplayName} from "../../core/graph/presentation";
import {ClipboardSession} from "../../application/ClipboardSession";

type CopyTarget = Readonly<{file: TFile; path: string; subpath?: string}>;
type CopyReceipt = {readonly token: string; readonly text: string; capture: Readonly<{target: CopyTarget; current: () => boolean; owner: object}> | null};
type CopyNotice = "copyLink.failed" | "copyLink.fallback" | "copyLink.targetUnavailable";

/** Resolve only real files and meaningful text nodes; folders and display groups have no note link. */
function copyTarget(page: GraphPage): CopyTarget | string | null {
  if (page.isFolder || page.transient?.kind === "group") return null;
  if (page.transient?.kind === "section") return page.file && page.file.path === page.transient.sourcePath && page.transient.subpath
    ? {file: page.file, path: page.file.path, subpath: page.transient.subpath} : null;
  if (page.file) return {file: page.file, path: page.file.path};
  if (page.url) return page.url;
  if (page.isTag) return `#${tagDisplayName(page.path, true).replace(/^#/, "")}`;
  if (page.transient) return null;
  return `[[${page.path.replace(/\r?\n|\r/g, " ")}]]`;
}

/** Escape display text in inert clipboard HTML, independently of native Markdown link formatting. */
function htmlText(text: string): string {return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");}

/** Own at most one native receipt for this plugin lifetime; other copies never inherit authority. */
export class NodeLinkClipboard {
  private receipt: CopyReceipt | null = null;
  private attempt: Readonly<{owner: object; session: ClipboardSession<string | ClipboardItem[]>}> | null = null;
  private disposed = false;

  /** Inject the native host and localized feedback; construction performs no clipboard I/O. */
  constructor(private readonly app: App, private readonly notify: (key: CopyNotice) => void) {}

  /** Check finite target/native clipboard availability without requesting permission or reading data. */
  canCopy(page: GraphPage, document: Document): boolean {
    const target = copyTarget(page), clipboard = document.defaultView?.navigator.clipboard;
    return !this.disposed && target !== null && (typeof target === "string" || this.valid(target))
      && Boolean(clipboard && (typeof clipboard.writeText === "function" || typeof clipboard.write === "function"));
  }

  /** Preserve the exact captured native incarnation; rename/delete/replacement never retargets a paste. */
  private valid(target: CopyTarget): boolean {return target.file.path === target.path && this.app.vault.getFileByPath(target.path) === target.file;}

  /**
   * Start the owning-window write synchronously in the action gesture. Rich writes carry an opaque
   * receipt; unsupported hosts get explicit full-path text. A denied write is reported, never retried
   * after user activation has expired. Later navigation does not expire a still-mounted copy owner.
   */
  copy(page: GraphPage, document: Document, current: () => boolean, sourceOwner: object = document): void {
    const target = copyTarget(page), owner = document.defaultView;
    if (!owner || !this.canCopy(page, document) || target === null || !current()) return;
    this.attempt?.session.dispose();this.attempt = null;
    const clipboard = owner.navigator.clipboard;
    const text = typeof target === "string" ? target : `[[${target.path}${target.subpath ?? ""}]]`;
    const rich = typeof target !== "string" && typeof clipboard.write === "function" && typeof owner.ClipboardItem === "function" && typeof owner.crypto?.randomUUID === "function"
      && (!owner.ClipboardItem.supports || owner.ClipboardItem.supports("text/html"));
    const receipt: CopyReceipt | null = rich && typeof target !== "string" ? {token: owner.crypto.randomUUID(), text, capture: {target, current, owner: sourceOwner}} : null;
    this.receipt = receipt;
    try {
      const payload = receipt ? [new owner.ClipboardItem({
        "text/plain": new owner.Blob([text], {type: "text/plain"}),
        "text/html": new owner.Blob([`<span data-kplex-node-link="${receipt.token}">${htmlText(text)}</span>`], {type: "text/html"}),
      })] : text;
      const session = new ClipboardSession<string | ClipboardItem[]>(payload, /** Capture only this native window's writer; session disposal releases it. */ value =>
        typeof value === "string" ? clipboard.writeText(value) : clipboard.write(value));
      this.attempt = {owner: sourceOwner, session};
      session.listen(/** Shared revocable completion state prevents late notices retaining retired views. */ state => {
        if (state === "failed" && receipt) receipt.capture = null;
        if (this.disposed || !current()) return;
        if (state === "failed") this.notify("copyLink.failed");
        if (state === "copied" && typeof target !== "string" && !receipt) this.notify("copyLink.fallback");
      });
      session.copy();
    } catch {
      if (this.receipt === receipt) this.receipt = null;
      this.notify("copyLink.failed");
    }
  }

  /**
   * Handle only a matching native HTML receipt plus exact plain text. Destination context is the
   * receiving editor's physical file, including embedded/popout editors; ordinary clipboard text,
   * already handled events and missing destination files retain native paste behavior.
   */
  paste(event: ClipboardEvent, editor: Editor, info: MarkdownView | MarkdownFileInfo): void {
    const receipt = this.receipt;
    if (this.disposed || !receipt || event.defaultPrevented || !event.clipboardData) return;
    const html = event.clipboardData.getData("text/html");
    const tokens = [...html.matchAll(/data-kplex-node-link="([a-f0-9-]{36})"/g)];
    if (tokens.length !== 1 || tokens[0][1] !== receipt.token || event.clipboardData.getData("text/plain") !== receipt.text) return;
    const destination = info.file;
    if (!destination || this.app.vault.getFileByPath(destination.path) !== destination) return;
    const capture = receipt.capture;
    if (!capture || !capture.current() || !this.valid(capture.target)) {event.preventDefault(); this.notify("copyLink.targetUnavailable"); return;}
    let link: string;
    try {link = this.app.fileManager.generateMarkdownLink(capture.target.file, destination.path, capture.target.subpath);}
    catch {event.preventDefault(); this.notify("copyLink.failed"); return;}
    event.preventDefault();
    editor.replaceSelection(link); // Native editor transaction/selection/undo ownership stays intact.
  }

  /** Release a retired view's DOM/native references, retaining only a bounded inert stale-paste token. */
  retireOwner(owner: object): void {
    if (this.receipt?.capture?.owner === owner) this.receipt.capture = null;
    if (this.attempt?.owner === owner) {this.attempt.session.dispose();this.attempt = null;}
  }

  /** Retire payload authority and captured view/native references before host listener teardown. */
  dispose(): void {this.disposed = true; this.receipt = null;this.attempt?.session.dispose();this.attempt = null;}
}
