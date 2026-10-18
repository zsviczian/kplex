/** Finite native facts around actual private URL publication. A fixed CPU clock permits work counts only; optional virtual timers give the caller explicit publication cadence. */
import vm from "node:vm";
import { MessageChannel } from "node:worker_threads";
import { webcrypto } from "node:crypto";

/** Keep real graph/cache/compiler owners; callers may select explicit settings before construction. */
export function urlPublicationFixture(bundle, timers = { setTimeout, clearTimeout }, settingsOverrides = {}) {
  const w = { performance: { now: () => 0 }, MessageChannel, crypto: webcrypto, setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout };
  vm.runInContext(bundle, vm.createContext({ window: w, performance: w.performance, URL, Date, TextEncoder, TextDecoder, structuredClone, setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout }));
  const M = w.sourceModules, files = new Map(), metadata = new Map(), root = new w.ContributorFolder();
  const events = { on: () => ({}), offref() {} };
  const app = { saveLocalStorage() {}, vault: { ...events, getName: () => 'private-url-evidence', getFileByPath: p => files.get(p) ?? null,
    getFiles: () => [...files.values()], getMarkdownFiles: () => [...files.values()], getRoot: () => root, getFolderByPath: p => p === '' ? root : null,
    cachedRead: async () => '' }, metadataCache: { ...events, getFileCache: f => metadata.get(f.path) ?? null, resolvedLinks: {}, unresolvedLinks: {} } };
  const settings = { indexingMode: 'on-demand', hierarchy: { hidden: [], parents: [], children: [], leftFriends: [], rightFriends: [], previous: [], next: [], exclusions: [] },
    inferAllLinksAsFriends: false, inverseInfer: false, showFullTagName: true, tagStyleList: [], baseNodeStyle: { maxLabelLength: 30 }, maxItemCount: 30,
    pinnedNodes: [], excludeFilepaths: [], nameFields: '', noteTypeField: 'Type', primaryTagField: 'Style' };
  Object.assign(settings, settingsOverrides);
  const index = new M.GraphIndex({ app, settings, getIndexSourceRevision: () => 0 }, app);
  index.indexedDb.putUrlOwners = async () => true;
  /** Actual source identities and canonical parsed body inputs feed the production publisher. */
  const add = (path, text = '', frontmatter = {}) => {
    const file = new w.ContributorFile(path); file.parent = root; root.children.push(file);
    files.set(path, file); metadata.set(path, { frontmatter });
    return { file, body: M.parseBodyMetadata(text) };
  };
  return { M, index, add, files, metadata, close: () => index.destroy() };
}
