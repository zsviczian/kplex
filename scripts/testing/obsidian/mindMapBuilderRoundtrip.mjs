/** Offline native compatibility check against the actual companion and local Mindmap Builder.
 * Run after the UI export probe; its Markdown artifact is the input. Only Builder's
 * unrelated help renderer is stubbed to avoid remote marketing embeds. */
import {readFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {build} from 'esbuild';
import {runControlledProbe} from './controlledProbe.mjs';
import {nativeDocumentSessions} from './nativeDocumentSessions.mjs';
/** Import real exported bytes, inspect native branch/link elements and re-export before retiring the owned drawing. */
async function scenario(app,c){
 const p=app.plugins.plugins['k-plex'],ex=app.plugins.plugins['obsidian-excalidraw-plugin'];if(!ex||window.MindMapBuilderAPI)throw Error('Companion and no existing Builder session required');
 const layout=app.workspace.getLayout(),settings=structuredClone(p.settings),policy=p.savedSettingsPolicy,exSettings=structuredClone(ex.settings),sessions=c.documentSessions(p),owners=sessions.capture();
 let folder,file,leaf,ea,failure;const name='Kplex-237-Builder-'+Date.now(),title='Kplex237 native Builder compatibility';
 const check=(value,message)=>{if(c.closed||!value)throw Error(message)};
 const wait=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
 const until=async(read,message)=>{const end=Date.now()+30000;while(!read()){check(Date.now()<end,message);await wait(40)}};
 try{
  const remote=require('@electron/remote'),win=remote.getCurrentWindow();if(remote.process.platform==='darwin')remote.app.focus({steal:true});win.show();win.focus();win.webContents.focus();await sessions.off();
  folder=await app.vault.createFolder(name);c.progress={phase:'drawing'};
  file=await ex.createDrawing('Roundtrip.excalidraw.md',name,await ex.getBlankDrawing(),{exactPath:name+'/Roundtrip.excalidraw.md'});
  leaf=app.workspace.getLeaf('tab');await leaf.setViewState({type:'excalidraw',state:{file:file.path},active:true});await app.workspace.revealLeaf(leaf);
  await until(()=>leaf.view.excalidrawAPI&&!leaf.view.excalidrawAPI.getAppState().isLoading,'Native Excalidraw drawing not ready');
  c.progress={phase:'builder-start'};const source=require('node:fs').readFileSync(c.scriptPath,'utf8');await ex.scriptEngine.executeScript(leaf.view,source,title,null);
  await until(()=>window.MindMapBuilderAPI?.ready(),'Actual Builder runtime did not initialize');ex.scriptEngine.eaInstances.forEach(item=>{if(item.activeScript===title)ea=item});check(ea,'Owned Builder EA absent');
  const markdown=require('node:fs').readFileSync(c.markdownPath,'utf8'),expectedBranches=markdown.split('\n').filter(line=>/^(\s*- |# )/.test(line)).length-1,expectedLinks=(markdown.match(/\[\[#\^[a-zA-Z0-9]{8}\|\*\]\]/g)||[]).length;
  c.progress={phase:'actual-builder-import',expectedBranches,expectedLinks};
  const result=await window.MindMapBuilderAPI.importMarkdown({markdown});check(result.ok&&result.data.rootId,'Actual Builder Markdown import rejected');
  const roles=window.MindMapBuilderAPI.getElementIdsByRole(result.data.rootId);check(roles.ok,'Builder could not read the imported hierarchy');
  check(roles.data.branchArrows.length===expectedBranches,'Native Builder branch count differs');check(roles.data.crossLinks.length===expectedLinks,'Native Builder crosslinks differ');
  const scene=leaf.view.excalidrawAPI.getSceneElements();c.progress={phase:'inspect-native-links',elements:scene.filter(element=>element.type==='text').map(element=>({text:element.text,rawText:element.rawText,originalText:element.originalText,link:element.link})),parsedEntity:await ea.parseText('[[R.md|Alpha&#58;&#58;Beta]]')};const targets=markdown.match(/\[\[(?!#\^)[^\]]+\]\]/g)||[];check(targets.every(target=>scene.some(element=>element.rawText===target)),'Native drawing lost wikilink targets');
  const output=await window.MindMapBuilderAPI.exportMarkdown({nodeId:result.data.rootId});check(output.ok&&output.data.markdown.includes('[['),'Native Builder could not re-export its imported hierarchy');
  await leaf.view.save(false,true);return{nativeBuilder:true,builderSources:c.builderSources,parsedEntity:c.progress.parsedEntity,branchArrows:roles.data.branchArrows.length,crossLinks:roles.data.crossLinks.length,renderedElements:scene.length,reexported:true,offlineHelpStub:true,limitation:'Only the unrelated Builder help/marketing renderer is replaced to keep this native test offline; actual parser, node creation, graph, layout, Excalidraw rendering and export run unmodified.'};
 }catch(error){failure=error;throw error}
 finally{
  const errors=[],clean=async(label,action)=>{try{await action()}catch(error){errors.push(label+': '+String(error))}};
  if(!ea)ex.scriptEngine.eaInstances.forEach(item=>{if(item.activeScript===title)ea=item});
  await clean('destroy-owned-Builder',()=>ea?.destroy());await wait(500);
  if(leaf)await clean('close-owned-drawing',()=>leaf.detach());
  p.settings=settings;await clean('restore-Kplex-settings',()=>p.saveSettings(false,false));p.savedSettingsPolicy=policy;
  ex.settings=exSettings;await clean('restore-companion-settings',()=>ex.saveSettings());
  await clean('restore-layout',()=>app.workspace.changeLayout(layout));await clean('restore-sessions',()=>sessions.restore(owners));
  if(folder&&app.vault.getFolderByPath(name)===folder){if(folder.children.every(item=>item.name.startsWith('Roundtrip')))await clean('delete-owned-drawing-folder',()=>app.vault.delete(folder,true));else errors.push('Unexpected fixture folder contents')}
  await wait(500);await clean('drain-settings',()=>p.settingsWriteQueue);await clean('restore-Kplex-bytes',()=>app.vault.adapter.write(p.manifest.dir+'/data.json',c.originalData));await clean('restore-companion-bytes',()=>app.vault.adapter.write(ex.manifest.dir+'/data.json',c.companionData));
  if(window.MindMapBuilderAPI)errors.push('Builder API not retired');if(errors.length)throw Error((failure?String(failure)+'; ':'')+errors.join('; '));
 }
}
const sourceDir=process.env.KPLEX_BUILDER_SOURCE_DIR,markdownPath=process.env.KPLEX_BUILDER_MARKDOWN_PATH,reportDir=process.env.KPLEX_HOST_REPORT_DIR;
if(!sourceDir||!markdownPath||!reportDir)throw Error('Set KPLEX_BUILDER_SOURCE_DIR, KPLEX_BUILDER_MARKDOWN_PATH and KPLEX_HOST_REPORT_DIR');
const config=process.env.KPLEX_TEST_CONFIG_DIR;if(!config)throw Error('Explicit disposable vault configuration required');
mkdirSync(reportDir,{recursive:true});
const scriptPath=resolve(reportDir,'native-builder-offline.js');
const builderSources=Object.fromEntries(['main.ts','markdownImport.js','markdownExport.js'].map(/** Attribute the actual local Builder sources used by this receipt. */ file=>[file,createHash('sha256').update(readFileSync(join(sourceDir,file))).digest('hex')]));
await build({entryPoints:[resolve(sourceDir,'main.ts')],bundle:true,format:'iife',platform:'browser',target:'es2021',outfile:scriptPath,
 plugins:[{name:'offline-native-help',setup(builder){builder.onResolve({filter:/^\.\/helpUi\.js$/},/** Prevent the unrelated help panel from loading network embeds. */()=>({path:'offline-help',namespace:'offline'}));builder.onLoad({filter:/.*/,namespace:'offline'},/** Preserve the minimal help DOM contract required by the unchanged runtime. */()=>({contents:'export function createHelpUi(ctx){return {getInstructions:()=>"",renderHelp(container){ctx.helpContainer=container.createDiv();ctx.detailsEl=ctx.helpContainer.createEl("details")}}}',loader:'js'}));}}]});
const definitions='c.documentSessions=('+nativeDocumentSessions.toString()+');c.originalData='+JSON.stringify(readFileSync(join(config,'plugins/k-plex/data.json'),'utf8'))+';c.companionData='+JSON.stringify(readFileSync(join(config,'plugins/obsidian-excalidraw-plugin/data.json'),'utf8'))+';c.scriptPath='+JSON.stringify(scriptPath)+';c.markdownPath='+JSON.stringify(resolve(markdownPath))+';c.builderSources='+JSON.stringify(builderSources)+';';
await runControlledProbe('actual-builder-roundtrip-237',scenario,definitions,['src/core/plex/export/mindMapMarkdown.ts']);
