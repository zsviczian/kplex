/**
 * Additional, serial native cases for the existing disposable-vault folding driver. This export
 * is injected through toString(): every helper belongs to this function, with no module imports.
 * Only native leaf/view state is inspected. The caller owns the content-fixture creation/cleanup;
 * this extension never edits note text or logs native drawing payloads.
 * The caller retains its original layout/settings/configuration cleanup even when a case throws.
 */
export async function runSidecarFoldingCases(ports) {
  const {p, workspace, c, page, check, until, frames, wait, command, click, scenario,
    getHost, getCompanion, setCompanion, getSibling} = ports;
  const app = p.app, mainDocument = getHost().view.containerEl.ownerDocument;
  /** Native group identity is independent of its active tab or loaded file representation. */
  const group = leaf => leaf.parent?.containerEl;
  /** Never equate a native task yield with a browser layout frame. */
  const box = element => {
    const r = element.getBoundingClientRect(); return {x: r.x, y: r.y, width: r.width, height: r.height};
  };
  /** Observe the exact owner; no graph query participates in this predicate. */
  const folded = () => p.isPlexFoldedForSidecar(getHost());
  /** Snapshot native tab identities and view states without reading file data. */
  const tabs = parent => parent.children.map(/** Preserve exact state and order for a round trip. */ leaf => ({id: leaf.id, state: leaf.getViewState()}));
  /** Add bounded details to the existing driver's public receipts, not an uncollected side log. */
  const detail = value => Object.assign(c.scenarios[c.scenarios.length - 1], value);
  /** An unavailable prerequisite is explicitly different from a passed acceptance case. */
  const unavailable = (id, reason) => c.scenarios.push({id, status: "unavailable", reason});
  /** Move a leaf using the observed native parent methods also used by the display-mode lane. */
  const move = async (leaf, parent, index = parent.children.length) => {
    if (leaf.parent === parent && parent.children.indexOf(leaf) === index) return;
    leaf.parent.removeChild(leaf); parent.insertChild(Math.min(index, parent.children.length), leaf); await frames();
  };
  /** Create only disposable Empty tabs; original Bases and other user tabs are never detached. */
  const empty = async parent => {
    const leaf = workspace.createLeafInParent(parent, parent.children.length); c.createdLeaves.push(leaf);
    await leaf.setViewState({type: "empty", active: false}); return leaf;
  };
  /** Reassociate only the exact surviving managed leaf after a deliberately invalidating move. */
  const reassociate = async () => {
    const host = getHost(), companion = getCompanion();
    p.restorePlexFoldBeforeReveal(host);
    check(p.leafIsAttached(host) && p.leafIsAttached(companion), "Extended case lost a prepared native leaf");
    workspace.setActiveLeaf(companion, {focus: true}); await frames();
    if (p.sidecarLeaves.get(host) !== companion) await p.attachAdjacentSidecar(host, "to-plex");
    check(p.sidecarLeaves.get(host) === companion, "Extended case did not restore the exact managed companion");
    workspace.setActiveLeaf(host, {focus: true}); await frames();
  };
  /** Retain a finite no-source-work observation around topology refusal alone, not setup/file opens. */
  const withoutSourceWork = async action => {
    const counts = {}, releases = [];
    for (const [owner, keys] of [[p.index, ["invalidateSemanticPolicy", "refreshSemanticSettings", "rebuild", "patchMarkdownPaths", "restoreSnapshot", "waitForSnapshotHydration"]],
      [app.vault, ["read", "cachedRead", "modify", "create"]]]) {
      for (const key of keys) {
        const original = owner[key]; if (typeof original !== "function") continue;
        const descriptor = Object.getOwnPropertyDescriptor(owner, key);
        const name = `${owner === p.index ? "index" : "vault"}.${key}`; counts[name] = 0;
        /** Forward every native operation unchanged; a nonzero observation fails this narrow gate. */
        const replacement = function (...args) { counts[name]++; return original.apply(this, args); };
        owner[key] = replacement;
        releases.push(/** Restore the exact descriptor/presence without overwriting a newer owner. */ () => { if (owner[key] === replacement) { if (descriptor) Object.defineProperty(owner, key, descriptor); else delete owner[key]; } });
      }
    }
    try { await action(); await frames(); check(Object.values(counts).every(/** Every covered source operation must remain absent. */ value => value === 0), `Refusal caused source work: ${JSON.stringify(counts)}`); return counts; }
    finally { for (const release of releases.reverse()) release(); }
  };

  await scenario("close-only-owned-unrelated-siblings-while-folded", async () => {
    const host = getHost(), companion = getCompanion(), originalHost = tabs(host.parent), originalCompanion = tabs(companion.parent);
    const hostExtra = await empty(host.parent), companionExtra = await empty(companion.parent);
    try {
      workspace.setActiveLeaf(host, {focus: true}); await command(true);
      hostExtra.detach(); await frames();
      check(folded() && p.sidecarLeaves.get(host) === companion, "Closing an unrelated hidden-group tab retired the fold");
      workspace.setActiveLeaf(getSibling(), {focus: true}); companionExtra.detach(); await frames();
      check(folded() && p.sidecarLeaves.get(host) === companion && workspace.activeLeaf === getSibling(), "Closing an unrelated surviving-group tab transferred ownership/focus");
      await command(false);
      check(JSON.stringify(tabs(host.parent)) === JSON.stringify(originalHost) && JSON.stringify(tabs(companion.parent)) === JSON.stringify(originalCompanion), "Unrelated-tab closure changed original native tabs");
    } finally { p.restorePlexFoldBeforeReveal(host); for (const leaf of [hostExtra, companionExtra]) if (p.leafIsAttached(leaf)) leaf.detach(); }
  });

  for (const position of ["left", "above", "below", "right"]) {
    let observed;
    await scenario(`orientation-${position}-group-control-and-share`, async () => {
      const host = getHost(), sibling = getSibling();
      // moveSidecar intentionally replaces its managed leaf. Temporarily parking our Empty tab
      // prevents it leaving an unrelated third group behind; no original tab is moved or closed.
      await move(sibling, host.parent);
      await p.moveSidecar(host, position, page);
      const replacement = p.sidecarLeaves.get(host); check(replacement && replacement !== host, "Orientation move lost managed companion");
      setCompanion(replacement); if (!c.createdLeaves.includes(replacement)) c.createdLeaves.push(replacement);
      await move(sibling, replacement.parent); workspace.setActiveLeaf(host, {focus: true}); await frames();
      const before = p.readPlexFoldCandidate(host); check(before?.position === position && before.hostShare !== null, "Requested orientation is not a safe measured native pair");
      await command(true);
      const button = group(replacement).querySelector(".kplex-sidecar-unfold-plex");
      const side = {left: "right", right: "left", above: "bottom", below: "top"}[position];
      check(button?.classList.contains(`is-${side}`), "Recovery control is on the wrong pair edge");
      const r = box(button), container = box(before.recoveryHost), axis = position === "left" || position === "right" ? "width" : "height";
      check(r.width > 0 && r.height > 0 && r.x >= container.x - 2 && r.y >= container.y - 2 && r.x + r.width <= container.x + container.width + 2 && r.y + r.height <= container.y + container.height + 2, "Orientation recovery control is outside its visible native wrapper");
      await click(button); await until(/** Recovery must restore this host without graph participation. */ () => !folded(), "Orientation recovery failed"); await frames();
      const after = p.readPlexFoldCandidate(host); check(after?.hostShare !== null && Math.abs(after.hostShare - before.hostShare) < 0.015, "Orientation round trip changed native split share");
      observed = {position, side, axis, beforeShare: before.hostShare, afterShare: after.hostShare};
    });
    detail(observed);
  }

  for (const [id, direction, expectedBranches] of [["direct-third-pane", "vertical", 3], ["nested-partial-pair", "horizontal", 2]]) {
    let counts;
    await scenario(`${id}-refuses-without-source-work`, async () => {
      const host = getHost(), companion = getCompanion();
      workspace.setActiveLeaf(companion, {focus: true});
      const extra = workspace.createLeafBySplit(companion, direction); c.createdLeaves.push(extra);
      try {
        await extra.setViewState({type: "empty", active: false}); await frames();
        const split = group(host).parentElement;
        const branches = [...split.children].filter(/** Count only actual native split branches. */ child => child.matches(".workspace-tabs,.workspace-split"));
        check(branches.length === expectedBranches, "Native fixture did not produce the intended unsupported topology");
        if (id === "nested-partial-pair") check(group(companion).parentElement !== split, "Native fixture did not create a nested partial pair");
        workspace.setActiveLeaf(host, {focus: true}); await frames();
        counts = await withoutSourceWork(async () => {
          check(p.readPlexFoldCandidate(host) === null, "Unsupported topology unexpectedly resolved a fold candidate");
          await p.collapsePlexForSidecar(host);
          check(!folded() && box(group(host)).width > 8 && !group(companion).querySelector(".kplex-sidecar-unfold-plex"), "Unsupported topology hid content or installed recovery");
        });
      } finally { p.restorePlexFoldBeforeReveal(host); if (p.leafIsAttached(extra)) extra.detach(); await frames(); await reassociate(); }
    });
    detail({counts});
  }

  await scenario("removed-recovery-control-repaired-once", async () => {
    await command(true); const companion = getCompanion(), original = group(companion).querySelector(".kplex-sidecar-unfold-plex");
    check(original, "Control-removal prerequisite missing"); original.remove();
    await until(/** The owned observer repairs only its exact native wrapper/control. */ () => original.isConnected, "Removed recovery control was not repaired"); await frames();
    check(group(companion).querySelectorAll(".kplex-sidecar-unfold-plex").length === 1 && folded(), "Control repair duplicated recovery or retired a valid fold");
    await click(original); await until(/** Trusted activation verifies the repaired control remains usable. */ () => !folded(), "Repaired control did not unfold");
  });

  await scenario("rapid-old-candidate-and-detached-control-stay-stale", async () => {
    const host = getHost(), oldCandidate = p.readPlexFoldCandidate(host); check(oldCandidate, "Rapid-toggle initial candidate missing");
    await p.togglePlexFold(oldCandidate); await frames();
    const oldButton = group(getCompanion()).querySelector(".kplex-sidecar-unfold-plex");
    await command(false); await command(true);
    const fresh = p.collapsedPlexHosts.get(host); check(fresh && oldButton && !oldButton.isConnected, "Rapid-toggle generations were not replaced");
    check(await p.togglePlexFold(oldCandidate) === false, "Stale accepted pair toggled a successor session");
    oldButton.click(); await frames();
    check(folded() && p.collapsedPlexHosts.get(host) === fresh, "Detached old control changed the fresh session");
    await command(false);
  });

  await scenario("native-tab-reorder-retains-fold-and-content", async () => {
    const host = getHost(), companion = getCompanion(), parent = companion.parent, before = tabs(parent), sibling = getSibling();
    await command(true);
    try {
      await move(sibling, parent, 0);
      check(folded() && p.sidecarLeaves.get(host) === companion, "Tab reorder changed exact group/pair ownership");
      check(before.every(/** A reorder must retain every original native tab state. */ entry => tabs(parent).some(value => JSON.stringify(value) === JSON.stringify(entry))), "Tab reorder changed native content");
      await move(sibling, parent, before.findIndex(/** Restore our exact owned tab ordinal. */ entry => entry.id === sibling.id));
      check(JSON.stringify(tabs(parent)) === JSON.stringify(before), "Native tab order did not restore");
      await command(false);
    } finally { p.restorePlexFoldBeforeReveal(host); }
  });

  await scenario("managed-tab-group-move-invalidates-without-content-loss", async () => {
    const host = getHost(), companion = getCompanion(), parent = companion.parent, ordinal = parent.children.indexOf(companion), state = companion.getViewState();
    await command(true);
    try {
      await move(companion, host.parent);
      await until(/** Reconciliation restores the captured old group before releasing its association. */ () => !folded() && !p.sidecarLeaves.has(host), "Managed tab move did not invalidate the exact fold");
      check(p.leafIsAttached(companion) && JSON.stringify(companion.getViewState()) === JSON.stringify(state) && box(group(host)).width > 8, "Managed tab move lost content or left its old host hidden");
    } finally { p.restorePlexFoldBeforeReveal(host); if (p.leafIsAttached(companion)) await move(companion, parent, ordinal); await reassociate(); }
  });
  unavailable("native-whole-tab-group-pointer-drag", "The installed public API and established display-mode pattern cover leaf moves; an actual whole-group drag and OS pointer drop require root's native interaction lane. A leaf reparent is not reported as whole-group drag acceptance.");

  const native = mainDocument.defaultView.require?.("@electron/remote").getCurrentWindow();
  if (native?.getBounds && native?.setBounds && native?.webContents?.getZoomFactor && native?.webContents?.setZoomFactor) {
    await scenario("native-window-resize-and-zoom-retain-recovery", async () => {
      const bounds = native.getBounds(), zoom = native.webContents.getZoomFactor();
      await command(true);
      try {
        native.setBounds({...bounds, width: bounds.width + 30, height: bounds.height + 20});
        native.webContents.setZoomFactor(zoom * 0.95); await wait(150); await frames();
        check(folded() && group(getCompanion()).querySelectorAll(".kplex-sidecar-unfold-plex").length === 1, "Native resize/zoom lost group recovery");
        await click(group(getCompanion()).querySelector(".kplex-sidecar-unfold-plex")); await until(/** Recovery uses post-zoom native coordinates. */ () => !folded(), "Zoomed recovery control did not activate");
      } finally { p.restorePlexFoldBeforeReveal(getHost()); native.webContents.setZoomFactor(zoom); native.setBounds(bounds); await frames(); }
    });
  } else unavailable("native-window-resize-and-zoom-retain-recovery", "Selected native window does not expose both bounds and zoom capabilities.");

  await scenario("folded-host-two-way-popout-migration-retires-old-session", async () => {
    const host = getHost(), mainParent = host.parent, ordinal = mainParent.children.indexOf(host), companion = getCompanion(), companionState = companion.getViewState();
    await command(true); const oldButton = group(companion).querySelector(".kplex-sidecar-unfold-plex");
    let popDocument, popKeeper;
    try {
      workspace.moveLeafToPopout(host);
      await until(/** Match the established display-mode lane's owning-document/remount boundary. */ () => host.view.containerEl.ownerDocument !== mainDocument && host.view.contentEl.querySelector(".kplex-app")?.isConnected && !folded(), "Folded host migration did not restore/remount in its new window");
      popDocument = host.view.containerEl.ownerDocument;
      await until(/** Native popout chrome must finish initialization before return migration. */ () => popDocument.body.style.getPropertyValue("--zoom-factor"), "Popout native chrome did not initialize");
      await host.view.waitUntilReady();
      // Keep the source native window alive until its migration callback has unmounted the old
      // root. Removing its last child before inserting it elsewhere destroys that window inside
      // the low-level test operation, unlike a complete native tab-drag transaction.
      popKeeper = await empty(host.parent);
      check(!oldButton?.isConnected && !mainDocument.querySelector(".kplex-folded-workspace-group") && !p.sidecarLeaves.has(host), "Source-window fold or association survived host migration");
      oldButton?.click(); await frames(); check(!folded(), "Retired source-window control affected migrated host");
    } finally {
      p.restorePlexFoldBeforeReveal(host);
      if (p.leafIsAttached(host) && host.parent !== mainParent) {
        await move(host, mainParent, ordinal); await workspace.revealLeaf(host); workspace.setActiveLeaf(host, {focus: true});
        await until(/** Return remount belongs to the original native document. */ () => host.view.containerEl.ownerDocument === mainDocument && host.view.contentEl.querySelector(".kplex-app")?.isConnected, "Popout host did not remount on return");
        await host.view.waitUntilReady();
      }
      check(!popDocument?.querySelector(".kplex-sidecar-unfold-plex,.kplex-folded-workspace-group"), "Retired popout retained fold DOM");
      check(p.leafIsAttached(companion) && JSON.stringify(companion.getViewState()) === JSON.stringify(companionState), "Host migration changed the surviving native document");
      await reassociate();
      if (popKeeper?.parent) popKeeper.detach();
    }
    await command(true); await command(false);
  });

  // Deliberately do not discover candidate files by scanning note data/frontmatter. A later root
  // invocation can supply exact already-prepared TFiles, retaining its own native-file receipts.
  const prepared = ports.prepareFiles ? await ports.prepareFiles() : c.foldPreparedFiles;
  if (!prepared?.markdown || !prepared?.drawing) {
    unavailable("managed-file-navigation-and-markdown-drawing-representation", "Requires root-prepared c.foldPreparedFiles={markdown,drawing} TFile identities and enabled Excalidraw; no file/content discovery is performed by this extension.");
  } else if (!app.plugins.plugins["obsidian-excalidraw-plugin"]?.isExcalidrawFile?.(prepared.drawing)) {
    unavailable("managed-file-navigation-and-markdown-drawing-representation", "The prepared drawing is not recognized by the running Excalidraw companion; no synthetic view type is treated as acceptance.");
  } else {
    await scenario("managed-file-navigation-and-markdown-drawing-representation", async () => {
      const host = getHost(), companion = getCompanion(), original = companion.getViewState();
      const drawingPlugin = app.plugins.plugins["obsidian-excalidraw-plugin"];
      const modeKeys = [companion.id, prepared.drawing.path].map(/** Preserve this case's exact runtime representation preferences. */ key => ({
        key, present: Object.prototype.hasOwnProperty.call(drawingPlugin.excalidrawFileModes, key), value: drawingPlugin.excalidrawFileModes[key],
      }));
      /** Observe exact file/view ownership after native navigation without inspecting its payload. */
      const retained = async (file, type) => {
        await until(/** Native file and representation must agree before testing recovery. */ () => companion.view.file === file && companion.view.getViewType() === type,
          `Managed representation ${type} did not load: ${JSON.stringify(companion.getViewState())}`);
        await frames(); check(folded() && p.sidecarLeaves.get(host) === companion && group(companion).querySelectorAll(".kplex-sidecar-unfold-plex").length === 1, "Managed document navigation/type change retired recovery or adopted another tab");
      };
      try {
        await companion.openFile(prepared.markdown, {active: true, state: {mode: "preview"}}); await frames();
        workspace.setActiveLeaf(host, {focus: true}); await command(true);
        await companion.openFile(prepared.drawing, {active: false});
        await retained(prepared.drawing, "excalidraw");
        await until(/** A real initialized native drawing owner is required, not its container alone. */ () => Boolean(companion.view.excalidrawAPI), "Native drawing API did not initialize");
        // The companion intentionally intercepts raw Markdown setViewState calls for drawings.
        // Its real representation owner records the native leaf mode before switching; bypassing
        // that owner would test a rejected setup rather than K-Plex's fold lifetime.
        await companion.view.setMarkdownView({focus: false}, false);
        await retained(prepared.drawing, "markdown");
        await companion.setViewState({type: "excalidraw", state: {file: prepared.drawing.path}, active: false});
        await retained(prepared.drawing, "excalidraw");
        await until(/** The second native drawing generation must also finish loading. */ () => Boolean(companion.view.excalidrawAPI), "Second native drawing API did not initialize");
        await companion.view.setMarkdownView({focus: false}, false);
        await retained(prepared.drawing, "markdown");
        await companion.openFile(prepared.markdown, {active: false, state: {mode: "preview"}});
        await retained(prepared.markdown, "markdown");
        await click(group(companion).querySelector(".kplex-sidecar-unfold-plex"));
        await until(/** Recovery remains actionable after both native content/representation directions. */ () => !folded(), "Representation round-trip recovery failed");
      } finally {
        p.restorePlexFoldBeforeReveal(host); if (p.leafIsAttached(companion)) await companion.setViewState({...original, active: false});
        for (const mode of modeKeys) { if (mode.present) drawingPlugin.excalidrawFileModes[mode.key] = mode.value; else delete drawingPlugin.excalidrawFileModes[mode.key]; }
        await frames(); await reassociate();
      }
    });
  }
  if (prepared?.pdf && prepared?.canvas) {
    await scenario("managed-pdf-and-canvas-recovery", async () => {
      const host = getHost(), companion = getCompanion(), original = companion.getViewState();
      try {
        for (const [file, type] of [[prepared.pdf, "pdf"], [prepared.canvas, "canvas"]]) {
          await companion.openFile(file, {active: true}); await frames();
          await until(/** A real native file view must own the prepared PDF/Canvas before folding. */ () => companion.view.file === file && companion.view.getViewType() === type, `Native ${type} fixture did not load`);
          workspace.setActiveLeaf(host, {focus: true}); await command(true);
          check(p.sidecarLeaves.get(host) === companion && folded(), `Native ${type} navigation changed pair ownership`);
          await click(group(companion).querySelector(".kplex-sidecar-unfold-plex"));
          await until(/** Recovery remains outside each native content surface. */ () => !folded(), `Native ${type} recovery failed`);
        }
      } finally { p.restorePlexFoldBeforeReveal(host); if (p.leafIsAttached(companion)) await companion.setViewState({...original, active: false}); await frames(); await reassociate(); }
    });
  } else unavailable("managed-pdf-and-canvas-recovery", "No prepared PDF or Canvas fixture was supplied; Markdown/drawing coverage does not establish these content types.");
  if (prepared?.markdown) {
    let backlog;
    await scenario("ordinary-hidden-edit-repairs-stationary-center-after-unfold", async () => {
      const host = getHost(), companion = getCompanion(), original = companion.getViewState(), originalCenter = p.settings.lastActivePath;
      const file = prepared.markdown, target = app.vault.getFileByPath("00 Start Here/First 5 minutes.md");
      check(target && app.vault.getFileByPath(file.path) === file && c.createdFiles.includes(file), "Backlog case requires the exact owned fixture and known native target");
      /** Observe requested work and existing scheduler/source owners, without forcing acquisition. */
      const facts = () => ({visible: p.isKplexLeafVisible(host), demand: p.index.semanticDemandCounts.get(file.path) ?? 0,
        dirty: p.indexDirty, active: p.index.hasActiveSemanticPreparation(), pending: p.index.hasPendingSemanticPreparation(),
        work: p.index.getWorkPriorityDiagnostics(), source: p.index.getSourceAcquisitionCounters()});
      /** A ready indicator alone is insufficient: actual requested tasks and checkpoint saving must drain. */
      const settled = () => {
        const work = p.index.getWorkPriorityDiagnostics(), source = p.index.sourceAcquisition;
        // Source counters are cumulative observations, not queues. Reuse the actual owner drain
        // conditions from the foreground lane; dormant known-file backlog is deliberately excluded.
        return p.getIndexStatus().upToDate && !p.index.hasActiveSemanticPreparation() && !p.index.hasPendingSemanticPreparation()
          && !p.index.isCheckpointSaving() && !p.index.snapshotPersistTimer
          && !source.inventory && !source.timer && !source.knownImpactTasks && !source.knownFanoutTasks.size
          && !source.deferredResolutionRetryTimer && !source.resolverWaveTimer
          && work.active.every(count => count === 0) && work.waiting === 0;
      };
      const center = () => host.view.contentEl.querySelector(".kplex-role-center")?.dataset.kplexPath;
      try {
        workspace.setActiveLeaf(host, {focus: true});
        await until(/** Ordinary create events must expose the exact physical endpoint. */ () => p.index.get(file.path)?.file === file, "Owned backlog center unavailable");
        // App's production navigation subscriber owns center/history, native sync and requested demand.
        p.notifyNavigation(file.path);
        await until(/** Establish genuine ordinary work completion before creating the hidden edit. */ () => center() === file.path && settled(), "Owned backlog center did not settle", 30000);
        const beforeGraph = p.index.getNeighborhood(file.path);
        check(beforeGraph && ![beforeGraph.parents, beforeGraph.children, beforeGraph.leftFriends, beforeGraph.rightFriends].some(items => items.some(item => item.page.file === target)), "Backlog target must be a genuinely new neighbor");
        const history = JSON.stringify(p.settings.navigationHistory); backlog = {before: facts()};
        await command(true); backlog.folded = facts();
        await app.vault.modify(file, `${await app.vault.read(file)}\n[[${target.path}]]\n`);
        await until(/** Real host metadata must observe the saved owned-note edit before reveal. */ () => app.metadataCache.getFileCache(file)?.links?.some(link => link.link === target.path), "Owned edit metadata absent");
        backlog.hiddenAfterEdit = facts(); check(folded(), "Ordinary hidden edit unexpectedly unfolded the group");
        await command(false);
        await until(/** Require the same rendered center and its real new semantic/native endpoint after work drains. */ () => {
          const graph = p.index.getNeighborhood(file.path);
          return center() === file.path && graph && [graph.parents, graph.children, graph.leftFriends, graph.rightFriends].some(items => items.some(item => item.page.file === target))
            && Array.from(host.view.contentEl.querySelectorAll("[data-kplex-path]")).some(element => element.dataset.kplexPath === target.path) && settled();
        }, "Stationary center did not acquire its ordinary hidden edit after unfold", 30000);
        backlog.revealed = facts();
        check(p.settings.lastActivePath === file.path && JSON.stringify(p.settings.navigationHistory) === history, "Fold/edit/reveal changed center or history intent");
      } finally {
        p.restorePlexFoldBeforeReveal(host); if (originalCenter) p.notifyNavigation(originalCenter);
        if (p.leafIsAttached(companion)) await companion.setViewState({...original, active: false});
        await frames(); await reassociate();
      }
    });
    detail({backlog});
  } else unavailable("ordinary-hidden-edit-repairs-stationary-center-after-unfold", "Requires the root-owned disposable Markdown fixture; existing notes are never modified.");
  await reassociate();
  check(getSibling().parent === getCompanion().parent && p.leafIsAttached(getSibling()) && getSibling().getViewState().type === "empty", "Extended cases must leave the prepared New tab beside the exact managed companion");
}
