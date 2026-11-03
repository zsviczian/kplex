/** Native reproduction gate for #262/#263 before changing preview registration or URI grammar.
 * The caller owns the application lock and exact frozen-build attribution. Only disposable Small
 * fixtures are written; configuration, document sessions and layout are restored independently. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {runControlledProbe} from './controlledProbe.mjs';
import {nativeDocumentSessions} from './nativeDocumentSessions.mjs';
import {validateTarget} from './runner.mjs';

/** Compare actual native Markdown link rendering with graph discovery without activating a URI. */
async function scenario(app,c){
 const p=app.plugins.plugins['k-plex'],layout=app.workspace.getLayout(),settings=structuredClone(p.settings);
 const sessions=c.sessions(p),saved=sessions.capture(),inventory=app.vault.getFiles().map(file=>file.path).sort();
 const folder='__kplex270_baseline_'+Date.now(),files=[],leaves=[];let directory;
 const wait=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
 const until=async(predicate,message)=>{const end=Date.now()+60000;while(!predicate()){c.progress={phase:message,status:p.getIndexStatus()};if(c.closed||Date.now()>end)throw Error(message);await wait(50);}};
 try{
  if(app.vault.getName()!=='kplex-test-small'||app.vault.getFiles().length>=1000)throw Error('Disposable Small required');
  await sessions.off();Object.assign(p.settings,{embedCentralNode:true,graphDepth:1,renderSiblings:false,animationSpeed:0,showPageNodes:true});
  directory=await app.vault.createFolder(folder);
  const destination=folder+'/Case + space.md';files.push(await app.vault.create(destination,'# URI destination\n## Mixed Heading\n'));
  const uri='obsidian://open?vault='+encodeURIComponent(app.vault.getName())+'&file='+encodeURIComponent(destination+'#Mixed Heading');
  const body=['# URI reproduction',uri,'[Labelled URI]('+uri+')','<'+uri+'>','https://example.com/Kplex270?Case=Kept'].join('\n\n');
  files.push(await app.vault.create(folder+'/Source.md',body));
  const markdown=app.workspace.getLeaf('tab');leaves.push(markdown);
  await markdown.setViewState({type:'markdown',state:{file:files[1].path,mode:'preview'},active:true});await app.workspace.revealLeaf(markdown);
  await until(()=>markdown.view.contentEl.querySelectorAll('a[href^="obsidian://"]').length>=2,'Native URI Markdown rendering');
  const ordinary=[...markdown.view.contentEl.querySelectorAll('a')].map(anchor=>({href:anchor.getAttribute('href'),text:anchor.textContent,classes:anchor.className}));
  if(ordinary.filter(link=>link.href===uri).length<2)throw Error('Native labelled/autolink URI rendering missing');
  for(const file of files){p.index.insertCreatedFile(file);const release=p.index.acquireSemanticDemand(file.path);c.releases??=[];c.releases.push(release);}
  await until(()=>!p.index.hasPendingSemanticPreparation()&&!!p.index.get('https://example.com/Kplex270?Case=Kept'),'URI fixture semantic preparation');
  const leaf=app.workspace.getLeaf('tab');leaves.push(leaf);await leaf.setViewState({type:'k-plex-react-view',active:true});await app.workspace.revealLeaf(leaf);await leaf.view.waitUntilReady();
  p.notifyNavigation(files[1].path,leaf);await until(()=>leaf.view.contentEl.querySelector('[data-kplex-path="'+files[1].path+'"]'),'URI source canvas');
  const sources=Object.entries(app.workspace.hoverLinkSources).filter(([,value])=>value.display==='K-Plex').map(([id,value])=>({id,...value}));
  if(sources.length!==2)throw Error('Expected duplicate preview-source reproduction');
  if(p.index.get(uri))throw Error('Expected URI graph-discovery gap is not reproduced');
  const central=[...leaf.view.contentEl.querySelectorAll('.markdown-reading-view a[href^="obsidian://"]')].map(anchor=>anchor.getAttribute('href'));
  p.openUrlInBrowser(uri);
  await until(()=>app.workspace.getActiveFile()===files[0],'Explicit URI native opening');
  return {uri,ordinary,central,graph:{webPresent:true,uriPresent:false},previewSources:sources,explicitOpen:{nativeTarget:app.workspace.getActiveFile()?.path,webviewerEnabled:!!app.internalPlugins.plugins.webviewer?.enabled}};
 }finally{
  const errors=[],clean=async(name,action)=>{try{await action();}catch(error){errors.push(name+': '+error);}};
  for(const release of c.releases??[])release();
  for(const leaf of leaves)await clean('owned leaf',()=>leaf.detach());
  for(const file of files.reverse())if(app.vault.getFileByPath(file.path)===file)await clean('fixture note',()=>app.vault.delete(file,true));
  if(directory&&app.vault.getFolderByPath(folder)===directory&&!directory.children.length)await clean('fixture folder',()=>app.vault.delete(directory,true));
  await clean('settings',async()=>{p.settings=settings;await p.saveSettings(false,false);await p.settingsWriteQueue;});
  await clean('layout',()=>app.workspace.changeLayout(layout));await clean('sessions',()=>c.sessions(p).restore(saved));
  await p.settingsWriteQueue;await wait(2500);
  await clean('settings bytes',()=>app.vault.adapter.write(p.manifest.dir+'/data.json',c.originalData));
  await clean('enablement bytes',()=>app.vault.adapter.write(app.vault.configDir+'/community-plugins.json',c.originalEnabled));
  if(JSON.stringify(app.vault.getFiles().map(file=>file.path).sort())!==JSON.stringify(inventory))errors.push('Fixture inventory differs');
  if(errors.length)throw Error(errors.join('; '));
 }
}

/** Reproduction uses the prior accepted build; final acceptance uses a separate current-build lane. */
export async function runPinsPreviewUriBaseline(){
 const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
 return runControlledProbe('pins-preview-uri-baseline-270',scenario,'c.sessions='+nativeDocumentSessions.toString()+';c.originalData='+JSON.stringify(readFileSync(join(target.pluginDir,'data.json'),'utf8'))+';c.originalEnabled='+JSON.stringify(readFileSync(join(target.config,'community-plugins.json'),'utf8'))+';', ['src/core/parser/metadata.ts'],{maximumMs:180000});
}
