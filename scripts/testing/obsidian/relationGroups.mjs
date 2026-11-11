/** Exact-build grouping acceptance in disposable Small. Native DOM activation is programmatic;
 * physical touch, OS input and perceived paint remain separate. The shared driver checks hashes,
 * vault identity and restored configuration bytes; this scenario owns fixtures and workspace state. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {runControlledProbe} from './controlledProbe.mjs';
import {nativeDocumentSessions} from './nativeDocumentSessions.mjs';
import {validateTarget} from './runner.mjs';

/** Exercise actual toolbar/graph/settings owners, including an independent native popout. */
async function scenario(app,c) {
  const p=app.plugins.plugins['k-plex'];
  const check=(value,message)=>{if(!value)throw Error(message)};
  check(p&&!app.setting.isOpen&&app.vault.getFiles().length<1000,'Clean disposable Small required');
  await p.settingsWriteQueue;
  const settings=JSON.parse(JSON.stringify(p.settings)),layout=app.workspace.getLayout(),sessions=documentSessions(p).capture();
  const prefix='Kplex160-'+Date.now(),book=prefix+' Book',peer=prefix+' Peer',field=prefix+' Includes',left=prefix+' Friend',right=prefix+' Challenger';
  const owned=[],leaves=[],restores=[],cases=[];let folder,main,popout,cleaning=false;
  const wait=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
  /** Poll actual native outcomes; cancellation retires normal work while cleanup stays independent. */
  const until=async(read,message)=>{const end=Date.now()+45000;while(!(await read())){check((cleaning||!c.closed)&&Date.now()<end,message);await wait(40)}};
  const root=leaf=>leaf?.view.contentEl.querySelector('.kplex-app');
  const groups=leaf=>[...root(leaf).querySelectorAll('.kplex-thought.is-relation-group')];
  const group=(leaf,label)=>groups(leaf).find(node=>node.getAttribute('aria-label')?.includes(label));
  const toggle=leaf=>[...root(leaf).querySelectorAll('button')].find(button=>button.getAttribute('aria-label')===p.translator('actions.view.groups.toggle'));
  const center=leaf=>root(leaf)?.querySelector('.kplex-role-center')?.dataset.kplexPath;
  const path=name=>prefix+'/'+name+'.md';
  /** Create only fresh fixture identities; real metadata and source publication remain authoritative. */
  const note=async(name,fields={})=>{
    const file=await app.vault.create(path(name),'---\n'+Object.entries(fields).map(([key,value])=>JSON.stringify(key)+': '+JSON.stringify(value)).join('\n')+'\n---\n');
    owned.push(file);p.index.insertCreatedFile(file);return file;
  };
  /** Navigate normally and wait for the actual displayed center, never a saved path alone. */
  const navigate=async identity=>{p.notifyNavigation(identity);await until(()=>center(main)===identity,'Native center pending');await wait(200)};
  try {
    c.progress={phase:'fixture',cases};
    await documentSessions(p).off();
    Object.assign(p.settings,{groupRelations:false,graphDepth:1,renderAlias:false,renderSiblings:false,graphLenses:[],allowAutozoom:true,
      showPageNodes:true,showAttachments:true,showURLNodes:true,showVirtualNodes:true,showTagNodes:true,showFolderNodes:true,showInferredNodes:true,
      noteTypeField:'Note type',allowRemoteNodeImages:false});
    p.settings.hierarchy={...p.settings.hierarchy,children:[...p.settings.hierarchy.children,field],leftFriends:[...p.settings.hierarchy.leftFriends,left],rightFriends:[...p.settings.hierarchy.rightFriends,right]};
    p.settings.tagNodeStyles={...p.settings.tagNodeStyles,["#"+book]:{backgroundColor:'#123456',textColor:'#abcdef',icon:'book'}};
    p.settings.attachmentNodeStyle={...p.settings.attachmentNodeStyle,backgroundColor:'#654321'};
    await p.saveSettings(false,false);await p.updateLayoutProfile('leaf',{lateralArrangement:'split'});
    check(!app.vault.getFolderByPath(prefix)&&!app.vault.getFileByPath(prefix),'Fixture collision');
    folder=await app.vault.createFolder(prefix);
    for(const name of ['One','Two'])owned.push(await app.vault.createFolder(prefix+'/'+name));
    for(const name of ['Book1','Book2'])await note(name,{'Note type':book});
    for(const name of ['PeerL','PeerR'])await note(name,{'Note type':peer});
    await note('Unique',{'Note type':prefix+' Unique'});
    for(const name of ['Attachment1.txt','Attachment2.txt']){const file=await app.vault.create(prefix+'/'+name,'Owned grouping fixture');owned.push(file);p.index.insertCreatedFile(file);}
    const targets=['Book1','Book2','Unique'].map(name=>'[['+path(name)+']]');
    targets.push(...['Attachment1.txt','Attachment2.txt'].map(name=>'[['+prefix+'/'+name+']]'),
      'https://example.invalid/group-one','https://example.invalid/group-two','[['+prefix+'/Placeholder1]]','[['+prefix+'/Placeholder2]]');
    await note('CenterA',{[field]:targets,[left]:'[['+path('PeerL')+']]',[right]:'[['+path('PeerR')+']]',tags:[prefix+'/one',prefix+'/two']});
    await note('CenterB',{[field]:['[['+path('Book1')+']]','[['+path('Book2')+']]']});
    await until(()=>owned.filter(file=>file.extension==='md').every(file=>app.metadataCache.getFileCache(file)?.frontmatter),'Native fixture metadata pending');
    main=app.workspace.getLeaf(true);leaves.push(main);await main.setViewState({type:'k-plex-react-view',active:true});await main.view.waitUntilReady();
    await navigate(path('CenterA'));
    await until(()=>['Book1','Book2','PeerL','PeerR'].every(name=>[...root(main).querySelectorAll('.kplex-thought')].some(node=>node.dataset.kplexPath===path(name))),'Ordinary relation bodies pending');
    await until(()=>!p.index.hasPendingSemanticPreparation()&&!p.index.building&&!p.isStartupInitializing()&&p.rebuildTimer===null&&p.index.urlOwnerTasks.size===0,'Fixture preparation pending');
    const folderPage=p.index.getNeighborhood(path('CenterA')).parents.find(row=>row.page.isFolder&&row.page.name===prefix)?.page;
    check(folderPage,'Canonical fixture folder absent');
    check(toggle(main)?.querySelector('svg'),'Real Obsidian group icon absent');
    const history=JSON.stringify(p.settings.navigationHistory),before=p.index.getSourceAcquisitionCounters(),work={semantic:0,rebuild:0};
    for(const [name,key]of [['refreshSemanticSettings','semantic'],['rebuild','rebuild']]){
      const original=p.index[name];check(typeof original==='function','Index observation method absent');
      p.index[name]=function(...args){work[key]++;return original.apply(this,args)};restores.push(()=>p.index[name]=original);
    }
    c.progress={phase:'group/unfold',cases};toggle(main).click();
    await until(()=>toggle(main)?.getAttribute('aria-pressed')==='true'&&group(main,book),'Grouping toggle pending');
    await p.settingsWriteQueue;check((await p.loadData()).groupRelations===true,'Grouping preference not durable');
    c.progress.observed={groups:groups(main).map(node=>({label:node.getAttribute('aria-label'),count:node.querySelector('.kplex-group-count')?.textContent})),
      children:p.index.getNeighborhood(path('CenterA')).children.map(row=>({name:row.page.name,path:row.page.path,file:row.page.file?.extension,folder:row.page.isFolder,tag:row.page.isTag,url:row.page.url}))};
    for(const label of [book,p.translator('groups.attachments'),p.translator('groups.links'),p.translator('groups.placeholders'),p.translator('groups.tags')])
      check(group(main,label)?.querySelector('.kplex-group-count')?.textContent==='2','Expected two-member class: '+label);
    check(!group(main,prefix+' Unique')&&[...root(main).querySelectorAll('.kplex-thought')].some(node=>node.dataset.kplexPath===path('Unique')),'Singleton grouped or lost');
    check(!group(main,peer),'Split lateral singletons grouped');
    const pill=group(main,book),badge=pill.querySelector('.kplex-group-count'),bodyRect=pill.getBoundingClientRect(),badgeRect=badge.getBoundingClientRect();
    check(badgeRect.bottom>bodyRect.bottom&&badgeRect.right>bodyRect.right,'Native count not outside bottom-right');
    check(pill.ownerDocument.defaultView.getComputedStyle(pill).backgroundColor==='rgb(18, 52, 86)','Note-type paint absent');
    check(group(main,p.translator('groups.attachments')).ownerDocument.defaultView.getComputedStyle(group(main,p.translator('groups.attachments'))).backgroundColor==='rgb(101, 67, 33)','Attachment class paint absent');
    // Capture settled nodes rather than the entering group's deliberate opacity animation.
    await wait(Math.max(500,(p.settings.animationSpeed??0)*2+100));
    const screenshot=await require('@electron/remote').getCurrentWindow().webContents.capturePage();
    require('fs').writeFileSync(c.screenshot,screenshot.toPNG());
    pill.click();await until(()=>!group(main,book),'Unfold pending');
    check(['Book1','Book2'].every(name=>[...root(main).querySelectorAll('.kplex-thought')].some(node=>node.dataset.kplexPath===path(name))),'Unfold lost a member');
    check(center(main)===path('CenterA')&&JSON.stringify(p.settings.navigationHistory)===history,'Group action navigated or changed history');
    check(!p.sidecarLeaves.get(main),'Group action opened a Sidecar');
    const after=p.index.getSourceAcquisitionCounters();check(before.vaultReads===after.vaultReads&&before.parses===after.parses,'Group action read or parsed source');
    check(work.semantic===0&&work.rebuild===0,'Group action requested semantic work');
    for(const restore of restores.splice(0).reverse())restore();cases.push('native toolbar/icon, all classes, singleton, external count, paint, unfold and zero semantic work');

    await navigate(path('CenterB'));await until(()=>group(main,book),'Next center did not begin grouped');
    await navigate(path('CenterA'));await until(()=>group(main,book),'Returning center retained unfolded state');
    await p.updateLayoutProfile('leaf',{lateralArrangement:'left'});await until(()=>group(main,peer),'Shared-left grouping pending');
    check(group(main,peer).querySelector('.kplex-group-count').textContent==='2','Shared-left count wrong');
    cases.push('navigation resets groups and shared-left merges friends/challengers');

    c.progress={phase:'popout',cases};popout=app.workspace.getLeaf('window');leaves.push(popout);
    await popout.setViewState({type:'k-plex-react-view',active:true});await popout.view.waitUntilReady();
    // Independent native sessions do not inherit another Plex's current attention.
    p.notifyNavigation(path('CenterA'),popout);await until(()=>center(popout)===path('CenterA'),'Owned popout center pending');
    await until(()=>root(popout)&&group(popout,book),'Native popout grouping pending');
    check(root(main).ownerDocument!==root(popout).ownerDocument,'Expected separate native documents');
    group(popout,book).click();await until(()=>!group(popout,book),'Popout unfold pending');check(group(main,book),'Popout changed main unfolded state');
    app.workspace.setActiveLeaf(main,{focus:true});toggle(main).click();await until(()=>groups(main).length===0,'Disabling did not unfold main');
    await p.settingsWriteQueue;await wait(200);
    app.workspace.setActiveLeaf(popout,{focus:true});await until(()=>groups(popout).length===0,'Disabling did not unfold popout');
    toggle(popout).click();await until(()=>group(popout,book),'Popout did not regroup on re-enable');
    await p.settingsWriteQueue;await wait(200);app.workspace.setActiveLeaf(main,{focus:true});
    await until(()=>{c.progress.reenabled={setting:p.settings.groupRelations,main:groups(main).map(node=>node.getAttribute('aria-label')),popout:groups(popout).map(node=>node.getAttribute('aria-label'))};return group(main,book)},'Shared grouping did not reset main on reveal');
    cases.push('native popout, independent unfolding, shared disable/re-enable');
    await navigate(folderPage.path);await until(()=>group(main,p.translator('groups.folders')),'Folder class grouping pending');
    check(group(main,p.translator('groups.folders')).querySelector('.kplex-group-count').textContent==='2','Folder class count wrong');
    cases.push('physical folder children group by class');
    return {cases,work,windows:2,activation:'programmatic native DOM',physicalTouch:false};
  } finally {
    cleaning=true;c.progress={...c.progress,phase:'cleanup',cases};const failures=[];
    const clean=async run=>{try{await run()}catch(error){failures.push(String(error))}};
    for(const restore of restores.reverse())await clean(restore);
    for(const leaf of leaves.reverse())await clean(()=>leaf.detach());
    p.settings=settings;await clean(()=>p.saveSettings(false,false));
    await clean(()=>app.workspace.changeLayout(layout));await clean(()=>documentSessions(p).restore(sessions));
    if(settings.lastActivePath)await clean(()=>p.notifyNavigation(settings.lastActivePath));
    if(folder)await clean(async()=>{
      check(app.vault.getFolderByPath(prefix)===folder&&folder.children.every(child=>owned.includes(child)),'Fixture ownership changed');
      check(owned.filter(file=>Array.isArray(file.children)).every(child=>child.children.length===0),'Unexpected child-folder content');
      await app.vault.delete(folder,true);
    });
    await clean(()=>p.settingsWriteQueue);p.settings=JSON.parse(JSON.stringify(settings));await clean(()=>p.saveSettings(false,false));
    await wait(1500);await clean(()=>p.settingsWriteQueue);await clean(()=>app.vault.adapter.write(p.manifest.dir+'/data.json',c.originalData));
    if(failures.length)throw Error('Grouping probe cleanup: '+failures.join('; '));
  }
}

if(process.env.KPLEX_TEST_VAULT_NAME!=='kplex-test-small')throw Error('Explicit disposable Small required');
const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
await runControlledProbe('relation-groups-160',scenario,
  'c.originalData='+JSON.stringify(readFileSync(join(target.pluginDir,'data.json'),'utf8'))+';c.screenshot='+JSON.stringify(join(process.env.KPLEX_HOST_REPORT_DIR??'','grouped-native.png'))+';const documentSessions='+nativeDocumentSessions.toString()+';',
  ['src/ui/relationGroups.ts','src/core/plex/relationGroups.ts','src/ui/layout.ts','src/ui/PlexGraph.tsx','src/ui/App.tsx','src/ui/ThoughtNode.tsx','src/main.ts']);
