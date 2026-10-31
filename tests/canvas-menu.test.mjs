/**
 * Compiled canvas-menu routing. Alpha/source, pending Save and retirement contracts live in color-editors.test.mjs. Finite Obsidian component
 * doubles observe callbacks/lifetimes only; installed typings, production build and the native lane
 * remain authoritative for real Menu, Modal and ColorComponent behavior.
 */
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import test from 'node:test';
const dir=mkdtempSync(join(tmpdir(),'kplex-canvas-menu-'));
process.on('exit',/** Retire only this suite's emitted fixture. */()=>rmSync(dir,{recursive:true,force:true}));
const stub=join(dir,'obsidian.cjs');
writeFileSync(stub,`exports.Menu=class{items=[];addItem(cb){const item={setTitle(v){this.title=v;return this},setIcon(v){this.icon=v;return this},setChecked(v){this.checked=v;return this},setDisabled(v){this.disabled=v;return this},setIsLabel(v){this.isLabel=v;return this},onClick(v){this.click=v;return this}};if(exports.Menu.nativeSubmenus)item.setSubmenu=function(){return this.submenu??=new exports.Menu()};cb(item);this.items.push(item)}addSeparator(){this.items.push({separator:true})}};
`);
await build({stdin:{resolveDir:process.cwd(),contents:`export * from './src/ui/plexContextMenu';export{Menu}from'obsidian';`},outfile:join(dir,'suite.cjs'),bundle:true,platform:'node',format:'cjs',alias:{obsidian:stub}});
const{createPlexContextMenu,Menu}=(await import(pathToFileURL(join(dir,'suite.cjs')))).default;

test('desktop canvas menu routes settings/display/playback/background and ends with support',/** Checked states belong to the caller and support is invoked synchronously. */()=>{
 const calls=[];const menu=createPlexContextMenu({translate:key=>key,zen:true,fullscreen:false,fullscreenAvailable:true,runAction:id=>calls.push(id),openSettings:()=>calls.push('settings'),chooseBackground:()=>calls.push('background'),reportBug:()=>calls.push('report'),breadcrumbsAvailable:true,exportBreadcrumbs:()=>calls.push('breadcrumbs')});
 const items=menu.items.filter(item=>!item.separator);
 assert.deepEqual(items.map(item=>item.title),['actions.view.wander.start','export.menu','export.canvasMarkdown','export.canvasImage','export.breadcrumbsMarkdown','actions.canvasSettings','actions.canvasZen','actions.canvasFullscreen','actions.canvasBackground','support.reportTitle']);
 assert.equal(items[6].checked,true);assert.equal(items[7].checked,false);assert.equal(menu.items.at(-2).separator,true);
 items.filter(item=>item.click).forEach(item=>item.click());assert.deepEqual(calls,['view.wander.start','view.export.markdown','view.export.image','breadcrumbs','settings','view.zen.toggle','view.fullscreen.toggle','background','report']);
});

test('unavailable fullscreen is omitted without hiding other canvas actions',/** Mobile retains every supported operation and independent Zen state. */()=>{
 const menu=createPlexContextMenu({translate:key=>key,zen:false,fullscreen:true,fullscreenAvailable:false,runAction(){},openSettings(){},chooseBackground(){},reportBug(){}});
 assert.equal(menu.items.some(item=>item.title==='actions.canvasFullscreen'),false);assert.equal(menu.items.find(item=>item.title==='actions.canvasZen').checked,false);assert.equal(menu.items.at(-1).title,'support.reportTitle');
});

test('View submenu renders current view and subview checks through native menus and the flat fallback',async()=>{
 for(const native of [false,true]){
  Menu.nativeSubmenus=native;
  try{
   let choices=0;
   const menu=createPlexContextMenu({translate:key=>key,zen:false,fullscreen:false,fullscreenAvailable:false,runAction(){},openSettings(){},chooseBackground(){},reportBug(){},
    views:[{id:'plain',kind:'action',label:{literal:'Plain view'},enabled:true,checked:false,command:{run:async()=>({status:'completed'})}},
     {id:'plugin',kind:'submenu',label:{literal:'Plugin view'},checked:true,enabled:true,items:[
      {id:'subview',kind:'action',label:{literal:'Subview'},enabled:true,checked:true,command:{run:async()=>{choices++;return{status:'completed'}}}},
     ]}]});
   const group=native?menu.items.find(row=>row.title==='view.menu').submenu.items:menu.items;
   const parent=group.find(row=>row.title===(native?'✓ Plugin view':'Plugin view'));assert.equal(parent.checked,native?null:true);
   const selected=(native?parent.submenu.items:group).find(row=>row.title==='Subview');assert.equal(selected.checked,true);
   selected.click();await Promise.resolve();assert.equal(choices,1);assert.equal(menu.items.at(-1).title,'support.reportTitle');
  }finally{Menu.nativeSubmenus=false;}
 }
});

/** Reproduce the installed Obsidian conversion before Electron builds the OS menu. Boolean
 * checked values force checkbox type, overriding a parent item's otherwise valid submenu. */
function nativeTemplate(menu){return menu.items.map(/** Retain only the fields relevant to host menu typing. */ item=>item.separator?{type:'separator'}:{
 label:item.title,type:typeof item.checked==='boolean'?'checkbox':undefined,checked:item.checked,
 ...(item.submenu?{submenu:nativeTemplate(item.submenu)}:{}),
})}

test('selected and unselected view parents survive native template conversion as submenus',()=>{
 Menu.nativeSubmenus=true;
 try{
  for(const checked of [false,true]){
   const menu=createPlexContextMenu({translate:key=>key,zen:false,fullscreen:false,fullscreenAvailable:false,runAction(){},openSettings(){},chooseBackground(){},reportBug(){},
    views:[{id:'plugin',kind:'submenu',label:{literal:'Plugin view'},checked,enabled:true,items:[
     {id:'preset',kind:'action',label:{literal:'Preset'},checked,enabled:true,command:{run:async()=>({status:'completed'})}},
    ]}]});
   const view=nativeTemplate(menu).find(row=>row.label==='view.menu').submenu[0];
   assert.equal(view.label,checked?'✓ Plugin view':'Plugin view');assert.equal(view.type,undefined,'A submenu parent must never become a checkbox');
   assert.equal(view.checked,null);assert.equal(view.submenu.length,1);assert.equal(view.submenu[0].type,'checkbox');assert.equal(view.submenu[0].checked,checked);
  }
  const broken=new Menu();broken.addItem(item=>{item.setTitle('Broken').setChecked(false);item.setSubmenu().addItem(child=>child.setTitle('Child'))});
  assert.equal(nativeTemplate(broken)[0].type,'checkbox','Negative control reproduces the original native type collision');
 }finally{Menu.nativeSubmenus=false;}
});

test('registered native submenu fallback preserves common items and checked/disabled contribution meaning',async()=>{
 const calls=[];const menu=createPlexContextMenu({translate:key=>key,zen:false,fullscreen:false,fullscreenAvailable:false,runAction(){},openSettings(){},chooseBackground(){},reportBug(){},
  contributions:[{kind:'submenu',id:'presets',label:{literal:'Presets'},enabled:true,items:[
   {kind:'action',id:'one',label:{literal:'One'},checked:true,enabled:true,command:{run:async()=>{calls.push('one');return{status:'completed'}}}},
   {kind:'action',id:'two',label:{literal:'Two'},enabled:false,unavailableReason:{literal:'Not available'},command:{run:async()=>{throw Error('Disabled must not run')}}},
  ]}]});
 assert.equal(menu.items.find(item=>item.title==='Presets').isLabel,true,'Minimum host uses native flat fallback');
 const one=menu.items.find(item=>item.title==='One'),two=menu.items.find(item=>item.title==='Two — Not available');
 assert.equal(one.checked,true);assert.equal(two.disabled,true);one.click();two.click();await Promise.resolve();assert.deepEqual(calls,['one']);
 assert.equal(menu.items.at(-1).title,'support.reportTitle');assert.equal(menu.items.some(item=>item.title==='actions.canvasSettings'),true);
});

/** Actual host submenu capability groups exactly the three export actions without duplicating top-level entries. */
test('native Export submenu routes all three actions and disables empty breadcrumbs',()=>{
 Menu.nativeSubmenus=true;
 try{
  const calls=[],menu=createPlexContextMenu({translate:key=>key,zen:false,fullscreen:false,fullscreenAvailable:false,runAction:id=>calls.push(id),openSettings(){},chooseBackground(){},reportBug(){},breadcrumbsAvailable:true,exportBreadcrumbs:()=>calls.push('breadcrumbs')});
  const exports=menu.items.find(item=>item.title==='export.menu').submenu.items;
  assert.deepEqual(exports.map(item=>item.title),['export.canvasMarkdown','export.canvasImage','export.breadcrumbsMarkdown']);
  exports.forEach(item=>item.click());assert.deepEqual(calls,['view.export.markdown','view.export.image','breadcrumbs']);
  assert.equal(menu.items.some(item=>item.title==='export.canvasImage'),false);
  const empty=createPlexContextMenu({translate:key=>key,zen:false,fullscreen:false,fullscreenAvailable:false,runAction(){},openSettings(){},chooseBackground(){},reportBug(){},breadcrumbsAvailable:false,exportBreadcrumbs:()=>calls.push('unexpected')});
  const breadcrumbs=empty.items.find(item=>item.title==='export.menu').submenu.items[2];assert.equal(breadcrumbs.disabled,true);breadcrumbs.click();assert.equal(calls.includes('unexpected'),false);
 }finally{Menu.nativeSubmenus=false}
});
