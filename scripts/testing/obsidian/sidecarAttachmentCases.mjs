/** Native visible-tab attachment cases injected into the existing guarded Sidecar driver. */
export async function runSidecarAttachmentCases({p, workspace, c, page, host, check, until, frames, click, scenario}) {
  const root = () => host.view.containerEl;
  const buttons = () => [...root().querySelectorAll('[data-kplex-sidecar-attach]')].map(button => button.dataset.kplexSidecarAttach);
  const expect = async flows => {
    await until(() => JSON.stringify(buttons()) === JSON.stringify(flows), `Attachment controls: expected ${flows}, got ${buttons()}`);
  };
  const select = async leaf => {workspace.setActiveLeaf(leaf, {focus: true}); await frames();};
  const target = p.app.vault.getFileByPath('04 Filter and focus/Filter and focus.md');
  check(target && target !== page.file && p.index.get(target.path)?.file === target, 'Distinct indexed disposable note required');
  for (const position of ['right', 'left', 'above', 'below']) {
    await scenario(`adjacent-tab-attachment-${position}`, async () => {
      await p.moveSidecar(host, position, page); await p.openSidecar(host, page);
      const original = p.sidecarLeaves.get(host);
      check(original, 'Managed Sidecar missing');
      await select(original); await expect([]);
      const sibling = workspace.createLeafInParent(original.parent, original.parent.children.length);
      c.createdLeaves.push(sibling); await sibling.setViewState({type: 'empty', active: true});
      await select(sibling); await expect(['to-leaf']);
      check(p.sidecarLeaves.get(host) === original, 'Visibility inspection changed ownership');
      await select(original); await expect([]);
      await sibling.openFile(target, {active: true}); await select(sibling); await expect(['to-leaf', 'to-plex']);
      await click(root().querySelector('[data-kplex-sidecar-attach="to-plex"]'));
      await until(() => p.sidecarLeaves.get(host) === sibling && root().querySelector('.kplex-role-center')?.dataset.kplexPath === target.path, 'Inward attachment did not center the visible note');
      check(p.leafIsAttached(original) && sibling.view.file === target, 'Inward attachment replaced or closed native content');
      await expect([]);
      await select(original); await expect(['to-leaf', 'to-plex']);
      await click(root().querySelector('[data-kplex-sidecar-attach="to-leaf"]'));
      await until(() => p.sidecarLeaves.get(host) === original && original.view.file === target, 'Outward attachment did not open the current center');
      check(p.leafIsAttached(sibling), 'Reattachment closed the old companion'); await expect([]);
      await sibling.setViewState({type: 'empty', active: true}); await select(sibling); await expect(['to-leaf']);
      original.detach(); await frames();
      await until(() => !p.isSidecarOpen(host), 'Closing the hidden companion retained ownership');
      await expect(['to-leaf']);
      await click(root().querySelector('[data-kplex-sidecar-attach="to-leaf"]'));
      await until(() => p.sidecarLeaves.get(host) === sibling && sibling.view.file === target, 'Empty pane attachment failed after the original Sidecar closed');
      await expect([]);
      await p.detachSidecar(host); await expect(['to-leaf', 'to-plex']);
      check(p.leafIsAttached(sibling), 'Detach closed the native tab');
      sibling.detach(); await frames();
    });
  }
}
