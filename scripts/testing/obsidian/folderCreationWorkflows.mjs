/**
 * Focused creation/materialization scenarios injected into actionWorkflows.mjs's existing native
 * controller. Reuses its real composer, action routing, trusted keys and independent cleanup.
 * This module performs no transport or filesystem work and never runs outside that explicit owner.
 */
export async function runFolderCreationWorkflows(h) {
  const {c,p,check,delay,until,scenario,input,key,close,configureComposer,dispatch,center,focus,root,nativeWindow,pickNode}=h;
  const owner=root(c.host).ownerDocument, view=owner.defaultView;
  const mod=require('process').platform==='darwin'?'meta':'control';
  const folderInput=element=>element.querySelector('.kplex-folder-path-input input');
  const nameInput=element=>element.querySelector('.kplex-add-related-note-search input');
  const aliasInput=element=>element.querySelector('.kplex-create-alias-input');
  const path=(folder,name)=>`${folder?folder+'/':''}${name}.md`;
  const nativePath=name=>`${c.folder}/${name}`;
  const defaultGhost=`Ghost-default-${c.runToken}`, chosenGhost=`Ghost-chosen-${c.runToken}`;
  const quick=`Quick-${c.runToken}`, nested=`${c.folder}/Moved notes')`,createdFolder=c.folder+'/Created notes';
  const readableFolder=c.folder+'/08 About a long folder name with enough descriptive text to verify that the full destination remains readable in a shared suggestion';
  c.folderCreation={counts:[],placeholderGestures:[],zeroWork:[]};
  c.acceptedWrites=new Set();
  for(const method of ['createNewRelatedFileForOrigin','createNewNodeInFolder','linkNewRelatedFile','createPlaceholderRelatedPage','materializeGhostPage']){
    const original=p[method];check(typeof original==='function','Native creation owner absent: '+method);
    p[method]=function(...args){const task=original.apply(this,args);c.acceptedWrites.add(task);return Promise.resolve(task).finally(()=>c.acceptedWrites.delete(task))};
    let live=true;c.wrappers.push(()=>{if(live){live=false;p[method]=original}});
  }

  /** Keep body/source activity outside typing/cancel intervals; never flush, force a build or change policies. */
  const idle=async()=>{
    await until(()=>{
      const a=p.index.sourceAcquisition,s=a.getActivityState(),cache=p.index.indexedDb.getActivityState(),active=p.index.getWorkPriorityDiagnostics().active;
      return !p.isStartupInitializing()&&!p.index.building&&!p.rebuildTask&&!p.index.hasActiveSemanticPreparation()
        &&!p.index.hasPendingSemanticPreparation()&&!s.sourceActive&&!s.knownImpactTasks&&!s.repoWrites
        &&(!a.enabled||!s.pendingKnown)&&!cache.queuedBodies&&!cache.writerActive&&p.index.snapshotPersistTimer===null
        &&Object.values(active).every(value=>value===0);
    },'Natural fixture/source preparation did not drain',90000);
    await delay(200);
  };
  /** Own only native creations beneath our unique folder or an explicitly predicted new-file destination. */
  const allowedPaths=new Set([nested,createdFolder,c.folder+'/Never-created',path(c.folder,defaultGhost),path(nested,chosenGhost)]);
  const createRef=app.vault.on('create',file=>{
    if(allowedPaths.has(file.path))c.owned.push(file.path);
  });
  let observing=true;
  c.wrappers.push(()=>{if(observing){observing=false;app.vault.offref(createRef)}});

  /** Opening the actual action retains its surface generation and normal completion policy. */
  const composer=async(name)=>{
    await center(c.a.path);focus(c.host);
    const outcome=await dispatch('relationship.create-center.child');check(outcome.status==='opened','Add-node action did not open');
    const element=await configureComposer('child');
    await until(()=>folderInput(element),'Shared folder field did not mount');
    input(nameInput(element),name);await delay(50);return element;
  };
  /** Native Escape consumes the current suggestion before the caller deliberately leaves that field. */
  const dismissSuggestions=async element=>{
    if(element.getAttribute('aria-expanded')==='true'){element.focus();await key('Escape');}
  };
  /** Explicitly leave the folder widget before submitting; one Enter never both chooses a folder and creates a note. */
  const setFolder=async(element,folder)=>{
    const field=folderInput(element);field.focus();input(field,folder||'/');await delay(50);
    await dismissSuggestions(field);nameInput(element).focus();await delay(30);
  };
  /** Accept only the actual Markdown button, preserving single-flight and native validation. */
  const createMarkdown=async(element)=>{
    const button=[...element.querySelectorAll('.kplex-add-related-type-button')].find(item=>item.querySelector('.lucide-text-initial'));
    check(button&&!button.disabled,'Real Markdown create control unavailable');button.click();
    await until(()=>!element.isConnected,'Markdown creation did not complete',30000);
  };
  /** Use the existing placeholder action; its canonical writer supplies alias and source semantics. */
  const createGhost=async(name,alias)=>{
    const element=await composer(name);await setFolder(element,c.folder);
    if(alias)input(aliasInput(element),alias);
    const button=[...element.querySelectorAll('.kplex-add-related-type-button')].find(item=>item.querySelector('.lucide-circle-dashed'));
    check(button&&!button.disabled,'Placeholder control unavailable');button.click();
    await until(()=>!element.isConnected,'Placeholder save did not complete',30000);
    const expected=`[[${nativePath(name)}|${alias||name}]]`;
    check((await app.vault.read(c.a)).includes(expected),'Saved placeholder path/default alias differs');
    check(!app.vault.getFileByPath(path(c.folder,name)),'Placeholder manufactured a real file');
    return expected;
  };
  /** Count actual resource-owner calls only during an already-drained presentation interval. */
  const noWork=async(id,action)=>{
    await idle();const work={reads:0,parses:0,acquisitions:0,builds:0,semantics:0,writes:0,snapshotWrites:0};
    const stops=[],unexpectedCalls=[];
    for(const [object,method,counter]of [[app.vault,'read','reads'],[app.vault,'cachedRead','reads'],
      [p.index.sourceAcquisition,'parse','parses'],[p.index.sourceAcquisition,'acquire','acquisitions'],
      [p.index,'rebuild','builds'],[p.index,'rebuildProgressively','builds'],[p.index,'refreshSemanticSettings','semantics'],
      [p.index.indexedDb,'writeSnapshot','snapshotWrites'],
      [app.vault,'create','writes'],[app.vault,'createFolder','writes'],[app.fileManager,'processFrontMatter','writes']]){
      check(typeof object[method]==='function','Counter owner absent: '+method);
      const original=object[method];object[method]=function(...args){work[counter]++;unexpectedCalls.push({method,stack:new Error().stack});return original.apply(this,args)};
      let live=true;const stop=()=>{if(live){live=false;object[method]=original}};stops.push(stop);c.wrappers.push(stop);
    }
    try{await action();await delay(150);check(!p.index.building&&!p.rebuildTask&&!p.index.hasActiveSemanticPreparation()
      &&!p.index.hasPendingSemanticPreparation()&&p.index.snapshotPersistTimer===null,'Typing/cancel queued later index work')}
    finally{for(const stop of stops.reverse())stop()}
    c.folderCreation.zeroWork.push({id,work,...(unexpectedCalls.length?{unexpectedCalls}:{})});check(Object.values(work).every(value=>value===0),'Typing/cancel caused resource work '+JSON.stringify(work));
    return work;
  };
  /** Trusted Electron double-click reaches the actual node, preserving modifiers and reporting trust. */
  const materializationGesture=async(name,modified)=>{
    const destination=nativePath(name);
    // Ordinary first-click navigation already moves noncentral tiles in the baseline.
    // Keep that known transition hazard separate from default-folder materialization;
    // the new modifier gesture below deliberately exercises the noncentral occurrence.
    await center(modified?c.a.path:destination);focus(c.host);
    if(modified)await pickNode(name);focus(c.host);
    await until(()=>root(c.host).querySelector(`.kplex-thought[data-kplex-path="${CSS.escape(destination)}"]`),'Rendered placeholder missing');
    let target=root(c.host).querySelector(`.kplex-thought[data-kplex-path="${CSS.escape(destination)}"]`);
    // The existing visible-node picker reveals overflow occurrences through the graph camera.
    // Native scrollIntoView is incorrect for transformed canvas text and may scroll the workspace.
    await until(()=>{target=root(c.host).querySelector(`.kplex-thought[data-kplex-path="${CSS.escape(destination)}"]`);if(!target)return false;
      const rect=target.getBoundingClientRect(),hit=owner.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2),transitioning=Boolean(root(c.host).querySelector('.is-scene-transitioning'));
      c.folderCreation.revealPending={destination,connected:target.isConnected,rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},hitClass:hit?.className,hitPath:hit?.closest('[data-kplex-path]')?.dataset.kplexPath,transitioning,activeLeaf:c.host===app.workspace.activeLeaf,hostRect:root(c.host).getBoundingClientRect().toJSON()};
      return hit?.closest('[data-kplex-path]')===target&&!transitioning},'Revealed placeholder does not own a native pointer target');await delay(80);
    const rect=target.getBoundingClientRect(),x=Math.round(rect.left+rect.width/2),y=Math.round(rect.top+rect.height/2),modifiers=modified?[mod]:[];
    let trusted=null,modifier=null;
    const trace={destination,modified,point:{x,y},events:[]};c.folderCreation.gesturePending=trace;
    const priorDialogs=new Set(owner.querySelectorAll('.modal'));
    const observed=event=>{const hit=event.target.closest?.('[data-kplex-path]');if(trace.events.length<12)trace.events.push({type:event.type,path:hit?.dataset.kplexPath,trusted:event.isTrusted,detail:event.detail,point:{x:event.clientX,y:event.clientY},class:event.target.className});if(event.type===(modified?'click':'dblclick')&&hit?.dataset.kplexPath===destination){trusted=event.isTrusted;modifier=Boolean(event.metaKey||event.ctrlKey)}};
    for(const type of ['mousedown','mouseup','click'])owner.addEventListener(type,observed,true);
    owner.addEventListener('dblclick',observed,true);
    try{
      nativeWindow.webContents.sendInputEvent({type:'mouseMove',x,y,modifiers});
      for(const clickCount of (modified?[1]:[1,2])){
        nativeWindow.webContents.sendInputEvent({type:'mouseDown',x,y,button:'left',clickCount,modifiers});
        nativeWindow.webContents.sendInputEvent({type:'mouseUp',x,y,button:'left',clickCount,modifiers});await delay(50);
      }
      await until(()=>trusted!==null,'Native materialization gesture did not reach the placeholder');
      check(trusted&&modifier===modified,'Materialization gesture trust/modifier mismatch');
      c.folderCreation.placeholderGestures.push({modified,trusted,modifier});
    }finally{owner.removeEventListener('dblclick',observed,true);for(const type of ['mousedown','mouseup','click'])owner.removeEventListener(type,observed,true);
      for(const dialog of owner.querySelectorAll('.modal'))if(!priorDialogs.has(dialog))c.dialogs.add(dialog)}
  };
  /** Track only the new native materialization dialog, never an unrelated modal. */
  const materializationDialog=async()=>{
    await until(()=>[...owner.querySelectorAll('.modal')].some(element=>!element.classList.contains('kplex-add-related-modal')&&folderInput(element)),'Materialization folder prompt missing');
    const element=[...owner.querySelectorAll('.modal')].find(element=>!element.classList.contains('kplex-add-related-modal')&&folderInput(element));
    c.dialogs.add(element);await delay(50);
    check(folderInput(element).getAttribute('aria-expanded')==='false'&&!owner.querySelector('.kplex-folder-path-results'),'Prefilled materialization opened folder suggestions before editing');
    return element;
  };
  /** Choose the existing real Markdown action by localized button text. */
  const confirmMaterialization=async(element)=>{
    const button=[...element.querySelectorAll('button')].find(item=>item.textContent===p.translator('common.markdown'));
    check(button&&!button.disabled,'Materialization Markdown action missing');button.click();
    await until(()=>!element.isConnected,'Materialization did not finish',30000);
  };

  await scenario('shared-folder-completion-control',async()=>{
    const saved=p.settings.editNewNodeAfterCreate;
    try{
      for(const configured of [false,true]){
        p.settings.editNewNodeAfterCreate=configured;await p.saveSettings(false,false);
        await center('folder:'+c.folder);focus(c.host);
        const outcome=await dispatch('relationship.create-center.child');check(outcome.status==='opened','Folder creation action did not open');
        await until(()=>owner.querySelector('.kplex-create-folder-note-modal select[data-kplex-control="creation-completion"]'),'Shared folder completion did not mount');
        const element=owner.querySelector('.kplex-create-folder-note-modal');c.dialogs.add(element);
        const select=element.querySelector('select[data-kplex-control="creation-completion"]'),toggle=element.querySelector('.checkbox-container');
        c.folderCreation.nativeToggleSetter=[...p.actionDialogs.keys()].find(dialog=>dialog.modalEl===element)?.editToggle?.setValue.toString();
        check(select.value===(configured?'edit':'return')&&![...select.options].some(option=>option.value==='configured'),'Folder completion did not resolve its actual configured outcome');
        check(select.closest('.kplex-creation-completion')?.querySelector('.kplex-creation-completion-caption')?.textContent===p.translator('addRelated.completionMode'),'Shared caption/control absent');
        check(select.classList.contains('dropdown')&&view.getComputedStyle(select).height===view.getComputedStyle(owner.body).getPropertyValue('--input-height').trim(),'Completion does not use native control height');
        const row=element.querySelector('.kplex-creation-completion-row'),caption=row.querySelector('.kplex-creation-completion-caption');
        for(const width of [640,240]){
          row.style.setProperty('width',width+'px');await delay(50);
          const bounds=row.getBoundingClientRect(),labelBounds=caption.getBoundingClientRect(),controlBounds=select.getBoundingClientRect();
          check(controlBounds.right<=bounds.right+1&&controlBounds.left>=bounds.left-1,'Completion overflows its available row');
          check(labelBounds.right<=controlBounds.left||labelBounds.bottom<=controlBounds.top,'Completion caption overlaps its control');
          check(view.getComputedStyle(caption).fontSize===view.getComputedStyle(select).fontSize,'Completion caption and control typography differ');
        }
        row.style.removeProperty('width');
        await noWork('folder-completion-choices-'+configured,async()=>{
          for(const choice of ['another','follow','edit','return']){
            select.value=choice;select.dispatchEvent(new view.Event('change',{bubbles:true}));
            await until(()=>select.value===choice&&toggle?.classList.contains('is-enabled')===(choice==='edit'),'Folder outcome/toggle did not stay synchronized');
            check(p.settings.editNewNodeAfterCreate===configured,'Local choice changed the global editing preference');
          }
        });
        check(toggle,'Native editing toggle absent');toggle.click();
        await until(()=>select.value==='edit'&&p.settings.editNewNodeAfterCreate,'Editing toggle did not update the actual completion');
        await p.settingsWriteQueue;
        toggle.click();await until(()=>select.value==='return'&&!p.settings.editNewNodeAfterCreate,'Disabling editing did not restore Return');
        await p.settingsWriteQueue;
        await close(element);check(!element.querySelector('select'),'Completion root survived native modal cleanup');
      }
    }finally{p.settings.editNewNodeAfterCreate=saved;await p.saveSettings(false,false)}
    await center(c.a.path);
    return{actualNativeFolderModal:true,configuredReturnAndEdit:true,sharedCaptionAndSelector:true,nativeSizing:true,allExplicitChoices:true,localChoicesDoNotSave:true,toggleSynchronization:true,cancelNoNoteWrite:true};
  });

  await scenario('folder-child-matching-parent-basename',async()=>{
    const destination=c.folder+'/B',name='test file',parentPath=path(c.folder,name),childPath=path(destination,name);
    allowedPaths.add(destination);allowedPaths.add(parentPath);allowedPaths.add(childPath);
    await app.vault.createFolder(destination);c.owned.push(destination);
    const parent=await app.vault.create(parentPath,'Owned parent note must remain unchanged.\n');c.owned.push(parentPath);
    await until(()=>p.index.get('folder:'+destination),'Nested physical folder graph node missing');
    await center('folder:'+destination);focus(c.host);
    check((await dispatch('relationship.create-center.child')).status==='opened','Nested folder action unavailable');
    await until(()=>owner.querySelector('.kplex-create-folder-note-modal'),'Nested folder dialog absent');
    const element=owner.querySelector('.kplex-create-folder-note-modal');c.dialogs.add(element);
    const field=element.querySelector('.kplex-create-folder-note-name-setting input');input(field,name);
    const markdownButton=modal=>modal.querySelector('button:has(svg.lucide-file-text)');
    const markdown=()=>markdownButton(element);
    await until(()=>markdown()&&!markdown().disabled,'Parent basename incorrectly disables nested-folder creation');
    field.focus();await key('Enter',[mod]);
    await until(()=>!element.isConnected&&app.vault.getFileByPath(childPath),'Keyboard submit did not create the independent nested note',30000);
    check(app.vault.getFileByPath(parentPath)===parent&&(await app.vault.read(parent))==='Owned parent note must remain unchanged.\n','Nested creation changed the existing parent note');
    focus(c.host);check((await dispatch('relationship.create-center.child')).status==='opened','Exact-collision folder action unavailable');
    await until(()=>owner.querySelector('.kplex-create-folder-note-modal'),'Collision dialog absent');
    const collision=owner.querySelector('.kplex-create-folder-note-modal');c.dialogs.add(collision);
    input(collision.querySelector('.kplex-create-folder-note-name-setting input'),name);
    check(markdownButton(collision)?.disabled,'Exact destination duplicate is not disabled');
    await close(collision);
    await center(c.a.path);
    for(const item of [app.vault.getFileByPath(childPath),parent,app.vault.getFolderByPath(destination)])if(item)await app.vault.delete(item,true);
    return{actualFolderModal:true,parentBasenameAllowed:true,keyboardCreate:true,exactDestinationBlocked:true,parentUnchanged:true,boundedOwnedFixtureRemoved:true};
  });

  await scenario('composer-direction-footer-and-lazy-note-search',async()=>{
    const element=await composer('');await idle();
    const direction=element.querySelector('.kplex-add-related-role-select'),ontology=element.querySelector('.kplex-add-related-ontology-search input');
    const footer=element.querySelector('.kplex-add-related-footer'),completion=footer?.querySelector('select');
    check(direction.parentElement===ontology.closest('.kplex-search-shell').parentElement,'Direction is not beside ontology');
    check(!element.querySelector('.modal-title select'),'Direction remains in the draggable title');
    check(footer===element.querySelector('.kplex-add-related-form').lastElementChild&&footer.contains(element.querySelector('.kplex-create-edit-toggle')),'Footer controls are not together at the bottom');
    check(![...completion.options].some(option=>option.value==='configured')&&completion.value==='return','Completion still shows opaque configured behavior');
    const before=JSON.stringify(p.settings.hierarchy),calls=[],original=p.index.search;
    p.index.search=function(...args){calls.push({queryLength:args[0].length,limit:args[1],scope:args[2]});return original.apply(this,args)};
    let live=true;const restore=()=>{if(live){live=false;p.index.search=original}};c.wrappers.push(restore);
    const change=(field,value)=>{field.value=value;field.dispatchEvent(new view.Event('change',{bubbles:true}))};
    let work;
    try{work=await noWork('composer-direction-and-note-search',async()=>{
      change(direction,'all');await until(()=>direction.value==='all','All direction not selected');
      const all=p.allOntologyFields(),parent=p.ontologyFieldsForRole('parent')[0];check(parent,'Parent fixture field missing');
      element.querySelector('.kplex-add-related-ontology-search .kplex-fuzzy-disclosure').click();
      await until(()=>owner.querySelector('.kplex-fuzzy-floating-results button'),'All ontology list missing');
      const rows=[...owner.querySelectorAll('.kplex-fuzzy-floating-results button')];
      check(new Set(rows.map(row=>row.textContent)).size===new Set(all.map(field=>field.toLocaleLowerCase())).size,'All ontology field count differs');
      const row=rows.find(item=>item.textContent===parent);check(row,'All omitted parent field');row.click();await delay(30);
      check(ontology.value===parent&&direction.value==='all','All selection changed filter or lost field');
      check(calls.length===0,'Ontology-only edits ranked note vocabulary');
      nameInput(element).focus();input(nameInput(element),'README');await delay(60);
      check(calls.length===1&&calls[0].scope==='vault-files'&&calls[0].limit===48,'Note input did not use one bounded physical catalog query');
      input(aliasInput(element),'Alias');await delay(30);
      check(calls.length===1,'Alias-only edit reranked note vocabulary');
      await dismissSuggestions(nameInput(element));
      await close(element);
    })}finally{restore()}
    check(JSON.stringify(p.settings.hierarchy)===before,'All browsing reclassified ontology');
    return{allDirections:true,footer:true,queries:calls,work};
  });

  await scenario('folders-quick-name-only',async()=>{
    const expected=p.newRelatedNoteFolder(p.index.get(c.a.path),quick,'markdown');
    allowedPaths.add(path(expected,quick));const element=await composer(quick);
    check(folderInput(element).value===(expected||'/'),'Computed folder was not prefilled');
    check(owner.activeElement===nameInput(element),'Folder field stole quick-create focus');
    nameInput(element).focus();await dismissSuggestions(nameInput(element));await key('Enter',[mod]);
    await until(()=>!element.isConnected&&app.vault.getFileByPath(path(expected,quick)),'Quick name-only modifier Enter did not save',30000);
    return{computedFolder:expected||'/',saved:true,trustedModifierEnter:true};
  });

  await scenario('folders-existing-root-cancel-no-work',async()=>{
    const beforeFiles=app.vault.getFiles().map(file=>file.path).sort(),beforeBody=await app.vault.read(c.a);
    const openingSourceBefore=p.index.getSourceAcquisitionCounters();
    // Normal navigation/composer opening can prepare its current neighborhood. Keep that work
    // visible separately; only subsequent folder typing, selection and Cancel claim zero work.
    const element=await composer('Cancelled-'+c.runToken),field=folderInput(element);
    await idle();const openingSourceAfter=p.index.getSourceAcquisitionCounters();
    const work=await noWork('existing-root-and-cancel',async()=>{
      field.focus();input(field,c.folder);
      await until(()=>field.getAttribute('aria-expanded')==='true','Existing folder suggestions absent');
      await key('Enter');check(field.value===c.folder,'Folder Enter did not choose existing folder');
      check(element.isConnected,'Choosing a folder also submitted the note');
      field.focus();input(field,'/');await until(()=>field.getAttribute('aria-expanded')==='true','Root suggestion absent');
      await key('Enter');check(field.value==='/','Root suggestion did not select vault root');
      await setFolder(element,c.folder+'/Never-created');await close(element);
    });
    check(JSON.stringify(app.vault.getFiles().map(file=>file.path).sort())===JSON.stringify(beforeFiles),'Cancel created a file');
    check(await app.vault.read(c.a)===beforeBody&&!app.vault.getFolderByPath(c.folder+'/Never-created'),'Cancel changed vault data');
    return{existingFolder:true,root:true,cancelNoWrite:true,openingSourceBefore,openingSourceAfter,work};
  });

  await scenario('folders-readable-partial-path-suggestions',async()=>{
    const longFolder=readableFolder;
    allowedPaths.add(longFolder);await app.vault.createFolder(longFolder);
    const element=await composer('Folder-visual-'+c.runToken),field=folderInput(element);
    field.focus();input(field,'/08');
    await until(()=>[...owner.querySelectorAll('.kplex-folder-path-results .kplex-search-result')].some(item=>item.textContent.includes(longFolder)),'Leading slash partial query failed to find an existing folder');
    const list=owner.querySelector('.kplex-folder-path-results'),item=[...list.querySelectorAll('.kplex-search-result')].find(row=>row.textContent.includes(longFolder));
    const bounds=list.getBoundingClientRect(),inputBounds=field.getBoundingClientRect(),text=item.querySelector('span'),style=view.getComputedStyle(text);
    check(!element.querySelector('.kplex-folder-path-input .kplex-search-icon,.kplex-folder-path-input .kplex-search-disclosure'),'Folder field retained its unnecessary icon or disclosure');
    check(bounds.width>=Math.min(550,view.innerWidth-32),'Folder suggestions still render as a narrow column');
    check(style.textOverflow!=='ellipsis'&&style.whiteSpace!=='nowrap','Long folder destinations are truncated');
    check(inputBounds.width>element.getBoundingClientRect().width*0.65,'Folder input does not use the dialog width');
    await dismissSuggestions(field);nameInput(element).focus();await close(element);return{leadingSlashPartialQuery:true,fullPath:longFolder,width:bounds.width,wrapped:true};
  });

  await scenario('folders-new-path-duplicate-basename',async()=>{
    allowedPaths.add(path(createdFolder,quick));
    const element=await composer(quick);await setFolder(element,createdFolder);await createMarkdown(element);
    check(app.vault.getFileByPath(path(createdFolder,quick)),'Typed new folder was not created on commit');
    check(c.created.filter(file=>file.basename===quick).length===2,'Equal basenames in separate folders were merged or rejected');
    return{newFolder:true,matchingBasenames:2};
  });

  await scenario('folders-placeholder-path-and-alias',async()=>{
    const first=await createGhost(defaultGhost),second=await createGhost(chosenGhost,'Friendly placeholder');
    return{defaultAlias:first,explicitAlias:second,physicalFilesCreated:0};
  });

  await scenario('folders-failed-placeholder-write',async()=>{
    await idle();const before=await app.vault.read(c.a),name='Failed-'+c.runToken,destination=nativePath(name);
    const element=await composer(name);await setFolder(element,c.folder);
    const original=app.fileManager.processFrontMatter;let failures=0,live=true;
    const restore=()=>{if(live){live=false;app.fileManager.processFrontMatter=original}};c.wrappers.push(restore);
    app.fileManager.processFrontMatter=async function(file,...args){if(file===c.a){failures++;throw Error('Owned folder acceptance storage failure')}return original.call(this,file,...args)};
    try{
      const button=[...element.querySelectorAll('.kplex-add-related-type-button')].find(item=>item.querySelector('.lucide-circle-dashed'));
      check(button&&!button.disabled,'Failure-case placeholder button missing');button.click();
      await until(()=>failures===1&&!button.disabled,'Failed placeholder write did not return to editable state');
      check(element.isConnected&&!p.index.get(destination),'Failed write published a detached placeholder');
    }finally{restore();await close(element)}
    check(await app.vault.read(c.a)===before,'Failed placeholder writer changed original note');return{injectedFailures:failures,unchanged:true};
  });

  await scenario('folders-percent-literal-reference-isolation',async()=>{
    const stem=`Percent space-${c.runToken}`,old=nativePath(stem),twin=nativePath(stem.replace(' ','%20'));
    const target=path(createdFolder,stem);allowedPaths.add(target);
    const encode=value=>value.split('/').map(part=>encodeURIComponent(part)).join('/');
    const references=[`[[${old}|Space wiki]]`,`[[${twin}|Percent wiki]]`,
      `[Space markdown](${encode(old)})`,`[Percent markdown](${encode(twin)})`];
    await app.fileManager.processFrontMatter(c.a,frontmatter=>{
      frontmatter.PercentReferences=[`[[${old}|Space YAML]]`,`[[${twin}|Percent YAML]]`];
    });
    await app.vault.process(c.a,text=>text+'\n'+references.join('\n')+'\n');
    await until(()=>app.metadataCache.unresolvedLinks[c.a.path]?.[old]===3
      &&app.metadataCache.unresolvedLinks[c.a.path]?.[twin]===3,'Native percent twins did not remain distinct');
    await center(c.a.path);
    await until(()=>p.index.get(old)&&!p.index.get(old).file,'Mixed-reference placeholder missing');
    const before=await app.vault.read(c.a);
    await p.createGhostNote(p.index.get(old),true);const element=await materializationDialog();
    const field=folderInput(element);field.focus();input(field,createdFolder);await delay(50);await dismissSuggestions(field);
    await confirmMaterialization(element);
    const expected=before.replace(`[[${old}|Space YAML]]`,`[[${target}|Space YAML]]`)
      .replace(`[[${old}|Space wiki]]`,`[[${target}|Space wiki]]`)
      .replace(`[Space markdown](${encode(old)})`,`[Space markdown](${encode(target)})`);
    check(await app.vault.read(c.a)===expected,'Relocation changed a distinct percent-literal reference or surrounding bytes');
    await until(()=>app.metadataCache.resolvedLinks[c.a.path]?.[target]===3
      &&app.metadataCache.unresolvedLinks[c.a.path]?.[twin]===3,'Native resolution lost relocated or percent-literal references');
    return{nativeSpaceReferencesMoved:3,nativePercentLiteralReferencesPreserved:3,exactSourceBytes:true,actualFolderDialog:true};
  });

  await scenario('folders-ordinary-placeholder-open',async()=>{
    const withDrawingChoice=p.isExcalidrawAvailable();await materializationGesture(defaultGhost,false);
    if(withDrawingChoice){const element=await materializationDialog();check(folderInput(element).value===c.folder,'Ordinary choice lost placeholder metadata folder');
      check(folderInput(element).getAttribute('aria-expanded')!=='true','Ordinary materialization opened an unnecessary folder suggestion');
      await key('Enter',[mod]);await until(()=>!element.isConnected,'Ordinary materialization did not accept one Ctrl/Cmd+Enter',30000)}
    await until(()=>app.vault.getFileByPath(path(c.folder,defaultGhost)),'Ordinary placeholder was not materialized',30000);
    return{ordinaryFastPath:!withDrawingChoice,existingDrawingChoice:withDrawingChoice,metadataFolderPreserved:true,stationaryCentralOccurrence:true};
  });

  await scenario('folders-modifier-single-click-and-cancel',async()=>{
    await materializationGesture(chosenGhost,true);const element=await materializationDialog();
    check(folderInput(element).value===c.folder,'Modifier prompt lost calculated placeholder folder');
    const field=folderInput(element);field.focus();input(field,'/08');
    await until(()=>[...owner.querySelectorAll('.kplex-folder-path-results .kplex-search-result')].some(row=>row.textContent.includes(readableFolder)),'Materialization did not reuse folder partial matching');
    const option=[...owner.querySelectorAll('.kplex-folder-path-results .kplex-search-result')].find(row=>row.textContent.includes(readableFolder));
    const optionRect=option.getBoundingClientRect(),point={x:Math.round(optionRect.right-12),y:Math.round(optionRect.top+optionRect.height/2)};
    let trustedChoice=false;const chosen=event=>{trustedChoice=event.isTrusted};option.addEventListener('click',chosen,{once:true});
    try{for(const type of ['mouseDown','mouseUp'])nativeWindow.webContents.sendInputEvent({type,...point,button:'left',clickCount:1});
      await until(()=>field.value===readableFolder,'Native pointer did not select the full folder path');
    }finally{option.removeEventListener('click',chosen)}
    check(trustedChoice&&element.isConnected,'Choosing the portaled folder closed the creation dialog');
    check(field.getBoundingClientRect().width>element.getBoundingClientRect().width*0.65,'Materialization folder input is still narrow');
    field.focus();input(field,nested);await delay(50);await dismissSuggestions(field);
    await close(element);check(!app.vault.getFileByPath(path(nested,chosenGhost))&&!app.vault.getFileByPath(path(c.folder,chosenGhost)),'Cancelled materialization wrote a note');
    await materializationGesture(chosenGhost,true);const confirmed=await materializationDialog();
    const next=folderInput(confirmed);next.focus();input(next,nested);await delay(50);await dismissSuggestions(next);
    // A second, still-mounted Plex can last navigate to the same ghost while this creation
    // dialog belongs to the original center. Identity promotion must not broadcast navigation.
    const other=app.workspace.getLeaf('split');c.leaves.push(other);
    await other.setViewState({type:'k-plex-react-view',active:true});await other.view.waitUntilReady();
    await until(()=>[...p.actionSurfaceHosts].some(([,registration])=>registration.leaf===other),'Second Plex action surface missing');
    const otherId=[...p.actionSurfaceHosts].find(([,registration])=>registration.leaf===other)[0],ghost=p.index.get(nativePath(chosenGhost));
    const outcome=await p.actionManager.dispatch({id:'node.activate',source:'toolbar',surfaceId:otherId,target:{kind:'explicit',node:{identity:ghost.path,path:ghost.path,kind:'ghost'}}});
    check(outcome.status==='completed','Second Plex could not center the placeholder');
    await until(()=>root(other).querySelector('.kplex-role-center')?.dataset.kplexPath===ghost.path,'Second Plex ghost center missing');
    await confirmMaterialization(confirmed);await until(()=>app.vault.getFileByPath(path(nested,chosenGhost)),'Explicit materialization destination ignored',30000);
    check(root(c.host).querySelector('.kplex-role-center')?.dataset.kplexPath===c.a.path,'In-place creation changed the original Plex center');
    await until(()=>root(other).querySelector('.kplex-role-center')?.dataset.kplexPath===path(nested,chosenGhost),'Other Plex did not follow its own materialized identity');
    other.detach();focus(c.host);
    await center(c.a.path);const real=app.vault.getFileByPath(path(nested,chosenGhost));
    await until(()=>p.index.get(real.path)?.file===real,'Materialized page not canonical');
    const body=await app.vault.read(c.a);check(body.includes(`[[${real.path}|Friendly placeholder]]`),'Original source still points at the old placeholder after folder override');
    check(!p.index.get(nativePath(chosenGhost))?.file,'Old placeholder was incorrectly bound to another physical path');
    return{modifierPrompt:true,cancelNoWrite:true,sharedSuggester:true,trustedFolderChoice:true,newDestination:true,durableAliasRetargeted:true,centerPreserved:true,otherPlexIdentityPreserved:true};
  });
  await idle();
  check(app.vault.getFiles().filter(file=>c.owned.includes(file.path)).length<=6,'Focused fixture exceeded six notes');
  return{scenarios:c.scenarios,trustedNativeKeys:c.trustedKeys??0,createdFiles:c.created.length,folderCreation:c.folderCreation,
    restartExpectation:{origin:c.a.path,target:path(nested,chosenGhost),oldPath:nativePath(chosenGhost),alias:'Friendly placeholder'},
    limitations:['Trusted Electron desktop input only; physical keyboard, touch, macOS Option and screen readers remain separate.',
      'Creation legitimately writes notes and performs ordinary incremental reconciliation; zero-work claims cover only the isolated typing/cancel interval.']};
}

/** Reacquire the actual reloaded plugin and let normal visible-center demand prove durable relationship recovery. */
export async function verifyFolderCreationRestart(expected) {
  const c=window.__kplexActionWorkflows,p=app.plugins.plugins['k-plex'];
  if(!c?.folderCreationOnly||!p)throw Error('Owned folder acceptance/reloaded plugin missing');
  c.p=p;
  const until=async(predicate,message)=>{
    const end=Date.now()+90000;
    while(!predicate()){if(c.cancelled||Date.now()>end)throw Error(message);await new Promise(resolve=>window.setTimeout(resolve,50))}
  };
  await until(()=>!p.isStartupInitializing(),'Reloaded plugin did not initialize');
  const origin=app.vault.getFileByPath(expected.origin),target=app.vault.getFileByPath(expected.target);
  if(!origin||!target)throw Error('Owned restart files missing');
  const source=await app.vault.read(origin);
  if(!source.includes(`[[${target.path}|${expected.alias}]]`))throw Error('Restart source lost explicit destination/alias');
  await until(()=>app.metadataCache.resolvedLinks[origin.path]?.[target.path]>0,'Native Obsidian resolution lost the literal wiki special-character destination');
  await p.activateView();
  const opened=app.workspace.getLeavesOfType('k-plex-react-view')[0];
  if(!opened)throw Error('Restart did not open a Plex leaf');
  await opened.loadIfDeferred();await opened.view.waitUntilReady();
  await until(()=>opened.view.contentEl.querySelector('.kplex-plex'),'Restart Plex did not mount');
  await new Promise(resolve=>opened.view.contentEl.ownerDocument.defaultView.requestAnimationFrame(()=>opened.view.contentEl.ownerDocument.defaultView.requestAnimationFrame(resolve)));
  p.notifyNavigation(origin.path);
  await until(()=>app.workspace.getLeavesOfType('k-plex-react-view').some(leaf=>leaf.view.containerEl.querySelector(`.kplex-role-center[data-kplex-path="${CSS.escape(origin.path)}"]`)),'Restart did not render the owned center');
  await until(()=>{
    const page=p.index.get(origin.path);
    return page&&p.index.neighbours(page,'child').some(item=>item.page.file===target);
  },'Normal post-restart source reconciliation lost the materialized relationship');
  const leaves=app.workspace.getLeavesOfType('k-plex-react-view'),leaf=leaves.find(item=>item.view.containerEl.querySelector(`.kplex-role-center[data-kplex-path="${CSS.escape(origin.path)}"]`));
  if(leaf.view.containerEl.querySelector(`[data-kplex-path="${CSS.escape(expected.oldPath)}"]`))throw Error('Old placeholder reappeared after reload');
  // The host preview can expose the visible child before the normal requested-source owner
  // finishes its provenance. Await that actual declaration, never manufacture it with a build.
  await until(()=>p.index.evidenceBetween(origin.path,target.path).some(item=>item.declaredByPath===origin.path&&item.sourceKind==='frontmatter-ontology'),'Restart relationship lost source provenance');
  return{status:'passed',actualPluginReload:true,naturalVisibleCenterDemand:true,durableAlias:true,nativeObsidianResolution:true,oldPlaceholderAbsent:true,sourceProvenance:true};
}
