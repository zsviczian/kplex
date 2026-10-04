/**
 * Storage-only vocabulary for the C2 owner repair journal. A ticket retains the original catalog
 * commitment and selected head before a writer can replace either. Its bounded, detached impact is
 * repair evidence, never query readiness or ticket retirement. SourceRepository owns transactions
 * and leases; discovery authenticates summary pages and the host adapter owns host observations.
 */
import {
  SOURCE_CHUNK_TARGET_BYTES, SOURCE_DEPENDENCY_ROOT_BYTES, decodeSourceHead, sourceCount,
  sourceObject, validSourceDependencyBuild, type SourceDependencyBuild, type SourceHead,
} from "./SourceFacts";

export const SOURCE_IMPACT_ENABLED_KEY = "source-impact-enabled";
export const SOURCE_IMPACT_STORE = "sourceImpacts";
export const SOURCE_IMPACT_SLOT_INDEX = "rootSlot";
export const SOURCE_IMPACT_LEASE_INDEX = "sourceImpactSlot";
export const SOURCE_IMPACT_ROOT_PREFIX = "source-impact-root:";
export const SOURCE_IMPACT_DATA_BYTES = SOURCE_CHUNK_TARGET_BYTES;
export const SOURCE_IMPACT_RECORD_BYTES = SOURCE_DEPENDENCY_ROOT_BYTES * 2;
/** Source identity and structural-host ownership are intentionally separate namespaces. */
export type ContributorJournalOwner = Readonly<{ kind: "source"; sourceId: string }>
  | Readonly<{ kind: "host"; id: "catalog" }>;
/** Invalid/missing durable state is explicit; neither is a materialized source. */
export type ContributorJournalSelection = Readonly<{ kind: "missing" }> | Readonly<{ kind: "invalid" }>
  | Readonly<{ kind: "head"; head: SourceHead }>;
/** Event observations are not a complete resolver/referrer transition certificate. */
export type ContributorHostChange = Readonly<{
  epoch: string; from: number; to: number;
  kind: "source" | "topology" | "resolution" | "environment";
}>;
/** Reference one of two shared immutable root anchors; never duplicate the full root per dirty owner. */
export type ContributorJournalRoot = Readonly<{ build: SourceDependencyBuild; digest: string }>;
/** One replaceable owner ticket, retaining the FIRST anchor across overlapping mutations. */
export type ContributorJournalRecord = Readonly<{
  version: 1;
  owner: string;
  subject: ContributorJournalOwner;
  ticket: string;
  slot: -1 | 0 | 1;
  root: ContributorJournalRoot | null;
  original: ContributorJournalSelection;
  before: ContributorJournalSelection;
  selected: ContributorJournalSelection | null;
  change: ContributorHostChange | null;
  status: "unknown" | "known";
  impact: Readonly<{ data: string; digest: string }> | null;
}>;

/** Encode exact opaque identities without deriving a NodeId or normalizing either path facet. */
export function contributorJournalKey(owner: ContributorJournalOwner): string {
  return JSON.stringify(owner.kind === "source" ? ["source", owner.sourceId] : ["host", owner.id]);
}
/** Capture an IDB selection without fabricating a head from corrupt or absent data. */
export function contributorJournalSelection(raw: unknown): ContributorJournalSelection {
  if (raw === undefined) return { kind: "missing" };
  const head = decodeSourceHead(raw);
  return head ? { kind: "head", head } : { kind: "invalid" };
}
/** Compare exact captured heads, including incarnation, family commitments and durable sequence. */
export function sameContributorSelection(left: ContributorJournalSelection, right: ContributorJournalSelection): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
/** Strict bounded event shape; the closed reason vocabulary carries no arbitrary host metadata. */
export function validContributorHostChange(value: unknown): value is ContributorHostChange {
  return sourceObject(value) && Object.keys(value).length === 4 && typeof value.epoch === "string" && !!value.epoch
    && sourceCount(value.from) && sourceCount(value.to) && value.to > value.from
    && ["source", "topology", "resolution", "environment"].includes(String(value.kind));
}
/** Check the finite snapshot envelope before using it as a transaction/repair coordinate. */
function selection(value: unknown): value is ContributorJournalSelection {
  return sourceObject(value) && (Object.keys(value).length === 1 && (value.kind === "missing" || value.kind === "invalid")
    || Object.keys(value).length === 2 && value.kind === "head" && decodeSourceHead(value.head) !== null);
}
/** Validate journal framing only. The original root/pages and impact digests need authentication. */
export function validContributorJournalRecord(value: unknown): value is ContributorJournalRecord {
  if (!sourceObject(value) || Object.keys(value).length !== 12 || value.version !== 1
    || !sourceObject(value.subject) || Object.keys(value.subject).length !== 2
    || typeof value.ticket !== "string" || !value.ticket || typeof value.owner !== "string"
    || !selection(value.original) || !selection(value.before) || value.selected !== null && !selection(value.selected)
    || value.change !== null && !validContributorHostChange(value.change)) return false;
  const subject = value.subject;
  if (!(subject.kind === "source" && typeof subject.sourceId === "string" && !!subject.sourceId
    && value.owner === contributorJournalKey({ kind: "source", sourceId: subject.sourceId })
    || subject.kind === "host" && subject.id === "catalog"
    && value.owner === contributorJournalKey({ kind: "host", id: "catalog" }))) return false;
  for (const captured of [value.original, value.before, value.selected]) {
    if (captured?.kind === "head" && (subject.kind !== "source" || captured.head.sourceId !== subject.sourceId)) return false;
  }
  if (value.root === null ? value.slot !== -1 : !sourceObject(value.root) || Object.keys(value.root).length !== 2
    || !validSourceDependencyBuild(value.root.build) || typeof value.root.digest !== "string" || !/^[a-f0-9]{64}$/.test(value.root.digest)
    || value.slot !== value.root.build.slot) return false;
  if (value.status === "unknown") return value.impact === null;
  return value.status === "known" && value.selected !== null && sourceObject(value.impact)
    && Object.keys(value.impact).length === 2 && typeof value.impact.data === "string"
    && value.impact.data.length <= SOURCE_IMPACT_DATA_BYTES
    && typeof value.impact.digest === "string" && /^[a-f0-9]{64}$/.test(value.impact.digest);
}
/** Bind impact bytes to all immutable authority coordinates, excluding the eventual impact itself. */
export function contributorJournalAuthority(record: ContributorJournalRecord): string {
  return JSON.stringify(["source-impact-authority-v1", record.owner, record.ticket, record.root,
    record.original, record.before, record.selected, record.change]);
}
