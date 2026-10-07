/**
 * Settings-neutral contributor discovery backed by the durable per-source dependency derivative.
 * Queries touch only requested dependency keys plus the selected owners. Structural facts are
 * reconstructed from bounded current host coordinates with the canonical Obsidian constructors;
 * no Markdown inventory scan, global contributor-catalog bootstrap or graph snapshot is involved.
 * Editable pair discovery also supports a finite document-owner proof while global inventory is
 * unfinished. It certifies exact selected heads and delegates positive/negative evidence to full
 * cached family replay; it never grants global incidence or source-readiness authority.
 * Certificate and structural-fact batches release host event tasks, then recheck the same request
 * lifetime without changing contributor coverage or count/byte bounds.
 */
import { yieldToHostTask } from "./yieldToHostTask";
import { canonicalTagPaths } from "../../core/graph/tagPaths";
import { TFile, TFolder, type App } from "obsidian";
import { contributorRecordKeys, type ContributorCertificate,
  type ContributorDiscoveryResult, type ContributorFailure, type ContributorHostStamp,
  type ContributorRequest, type ContributorStructuralFact } from "../../index/SourceContributorDiscovery";
import { SOURCE_MAX_BATCH_RECORDS, SOURCE_MAX_RECORD_BYTES, SOURCE_CHUNK_TARGET_BYTES, SOURCE_DECODE_BUDGET_BYTES, SourceFactError, type SourceReason } from "../../index/SourceFacts";
import { sourceLocalDependencyKey } from "../../index/SourceLocalDependencies";
import type { NeutralSourceRepository } from "../../index/SourceRepository";
import { sourceRevision, estimateReferenceRecordBytes, type SourceEntityRef } from "../../core/graph/source";
import { entityFactForFile, entityFactForFolder, structuralFileTreeOccurrence,
  structuralTagMembershipFacts } from "./structuralSourceCollector";

const GENERATION = "source-local-dependencies-v3";

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

/** Release each completed contributor batch through a host task, then reject a superseded host lifetime. */
async function requestCheckpoint(index: number, current: () => boolean): Promise<void> {
  if (index === 0 || index % SOURCE_MAX_BATCH_RECORDS !== 0) return;
  await yieldToHostTask();
  if (!current()) throw new SourceFactError("host-catalog-stale");
}

/** Snapshot caller-owned request data completely before the first await; later work may yield freely. */
function copyRequest(request: ContributorRequest): ContributorRequest {
  if (request.endpoints.length * 64 > SOURCE_DECODE_BUDGET_BYTES) throw new SourceFactError("decode-budget");
  return { kind: request.kind, endpoints: request.endpoints.map((endpoint) => ({ ...endpoint })),
    ...(request.fields === undefined ? {} : { fields: [...request.fields] }),
    ...(request.literals === undefined ? {} : { literals: [...request.literals] }) };
}

/** Select finite neutral dependency keys and bound retained request metadata, without scanning owners. */
async function queryKeys(request: ContributorRequest, current: () => boolean, editablePair: boolean): Promise<readonly string[]> {
  if ((request.kind !== "pair" && request.kind !== "neighborhood") || request.endpoints.length < 1
    || request.kind === "pair" && request.endpoints.length !== 2) {
    throw new SourceFactError("unsupported-scope");
  }
  const keys = new Set<string>();
  let retainedBytes = 0;
  let visited = 0;
  const documentPair = editablePair && request.kind === "pair"
    && request.endpoints.some(/** Document declarations own every editable document/non-document pair. */
      endpoint => endpoint.kind === "document");
  for (const endpoint of request.endpoints) {
    if (!endpoint || typeof endpoint.id !== "string" || !endpoint.id || typeof endpoint.kind !== "string"
      || typeof endpoint.state !== "string") throw new SourceFactError("unsupported-scope");
    if (endpoint.kind === "tag") {
      let canonical: string | null = null;
      if (endpoint.semanticPath?.startsWith("tag:")) {
        for (const path of canonicalTagPaths(endpoint.semanticPath.slice(4))) canonical = path;
      }
      if (!canonical || canonical !== endpoint.semanticPath) throw new SourceFactError("unsupported-scope");
      keys.add(sourceLocalDependencyKey("node", canonical));
    } else if (!documentPair || endpoint.kind === "document") {
      // Shared URL/attachment owners cannot contribute a relation to this exact document.
      // Retain both document keys for inverse declarations; no endpoint-incidence claim is made.
      keys.add(sourceLocalDependencyKey("node", endpoint.id));
    }
    // Current local-owner authority includes canonical ancestors; the global tag forest is not
    // a contributor to every individual tag request. Closed-world key counts certify absence.
    retainedBytes += estimateReferenceRecordBytes(endpoint);
    if (retainedBytes > 64 * 1024 * 1024) throw new SourceFactError("decode-budget");
    visited += 1; await requestCheckpoint(visited, current);
  }
  for (const [kind, values] of [["field", request.fields], ["literal", request.literals]] as const) {
    for (const value of values ?? []) {
      if (typeof value !== "string") throw new SourceFactError("unsupported-scope");
      retainedBytes += 128 + 4 * value.length;
      if (retainedBytes > 64 * 1024 * 1024) throw new SourceFactError("decode-budget");
      keys.add(sourceLocalDependencyKey(kind, value));
      visited += 1; await requestCheckpoint(visited, current);
    }
  }
  // A large finite request is paged by the repository. Only a single pathological key is refused;
  // aggregate key bytes would be another cardinality-dependent terminal boundary.
  let checked = 0;
  for (const key of keys) {
    if (bytes(key) > SOURCE_MAX_RECORD_BYTES) throw new SourceFactError("backpressure");
    checked += 1; await requestCheckpoint(checked, current);
  }
  return [...keys];
}

/** Hash certificate inputs with byte/record bounds, release each page through a host event task and reject stale request lifetimes. */
async function digestCertificateValues(repository: NeutralSourceRepository, digest: string, label: string,
  values: readonly unknown[], current: () => boolean): Promise<string> {
  for (let start = 0; start < values.length;) {
    let end = start, retained = 0;
    while (end < values.length && end - start < SOURCE_MAX_BATCH_RECORDS) {
      const size = estimateReferenceRecordBytes(values[end]);
      if (size > SOURCE_DECODE_BUDGET_BYTES) throw new SourceFactError("decode-budget");
      if (end > start && retained + size > SOURCE_CHUNK_TARGET_BYTES) break;
      retained += size; end++;
    }
    if (!current()) throw new SourceFactError("host-catalog-stale");
    digest = await repository.observationDigest(JSON.stringify([digest, label, values.slice(start, end)]));
    await yieldToHostTask();
    if (!current()) throw new SourceFactError("host-catalog-stale");
    start = end;
  }
  return digest;
}

/** Hash scope identity in bounded slices instead of serializing one arbitrarily large endpoint array. */
async function scopeDigest(repository: NeutralSourceRepository, scope: ContributorRequest,
  current: () => boolean, editablePair = false): Promise<string> {
  let digest = await repository.observationDigest(JSON.stringify([GENERATION, editablePair, "scope", scope.kind,
    scope.fields === undefined, scope.literals === undefined]));
  for (const [label, values] of [["endpoints", scope.endpoints], ["fields", scope.fields ?? []], ["literals", scope.literals ?? []]] as const) {
    digest = await digestCertificateValues(repository, digest, label, values, current);
  }
  if (!current()) throw new SourceFactError("host-catalog-stale");
  return digest;
}

/** Current structural direct-incidence facts for a finite selected scope; no whole-vault walk. */
async function structuralFacts(app: App, request: ContributorRequest, sourceIds: readonly string[], keys: ReadonlySet<string>,
  current: () => boolean): Promise<readonly ContributorStructuralFact[]> {
  const output: ContributorStructuralFact[] = [];
  const folders = new Map<TFolder, ReturnType<typeof entityFactForFolder>>();
  /** Hash each selected folder once per fenced request, rather than once per child/source. */
  const folderFact = (folder: TFolder): ReturnType<typeof entityFactForFolder> => {
    let fact = folders.get(folder);
    if (!fact) { fact = entityFactForFolder(folder); folders.set(folder, fact); }
    return fact;
  };
  const seen = new Map<string, Set<string>>(); let visited = 0, retainedBytes = 0;
  /** Cooperate while constructing structural facts; never expose a partial host stream. */
  const checkpoint = async (): Promise<void> => {
    if (++visited % SOURCE_MAX_BATCH_RECORDS !== 0) return;
    await yieldToHostTask();
    if (!current()) throw new SourceFactError("host-catalog-stale");
  };
  /** Retain only relevant, compactly deduplicated facts under the aggregate structural budget. */
  const add = async (fact: ContributorStructuralFact, requestedIdentity = false): Promise<void> => {
    let relevant = requestedIdentity;
    for (const key of contributorRecordKeys(fact)) if (keys.has(key)) { relevant = true; break; }
    if (!relevant && fact.kind === "tag-tree" && fact.membership === "entity-member") {
      for (const path of canonicalTagPaths(fact.provenance?.rawValue ?? "")) {
        if (keys.has(sourceLocalDependencyKey("node", path))) { relevant = true; break; }
      }
    }
    if (!relevant) { await checkpoint(); return; }
    // Structural constructors are deterministic for a current source/target pair. Deduplicate
    // compact exact IDs per kind/source instead of retaining serialized copies of every fact.
    const sourceKey = JSON.stringify([fact.kind, fact.source.id]);
    const target = fact.kind === "entity" ? fact.entity.id : fact.target.entity.id;
    let targets = seen.get(sourceKey);
    if (!targets) { targets = new Set(); seen.set(sourceKey, targets); }
    if (!targets.has(target)) {
      retainedBytes += 2 * estimateReferenceRecordBytes(fact) + 128 + 2 * (sourceKey.length + target.length);
      // Candidate degrees can require both the entity and parent occurrence for all 20,015
      // owners (about 122 MiB under this conservative estimate); retain an explicit ceiling.
      if (retainedBytes > 128 * 1024 * 1024) throw new SourceFactError("decode-budget");
      targets.add(target); output.push(fact);
    }
    await checkpoint();
  };
  /** Supplement one selected file using its current entity, parent and tag memberships. */
  const addFile = async (file: TFile): Promise<void> => {
    await add(entityFactForFile(file));
    if (file.parent) await add(structuralFileTreeOccurrence(file.parent, file, folderFact(file.parent).sourceRevision));
    if (file.extension === "md") for (const fact of structuralTagMembershipFacts(file, app.metadataCache)) await add(fact);
  };
  /** Expand one requested folder using one topology digest shared by its child occurrences. */
  const addFolder = async (folder: TFolder): Promise<void> => {
    await add(folderFact(folder));
    if (folder.parent) await add(structuralFileTreeOccurrence(folder.parent, folder, folderFact(folder.parent).sourceRevision));
    for (const child of folder.children) {
      if (!(child instanceof TFile) && !(child instanceof TFolder)) throw new SourceFactError("host-catalog-stale");
      await add(structuralFileTreeOccurrence(folder, child, folderFact(folder).sourceRevision));
    }
  };

  // Bind requested ancestor identities explicitly; the compiler alone derives hierarchy edges
  // from the genuine descendant memberships below. No opaque ID is decoded into a tag path.
  for (const endpoint of request.endpoints) if (endpoint.kind === "tag") {
    await add({ kind: "entity", source: endpoint, entity: endpoint,
      sourceRevision: sourceRevision(`tag:${endpoint.semanticPath ?? ""}`),
      name: endpoint.semanticPath?.replace(/^tag:/, "") ?? "", url: null, semanticMtime: null }, true);
  }
  for (const sourceId of sourceIds) {
    if (!current()) throw new SourceFactError("host-catalog-stale");
    const file = app.vault.getFileByPath(sourceId);
    if (!(file instanceof TFile) || file.extension !== "md") throw new SourceFactError("host-catalog-stale");
    await addFile(file);
  }
  // Literal file/folder identities are host structural dependencies, not source-owner semantics.
  // Inspect only the explicitly requested literals so a file-tree fact can be supplied without
  // broadening the selected source-owner set.
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

/** Hash large certificates incrementally so high-degree scopes do not require one giant JSON string. */
async function selectionDigest(repository: NeutralSourceRepository, sources: readonly unknown[], hostFacts: readonly unknown[],
  order: readonly number[] | undefined, current: () => boolean): Promise<string> {
  let digest = await repository.observationDigest(JSON.stringify([GENERATION, "scope-local"]));
  for (const [label, values] of [["sources", sources], ["hostFacts", hostFacts], ["order", order ?? []]] as const) {
    digest = await digestCertificateValues(repository, digest, label, values, current);
  }
  return digest;
}

/** Structural subtype used by the existing cached readers without requiring the global catalog. */
export class SourceLocalContributorDiscovery {
  private queries = 0;
  constructor(private readonly repository: NeutralSourceRepository, private readonly app: App,
    private readonly stamp: ContributorHostStamp, private readonly current: () => boolean,
    private readonly onDependencyInvalid?: () => void, private readonly editablePair = false) {}

  /** Source-local requests share the acquisition owner's monotonic maintenance/host fence. */
  isGenerationCurrent(): boolean { return this.current(); }

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
      const scope = copyRequest(input), keys = await queryKeys(scope, this.current, this.editablePair), keySet = new Set(keys);
      const selected = await this.repository.lookupLocalDependencies(keys, this.current, scope.endpoints.some(endpoint => endpoint.kind === "url") ? true : 3);
      if (selected.outcome !== "ready") {
        if (selected.reason === "dependency-invalid") this.onDependencyInvalid?.();
        return failure(selected.reason);
      }
      if (!this.current()) throw new SourceFactError("host-catalog-stale");
      const entries = selected.value.sources.map((stamp, index) => ({ stamp,
        order: selected.value.orders[index], markdownOrder: selected.value.markdownOrders[index] }));
      if (markdownOrder) entries.sort((left, right) => left.markdownOrder - right.markdownOrder || left.stamp.head.sourceId.localeCompare(right.stamp.head.sourceId));
      const sources = markdownOrder ? entries.map((entry) => entry.stamp) : selected.value.sources;
      const sourceIds = sources.map((stamp) => stamp.head.sourceId);
      const hostFacts = (await structuralFacts(this.app, scope, sourceIds, keySet, this.current)).map((fact, order) => ({ order, fact }));
      const order = markdownOrder ? entries.map((entry) => entry.markdownOrder) : undefined;
      if (order && order.some((value, index) => !Number.isSafeInteger(value) || value < 0 || index > 0 && value <= order[index - 1])) {
        throw new SourceFactError("dependency-invalid");
      }
      const dependencyDigest = await this.repository.observationDigest(JSON.stringify([GENERATION, selected.value.fence]));
      if (!this.current()) throw new SourceFactError("host-catalog-stale");
      const scopeIdentity = await scopeDigest(this.repository, scope, this.current, this.editablePair);
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
        || certificate.scopeIdentity !== await scopeDigest(this.repository, certificate.scope, this.current, this.editablePair)) return "superseded";
      const digest = await this.repository.observationDigest(JSON.stringify([GENERATION,
        { revision: certificate.dependency.revision, sequence: certificate.dependency.sequence }]));
      if (digest !== certificate.dependency.digest) return "dependency-invalid";
      const selection = await selectionDigest(this.repository, certificate.sources, certificate.hostFacts, certificate.markdownOrder, this.current);
      if (selection !== certificate.selectionIdentity) return "dependency-invalid";
      if (certificate.markdownOrder !== undefined && (certificate.markdownOrder.length !== certificate.sources.length
        || certificate.markdownOrder.some((value, index, values) => !Number.isSafeInteger(value) || value < 0
          || index > 0 && value <= values[index - 1]))) return "dependency-invalid";
      const reason = await this.repository.validateLocalDependencies(
        { revision: certificate.dependency.revision, sequence: certificate.dependency.sequence }, certificate.sources, this.current, certificate.scope.endpoints.some(endpoint => endpoint.kind === "url") ? true : 3);
      if (reason === "dependency-invalid") this.onDependencyInvalid?.();
      return reason;
    } catch (error) { return error instanceof SourceFactError ? error.reason : "read-error"; }
  }
}

/**
 * Exact editable-pair ownership proof independent of the global incidence inventory. Every
 * non-structural declaration relating a document to another endpoint is owned by that document;
 * inverse reconciliation therefore needs at most the two document endpoints. An unrelated note's
 * shared URL/attachment incidence cannot describe this pair. Full-family cached replay authenticates
 * each selected owner's positive and negative declarations; no global key-count claim is made.
 */
export class EditablePairContributorDiscovery {
  /** Bind the same finite host/lifetime fence used by endpoint acquisition and cached replay. */
  constructor(private readonly repository: NeutralSourceRepository, private readonly app: App,
    private readonly stamp: ContributorHostStamp, private readonly current: () => boolean) {}

  /** Reject structural and ownerless requests rather than granting invented negative coverage. */
  static supports(request: ContributorRequest): boolean {
    return request.kind === "pair" && request.endpoints.length === 2
      && request.endpoints[0].id !== request.endpoints[1].id
      && request.endpoints.some(endpoint => endpoint.kind === "document")
      && request.endpoints.every(endpoint => endpoint.kind !== "container" && endpoint.kind !== "tag")
      && request.fields === undefined && request.literals === undefined;
  }

  /** Pair proofs expire on demand cancellation or any observed host/source event. */
  isGenerationCurrent(): boolean { return this.current(); }

  /** Final cached readers recheck empty/host-only coverage through this same host fence. */
  isHostCurrent(): boolean { return this.current(); }

  /** Select only explicit document owners; no whole-vault enumeration or dependency lookup occurs. */
  async discover(input: ContributorRequest): Promise<ContributorDiscoveryResult> {
    if (!EditablePairContributorDiscovery.supports(input)) return failure("unsupported-scope");
    try {
      const scope = copyRequest(input), sourceIds: string[] = [];
      const sources: ContributorCertificate["sources"][number][] = [];
      for (const endpoint of scope.endpoints) {
        if (endpoint.kind !== "document") continue;
        if (!this.current()) return failure("host-catalog-stale");
        const file = endpoint.physicalPath === undefined ? null : this.app.vault.getFileByPath(endpoint.physicalPath);
        if (!(file instanceof TFile) || file.extension !== "md" || entityFactForFile(file).entity.id !== endpoint.id) return failure("host-catalog-stale");
        const selected = await this.repository.inspect(file.path, [], this.current);
        if (!selected.saved || !selected.head || selected.head.state !== "complete" || selected.sequence === null) return failure(selected.reason === "ready" ? "unsaved" : selected.reason);
        sourceIds.push(file.path);
        sources.push({ head: selected.head, sequence: selected.sequence, saved: true });
      }
      // Structural pairs are rejected above. Only endpoint entities are needed here; parent
      // topology/tag incidence cannot contribute to this editable pair. In particular, hashing
      // a root folder's entire child set would turn this local proof into high-degree work.
      const hostFacts: ContributorCertificate["hostFacts"][number][] = [];
      for (const endpoint of scope.endpoints) {
        if (endpoint.physicalPath === undefined) continue;
        const file = this.app.vault.getFileByPath(endpoint.physicalPath);
        if (!(file instanceof TFile)) return failure("host-catalog-stale");
        const fact = entityFactForFile(file);
        if (fact.entity.id !== endpoint.id || fact.entity.kind !== endpoint.kind) return failure("host-catalog-stale");
        hostFacts.push({ order: hostFacts.length, fact });
      }
      const scopeIdentity = await scopeDigest(this.repository, scope, this.current, true);
      const selectionIdentity = await selectionDigest(this.repository, sources, hostFacts, undefined, this.current);
      // This is a request-local certificate marker, never a durable global dependency generation.
      const certificate: ContributorCertificate = { coverage: "complete-direct-contributors", scope,
        scopeIdentity, host: { ...this.stamp }, sources, hostFacts, hostFactOrder: "scope-local",
        dependency: { generation: "editable-pair-owners-v1", slot: 0, revision: 0, sequence: 0, digest: scopeIdentity }, selectionIdentity };
      const reason = await this.revalidate(certificate);
      if (reason !== "ready") return failure(reason);
      return { outcome: "ready", ...certificate, sourceIds,
        work: { buckets: 0, pages: 0, bytes: 0, sourceOwners: sourceIds.length, hostFacts: hostFacts.length } };
    } catch (error) { return failure(error instanceof SourceFactError ? error.reason : "read-error"); }
  }

  /** Recheck exact source heads and request/host commitment; family replay supplies absence proof. */
  async revalidate(certificate: ContributorCertificate): Promise<SourceReason> {
    try {
      if (!this.current() || !sameHost(certificate.host, this.stamp)
        || !EditablePairContributorDiscovery.supports(certificate.scope)
        || certificate.dependency.generation !== "editable-pair-owners-v1"
        || certificate.scopeIdentity !== await scopeDigest(this.repository, certificate.scope, this.current, true)
        || certificate.selectionIdentity !== await selectionDigest(this.repository, certificate.sources, certificate.hostFacts, undefined, this.current)) return "superseded";
      const owners = certificate.scope.endpoints.filter(endpoint => endpoint.kind === "document");
      if (owners.length !== certificate.sources.length) return "dependency-invalid";
      for (const [index, owner] of owners.entries()) {
        const stamp = certificate.sources[index];
        if (owner.physicalPath !== stamp.head.sourceId) return "dependency-invalid";
        const selected = await this.repository.inspect(stamp.head.sourceId, [], this.current);
        if (!this.current()) return "host-catalog-stale";
        if (!selected.saved || selected.sequence !== stamp.sequence || selected.head?.sourceRevision !== stamp.head.sourceRevision) return "superseded";
      }
      return this.current() ? "ready" : "host-catalog-stale";
    } catch (error) { return error instanceof SourceFactError ? error.reason : "read-error"; }
  }
}
