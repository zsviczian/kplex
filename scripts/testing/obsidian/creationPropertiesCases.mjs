/** Exact-build creation/common-property acceptance in the approved disposable Small vault.
 * Serialized through the existing nativeBatch270 fixture; the outer runner owns deployment/lock.
 * Only owned files, views and short-lived fault observers are touched and independently restored. */
export async function creationPropertiesCases(app, c) {
  const f = c.fixture(app, c), cases = [], dialogs = [];
  try {
    await f.initialize();
    const p = f.p, t = p.translator, typeField = p.settings.noteTypeField;
    const person = '__kplex326_person', book = '__kplex326_book';
    const common = [
      {field: 'Name', visible: true, creationVisible: true, showName: true, label: 'Display name', icon: 'user'},
      {field: 'aliases', visible: false, creationVisible: true},
      {field: 'company', visible: true, creationVisible: true, showName: true, label: 'Company', icon: 'building'},
      {field: 'TemplateKeep', visible: false, creationVisible: true},
    ];
    await p.updateCommonNodeProperties(p.settings.commonNodeProperties, common, () => !c.closed);
    for (const [type, rows] of [[person, [{field: 'Company', visible: true, showName: true, label: 'Employer'}, {field: 'email', visible: true}]], [book, [{field: 'author', visible: true, showName: true, icon: '🧭'}]]]) {
      const key = '#' + type;
      await p.updateStyleSettings(/** This owned tag style carries only its selected type-property definitions. */ draft => {
        draft.tagNodeStyles[key] = {icon: 'tag'};
        if (!draft.tagStyleList.includes(key)) draft.tagStyleList.push(key);
      }, p.captureAppearanceOwner(), {nodePropertiesEdit: {type, opening: p.settings.noteTypeProperties[type] ?? [], rows}});
    }
    Object.assign(p.settings, {newNodeCreationTab: 'markdown', newNodeDefaultType: 'markdown', newNodeAfterSaving: 'return',
      alsoWriteInverseOntology: false, nameFields: 'Name', renderAlias: true, markdownTemplateFolder: f.folder,
      graphLenses: [], showFolderNodes: false, showTagNodes: false, embedCentralNode: false});
    await p.saveSettings(false, false);
    const templateBody = '# {{title}}\nTemplate body remains.\n';
    const template = await f.note('Creation property template', '---\nName: Template name\ncompany: Template company\nTemplateKeep: template-value\nemail: template@example.com\n---\n' + templateBody);
    const origin = await f.note('Creation source', 'Source body remains.\n');
    let leaf = await f.canvas(origin);await f.ready();
    f.restores.push(/** Form references never outlive their fixture or a failed native assertion. */ () => {
      for (const dialog of dialogs) if (dialog.modalEl?.isConnected) dialog.close();
    });

    /** Every native action is scrolled and hit-tested before trusted Electron input. */
    const click = async element => {
      f.check(element, 'Expected native creation control');element.scrollIntoView({block: 'center'});await f.wait(80);await f.click(element);
    };
    /** Input runs in its actual main/popout realm and is checked against the committed DOM value.
     * Template browsing keeps focus until an actual option is selected; other drafts release their popup. */
    const input = async (element, value, keepOpen = false) => {
      f.check(element && !element.disabled, 'Editable native creation input');element.scrollIntoView({block: 'center'});
      const doc = element.ownerDocument, native = await f.focus(doc);
      await f.key(doc, 'A', [process.platform === 'darwin' ? 'meta' : 'control'], element);
      await native.webContents.insertText(value);await f.until(() => element.value === value, 'Native authored value: ' + value);
      if (!keepOpen) await f.key(doc, 'Tab', [], element);
    };
    /** Translate button names through the actual host catalog, excluding navigation tabs. */
    const action = (container, key) => [...container.querySelectorAll('button')].find(element => element.getAttribute('role') !== 'tab'
      && (element.getAttribute('aria-label') === t(key) || element.textContent.trim() === t(key)));
    /** User property identity is distinct from its optional display label. */
    const property = (modal, field) => [...modal.contentEl.querySelectorAll('[data-kplex-creation-property]')].find(element => element.dataset.kplexCreationProperty === field);
    /** The shared field's native label is the stable association for the note-type combobox. */
    const noteTypeInput = modal => {
      const label = [...modal.contentEl.querySelectorAll('label')].find(element => element.textContent === t('creation.noteType'));
      return label ? modal.contentEl.ownerDocument.getElementById(label.htmlFor) : null;
    };
    /** Capture genuine host pixels separately from geometric/functional acceptance. */
    const capture = async (doc, name) => {
      if (!c.captureRoot) return;const native = f.owner(doc);native.webContents.invalidate();await f.wait(120);
      require('node:fs').writeFileSync(c.captureRoot + '/creation-properties-' + name + '.png', (await native.webContents.capturePage()).toPNG());
    };
    /** Find the opened session by its actual registered native composer, never by global focus. */
    const open = async currentLeaf => {
      leaf = currentLeaf;await app.workspace.revealLeaf(leaf);await f.focus(leaf.view.contentEl.ownerDocument);
      const outcome = await p.actionManager.dispatch({id: 'relationship.create-center.child', source: 'context-menu', surfaceId: f.surface(leaf), target: {kind: 'center'}});
      f.check(outcome.status === 'opened' || outcome.status === 'completed', 'Creation action receipt: ' + JSON.stringify(outcome));
      let modal;await f.until(() => {
        modal = [...p.actionDialogs.keys()].find(dialog => dialog.modalEl?.isConnected && dialog.contentEl?.querySelector('.kplex-add-related-note-search input'));
        return !!modal;
      }, 'Actual new-related-note composer');
      dialogs.push(modal);f.check(modal.modalEl.ownerDocument === leaf.view.contentEl.ownerDocument, 'Composer owns the originating native document');return modal;
    };
    /** Native template discovery and pointer selection execute no template until actual Save. */
    const chooseTemplate = async modal => {
      const picker = modal.contentEl.querySelector('.kplex-template-picker input');await input(picker, template.basename, true);
      await f.until(() => [...picker.ownerDocument.querySelectorAll('[role=option]')].some(option => option.textContent.includes(template.path)), 'Owned native template option');
      await click([...picker.ownerDocument.querySelectorAll('[role=option]')].find(option => option.textContent.includes(template.path)));
      await f.until(() => picker.value === template.path, 'Selected exact template path');
    };
    /** Locate the actual shared inline Note type field alongside the other ordered form sections.
     * Keep this helper closure-free so the portable browser lane can exercise the native selector. */
    function creationPropertyFormSections(content, noteTypeControl) {
      return [content.querySelector('.kplex-create-name-pair'), noteTypeControl?.closest('.kplex-form-inline'),
        content.querySelector('.kplex-create-folder-row'), content.querySelector('.kplex-creation-property-section'),
        content.querySelector('.kplex-creation-types'), content.querySelector('.kplex-creation-completion')];
    }
    /** A responsive audit preserves native window bounds and theme even on a failed assertion. */
    const audit = async (modal, prefix, commonEditor = false) => {
      const content = modal.contentEl, doc = content.ownerDocument, native = f.owner(doc), bounds = native.getBounds();
      const minimum = native.getMinimumSize(), maximized = native.isMaximized(), themes = ['theme-light', 'theme-dark'];
      const previous = themes.map(/** Restore actual classes, not an assumed global theme. */ theme => doc.body.classList.contains(theme));
      try {
        if (maximized) native.unmaximize();native.setMinimumSize(200, 200);
        for (const [theme, width] of [['theme-light', 1160], ['theme-dark', 420]]) {
          themes.forEach(/** Only this owned native document receives the temporary visual mode. */ value => doc.body.classList.toggle(value, value === theme));
          native.setContentSize(width, 900);await f.focus(doc);await f.wait(180);content.scrollTop = 0;
          f.check(content.scrollWidth <= content.clientWidth + 2, prefix + ' has no horizontal overflow');
          const controls = [...content.querySelectorAll('input, select, button')].filter(/** Ignore intentionally retired tabs and hidden inherited fields. */ element => element.getClientRects().length);
          f.check(controls.every(/** No control asks two independent tooltip owners to paint. */ element => !element.hasAttribute('title')), prefix + ' controls have one tooltip owner');
          f.check([...content.querySelectorAll('hr')].every(/** Section separators cannot cut through a native control or its visible field. */ divider => {
            const edge = divider.getBoundingClientRect();return controls.every(/** Compare actual painted rectangles, including a scrolled footer. */ control => {
              const rect = control.getBoundingClientRect();return rect.bottom <= edge.top || rect.top >= edge.bottom || rect.right <= edge.left || rect.left >= edge.right;
            });
          }), prefix + ' controls do not intersect dividers');
          if (commonEditor) {
            const rowActions = [...content.querySelectorAll('.kplex-node-detail-row button')];
            f.check(rowActions.length === common.length * 3 && rowActions.every(/** Every row action retains a visible host-owned glyph. */ button => button.querySelector('svg')), 'Common property row actions have Lucide glyphs');
          } else {
            const order = creationPropertyFormSections(content, noteTypeInput(modal));
            f.check(order.every(Boolean) && order.slice(1).every(/** Compare actual DOM flow rather than guessed Y positions in a scroll container. */ (element, index) => Boolean(order[index].compareDocumentPosition(element) & doc.defaultView.Node.DOCUMENT_POSITION_FOLLOWING)), 'Creation Name/type/folder/properties/kind/action order');
            const field = content.querySelector('.kplex-add-related-note-search input');field.scrollIntoView({block: 'center'});await f.key(doc, 'End', [], field);
            f.check(doc.activeElement === field && field.getBoundingClientRect().width >= Math.min(180, content.clientWidth - 100), 'Name remains focusable and uses available native width');
          }
          await capture(doc, prefix + '-' + theme + '-' + width);
          const save = commonEditor ? action(content, 'common.save') : action(content, 'addRelated.createMarkdownLink') ?? action(content, 'addRelated.createMarkdown');
          f.check(save, 'Native footer action');save.scrollIntoView({block: 'center'});await f.wait(100);f.point(save);
          f.check(content.scrollWidth <= content.clientWidth + 2, 'Footer remains reachable without horizontal scrolling');
        }
      } finally {
        themes.forEach(/** A failed audit cannot leave a different theme in the disposable host. */ (theme, index) => doc.body.classList.toggle(theme, previous[index]));
        native.setMinimumSize(...minimum);native.setBounds(bounds);if (maximized) native.maximize();
      }
    };

    c.pinState = {mode: 'creation-properties-cancel', cases};
    let modal = await open(leaf);
    await input(modal.contentEl.querySelector('.kplex-add-related-note-search input'), 'Canceled creation');
    await input(modal.contentEl.querySelector('.kplex-create-folder-row input'), f.folder);
    await input(property(modal, 'Name'), 'Unsaved metadata');
    const cancelInventory = app.vault.getFiles().map(file => file.path).sort(), sourceBefore = await app.vault.read(origin);
    await audit(modal, 'composer-main');await f.key(modal.modalEl.ownerDocument, 'Escape');
    await f.until(() => !modal.modalEl.isConnected, 'Creation canceled');
    f.check(JSON.stringify(app.vault.getFiles().map(file => file.path).sort()) === JSON.stringify(cancelInventory) && await app.vault.read(origin) === sourceBefore, 'Cancel created no file or source relationship');
    cases.push({mode: 'cancel', notesUnchanged: true, screenshots: true});

    for (const useTemplate of [true, false]) {
      c.pinState = {mode: 'creation-properties-untouched-' + (useTemplate ? 'template' : 'blank'), cases};
      modal = await open(leaf);const untouchedName = useTemplate ? 'Untouched template properties' : 'Unset creation properties';
      await input(modal.contentEl.querySelector('.kplex-add-related-note-search input'), untouchedName);
      await input(modal.contentEl.querySelector('.kplex-create-folder-row input'), f.folder);
      f.check(property(modal, 'Name')?.value === '' && property(modal, 'aliases')?.value === '', 'Name and Alias creation inputs start unset');
      if (useTemplate) await chooseTemplate(modal);
      else {
        const picker = modal.contentEl.querySelector('.kplex-template-picker input'), blank = t('template.none');await input(picker, blank, true);
        await f.until(() => [...picker.ownerDocument.querySelectorAll('[role=option]')].some(option => option.textContent.trim() === blank), 'Native blank-template option');
        await click([...picker.ownerDocument.querySelectorAll('[role=option]')].find(option => option.textContent.trim() === blank));
        await f.until(() => picker.value === blank, 'Blank template explicitly selected');
      }
      await click(action(modal.contentEl, 'addRelated.createMarkdownLink'));
      const untouchedPath = f.folder + '/' + untouchedName + '.md';let untouched;
      await f.until(() => {untouched = app.vault.getFileByPath(untouchedPath);return !!untouched && !modal.modalEl.isConnected;}, 'Untouched creation metadata completed');
      f.files.push(untouched);await f.ready();const metadata = app.metadataCache.getFileCache(untouched)?.frontmatter ?? {};
      f.check(useTemplate ? metadata.Name === 'Template name' && metadata.TemplateKeep === 'template-value' : !Object.hasOwn(metadata, 'Name'), 'Untouched Name preserves the template or stays absent');
      f.check(!Object.keys(metadata).some(key => ['alias', 'aliases'].includes(key.toLocaleLowerCase())), 'Untouched Alias receives no filename-derived value');
      if (useTemplate) f.check((await app.vault.read(untouched)).endsWith('# ' + untouchedName + '\nTemplate body remains.\n'), 'Untouched template body remains expanded and intact');
      cases.push({mode: useTemplate ? 'untouched-template' : 'unset-metadata', filenameIndependent: true, aliasAbsent: true});
    }

    c.pinState = {mode: 'creation-properties-template-merge', cases};
    modal = await open(leaf);const name = 'Created properties';
    await input(modal.contentEl.querySelector('.kplex-add-related-note-search input'), name);
    await input(modal.contentEl.querySelector('.kplex-create-folder-row input'), f.folder);
    await input(property(modal, 'Name'), 'Authored display name');await input(property(modal, 'company'), 'Shared edited company');
    await input(property(modal, 'aliases'), 'Supplementary alias');
    const typeInput = noteTypeInput(modal);
    await input(typeInput, person.slice(0, -1), true);
    /** Select a real native popup entry belonging to this composer. */
    const typeOption = () => [...typeInput.ownerDocument.querySelectorAll('[data-fuzzy-owner]')]
      .find(element => element.dataset.fuzzyOwner === modal.suggestionOwnerId && element.textContent === '#' + person);
    await f.until(typeOption, 'Shared native Note type suggestion');
    await click(typeOption());
    await f.until(() => typeInput.value === person, 'Native Note type choice committed');
    await f.until(() => property(modal, 'email') && property(modal, 'Company'), 'Selected type-property refinement');
    f.check(property(modal, 'Company').value === 'Shared edited company' && modal.contentEl.querySelectorAll('[data-kplex-creation-property="Company"]').length === 1, 'Common edit survives one type refinement');
    await input(property(modal, 'email'), 'obsolete-user-draft@example.com');await input(noteTypeInput(modal), book);
    await f.until(() => property(modal, 'author') && !property(modal, 'email'), 'Old type-only fields retired');
    await input(property(modal, 'author'), '🧭 Author');await chooseTemplate(modal);
    await capture(modal.modalEl.ownerDocument, 'template-and-properties');await click(action(modal.contentEl, 'addRelated.createMarkdownLink'));
    const path = f.folder + '/' + name + '.md';let created;
    await f.until(() => {created = app.vault.getFileByPath(path);return !!created && !modal.modalEl.isConnected;}, 'Created note, properties and relation completed');
    f.files.push(created);await f.ready();
    const fm = app.metadataCache.getFileCache(created)?.frontmatter, text = await app.vault.read(created);
    f.check(fm?.Name === 'Authored display name' && created.basename === name && fm.company === 'Shared edited company', 'Filename and explicit metadata identity remain independent');
    f.check(fm.TemplateKeep === 'template-value' && fm.email === 'template@example.com' && fm.author === '🧭 Author', 'Untouched template survives and obsolete draft is not written');
    f.check(fm[typeField] === book && fm.tags.includes(book) && fm.aliases.includes('Supplementary alias'), 'Selected type, membership and alias use native properties');
    f.check(text.endsWith('# ' + name + '\nTemplate body remains.\n'), 'Expanded native template body remains unchanged');
    f.check((await app.vault.read(origin)).includes(name), 'Captured source owns the created relationship');
    cases.push({mode: 'template-merge', path, filenameIndependent: true, obsoleteDraftAbsent: true, templatePreserved: true});

    c.pinState = {mode: 'creation-properties-retry', cases};
    const originalLink = p.linkNewRelatedFile, originalMetadata = p.applyNewNoteCreationMetadata, originalFinalize = p.finalizeCreatedNoteMetadata;
    const linkDescriptor = Object.getOwnPropertyDescriptor(p, 'linkNewRelatedFile'), metadataDescriptor = Object.getOwnPropertyDescriptor(p, 'applyNewNoteCreationMetadata'), finalizeDescriptor = Object.getOwnPropertyDescriptor(p, 'finalizeCreatedNoteMetadata');
    const retryName = 'Retained properties', retryPath = f.folder + '/' + retryName + '.md';let rejected = false, applications = 0, finalizations = 0;
    p.linkNewRelatedFile = async function(...args) {
      if (args[2].path === retryPath && !rejected) {rejected = true;throw Error('Owned native relationship failure after creation metadata');}
      return originalLink.apply(this, args);
    };
    p.applyNewNoteCreationMetadata = function(file, ...args) {if (file.path === retryPath) applications++;return originalMetadata.call(this, file, ...args);};
    p.finalizeCreatedNoteMetadata = function(file, ...args) {if (file.path === retryPath) finalizations++;return originalFinalize.call(this, file, ...args);};
    /** Restore original own/prototype lookup as well as the callable, independently of the retry result. */
    const restoreMethods = () => {
      for (const [key, descriptor] of [['linkNewRelatedFile', linkDescriptor], ['applyNewNoteCreationMetadata', metadataDescriptor], ['finalizeCreatedNoteMetadata', finalizeDescriptor]]) {
        if (descriptor) Object.defineProperty(p, key, descriptor);else delete p[key];
      }
    };
    f.restores.push(restoreMethods);
    modal = await open(leaf);await input(modal.contentEl.querySelector('.kplex-add-related-note-search input'), retryName);
    await input(modal.contentEl.querySelector('.kplex-create-folder-row input'), f.folder);await input(property(modal, 'Name'), 'Retained authored Name');
    await click(action(modal.contentEl, 'addRelated.createMarkdownLink'));
    await f.until(() => modal.contentEl.querySelector('.kplex-add-related-recovery') && app.vault.getFileByPath(retryPath), 'Actual native partial-file recovery');
    const retained = app.vault.getFileByPath(retryPath);f.files.push(retained);
    f.check(app.metadataCache.getFileCache(retained)?.frontmatter?.Name === 'Retained authored Name', 'Explicit metadata committed before relationship failure');
    await click(action(modal.contentEl, 'addRelated.linkCreatedFile'));await f.until(() => !modal.modalEl.isConnected, 'Exact retained-file relationship retry');
    f.check(app.vault.getFileByPath(retryPath) === retained && app.metadataCache.getFileCache(retained)?.frontmatter?.Name === 'Retained authored Name', 'Retry keeps exact native file and explicit Name');
    f.check(applications === 1 && finalizations === 1, 'Committed metadata and legacy finalization are not replayed');
    restoreMethods();
    cases.push({mode: 'native-partial-retry', applications, finalizations, retainedIdentity: true});

    for (const destination of ['tab', 'window']) {
      const current = destination === 'tab' ? leaf : await f.canvas(created, 'k-plex-react-view', 'window');
      if (destination === 'tab') {p.notifyNavigation(created.path, current);await f.ready();}
      c.pinState = {mode: 'creation-properties-native-settings-' + destination, cases};
      await app.workspace.revealLeaf(current);await f.focus(current.view.contentEl.ownerDocument);p.settingsTab.openCommonNodeProperties();
      let settingsModal;await f.until(() => {
        settingsModal = [...p.settingsTab.colorDialogs].find(dialog => dialog.modalEl?.isConnected && dialog.titleEl.textContent === t('nodeProperties.commonTitle'));
        return !!settingsModal;
      }, 'Native common property configuration');
      dialogs.push(settingsModal);f.check(settingsModal.modalEl.ownerDocument === current.view.contentEl.ownerDocument, 'Common editor follows originating document');
      const aliasGroup = [...settingsModal.contentEl.querySelectorAll('.kplex-node-detail-group')].find(group => group.querySelector('input')?.value === 'aliases');
      const visible = aliasGroup?.querySelector('[aria-label="' + t('nodeProperties.visible') + '"]');
      f.check(visible && !visible.classList.contains('is-enabled') && visible.getAttribute('aria-checked') !== 'true', 'Alias supplementary details default hidden');
      const before = JSON.stringify(p.settings.commonNodeProperties);await audit(settingsModal, 'common-' + destination, true);
      await input(settingsModal.contentEl.querySelector('.kplex-node-detail-field input'), 'Canceled property definition');await f.key(settingsModal.modalEl.ownerDocument, 'Escape');
      await f.until(() => !settingsModal.modalEl.isConnected, 'Common property editor canceled');f.check(JSON.stringify(p.settings.commonNodeProperties) === before, 'Property Cancel does not save settings');
      if (destination === 'window') {modal = await open(current);await audit(modal, 'composer-popout');await f.key(modal.modalEl.ownerDocument, 'Escape');await f.until(() => !modal.modalEl.isConnected, 'Popout creation canceled');}
      cases.push({mode: 'native-forms-' + destination, mainPopoutOwner: true, cancelPreserved: true});
    }

    c.pinState = {mode: 'creation-properties-all-canvases', cases};
    await app.workspace.revealLeaf(leaf);await f.focus(leaf.view.contentEl.ownerDocument);p.notifyNavigation(created.path, leaf);await f.ready();
    const viewSession = leaf.view.documentSession.plexView;
    for (const id of ['classic', 'mindmap', 'wuxing']) {
      const before = p.index.getSemanticPreparationDiagnostics().fullBuilds;
      await viewSession.requestSelection(id);await f.ready();
      await f.until(() => {
        const node = leaf.view.contentEl.querySelector('[data-kplex-path="' + created.path + '"]');
        return viewSession.definition.id === id && node?.querySelector('.kplex-node-property-value')?.textContent === 'Authored display name';
      }, 'Painted common/type properties in ' + id);
      await f.until(() => {
        const activity = p.index.sourceAcquisition.getActivityState();
        return !activity.pendingKnown && !activity.knownImpactTasks && !activity.sourceActive && !activity.repoWrites && !activity.repoDeleteTask
          && !p.index.hasActiveSemanticPreparation() && !p.index.hasPendingSemanticPreparation();
      }, 'Settled source work before property-only paint measurement');
      const sourceBefore = p.index.getSourceAcquisitionCounters(), semanticBefore = p.index.getSemanticPreparationDiagnostics();
      const longLabel = ('Long translated label 🧭 for ' + id + ' ' + 'property '.repeat(8)).trimEnd();
      const rowsBefore = p.settings.commonNodeProperties;
      const accepted = await p.updateCommonNodeProperties(rowsBefore, rowsBefore.map(/** A label-only settings edit must use presentation, never source acquisition. */ row => row.field === 'Name' ? {...row, label: longLabel} : {...row}), () => !c.closed);
      /** Distinguish rejected configuration from a stale view/read capability before waiting for paint. */
      const labelContext = () => {
        const element = leaf.view.contentEl.querySelector('[data-kplex-path="' + created.path + '"]');
        const surface = element?.ownerDocument === app.workspace.containerEl.ownerDocument ? 'leaf' : 'popout';
        return {accepted, requested: longLabel, view: viewSession.definition.id, center: p.documentSession(leaf)?.centerPath,
          live: p.settings.commonNodeProperties.find(row => row.field === 'Name'), effective: p.getViewSettings(surface).commonNodeProperties.find(row => row.field === 'Name'),
          nativeName: app.metadataCache.getFileCache(created)?.frontmatter?.Name, exactFile: p.index.get(created.path)?.file === created,
          paintedLabels: [...(element?.querySelectorAll('.kplex-node-property-label') ?? [])].map(label => label.textContent),
          paintedValues: [...(element?.querySelectorAll('.kplex-node-property-value') ?? [])].map(value => value.textContent)};
      };
      c.pinState = {mode: 'label-property-' + id, cases, propertyLabel: labelContext()};
      f.check(accepted === true, 'Label property settings were not committed: ' + JSON.stringify(c.pinState.propertyLabel));
      await f.until(() => {
        c.pinState.propertyLabel = labelContext();return c.pinState.propertyLabel.paintedLabels.some(label => label.includes(longLabel));
      }, 'Updated long property label in ' + id);
      const node = leaf.view.contentEl.querySelector('[data-kplex-path="' + created.path + '"]'), bounds = node.getBoundingClientRect();
      const rows = [...node.querySelectorAll('.kplex-node-property')], labels = rows.map(row => row.querySelector('.kplex-node-property-label')?.textContent ?? '');
      f.check(rows.every(/** Node geometry must contain complete property lines before view positioning. */ row => {const r = row.getBoundingClientRect();return r.left >= bounds.left - 1 && r.right <= bounds.right + 1 && r.bottom <= bounds.bottom + 1;}), id + ' contains measured property lines');
      f.check(labels.some(label => label.includes(longLabel)) && node.querySelector('.kplex-node-property-icon'), id + ' paints distinct label/icon/value elements');
      const value = rows[0].querySelector('.kplex-node-property-value'), label = rows[0].querySelector('.kplex-node-property-label');
      const range = value.ownerDocument.createRange();range.selectNodeContents(value);
      const textWidth = range.getBoundingClientRect().width, valueWidth = value.getBoundingClientRect().width;range.detach();
      f.check(label.clientWidth < label.scrollWidth && textWidth <= valueWidth + .015625, id + ' truncates the long label before the full value: ' + JSON.stringify({textWidth, valueWidth}));
      f.check(!rows.some(row => row.textContent.includes('Supplementary alias')), id + ' keeps Alias out of supplementary details');
      f.check(p.index.getSemanticPreparationDiagnostics().fullBuilds === before, 'Property/view presentation did not trigger full semantic rebuild');
      const sourceAfter = p.index.getSourceAcquisitionCounters(), semanticAfter = p.index.getSemanticPreparationDiagnostics();
      f.check(sourceAfter.vaultReads === sourceBefore.vaultReads && sourceAfter.parses === sourceBefore.parses
        && semanticAfter.requested === semanticBefore.requested && semanticAfter.prepared === semanticBefore.prepared, 'Label settings caused no source reads/parses or semantic preparation');
      await capture(node.ownerDocument, 'painted-' + id);cases.push({mode: 'painted-' + id, lines: rows.length, measuredInside: true, noAdditionalFullBuild: true});
    }
    return {cases, limitation: 'Windows native forms and rendered geometry; physical mobile keyboard and macOS are separate acceptance.'};
  } finally {
    await f.cleanup();
  }
}
