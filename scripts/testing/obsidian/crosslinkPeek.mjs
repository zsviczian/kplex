/** Extend the shared native hover lane; its owner restores settings, fixtures, leaves and observers.
 * Native input is asynchronous: await settled canonical gate edges before the unchanged semantic,
 * geometry and zero-work assertions, rather than accepting a previous node preview as readiness. */
export async function acceptCrosslinkPeek({p,c,main,path,other,check,wait,until,focus,rootOf,move,key,leave,toggle}) {
  const peers=[other,...['C','D','E','F'].map(name=>'__kplex_hover_'+name+'.md')];
  const link=name=>'[['+name.slice(0,-3)+']]';
  const setupBefore={...c.counts};
  for(const name of peers.slice(1)){
    check(!app.vault.getFileByPath(name),'Crosslink fixture collision');
    await app.vault.create(name,'Synthetic crosslink endpoint\n');c.owned.push(name);
  }
  await app.vault.modify(app.vault.getFileByPath(path),'---\nChild:\n'+peers.map(name=>'  - "'+link(name)+'"').join('\n')+'\n---\n');
  await app.vault.modify(app.vault.getFileByPath(other),'---\nChild: "'+link(peers[1])+'"\nParent: "'+link(peers[2])+'"\nFriend: "'+link(peers[3])+'"\nRight: "'+link(peers[4])+'"\n---\n');
  await app.vault.modify(app.vault.getFileByPath(peers[1]),'---\nFriend: "'+link(peers[2])+'"\n---\n');
  await until(()=>app.metadataCache.getFileCache(app.vault.getFileByPath(other))?.frontmatter?.Right,'Crosslink metadata absent');
  Object.assign(p.settings,{inferAllLinksAsFriends:false,inverseInfer:false,showCrossLinks:false,crossLinkOpacity:0,
    childColumns:3,childMaxHeight:600,maxItemCount:100,
    hierarchy:{...p.settings.hierarchy,parents:['Parent'],children:['Child'],leftFriends:['Friend'],rightFriends:['Right'],previous:['Previous'],next:['Next'],hidden:['Hidden']}});
  await p.saveSettings();await p.index.refreshSemanticSettings();
  for(const name of [path,...peers])c.releases.push(p.index.acquireSemanticDemand(name));
  await until(()=>!p.index.hasPendingSemanticPreparation(),'Crosslink source preparation pending');
  p.notifyNavigation(path);
  const root=rootOf(main),node=name=>root.querySelector(`.kplex-thought[data-kplex-path="${name}"]`);
  await until(()=>peers.every(name=>node(name)),'Crosslink displayed endpoints absent');
  focus(main);root.querySelector('button[aria-label="'+p.translator('graph.fitGraph')+'"]')?.click();await wait(600);
  const ids=()=>[...root.querySelectorAll('.is-cross-link .kplex-edge-hit')].map(el=>el.dataset.kplexEdgeId).sort();
  const incident=peers.slice(1).map((name,i)=>'cross:'+other+':'+name+':'+['child','parent','left','right'][i]).sort();
  const same=(actual,expected,message)=>check(JSON.stringify(actual)===JSON.stringify(expected),message+': '+JSON.stringify(actual));
  const snapshot=()=>({nodes:[...root.querySelectorAll('.kplex-thought')].map(el=>[el.dataset.kplexPath,el.getAttribute('style'),[...el.querySelectorAll('.kplex-gate-wrap')].map(g=>[g.querySelector('[data-kplex-gate]')?.dataset.kplexGate,g.textContent])]),camera:root.querySelector('.kplex-camera')?.getAttribute('style')});
  const countDelta=(after,before)=>Object.fromEntries(Object.keys(after).map(name=>[name,after[name]-before[name]]));
  const excludedSetupCounts=countDelta(c.counts,setupBefore),cases=[],counts=[];
  let writes=0;const originalSave=p.saveData;p.saveData=function(...args){writes++;return originalSave.apply(this,args)};c.restores.push(()=>p.saveData=originalSave);
  for(const required of [true,false]){
    await leave(main);await toggle(required);await until(()=>!p.index.hasPendingSemanticPreparation(),'Preference preparation pending');await wait(300);
    const before={...c.counts},beforeWrites=writes,geometry=snapshot(),elements=[...root.querySelectorAll('.kplex-thought')];
    move(main,node(other).querySelector('.kplex-thought-text'));await wait(850);same(ids(),[],'Unmodified hover revealed disabled crosslinks');
    key(main,true);await until(()=>ids().length===4,'Stationary modifier did not reveal incident crosslinks');same(ids(),incident,'Node preview edge set');
    check(root.querySelectorAll('.is-cross-link.is-highlighted').length===4,'Preview missing highlight');
    check([...root.querySelectorAll('.is-cross-link .kplex-edge-visible')].every(el=>getComputedStyle(el).opacity==='1'),'Zero crosslink opacity hid explicit preview');
    check([...root.querySelectorAll('.is-hover-peek .kplex-edge-hit')].every(el=>getComputedStyle(el).pointerEvents==='none'),'Preview hit path steals pointer');
    key(main,true);await wait(60);same(ids(),incident,'Key repeat changed preview');key(main,false);await until(()=>ids().length===0,'Release retained preview');
    for(const [gate,index] of [['bottom',0],['top',1],['left',2],['right',3]]){
      await leave(main);key(main,true);move(main,node(other).querySelector('.gate-'+gate),true);
      await until(/** Native input can still expose the previous node preview before this gate commits. */ ()=>JSON.stringify(ids())===JSON.stringify([incident.find(id=>id.includes(':'+peers[index+1]+':'))]),'Native '+gate+' gate did not reveal crosslink');same(ids(),[incident.find(id=>id.includes(':'+peers[index+1]+':'))],'Exact native gate included another endpoint');
      await leave(main);same(ids(),[],'Leave retained gate preview');key(main,false);
    }
    await leave(main);key(main,true);move(main,node(peers[1]).querySelector('.gate-top'),true);await until(/** Wait for the incoming gate's canonical edge, retaining the independent orientation assertion below. */ ()=>JSON.stringify(ids())===JSON.stringify(['cross:'+other+':'+peers[1]+':child']),'Incoming endpoint preview missing');
    same(ids(),['cross:'+other+':'+peers[1]+':child'],'Incoming gate changed canonical orientation');key(main,false);await until(()=>ids().length===0,'Incoming release retained preview');
    same(snapshot(),geometry,'Hover altered node/gate/camera geometry');check(elements.every(el=>el.isConnected),'Hover replaced node DOM');
    const delta=countDelta(c.counts,before);same(delta,{reads:0,parses:0,acquisitions:0,semantics:0,search:0},'Hover performed source/semantic work');check(writes===beforeWrites,'Hover persisted settings');counts.push({required,...delta,settingsWrites:writes-beforeWrites});
    cases.push('native node/four gates/incoming, stationary/held/release/leave, zero opacity, stable geometry and no work; modifier setting '+required);
  }
  await leave(main);
  const popoutBefore={...c.counts},popout=app.workspace.getLeaf('window');c.popout=popout;
  await popout.setViewState({type:'k-plex-react-view',active:true});await popout.view.waitUntilReady();await app.workspace.revealLeaf(popout);p.notifyNavigation(path);
  const popoutRoot=rootOf(popout),popoutIds=()=>popoutRoot.querySelectorAll('.is-cross-link').length;
  await until(()=>peers.every(name=>popoutRoot.querySelector(`.kplex-thought[data-kplex-path="${name}"]`))&&!p.index.hasPendingSemanticPreparation(),'Popout preview fixture absent');
  focus(popout);popoutRoot.querySelector('button[aria-label="'+p.translator('graph.fitGraph')+'"]')?.click();await wait(500);
  const excludedPopoutSetupCounts=countDelta(c.counts,popoutBefore),beforePopoutHover={...c.counts},beforePopoutWrites=writes;
  move(popout,popoutRoot.querySelector(`.kplex-thought[data-kplex-path="${other}"] .kplex-thought-text`));key(popout,true);
  await until(()=>popoutIds()===4,'Popout trusted modifier did not reveal crosslinks');same(ids(),[],'Popout modifier affected main view');
  focus(main);await until(()=>popoutIds()===0,'Owning-window blur retained preview');key(popout,false);await leave(popout);
  key(main,true);move(main,node(other).querySelector('.kplex-thought-text'),true);await until(()=>ids().length===4,'Main preview after popout failed');check(popoutIds()===0,'Main modifier affected popout');key(main,false);await leave(main);
  const popoutDelta=countDelta(c.counts,beforePopoutHover);same(popoutDelta,{reads:0,parses:0,acquisitions:0,semantics:0,search:0},'Cross-window hover performed source work');check(writes===beforePopoutWrites,'Cross-window hover persisted settings');
  counts.push({required:false,window:'main/popout',...popoutDelta,settingsWrites:writes-beforePopoutWrites});popout.detach();c.popout=null;focus(main);
  cases.push('trusted crosslink preview is independent in main/popout and clears on owning-window blur');
  await leave(main);p.settings.showCrossLinks=true;await p.saveSettings();await wait(350);
  await until(()=>ids().length===5,'Enabled crosslinks absent');const normal=ids();key(main,true);move(main,node(other).querySelector('.kplex-thought-text'),true);
  await until(()=>root.querySelectorAll('.is-cross-link.is-highlighted').length===4,'Enabled crosslink highlight missing');same(ids(),normal,'Enabled preview duplicated links');key(main,false);await leave(main);same(ids(),normal,'Release removed normal crosslinks');
  cases.push('enabled crosslinks retain all five canonical paths without duplicates');
  c.cases.push(...cases);
  return {cases,counts,excludedSetupCounts,excludedPopoutSetupCounts,notes:'Fixture/preferences/view setup excluded explicitly; guarded trusted hover intervals only. Settings, workspace, fixtures and observers restored by shared native owner.'};
}
