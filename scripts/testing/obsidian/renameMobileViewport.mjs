/** Real Obsidian phone/tablet Modal geometry with a controlled software-keyboard VisualViewport.
 * Desktop emulation proves layout and cleanup, not physical Gboard/touch/WebView behavior. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync,rmSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {runControlledProbe} from './controlledProbe.mjs';
import {obsidianCliExecutable,spawnNativeSync} from './processTools.mjs';
import {validateTarget} from './runner.mjs';

/** Open the production rename action, resize only its visible-viewport input, and restore every native owner. */
async function scenario(app,c){
 const p=app.plugins.plugins['k-plex'],workspace=app.workspace,remote=require('@electron/remote'),win=remote.getCurrentWindow();
 const check=(ok,message)=>{if(!ok)throw Error(message)},wait=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
 const until=async(read,message)=>{const end=Date.now()+25000;while(!read()){check(!c.closed&&Date.now()<end,message);await wait(50)}};
 await until(()=>p&&!p.isStartupInitializing(),'Startup pending');check(app.isMobile,'Native mobile emulation required');
 const layout=workspace.getLayout(),settings=structuredClone(p.settings),bounds=win.getBounds(),path='Kplex-Rename-Keyboard-'+Date.now()+'.md';
 const descriptor=Object.getOwnPropertyDescriptor(window,'visualViewport');let host,file,modal,release;const cases=[];
 try{
  remote.app.show?.();remote.app.focus({steal:true});win.restore();win.show();win.focus();
  Object.assign(p.settings,{documentSyncMode:'off',sidecarOpen:false,followActiveFile:false,autoOpenCentralDocument:false,embedCentralNode:false});
  file=await app.vault.create(path,'Owned rename geometry fixture.');p.index.insertCreatedFile(file);release=p.index.acquireSemanticDemand(file.path);
  host=workspace.getLeaf('tab');await host.setViewState({type:'k-plex-react-view',active:true});await host.view.waitUntilReady();p.notifyNavigation(path,host);
  const surface=()=>[...p.actionSurfaceHosts].find(([,registration])=>registration.leaf===host)?.[0];
  const act=async id=>p.actionManager.dispatch({id,source:'internal',surfaceId:surface()});
  await until(()=>host.view.documentSession.centerPath===path&&surface(),'Native graph absent');
  for(const width of [900,420]){
   win.setSize(width,900);await wait(350);
   const viewport=new EventTarget();Object.assign(viewport,{offsetLeft:0,offsetTop:0,width:window.innerWidth,height:window.innerHeight});
   Object.defineProperty(window,'visualViewport',{configurable:true,value:viewport});
   await act('selection.center');check((await act('node.rename')).status==='opened','Native rename action absent');
   await until(()=>document.querySelector('.kplex-rename-note-modal'),'Native Modal absent');modal=document.querySelector('.kplex-rename-note-modal');
   viewport.height=300;viewport.dispatchEvent(new Event('resize'));await wait(600);
   const rect=modal.getBoundingClientRect(),content=modal.querySelector('.modal-content');
   const computed=getComputedStyle(modal);c.progress={width,rect:{top:rect.top,bottom:rect.bottom,height:rect.height},classes:modal.className,position:computed.position,minHeight:computed.minHeight,transform:computed.transform,top:computed.top,bottom:computed.bottom,visibleHeight:computed.getPropertyValue('--kplex-visible-height'),body:document.body.className};
   check(rect.top>=0&&rect.bottom<=301,'Modal escaped keyboard viewport');
   const buttons=[...modal.querySelectorAll('button')].filter(button=>[p.translator('common.rename'),p.translator('common.cancel')].includes(button.textContent));
   check(buttons.length===2,'Native rename/cancel controls absent');
   content.scrollTop=content.scrollHeight;await wait(50);
   for(const button of buttons){const b=button.getBoundingClientRect();check(b.top>=rect.top&&b.bottom<=rect.bottom+1,'Rename controls hidden by keyboard');check(document.elementFromPoint(b.left+b.width/2,b.top+b.height/2)===button,'Rename control cannot be reached')}
   buttons.find(button=>button.textContent===p.translator('common.cancel')).click();await until(()=>!document.querySelector('.kplex-rename-note-modal'),'Native cancel failed');
   check(!modal.classList.contains('kplex-mobile-fullscreen-modal'),'Viewport lease leaked after close');
   cases.push({innerWidth:window.innerWidth,phone:document.body.classList.contains('is-phone'),tablet:document.body.classList.contains('is-tablet'),keyboardViewport:viewport.height,controlsReachable:true});modal=null;
   if(descriptor)Object.defineProperty(window,'visualViewport',descriptor);else delete window.visualViewport;
  }
  return {cases,limitation:'Desktop native mobile emulation with a controlled keyboard viewport; physical Android/Gboard acceptance remains separate.'};
 }finally{
  // Escape delegates to the real native modal owner and its graph session cleanup.
  if(modal)document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  if(descriptor)Object.defineProperty(window,'visualViewport',descriptor);else delete window.visualViewport;
  if(host)host.detach();release?.();p.settings=settings;await p.saveSettings(false,false);await workspace.changeLayout(layout);win.setBounds(bounds);
  if(file&&app.vault.getFileByPath(file.path)===file)await app.vault.delete(file,true);
  await p.settingsWriteQueue;await app.vault.adapter.write(p.manifest.dir+'/data.json',c.originalData);
 }
}
const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
assert.equal(process.env.KPLEX_TEST_VAULT_NAME,'kplex-test-small');
const out=process.env.KPLEX_HOST_REPORT_DIR;assert(out);mkdirSync(out,{recursive:true});
const cli=(command,...args)=>{const r=spawnNativeSync(obsidianCliExecutable(),['vault=kplex-test-small',command,...args],{encoding:'utf8',timeout:30000,killSignal:'SIGKILL'});if(r.error||r.status!==0||/^Error:/m.test(r.stdout))throw Error(r.error?.message||r.stdout||r.stderr);return r.stdout.trim()};
const evaluate=code=>JSON.parse(cli('eval','code='+code).replace(/^=>\s*/,''));
assert.equal(cli('vault','info=path').replace(/^path\s+/,''),target.vault);
const files=['plugins/k-plex/data.json','community-plugins.json','workspace.json','workspace-mobile.json'];
const backup=files.map(name=>({path:join(target.config,name),bytes:existsSync(join(target.config,name))?readFileSync(join(target.config,name)):null}));
const mobile=evaluate('JSON.stringify(app.isMobile)');
/** Wait for the post-reload native plugin and command transport, never reuse pre-reload handles. */
async function ready(mode){const end=Date.now()+90000;while(Date.now()<end){try{if(evaluate('JSON.stringify(app.isMobile==='+mode+'&&!!app.plugins.plugins["k-plex"]?.actionManager&&!app.plugins.plugins["k-plex"].isStartupInitializing())'))return}catch{}await new Promise(resolve=>setTimeout(resolve,250))}throw Error('Mobile reload readiness deadline')}
try{
 if(!mobile){cli('eval','code=app.emulateMobile(true)');await ready(true)}
 const definitions='c.originalData='+JSON.stringify(readFileSync(join(target.pluginDir,'data.json'),'utf8'))+';';
 await runControlledProbe('rename-mobile-viewport',scenario,definitions,['src/ui/RenameNoteModal.ts','src/ui/mobileModalViewport.ts']);
}finally{
 if(!mobile){cli('eval','code=app.emulateMobile(false)');await ready(false)}
 for(const saved of backup){if(saved.bytes)writeFileSync(saved.path,saved.bytes);else rmSync(saved.path,{force:true})}
}
