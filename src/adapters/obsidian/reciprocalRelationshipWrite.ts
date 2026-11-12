/** Explicit two-document ontology writes with independent durable outcomes. No mirroring, rollback,
 * source inference or background work lives here. A retained receipt retries only missing writes
 * after the caller's policy and exact native file identities have been revalidated. */
import type {App, TFile} from "obsidian";
import type {OntologyConfiguration} from "../../core/contracts/ontologyConfiguration";
import {normalizeFieldName} from "../../core/contracts/fieldName";
import type {RelationshipRole} from "../../core/graph/relations";
import type {RelationEvidence} from "../../core/graph/evidence";
import {SavedRelationshipPendingError} from "./relationshipMetadataWrite";

export type ReciprocalOntologyFields = Readonly<{forward: string; inverse: string}>;

/** Independently authored declarations in both notes cannot be consumed by a one-owner move.
 * This inspects retained provenance only; it does not infer or classify a relationship. */
export function hasIndependentFrontmatterDeclarations(evidence: readonly Pick<RelationEvidence, "sourceKind" | "declaredByPath">[],
  sourcePath: string, targetPath: string): boolean {
  if (sourcePath === targetPath) return false;
  let source = false, target = false;
  for (const item of evidence) {
    if (item.sourceKind !== "frontmatter-ontology") continue;
    source ||= item.declaredByPath === sourcePath;
    target ||= item.declaredByPath === targetPath;
    if (source && target) return true;
  }
  return false;
}

/** Use authored pairing only; symmetric configured friend/challenger fields are self-inverse. */
export function reciprocalOntologyFields(configuration: OntologyConfiguration, selectedField: string,
  semanticRole: RelationshipRole): ReciprocalOntologyFields | null {
  const key = normalizeFieldName(selectedField);
  if (configuration.roles.get(key) !== semanticRole) return null;
  const paired = configuration.pairs.get(key);
  if (paired) return {forward: paired.field, inverse: paired.partner};
  if (semanticRole !== "left" && semanticRole !== "right") return null;
  const fields = semanticRole === "left" ? configuration.hierarchy.leftFriends : configuration.hierarchy.rightFriends;
  const field = fields.find(/** Preserve the configured physical spelling without inventing a counterpart. */ field => normalizeFieldName(field) === key);
  return field ? {forward: field, inverse: field} : null;
}

export type ReciprocalApproval = Readonly<{enabled: false}> | Readonly<{enabled: true; forward: string; inverse: string}>;

/** Shared preflight for existing-note and creation forms, before any physical note/property save. */
export function reciprocalPreflight(configuration: OntologyConfiguration, enabled: boolean, selectedField: string,
  role: RelationshipRole, writableEndpoints: boolean): Readonly<{approval?: ReciprocalApproval; reasonKey?: "reciprocal.requiresMarkdown" | "reciprocal.requiresInverse"}> {
  if (!enabled) return {approval: {enabled: false}};
  if (!writableEndpoints) return {reasonKey: "reciprocal.requiresMarkdown"};
  const fields = reciprocalOntologyFields(configuration, selectedField, role);
  return fields ? {approval: {enabled: true, ...fields}} : {reasonKey: "reciprocal.requiresInverse"};
}

/** Template/remembered-field awaits cannot silently accept a new pairing or changed opt-in consent. */
export function reciprocalApprovalCurrent(approval: ReciprocalApproval, configuration: OntologyConfiguration, enabled: boolean,
  field: string, role: RelationshipRole): boolean {
  if (approval.enabled !== enabled) return false;
  if (!approval.enabled) return true;
  const fields = reciprocalOntologyFields(configuration, field, role);
  return fields?.forward === approval.forward && fields.inverse === approval.inverse;
}

export type ReciprocalWrite = Readonly<{file: TFile; target: TFile; field: string}>;
export type ReciprocalWriteOutcome = Readonly<{path: string; field: string; state: "pending" | "saved" | "saved-pending"}>;
export type ReciprocalWriteReceipt = Readonly<{
  outcomes: readonly ReciprocalWriteOutcome[];
  retry(): Promise<void>;
}>;

/** A failed second write never reports the already durable first declaration as unsaved. */
export class ReciprocalRelationshipWriteError extends Error {
  /** Retain the exact approved operation; retrying it never repeats physical note creation. */
  constructor(readonly receipt: ReciprocalWriteReceipt, message: string, readonly reason: unknown) {
    super(message);
    this.name = "ReciprocalRelationshipWriteError";
  }
  /** Supply current per-file outcomes after an idempotent retry without exposing mutable state. */
  get outcomes(): readonly ReciprocalWriteOutcome[] { return this.receipt.outcomes; }
}

/** Capture two approved Markdown declarations and fence every queued/native write against changes.
 * The supplied writer must recheck `current` inside its actual frontmatter mutation callback.
 * Saved-but-unpublished native writes count as durable and are never replayed by this receipt. */
export function createReciprocalWriteReceipt(options: Readonly<{
  app: Pick<App, "vault">;
  first: ReciprocalWrite;
  second: ReciprocalWrite;
  current(): boolean;
  write(write: ReciprocalWrite, current: () => boolean): Promise<void>;
  afterWrites?(): Promise<void>;
  failureMessage(): string;
  unavailableMessage(): string;
}>): ReciprocalWriteReceipt {
  const writes = [{...options.first}, {...options.second}] as const;
  const captured: Array<{write: ReciprocalWrite; path: string; targetPath: string; state: ReciprocalWriteOutcome["state"]}> = writes.map(/** Each declaration retains the physical endpoint incarnations approved at preflight. */ write => ({
    write, path: write.file.path, targetPath: write.target.path, state: "pending",
  }));
  let inFlight: Promise<void> | null = null;
  /** The caller owns preference/pairing lifetime; this adapter independently owns native identity. */
  const current = (): boolean => options.current()
    && writes[0].file === writes[1].target && writes[0].target === writes[1].file
    && captured.every(/** Neither endpoint can change its native kind or path while a queued read is pending. */ ({write, path, targetPath}) => Boolean(normalizeFieldName(write.field))
    && write.file.extension === "md" && write.target.extension === "md" && write.file !== write.target
    && write.file.path === path && write.target.path === targetPath
    && options.app.vault.getFileByPath(path) === write.file && options.app.vault.getFileByPath(targetPath) === write.target);
  /** A fresh snapshot cannot let consumers alter which file still needs its approved write. */
  const outcomes = (): readonly ReciprocalWriteOutcome[] => captured.map(({path, write, state}) => ({path, field: write.field, state}));
  const receipt: ReciprocalWriteReceipt = {
    /** Expose detached per-file statuses without allowing UI code to change retry ownership. */
    get outcomes() { return outcomes(); },
    /** Join duplicate activation and retire the operation lease only after independent native completion. */
    retry(): Promise<void> {
      if (inFlight) return inFlight;
      /** Resume only missing declarations and then their existing publication boundary. */
      const run = async (): Promise<void> => {
        try {
          if (!current()) throw new Error(options.unavailableMessage());
          for (const entry of captured) {
            if (entry.state !== "pending") continue;
            if (!current()) throw new Error(options.unavailableMessage());
            try {
              await options.write(entry.write, current);
              entry.state = "saved";
            } catch (error) {
              if (error instanceof SavedRelationshipPendingError) entry.state = "saved-pending";
              throw error;
            }
            if (!current()) throw new Error(options.unavailableMessage());
          }
          if (options.afterWrites) await options.afterWrites();
          if (!current()) throw new Error(options.unavailableMessage());
        } catch (error) {
          throw new ReciprocalRelationshipWriteError(receipt, options.failureMessage(), error);
        }
      };
      // Publish the lease before native code can synchronously echo another submit into the dialog.
      inFlight = Promise.resolve().then(run).finally(/** No pending retry may survive a terminal native outcome. */ () => { inFlight = null; });
      return inFlight;
    },
  };
  return receipt;
}
