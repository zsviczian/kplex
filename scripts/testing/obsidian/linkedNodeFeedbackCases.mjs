/** Exact-build hidden-link Notice acceptance in Small. The shared fixture restores notes,
 * settings, native views and workspace; the staging caller owns artifacts and the host lock. */
export async function linkedNodeFeedbackCases(app, c) {
  const f = c.fixture(app, c), dialogs = [], cases = [];
  try {
    await f.initialize();
    const p = f.p, t = p.translator;
    const otherOrigin = await f.note('Unrelated canvas');
    await f.canvas(otherOrigin);
    for (const mode of ['image-hidden', 'exclude', 'include', 'edge', 'visible', 'style', 'popout']) {
      c.progress = {phase: 'Hidden-link case', mode};
      const originFile = await f.note('Origin ' + mode), leaf = await f.canvas(originFile, 'k-plex-react-view', mode === 'popout' ? 'window' : 'tab');
      const doc = leaf.view.containerEl.ownerDocument;
      let targetFile;
      if (mode === 'image-hidden' || mode === 'popout') {
        targetFile = await app.vault.create(f.folder + '/Icon ' + mode + '.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"><circle cx="6" cy="6" r="5"/></svg>');
        f.files.push(targetFile); p.index.insertCreatedFile(targetFile);
      } else targetFile = await f.note('Target ' + mode);
      p.settings.showImageAttachments = mode !== 'image-hidden' && mode !== 'popout';
      await p.saveSettings();
      const lens = mode === 'exclude' ? {scope: 'node', mode: 'exclude', expression: 'node.path == ' + JSON.stringify(targetFile.path)}
        : mode === 'include' ? {scope: 'node', mode: 'include', expression: 'file.extension == "svg"'}
        : mode === 'edge' ? {scope: 'edge', mode: 'exclude', expression: 'edge.role == "child"'}
        : mode === 'style' ? {scope: 'node', mode: 'style', expression: 'node.path == ' + JSON.stringify(targetFile.path), style: {node: {strokeWidth: 3}}} : null;
      await p.setGraphLenses(lens ? [{id: 'hidden-link-fixture', name: 'Hidden link fixture', enabled: true, ...lens}] : []);
      await f.ready();
      const visibilityBefore = JSON.stringify({images: p.settings.showImageAttachments, lenses: p.settings.graphLenses});
      const origin = p.index.get(originFile.path), target = p.index.get(targetFile.path);
      f.check(origin && target, 'Current native endpoints');
      const expected = t('notice.linkedNodeHidden', {name: p.index.titleFor(target)});
      const noticeCount = () => [...doc.querySelectorAll('.notice')].filter(el => el.textContent === expected).length;
      const modal = p.openRelationModal({mode: 'create', origin, fixedTarget: target, semanticRole: 'child', hostLeaf: leaf, invocation: {continuation: 'return'}});
      dialogs.push(modal);
      await f.until(() => modal.contentEl.querySelector('button[data-kplex-primary-action]'), 'Actual composer Link button');
      await f.wait(250);
      await f.click(modal.contentEl.querySelector('button[data-kplex-primary-action]'));
      await f.until(() => !modal.modalEl.isConnected, 'Saved composer closes');
      const hidden = !['visible', 'style'].includes(mode);
      if (hidden) await f.until(() => noticeCount() === 1, 'One native hidden-node Notice', 5000);
      else {
        await f.until(() => [...leaf.view.contentEl.querySelectorAll('[data-kplex-path]')].some(el => el.dataset.kplexPath === targetFile.path), 'Visible linked endpoint');
        f.check(noticeCount() === 0, 'Visible/style-only link stays silent');
      }
      f.check(visibilityBefore === JSON.stringify({images: p.settings.showImageAttachments, lenses: p.settings.graphLenses}), 'Notice preserves all filters/lenses');
      f.check((await app.vault.read(originFile)).includes(targetFile.basename), 'Actual relationship is saved');
      const otherDoc = app.workspace.containerEl.ownerDocument;
      if (otherDoc !== doc) f.check(![...otherDoc.querySelectorAll('.notice')].some(el => el.textContent === expected), 'Popout feedback stays in its document');
      cases.push({mode, hidden, notices: noticeCount(), saved: true, filtersUnchanged: true});
      await p.setGraphLenses([]);
      leaf.detach();
    }
    return {cases};
  } finally {
    for (const dialog of dialogs) dialog.close();
    await f.cleanup();
  }
}
