/** Native attachment/backlink and Markdown-center count regression in the existing Small vault. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {runControlledProbe} from './controlledProbe.mjs';
import {nativeDocumentSessions} from './nativeDocumentSessions.mjs';

/** Real native metadata deliberately retains Obsidian's fresh non-Markdown cache objects. */
async function scenario(app,c){
 const p=app.plugins.plugins['k-plex'],workspace=app.workspace;
 const check=(value,message)=>{if(!value)throw Error(message)};
 const wait=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
 const until=async(read,message)=>{const end=Date.now()+30000;while(!read()){check(!c.closed&&Date.now()<end,message);await wait(50)}};
 check(p&&app.vault.getFiles().length<1000&&!app.setting.isOpen,'Explicit clean Small vault required');
 await until(()=>!p.isStartupInitializing(),'Startup pending');
 const settings=structuredClone(p.settings),policy=p.savedSettingsPolicy,layout=workspace.getLayout();
 const sessions=c.documentSessions(p),owners=sessions.capture(),folder='Kplex-Attachment-Counts-'+Date.now();
 const files=[],cases=[];let host,createdFolder,failure;
 const root=()=>host?.view.contentEl.querySelector('.kplex-app');
 try{
  await sessions.off();
  createdFolder=await app.vault.createFolder(folder);
  // Empty binary payloads suffice: this probe never opens an attachment viewer or reads a body.
  const pdf=await app.vault.createBinary(folder+'/Manual.pdf',new ArrayBuffer(0));files.push(pdf);
  const image=await app.vault.createBinary(folder+'/Image.png',new ArrayBuffer(0));files.push(image);
  const readers=[];
  for(let n=0;n<18;n++){
   const file=await app.vault.create(folder+'/Reader-'+n+'.md','![[Manual.pdf]]'+(n===0?'\n![[Image.png]]':''));
   readers.push(file);files.push(file);
  }
  await until(()=>readers.every(file=>app.metadataCache.resolvedLinks[file.path]?.[pdf.path]),'Native attachment backlink resolution');
  check(app.metadataCache.getFileCache(pdf)!==app.metadataCache.getFileCache(pdf),'Native PDF cache must reproduce unstable identity');
  check(app.metadataCache.getFileCache(image)!==app.metadataCache.getFileCache(image),'Native image cache must reproduce unstable identity');
  Object.assign(p.settings,{showPageNodes:true,showAttachments:true,showFolderNodes:false,showTagNodes:false,showInferredNodes:true,inferAllLinksAsFriends:false,inverseInfer:false,graphLenses:[],applyPowerFilter:false});
  p.index.notifyPresentation();
  host=workspace.getLeaf('tab');await host.setViewState({type:'k-plex-react-view',active:true});await host.view.waitUntilReady();
  host.view.centerPresentation.update({embedCentralNode:false});host.view.documentSession.plexView.select('classic');
  for(const [file,gate,expected] of [[pdf,'top',18],[readers[0],'bottom',2]]){
   c.progress={phase:file===pdf?'pdf-center':'markdown-center',cases};
   p.notifyNavigation(file.path,host);
   await until(()=>host.view.documentSession.centerPath===file.path&&root()?.querySelector('.kplex-role-center[data-kplex-path="'+CSS.escape(file.path)+'"]'),'Requested center rendered');
   for(let pass=0;pass<3;pass++){
    const scope=await p.index.publishOnDemandHostScope(file.path,()=>!c.closed);
    check(scope,'Real native host cover must publish');
    // Canonical fixture ingestion may still be finishing. Check this exact newly compiled host
    // cover, then independently wait for the ordinary displayed canonical/local count below.
    const page=scope.pages.get(file.path);
    const stat=p.index.relationView(page,{page,settings:p.index.hostPreviewSettings.get(page)}).gateStats[gate];
    check(stat.visibleCount===expected&&!stat.countUnavailable,'Numerical host count differs from native backlinks: '+JSON.stringify({gate,expected,stat}));
    check(!p.index.onDemandUnavailableCounts.has(file.path),'Count failure marker remains');
    await until(()=>{
     const label=root()?.querySelector('.kplex-role-center .gate-wrap-'+gate+' .kplex-gate-count')?.textContent;
     return label!==undefined&&label!==null&&label!=='…'&&Number(label.replace('≥',''))===expected;
    },'Numeric central gate label');
    await wait(150);
   }
   cases.push((file===pdf?'PDF':'Markdown with PDF/image')+': three native count revalidations and visible numeric gate');
  }
  return {cases,nativeBacklinks:18};
 }catch(error){failure=error;throw error}
 finally{
  const errors=[],clean=async(name,action)=>{try{await action()}catch(error){errors.push(name+': '+error)}};
  if(host)await clean('close-owned-host',()=>host.detach());
  p.settings=settings;await clean('restore-settings',()=>p.saveSettings(false,false));p.savedSettingsPolicy=policy;
  await clean('restore-workspace',()=>workspace.changeLayout(layout));await clean('restore-native-owners',()=>sessions.restore(owners));
  for(const file of files.reverse())if(app.vault.getFileByPath(file.path)===file)await clean('delete-owned-file',()=>app.vault.delete(file,true));
  if(createdFolder&&app.vault.getFolderByPath(folder)===createdFolder&&!createdFolder.children.length)await clean('delete-owned-folder',()=>app.vault.delete(createdFolder,true));
  await clean('drain-settings',()=>p.settingsWriteQueue);
  await clean('restore-settings-bytes',()=>app.vault.adapter.write(p.manifest.dir+'/data.json',c.originalData));
  if(errors.length)throw Error((failure?String(failure)+'; ':'')+errors.join('; '));
 }
}
if(process.env.KPLEX_TEST_VAULT_NAME!=='kplex-test-small')throw Error('Explicit Small vault required');
const definitions='c.originalData='+JSON.stringify(readFileSync(join(process.env.KPLEX_TEST_CONFIG_DIR,'plugins/k-plex/data.json'),'utf8'))+';c.documentSessions=('+nativeDocumentSessions.toString()+');';
await runControlledProbe('attachment-gate-counts',scenario,definitions,['src/index/HostMetadataPreview.ts']);
