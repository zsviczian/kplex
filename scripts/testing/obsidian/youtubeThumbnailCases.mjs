/** Bounded native YouTube image integration on the existing disposable fixture. The real
 * consent owner and native HTTP/image transport remain untouched. DOM observations establish
 * rendering/retirement only; controlled headless tests own exact transport-count assertions. */
export async function youtubeThumbnailCases(app, c) {
  const f = c.fixture(app, c), cases = [];
  const urls = ['https://youtu.be/aqz-KE-bpKQ?t=17', 'https://youtu.be/aqz-KE-bpKQ?t=91'];
  const labels = ['Thumbnail first timestamp', 'Thumbnail second timestamp'];
  const limitations = ['Permission-off DOM observations do not count native HTTP requests. Controlled headless tests establish zero-request, fallback and coalescing counts.',
    'A decode timeout is unverified native online integration, not evidence of either a code defect or successful image decoding.'];
  try {
    await f.initialize();
    const p = f.p;
    Object.assign(p.settings, {allowRemoteNodeImages: false, showURLNodes: true, showPageNodes: true,
      showFolderNodes: false, showTagNodes: false, graphDepth: 1, renderSiblings: false,
      graphLenses: [], applyPowerFilter: false, embedCentralNode: false, inferAllLinksAsFriends: false});
    await p.saveSettings(false, false);
    const field = p.defaultOntologyField('child');
    f.check(field, 'Configured physical child field');
    const sourceText = '---\n' + field + ': ' + JSON.stringify(urls) + '\n---\n'
      + urls.map(/** Authored labels remain note content; no webpage/player is opened. */ (url, i) => '![' + labels[i] + '](' + url + ')').join('\n') + '\n';
    const source = await f.note('YouTube timestamp previews', sourceText);
    const main = await f.canvas(source), popout = await f.canvas(source, 'k-plex-react-view', 'window');
    const leaves = [main, popout];
    for (const leaf of leaves) {
      const doc = leaf.view.contentEl.ownerDocument;
      f.owner(doc).setContentSize(1450, 1000);
      await f.focus(doc);
      await p.actionManager.dispatch({id: 'view.fit', source: 'internal', surfaceId: f.surface(leaf)});
    }
    await f.ready();
    await f.until(/** Both actual canvases must expose the two distinct timestamped nodes. */ () =>
      leaves.every(leaf => urls.every(url => [...leaf.view.contentEl.querySelectorAll('[data-kplex-path]')].some(node => node.dataset.kplexPath === url))), 'Timestamped URL nodes in main and popout');
    /** Resolve exact rendered URL rows without relying on query-string CSS escaping. */
    const nodes = leaf => [...leaf.view.contentEl.querySelectorAll('[data-kplex-path]')].filter(node => urls.includes(node.dataset.kplexPath));
    /** Capture only owned native image state, never network listeners or host-module replacements. */
    const images = () => leaves.flatMap(leaf => nodes(leaf).flatMap(node => [...node.querySelectorAll('.kplex-node-visual img')]));
    /** Labels and timestamped graph/navigation identities must remain unchanged throughout consent. */
    const identity = () => {
      const pages = urls.map(url => p.index.get(url));
      f.check(pages.every((page, i) => page?.path === urls[i] && page.url === urls[i]), 'Timestamped graph and navigation identities retained');
      f.check(pages[0] !== pages[1], 'Thumbnail coalescing does not merge graph pages');
      f.check(pages.every((page, i) => p.index.titleFor(page) === labels[i]), 'Authored URL labels retained');
      for (const leaf of leaves) for (const [i, url] of urls.entries()) {
        const node = nodes(leaf).find(item => item.dataset.kplexPath === url);
        const text = node?.querySelector('.kplex-thought-text');
        f.check(text?.textContent && text.getAttribute('title')?.endsWith(labels[i]), 'Authored label retained under native prefix/truncation in each document');
      }
      return pages;
    };
    /** Wait for ordinary fixture work before measuring a presentation-only permission write. */
    await f.until(() => {
      const state = p.index.sourceAcquisition.getActivityState();
      return !state.sourceActive && !state.pendingKnown && !state.knownImpactTasks && !state.repoWrites;
    }, 'Source work settled before thumbnail consent');
    /** The existing index exposes exact semantic/read/parse counters without observing HTTP. */
    const work = () => {
      const source = p.index.getSourceAcquisitionCounters();
      return {semantic: p.index.getSemanticRevision(), reads: source.vaultReads, parses: source.parses};
    };
    /** Consent alone must not acquire note bodies or publish a changed semantic graph. */
    const sameWork = (before, phase) => f.check(JSON.stringify(work()) === JSON.stringify(before), 'Thumbnail consent acquired semantic/source work: ' + phase);
    /** Use the actual queued settings writer; no direct index notifications or transport patching. */
    const consent = async value => {p.settings.allowRemoteNodeImages = value; await p.saveSettings(false, false); await f.wait(100);};
    /** Optional screenshots use each real owning window and the existing managed capture directory. */
    const capture = async (leaf, name) => {
      if (c.captureRoot) require('node:fs').writeFileSync(c.captureRoot + '/' + name + '.png', (await f.owner(leaf.view.contentEl.ownerDocument).webContents.capturePage()).toPNG());
    };
    const pages = identity();
    f.check((await p.index.resolveNodeVisuals(pages)).size === 0, 'Permission-off resolution supplies no automatic visual');
    f.check(images().length === 0, 'Permission-off native nodes have no automatic image elements');
    cases.push({phase: 'permission-off', status: 'passed', documents: 2, images: 0, transportCounts: 'not-observed'});
    const before = work();
    await consent(true);
    const candidates = await p.index.resolveNodeVisuals(pages);
    f.check(urls.every(url => candidates.get(url)?.youtubeId === 'aqz-KE-bpKQ'), 'Both URL nodes use the same validated thumbnail identity');
    f.check(urls.every(url => candidates.get(url)?.path.startsWith('https://i.ytimg.com/vi/aqz-KE-bpKQ/')), 'Automatic candidates stay on the image host');
    let online = true;
    const onlineMessage = 'Native online thumbnail decoding in main and popout';
    try {
      await f.until(/** Actual Blob decoding is required in both documents, not just a candidate src. */ () => {
        const rendered = images();
        return rendered.length === 4 && rendered.every(image => image.getAttribute('src')?.startsWith('blob:') && image.naturalWidth > 0);
      }, onlineMessage, 60000);
    } catch (error) {
      if (c.closed || error?.message !== onlineMessage) throw error;
      online = false;
      cases.push({phase: 'permission-on', status: 'unavailable', reason: 'native-thumbnail-decode-timeout',
        diagnostic: String(error), images: images().map(/** Scheme/dimensions suffice; no remote request tracing is installed. */ image =>
          ({scheme: image.getAttribute('src')?.split(':')[0] ?? null, naturalWidth: image.naturalWidth, complete: image.complete}))});
    }
    identity();sameWork(before, 'enable');
    if (online) {
      cases.push({phase: 'permission-on', status: 'passed', documents: 2, decodedBlobImages: 4, transportCounts: 'not-observed'});
      await capture(main, 'youtube-thumbnails-main');await capture(popout, 'youtube-thumbnails-popout');
    }
    const retained = candidates;
    await consent(false);
    await f.until(/** Revocation removes actual image elements in both mounted documents. */ () => images().length === 0, 'Native thumbnail images retired after opt-out', 5000);
    f.check((await p.index.resolveNodeVisuals(pages)).size === 0, 'Fresh resolution remains empty after opt-out');
    f.check(retained.size === 2 && retained.get(urls[0])?.youtubeId === 'aqz-KE-bpKQ', 'Retained old candidate does not keep the mounted image alive');
    identity();sameWork(before, 'disable');
    f.check(app.vault.getFileByPath(source.path) === source && await app.vault.read(source) === sourceText, 'Source note bytes and exact file identity unchanged');
    cases.push({phase: 'permission-revoked', status: 'passed', documents: 2, images: 0, sourceUnchanged: true, work: work()});
    return {status: online ? 'passed' : 'unavailable', cases, limitations};
  } finally {await f.cleanup();}
}
