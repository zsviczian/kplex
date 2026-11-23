/** Reproduce #299 with only B's ordinary wikilink before using the real Add relationship form. */
export async function inferredParentAuthoringCases(app, controller) {
  const fixture = controller.fixture(app, controller), rows = [];
  let modal;
  try {
    await fixture.initialize();
    const plugin = fixture.p;
    Object.assign(plugin.settings, {
      inferAllLinksAsFriends: false, inverseInfer: false, alsoWriteInverseOntology: false,
      showInferredNodes: true, newNodeAfterSaving: "return",
    });
    await plugin.saveSettings(false, false);

    const documentValue = (element, value) => {
      const win = element.ownerDocument.defaultView;
      const prototype = element.tagName === "SELECT" ? win.HTMLSelectElement.prototype : win.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, "value").set.call(element, value);
      element.dispatchEvent(new win.Event(element.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
    };

    /** Trusted input is reserved for the gate route, which needs actual pointer capture and hit testing. */
    const dragGate = async (leaf, origin, target) => {
      const root = leaf.view.contentEl, doc = root.ownerDocument;
      const gate = root.querySelector(`[data-kplex-path=${JSON.stringify(origin.path)}] [data-kplex-gate="top"]`);
      const endpoint = root.querySelector(`[data-kplex-path=${JSON.stringify(target.path)}]`);
      fixture.check(gate && endpoint, "The inferred Parent and its source gate must render");
      const win = await fixture.focus(doc), from = fixture.point(gate), to = fixture.point(endpoint);
      const originalOpen = plugin.openRelationModal;
      let options;
      plugin.openRelationModal = function (invocation) {
        options = invocation;
        modal = originalOpen.call(this, invocation);
        return modal;
      };
      try {
        win.webContents.sendInputEvent({ type: "mouseMove", ...from });
        win.webContents.sendInputEvent({ type: "mouseDown", ...from, button: "left", clickCount: 1 });
        for (let step = 1; step <= 8; step++) {
          const x = Math.round(from.x + (to.x - from.x) * step / 8), y = Math.round(from.y + (to.y - from.y) * step / 8);
          win.webContents.sendInputEvent({ type: "mouseMove", x, y, modifiers: ["leftbuttondown"] });
          await fixture.wait(25);
        }
        win.webContents.sendInputEvent({ type: "mouseUp", ...to, button: "left", clickCount: 1 });
        await fixture.until(() => modal?.contentEl.querySelector(".kplex-add-related-role-select"), "Parent gate composer", 10000);
        fixture.check(options?.semanticRole === "parent", "The visible source gate supplies Parent intent");
        return options.fixedTarget?.file === target;
      } finally {
        plugin.openRelationModal = originalOpen;
        win.webContents.sendInputEvent({ type: "mouseUp", ...to, button: "left", clickCount: 1 });
      }
    };

    const routes = ["generic", "parent-command", "define-connection"];
    if (!controller.backgroundInput || controller.nativeGate === true) routes.push("gate");
    for (const field of ["Parent", "parent"]) {
      await plugin.updateOntologyField("parents", [field], [...plugin.settings.hierarchy.parents], () => !controller.closed);
      for (const route of routes) {
        const suffix = `${route}-${field === "Parent" ? "saved" : "fresh"}`;
        const a = await fixture.note(`A299-${suffix}`, "");
        const originalBody = `[[${a.basename}]]\n`;
        const b = await fixture.note(`B299-${suffix}`, originalBody);
        const leaf = await fixture.canvas(a);
        try {
          let explanation;
          await fixture.until(() => {
            explanation = plugin.index.explainRelationship(a.path, b.path);
            return explanation?.resolvedRoles.some(row => row.role === "parent" && row.relationType === 2);
          }, "Ordinary body link supplies the inferred Parent", 20000);
          fixture.check(explanation.decisions.length > 0 && explanation.decisions.every(row => row.evidence.sourceKind === "obsidian-link"
            && row.evidence.declaredByPath === b.path && row.evidence.relationType === 2), "The body link is the only initial relationship evidence");
          fixture.check(await app.vault.read(a) === "" && await app.vault.read(b) === originalBody, "Both notes contain the exact reported starting text");

          let fixedTarget = false, expectedOwner = a;
          const defining = route === "define-connection";
          if (defining) {
            const ref = file => ({kind: "file", identity: file.path, path: file.path});
            const surfaceId = fixture.surface(leaf);
            await fixture.until(() => leaf.view.contentEl.querySelector(".kplex-edge-hit"), "Rendered inferred connection");
            const open = plugin.openRelationModal;
            try {
              plugin.openRelationModal = function (options) {
                modal = open.call(this, options);
                return modal;
              };
              // Dispatch the same edge action as the connector menu against the actual painted pair.
              const outcome = await plugin.actionManager.dispatch({id: "relationship.relink", source: "context-menu", surfaceId,
                target: {kind: "edge", origin: ref(a), target: ref(b)}});
              fixture.check(outcome.status === "opened" && modal?.titleEl.textContent === plugin.translator("relation.specifyOntology"),
                "Define connection opens for the inferred pair");
            } finally { plugin.openRelationModal = open; }
            fixture.check(modal.contentEl.querySelector(".kplex-relation-origin")?.textContent === a.basename, "Define opens from the same center");
            const storage = modal.contentEl.querySelector("#kplex-relation-modal-storage");
            if (storage) documentValue(storage, a.path);
            else expectedOwner = b; // Save prepares the pair and defaults to its existing link owner.
            fixedTarget = true;
            await fixture.until(() => modal.contentEl.querySelector(".kplex-add-related-role-select"), "Define connection direction selector");
          } else if (route === "gate") fixedTarget = await dragGate(leaf, a, b);
          else {
            await app.workspace.revealLeaf(leaf);
            app.workspace.setActiveLeaf(leaf, { focus: true });
            const previous = new Set(plugin.actionDialogs.keys());
            const id = route === "generic" ? "k-plex:kplex-add-relationship" : "k-plex:kplex-add-parent";
            fixture.check(app.commands.executeCommandById(id), `Invoke ${route} in the owned canvas`);
            await fixture.until(() => {
              modal = [...plugin.actionDialogs.keys()].find(value => !previous.has(value) && value.origin?.file === a
                && value.contentEl.querySelector(".kplex-add-related-role-select"));
              return Boolean(modal);
            }, `${route} acquired the exact origin`, 10000);
          }

          const role = modal.contentEl.querySelector(".kplex-add-related-role-select");
          if (role.value !== "parent") documentValue(role, "parent");
          await fixture.until(() => role.value === "parent" && modal.contentEl.querySelector(".kplex-add-related-ontology-search input")?.value === field,
            "Selected physical Parent field", 10000);
          if (!fixedTarget) documentValue(modal.contentEl.querySelector(".kplex-add-related-note-search input"), `[[${b.path}]]`);
          if (!defining) await fixture.until(() => modal.contentEl.querySelector(".kplex-add-related-note-search.has-selection")
            && !modal.contentEl.querySelector(".kplex-add-related-link-button")?.disabled, "Exact existing target selected", 8000);
          const doc = modal.contentEl.ownerDocument, seen = new Set(doc.querySelectorAll(".notice"));
          const duplicateMessage = plugin.translator("notice.alreadyConnected");
          const button = defining ? [...modal.contentEl.querySelectorAll("button")]
            .find(candidate => candidate.getAttribute("aria-label") === plugin.translator("relation.specifyOntologyButton"))
            : modal.contentEl.querySelector(".kplex-add-related-link-button");
          fixture.check(button, "Link action is ready");
          button.click();
          let blocked = false;
          await fixture.until(() => {
            blocked = [...doc.querySelectorAll(".notice")].some(notice => !seen.has(notice) && notice.textContent.includes(duplicateMessage));
            return blocked || !modal.modalEl.isConnected;
          }, "Link saved or exact duplicate notice shown", 25000);

          const aBytes = await app.vault.read(a), bBytes = await app.vault.read(b);
          const storedField = expectedOwner === a ? field : plugin.inverseOntologyField(field, "parent");
          const stored = app.metadataCache.getFileCache(expectedOwner)?.frontmatter?.[storedField];
          const matches = Array.isArray(stored) && stored.length === 1 && stored[0].includes((expectedOwner === a ? b : a).basename);
          const bodyPreserved = expectedOwner === a ? bBytes === originalBody
            : bBytes.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n(?:\r?\n)?/, "") === originalBody;
          const ownerPreserved = expectedOwner === a ? aBytes.includes(`${storedField}:`) : aBytes === "";
          const canonical = plugin.index.explainRelationship(a.path, b.path)?.resolvedRoles.some(row => row.role === "parent" && row.relationType === 1);
          const passed = !blocked && matches && ownerPreserved && bodyPreserved && canonical;
          rows.push({ route, field, fixedTarget, blocked, storedIn: matches ? expectedOwner === a ? "center" : "body-link-owner" : null,
            untouchedBody: bodyPreserved, canonical: Boolean(canonical), passed: Boolean(passed) });
          controller.progress = { phase: "Inferred Parent authoring", rows };
        } finally {
          modal?.close(); modal = undefined; leaf.detach();
        }
      }
    }
    fixture.check(rows.filter(row => row.route === "define-connection").every(row => row.passed),
      `The existing Define connection action still saves the same definition. ${JSON.stringify(rows)}`);
    if (controller.expectFixed) fixture.check(rows.every(row => row.passed && (row.route !== "gate" || row.fixedTarget)),
      `Explicit Parent saves on its origin through every supported route. ${JSON.stringify(rows)}`);
    return { routes, rows };
  } finally {
    modal?.close();
    await fixture.cleanup();
  }
}
