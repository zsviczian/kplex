/** Exact-build native menus, tab captions, wheel navigation and preference reload in disposable Small. */
import {runControlledProbe} from './controlledProbe.mjs';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {validateTarget} from './runner.mjs';
import {nativeDocumentSessions} from './nativeDocumentSessions.mjs';

async function scenario(app,c) {
  if(app.vault.getName()!=='kplex-test-small')throw Error('Disposable Small required');
  let p=app.plugins.plugins['k-plex'];
  const workspace=app.workspace,layout=workspace.getLayout(),original=structuredClone(p.settings),sessions=c.sessions(p),saved=sessions.capture();
  const owner=workspace.containerEl.ownerDocument.defaultView,folder='Kplex-Creation-'+Date.now(),files=[],hosts=[],cases=[];
  let directory, failure;
  c.progress={phase:"native-menus",cases};
  const wait=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
  const until=async(read,message)=>{const end=Date.now()+30000;while(!read()){if(c.closed||Date.now()>=end)throw Error(message);await wait(40)}};
  const check=(value,message)=>{if(!value)throw Error(message)};
  try {
    await sessions.off();Object.assign(p.settings,{trackpadNavigation:true,embedCentralNode:false,animationSpeed:0,allowAutozoom:false,documentSyncMode:'off',sidecarOpen:false});
    directory=await app.vault.createFolder(folder);
    for(const name of ['First','Second']){const file=await app.vault.create(folder+'/'+name+'.md','');files.push(file);p.index.insertCreatedFile(file);}
    const Menu=window.ExcalidrawAutomate?.obsidian?.Menu;
    check(Menu,'Native menu constructor requires the existing Excalidraw companion');
    for(const source of ['file-explorer-context-menu','tab-header','link-context-menu']) {
      const menu=new Menu();workspace.trigger('file-menu',menu,files[0],source);
      const parent=menu.items.find(item=>item.titleEl?.textContent===p.translator('view.displayName'));
      check(parent?.submenu,'K-Plex native submenu absent: '+source);
      check(parent.submenu.items.length===5,'Desktop opening destinations absent');
      if(source==='file-explorer-context-menu'){
        const before=new Set(workspace.getLeavesOfType('k-plex-react-view'));
        const item=parent.submenu.items.find(item=>item.titleEl?.textContent===p.translator('fileMenu.tab'));
        await item.callback(new owner.MouseEvent('click'));
        const host=workspace.getLeavesOfType('k-plex-react-view').find(leaf=>!before.has(leaf));
        check(host,'Menu did not allocate a new native tab');hosts.push(host);
        await until(()=>host.view.documentSession?.centerPath===files[0].path,'Menu did not center clicked file');
      }
      menu.hide();
    }
    const first=hosts[0];await until(()=>first.tabHeaderInnerTitleEl?.textContent===files[0].basename,'Native tab caption did not follow center');
    check(first.view.getIcon()==='brain-circuit','Native K-Plex icon lost');cases.push('file-tab-link-menus-and-caption');c.progress={phase:'camera',cases:[...cases]};
    const scope=first.view.contentEl.querySelector('.kplex-plex');await until(()=>scope?.querySelector('.kplex-camera'),'Canvas absent');
    const camera=scope.querySelector('.kplex-camera'),realm=scope.ownerDocument.defaultView;
    const read=()=>new realm.DOMMatrix(camera.style.transform);
    const before=read(),rect=scope.getBoundingClientRect();
    scope.dispatchEvent(new realm.WheelEvent('wheel',{bubbles:true,cancelable:true,deltaX:27,deltaY:19,clientX:rect.left+rect.width/2,clientY:rect.top+rect.height/2}));
    await until(()=>Math.abs(read().m41-before.m41+27)<.1&&Math.abs(read().m42-before.m42+19)<.1,'Trackpad wheel did not pan both axes');
    check(Math.abs(read().a-before.a)<.00001,'Trackpad pan changed zoom');
    const pan=read();scope.dispatchEvent(new realm.WheelEvent('wheel',{bubbles:true,cancelable:true,ctrlKey:true,deltaY:40,clientX:rect.left+rect.width/2,clientY:rect.top+rect.height/2}));
    await until(()=>read().a<pan.a,'Modified wheel did not zoom');check(first.view.documentSession.centerPath===files[0].path,'Camera input navigated');cases.push('native-trackpad-pan-and-modifier-zoom');c.progress={phase:'surfaces',cases:[...cases]};
    for(const target of ['split','window']){
      const before=new Set(workspace.getLeavesOfType('k-plex-react-view'));await p.openFileInKplex(files[1],target);
      const host=workspace.getLeavesOfType('k-plex-react-view').find(leaf=>!before.has(leaf));check(host,'No native '+target);hosts.push(host);
      await until(()=>host.view.documentSession?.centerPath===files[1].path,'Wrong '+target+' center');
      check(first.view.documentSession.centerPath===files[0].path,'Opening another surface redirected existing center');
      if(target==='window')check(host.view.contentEl.ownerDocument!==first.view.contentEl.ownerDocument,'Popout stayed in main document');
    }
    cases.push('independent-tab-split-and-popout');c.progress={phase:'reload',cases:[...cases]};
    for(const host of hosts.splice(0).reverse())host.detach();
    p.settings.trackpadNavigation=true;p.settings.lastDrawingTemplatePath='Templates/Remembered.md';p.settings.creationNavigationFuture={retained:true};await p.saveSettings(false,false);
    await app.plugins.disablePlugin('k-plex');await app.plugins.enablePlugin('k-plex');p=app.plugins.plugins['k-plex'];
    check(p?.settings.trackpadNavigation===true&&p.settings.lastDrawingTemplatePath==='Templates/Remembered.md'&&p.settings.creationNavigationFuture?.retained===true,'Reload lost preferences or unknown keys');
    const stored=JSON.parse(await app.vault.adapter.read(app.vault.configDir+'/plugins/k-plex/data.json'));
    check(stored.trackpadNavigation===true&&stored.lastDrawingTemplatePath==='Templates/Remembered.md'&&stored.creationNavigationFuture?.retained===true,'Disk lost preferences or unknown keys');cases.push('real-plugin-reload-and-unknown-key-preservation');c.progress={phase:'cleanup',cases:[...cases]};
    return {cases,companionVersion:window.ExcalidrawAutomate?.verifyMinimumPluginVersion('2.29.1')?'2.29.1+':'older-than-2.29.1',limitations:'Programmatic native menu/wheel input; physical trackpad and mobile remain separate. Positive template creation requires a 2.29.1 companion.'};
  } catch(error) { failure=error; throw error; } finally {
    const errors=[];const clean=async(name,action)=>{try{await action()}catch(error){errors.push(name+': '+error)}};
    for(const host of hosts.reverse())await clean('owned-view',()=>host.detach());
    p=app.plugins.plugins['k-plex']??p;p.settings=original;await clean('settings',()=>p.saveSettings(false,false));
    await clean('workspace',()=>workspace.changeLayout(layout));await clean('sessions',()=>c.sessions(p).restore(saved));
    for(const file of files.reverse())if(app.vault.getFileByPath(file.path)===file)await clean('file',()=>app.vault.delete(file,true));
    if(directory&&app.vault.getFolderByPath(folder)===directory)await clean('folder',()=>app.vault.delete(directory,true));
    await clean('final-settings',async()=>{await wait(250);p.settings=original;await p.saveSettings(false,false);await app.vault.adapter.write(app.vault.configDir+'/plugins/k-plex/data.json',c.originalSettingsRaw);});
    if(errors.length)throw Error([failure,...errors].filter(Boolean).join('; '));
  }
}
const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
const originalSettingsRaw=readFileSync(join(target.pluginDir,'data.json'),'utf8');
await runControlledProbe('creation-navigation',scenario,`c.sessions=(${nativeDocumentSessions.toString()});c.originalSettingsRaw=${JSON.stringify(originalSettingsRaw)};`,[
  'src/adapters/obsidian/fileMenu.ts','src/adapters/obsidian/drawingTemplates.ts','src/ui/KplexView.tsx','src/ui/components/wheelCamera.ts','src/settings.ts',
]);
