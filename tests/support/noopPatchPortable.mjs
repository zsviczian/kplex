/** Native input doubles around the actual compiled GraphBuilder/parser/evidence production graph. */
import vm from 'node:vm';
import { MessageChannel } from 'node:worker_threads';
import { contributorBrowserBundle } from './contributorBrowserFixture.mjs';
import { noopPatchFixture } from './noopPatchFixture.mjs';

export const noopPatchEntries = ['src/index/GraphBuilder.ts', 'src/index/GraphState.ts', 'src/index/RelationResolver.ts', 'src/core/graph/relations.ts'];

/** Compile production modules unchanged; no source extraction or alternate classifier is used. */
export async function noopPatchBundle() { return contributorBrowserBundle(noopPatchEntries); }

/** Fixed fake clock supports deterministic work counts only, never elapsed-time acceptance. */
export function portableNoopFixture(bundle, degree) {
  const w = { performance: { now: /** Disable elapsed-time inference in this work-count fixture. */ () => 0 }, MessageChannel, setTimeout, clearTimeout };
  vm.runInContext(bundle, vm.createContext({ window: w, performance: w.performance, URL, Date, TextEncoder, TextDecoder, setTimeout, clearTimeout }));
  const M = w.sourceModules, files = new Map(), metadata = new Map(), texts = new Map(), reads = [], parses = [];
  const root = new w.ContributorFolder();
  const app = { vault: { getFileByPath: /** Resolve the current exact physical incarnation. */ p => files.get(p) ?? null,
    getRoot: /** Supply the one captured structural root. */ () => root,
    getFolderByPath: /** Only the fixture root is materialized. */ p => p === '' ? root : null,
    getFiles: /** Enumerate controlled native inputs, never inferred graph nodes. */ () => [...files.values()],
    cachedRead: async /** Native source reads remain countable. */ file => { reads.push(file.path); return texts.get(file.path); } },
    metadataCache: { getFileCache: /** Borrow the latest controlled cache object. */ file => metadata.get(file.path), resolvedLinks: {}, unresolvedLinks: {},
      getFirstLinkpathDest: /** Every relationship target in this fixture is unresolved. */ () => null } };
  app.vault.read = app.vault.cachedRead;
  const host = { app, files, metadata, texts, reads, parses,
    cache: { /** This portable lane supplies hot data; durability is tested separately in real IDB. */ queueBodyWrite() {} },
    /** Register one native identity and text without simulating any semantic policy. */
    add(path, text) { const f = new w.ContributorFile(path); f.parent = root; root.children.push(f); files.set(path, f); texts.set(path, text); return f; } };
  return { M, host, ...noopPatchFixture(M, host, degree) };
}
