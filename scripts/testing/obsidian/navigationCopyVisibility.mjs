/**
 * Focused exact-build native acceptance for PR261. Reuses the controlled-probe transport and
 * document-session cleanup. Each lane owns finite disposable notes/leaves/settings/clipboard;
 * Electron input is not a physical Android or system-keyboard acceptance claim.
 */
import {readFileSync, existsSync} from 'node:fs';
import {join} from 'node:path';
import {runControlledProbe} from './controlledProbe.mjs';
import {nativeDocumentSessions} from './nativeDocumentSessions.mjs';

/** Run one independent item so another item's host blocker cannot hide its evidence. */
async function scenario(app,c) {
  if(app.vault.getName()!=='kplex-test-small')throw Error('Explicit disposable Small required');
  let p=app.plugins.plugins['k-plex'];const workspace=app.workspace,layout=workspace.getLayout(),settings=structuredClone(p.settings),policy=p.savedSettingsPolicy;
  const sessions=c.sessions(p),savedSessions=sessions.capture(),remote=require('@electron/remote'),win=remote.getCurrentWindow();
  const bounds=win.getBounds(),maximized=win.isMaximized(),minimized=win.isMinimized(),wasThrottled=win.webContents.getBackgroundThrottling();
  const owned=[],folders=[],leaves=[],releases=[],restores=[],cases=[],cleanup=[],folder='Kplex-261-'+Date.now();
  const originalPrefs={newLinkFormat:app.vault.getConfig('newLinkFormat'),useMarkdownLinks:app.vault.getConfig('useMarkdownLinks')};
  let clipboardBackup,failure,host,other,documentLeaf,copyFailure;
  const check=(value,message)=>{if(c.closed||!value)throw Error(message)};
  const wait=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
  const until=async(read,message,maximum=15000)=>{const end=Date.now()+maximum;while(!read()){check(Date.now()<end,message);await wait(25)}};
  const center=leaf=>leaf.view.documentSession?.centerPath;
  const surface=leaf=>[...p.actionSurfaceHosts].find(([,registration])=>registration.leaf===leaf)?.[0];
  const act=(leaf,id,target)=>p.actionManager.dispatch({id,source:'internal',surfaceId:surface(leaf),...(target?{target:{kind:'explicit',node:target}}:{})});
  const root=leaf=>leaf.view.contentEl;
  const visible=element=>{if(!element?.isConnected)return false;const rect=element.getBoundingClientRect();return rect.width>0&&rect.height>0&&element.ownerDocument.defaultView.getComputedStyle(element).visibility!=='hidden'};
  /** Deliver native Electron pointer activation to a real visible control in its owning window. */
  const click=async(element,native=element?.ownerDocument.defaultView.require('@electron/remote').getCurrentWindow())=>{
    check(element?.isConnected,'Native control absent');element.scrollIntoView({block:'nearest'});const rect=element.getBoundingClientRect();
    check(rect.width>0&&rect.height>0,'Native control has no bounds: '+element.outerHTML.slice(0,500));const x=Math.round(rect.left+rect.width/2),y=Math.round(rect.top+rect.height/2);
    native.show();native.focus();native.webContents.focus();let trusted=false;const observed=event=>{trusted=event.isTrusted};element.addEventListener('click',observed,{once:true});
    try{native.webContents.sendInputEvent({type:'mouseMove',x,y});native.webContents.sendInputEvent({type:'mouseDown',x,y,button:'left',clickCount:1});native.webContents.sendInputEvent({type:'mouseUp',x,y,button:'left',clickCount:1});await until(()=>trusted,'Trusted native click absent');}
    finally{element.removeEventListener('click',observed);}
  };
  /** Create an actual registered canvas; do not replace its production view or action definitions. */
  const canvas=async(type='k-plex-react-view')=>{
    const leaf=type==='k-plex-sidepanel-view'?workspace.getRightLeaf(false):workspace.getLeaf('tab');leaves.push(leaf);
    await leaf.setViewState({type,active:true});if(type==='k-plex-sidepanel-view')workspace.rightSplit.expand();else await workspace.revealLeaf(leaf);
    await leaf.view.waitUntilReady();leaf.view.centerPresentation.update({embedCentralNode:false,centralNodeMarkdownMode:'source'});
    await until(()=>surface(leaf),'Canvas action registration missing');return leaf;
  };
  /** Native target equality, never a recorded openFile call alone, establishes accepted navigation. */
  const navigate=async(leaf,file)=>{await p.focusInKplex(file.path,leaf);await until(()=>center(leaf)===file.path&&root(leaf).querySelector('.kplex-role-center[data-kplex-path="'+CSS.escape(file.path)+'"]'),'Native canvas center missing');};
  try {
    remote.app.show?.();remote.app.focus({steal:true});win.restore();win.show();win.focus();await until(()=>!win.webContents.isDestroyed(),'Native window unavailable');
    // Preserve occlusion evidence. This finite functional diagnostic may disable throttling only
    // in this selected disposable window, and never treats its timings as a performance claim.
    win.webContents.setBackgroundThrottling(false);
    await sessions.off();workspace.leftSplit.collapse();workspace.rightSplit.collapse();
    folders.push(await app.vault.createFolder(folder));
    for(const name of ['one','two','notes','other'])folders.push(await app.vault.createFolder(folder+'/'+name));
    const make=async(path,body)=>{const file=await app.vault.create(folder+'/'+path,body);owned.push(file);return file;};
    const a=await make('A.md','# First\nFirst paragraph.\n\n# Second\nSecond paragraph.\n'),b=await make('B.md','# B\nOther document.\n'),d1=await make('notes/Destination.md',''),d2=await make('other/Destination.md','');
    const t1=await make('one/Target.md','Target one.\n'),t2=await make('two/Target.md','Target two.\n'),special=await make('one/Árvíz 日本語 (test), yes!.md','Special target.\n');
    const attachment=await app.vault.createBinary(folder+'/one/Attachment.bin',new Uint8Array([1,2,3]).buffer);owned.push(attachment);
    await until(()=>owned.filter(file=>file.extension==='md').every(file=>app.metadataCache.getFileCache(file)),'Fixture metadata missing');
    Object.assign(p.settings,{documentSyncMode:'off',sidecarOpen:false,followActiveFile:false,autoOpenCentralDocument:false,embedCentralNode:false,animationSpeed:0,
      showPageNodes:true,showAttachments:true,showFolderNodes:false,showTagNodes:false,showInferredNodes:true,showVirtualNodes:true,showURLNodes:true,renderSiblings:false,graphLenses:[],applyPowerFilter:false});
    for(const file of owned){p.index.insertCreatedFile(file);releases.push(p.index.acquireSemanticDemand(file.path));}
    await until(()=>!p.index.hasPendingSemanticPreparation(),'Fixture semantic preparation pending',45000);
    host=await canvas();other=await canvas();await navigate(other,b);await navigate(host,a);
    documentLeaf=workspace.createLeafBySplit(host,'vertical',false);leaves.push(documentLeaf);await documentLeaf.openFile(b,{active:true});
    c.progress={lane:c.lane,phase:'prepared',cases};
    if(c.lane==='sections'||c.lane==='copy') {
      const originalShow=p.showKplexMenuAtPosition;
      p.showKplexMenuAtPosition=function(menu,...args){menu.setUseNativeMenu(false);return originalShow.call(this,menu,...args)};restores.push(()=>{p.showKplexMenuAtPosition=originalShow;p.dismissKplexMenu()});
    }

    if(c.lane==='sections') {
      for(const type of ['k-plex-react-view','k-plex-sidepanel-view']) {
        const current=type==='k-plex-react-view'?host:await canvas(type);await navigate(current,a);
        await act(current,'sections.toggle');await until(()=>root(current).querySelectorAll('[data-kplex-path^="kplex-section:"]').length===2,'Sections absent');
        const section=()=>[...root(current).querySelectorAll('[data-kplex-path^="kplex-section:"]')].find(el=>el.textContent.includes('Second'));
        await documentLeaf.openFile(b,{active:true});await p.setDocumentSyncMode(current,'off');await navigate(current,a);
        let release,entered=false;const hold=new Promise(resolve=>release=resolve),opening=documentLeaf.openFile;
        documentLeaf.openFile=async function(file,options){if(file===a&&!entered){entered=true;await hold;}return opening.call(this,file,options)};
        const restore=()=>{release();documentLeaf.openFile=opening};restores.push(restore);
        const mode=p.setDocumentSyncMode(current,'pinned');
        check(p.documentSession(current).linkedDocumentLeaf===documentLeaf,'Pinned destination identity mismatch');
        root(current).querySelector('.kplex-app').focus({preventScroll:true});
        // Dispatch the actual section action before React observes the newly pinned destination.
        const element=section(),key=element.dataset.kplexKeyboardId;
        const target={kind:'section',identity:element.dataset.kplexPath,path:element.dataset.kplexPath};
        const openRequest={id:'node.open',source:'local-hotkey',surfaceId:surface(current),target:{kind:'explicit',node:target,occurrenceId:key}};
        c.progress={lane:c.lane,phase:'section-open',surface:type,target,key,availability:p.actionManager.check(openRequest),snapshot:p.actionManager.readSnapshot(surface(current)),nativeFile:documentLeaf.view.file?.path,cases};
        const request=p.actionManager.dispatch(openRequest).then(result=>{c.progress={...c.progress,outcome:result};return result});
        try{await until(()=>entered,'Section action did not enter exact native open');}
        catch(error){throw Error(String(error)+' '+JSON.stringify(c.progress));}
        workspace.setActiveLeaf(documentLeaf,{focus:true});workspace.trigger('active-leaf-change',documentLeaf);workspace.trigger('file-open',b);
        check(!p.shouldFollowDocumentFile(b,current,documentLeaf),'Old-file activation echo admitted');
        release();await Promise.all([mode,request]);documentLeaf.openFile=opening;restores.pop();
        await until(()=>documentLeaf.view.file===a,'Section opened wrong physical file');
        const state=documentLeaf.view.getEphemeralState();check(state.subpath==='#Second'||documentLeaf.view.editor?.getCursor().line===3,'Section did not reach Second heading: '+JSON.stringify(state));
        check(center(other)===b.path,'Unrelated Plex navigated');
        // Exercise the captured context menu through real Electron input as a separate route.
        await p.setDocumentSyncMode(current,'off');await navigate(current,a);await workspace.revealLeaf(current);await until(()=>section(),'Section projection missing after open');
        const el=section(),rect=el.getBoundingClientRect();el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('contextmenu',{bubbles:true,clientX:rect.left+10,clientY:rect.top+10}));
        await until(()=>[...el.ownerDocument.querySelectorAll('.menu-item')].some(item=>item.textContent.includes(p.translator('graph.openSection'))),'Section menu action absent');
        const menuItem=[...el.ownerDocument.querySelectorAll('.menu-item')].find(item=>item.textContent.includes(p.translator('graph.openSection')));await click(menuItem);
        await until(()=>documentLeaf.view.file===a,'Menu opened wrong physical file');
        check(documentLeaf.view.getEphemeralState().subpath==='#Second'||documentLeaf.view.editor?.getCursor().line===3,'Menu lost heading');
        await documentLeaf.openFile(b,{active:true});check(p.shouldFollowDocumentFile(b,current,documentLeaf)===false,'Off policy must stay off');
        cases.push({surface:type,race:'passed',heading:'Second',menu:'passed',independentCenter:true});
      }
    }

    if(c.lane==='copy') {
      const clipboardService=p.nodeLinkClipboard,originalPaste=clipboardService.paste,originalCopy=clipboardService.copy,pasteTrace=[],copyProof=[];
      clipboardService.copy=function(...args){
        const before=p.index.getSourceAcquisitionCounters(),semantic=p.index.getSemanticPreparationDiagnostics(),centerBefore=center(host);
        const value=originalCopy.apply(this,args),after=p.index.getSourceAcquisitionCounters(),next=p.index.getSemanticPreparationDiagnostics();
        check(after.vaultReads===before.vaultReads&&after.parses===before.parses&&next.requested===semantic.requested&&next.fullBuilds===semantic.fullBuilds&&center(host)===centerBefore,'Synchronous Copy invocation acquired sources or navigated');
        copyProof.push({sourceReads:0,parses:0,requests:0,builds:0,navigation:false});return value;
      };
      clipboardService.paste=function(event,editor,info){const entry={preventedBefore:event.defaultPrevented,file:info.file?.path,expectedEditor:editor===c.pasteEditor,marker:event.clipboardData?.getData('text/html').includes('data-kplex-node-link')};pasteTrace.push(entry);const result=originalPaste.call(this,event,editor,info);entry.preventedAfter=event.defaultPrevented;entry.valueAfter=editor.getValue();return result};
      restores.push(()=>{clipboardService.paste=originalPaste;clipboardService.copy=originalCopy;delete c.pasteEditor});
      const clipboard=remote.clipboard,formats=clipboard.availableFormats();
      check(formats.every(format=>['text/plain','text/html','text/rtf','image/png','text/bookmark'].includes(format)),'Unsupported existing clipboard format; clipboard unchanged');
      const data={};for(const [key,type,read] of [['text','text/plain','readText'],['html','text/html','readHTML'],['rtf','text/rtf','readRTF']])if(formats.includes(type))data[key]=clipboard[read]();
      const image=clipboard.readImage();if(!image.isEmpty())data.image=image;const bookmark=clipboard.readBookmark();if(bookmark.title){data.bookmark=bookmark.title;data.text??=bookmark.url;}
      clipboardBackup={clipboard,data};
      let trusted=0;
      /** Invoke Copy from the real captured node menu with a trusted native activation. */
      const copyMenu=async(element)=>{
        const copies=copyProof.length,oldToken=clipboardService.receipt?.token,centerBefore=center(host);
        const doc=element.ownerDocument,r=element.getBoundingClientRect();element.dispatchEvent(new doc.defaultView.MouseEvent('contextmenu',{bubbles:true,clientX:r.left+10,clientY:r.top+10}));
        await until(()=>[...doc.querySelectorAll('.menu-item')].some(item=>item.textContent.includes(p.translator('actions.node.copy-link'))),'Copy link menu action absent');
        await click([...doc.querySelectorAll('.menu-item')].find(item=>item.textContent.includes(p.translator('actions.node.copy-link'))));
        await until(()=>clipboardService.receipt?.token&&clipboardService.receipt.token!==oldToken&&clipboard.readHTML().includes(clipboardService.receipt.token),'Fresh native clipboard marker missing');
        check(copyProof.length===copies+1&&center(host)===centerBefore,'Copy did not execute exactly once or changed the center');
      };
      /** Native paste must reach the exact editor and undo through its ordinary transaction. */
      const paste=async(leaf,expected,native=leaf.view.containerEl.ownerDocument.defaultView.require('@electron/remote').getCurrentWindow(),targetFile)=>{
        const embedded=leaf.view.containerEl.closest('.kplex-central-editor-leaf-host');
        if(!embedded)await leaf.setViewState({type:'markdown',state:{file:leaf.view.file.path,mode:'source'},active:true});
        await until(()=>leaf.view.editor&&leaf.view.containerEl.querySelector('.cm-content'),'Native editor mount missing');
        const editor=leaf.view.editor;editor.setValue('');editor.setCursor({line:0,ch:0});native.show();native.focus();native.webContents.focus();
        if(!embedded){await workspace.revealLeaf(leaf);workspace.setActiveLeaf(leaf,{focus:true})}
        else {await act(host,'editor.focus');check(workspace.activeLeaf===leaf,'Embedded editor lacks native active-leaf ownership');}
        editor.focus();
        const doc=leaf.view.containerEl.ownerDocument,observe=event=>{if(leaf.view.containerEl.contains(event.target)&&event.isTrusted)trusted++};doc.addEventListener('paste',observe,true);c.pasteEditor=editor;
        const receipt=p.nodeLinkClipboard.receipt;
        c.progress={lane:c.lane,phase:'paste',embedded:!!embedded,file:leaf.view.file.path,expected,copyCurrent:receipt?.capture?.current(),activeLeaf:workspace.activeLeaf?.view.file?.path,editable:doc.activeElement?.isContentEditable,mode:leaf.view.getMode(),nativeFocused:native.webContents.isFocused(),nativeId:native.id,ownerId:doc.defaultView.require('@electron/remote').getCurrentWindow().id,pasteTrace,cases};
        try{
          await until(()=>leaf.view.containerEl.contains(doc.activeElement)&&doc.activeElement.closest('.cm-content'),'Native editor focus missing: '+JSON.stringify({active:doc.activeElement?.className,visible:doc.visibilityState,file:leaf.view.file.path,embedded:!!embedded}));
          if(embedded&&c.osEmbedded){c.progress.phase='await-os-embedded-paste';await until(()=>editor.getValue()===expected,'OS embedded paste did not arrive',60000);}
          else {for(const type of ['keyDown','keyUp'])native.webContents.sendInputEvent({type,keyCode:'v',modifiers:[remote.process.platform==='darwin'?'meta':'control']});await until(()=>editor.getValue()===expected,'Pasted native link differs: '+editor.getValue());}
          if(targetFile){await leaf.view.save();await until(()=>app.metadataCache.resolvedLinks[leaf.view.file.path]?.[targetFile.path]>0,'Native resolver did not resolve the pasted target');}
          if(embedded)editor.undo();else for(const type of ['keyDown','keyUp'])native.webContents.sendInputEvent({type,keyCode:'z',modifiers:[remote.process.platform==='darwin'?'meta':'control']});
          try{await until(()=>editor.getValue()==='','Native paste undo failed');}catch(error){throw Error(String(error)+' '+JSON.stringify({text:editor.getValue(),expected,active:doc.activeElement?.className}));}
        }
        finally{doc.removeEventListener('paste',observe,true);}
      };
      for(const file of c.copyEdgesOnly?[]:[t1,t2,special,attachment,a]) {
        await navigate(host,file);
        if(file===a){await act(host,'sections.toggle');await until(()=>root(host).querySelector('[data-kplex-path^="kplex-section:"]'),'Section copy source absent');}
        let copied=false;
        for(const wiki of [true,false])for(const format of ['shortest','relative','absolute']) {
          app.vault.setConfig('useMarkdownLinks',!wiki);app.vault.setConfig('newLinkFormat',format);
          if(!copied){await workspace.revealLeaf(host);await copyMenu(root(host).querySelector('.kplex-role-center'));copied=true;}
          for(const destination of [d1,d2]) {
            await documentLeaf.openFile(destination,{active:true});const expected=app.fileManager.generateMarkdownLink(file,destination.path);
            await paste(documentLeaf,expected,win,file);cases.push({target:file===attachment?'attachment':file===special?'punctuation-Unicode':file===a?'note':'duplicate-basename',wiki,format,destination:destination===d1?'notes':'other',resolved:true});
          }
        }
      }
      await navigate(host,a);await workspace.revealLeaf(host);
      if(!root(host).querySelector('[data-kplex-path^="kplex-section:"]'))await act(host,'sections.toggle');
      await until(()=>[...root(host).querySelectorAll('[data-kplex-path^="kplex-section:"]')].some(el=>el.textContent.includes('Second')),'Section copy source absent');
      await copyMenu([...root(host).querySelectorAll('[data-kplex-path^="kplex-section:"]')].find(el=>el.textContent.includes('Second')));
      await documentLeaf.openFile(d1,{active:true});await paste(documentLeaf,app.fileManager.generateMarkdownLink(a,d1.path,'#Second'),win,a);cases.push({sectionPaste:true,heading:'Second'});
      clipboard.writeText('Ordinary clipboard text');await paste(documentLeaf,'Ordinary clipboard text');cases.push({ordinaryPaste:true});
      check(trusted>=(c.copyEdgesOnly?2:61),'Trusted native paste receipts missing');
      // Use the real existing embedded editor owner, captured at its native view mount boundary.
      await navigate(host,t1);await workspace.revealLeaf(host);await copyMenu(root(host).querySelector('.kplex-role-center'));
      await navigate(host,d1);const embedded=new Set(),prototype=Object.getPrototypeOf(host),setState=prototype.setViewState;
      prototype.setViewState=function(...args){if(this.containerEl.closest('.kplex-central-editor-leaf-host'))embedded.add(this);return setState.apply(this,args)};
      const restorePrototype=()=>{prototype.setViewState=setState};restores.push(restorePrototype);
      await click(root(host).querySelector('.kplex-role-center .kplex-thought-corner-action'));
      await until(()=>[...embedded].some(leaf=>root(host).contains(leaf.view.containerEl)&&leaf.view.editor),'Embedded native editor missing');
      const embeddedLeaf=[...embedded].find(leaf=>root(host).contains(leaf.view.containerEl)&&leaf.view.editor);
      // Establish a healthy native editor paste/undo baseline before exercising the owned payload.
      // Keep the actual Copy gesture's exact receipt; do not regenerate it or guess another target.
      const ownedPayload={text:clipboard.readText(),html:clipboard.readHTML()};clipboard.writeText('Embedded ordinary paste baseline');
      await paste(embeddedLeaf,'Embedded ordinary paste baseline',embeddedLeaf.view.containerEl.ownerDocument.defaultView.require('@electron/remote').getCurrentWindow());
      cases.push({embeddedBaseline:true});clipboard.write(ownedPayload);
      try{await paste(embeddedLeaf,app.fileManager.generateMarkdownLink(t1,d1.path),embeddedLeaf.view.containerEl.ownerDocument.defaultView.require('@electron/remote').getCurrentWindow(),t1);cases.push({embeddedPaste:true});}
      catch(error){
        copyFailure=error;const traceCount=pasteTrace.length,baseline='Ordinary embedded clipboard baseline';clipboard.writeText(baseline);
        let ordinary=false;
        try{await paste(embeddedLeaf,baseline,embeddedLeaf.view.containerEl.ownerDocument.defaultView.require('@electron/remote').getCurrentWindow());ordinary=true;}catch{ordinary=false;}
        cases.push({embeddedPaste:false,reason:String(error),ordinaryBaseline:ordinary,pasteEventsReceived:pasteTrace.length-traceCount});
      }
      const close=[...root(host).querySelectorAll('.kplex-central-editor-toolbar button')].find(button=>button.textContent===p.translator('app.useNormalCentralNode'));
      await click(close);await until(()=>!root(host).querySelector('.kplex-central-editor-overlay'),'Embedded editor close failed');restorePrototype();restores.pop();
      // Cross-window native editor owns the receiving destination; the copy stays in the main window.
      await navigate(host,t1);await workspace.revealLeaf(host);await copyMenu(root(host).querySelector('.kplex-role-center'));const pop=workspace.getLeaf('window');leaves.push(pop);await pop.openFile(d2,{active:true});
      const native=pop.view.containerEl.ownerDocument.defaultView.require('@electron/remote').getCurrentWindow();
      if(!native)throw Error('Popout native window could not be identified');
      native.show();native.focus();await paste(pop,app.fileManager.generateMarkdownLink(t1,d2.path),native,t1);cases.push({popoutPaste:true});
    }

    if(c.lane==='visibility') {
      const keys=['showPageNodes','showAttachments','showFolderNodes','showTagNodes','showURLNodes','showVirtualNodes','showInferredNodes','showCrossLinks'];
      Object.assign(p.settings,{showPageNodes:false,showAttachments:true,showNeighborCount:true,renderSiblings:false,excludeFilepathsCsv:'do-not-touch/',excludeFilepaths:['do-not-touch/']});
      const excluded=JSON.stringify(p.settings.excludeFilepaths),lenses=JSON.stringify(p.settings.graphLenses);p.settings.unknown261={retain:true};
      await p.saveSettings(false,false);await p.settingsWriteQueue;
      await until(()=>!p.isStartupInitializing()&&!p.index.hasPendingSemanticPreparation()&&!p.index.hasActiveSemanticPreparation()
        &&!p.savedSettingsRefresh?.flight&&!p.settingsReconciliation?.reading&&!p.externalSettingsQueued,'Visibility baseline still preparing',45000);
      const beforeCenters=[center(host),center(other)],work={save:0,source:0,semantic:0,scopeChecks:0,hostReads:0},sourceCalls=[];
      const acquisitionBefore=p.index.getSourceAcquisitionCounters(),semanticBefore=p.index.getSemanticPreparationDiagnostics();
      const bulkCalls=[],bulk=p.setContentVisibility;
      p.setContentVisibility=function(...args){const item={args,status:'pending'};bulkCalls.push(item);return bulk.apply(this,args).then(value=>{item.status='completed';item.changed=value;return value},error=>{item.status='failed';item.error=String(error);throw error})};restores.push(()=>p.setContentVisibility=bulk);
      for(const [owner,name,counter] of [[p,'saveData','save'],[p.index,'ensureSemanticScope','scopeChecks'],[p.index,'refreshSemanticSettings','semantic'],[p.index,'refreshPresentationSettings','source'],[p.index.metadataParser,'parse','source'],[p.index.sourceAcquisition,'prepareRequestedNeighborhood','source'],[app.vault,'read','hostReads'],[app.vault,'cachedRead','hostReads']]) {
        const original=owner[name];owner[name]=function(...args){work[counter]++;if(counter==='source')sourceCalls.push({name,owned:args[0]?.path?.startsWith(folder),stack:new Error().stack.split('\n').slice(1,6)});return original.apply(this,args)};restores.push(()=>owner[name]=original);
      }
      await wait(200);check(work.save===0&&work.source===0&&work.semantic===0,'Visibility baseline was not quiet: '+JSON.stringify(work));
      const tab=p.settingsTab;p.openSettings();await until(()=>tab.containerEl.isConnected,'Native Settings root missing');
      const pageEntry=()=>[...tab.containerEl.ownerDocument.querySelectorAll('.setting-item.mod-navigable .setting-item-name')].find(element=>element.textContent===p.translator('settings.ui.plex.behavior')&&visible(element));
      await until(pageEntry,'Canvas behavior page entry missing');await click(pageEntry());
      try{await until(()=>[...tab.containerEl.ownerDocument.querySelectorAll('button')].some(button=>button.textContent===p.translator('visibility.enableAll')&&visible(button)),'Native bulk controls not displayed');}
      catch(error){throw Error(String(error)+' '+JSON.stringify({text:tab.containerEl.textContent.slice(0,2000),buttons:[...tab.containerEl.ownerDocument.querySelectorAll('button')].map(el=>el.textContent).slice(-30)}));}
      const nativeButton=enabled=>[...tab.containerEl.ownerDocument.querySelectorAll('button')].find(button=>button.textContent===p.translator(enabled?'visibility.enableAll':'visibility.disableAll')&&visible(button));
      await click(nativeButton(false));
      try{await until(()=>keys.every(key=>p.settings[key]===false)&&!p.settings.showNeighborCount,'Native Disable all did not settle');}
      catch(error){throw Error(String(error)+' '+JSON.stringify({values:Object.fromEntries([...keys,'showNeighborCount'].map(key=>[key,p.settings[key]])),work,bulkCalls,notices:[...tab.containerEl.ownerDocument.querySelectorAll('.notice')].map(el=>el.textContent)}));}
      check(work.save===1,'Native bulk must save once');check(nativeButton(false).disabled,'Native no-op remains enabled');
      app.setting.close();await workspace.revealLeaf(host);await act(host,'view.visibility.open');
      await until(()=>root(host).ownerDocument.querySelector('.kplex-visibility-bulk-buttons'),'Views and lenses controls missing');
      const buttons=()=>root(host).ownerDocument.querySelectorAll('.kplex-visibility-bulk-buttons button');await click(buttons()[0]);
      await until(()=>keys.every(key=>p.settings[key])&&p.settings.renderSiblings,'React Enable all did not settle');check(!p.settings.showNeighborCount,'Lenses changed native-only gate-count flag');check(work.save===2,'React bulk must save once');
      check(JSON.stringify(p.settings.excludeFilepaths)===excluded&&JSON.stringify(p.settings.graphLenses)===lenses,'Bulk changed filters/lenses');
      check(JSON.stringify([center(host),center(other)])===JSON.stringify(beforeCenters),'Bulk changed navigation');
      const acquisitionAfter=p.index.getSourceAcquisitionCounters(),semanticAfter=p.index.getSemanticPreparationDiagnostics();
      check(work.source===0&&work.semantic===0,'Visibility requested index/source work: '+JSON.stringify({work,sourceCalls,acquisitionBefore,acquisitionAfter,semanticBefore,semanticAfter}));
      check(acquisitionBefore.vaultReads===acquisitionAfter.vaultReads&&acquisitionBefore.parses===acquisitionAfter.parses
        &&semanticBefore.requested===semanticAfter.requested&&semanticBefore.dependencyVisits===semanticAfter.dependencyVisits&&semanticBefore.fullBuilds===semanticAfter.fullBuilds,'Visibility prepared actual sources or rebuilt semantics');
      const disk=JSON.parse(await app.vault.adapter.read(p.manifest.dir+'/data.json'));check(keys.every(key=>disk[key])&&disk.renderSiblings&&disk.unknown261.retain,'Bulk persistence missing');
      cases.push({native:true,react:true,operations:2,work,independentCenters:true,unrelatedPreserved:true,persisted:true});
      for(const restore of restores.reverse())restore();restores.length=0;
      const previous=p;await app.plugins.disablePlugin('k-plex');await until(()=>!app.plugins.plugins['k-plex'],'Native plugin did not unload');
      await app.plugins.enablePlugin('k-plex');await until(()=>app.plugins.plugins['k-plex']&&app.plugins.plugins['k-plex']!==previous&&app.plugins.plugins['k-plex'].settings,'Native plugin did not reload');
      p=app.plugins.plugins['k-plex'];check(keys.every(key=>p.settings[key])&&p.settings.renderSiblings&&!p.settings.showNeighborCount&&p.settings.unknown261.retain,'Actual reload did not preserve bulk values');
      check(JSON.stringify(p.settings.excludeFilepaths)===excluded&&JSON.stringify(p.settings.graphLenses)===lenses,'Reload changed unrelated settings');cases.push({pluginReload:true});
    }
    if(c.lane==='completion') {
      let modal;
      restores.push(()=>modal?.close());
      /** Reopen the real production dialog rather than replacing its persistence or React owner. */
      const open=async(link=false)=>{
        modal?.close();
        modal=p.openRelationModal({mode:'create',origin:p.index.get(a.path),semanticRole:'child',...(link?{fixedTarget:p.index.get(b.path)}:{})});
        await until(()=>modal.contentEl.querySelector('.kplex-add-related-completion select'),'Completion dialog missing');
        return modal.contentEl;
      };
      /** Deliver an operation selection through its actual React change handler. */
      const select=async(value)=>{
        const element=modal.contentEl.querySelector('.kplex-add-related-completion select'),realm=element.ownerDocument.defaultView;
        element.value=value;element.dispatchEvent(new realm.Event('change',{bubbles:true}));
        await until(()=>element.value===value,'Completion choice did not settle');await p.settingsWriteQueue;
      };
      /** Change only the actual composer query, preserving native focus and React input tracking. */
      const type=async(value)=>{
        const element=modal.contentEl.querySelector('.kplex-add-related-note-search input'),realm=element.ownerDocument.defaultView;
        element.focus();Object.getOwnPropertyDescriptor(realm.HTMLInputElement.prototype,'value').set.call(element,value);
        element.dispatchEvent(new realm.Event('input',{bubbles:true}));
        await wait(50);
      };
      const value=()=>modal.contentEl.querySelector('.kplex-add-related-completion select').value;
      await open();await select('editor-maximized');
      await until(()=>p.settings.newNodeAfterSaving==='editor-maximized','Creation choice not remembered');
      await open(true);await select('another');
      await until(()=>p.settings.linkAfterSaving==='another','Link choice not remembered');
      check(p.settings.newNodeAfterSaving==='editor-maximized','Link changed creation preference');
      await type('New note');await until(()=>value()==='editor-maximized','Creation choice lost when clearing target');
      await type('https://example.org/');await until(()=>value()==='another','Web link did not restore link choice');
      await type('New note');await until(()=>value()==='editor-maximized','Web link changed creation preference');
      modal.close();modal=null;
      p.settings.completion261Future={keep:true};await p.saveSettings(false,false);await p.settingsWriteQueue;
      const disk=JSON.parse(await app.vault.adapter.read(p.manifest.dir+'/data.json'));
      check(disk.newNodeAfterSaving==='editor-maximized'&&disk.linkAfterSaving==='another'&&disk.completion261Future.keep,'Independent choices not durable');
      cases.push({creation:'editor-maximized',link:'another',switching:true,webLink:true,durable:true});
      const previous=p;await app.plugins.disablePlugin('k-plex');await until(()=>!app.plugins.plugins['k-plex'],'Completion plugin did not unload');
      await app.plugins.enablePlugin('k-plex');await until(()=>app.plugins.plugins['k-plex']&&app.plugins.plugins['k-plex']!==previous&&app.plugins.plugins['k-plex'].settings,'Completion plugin did not reload');
      p=app.plugins.plugins['k-plex'];await until(()=>p.index?.get(a.path)&&p.index?.get(b.path),'Reloaded fixture index missing',45000);
      check(p.settings.newNodeAfterSaving==='editor-maximized'&&p.settings.linkAfterSaving==='another'&&p.settings.completion261Future.keep,'Reload lost independent choices or unknown data');
      await open();check(value()==='editor-maximized','Reopened create dialog lost selection');
      await open(true);check(value()==='another','Reopened link dialog lost selection');modal.close();modal=null;
      cases.push({pluginReload:true,reopenedCreation:true,reopenedLink:true,unknownPreserved:true});
    }
    c.progress={lane:c.lane,phase:'complete',cases};if(copyFailure)throw Error('Embedded clipboard acceptance failed after independent cases: '+String(copyFailure));return c.progress;
  }catch(error){failure=error;throw error;}
  finally {
    const clean=async(label,action)=>{try{await action();cleanup.push({label,status:'passed'})}catch(error){cleanup.push({label,status:'failed',error:String(error)})}};
    for(const restore of restores.reverse())await clean('restore-observer',restore);
    await clean('dismiss-ui',()=>{p.dismissKplexMenu();if(app.setting.isOpen)app.setting.close()});
    for(const leaf of leaves.reverse())if(workspace.getLeafById(leaf.id)===leaf)await clean('detach-owned-leaf',()=>leaf.detach());
    for(const release of releases.reverse())await clean('release-demand',release);
    await clean('restore-live-settings',async()=>{p.settings=settings;p.savedSettingsPolicy=policy;await p.persistSettingsSnapshot();p.index.notifyPresentation()});
    await clean('restore-workspace',()=>workspace.changeLayout(layout));await clean('restore-document-sessions',()=>c.sessions(p).restore(savedSessions));
    for(const file of owned.reverse())if(app.vault.getFileByPath(file.path)===file)await clean('remove-owned-file',()=>app.vault.delete(file,true));
    for(const dir of folders.reverse())if(app.vault.getFolderByPath(dir.path)===dir&&!dir.children.length)await clean('remove-owned-folder',()=>app.vault.delete(dir,true));
    await clean('restore-link-preferences',()=>{for(const [key,value]of Object.entries(originalPrefs))app.vault.setConfig(key,value)});
    if(clipboardBackup)await clean('restore-clipboard',()=>{const {clipboard,data}=clipboardBackup;clipboard.clear();if(Object.keys(data).length)clipboard.write(data);if('text'in data)check(clipboard.readText()===data.text,'Clipboard text restoration differs');if('html'in data)check(clipboard.readHTML()===data.html,'Clipboard HTML restoration differs')});
    await clean('drain-settings',()=>p.settingsWriteQueue);await wait(1200);
    await clean('restore-config-bytes',async()=>{await app.vault.adapter.write(p.manifest.dir+'/data.json',c.originalData);if(c.originalApp!==null)await app.vault.adapter.write(app.vault.configDir+'/app.json',c.originalApp);await app.vault.adapter.write(app.vault.configDir+'/community-plugins.json',c.originalEnabled)});
    await clean('restore-window',()=>{win.webContents.setBackgroundThrottling(wasThrottled);win.setBounds(bounds);if(maximized)win.maximize();if(minimized)win.minimize()});
    c.progress={...c.progress,cleanup};const failed=cleanup.filter(item=>item.status==='failed');if(failed.length)throw Error((failure?String(failure)+'; ':'')+'Cleanup failed: '+JSON.stringify(failed));
  }
}

const lane=process.env.KPLEX_BATCH_261_LANE;
if(!['sections','copy','visibility','completion'].includes(lane))throw Error('Set KPLEX_BATCH_261_LANE to sections, copy, visibility or completion');
if(process.env.KPLEX_TEST_VAULT_NAME!=='kplex-test-small')throw Error('Explicit Small fixture required');
const config=process.env.KPLEX_TEST_CONFIG_DIR,appPath=join(config,'app.json');
const definitions='c.lane='+JSON.stringify(lane)+';c.osEmbedded='+JSON.stringify(process.env.KPLEX_BATCH_261_OS_EMBEDDED==='true')+';c.copyEdgesOnly='+JSON.stringify(process.env.KPLEX_BATCH_261_COPY_EDGES_ONLY==='true')+';c.sessions='+nativeDocumentSessions.toString()+';c.originalData='+JSON.stringify(readFileSync(join(config,'plugins/k-plex/data.json'),'utf8'))+';c.originalEnabled='+JSON.stringify(readFileSync(join(config,'community-plugins.json'),'utf8'))+';c.originalApp='+JSON.stringify(existsSync(appPath)?readFileSync(appPath,'utf8'):null)+';';
await runControlledProbe('navigation-copy-visibility-261-'+lane,scenario,definitions,
  ['src/main.ts','src/ui/PlexGraph.tsx','src/ui/PlexFilter.tsx','src/ui/NewRelatedNoteModal.ts','src/settings.ts','src/adapters/obsidian/nodeLinkClipboard.ts','src/core/plex/contentVisibility.ts'],{maximumMs:300000});
