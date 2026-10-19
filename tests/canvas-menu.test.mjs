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
writeFileSync(stub,`exports.Menu=class{items=[];addItem(cb){const item={setTitle(v){this.title=v;return this},setIcon(v){this.icon=v;return this},setChecked(v){this.checked=v;return this},onClick(v){this.click=v;return this}};cb(item);this.items.push(item)}addSeparator(){this.items.push({separator:true})}};
`);
await build({stdin:{resolveDir:process.cwd(),contents:`export * from './src/ui/plexContextMenu';`},outfile:join(dir,'suite.cjs'),bundle:true,platform:'node',format:'cjs',alias:{obsidian:stub}});
const{createPlexContextMenu}=(await import(pathToFileURL(join(dir,'suite.cjs')))).default;

test('desktop canvas menu routes settings/display/playback/background and ends with support',/** Checked states belong to the caller and support is invoked synchronously. */()=>{
 const calls=[];const menu=createPlexContextMenu({translate:key=>key,zen:true,fullscreen:false,fullscreenAvailable:true,runAction:id=>calls.push(id),openSettings:()=>calls.push('settings'),chooseBackground:()=>calls.push('background'),reportBug:()=>calls.push('report')});
 const items=menu.items.filter(item=>!item.separator);
 assert.deepEqual(items.map(item=>item.title),['actions.view.wander.start','actions.canvasSettings','actions.canvasZen','actions.canvasFullscreen','actions.canvasBackground','support.reportTitle']);
 assert.equal(items[2].checked,true);assert.equal(items[3].checked,false);assert.equal(menu.items.at(-2).separator,true);
 items.forEach(item=>item.click());assert.deepEqual(calls,['view.wander.start','settings','view.zen.toggle','view.fullscreen.toggle','background','report']);
});

test('unavailable fullscreen is omitted without hiding other canvas actions',/** Mobile retains every supported operation and independent Zen state. */()=>{
 const menu=createPlexContextMenu({translate:key=>key,zen:false,fullscreen:true,fullscreenAvailable:false,runAction(){},openSettings(){},chooseBackground(){},reportBug(){}});
 assert.equal(menu.items.some(item=>item.title==='actions.canvasFullscreen'),false);assert.equal(menu.items.find(item=>item.title==='actions.canvasZen').checked,false);assert.equal(menu.items.at(-1).title,'support.reportTitle');
});
