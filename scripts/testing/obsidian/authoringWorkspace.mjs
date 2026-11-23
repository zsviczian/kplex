/** Exact-artifact #302 characterizations and authoring acceptance in the approved disposable Small vault.
 * Scenarios own fixtures and native views; this shell owns target identity, host lock and receipts. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {acquireHostLock} from './hostLock.mjs';
import {runControlledProbe} from './controlledProbe.mjs';
import {validateTarget} from './runner.mjs';
import {nativeBatch270} from './nativeBatch270.mjs';
import {nativeDocumentSessions} from './nativeDocumentSessions.mjs';
import {navigationAuthoringCases} from './navigationAuthoringCases.mjs';
import {savedListScrolling} from './savedListScrolling.mjs';
import {elementStyleSources} from './elementStyleSources.mjs';
import {webTitleCases} from './webTitleCases.mjs';
import {linkedNodeFeedbackCases} from './linkedNodeFeedbackCases.mjs';
import {connectionOntologyCases} from './connectionOntologyCases.mjs';
import {emptyWikilinkCases} from './emptyWikilinkCases.mjs';
import {authoringSourceSafetyCases} from './authoringSourceSafetyCases.mjs';
import {existingRelationshipSourceCases} from './existingRelationshipSourceCases.mjs';
import {inferredParentAuthoringCases} from './inferredParentAuthoringCases.mjs';
import {localVideoThumbnailCases} from './localVideoThumbnailCases.mjs';
import {youtubeThumbnailCases} from './youtubeThumbnailCases.mjs';

/** Characterize current declarations/evidence/placement before changing semantics or captions. */
async function relationships(app,c){
 const f=c.fixture(app,c),cases=[];
 try{
  await f.initialize();let p=f.p;
  for(const [group,fields]of [['children',['Child','Second child']],['rightFriends',['Opposes302']]]){
   const result=await p.updateOntologyField(group,fields,[...p.settings.hierarchy[group]],()=>true);f.check(typeof result.refreshPending==='boolean','Committed baseline ontology: '+JSON.stringify(result));
  }
  p.settings.baseLinkStyle={...p.settings.baseLinkStyle,showLabel:true};await p.saveSettings();
  for(const method of ['native','kplex']){
   const name='Target '+method,unresolved=f.folder+'/'+name;
   const a=await f.note('Challenger '+method,'---\nOpposes302: '+JSON.stringify('[['+unresolved+']]')+'\n---\n');
   let leaf=await f.canvas(a);await f.ready();
   const source=await app.vault.read(a);
   /** Capture only this owned pair, without modifying evidence or consulting a second classifier. */
   const capture=phase=>{
    const page=p.index.get(a.path),relation=[...(page?.neighbours.values()??[])].find(r=>r.target.path===unresolved||r.target.path===unresolved+'.md');
    f.check(relation,'Owned Challenger incidence '+phase+': '+JSON.stringify({neighbours:[...(page?.neighbours.keys()??[])],hierarchy:p.settings.hierarchy}));
    const target=leaf.view.contentEl.querySelector('[data-kplex-path="'+relation.target.path+'"]'),center=leaf.view.contentEl.querySelector('[data-kplex-path="'+a.path+'"]');
    f.check(relation.isRightFriend&&relation.rightFriendType===1,'Authored Challenger role retained '+phase);
    return{method,phase,target:relation.target.path,file:!!relation.target.file,challenger:relation.isRightFriend,type:relation.rightFriendType,
     evidence:p.index.evidenceBetween(a.path,relation.target.path).map(e=>({field:e.fieldName??e.definition,kind:e.sourceKind})),
     bare:[...(p.index.state.pages.get(a.path)?.neighbours.keys()??[])],fingerprint:p.index.semanticFingerprints.get(a.path),
     full:p.index.hasCurrentFullSemanticGraph(),hydrated:p.index.fullSnapshotHydrated,sourceBacked:p.index.sourceBackedSemantics,
     policy:[p.index.fullSemanticPolicyRevision,p.index.semanticPolicyRevision],source:[p.index.fullSemanticSourceRevision,p.getIndexSourceRevision()],
     maintenance:[p.index.fullSemanticMaintenanceRevision,p.index.sourceAcquisition.getMaintenanceRevision()],pendingSources:[...(p.index.sourceAcquisition.pendingGraphSources()?.keys()??[])].filter(path=>path.startsWith(f.folder)),
     rightOfCenter:!!target&&!!center&&target.getBoundingClientRect().x>center.getBoundingClientRect().x};
   };
   cases.push(capture('unresolved'));
   let file;
   if(method==='native')file=await f.note(name);
   else{
    const ghost=p.index.get(unresolved);f.check(ghost,'Actual unresolved materialization target');
    await p.materializeGhostPage(ghost,name,'markdown',f.folder,name,undefined,{},()=>true,true,leaf,undefined,'return');
    file=app.vault.getFileByPath(unresolved+'.md');
   }
   f.check(file,'Created target');if(method==='kplex')f.files.push(file);
   await f.ready();await f.until(()=>p.index.get(a.path)?.neighbours.get(file.path)?.target.file===file,'Materialized Challenger incidence');
   cases.push(capture('materialized'));
   p.notifyNavigation(file.path,leaf);await f.ready();p.notifyNavigation(a.path,leaf);await f.ready();cases.push(capture('navigated'));
   f.check(await app.vault.read(a)===source,'Explicit Challenger source retained');
   const meta=await p.index.indexedDb.readSnapshotMeta();
   const saved=[],savedEvidence=[],owned=new Set([a.path,file.path]);
   // Schema-3 snapshots live in chunk stores, independently from the legacy random-page store.
   // Visit the authenticated generation through its real reader, retaining only this fixture pair.
   if(meta){
    f.check(await p.index.indexedDb.iterateSnapshotPages(meta,row=>{if(owned.has(row.path))saved.push({path:row.path,mtime:row.mtime,signature:row.semanticSignature,relations:row.relations?.map(r=>r.targetPath)});},()=>!c.closed),'Read persisted fixture pages');
    f.check(await p.index.indexedDb.iterateSnapshotEvidence(meta,row=>{if(owned.has(row.sourcePath)&&owned.has(row.targetPath))savedEvidence.push({sourcePath:row.sourcePath,targetPath:row.targetPath,declaredByPath:row.sourcePath,declaredTargetPath:row.targetPath,kind:row.sourceKind,field:row.fieldName??row.definition,role:row.role,relationType:row.relationType});},()=>!c.closed),'Read persisted fixture evidence');
   }
   cases.push({method,phase:'persisted-before-reload',meta:meta?{generation:meta.generation,createdAt:meta.createdAt}:null,
    pages:saved,evidence:savedEvidence,
    diagnostics:p.index.getIndexDiagnostics().slice(-12)});
   p=await f.reload();leaf=await f.canvas(a);await f.ready();
   try{await f.until(()=>p.index.get(a.path)?.neighbours.has(file.path),'Owned pair after native reload');}
   catch(error){
    const safe=fn=>{try{return fn()}catch(error){return String(error)}};
    throw Error(String(error)+'; read-only reload capture: '+JSON.stringify({source:await app.vault.read(a),frontmatter:app.metadataCache.getFileCache(a)?.frontmatter,
     resolved:app.metadataCache.resolvedLinks[a.path],unresolved:app.metadataCache.unresolvedLinks[a.path],center:p.documentSession(leaf)?.centerPath,
     get:[...(p.index.get(a.path)?.neighbours.keys()??[])],state:[...(p.index.state.pages.get(a.path)?.neighbours.keys()??[])],
     coverage:safe(()=>p.index.viewScopeCoverage(a.path)),recovery:safe(()=>p.index.getIndexRecoveryDiagnostics()),repository:safe(()=>p.index.getSourceRepositoryDiagnostics()),
     semantic:p.index.getSemanticPreparationDiagnostics(),managed:p.managedCreatedPaths.size,mode:p.index.isOnDemandMode(),evidence:p.index.evidenceBetween(a.path,file.path)}));
   }cases.push(capture('reload'));
  }
  return{cases};
 }catch(error){throw Error(String(error)+'; baseline cases: '+JSON.stringify(cases));}finally{await f.cleanup();}
}

/** Keep caption characterization independent of relationship reload failures. Physical fields and
 * current evidence are retained while one/two/one fields and reciprocal display wording vary. */
async function labels(app,c){
 const f=c.fixture(app,c),cases=[];
 try{
  await f.initialize();const p=f.p;
  await p.updateOntologyField('parents',['Parent'],[...p.settings.hierarchy.parents],()=>true);
  await p.updateOntologyField('children',['Child','Second child'],[...p.settings.hierarchy.children],()=>true);
  p.settings.baseLinkStyle={...p.settings.baseLinkStyle,showLabel:true};
  p.settings.hierarchyLinkStyles=Object.fromEntries(Object.entries(p.settings.hierarchyLinkStyles).filter(([key])=>!['child','second child','parent'].includes(key.toLowerCase())));
  await p.saveSettings();
  for(const kind of ['markdown','excalidraw']){
   const a=await f.note('Labels '+kind),leaf=await f.canvas(a);await f.ready();
   const file=await p.createNewRelatedFileForOrigin(p.index.get(a.path),'Child '+kind,kind,'',f.folder);f.check(file,'Created label target');f.files.push(file);
   await p.linkNewRelatedFile(p.index.get(a.path),'child',file,'Child');await f.ready();
   for(const [phase,count]of [['singleton',1],['parallel',2],['removed-second',1]]){
    await app.fileManager.processFrontMatter(a,fm=>{fm.Child='[['+file.path+']]';if(count===2)fm['Second child']='[['+file.path+']]';else delete fm['Second child'];});
    await f.ready();
    for(const center of [a,file]){
     p.notifyNavigation(center.path,leaf);await f.ready();
     const labels=[...leaf.view.contentEl.querySelectorAll('.kplex-edge-label')].map(el=>el.textContent);
     // Unpaired physical definitions use the shared normalizeFieldName spelling. Paired display
     // captions below deliberately retain the explicitly configured Child/Parent casing.
     const expected=count===2?'child, second-child':'child';
     cases.push({kind,phase,count,center:center===a?'source':'target',expected,labels,evidence:p.index.evidenceBetween(a.path,file.path).map(e=>({field:e.fieldName??e.definition,kind:e.sourceKind}))});
     if(c.expectFixed)f.check(labels.includes(expected),'Authored exact '+expected+' caption');
    }
   }
   // Pair metadata overrides the displayed inverse caption without changing authored YAML.
   const source=await app.vault.read(a);
   await p.updateOntologyField('children',['Child/Parent','Second child'],[...p.settings.hierarchy.children],()=>true);
   for(const show of [true,false]){
    p.settings.baseLinkStyle={...p.settings.baseLinkStyle,showLabel:show};await p.saveSettings();
    for(const center of [a,file]){
     p.notifyNavigation(center.path,leaf);await f.ready();
     const labels=[...leaf.view.contentEl.querySelectorAll('.kplex-edge-label')].map(el=>el.textContent),expected=center===a?'Child':'Parent';
     cases.push({kind,phase:'reciprocal-caption',show,center:center===a?'source':'target',expected,labels,
      evidence:p.index.evidenceBetween(a.path,file.path).map(e=>({field:e.fieldName??e.definition,kind:e.sourceKind}))});
     if(c.expectFixed&&show)f.check(labels.includes(expected),'Authored reciprocal '+expected+' caption');
     if(!show)f.check(!labels.some(label=>label==='Child'||label==='Parent'),'Disabled reciprocal captions');
    }
   }
   f.check(await app.vault.read(a)===source,'Caption pairing retained physical source declarations');
   await p.updateOntologyField('children',['Child','Second child'],[...p.settings.hierarchy.children],()=>true);
   p.settings.baseLinkStyle={...p.settings.baseLinkStyle,showLabel:true};await p.saveSettings();
  }
  return{cases};
 }catch(error){throw Error(String(error)+'; baseline cases: '+JSON.stringify(cases));}finally{await f.cleanup();}
}

/** Retain incoming authored incidence while deleting a just-created or settled Sidecar note through native trash. */
async function deletedSidecarRelationship(app,c){
 const f=c.fixture(app,c),rows=[];let restoreObserver;
 try{
 await f.initialize();let p=f.p;await p.updateOntologyField('rightFriends',['OpposesDelete'],[...p.settings.hierarchy.rightFriends],()=>true);
 for(const settled of [false,true]){
 const origin=await f.note('Note '+settled),leaf=await f.canvas(origin);await f.ready();
 const target=await p.createNewRelatedFileForOrigin(p.index.get(origin.path),'Challenger '+settled,'markdown','',f.folder);f.check(target,'Created target');f.files.push(target);
 const linked=await p.linkNewRelatedFile(p.index.get(origin.path),'right',target,'OpposesDelete');
 await p.finishNewRelatedNode(linked.page,leaf,'sidecar',()=>true);
 const sidecar=p.sidecarLeaves.get(leaf);f.check(sidecar?.view.file===target,'Actual sidecar target');
 if(settled)await f.ready();
 const sourceText=await app.vault.read(origin),index=p.index,path=target.path,seen=new WeakMap();let next=0;
 const identity=x=>{if(!x)return null;if(!seen.has(x))seen.set(x,++next);return seen.get(x)};
 const graph=pages=>{const page=pages?.get(path);return page?{id:identity(page),file:!!page.file,neighbours:[...page.neighbours.keys()].filter(x=>x.startsWith(f.folder))}:null};
 const capture=phase=>{const center=p.documentSession(leaf)?.centerPath??path,current=index.get(center),row={phase,settled,ms:performance.now(),center,current:current?{id:identity(current),file:!!current.file,neighbours:[...current.neighbours.keys()].filter(x=>x.startsWith(f.folder))}:null,canonical:graph(index.state.pages),semantic:[...index.semanticScopes].filter(([center,s])=>center===path||s.pagesByPath.has(path)).map(([center,s])=>({center,graph:graph(s.pagesByPath),source:s.sourceRevision,policy:s.policyRevision})),preview:[...index.hostPreviewScopes].filter(([center,s])=>center===path||s.pages.has(path)).map(([center,s])=>({center,graph:graph(s.pages)})),retained:[...index.retainedLocalScopes].filter(([center,s])=>center===path||s.state.pages.has(path)).map(([center,s])=>({center,graph:graph(s.state.pages)})),sourceRevision:p.getIndexSourceRevision(),maintenance:index.sourceAcquisition.getMaintenanceRevision(),coverage:index.viewScopeCoverage(path),rendered:!!leaf.view.contentEl.querySelector('[data-kplex-path="'+origin.path+'"]'),renderedEdges:leaf.view.contentEl.querySelectorAll('.kplex-edge-visible').length};if(rows.length<100)rows.push(row);return row;};
 const original=index.dematerializeFile,descriptor=Object.getOwnPropertyDescriptor(index,"dematerializeFile");index.dematerializeFile=function(...args){if(args[0]===path)capture('sync-before-dematerialize');const result=original.apply(this,args);if(args[0]===path)capture('sync-after-dematerialize');return result;};restoreObserver=()=>{if(descriptor)Object.defineProperty(index,"dematerializeFile",descriptor);else delete index.dematerializeFile};
 const beforeDelete=capture('before-native-delete');f.check(beforeDelete.rendered&&beforeDelete.renderedEdges>0,'Owned note and connection are rendered before native deletion');
 await app.fileManager.trashFile(target);
 capture('native-delete-return');
 // The App may hold its accepted connected page while the successor read is pending. Test the
 // actual scene during that handover; require an authoritative connected read after full settlement.
 for(let n=0;n<8;n++){await f.wait(40);const row=capture('after-'+((n+1)*40)+'ms');f.check(!row.current?.file&&!app.vault.getFileByPath(path),'Deleted center has no native file during repair');f.check(row.rendered&&row.renderedEdges>0,'Surviving related note and connection stay in the rendered canvas during deletion repair');}
 await f.ready();const final=capture('settled');f.check(final.current?.neighbours.includes(origin.path),'Surviving incoming relationship after convergence');f.check(final.rendered&&final.renderedEdges>0,'Surviving related note and connection are rendered after convergence');restoreObserver();restoreObserver=undefined;
 f.check(!app.vault.getFileByPath(path),'Deleted only owned target');
 f.check(await app.vault.read(origin)===sourceText,'Surviving source bytes retained exactly');
 }
 return{rows};
 }catch(error){throw Error(String(error)+'; read-owner-trace: '+JSON.stringify(rows));}finally{restoreObserver?.();await f.cleanup();}
}

const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
const lane=process.env.KPLEX_AUTHORING_LANE??(process.argv.includes('--youtube-thumbnails')?'youtube-thumbnails':process.argv.includes('--source-safety')?'source-safety':process.argv.includes('--empty-links')?'empty-links':process.argv.includes('--ontology-change')?'ontology-change':process.argv.includes('--hidden-links')?'hidden-links':process.argv.includes('--scroll')?'scroll':process.argv.includes('--navigation')?'navigation':process.argv.includes('--delete-sidecar')?'delete':'relationships'),scenario={relationships,labels,delete:deletedSidecarRelationship,navigation:navigationAuthoringCases,scroll:savedListScrolling,appearance:elementStyleSources,titles:webTitleCases,'hidden-links':linkedNodeFeedbackCases,'ontology-change':connectionOntologyCases,'empty-links':emptyWikilinkCases,'source-safety':authoringSourceSafetyCases,'source-safety-existing':existingRelationshipSourceCases,
 'inferred-parent':inferredParentAuthoringCases,'local-video-thumbnails':localVideoThumbnailCases,'youtube-thumbnails':youtubeThumbnailCases}[lane];if(!scenario)throw Error('Unknown authoring lane');
const userDataPath=process.env.KPLEX_OBSIDIAN_USER_DATA??(process.platform==='win32'?join(process.env.APPDATA,'obsidian'):process.platform==='darwin'?join(homedir(),'Library','Application Support','obsidian'):join(process.env.XDG_CONFIG_HOME??join(homedir(),'.config'),'obsidian'));
const lock=acquireHostLock({userDataPath});
try{
 const definitions=(lane==='appearance'||lane==='ontology-change'||lane==='youtube-thumbnails'?'c.captureRoot='+JSON.stringify(process.env.KPLEX_HOST_REPORT_DIR)+';':'')+'c.allowOnDemandRoutingStartup='+(lane==='scroll')+';c.fixture='+nativeBatch270.toString()+';c.sessions='+nativeDocumentSessions.toString()+';c.fixturePrefix="__kplex302_";c.expectFixed='+(process.env.KPLEX_EXPECT_FIXED==='true')+';c.originalData='+JSON.stringify(readFileSync(join(target.pluginDir,'data.json'),'utf8'))+';c.originalEnabled='+JSON.stringify(readFileSync(join(target.config,'community-plugins.json'),'utf8'))+';'
  +'c.backgroundInput='+(process.env.KPLEX_AUTHORING_BACKGROUND_INPUT==='true')+';c.nativeGate='+(process.env.KPLEX_299_NATIVE_GATE==='true')+';'
  +'c.videoFixtures='+JSON.stringify(process.env.KPLEX_LOCAL_VIDEO_FIXTURE_DIR??null)+';';
 const youtubeSources=lane==='youtube-thumbnails'?['src/core/contracts/videoUrl.ts','src/application/youtubeThumbnails.ts','src/adapters/obsidian/youtubeThumbnails.ts','src/adapters/obsidian/urlIdentity.ts','src/ui/features/NodeVisualImage.tsx','src/ui/features/urlEmbed.ts','src/ui/ThoughtNode.tsx','src/types.ts','src/settings.ts','src/core/graph/settingsPolicy.ts','scripts/testing/obsidian/youtubeThumbnailCases.mjs','scripts/testing/obsidian/nativeBatch270.mjs','scripts/testing/obsidian/nativeDocumentSessions.mjs','scripts/testing/obsidian/authoringWorkspace.mjs']:[];
 const localVideoSources=lane==='local-video-thumbnails'?['src/adapters/obsidian/localVideoFrame.ts','src/adapters/obsidian/localVideoThumbnails.ts',
  'src/ui/ThoughtNode.tsx','src/ui/features/NodeVisualImage.tsx','src/settings.ts','scripts/testing/obsidian/localVideoThumbnailCases.mjs']:[];
 await runControlledProbe('authoring-workspace-'+lane,scenario,definitions,[...youtubeSources,...localVideoSources,...(['source-safety','source-safety-existing','inferred-parent'].includes(lane)?['src/ui/App.tsx','src/ui/NewRelatedNoteModal.ts','src/application/ActionManager.ts']:[]),...(lane==='empty-links'?['src/adapters/obsidian/ontologySourceCollector.ts','src/index/SourceFacts.ts']:[]),...(lane==='ontology-change'?['src/application/connectionOntology.ts','src/ui/RelationModal.ts','scripts/testing/obsidian/connectionOntologyCases.mjs']:[]),...(lane==='hidden-links'?['src/ui/linkedNodeVisibility.ts','src/ui/NewRelatedNoteModal.ts','scripts/testing/obsidian/linkedNodeFeedbackCases.mjs']:[]),'src/main.ts','src/ui/PlexGraph.tsx','scripts/testing/obsidian/navigationAuthoringCases.mjs','src/ui/components/HorizontalDragScroll.tsx','scripts/testing/obsidian/savedListScrolling.mjs','scripts/testing/obsidian/elementStyleSources.mjs','scripts/testing/obsidian/webTitleCases.mjs'],{maximumMs:900000});
}finally{lock.release();}
