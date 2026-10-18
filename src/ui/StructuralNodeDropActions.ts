/** Host composition for explicit tag membership and physical moves; semantic relationship policy stays unchanged. */
import { Notice, type App, type TFile } from "obsidian";
import type { GraphPage } from "../types";
import type { Translator } from "../lang";
import { appendTagMembership, removeTagMembership, graphTagValue, hasYamlTagMembership } from "../adapters/obsidian/tagMembership";
import { preparePhysicalMove } from "../adapters/obsidian/physicalNodeMove";
import { SavedRelationshipPendingError } from "../adapters/obsidian/relationshipMetadataWrite";
import { MoveToFolderModal } from "./MoveToFolderModal";

/** Cheap capability checks serve hover and dispatch without reading note bodies or source storage. */
export function structuralDropKind(origin: GraphPage, target: GraphPage): "tag" | "move" | null {
  if (origin.transient || target.transient || origin.path === target.path || origin.isTag || origin.url) return null;
  if (target.isTag && origin.file?.extension === "md") return "tag";
  if (target.isFolder && (origin.file || origin.isFolder)) return "move";
  return null;
}

export class StructuralNodeDropActions {
  private disposed = false;
  private readonly dialogs = new Set<MoveToFolderModal>();
  private readonly tagQueues = new WeakMap<TFile, Promise<void>>();

  /** Reuse the plugin's metadata write observer; this owner adds only explicit interaction lifetime. */
  constructor(private readonly app: App, private readonly translate: Translator,
    private readonly write: (file: TFile, fields: ReadonlySet<string>, mutate: (frontmatter: Record<string, unknown>) => void) => Promise<void>) {}

  /** Consume only supported structural targets; moves need native confirmation, tags need an explicit drop. */
  open(origin: GraphPage, target: GraphPage): boolean {
    if (this.disposed) return false;
    const kind = structuralDropKind(origin, target);
    if (kind === "move") {
      const prepared = preparePhysicalMove(this.app, origin, target);
      if (!prepared.ok) { new Notice(this.translate(`moveNode.${prepared.reason}`)); return true; }
      const modal = new MoveToFolderModal(this.app, prepared.plan, this.translate,
        /** Plugin unload fences unsubmitted operations and late notices. */ () => !this.disposed,
        /** Remove exactly the shell that retired. */ () => { this.dialogs.delete(modal); });
      this.dialogs.add(modal); modal.open(); return true;
    }
    const tag = kind === "tag" ? graphTagValue(target) : null;
    const file = origin.file;
    if (!tag || !file) return false;
    void (/** Convert accepted drop completion into a truthful native notice, including saved-pending outcomes. */ async () => {
      try {
        const added = await this.editTag(file, /** Native read-modify-write preserves unrelated properties and concurrent values. */ frontmatter => appendTagMembership(frontmatter, tag, this.translate("tagDrop.invalid")));
        if (!this.disposed) new Notice(this.translate(added ? "tagDrop.added" : "tagDrop.existing", { tag: `#${tag}`, name: file.basename }));
      } catch (error) {
        if (!this.disposed && !(error instanceof SavedRelationshipPendingError && error.noticeReported)) new Notice(error instanceof Error ? error.message : String(error));
      }
    })();
    return true;
  }

  /** Unlink uses the same per-file queue as drop assignment and never edits inline Markdown tags. */
  unlink(note: GraphPage, target: GraphPage, current: () => boolean): Promise<boolean> {
    const tag = graphTagValue(target), file = note.file;
    if (!tag || !file || file.extension !== "md") return Promise.resolve(false);
    return this.editTag(file, /** Remove only the exact current native property membership. */ frontmatter => removeTagMembership(frontmatter, tag, this.translate("tagDrop.invalid")), current,
      /** Evaluate after prior accepted edits; uncertain/inline-only data remains inspection-only. */ frontmatter => hasYamlTagMembership(frontmatter, tag));
  }

  /** Serialize exact saved observations; failures do not poison later actions or grant stale write authority. */
  private editTag(file: TFile, mutate: (frontmatter: Record<string, unknown>) => boolean, current: () => boolean = /** Drop actions retain plugin ownership after leaving their source surface. */ () => true,
    needed?: (frontmatter: Record<string, unknown>) => boolean): Promise<boolean> {
    const path = file.path;
    const next = (this.tagQueues.get(file) ?? Promise.resolve()).then(/** Unsubmitted queued mutations require this exact physical incarnation and current invocation. */ async () => {
      if (this.disposed || !current() || file.path !== path || this.app.vault.getFileByPath(path) !== file) return false;
      if (needed && !needed(this.app.metadataCache.getFileCache(file)?.frontmatter ?? {})) return false;
      let changed = false;
      await this.write(file, new Set(["tags"]), /** Recheck invocation authority inside FileManager's asynchronous read-modify-write callback. */ frontmatter => {
        if (this.disposed || !current()) throw new Error(this.translate("addRelated.endpointChanged"));
        changed = mutate(frontmatter);
      });
      return changed;
    });
    this.tagQueues.set(file, next.then(/** Keep the serialization tail independent of the operation's result. */ () => {}, /** A failed native write leaves future explicit attempts available. */ () => {}));
    return next;
  }

  /** Close owned prompts and prevent queued, unaccepted writes after unload. Accepted writes retain native ownership. */
  dispose(): void { this.disposed = true; for (const dialog of this.dialogs) dialog.close(); this.dialogs.clear(); }
}
