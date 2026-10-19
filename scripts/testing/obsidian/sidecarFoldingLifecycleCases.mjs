/**
 * Destructive native lifecycle cases for the existing disposable-vault folding driver. Injected
 * through toString(), so every dependency is supplied by its existing ports. All closed/replaced
 * leaves and the one popout belong to this helper; original workspace content is never detached.
 * No files are created, notes edited or metadata scanned. Existing caller-supplied content is
 * opened through normal Sidecar navigation; only native view state enters the observations.
 * Fresh graphs use the caller's bounded startup lease, awaiting the real opening callback with
 * persisted-Sidecar adoption suppressed before explicitly creating their fixture companions.
 */
export async function runSidecarFoldingLifecycleCases(ports) {
  const {p, workspace, c, page, check, until, frames, scenario, click, getHost, getCompanion, openFreshPlex} = ports;
  const app = p.app, originalHost = getHost(), originalCompanion = getCompanion();
  const doc = originalHost.view.containerEl.ownerDocument, originalPosition = p.getDocumentSidecarPosition(originalHost);
  const originalLeaves = new Set(); workspace.iterateAllLeaves(/** A truthy native iterator result stops traversal; recording must return void. */ leaf => { originalLeaves.add(leaf); });
  check(originalLeaves.has(originalHost) && originalLeaves.has(originalCompanion), "Full lifecycle opening inventory must protect the original pair");
  /** Native groups, rather than file/graph identity, own hidden presentation and recovery. */
  const group = leaf => leaf.parent?.containerEl;
  /** Capture view-state identity without reading the native file payload. */
  const state = leaf => JSON.stringify(leaf.getViewState());
  /** Record finite observations in the parent driver's existing evidence stream. */
  const detail = value => Object.assign(c.scenarios[c.scenarios.length - 1], value);
  /** Create and register only an owned Empty tab in an existing fixture group. */
  const empty = async parent => {
    const leaf = workspace.createLeafInParent(parent, parent.children.length); c.createdLeaves.push(leaf);
    await leaf.setViewState({type: "empty", active: false}); return leaf;
  };
  /** Use the real registered action instead of retargeting the driver's original command owner. */
  const fold = async host => {
    const surface = [...p.actionSurfaceHosts].find(/** Require this exact new view generation. */ ([, owner]) => owner.leaf === host)?.[0];
    check(surface, "Owned lifecycle Plex has no mounted action registration");
    const result = await p.actionManager.dispatch({id: "view.sidecar.collapse-plex", source: "toolbar", surfaceId: surface});
    check(result.status === "completed", `Owned lifecycle fold returned ${result.status}`);
    await until(/** Only the exact native session proves completion. */ () => p.isPlexFoldedForSidecar(host), "Owned lifecycle pair did not fold"); await frames();
  };
  /** Every destructive case gets a new two-group nested split and a normal managed companion. */
  const fixture = async action => {
    const owned = [], host = workspace.createLeafBySplit(originalHost, "vertical");
    owned.push(host); c.createdLeaves.push(host);
    let companion;
    try {
      await openFreshPlex(host);
      await until(/** Native creation may precede registration and initial layout. */ () => [...p.actionSurfaceHosts.values()].some(owner => owner.leaf === host), "Lifecycle Plex did not mount");
      await p.moveSidecar(host,"below",page); await p.openSidecar(host, page); companion = p.sidecarLeaves.get(host);
      check(companion && !originalLeaves.has(companion), "Lifecycle fixture must not adopt original content");
      owned.push(companion); c.createdLeaves.push(companion);
      await until(/** Real host layout/attachment must settle before destructive transitions. */ () => !p.sidecarMovingHosts.has(host) && p.readPlexFoldCandidate(host), "Lifecycle pair is not safely eligible");
      workspace.setActiveLeaf(host, {focus: true}); await frames();
      await action({host, companion, owned});
    } catch (error) {
      c.lifecycleFailure = {error: String(error.stack ?? error), openingNativeLeafCount: originalLeaves.size, originalPairProtected: originalLeaves.has(originalHost) && originalLeaves.has(originalCompanion), host: {id: host.id, attached: p.leafIsAttached(host), type: host.getViewState().type}, companion: companion ? {id: companion.id, attached: p.leafIsAttached(companion), type: companion.getViewState().type, owned: p.sidecarLeaves.get(host) === companion} : null,
        groups: [host, companion].filter(Boolean).map(/** Diagnose actual native ancestry/geometry without reading native content. */ leaf => ({group: leaf.parent?.id, parent: leaf.parent?.parent?.id, rect: (() => {const r = group(leaf)?.getBoundingClientRect();return r ? {x:r.x,y:r.y,width:r.width,height:r.height}:null;})(), branches: group(leaf)?.parentElement ? [...group(leaf).parentElement.children].map(value => value.className) : []}))};
      throw error;
    } finally {
      p.restorePlexFoldBeforeReveal(host);
      if (p.leafIsAttached(host)) host.detach();
      for (const leaf of owned.slice().reverse()) if (!originalLeaves.has(leaf) && p.leafIsAttached(leaf)) leaf.detach();
      await frames();
    }
  };
  /** Await lifecycle-owned restoration/release; never repair it before checking the invariant. */
  const released = async (host, hostGroup, recovery) => {
    await until(/** Ordinary layout/view events must retire the old session and exact association. */ () => !p.isPlexFoldedForSidecar(host) && !p.sidecarLeaves.has(host), "Native lifecycle left a stale fold or association");
    await frames(); check(!hostGroup.classList.contains("kplex-folded-workspace-group") && !recovery?.isConnected, "Lifecycle left hidden native content or stale recovery");
  };
  try {
    await scenario("close-owned-plex-preserves-hidden-group-new-tab-and-companion", async () => {
      await fixture(async ({host, companion, owned}) => {
        const sibling = await empty(host.parent); owned.push(sibling);
        const hostGroup = group(host), companionState = state(companion);
        await fold(host); const recovery = group(companion).querySelector(".kplex-sidecar-unfold-plex");
        host.detach(); await released(host, hostGroup, recovery);
        check(p.leafIsAttached(sibling) && sibling.getViewState().type === "empty" && group(sibling) === hostGroup && hostGroup.getBoundingClientRect().height > 8, "Closing Plex lost or hid its surviving unowned New tab");
        check(p.leafIsAttached(companion) && state(companion) === companionState, "Closing Plex closed or changed its surviving companion");
        check(![...p.sidecarLeaves.values()].includes(sibling), "Closing Plex adopted the remaining New tab");
      });
    });
    await scenario("same-leaf-managed-replacement-to-empty-restores-and-releases", async () => {
      await fixture(async ({host, companion}) => {
        const hostGroup = group(host); await fold(host); const recovery = group(companion).querySelector(".kplex-sidecar-unfold-plex");
        await companion.setViewState({type: "empty", active: false}); await released(host, hostGroup, recovery);
        check(p.leafIsAttached(companion) && companion.getViewState().type === "empty" && hostGroup.getBoundingClientRect().height > 8, "Same-leaf Empty replacement was lost or left its host hidden");
        check(![...p.sidecarLeaves.values()].includes(companion), "Empty replacement was adopted by another owner");
      });
    });
    await scenario("last-owned-companion-group-close-restores-host", async () => {
      await fixture(async ({host, companion}) => {
        check(companion.parent.children.length === 1, "Last-companion fixture has another native tab");
        const hostGroup = group(host), companionGroup = group(companion); await fold(host);
        const recovery = companionGroup.querySelector(".kplex-sidecar-unfold-plex"); companion.detach(); await released(host, hostGroup, recovery);
        check(p.leafIsAttached(host) && hostGroup.getBoundingClientRect().height > 8 && !companionGroup.isConnected, "Closing the last companion tab stranded its hidden host or group");
      });
    });
    await scenario("managed-companion-popout-close-restores-source-without-closing-siblings", async () => {
      let receipt;
      await fixture(async ({host, companion, owned}) => {
        const sibling = await empty(companion.parent); owned.push(sibling);
        const siblingState = state(sibling), hostGroup = group(host), sourceGroup = group(companion), companionState = state(companion);
        await fold(host); const recovery = sourceGroup.querySelector(".kplex-sidecar-unfold-plex");
        let popDocument, popWindow;
        try {
          workspace.moveLeafToPopout(companion);
          await until(/** Native migration must actually leave the original owning document. */ () => companion.view.containerEl.ownerDocument !== doc, "Companion did not migrate to a real popout");
          popDocument = companion.view.containerEl.ownerDocument;
          popWindow = popDocument.defaultView;
          await until(/** Native chrome initialization precedes safe closure of this new window. */ () => popDocument.body.style.getPropertyValue("--zoom-factor"), "Owned companion popout chrome did not initialize");
          // Capture native DOM ownership only. Acquiring a child-realm remote proxy merely to
          // observe its destruction adds an unrelated IPC lifetime to this close acceptance case.
          check(popWindow && !popWindow.closed && popDocument !== doc, "Cannot identify the owned companion popout");
          await released(host, hostGroup, recovery);
          check(p.leafIsAttached(companion) && state(companion) === companionState, "Companion migration lost its native content");
          check(p.leafIsAttached(sibling) && group(sibling) === sourceGroup && state(sibling) === siblingState, "Companion migration changed unrelated source-group content");
          check(!popDocument.querySelector(".kplex-sidecar-unfold-plex,.kplex-folded-workspace-group"), "Popout inherited retired source fold presentation");
          check(companion.parent.children.length === 1, "Owned popout contains an unexpected native tab");
          popWindow.close(); await until(/** Both native window closure and leaf removal must settle. */ () => popWindow.closed && !p.leafIsAttached(companion), "Owned companion popout did not close");
          check(p.leafIsAttached(host) && p.leafIsAttached(sibling) && state(sibling) === siblingState && !p.isPlexFoldedForSidecar(host), "Closing companion popout closed source content or refolded its host");
          receipt = {sourceContentRetained: true, nativePopoutClosed: true};
        } finally {
          if (popWindow && !popWindow.closed) {
            check(popDocument !== doc && companion.view.containerEl.ownerDocument === popDocument, "Refuse closing a window no longer owned by this fixture");
            popWindow.close(); await until(/** Failure cleanup uses the same owned DOM/native close boundary. */ () => popWindow.closed && !p.leafIsAttached(companion), "Owned popout cleanup did not finish");
          }
        }
      });
      detail(receipt);
    });
  } finally {
    p.documentSession(originalHost).preferences.sidecarPosition = originalPosition;
    check(p.leafIsAttached(originalHost) && p.leafIsAttached(originalCompanion), "Lifecycle fixtures affected original native leaves");
    workspace.setActiveLeaf(originalCompanion, {focus: true}); await frames();
    if (p.sidecarLeaves.get(originalHost) !== originalCompanion || p.getDocumentSyncMode(originalHost) !== "pinned") await p.attachAdjacentSidecar(originalHost, "to-plex");
    check(p.sidecarLeaves.get(originalHost) === originalCompanion, "Lifecycle cleanup did not retain the original exact companion");
    workspace.setActiveLeaf(originalHost, {focus: true}); await frames();
  }
  // The host's observed getter distinguishes automatic mode from an omitted configuration field.
  // Its characterized system-mode command changes body classes/CSS notifications, not preference.
  const readThemePreference = typeof app.vault.getConfig === "function"
    ? /** Read the characterized native scalar without assuming an appearance.json default. */ () => app.vault.getConfig("theme") : null;
  const openingPreference = readThemePreference?.();
  if (!readThemePreference || !["obsidian", "moonstone", "system"].includes(openingPreference)) {
    c.scenarios.push({id: "native-host-theme-switch", status: "unavailable", reason: "Requires the characterized native getConfig('theme') getter and an observed obsidian/moonstone/system value; an omitted preference is not guessed from configuration bytes."});
    return;
  }
  const initiallyLight = doc.body.classList.contains("theme-light");
  await scenario("native-host-theme-switch", async () => {
    const rows = [];
    try {
      await ports.command(true); const session = p.collapsedPlexHosts.get(originalHost), recovery = group(originalCompanion).querySelector(".kplex-sidecar-unfold-plex");
      check(session && recovery, "Theme-switch fold prerequisite missing");
      for (let index = 0; index < 2; index++) {
        const before = doc.body.classList.contains("theme-light");
        check(app.commands.executeCommandById("theme:toggle-light-dark"), "Native theme toggle command unavailable");
        await until(/** Body mode proves the actual native theme transition. */ () => doc.body.classList.contains("theme-light") !== before, "Native theme mode did not change"); await frames();
        if (openingPreference === "system") check(readThemePreference() === openingPreference, "Automatic-mode theme toggle changed the stored preference");
        check(p.collapsedPlexHosts.get(originalHost) === session && recovery.isConnected && group(originalCompanion).querySelectorAll(".kplex-sidecar-unfold-plex").length === 1, "Native theme change retired or duplicated recovery");
        const style = doc.defaultView.getComputedStyle(recovery); rows.push({mode: before ? "dark" : "light", color: style.color, background: style.backgroundColor});
      }
      await click(recovery); await until(/** The same trusted control must remain functional after both native modes. */ () => !p.isPlexFoldedForSidecar(originalHost), "Theme-switched recovery failed");
    } finally {
      p.restorePlexFoldBeforeReveal(originalHost);
      if (doc.body.classList.contains("theme-light") !== initiallyLight) check(app.commands.executeCommandById("theme:toggle-light-dark"), "Native theme restoration command unavailable");
      await until(/** Restore the opening body mode while preserving its automatic or explicit preference. */ () => doc.body.classList.contains("theme-light") === initiallyLight, "Original native theme mode did not restore");
      check(readThemePreference() === openingPreference, "Native theme preference did not restore exactly");
    }
    Object.assign(c, {foldThemeModes: rows});
  });
  detail({modes: c.foldThemeModes, nativeThemePreference: openingPreference, preferenceRestored: true}); delete c.foldThemeModes;
}
