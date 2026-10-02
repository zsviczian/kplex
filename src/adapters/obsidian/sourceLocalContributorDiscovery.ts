/**
 * Settings-neutral contributor discovery backed by the durable per-source dependency derivative.
 * Queries touch only requested dependency keys plus the selected owners. Structural facts are
 * reconstructed from bounded current host coordinates with the canonical Obsidian constructors;
 * no Markdown inventory scan, global contributor-catalog bootstrap or graph snapshot is involved.
 */
import { TFile, TFolder, type App } from "obsidian";
import { contributorRecordKeys, MAX_CONTRIBUTOR_ENDPOINTS, type ContributorCertificate,
  type ContributorDiscoveryResult, type ContributorFailure, type ContributorHostStamp,
  type ContributorRequest, type ContributorStructuralFact } from "../../index/SourceContributorDiscovery";
import { SOURCE_MAX_BATCH_RECORDS, SourceFactError, type SourceReason } from "../../index/SourceFacts";
import { sourceLocalDependencyKey } from "../../index/SourceLocalDependencies";
import type { NeutralSourceRepository } from "../../index/SourceRepository";
import type { SourceEntityRef } from "../../core/graph/source";
import { entityFactForFile, entityFactForFolder, structuralFileTreeOccurrence,
  structuralTagMembershipFacts } from "./structuralSourceCollector";

const MAX_QUERY_KEY_BYTES = 256 * 1024;
const GENERATION = "source-local-dependencies-v1";

function bytes(value: string): number { return new TextEncoder().encode(value).byteLength; }
function sameHost(left: ContributorHostStamp, right: ContributorHostStamp): boolean {
  return left.epoch === right.epoch && left.revision === right.revision && left.token === right.token;
}
function failure(reason: SourceReason): ContributorFailure {
  const outcome: ContributorFailure["outcome"] = reason === "cancelled" ? "cancelled"
    : reason === "stale" || reason === "superseded" || reason === "host-catalog-stale" ? "stale"
      : ["storage-unavailable", "newer-database", "read-error", "write-error", "quota-exceeded", "catalog-uncertain"].includes(reason)
        ? "storage-unavailable"
        : ["dependency-invalid", "invalid-frame", "missing-chunk", "missing-posting", "version-mismatch"].includes(reason)
          ? "invalid" : "pending";
  return { outcome, reason };
}

function copyRequest(request: ContributorRequest): ContributorRequest {
  return { kind: request.kind, endpoints: request.endpoints.map((endpoint) => ({ ...endpoint })),
    ...(request.fields ? { fields: [...request.fields] } : {}), ...(request.literals ? { literals: [...request.literals] } : {}) };
}

function queryKeys(request: ContributorRequest): readonly string[] {
  if ((request.kind !== "pair" && request.kind !== "neighborhood") || request.endpoints.length < 1
    || request.endpoints.length > MAX_CONTRIBUTOR_ENDPOINTS || request.kind === "pair" && request.endpoints.length !== 2) {
    throw new SourceFactError("unsupported-scope");
  }
  const keys = new Set<string>();
  for (const endpoint of request.endpoints) {
    if (!endpoint || typeof endpoint.id !== "string" || !endpoint.id || typeof endpoint.kind !== "string"
      || typeof endpoint.state !== "string") throw new SourceFactError("unsupported-scope");
    keys.add(sourceLocalDependencyKey("node", endpoint.id));
    if (endpoint.kind === "tag") keys.add(sourceLocalDependencyKey("family", "tag-tree"));
  }
  for (const [kind, values] of [["field", request.fields], ["literal", request.literals]] as const) {
    for (const value of values ?? []) {
      if (typeof value !== "string") throw new SourceFactError("unsupported-scope");
      keys.add(sourceLocalDependencyKey(kind, value));
    }
  }
  if (keys.size > SOURCE_MAX_BATCH_RECORDS || [...keys].reduce((total, key) => total + bytes(key), 0) > MAX_QUERY_KEY_BYTES) {
    throw new SourceFactError("backpressure");
  }
  return [...keys].sort();
}

/** Current structural direct-incidence facts for a finite selected scope; no whole-vault walk. */
async function structuralFacts(app: App, request: ContributorRequest, sourceIds: readonly string[], keys: ReadonlySet<string>,
  current: () => boolean): Promise<readonly ContributorStructuralFact[]> {
  const output: ContributorStructuralFact[] = [];
  const seen = new Set<string>(); let visited = 0;
  const checkpoint = async (): Promise<void> => {
    if (++visited % SOURCE_MAX_BATCH_RECORDS !== 0) return;
    await new Promise<void>(resolve => window.setTimeout(resolve, 0));
    if (!current()) throw new SourceFactError("host-catalog-stale");
  };
  const add = async (fact: ContributorStructuralFact): Promise<void> => {
    let relevant = false;
    for (const key of contributorRecordKeys(fact)) if (keys.has(key)) { relevant = true; break; }
    if (!relevant) { await checkpoint(); return; }
    const identity = JSON.stringify(fact);
    if (!seen.has(identity)) { seen.add(identity); output.push(fact); }
    await checkpoint();
  };
  const addFile = async (file: TFile): Promise<void> => {
    await add(entityFactForFile(file));
    if (file.parent) await add(structuralFileTreeOccurrence(file.parent, file));
    if (file.extension === "md") for (const fact of structuralTagMembershipFacts(file, app.metadataCache)) await add(fact);
  };
  const addFolder = async (folder: TFolder): Promise<void> => {
    await add(entityFactForFolder(folder));
    if (folder.parent) await add(structuralFileTreeOccurrence(folder.parent, folder));
    for (const child of folder.children) {
      if (!(child instanceof TFile) && !(child instanceof TFolder)) throw new SourceFactError("host-catalog-stale");
      await add(structuralFileTreeOccurrence(folder, child));
    }
  };

  for (const sourceId of sourceIds) {
    if (!current()) throw new SourceFactError("host-catalog-stale");
    const file = app.vault.getFileByPath(sourceId);
    if (!(file instanceof TFile) || file.extension !== "md") throw new SourceFactError("host-catalog-stale");
    await addFile(file);
  }
  for (const literal of request.literals ?? []) {
    const host = literal === "" || literal === "/" ? app.vault.getRoot()
      : app.vault.getFileByPath(literal) ?? app.vault.getFolderByPath(literal);
    if (host instanceof TFile) await addFile(host);
    else if (host instanceof TFolder) await addFolder(host);
  }
  for (const endpoint of request.endpoints) {
    if (endpoint.physicalPath === undefined) continue;
    const host = endpoint.kind === "container"
      ? endpoint.physicalPath === "" || endpoint.physicalPath === "/" ? app.vault.getRoot() : app.vault.getFolderByPath(endpoint.physicalPath)
      : app.vault.getFileByPath(endpoint.physicalPath);
    if (host instanceof TFile) await addFile(host);
    else if (host instanceof TFolder) await addFolder(host);
    else throw new SourceFactError("host-catalog-stale");
  }
  return output;
}

/** Hash a potentially high-degree certificate cooperatively instead of one giant JSON.stringify. */
async function selectionDigest(repository: NeutralSourceRepository, sources: readonly unknown[], hostFacts: readonly unknown[],
  order: readonly number[] | undefined, current: () => boolean): Promise<string> {
  let digest = await repository.observationDigest(JSON.stringify([GENERATION, "scope-local"]));
  for (const [label, values] of [["sources", sources], ["hostFacts", hostFacts], ["order", order ?? []]] as const) {
    for (let offset = 0; offset < values.length; offset += SOURCE_MAX_BATCH_RECORDS) {
      if (!current()) throw new SourceFactError("host-catalog-stale");
      digest = await repository.observationDigest(JSON.stringify([digest, label, values.slice(offset, offset + SOURCE_MAX_BATCH_RECORDS)]));
      await new Promise<void>(resolve => window.setTimeout(resolve, 0));
    }
  }
  return digest;
}

/** Structural subtype used by the existing cached readers without requiring the global catalog. */
export class SourceLocalContributorDiscovery {
  private queries = 0;
  constructor(private readonly repository: NeutralSourceRepository, private readonly app: App,
    private readonly stamp: ContributorHostStamp, private readonly current: () => boolean) {}

  isHostCurrent(): boolean { return this.current(); }

  async discover(request: ContributorRequest): Promise<ContributorDiscoveryResult> {
    return this.discoverOrdered(request, false);
  }

  async discoverUrlTitle(endpoint: SourceEntityRef): Promise<ContributorDiscoveryResult> {
    if (!endpoint || endpoint.kind !== "url" || endpoint.state !== "materialized" || !endpoint.semanticPath
      || endpoint.physicalPath !== undefined) return failure("unsupported-scope");
    return this.discoverOrdered({ kind: "neighborhood", endpoints: [{ ...endpoint }] }, true);
  }

  private async discoverOrdered(input: ContributorRequest, markdownOrder: boolean): Promise<ContributorDiscoveryResult> {
    if (this.queries >= 2) return failure("backpressure");
    this.queries += 1;
    try {
      if (!this.current()) throw new SourceFactError("host-catalog-stale");
      const scope = copyRequest(input), keys = queryKeys(scope), keySet = new Set(keys);
      const selected = await this.repository.lookupLocalDependencies(keys, this.current);
      if (selected.outcome !== "ready") return failure(selected.reason);
      if (!this.current()) throw new SourceFactError("host-catalog-stale");
      const entries = selected.value.sources.map((stamp, index) => ({ stamp,
        order: selected.value.orders[index], markdownOrder: selected.value.markdownOrders[index] }));
      if (markdownOrder) entries.sort((left, right) => left.markdownOrder - right.markdownOrder || left.stamp.head.sourceId.localeCompare(right.stamp.head.sourceId));
      const sources = entries.map((entry) => entry.stamp);
      const sourceIds = sources.map((stamp) => stamp.head.sourceId);
      const hostFacts = (await structuralFacts(this.app, scope, sourceIds, keySet, this.current)).map((fact, order) => ({ order, fact }));
      const order = markdownOrder ? entries.map((entry) => entry.markdownOrder) : undefined;
      if (order && order.some((value, index) => !Number.isSafeInteger(value) || value < 0 || index > 0 && value <= order[index - 1])) {
        throw new SourceFactError("dependency-invalid");
      }
      const dependencyDigest = await this.repository.observationDigest(JSON.stringify([GENERATION, selected.value.fence]));
      if (!this.current()) throw new SourceFactError("host-catalog-stale");
      const scopeIdentity = await this.repository.observationDigest(JSON.stringify(scope));
      const selectionIdentity = await selectionDigest(this.repository, sources, hostFacts, order, this.current);
      if (!this.current()) throw new SourceFactError("host-catalog-stale");
      const certificate: ContributorCertificate = {
        coverage: "complete-direct-contributors", scope, scopeIdentity,
        dependency: { ...selected.value.fence, generation: GENERATION, slot: 0, digest: dependencyDigest },
        host: { ...this.stamp }, sources, hostFacts, hostFactOrder: "scope-local",
        ...(order === undefined ? {} : { markdownOrder: order }), selectionIdentity,
      };
      const checked = await this.revalidate(certificate);
      if (checked !== "ready") throw new SourceFactError(checked);
      return { outcome: "ready", ...certificate, sourceIds,
        work: { buckets: 0, pages: 0, bytes: 0, sourceOwners: sourceIds.length, hostFacts: hostFacts.length } };
    } catch (error) { return failure(error instanceof SourceFactError ? error.reason : "read-error"); }
    finally { this.queries -= 1; }
  }

  async revalidate(certificate: ContributorCertificate): Promise<SourceReason> {
    try {
      if (!this.current() || !sameHost(certificate.host, this.stamp) || certificate.coverage !== "complete-direct-contributors"
        || certificate.hostFactOrder !== "scope-local" || certificate.dependency.generation !== GENERATION || certificate.dependency.slot !== 0
        || certificate.scopeIdentity !== await this.repository.observationDigest(JSON.stringify(certificate.scope))) return "superseded";
      const digest = await this.repository.observationDigest(JSON.stringify([GENERATION,
        { revision: certificate.dependency.revision, sequence: certificate.dependency.sequence }]));
      if (digest !== certificate.dependency.digest) return "dependency-invalid";
      const selection = await selectionDigest(this.repository, certificate.sources, certificate.hostFacts, certificate.markdownOrder, this.current);
      if (selection !== certificate.selectionIdentity) return "dependency-invalid";
      if (certificate.markdownOrder !== undefined && (certificate.markdownOrder.length !== certificate.sources.length
        || certificate.markdownOrder.some((value, index, values) => !Number.isSafeInteger(value) || value < 0
          || index > 0 && value <= values[index - 1]))) return "dependency-invalid";
      return await this.repository.validateLocalDependencies(
        { revision: certificate.dependency.revision, sequence: certificate.dependency.sequence }, certificate.sources, this.current);
    } catch (error) { return error instanceof SourceFactError ? error.reason : "read-error"; }
  }
}
