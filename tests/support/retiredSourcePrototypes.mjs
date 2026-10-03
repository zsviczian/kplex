/**
 * Historical SI4a/catalog characterization adapters, excluded from the shipped plugin.
 * These methods have no application callers; fixtures retain their original algorithms to keep
 * legacy storage/finality regressions while production uses one source-local requested-scope path.
 */

/** Attach historical test-only entry points using the actual module exports and host constructors. */
export function installRetiredSourcePrototypes(acquisition, modules, host) {
  const { CachedSourceSemanticReader, selectedSourceFailure, SOURCE_MAX_BATCH_RECORDS,
    SourceFactError, entityFactForFile, entityFactForFolder, ObsidianStructuralSourceCollector,
    ObsidianHostLinkSourceCollector, beginSourceRead, acceptSourceBatch, sourceReadCanPublish,
    SourceContributorDiscovery } = modules;
  const { TFile, TFolder } = host;
class HistoricalSourcePrototypes {
    /**
     * Internal, read-only SI4a entry point. Replay each requested owner once and return private
     * semantics, not a GraphIndex patch/publication. Only exact current physical entities are seeded;
     * dormant references and synthetic nodes from an older policy are never imported from GraphState.
     */
    async prepareCachedSemantics(sourceIds, policy, presentation, runtime) {
        const unique = [...new Set(sourceIds)];
        const requests = [];
        const policyRevision = policy.revision;
        const hostRevision = this.hostRevision, maintenanceRevision = this.maintenanceRevision;
        /** Source/host maintenance cancels compiler work cheaply, independently of policy and demand. */
        const hostCurrent = () => !this.closed && this.hostRevision === hostRevision && this.maintenanceRevision === maintenanceRevision;
        const current = () => runtime.isCurrent() && policy.isCurrent() && policy.revision === policyRevision && hostCurrent();
        const scopedRuntime = { ...runtime, isCurrent: current };
        for (const sourceId of unique) {
            const captured = await this.captureForReplay(sourceId, presentation, scopedRuntime);
            if (!runtime.isCurrent())
                return selectedSourceFailure("cancelled");
            if (!policy.isCurrent() || policy.revision !== policyRevision)
                return selectedSourceFailure("superseded");
            if (!hostCurrent())
                return selectedSourceFailure("stale");
            if (captured.outcome !== "ready")
                return { ...captured, sourceId };
            requests.push(captured.request);
            if (requests.length % SOURCE_MAX_BATCH_RECORDS === 0) {
                await runtime.yield();
                if (!current())
                    return selectedSourceFailure("cancelled");
            }
        }
        const prepared = await new CachedSourceSemanticReader(this.repository).prepare(requests, policy, {
            entity: (ref) => {
                if (!current() || ref.physicalPath === undefined)
                    return undefined;
                if (ref.kind === "container") {
                    const folder = ref.physicalPath === "" || ref.physicalPath === "/"
                        ? this.app.vault.getRoot() : this.app.vault.getFolderByPath(ref.physicalPath);
                    if (!(folder instanceof TFolder))
                        return undefined;
                    const fact = entityFactForFolder(folder);
                    return fact.entity.id === ref.id ? fact : undefined;
                }
                const file = this.app.vault.getFileByPath(ref.physicalPath);
                if (!(file instanceof TFile))
                    return undefined;
                const fact = entityFactForFile(file);
                return fact.entity.id === ref.id ? fact : undefined;
            },
        }, scopedRuntime);
        if (!runtime.isCurrent())
            return selectedSourceFailure("cancelled");
        if (!policy.isCurrent() || policy.revision !== policyRevision)
            return selectedSourceFailure("superseded");
        if (!hostCurrent())
            return selectedSourceFailure("stale");
        return prepared;
    }
    /**
     * Create an internal SI4b1 catalog capability for the current host revision. Rebuild is explicit;
     * neither construction nor querying schedules acquisition or changes any live graph consumer.
     * Explicit collection captures Markdown encounter ordinals separately from structural order,
     * and rechecks exact inventory identity/order before activating the derivative catalog.
     * Canonical topology finalization closes the inventory; a bounded field vocabulary checks Date
     * registry changes without scanning all files per query. A new host revision needs a new capability.
     */
    contributorDiscovery(runtime) {
        this.start();
        const revision = this.hostRevision;
        const catalogObservation = this.catalogObservation;
        const daily = JSON.stringify(this.metadataHost.dailyNotesSettings());
        const fields = new Map();
        let fieldBytes = 0;
        let environmentDirty = false;
        /** Source events, cancellation and unload cheaply fence every awaited source/structure batch. */
        const current = () => !this.closed && runtime.isCurrent() && this.hostRevision === revision
            && this.catalogObservation === catalogObservation;
        const scopedRuntime = { ...runtime, isCurrent: current };
        const catalog = {
            stamp: { epoch: this.epoch, revision, token: `${catalogObservation}:${this.repository.createIdentity()}` },
            markdownOrderVersion: 1,
            hostLinkOwnerOrderVersion: 1,
            isCurrent: current,
            /** Check all observed Date and non-Date fields; policy-only changes do not enter this fence. */
            validate: () => {
                if (!current())
                    return false;
                if (JSON.stringify(this.metadataHost.dailyNotesSettings()) === daily
                    && [...fields].every(([field, wasDate]) => this.metadataHost.isDateProperty(field) === wasDate)) {
                    environmentDirty = false;
                    return true;
                }
                // Demand observes canonical inputs without changing the accepted reversible validator.
                // A restored environment cannot retire its persisted UNKNOWN host transition ticket.
                if (!environmentDirty) {
                    environmentDirty = true;
                    this.markContributorHostChange("environment");
                    this.requestInventory();
                }
                return false;
            },
            /**
             * Capture ordinals only during explicit acquisition, never a settings query. The same host
             * revision encloses both inventories. Exact TFile membership and final enumeration equality
             * prevent equal-length replacements, duplicates or traversal order from supplying ordinals.
             */
            collect: async (emit) => {
                if (!current())
                    return false;
                const markdown = this.app.vault.getMarkdownFiles().slice();
                const ordinals = new Map();
                let inventoryBytes = 0;
                for (const [ordinal, file] of markdown.entries()) {
                    if (!current())
                        return false;
                    if (!(file instanceof TFile) || file.extension !== "md" || ordinals.has(file)
                        || this.app.vault.getFileByPath(file.path) !== file)
                        throw new SourceFactError("host-catalog-stale");
                    inventoryBytes += file.path.length * 2 + 128;
                    if (inventoryBytes > 8 * 1024 * 1024)
                        throw new SourceFactError("memory-budget");
                    ordinals.set(file, ordinal);
                    if ((ordinal & 255) === 255) {
                        await runtime.yield();
                        if (!current())
                            return false;
                    }
                }
                const collector = new ObsidianStructuralSourceCollector(this.app, {
                    isCurrent: current, sourceRevision: () => this.hostRevision,
                    checkpoint: async () => { await runtime.yield(); return current(); },
                });
                let cursor = beginSourceRead(collector.boundary);
                let documents = 0;
                /** Consume finite canonical batches without retaining a second full structural graph. */
                const consume = async (batch) => {
                    const accepted = acceptSourceBatch(cursor, batch);
                    if (!accepted.accepted || !current())
                        return false;
                    for (const record of batch.records) {
                        if (record.kind !== "entity" && record.kind !== "file-tree" && record.kind !== "tag-tree")
                            return false;
                        let ordinal;
                        if (record.kind === "entity" && record.entity.kind === "document") {
                            documents++;
                            const path = record.entity.physicalPath;
                            const file = path === undefined ? null : this.app.vault.getFileByPath(path);
                            ordinal = file instanceof TFile ? ordinals.get(file) : undefined;
                            if (ordinal === undefined)
                                return false;
                        }
                        if (!(await emit(record, ordinal)) || !current())
                            return false;
                    }
                    cursor = accepted.cursor;
                    return current();
                };
                if (!(await collector.collectBatches(consume)))
                    return false;
                const final = await collector.finalize();
                if (final === null || !(await consume(final)) || !current() || documents !== markdown.length)
                    return false;
                const after = this.app.vault.getMarkdownFiles();
                if (after.length !== markdown.length)
                    return false;
                // Recheck the exact encounter stream cooperatively, not just its length or sorted paths.
                for (const [ordinal, file] of after.entries()) {
                    if (!current() || file !== markdown[ordinal] || this.app.vault.getFileByPath(file.path) !== file)
                        return false;
                    if ((ordinal & 255) === 255) {
                        await runtime.yield();
                        if (!current())
                            return false;
                    }
                }
                return current() && collector.isBoundaryCurrent(collector.boundary) && sourceReadCanPublish(cursor, collector.boundary);
            },
            /** Capture original whole-map owner order only during this explicit catalog acquisition. */
            captureHostLinkOwnerOrder: async () => {
                const collector = new ObsidianHostLinkSourceCollector(this.app, {
                    isCurrent: current, sourceRevision: () => this.hostRevision,
                    checkpoint: async () => { await runtime.yield(); return current(); },
                });
                return collector.captureOwnerOrder();
            },
            /** Capture one already-acquired document and its complete frontmatter field-type vocabulary. */
            capture: async (entity) => {
                const path = entity.entity.physicalPath;
                const file = path ? this.app.vault.getFileByPath(path) : null;
                if (!(file instanceof TFile) || file.extension !== "md")
                    throw new SourceFactError("host-catalog-stale");
                const metadata = this.app.metadataCache.getFileCache(file);
                if (!metadata)
                    throw new SourceFactError("pending-metadata");
                for (const field of Object.keys(metadata.frontmatter ?? {})) {
                    if (field === "position" || fields.has(field))
                        continue;
                    fieldBytes += field.length * 2 + 64;
                    if (fields.size >= 4096 || fieldBytes > 1024 * 1024)
                        throw new SourceFactError("memory-budget");
                    fields.set(field, this.metadataHost.isDateProperty(field));
                }
                // These presentation records are irrelevant to dependency discovery. Do not persist or
                // index configured semantic roles or arbitrary frontmatter presentation values.
                const captured = await this.captureForReplay(file.path, { noteTypeField: "", primaryTagField: "" }, scopedRuntime);
                if (captured.outcome !== "ready")
                    throw new SourceFactError(captured.reason);
                return captured.request;
            },
        };
        return new SourceContributorDiscovery(this.repository, catalog, runtime);
    }
}

  acquisition.prepareCachedSemantics = HistoricalSourcePrototypes.prototype.prepareCachedSemantics.bind(acquisition);
  acquisition.contributorDiscovery = HistoricalSourcePrototypes.prototype.contributorDiscovery.bind(acquisition);
  return acquisition;
}
