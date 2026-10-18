/** Host composition for explicit tag membership and physical moves; semantic relationship policy stays unchanged. */
import { Notice, type App, type TFile, type Modal, type TAbstractFile } from "obsidian";
import type { GraphPage } from "../types";
import type { Translator } from "../lang";
import { graphTagValue, hasYamlTagMembership } from "../adapters/obsidian/tagMembership";
import { preparePhysicalMove, commitPhysicalMove } from "../adapters/obsidian/physicalNodeMove";
import { assignTag, demoteNoteType, noteTypeSelection, unlinkTagAssignment, type TagAssignment } from "../adapters/obsidian/tagNoteType";
import { SavedRelationshipPendingError } from "../adapters/obsidian/relationshipMetadataWrite";
import { MoveToFolderModal } from "./MoveToFolderModal";
import { TagAssignmentModal } from "./TagAssignmentModal";
import { tagMembershipPair } from "./structuralConnectionActions";
import { normalizeFieldName } from "../core/contracts/fieldName";

/** Cheap capability checks serve hover and dispatch without reading note bodies or source storage. */
export function structuralDropKind(origin: GraphPage, target: GraphPage): "tag" | "move" | null {
  if (origin.transient || target.transient || origin.path === target.path || origin.url || target.url) return null;
  if (tagMembershipPair(origin, target)) return "tag";
  if (target.isFolder && (origin.file || origin.isFolder)) return "move";
  if (origin.isFolder && target.file) return "move";
  return null;
}

/** Area geometry keeps its normal meaning: a tag/folder is a parent of its member note/file. */
export function structuralAreaDrop(origin: GraphPage, target: GraphPage, role: string): boolean {
  const kind = structuralDropKind(origin, target);
  return kind !== null && role === (origin.isTag || origin.isFolder ? "child" : "parent");
}

export class StructuralNodeDropActions {
  private disposed = false;
  private readonly dialogs = new Set<Modal>();
  private readonly tagQueues = new WeakMap<TFile, Promise<void>>();
  private readonly moving = new WeakSet<TAbstractFile>();

  /** Reuse the plugin's metadata write observer; this owner adds only explicit interaction lifetime. */
  constructor(private readonly app: App, private readonly translate: Translator,
    private readonly write: (file: TFile, fields: ReadonlySet<string>, mutate: (frontmatter: Record<string, unknown>) => void) => Promise<void>,
    private readonly noteTypeField: () => string) {}

  /** Consume only supported structural targets; moves need native confirmation, tags need an explicit drop. */
  open(origin: GraphPage, target: GraphPage, options: {immediateMove?: boolean} = {}): boolean {
    if (this.disposed) return false;
    const kind = structuralDropKind(origin, target);
    if (kind === "move") {
      const prepared = origin.isFolder && target.file ? preparePhysicalMove(this.app, target, origin) : preparePhysicalMove(this.app, origin, target);
      if (!prepared.ok) { new Notice(this.translate(`moveNode.${prepared.reason}`)); return true; }
      if (options.immediateMove) {
        const {plan} = prepared;
        if (this.moving.has(plan.source)) return true;
        this.moving.add(plan.source);
        void (async () => {
          try {
            if (this.disposed) return;
            const result = await commitPhysicalMove(this.app, plan);
            if (!this.disposed && (!result.ok || result.warning)) new Notice(this.translate(!result.ok ? `moveNode.${result.reason}` : "moveNode.movedWarning"));
          } catch (error) {if (!this.disposed) new Notice(this.translate("moveNode.failed", {error: error instanceof Error ? error.message : String(error)}));}
          finally {this.moving.delete(plan.source);}
        })();
        return true;
      }
      const modal = new MoveToFolderModal(this.app, prepared.plan, this.translate,
        /** Plugin unload fences unsubmitted operations and late notices. */ () => !this.disposed,
        /** Remove exactly the shell that retired. */ () => { this.dialogs.delete(modal); });
      this.dialogs.add(modal); modal.open(); return true;
    }
    const pair = kind === "tag" ? tagMembershipPair(origin, target) : null;
    return pair ? this.assign(pair.note, pair.tag) : false;
  }

  /** Drag and conversion share a native draft, one per-file queue and fresh conflict decisions. */
  assign(note: GraphPage, target: GraphPage, initial: TagAssignment = "tag", convert = false, current: () => boolean = () => true): boolean {
    const tag = graphTagValue(target), file = note.file, field = this.noteTypeField();
    if (this.disposed || !tag || !file || file.extension !== "md") return false;
    const path = file.path;
    const selection = noteTypeSelection(this.app.metadataCache.getFileCache(file)?.frontmatter ?? {}, field);
    const dialog = new TagAssignmentModal(this.app, {tag, name: file.basename, field, selection, initial, convert,
      translate: this.translate, current: () => !this.disposed && current(), retired: () => this.dialogs.delete(dialog),
      save: async (assignment, opening, conflict, live) => {
        if (file.path !== path || this.app.vault.getFileByPath(path) !== file) throw new Error(this.translate("addRelated.endpointChanged"));
        const fields = new Set(["tags", ...(assignment === "note-type" || convert ? [field] : [])]);
        try {
          await this.editTag(file, frontmatter => {
            if (assignment === "note-type" || convert) {
              if (this.noteTypeField() !== field) throw new Error(this.translate("tagAssignment.changed"));
            }
            return convert && assignment === "tag"
              ? demoteNoteType(frontmatter, tag, field, opening, this.translate("tagAssignment.invalid"))
              : assignTag(frontmatter, tag, field, assignment, opening, conflict, this.translate("tagAssignment.invalid"));
          }, live, undefined, fields);
        } catch (error) {
          if (error instanceof SavedRelationshipPendingError && !error.noticeReported && !this.disposed) new Notice(error.message);
          throw error;
        }
      },
    });
    this.dialogs.add(dialog); dialog.open(); return true;
  }

  /** Unlink uses the same per-file queue as drop assignment and never edits inline Markdown tags. */
  unlink(note: GraphPage, target: GraphPage, current: () => boolean): Promise<boolean> {
    const tag = graphTagValue(target), file = note.file;
    if (!tag || !file || file.extension !== "md") return Promise.resolve(false);
    const field = this.noteTypeField();
    return this.editTag(file, /** Remove only this exact membership and its matching selector. */ frontmatter => {
      if (this.noteTypeField() !== field) throw new Error(this.translate("tagAssignment.changed"));
      return unlinkTagAssignment(frontmatter, tag, field, this.translate("tagDrop.invalid"));
    }, current,
      /** Evaluate after prior accepted edits; uncertain/inline-only data remains inspection-only. */ frontmatter => hasYamlTagMembership(frontmatter, tag) || noteTypeSelection(frontmatter, field).supported && noteTypeSelection(frontmatter, field).value?.toLocaleLowerCase() === tag.toLocaleLowerCase(), new Set(["tags", field]));
  }

  /** Serialize exact saved observations; failures do not poison later actions or grant stale write authority. */
  private editTag(file: TFile, mutate: (frontmatter: Record<string, unknown>) => boolean, current: () => boolean = /** Drop actions retain plugin ownership after leaving their source surface. */ () => true,
    needed?: (frontmatter: Record<string, unknown>) => boolean, fields: ReadonlySet<string> = new Set(["tags"])): Promise<boolean> {
    const path = file.path;
    const next = (this.tagQueues.get(file) ?? Promise.resolve()).then(/** Unsubmitted queued mutations require this exact physical incarnation and current invocation. */ async () => {
      if (this.disposed || !current() || file.path !== path || this.app.vault.getFileByPath(path) !== file) return false;
      if (needed && !needed(this.app.metadataCache.getFileCache(file)?.frontmatter ?? {})) return false;
      let changed = false;
      await this.write(file, new Set([...fields].map(normalizeFieldName)), /** Recheck invocation authority inside FileManager's asynchronous read-modify-write callback. */ frontmatter => {
        if (this.disposed || !current() || file.path !== path || this.app.vault.getFileByPath(path) !== file) throw new Error(this.translate("addRelated.endpointChanged"));
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
