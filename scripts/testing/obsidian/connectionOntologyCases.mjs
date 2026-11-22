/** Exact-build native Change ontology acceptance. Uses real connector menus, six-direction
 * controls and document-property writes; the shared fixture owns independent restoration. */
export async function connectionOntologyCases(app, c) {
  const f = c.fixture(app, c), cases = [];
  try {
    await f.initialize();
    const p = f.p, t = p.translator;
    await p.updateOntologyField('children', ['ChangeChild/ChangeParent'], [...p.settings.hierarchy.children], () => true);
    await p.updateOntologyField('previous', ['ChangePrevious/ChangeNext'], [...p.settings.hierarchy.previous], () => true);
    await p.updateOntologyField('leftFriends', ['ChangeFriend'], [...p.settings.hierarchy.leftFriends], () => true);
    await p.updateOntologyField('rightFriends', ['ChangeChallenger'], [...p.settings.hierarchy.rightFriends], () => true);
    Object.assign(p.settings, {showFolderNodes: false, showTagNodes: false, showAttachments: true, showImageAttachments: true,
      showInferredNodes: true, inferAllLinksAsFriends: false, inverseInfer: false, graphLenses: [], alsoWriteInverseOntology: false});
    p.settings.hierarchyLinkStyles = {...p.settings.hierarchyLinkStyles, ChangeChild: {strokeColor: '#b03020'}, ChangePrevious: {strokeColor: '#2060b0'}};
    p.settings.baseLinkStyle = {...p.settings.baseLinkStyle, showLabel: true};
    await p.saveSettings();
    const show = p.showKplexMenuAtPosition;
    p.showKplexMenuAtPosition = function(menu, ...args) {menu.setUseNativeMenu(false); return show.call(this, menu, ...args);};
    f.restores.push(() => {p.showKplexMenuAtPosition = show;});
    /** A trusted right-click must hit the actual SVG connector rather than a guessed node/menu. */
    const connectorMenu = async (leaf, action = 'actions.relationship.relink') => {
      const doc = leaf.view.contentEl.ownerDocument;
      f.owner(doc).setContentSize(1450, 1000);
      await f.wait(300);
      await p.actionManager.dispatch({id: 'view.fit', source: 'internal', surfaceId: f.surface(leaf)});
      await f.wait(300);
      await f.until(() => leaf.view.contentEl.querySelector('.kplex-edge-hit'), 'Rendered connector');
      const native = await f.focus(doc);
      let hit, xy;
      await f.until(() => {
        for (const candidateHit of leaf.view.contentEl.querySelectorAll('.kplex-edge-hit')) {
          const length = candidateHit.getTotalLength();
          for (const fraction of [.3, .7, .2, .8, .4, .6]) {
            const point = candidateHit.getPointAtLength(length * fraction);
            const screen = new doc.defaultView.DOMPoint(point.x, point.y).matrixTransform(candidateHit.getScreenCTM());
            const candidate = {x: Math.round(screen.x), y: Math.round(screen.y)};
            if (doc.elementFromPoint(candidate.x, candidate.y) === candidateHit) {hit = candidateHit; xy = candidate; return true;}
          }
        }
        return false;
      }, 'Uncovered current connector hit point', 10000);
      let trusted = false;
      const observe = event => {if (event.target === hit) trusted = event.isTrusted;};
      doc.addEventListener('contextmenu', observe, true);
      try {
        native.webContents.sendInputEvent({type: 'mouseMove', ...xy});
        native.webContents.sendInputEvent({type: 'mouseDown', ...xy, button: 'right', clickCount: 1});
        native.webContents.sendInputEvent({type: 'mouseUp', ...xy, button: 'right', clickCount: 1});
        await f.until(() => trusted && doc.querySelector('.menu-item'), 'Trusted connector menu');
      } finally {doc.removeEventListener('contextmenu', observe, true);}
      return [...doc.querySelectorAll('.menu-item')].find(item => item.querySelector('.menu-item-title')?.textContent === t(action));
    };
    /** Native selectors retain the same trusted keyboard path in main and popout documents. */
    const choose = async (doc, select, value, onStep = () => {}) => {
      const index = [...select.options].findIndex(option => option.value === value);
      f.check(index >= 0, 'Available native choice: ' + value);
      await f.key(doc, 'Home', [], select);
      for (let i = 0; i < index; i++) {await f.key(doc, 'Down', [], select); onStep();}
      await f.key(doc, 'Tab', [], select);
      await f.until(() => select.value === value, 'Chosen native value: ' + value);
    };
    const capture = async (doc, name) => {
      if (c.captureRoot) require('node:fs').writeFileSync(c.captureRoot + '/' + name + '.png', (await f.owner(doc).webContents.capturePage()).toPNG());
    };
    for (const [mode, role, replacement, inverse] of [['single', 'previous', 'ChangePrevious', null], ['paired', 'left', 'ChangeFriend', 'ChangeFriend'], ['popout', 'right', 'ChangeChallenger', 'ChangeChallenger'], ['attachment', 'previous', 'ChangePrevious', null]]) {
      c.pinState = {mode, completed: cases};
      const aPath = f.folder + '/Source ' + mode + '.md';
      const b = mode === 'attachment'
        ? await app.vault.create(f.folder + '/icon - surfing, beach, riding the wave - flaticon.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="8"/></svg>')
        : await f.note('Target ' + mode, mode === 'single' ? 'Target body unchanged' : '---\nChangeParent: ["[[' + aPath + ']]"]\nKeep: target-value\n---\nTarget body unchanged');
      if (mode === 'attachment') {f.files.push(b); p.index.insertCreatedFile(b);}
      const body = '\nBody reference [[' + b.path + ']] remains.';
      const a = await f.note('Source ' + mode, '---\nChangeChild: ["[[' + b.path + ']]"]\nKeep: source-value\n---\n' + body);
      const leaf = await f.canvas(a, 'k-plex-react-view', mode === 'popout' ? 'window' : 'tab'), doc = leaf.view.contentEl.ownerDocument;
      const dark = doc.body.classList.contains('theme-dark'), light = doc.body.classList.contains('theme-light');
      f.restores.push(() => {doc.body.classList.toggle('theme-dark', dark); doc.body.classList.toggle('theme-light', light);});
      doc.body.classList.toggle('theme-dark', mode !== 'single'); doc.body.classList.toggle('theme-light', mode === 'single');
      f.owner(doc).setContentSize(1450, 950);
      await f.ready();
      await f.until(() => p.captureConnectionOntologyChange(a.path, b.path), 'Unambiguous property selection');
      const originalB = await app.vault.read(b), choice = await connectorMenu(leaf);
      f.check(choice, 'Change ontology is offered');
      await f.click(choice);
      await f.until(() => doc.querySelector('.kplex-relation-modal .kplex-add-related-role-select'), 'Actual ontology replacement dialog');
      const modal = [...doc.querySelectorAll('.kplex-relation-modal')].at(-1), direction = modal.querySelector('.kplex-add-related-role-select');
      f.check(direction.value === 'child', 'Initial direction follows current ontology');
      f.check(modal.querySelector('.kplex-add-related-ontology-search input')?.value === 'ChangeChild', 'Initial ontology is exact current field');
      f.check(!modal.querySelector('#kplex-relation-modal-storage'), 'Approved owners stay fixed');
      // Cancel first, then reopen through the real context menu; neither document may change.
      const beforeA = await app.vault.read(a);
      await f.click([...modal.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === t('common.cancel') || button.textContent === t('common.cancel')));
      f.check(await app.vault.read(a) === beforeA && await app.vault.read(b) === originalB, 'Cancel preserved both documents');
      await f.click(await connectorMenu(leaf, 'graph.connectionDetails'));
      await f.until(() => doc.querySelector('.kplex-edge-properties-modal [data-kplex-change-ontology]'), 'Details replacement action');
      const details = doc.querySelector('.kplex-edge-properties-modal');
      f.owner(doc).setContentSize(mode === 'single' ? 1450 : 700, 950);
      await f.wait(200);
      f.check(details.querySelector('[data-kplex-add-ontology]') && details.querySelector('[data-kplex-connection-style]'), 'Grouped details add/change/style actions');
      f.check(details.scrollWidth <= details.clientWidth + 1, 'Details has no horizontal overflow');
      f.check([...details.querySelectorAll('.kplex-edge-connection-actions button')].every(button => button.querySelector('svg')), 'Connection actions have visible icon glyphs');
      await capture(doc, 'details-' + mode);
      await f.click(details.querySelector('[data-kplex-change-ontology]'));
      await f.until(() => doc.querySelector('.kplex-relation-modal .kplex-add-related-role-select'), 'Reopened replacement dialog');
      const active = doc.querySelector('.kplex-relation-modal'), select = active.querySelector('.kplex-add-related-role-select');
      f.owner(doc).setContentSize(mode === 'single' ? 1450 : 700, 950);
      await f.wait(200);
      f.check(select.options.length === 6, 'Six explicit directions');
      const choices = [];
      await choose(doc, select, role, () => {
        choices.push({direction: select.value, field: active.querySelector('.kplex-add-related-ontology-search input')?.value});
      });
      await f.until(() => {
        const field = active.querySelector('.kplex-add-related-ontology-search input')?.value;
        c.pinState.control = {direction: select.value, field, choices};
        return select.value === role && field === replacement;
      }, 'Native direction and remembered ontology');
      f.check(active.scrollWidth <= active.clientWidth + 1, 'Replacement dialog has no horizontal overflow');
      if (c.captureRoot) {
        const capture = await f.owner(doc).webContents.capturePage();
        require('node:fs').writeFileSync(c.captureRoot + '/ontology-' + mode + '.png', capture.toPNG());
      }
      const save = [...active.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === t('actions.relationship.relink') || button.textContent === t('actions.relationship.relink'));
      await f.click(save);
      await f.until(() => !active.isConnected, 'Replacement saved and dialog closed');
      const source = app.metadataCache.getFileCache(a)?.frontmatter, target = app.metadataCache.getFileCache(b)?.frontmatter;
      f.check(!source.ChangeChild && source[replacement]?.some(value => value.includes(b.basename)), 'Only selected source ontology changed');
      f.check(source.Keep === 'source-value' && (await app.vault.read(a)).endsWith(body), 'Other source properties and body reference preserved');
      if (inverse) f.check(!target.ChangeParent && target[inverse]?.some(value => value.includes(a.basename)) && target.Keep === 'target-value', 'Matching reciprocal owner changed');
      else f.check(await app.vault.read(b) === originalB, 'Single declaration did not manufacture an inverse');
      if (mode === 'single') {
        await f.until(() => [...leaf.view.contentEl.querySelectorAll('.kplex-edge-label')].some(label => label.textContent.includes('ChangePrevious')), 'Updated painted ontology');
        await f.click(details.querySelector('[data-kplex-connection-style]'));
        await f.until(() => [...doc.querySelectorAll('.menu-item-title')].some(item => item.textContent.includes('ChangePrevious')), 'Current ontology style source');
        f.check(![...doc.querySelectorAll('.menu-item-title')].some(item => item.textContent.includes('ChangeChild')), 'Details retained the old Child style owner');
        p.dismissKplexMenu();
      }
      await f.key(doc, 'Escape'); await f.until(() => !details.isConnected, 'Details closed');
      cases.push({mode, role, cancelPreserved: true, reciprocalChanged: Boolean(inverse), sourceAndBodyPreserved: true});
      leaf.detach();
    }
    {
      c.pinState = {mode: 'define-hide-show', completed: cases};
      const a = await f.note('Inferred source'), b = await f.note('Inferred parent', 'Body link [[' + a.path + ']] stays.');
      const originalB = await app.vault.read(b), leaf = await f.canvas(a), doc = leaf.view.contentEl.ownerDocument;
      await f.ready();
      const define = await connectorMenu(leaf, 'explain.specifyOntology'); f.check(define, 'Inferred menu offers Define');
      await f.click(define); await f.until(() => doc.querySelector('.kplex-relation-modal .kplex-add-related-role-select'), 'Direct Define editor');
      const editor = doc.querySelector('.kplex-relation-modal'), select = editor.querySelector('.kplex-add-related-role-select');
      f.check(select.options.length === 6, 'Inferred direction is editable');
      await choose(doc, select, 'previous');
      const owner = editor.querySelector('#kplex-relation-modal-storage'); if (owner) await choose(doc, owner, a.path);
      await capture(doc, 'define-connection');
      await f.click([...editor.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === t('relation.specifyOntologyButton')));
      await f.until(() => !editor.isConnected && app.metadataCache.getFileCache(a)?.frontmatter?.ChangePrevious, 'Selected Previous definition saved');
      f.check(await app.vault.read(b) === originalB, 'Definition kept the inferred body source');
      await p.updateOntologyField('hidden', [], [...p.settings.hierarchy.hidden], () => true); await f.ready();
      const beforeHide = await app.vault.read(a);
      const openHide = async () => {
        await f.click(await connectorMenu(leaf, 'hide.title'));
        await f.until(() => doc.querySelector('[data-kplex-hidden-field-staged]'), 'Actual Hide form with staged field');
        f.check(![...doc.querySelectorAll('.modal-title')].some(title => title.textContent === t('hide.setup.title')), 'Redundant setup dialog was shown');
        return doc.querySelector('[data-kplex-hidden-field-staged]').closest('.modal');
      };
      let hide = await openHide(); await capture(doc, 'hide-staged'); await f.key(doc, 'Escape');
      f.check(!p.settings.hierarchy.hidden.length && await app.vault.read(a) === beforeHide, 'Hide Cancel changed vocabulary or note');
      hide = await openHide(); const hiddenField = hide.querySelector('[data-kplex-hidden-field]').value;
      await f.click(hide.querySelector('[data-kplex-hide-confirm]'));
      await f.until(() => app.metadataCache.getFileCache(a)?.frontmatter?.[hiddenField], 'Final hide saved property');
      f.check(p.ontologyRoleForField(hiddenField) === 'hidden' && app.metadataCache.getFileCache(a)?.frontmatter?.ChangePrevious, 'Hide configured its field and preserved ontology');
      const other = await f.canvas(b); await f.ready();
      await f.click(await connectorMenu(other, 'graph.connectionDetails'));
      await f.until(() => doc.querySelector('[data-kplex-show-connection]'), 'Exact Show action');
      const count = doc.querySelectorAll('.modal-container').length;
      await f.click(doc.querySelector('[data-kplex-show-connection]'));
      await f.until(() => !app.metadataCache.getFileCache(a)?.frontmatter?.[hiddenField], 'Show removed only its Hidden declaration');
      f.check(doc.querySelectorAll('.modal-container').length <= count, 'Show opened an extra confirmation dialog');
      f.check(app.metadataCache.getFileCache(a)?.frontmatter?.ChangePrevious && await app.vault.read(b) === originalB, 'Show preserved defined ontology and body link');
      await f.key(doc, 'Escape'); other.detach(); leaf.detach();
      cases.push({mode: 'define-hide-show', sixDirections: true, hideCancelPreserved: true, stagedOnSave: true, directShow: true});
    }
    f.owner(app.workspace.containerEl.ownerDocument).setContentSize(1450, 1000);
    for (const mode of ['multiple-properties', 'inline-only', 'mismatched-pair']) {
      c.pinState = {mode, completed: cases};
      const aPath = f.folder + '/Refuse ' + mode + '.md';
      const b = await f.note('Refused target ' + mode, mode === 'mismatched-pair' ? '---\nChangePrevious: "[[' + aPath + ']]"\n---\n' : '');
      const link = '"[[' + b.path + ']]"';
      const content = mode === 'inline-only' ? 'ChangeChild:: [[' + b.path + ']]' : '---\nChangeChild: ' + link + '\n' + (mode === 'multiple-properties' ? 'ChangeFriend: ' + link + '\n' : '') + '---\n';
      const a = await f.note('Refuse ' + mode, content), leaf = await f.canvas(a);
      await f.ready(); f.check(!p.captureConnectionOntologyChange(a.path, b.path), 'Ambiguous/non-property source refuses quick replacement');
      f.check(!await connectorMenu(leaf), 'Ineligible menu does not offer Change ontology');
      p.dismissKplexMenu();
      if (mode !== 'inline-only') {
        const doc = leaf.view.contentEl.ownerDocument;
        await f.click(await connectorMenu(leaf, 'graph.connectionDetails'));
        await f.until(() => doc.querySelector('.kplex-edge-ontology-conflict') && doc.querySelector('.kplex-edge-source-removal'), 'Conflicting declaration recovery');
        await capture(doc, 'details-conflict-' + mode);
        await f.key(doc, 'Escape');
      }
      cases.push({mode, actionOmitted: true}); leaf.detach();
    }
    return {cases};
  } finally {
    // Graph-owned dialogs are retired with their native fixture leaves before files/settings restore.
    await f.cleanup();
  }
}
