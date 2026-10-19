/**
 * Serial routing/input extension for the disposable-vault native folding lane. The caller injects
 * this function through toString(), so all helpers are local and there are no module dependencies.
 * Real commands, hotkeys, native picker navigation and owned fixture leaves are exercised without
 * reading or editing note text. Outer driver cleanup retains the original workspace/configuration.
 * The caller's openFreshPlex lease awaits the real startup callback with restored-Sidecar adoption
 * suppressed; fixture companions are then created only through explicit normal Open Sidecar.
 */
export async function runSidecarFoldRoutingCases(ports) {
  const {p, workspace, c, page, check, until, frames, wait, command, scenario,
    getHost, getCompanion, getSibling, openFreshPlex} = ports;
  const app = p.app, host = getHost(), companion = getCompanion(), sibling = getSibling();
  const doc = host.view.containerEl.ownerDocument, ownerWindow = doc.defaultView;
  const native = ownerWindow.require("@electron/remote").getCurrentWindow();
  const id = "view.sidecar.collapse-plex", commandId = "k-plex:kplex-action-view-sidecar-collapse-plex";
  /** Native group ownership does not depend on which sibling tab has focus. */
  const group = leaf => leaf.parent?.containerEl;
  /** Find a live generation's existing registration without creating or touching graph state. */
  const surface = leaf => [...p.actionSurfaceHosts].find(/** Retain exact native leaf identity. */ ([, owner]) => owner.leaf === leaf)?.[0];
  /** Read the native owner rather than assuming command completion means a fold occurred. */
  const folded = leaf => p.isPlexFoldedForSidecar(leaf);
  /** Attach finite receipts to the existing driver's collected scenario list. */
  const detail = value => Object.assign(c.scenarios[c.scenarios.length - 1], value);
  /** Missing prerequisites remain explicit unrun coverage rather than a successful substitute. */
  const unavailable = (name, reason) => c.scenarios.push({id: name, status: "unavailable", reason});
  /** Deliver actual Electron keyboard stages and prove trusted arrival in the owning document. */
  const key = async (keyCode, modifiers = []) => {
    let observed, event;
    const expected = {Down: "ArrowDown", Up: "ArrowUp", Space: " "}[keyCode] ?? keyCode;
    /** Observe bounded key metadata only; never capture editable text or native file state. */
    const receive = value => {
      if (value.key.toLowerCase() !== expected.toLowerCase()) return;
      event = value; observed = {key: value.key, code: value.code, trusted: value.isTrusted,
        control: value.ctrlKey, meta: value.metaKey, shift: value.shiftKey, alt: value.altKey};
    };
    ownerWindow.addEventListener("keydown", receive, true);
    let down = false;
    try {
      native.show(); native.focus(); native.webContents.focus();
      await until(/** Require real selected-renderer foreground for trusted native input. */ () => native.isFocused() && doc.hasFocus() && !doc.hidden, "Routing keyboard renderer did not gain foreground", 5000);
      native.webContents.sendInputEvent({type: "keyDown", keyCode, modifiers}); down = true;
      await until(/** A missing native event is a transport failure, not a passed interaction. */ () => observed, `Native ${keyCode} keydown did not arrive`);
      check(observed.trusted, "Routing keyboard input was not trusted");
      check(observed.shift === modifiers.includes("shift") && observed.alt === modifiers.includes("alt")
        && observed.meta === modifiers.includes("meta") && observed.control === modifiers.includes("control"), "Native keyboard modifiers did not match the requested chord");
      if (!event.defaultPrevented && !modifiers.some(/** Modified accelerators must not insert printable text. */ value => ["meta", "control", "alt"].includes(value)) && ["Enter", "Space"].includes(keyCode)) {
        native.webContents.sendInputEvent({type: "char", keyCode: keyCode === "Enter" ? "\r" : " ", modifiers});
      }
      native.webContents.sendInputEvent({type: "keyUp", keyCode, modifiers}); down = false;
      await wait(25); await frames(); return observed;
    } finally {
      if (down) native.webContents.sendInputEvent({type: "keyUp", keyCode, modifiers});
      ownerWindow.removeEventListener("keydown", receive, true);
    }
  };
  /** Reassociation explicitly shows the original document, never accidentally claims its New tab. */
  const restoreOriginalPair = async () => {
    p.restorePlexFoldBeforeReveal(host);
    p.documentSession(host).preferences.sidecarPosition = "right";
    check(p.leafIsAttached(host) && p.leafIsAttached(companion) && p.leafIsAttached(sibling), "Routing fixture lost original native content");
    workspace.setActiveLeaf(companion, {focus: true}); await frames();
    if (p.sidecarLeaves.get(host) !== companion) await p.attachAdjacentSidecar(host, "to-plex");
    check(p.sidecarLeaves.get(host) === companion, "Routing cleanup did not reassociate the original native companion");
    check(sibling.parent === companion.parent && sibling.getViewState().type === "empty", "Routing cleanup changed the driver-owned New tab");
    workspace.setActiveLeaf(host, {focus: true}); await frames();
  };
  /** Dispatch the real registered surface route, preserving the implementation's host ownership. */
  const explicit = async (leaf, expected) => {
    const surfaceId = surface(leaf); check(surfaceId, "Exact routing surface is unavailable");
    const result = await p.actionManager.dispatch({id, source: "toolbar", surfaceId});
    check(result.status === "completed", `Exact fold action returned ${JSON.stringify({result,managed:p.sidecarLeaves.has(leaf),candidate:Boolean(p.readPlexFoldCandidate(leaf)),foldedHosts:[...p.collapsedPlexHosts.keys()].map(host=>host.id),overlapDelete:c.overlapDelete})}`);
    await until(/** No readiness/green indicator substitutes for the expected exact native state. */ () => folded(leaf) === expected, "Exact native pair did not reach its requested state"); await frames();
  };

  for (const keyCode of ["Enter", "Space"]) {
    let receipt;
    await scenario(`trusted-${keyCode.toLowerCase()}-native-recovery-button`, async () => {
      workspace.setActiveLeaf(host, {focus: true}); await command(true);
      const button = group(companion).querySelector(".kplex-sidecar-unfold-plex");
      check(button?.isConnected && button.type === "button", "Native recovery button is unavailable");
      button.focus(); check(doc.activeElement === button, "Native recovery button could not receive keyboard focus");
      receipt = await key(keyCode);
      await until(/** Native default button activation must restore its exact captured host. */ () => !folded(host), `${keyCode} did not activate native recovery`);
      check(workspace.activeLeaf === host && !group(companion).querySelector(".kplex-sidecar-unfold-plex"), "Keyboard recovery lost focus or left a control behind");
    });
    detail({key: receipt});
  }

  if (app.hotkeyManager?.getHotkeys && app.hotkeyManager?.setHotkeys && app.hotkeyManager?.removeHotkeys && app.hotkeyManager?.save) {
    let receipts;
    await scenario("published-native-mod-shift-f9-fold-toggle", async () => {
      const original = app.hotkeyManager.getHotkeys(commandId), prior = original === undefined ? undefined : structuredClone(original);
      const modifiers = [ownerWindow.navigator.platform.toLowerCase().includes("mac") ? "meta" : "control", "shift"];
      /** Focus an existing Empty-tab control to exclude local graph shortcut interception. */
      const focusSibling = async () => {
        workspace.setActiveLeaf(sibling, {focus: true}); await frames();
        const focusable = sibling.view.containerEl.querySelector("button, input, [tabindex]") ?? sibling.view.containerEl;
        focusable.focus(); check(sibling.view.containerEl.contains(doc.activeElement), "Native New tab did not own accelerator focus");
      };
      try {
        app.hotkeyManager.setHotkeys(commandId, [{modifiers: ["Mod", "Shift"], key: "F9"}]); await app.hotkeyManager.save();
        check(app.commands.commands[commandId] && app.hotkeyManager.getHotkeys(commandId)?.some(/** Inspect only this temporary published binding. */ value => value.key === "F9"), "Published native shortcut did not install");
        await focusSibling(); const first = await key("F9", modifiers);
        await until(/** Actual native accelerator must run the published command. */ () => folded(host), "Native Mod-Shift-F9 did not fold");
        await focusSibling(); const second = await key("F9", modifiers);
        await until(/** The same native accelerator is a true toggle, not a fold-only command. */ () => !folded(host), "Native Mod-Shift-F9 did not unfold"); receipts = [first, second];
      } finally {
        p.restorePlexFoldBeforeReveal(host);
        if (prior === undefined) app.hotkeyManager.removeHotkeys(commandId); else app.hotkeyManager.setHotkeys(commandId, prior);
        await app.hotkeyManager.save();
        check(JSON.stringify(app.hotkeyManager.getHotkeys(commandId)) === JSON.stringify(prior), "Native shortcut binding did not restore exactly");
      }
    });
    detail({keys: receipts, priorBindingRestored: true});
  } else unavailable("published-native-mod-shift-f9-fold-toggle", "Running host does not expose the characterized hotkeyManager get/set/remove/save methods.");

  // Native split creation and inactive setViewState keep these new graph generations free of
  // explicit focus/pointer interaction. Their actual ledger is checked; it is never reset.
  const created = [], graphs = [], pairs = [], dialogs = new Set(), position = p.getDocumentSidecarPosition(host), openingLeaves = new Set();
  workspace.iterateAllLeaves(/** Native iteration stops on a truthy result; always return void after recording. */ leaf => { openingLeaves.add(leaf); });
  check(openingLeaves.has(host) && openingLeaves.has(companion) && openingLeaves.has(sibling), "Full opening native inventory must protect every original prepared leaf");
  try {
    const search = workspace.getLeavesOfType("search").find(/** Keep the unrelated native owner in this exact window. */ leaf => leaf.view.containerEl.ownerDocument === doc);
    /** A genuine unrelated native Search view prevents participating groups identifying a pair. */
    const focusSearch = async () => {
      check(search && p.leafIsAttached(search), "Existing native Search prerequisite unavailable");
      await workspace.revealLeaf(search); workspace.setActiveLeaf(search, {focus: true}); await frames();
      const input = search.view.containerEl.querySelector("input"); check(input, "Native Search has no focusable input");
      input.focus(); check(search.view.containerEl.contains(doc.activeElement), "Native Search does not own actual focus");
    };
    if (search) await focusSearch();
    for (const name of ["A", "B"]) {
      const graph = workspace.createLeafBySplit(host, "vertical"); graphs.push(graph); created.push(graph); c.createdLeaves.push(graph);
      await openFreshPlex(graph);
      await until(/** Require the real mounted action generation before any route assertion. */ () => surface(graph), `Fresh ${name} action surface did not mount`);
      await p.moveSidecar(graph,"below",page); await p.openSidecar(graph, page);
      const documentLeaf = p.sidecarLeaves.get(graph); check(documentLeaf, `Fresh ${name} managed companion missing`);
      check(!openingLeaves.has(documentLeaf), "Fresh disjoint fixture unexpectedly adopted original native content");
      created.push(documentLeaf); c.createdLeaves.push(documentLeaf); pairs.push({name, graph, documentLeaf});
      if (search) await focusSearch();
    }
    const [a, b] = pairs;
    check(p.readPlexFoldCandidate(a.graph) && p.readPlexFoldCandidate(b.graph), "Fixture did not produce two disjoint eligible native pairs");
    check(p.readPlexFoldCandidate(host) === null, "Original native pair must be ineligible in this temporary multi-branch layout");
    if (search) {
      let pickerReceipt;
      await scenario("real-native-ambiguity-picker-cancel-and-select-b", async () => {
        const candidates = p.readPlexFoldCandidates(ownerWindow);
        check(candidates.length === 2 && candidates.every(/** Only the two fresh exact pairs may be presented. */ value => value.hostLeaf === a.graph || value.hostLeaf === b.graph), "Ambiguity fixture contains an unexpected eligible pair");
        const ledger = pairs.map(/** Freshness is observed from the established production ledger. */ value => p.actionManager.readInteractionOrder(surface(value.graph)));
        check(ledger.every(/** Do not manufacture equal recency or erase a real user interaction. */ value => value === 0), `Fresh fixture unexpectedly recorded explicit interactions: ${JSON.stringify(ledger)}`);
        /** Open the real published command and locate its actual native dialog without assuming a class. */
        const open = async () => {
          await focusSearch(); const previous = new Set(p.actionDialogs.keys());
          check(app.commands.executeCommandById(commandId), "Published ambiguity command unavailable");
          let dialog;
          await until(/** Only this invocation's actual native picker can satisfy the prerequisite. */ () => {
            dialog = [...p.actionDialogs.keys()].find(value => !previous.has(value) && typeof value.getItems === "function");
            if (dialog) dialogs.add(dialog);
            return dialog?.inputEl?.isConnected;
          }, "Native ambiguity picker did not open");
          const items = dialog.getItems(); check(items.length === 2 && items.every(/** Captured native pair tokens stay finite and enabled. */ value => !value.disabled && typeof value.value?.id === "string"), "Native picker did not retain its two eligible captured targets");
          dialog.inputEl.focus(); return {dialog, items};
        };
        const first = await open(), firstTokens = first.items.map(/** Retain opaque route identities, not file data. */ value => value.value.id);
        await key("Escape"); await until(/** Escape must release this exact modal/session. */ () => !p.actionDialogs.has(first.dialog), "Native picker did not cancel");
        check(!folded(a.graph) && !folded(b.graph) && p.collapsedPlexHosts.size === 0 && doc.querySelectorAll(".kplex-sidecar-unfold-plex").length === 0, "Picker cancellation changed native folds");
        const second = await open(), bToken = p.readPlexFoldCandidate(b.graph).token;
        const index = second.items.findIndex(/** Select B by its captured real token, not registration order. */ value => value.value.id === bToken);
        check(index >= 0, "Native picker omitted fresh pair B");
        await until(/** Native suggestions render independently of modal input attachment. */ () => second.dialog.resultContainerEl.querySelectorAll(".suggestion-item").length === 2
          && second.dialog.resultContainerEl.querySelector(".suggestion-item.is-selected"), "Native picker rows did not finish rendering");
        const rows = [...second.dialog.resultContainerEl.querySelectorAll(".suggestion-item")];
        const selected = rows.findIndex(/** Native suggestion selection, not an injected callback, owns navigation. */ value => value.classList.contains("is-selected"));
        check(rows.length === 2 && selected >= 0, "Native picker rendered an unexpected selection/list shape");
        for (let n = selected; n < index; n++) await key("Down");
        for (let n = selected; n > index; n--) await key("Up");
        check(rows[index].classList.contains("is-selected"), "Native arrow navigation did not select captured pair B");
        await key("Enter"); await until(/** Choice uses the captured target and closes the native picker. */ () => folded(b.graph) && !p.actionDialogs.has(second.dialog), "Native picker choice did not fold B");
        check(!folded(a.graph) && p.collapsedPlexHosts.size === 1, "Native picker choice changed another disjoint pair");
        pickerReceipt = {count: 2, freshInteractionOrders: ledger, cancelledTokens: firstTokens, selectedOrdinal: index + 1};
      });
      detail(pickerReceipt);
    } else unavailable("real-native-ambiguity-picker-cancel-and-select-b", "No existing native Search leaf in the selected window; the helper does not substitute a graph control or fabricate recency.");

    await scenario("disjoint-native-fold-sessions-remain-independent", async () => {
      if (!folded(b.graph)) await explicit(b.graph, true);
      const bSession = p.collapsedPlexHosts.get(b.graph), bButton = group(b.documentLeaf).querySelector(".kplex-sidecar-unfold-plex");
      await explicit(a.graph, true);
      check(folded(a.graph) && folded(b.graph) && p.collapsedPlexHosts.size === 2 && p.collapsedPlexHosts.get(b.graph) === bSession && bButton?.isConnected, "Folding A replaced independent B recovery");
      await explicit(a.graph, false);
      check(!folded(a.graph) && folded(b.graph) && p.collapsedPlexHosts.get(b.graph) === bSession && bButton.isConnected, "Unfolding A changed independent B");
      await explicit(b.graph, false); check(p.collapsedPlexHosts.size === 0, "Independent unfold left a session behind");
    });
    detail({openingNativeLeafCount: openingLeaves.size, originalPreparedLeavesProtected: true});
  } catch (error) {
    c.routingFailure = { error: String(error.stack ?? error), original: [host, companion, sibling].map(/** Retain exact native fixture identity and attachment only. */ leaf => ({id: leaf.id, attached: p.leafIsAttached(leaf), type: leaf.getViewState().type})), created: created.map(/** Diagnose cleanup ownership without collecting native document payloads. */ leaf => ({id: leaf.id, attached: p.leafIsAttached(leaf), type: leaf.getViewState().type})) };
    throw error;
  } finally {
    for (const dialog of dialogs) if (p.actionDialogs.has(dialog)) dialog.close();
    for (const graph of graphs) {
      p.restorePlexFoldBeforeReveal(graph);
      const ownedDocument = p.sidecarLeaves.get(graph);
      if (ownedDocument && !openingLeaves.has(ownedDocument) && !created.includes(ownedDocument)) {
        created.push(ownedDocument); c.createdLeaves.push(ownedDocument);
      }
    }
    // Closing only fixture graphs releases ownership but deliberately leaves their documents open;
    // the second pass closes only those equally fixture-owned native document leaves.
    for (const graph of graphs) if (p.leafIsAttached(graph)) graph.detach();
    for (const leaf of created.slice().reverse()) if (p.leafIsAttached(leaf)) leaf.detach();
    await frames(); p.documentSession(host).preferences.sidecarPosition = position; await restoreOriginalPair();
  }

  await scenario("overlapping-host-group-replaces-only-the-old-fold-session", async () => {
    const extra = workspace.createLeafInParent(host.parent, host.parent.children.length); c.createdLeaves.push(extra);
    const originalDelete=p.deleteSidecarOwner;
    const observeDelete=function(leaf,...args){if(leaf===extra)c.overlapDelete={stack:new Error().stack,folds:[...p.collapsedPlexHosts.keys()].map(host=>host.id)};return originalDelete.call(this,leaf,...args);};p.deleteSidecarOwner=observeDelete;
    try {
      await openFreshPlex(extra);
      await until(/** The overlap route requires a genuine mounted second Plex generation. */ () => surface(extra), "Overlapping host action surface did not mount");
      p.documentSession(extra).preferences.sidecarPosition = "right"; workspace.setActiveLeaf(sibling, {focus: true}); await frames();
      await p.attachAdjacentSidecar(extra, "to-leaf", page);
      check(p.sidecarLeaves.get(extra) === sibling && p.sidecarLeaves.get(host) === companion, "Natural overlap fixture did not retain two exact managed tabs");
      check(group(extra) === group(host) && group(sibling) === group(companion), "Natural overlap fixture did not share both native groups");
      workspace.setActiveLeaf(host, {focus: true}); await command(true);
      const oldButton = group(companion).querySelector(".kplex-sidecar-unfold-plex");
      await explicit(extra, true);
      check(!folded(host) && folded(extra) && p.collapsedPlexHosts.size === 1 && !oldButton?.isConnected, "Overlapping fold retained a hidden chain/old control");
      check(group(companion).querySelectorAll(".kplex-sidecar-unfold-plex").length === 1 && p.sidecarLeaves.get(host) === companion && p.sidecarLeaves.get(extra) === sibling, `Overlapping fold duplicated recovery or transferred associations: ${JSON.stringify({controls:group(companion).querySelectorAll(".kplex-sidecar-unfold-plex").length,original:p.sidecarLeaves.get(host)?.id,expectedOriginal:companion.id,extra:p.sidecarLeaves.get(extra)?.id,expectedExtra:sibling.id,deletion:c.overlapDelete})}`);
      oldButton?.click(); await frames(); check(folded(extra), "Old overlap control retired the successor fold");
      await explicit(extra, false); check(!folded(host) && !folded(extra), "Overlapping recovery left shared group hidden");
    } finally {
      if(p.deleteSidecarOwner===observeDelete)p.deleteSidecarOwner=originalDelete;
      p.restorePlexFoldBeforeReveal(extra); p.restorePlexFoldBeforeReveal(host);
      if (p.sidecarLeaves.has(extra)) await p.detachSidecar(extra);
      if (p.leafIsAttached(sibling)) await sibling.setViewState({type: "empty", active: false});
      if (p.leafIsAttached(extra)) extra.detach(); await frames(); await restoreOriginalPair();
    }
  });
  await restoreOriginalPair();
}
