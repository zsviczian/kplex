/**
 * Opt-in global Find acceptance inside the existing exact-build UX driver. Its controller owns
 * native input, CLI polling, artifacts and cleanup; this fragment owns four Markdown fixtures,
 * one image, existing indexed tag/folder assertions and reversible search-only work observations.
 * Fixture preparation and ordinary On-demand navigation are explicitly outside zero-work claims.
 */

/** Prepare only unique disposable facts, preserving the actual session indexing strategy. */
export const findEnhancementSetup = `(()=>{const c=window.__kplexUxRegression;c.done=false;
  c.findTask=(async()=>{
    const p=c.p,i=p.index;
    c.findUntil=(predicate,message,timeout=180000)=>c.until(()=>{c.check(!c.findCancelled,"Find fixture cancelled");return predicate()},message,timeout);
    c.findWork={search:[],navigation:[]};c.historyTargets={};
    c.findObserve=()=>{const path=c.center(),n=i.getNeighborhood(path),paths=page=>page?[...page.neighbours.keys()]:[];return {
      center:path,canonical:paths(i.state.pages.get(path)),effective:paths(i.get(path)),
      localHost:paths(i.onDemandHostScopes.get(path)?.pages.get(path)),
      localCached:paths(i.onDemandCachedScopes.get(path)?.pages.get(path)),
      projected:n?Object.fromEntries(['parents','children','leftFriends','rightFriends','siblings'].map(role=>[role,n[role].map(item=>item.page.path)])):null,
      rendered:[...c.root().querySelectorAll('.kplex-thought[data-kplex-path]')].map(element=>({path:element.dataset.kplexPath,class:element.className})),
      pending:i.getSemanticPreparationDiagnostics(),source:i.getSourceAcquisitionCounters()}};
    await p.ensureIndexReady("ux-find-fixture");c.check(!c.findCancelled,"Find fixture cancelled");
    c.check(i.isOnDemandMode()===c.originalMode,"Find setup changed the actual indexing strategy");
    c.check(!app.vault.getFolderByPath(c.folder),"Owned Find folder already exists");
    await app.vault.createFolder(c.folder);c.owned.push(c.folder);
    await app.vault.createFolder(c.folder+"/People");
    await app.vault.createFolder(c.folder+"/Empty-find-folder");
    c.findTagRoot=c.folder+"/Research";
    c.findPaths={anchor:c.folder+"/Anchor.md",person:c.folder+"/Person.md",leaf:c.folder+"/People/Müller.md",project:c.folder+"/Project.md",image:c.folder+"/Find-image.png"};
    c.hub=c.findPaths.anchor;c.existing=c.findPaths.person;
    c.findUrl="https://example.invalid/kplex-find-"+Date.now();
    const contents={anchor:"# Find anchor\\n[Find URL alias]("+c.findUrl+")\\n",person:"# Person member\\n#"+c.findTagRoot+"/Person\\n",leaf:"# Müller member\\n#"+c.findTagRoot+"/Person/Müller\\n",project:"# Project member\\n#"+c.findTagRoot+"/Project\\n"};
    for(const key of ["anchor","person","leaf","project"]){const file=await app.vault.create(c.findPaths[key],contents[key]);c.owned.push(file.path);i.insertCreatedFile(file);c.check(!c.findCancelled,"Find fixture cancelled")}
    const canvas=createFragment().createEl("canvas");canvas.width=1;canvas.height=1;
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));c.check(blob,"Find image fixture failed to encode");
    const image=await app.vault.createBinary(c.findPaths.image,await blob.arrayBuffer());c.owned.push(image.path);i.insertCreatedFile(image);
    const notes=Object.entries(c.findPaths).filter(([key])=>key!=="image").map(([,path])=>path);
    await c.findUntil(()=>notes.every(path=>app.metadataCache.getFileCache(app.vault.getFileByPath(path))),"Find fixture metadata did not settle");
    await c.findUntil(()=>app.metadataCache.getFileCache(app.vault.getFileByPath(c.findPaths.leaf))?.tags?.some(item=>item.tag==="#"+c.findTagRoot+"/Person/Müller"),"Native hierarchical tag metadata is missing");
    Object.assign(p.settings,{embedCentralNode:false,sidecarOpen:false,documentSyncMode:"off",followActiveFile:false,autoOpenCentralDocument:false,
      showTagNodes:false,showFolderNodes:false,showPageNodes:true,showAttachments:true,showURLNodes:true,showFullTagName:false,renderSiblings:false,renderAlias:false,
      graphDepth:1,graphLenses:[],animationSpeed:0,lastActivePath:c.hub,navigationHistory:[c.hub]});
    await i.refreshPresentationSettings();
    // Setup uses the established incremental owner only. No forced full build, flush or receipt
    // can manufacture the search/relationship authority being tested afterward.
    let pending=notes;c.findPatchAttempts=[];
    for(let attempt=0;pending.length&&attempt<8;attempt++){
      await c.findUntil(()=>!i.building&&!i.hasActiveSemanticPreparation(),"Find fixture graph owner did not settle");
      const result=await i.patchMarkdownPaths(pending);c.findPatchAttempts.push({outcome:result.outcome,pending:result.pendingPaths?.length??0});
      if(result.outcome==="patched"){pending=[];break}
      c.check(result.outcome==="cancelled","Find incremental fixture patch failed: "+result.outcome);pending=result.pendingPaths??pending;
    }
    c.check(!pending.length,"Find fixture incremental source patches did not converge");
    p.index.notifyPresentation();p.notifyNavigation(c.hub);app.workspace.setActiveLeaf(c.leaf,{focus:true});
    await c.findUntil(()=>c.root()?.querySelector(".kplex-role-center")?.dataset.kplexPath===c.hub,"Owned Find anchor did not render");
    await c.findUntil(()=>i.get("tag:"+c.findTagRoot+"/Person/Müller")&&i.get("folder:"+c.folder+"/Empty-find-folder"),"Existing tag/folder vocabulary did not publish");
    c.findSettle=async()=>{let stable=0,previous="";await c.findUntil(()=>{const state=i.sourceAcquisition.getActivityState(),cache=i.indexedDb.getActivityState(),active=i.getWorkPriorityDiagnostics().active,signature=JSON.stringify([i.publicationRevision,p.getIndexSourceRevision(),i.sourceAcquisition.getMaintenanceRevision(),i.getSourceAcquisitionCounters()]);
      const quiet=!i.building&&!i.hasActiveSemanticPreparation()&&!p.rebuildTask&&!state.sourceActive&&!state.knownImpactTasks&&!state.repoWrites&&!cache.queuedBodies&&!cache.writerActive&&i.snapshotPersistTimer===null&&Object.values(active).every(value=>value===0);
      stable=quiet&&signature===previous?stable+1:0;previous=signature;return stable>=4},"Find fixture did not reach a genuine quiet source interval");await c.frames()};
    await c.findSettle();
    c.fixtureReadiness={mode:i.isOnDemandMode()?"on-demand":"eager",fixtureMarkdown:notes.length,fixtureImage:1,source:i.getSourceAcquisitionCounters(),semantic:i.getSemanticPreparationDiagnostics(),patches:c.findPatchAttempts,forcedFullBuild:false};
  })().then(()=>{c.done=true},error=>{c.error=String(error?.stack??error);c.done=true});return JSON.stringify(true)})()`;

/** Exercise the real F4 field, result DOM, Enter and clicked hierarchy nodes with bounded observers. */
export const findEnhancementScenarios = `(()=>{const c=window.__kplexUxRegression;c.done=false;c.error=null;
  c.findTask=(async()=>{
    const p=c.p,i=p.index,root=c.root(),doc=root.ownerDocument;
    const record=(id,evidence={})=>c.scenarios.push({id,status:"passed",...evidence});
    const counts={reads:0,parses:0,acquisitions:0,builds:0,snapshotWrites:0,inventories:0},restores=[];
    const wrap=(owner,key,counter)=>{const descriptor=Object.getOwnPropertyDescriptor(owner,key),original=owner[key];c.check(typeof original==="function","Find work hook is unavailable: "+key);
      owner[key]=function(...args){counts[counter]++;return original.apply(this,args)};restores.push(()=>{if(descriptor)Object.defineProperty(owner,key,descriptor);else delete owner[key]})};
    wrap(app.vault,"read","reads");wrap(app.vault,"cachedRead","reads");wrap(app.vault,"getFiles","inventories");wrap(app.vault,"getMarkdownFiles","inventories");
    wrap(i.metadataParser,"parse","parses");wrap(i.sourceAcquisition,"acquire","acquisitions");wrap(i,"rebuild","builds");wrap(i,"rebuildProgressively","builds");wrap(i.indexedDb,"writeSnapshot","snapshotWrites");
    c.findRestoreWork=()=>{for(const restore of restores.splice(0).reverse())restore()};
    const copy=()=>({...counts}),delta=before=>Object.fromEntries(Object.keys(counts).map(key=>[key,counts[key]-before[key]]));
    const rows=()=>[...root.querySelectorAll(".kplex-search-result")];
    const label=row=>row.querySelector(":scope > span:not(.kplex-search-result-prefix)")?.textContent;
    const icon=row=>[...(row.querySelector(".kplex-search-result-prefix svg")?.classList??[])].find(name=>name.startsWith("lucide-"));
    const sourceSnapshot=()=>JSON.stringify(i.getSourceAcquisitionCounters());
    const semanticSnapshot=()=>JSON.stringify(i.getSemanticPreparationDiagnostics());
    const find=async(query,wantedLabel,expectedIcon)=>{await c.findSettle();const before=copy(),source=sourceSnapshot(),semantic=semanticSnapshot(),center=c.center();
      app.workspace.setActiveLeaf(c.leaf,{focus:true});root.focus();await c.key(root,"F4");
      await c.findUntil(()=>doc.activeElement===root.querySelector("input.kplex-search"),"Actual F4 did not focus global Find");
      const input=doc.activeElement;c.input(input,query);await c.frames();await c.findUntil(()=>rows().some(row=>label(row)===wantedLabel),"Find did not show expected result: "+wantedLabel);
      const row=rows().find(row=>label(row)===wantedLabel);c.check(row.querySelector('.kplex-search-result-prefix[aria-hidden="true"]'),"Result icon is not decorative");
      // The installed native icon registry aliases folder to folder-open; both identify a folder.
      const expected=expectedIcon==='lucide-folder'?['lucide-folder','lucide-folder-open']:[expectedIcon];
      c.check(expected.includes(icon(row)),"Find result has the wrong native type icon: "+JSON.stringify({label:wantedLabel,actual:icon(row),expected}));
      const work=delta(before);c.check(Object.values(work).every(value=>value===0),"Typing/F4 performed indexing/source/storage work: "+JSON.stringify(work));
      c.check(sourceSnapshot()===source&&semanticSnapshot()===semantic&&c.center()===center,"Search-only interaction changed source/semantic work or center");
      c.findWork.search.push({query,resultLabel:wantedLabel,icon:icon(row),work,trustedF4:c.lastKey?.trusted===true});return {input,row};
    };
    const navigate=async(action,path)=>{const before=copy(),sourceBefore=i.getSourceAcquisitionCounters();await action();await c.findUntil(()=>c.center()===path,"Find destination did not become the rendered center: "+path);await c.findSettle();c.findWork.navigation.push({path,work:delta(before),sourceBefore,sourceAfter:i.getSourceAcquisitionCounters(),state:c.findObserve()});c.check(i.isOnDemandMode()===c.originalMode,"Navigation changed indexing strategy")};
    const research="tag:"+c.findTagRoot,person=research+"/Person",leaf=person+"/Müller",project=research+"/Project";
    const leafResult=await find("#Müller","#Müller","lucide-tags");
    c.check(leafResult.row.querySelector("small")?.textContent==="#"+c.findTagRoot+"/Person/Müller","Find omitted the full hierarchical tag path");
    c.check(rows().every(row=>label(row)?.startsWith("#")),"A # query included a non-tag result");
    await find("Müller","#Müller","lucide-tags");
    const qualified=await find("#"+c.findTagRoot+"/Person/Müller","#Müller","lucide-tags");
    await navigate(async()=>{await c.key(qualified.input,"Enter")},leaf);
    c.check(c.root().querySelector('.kplex-role-parent[data-kplex-path="'+person+'"]'),"Explicit leaf tag did not display its parent with Tags hidden");
    c.check(c.root().querySelector('.kplex-role-child[data-kplex-path="'+c.findPaths.leaf+'"]'),"Tag did not display its associated note");
    const personNode=c.root().querySelector('.kplex-role-parent[data-kplex-path="'+person+'"]');
    await navigate(async()=>{await c.click(personNode)},person);
    c.check(c.root().querySelector('.kplex-role-parent[data-kplex-path="'+research+'"]')&&c.root().querySelector('.kplex-role-child[data-kplex-path="'+leaf+'"]')&&c.root().querySelector('.kplex-role-child[data-kplex-path="'+c.findPaths.person+'"]'),"Parent/child tag hierarchy or direct member note is missing");
    await navigate(async()=>{await c.click(c.root().querySelector('.kplex-role-parent[data-kplex-path="'+research+'"]'))},research);
    c.check([person,project].every(path=>c.root().querySelector('.kplex-role-child[data-kplex-path="'+path+'"]')),"Research tag did not display both child branches");
    record("F4-accented-tag-search-and-parent-child-native-navigation",{tagNodesHidden:true,parentChildAndMemberNotes:true});
    const folder=await find("Empty-find-folder","Empty-find-folder","lucide-folder");
    await navigate(async()=>{await c.click(folder.row)},"folder:"+c.folder+"/Empty-find-folder");
    const note=await find("Anchor","Anchor","lucide-file-text");
    await navigate(async()=>{await c.click(note.row)},c.hub);
    await find("Find-image","Find-image.png","lucide-image");
    await find("Find URL alias","Find URL alias","lucide-globe");
    const personNote=await find("Person","Person","lucide-file-text");
    await navigate(async()=>{await c.click(personNote.row)},c.findPaths.person);
    c.check(!c.root().querySelector('.kplex-thought[data-kplex-path="'+person+'"]'),"Ordinary note center unexpectedly revealed globally hidden tags");
    c.check(!p.settings.showTagNodes&&!p.settings.showFolderNodes,"Explicit Find navigation changed saved visibility choices");
    record("F4-folder-note-image-url-native-type-icons-and-hidden-tags-retained",{folderNodesHidden:true,defaultVisibilityPreserved:true,searchIntervals:c.findWork.search.length,navigationIntervals:c.findWork.navigation.length});
  })().then(()=>{c.findRestoreWork?.();c.done=true},error=>{c.findRestoreWork?.();c.error=String(error?.stack??error);c.done=true});return JSON.stringify(true)})()`;

/** Retire the owned task, then attempt each native restoration independently after any assertion failure. */
export const findEnhancementCleanup = `(()=>{const c=window.__kplexUxRegression;if(!c)return JSON.stringify(true);c.done=false;c.error=null;c.findCancelled=true;
  (async()=>{
    const errors=[],steps=[],attempt=async(name,work)=>{try{await work();steps.push({name,status:"passed"})}catch(error){errors.push(name+": "+String(error));steps.push({name,status:"failed"})}};
    await attempt("owned-task",async()=>{await c.findTask});
    await attempt("source-observers",()=>{c.findRestoreWork?.();c.restorePairTrace?.();c.noticeObserver?.disconnect()});
    await attempt("owned-leaves",()=>{c.popoutLeaf?.detach();c.leaf?.detach();c.previousLeaf?.detach()});
    await attempt("owned-fixtures",async()=>{const folder=app.vault.getFolderByPath(c.folder);if(folder&&c.owned.includes(c.folder))await app.vault.delete(folder,true);c.check(!app.vault.getFolderByPath(c.folder),"Owned Find fixture folder remains")});
    await attempt("original-settings-before-layout",async()=>{await c.p.settingsWriteQueue;c.p.settings=c.settings;await c.p.saveSettings(false,false);await c.p.settingsWriteQueue});
    await attempt("original-layout",async()=>{await app.workspace.changeLayout(c.originalLayout)});
    await attempt("original-native-owners",()=>{const leaves=[];app.workspace.iterateAllLeaves(leaf=>leaves.push(leaf));const rebind=old=>old?leaves.find(leaf=>leaf.id===old.id)??null:null;
      c.p.linkedDocumentLeaf=rebind(c.originalOwners.linked);c.p.lastDocumentLeaf=rebind(c.originalOwners.last);c.p.recentLeafHistory=c.originalOwners.recent.map(rebind).filter(Boolean);c.p.sidecarLeaves.clear();
      for(const [host,leaf]of c.originalOwners.sidecars){const restoredHost=rebind(host),restoredLeaf=rebind(leaf);if(restoredHost&&restoredLeaf)c.p.sidecarLeaves.set(restoredHost,restoredLeaf)}});
    await attempt("original-settings-after-layout",async()=>{c.p.settings=c.settings;await c.p.saveSettings(false,false);await c.p.settingsWriteQueue;await c.p.index.refreshPresentationSettings();c.p.savedSettingsPolicy=c.originalPolicy;
      await c.until(()=>c.settingsWrites.size===0,"Find cleanup still has accepted settings writes");c.check(!c.settingsWriteErrors.length,"Native fixture settings storage failed");c.restoreSettingsWrites()});
    await attempt("original-native-utility-targets",async()=>{
      const restore=async node=>{if(node?.type==='leaf'&&['backlink','outgoing-link','localgraph'].includes(node.state?.type)){
        const leaf=app.workspace.getLeafById(node.id);c.check(leaf,'Original native utility leaf is missing');await leaf.setViewState(node.state)}
        for(const child of node?.children??[])await restore(child)};
      for(const key of ['main','left','right'])await restore(c.originalLayout[key])});
    await attempt("native-window",()=>{const win=require("@electron/remote").getCurrentWindow();win.setBounds(c.bounds);win.webContents.setBackgroundThrottling(c.throttling);
      for(const [side,collapsed]of Object.entries(c.sidebars)){const split=app.workspace[side+"Split"];collapsed?split.collapse():split.expand()}});
    await attempt("inventory-and-mode",()=>{c.check(JSON.stringify(app.vault.getFiles().map(file=>file.path).sort())===JSON.stringify(c.originalInventory),"Find fixture file inventory was not restored");c.check(c.p.index.isOnDemandMode()===c.originalMode,"Find changed the actual indexing strategy")});
    await attempt("native-layout-settlement",async()=>{await c.wait(500);c.findLayout={expected:c.originalLayout,actual:app.workspace.getLayout()};c.check(JSON.stringify(c.findLayout.actual)===JSON.stringify(c.findLayout.expected),"Original native layout did not restore exactly")});
    c.findCleanup={steps,errors,inventoryRestored:!errors.some(error=>error.startsWith("inventory")),modePreserved:c.p.index.isOnDemandMode()===c.originalMode,ownedFolderRemoved:!app.vault.getFolderByPath(c.folder),layoutRestored:!errors.some(error=>error.startsWith("original-layout")||error.startsWith("native-layout"))};
    c.restoreSettingsWrites?.();if(errors.length)c.error=errors.join("\\n");c.done=true;
  })().catch(error=>{c.error=String(error?.stack??error);c.done=true});return JSON.stringify(true)})()`;
