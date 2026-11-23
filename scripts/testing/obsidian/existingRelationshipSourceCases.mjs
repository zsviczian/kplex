/** Trace the existing-note Add friend → Follow chain through real commands, modal state and Vault writes. */
export async function existingRelationshipSourceCases(app, controller) {
  const fixture = controller.fixture(app, controller);
  const rows = [];
  try {
    await fixture.initialize();
    let plugin = fixture.p;
    const companion = app.plugins.plugins["open-tab-settings"];
    const policy = {
      enabled: Boolean(companion),
      version: companion?.manifest.version ?? null,
      openInNewTab: companion?.settings.openInNewTab ?? null,
      deduplicateTabs: companion?.settings.deduplicateTabs ?? null,
      previewTabs: companion?.settings.previewTabs ?? null,
    };
    Object.assign(plugin.settings, {
      indexingModeDesktop: "on-demand", indexBeforeViewDesktop: false,
      alsoWriteInverseOntology: false, newNodeAfterSaving: "follow",
    });
    await plugin.saveSettings(false, false);
    plugin = await fixture.reload(false);
    fixture.check(plugin.index.isOnDemandMode(), "Reported local indexing policy must be active");
    await plugin.updateOntologyField("leftFriends", ["Friend318"], [...plugin.settings.hierarchy.leftFriends], () => !controller.closed);

    const open = async (leaf, source, command = "palette") => {
      const surface = fixture.surface(leaf);
      const previous = new Set(plugin.actionDialogs.keys());
      const snapshot = plugin.actionManager.readSnapshot(surface);
      const read = () => ({
        intended: source.basename,
        session: plugin.documentSession(leaf)?.centerPath?.split("/").pop(),
        snapshot: plugin.actionManager.readSnapshot(surface)?.center?.path?.split("/").pop(),
        shared: plugin.settings.lastActivePath.split("/").pop(),
        activeType: app.workspace.activeLeaf?.view.getViewType(),
        activeFile: app.workspace.activeLeaf?.view.file?.basename ?? null,
        pending: plugin.index.viewScopeCoverage(source.path).pending,
      });
      fixture.check(snapshot?.mounted && snapshot.visible, "Actual command surface must be mounted and visible");
      const before = read();
      const receipt = command === "local-hotkey"
        ? await plugin.actionManager.dispatch({id: "relationship.create-center.left", source: "local-hotkey", surfaceId: surface})
        : {status: app.commands.executeCommandById("k-plex:kplex-add-friend") ? "invoked" : "unavailable"};
      let modal;
      await fixture.until(() => {
        modal = [...plugin.actionDialogs.keys()].find(value => !previous.has(value) && value.origin?.file
          && value.contentEl.querySelector(".kplex-add-related-note-search input"));
        return Boolean(modal) || receipt.status === "unavailable";
      }, "Existing-note friend composer acquired", 10000);
      return {modal, before, receipt: receipt.status};
    };

    /** An authored internal link chooses the existing file through the real shared note input. */
    const follow = async (modal, target) => {
      const input = modal.contentEl.querySelector(".kplex-add-related-note-search input");
      const view = input.ownerDocument.defaultView;
      Object.getOwnPropertyDescriptor(view.HTMLInputElement.prototype, "value").set.call(input, "[[" + target.path + "]]");
      input.dispatchEvent(new view.Event("input", {bubbles:true}));
      await fixture.until(() => modal.contentEl.querySelector(".kplex-add-related-note-search.has-selection"),
        "Existing target selected by the composer", 8000);
      const choice = modal.contentEl.querySelector(".kplex-add-related-completion select");
      fixture.check(choice && [...choice.options].some(option => option.value === "follow"), "Existing link has Follow");
      if (choice.value !== "follow") {
        choice.value = "follow";
        choice.dispatchEvent(new view.Event("change", {bubbles:true}));
      }
      await fixture.until(() => choice.value === "follow", "Follow control applied", 8000);
      const submit = modal.contentEl.querySelector("button[data-kplex-primary-action=true]");
      fixture.check(submit && !submit.disabled, "Existing link button is enabled");
      submit.click();
      await fixture.until(() => !modal.modalEl.isConnected, "Existing link saved and composer closed", 25000);
    };

    /** Real native reveals select a canvas; they do not synchronize the command's global setting. */
    const activate = async leaf => {
      await app.workspace.revealLeaf(leaf);
      app.workspace.setActiveLeaf(leaf, {focus:true});
      leaf.view.contentEl.querySelector(".kplex-app")?.focus();
    };

    for (const surface of ["tab", "sidepanel"]) {
      for (const mode of ["immediate", "interleaved", "settled", "local-hotkey", "native-open"]) {
        controller.progress = {phase: "Existing relationship source", surface, mode, rows};
        const tag = surface + "-" + mode;
        const a = await fixture.note("A318-existing-" + tag, "Original A\n");
        const b = await fixture.note("B318-existing-" + tag, "Original B\n");
        const c = await fixture.note("C318-existing-" + tag, "Original C\n");
        const leaf = await fixture.canvas(a, surface === "sidepanel" ? "k-plex-sidepanel-view" : "k-plex-react-view");
        await activate(leaf);
        const first = await open(leaf, a);
        fixture.check(first.modal?.origin.file === a, "Initial Add friend must be bound to A");
        await follow(first.modal, b);
        // Require only the original session's accepted Follow. Its rendered center and global
        // settings are independent observations, never prerequisites of the second command.
        await fixture.until(() => plugin.documentSession(leaf)?.centerPath === b.path, "Follow accepted in the invoking canvas", 8000);
        let other;
        if (mode === "interleaved") {
          other = await fixture.canvas(a, "k-plex-react-view", "split");
          fixture.check(other !== leaf, "Native interleave requires two independent graph owners");
          await activate(other);
          // An actual second canvas can update the shared coordinate while B remains owned by leaf.
          await activate(leaf);
        }
        if (mode === "settled") await fixture.ready();
        const beforeA = await app.vault.read(a);
        const beforeC = await app.vault.read(c);
        const second = await open(leaf, b, mode);
        const captured = second.modal?.origin.file?.basename ?? null;
        const exact = second.modal?.origin.file === b;
        let nativeOpen = null;
        if (mode === "native-open" && second.modal) {
          // Exercise the companion's real openFile hook after the composer has captured B.
          // Opening another document may redirect native focus, but never replaces this origin.
          const firstDocument = app.workspace.getLeaf("split");
          fixture.leaves.push(firstDocument);
          await firstDocument.openFile(a, {active:true});
          const repeat = app.workspace.getLeaf("split");
          fixture.leaves.push(repeat);
          await repeat.openFile(a, {active:true});
          nativeOpen = {requested: a.basename, firstOwnsFile: firstDocument.view.file === a,
            repeatOwnsFile: repeat.view.file === a, activeFile: app.workspace.activeLeaf?.view.file?.basename ?? null};
          fixture.check(nativeOpen.firstOwnsFile || nativeOpen.repeatOwnsFile, "Another real native document opened");
        }
        if (second.modal) await follow(second.modal, c);
        const afterA = await app.vault.read(a), afterB = await app.vault.read(b), afterC = await app.vault.read(c);
        const safe = exact && afterA === beforeA && afterB.includes(c.basename) && afterC === beforeC;
        rows.push({surface, mode, ...second.before, outcome: second.receipt, captured, safe, nativeOpen,
          wrotePrevious: afterA !== beforeA, wroteIntended: afterB.includes(c.basename), wroteTarget: afterC !== beforeC});
        controller.progress = {phase:"Existing relationship source", surface, mode, rows};
        if (other) other.detach();
        leaf.detach();
      }
    }
    if (controller.expectFixed) fixture.check(rows.every(row => row.safe), "A second action must write only the accepted source B: " + JSON.stringify(rows));
    return {policy, rows};
  } finally {
    await fixture.cleanup();
  }
}
