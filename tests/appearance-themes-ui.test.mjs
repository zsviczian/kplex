/** Actual native-shaped Settings controls and theme/reset modals in Chromium, using the production queued writer. Native Obsidian lanes separately prove installed host interactions. */
import assert from "node:assert/strict";
import test from "node:test";
import {colorEditorScenario as scenario} from "./support/colorEditorBrowser.mjs";

test("node-style dimensions inherit, clear, merge concurrently, preserve legacy values and survive failed storage",async()=>{
 assert.equal(await scenario(`(async()=>{
  const p=await createAppearanceHost({baseNodeStyle:{strokeWidth:2,gateRadius:6},noteTypeStyles:{Project:{borderColor:{kind:'theme',variable:'--text-normal'},icon:'star',strokeWidth:1.25,gateRadius:12}}}),t=p.translator;
  const tab=new sourceModules.KplexSettingTab({workspace:{on:()=>({}),offref:()=>{}}},p);
  const open=()=>{tab.openNodeStyleEditor('property','Project');return sourceModules.TestModal.instances.at(-1)};
  const save=modal=>[...modal.contentEl.querySelectorAll('button')].find(el=>el.textContent===t('common.save')).click();
  const field=(modal,key)=>modal.contentEl.querySelector('input[aria-label="'+t(key)+'"]');
  let modal=open(),before=p.writes.length;save(modal);await waitFor(()=>!modal.modalEl.isConnected);if(p.writes.length!==before||p.settings.noteTypeStyles.Project.strokeWidth!==1.25||p.settings.noteTypeStyles.Project.gateRadius!==12)throw Error('Unchanged legacy dimensions normalized');
  modal=open();if(field(modal,'filter.borderWidth').type!=='range'||field(modal,'settings.ui.gate.radius').type!=='range'||!field(modal,'filter.borderWidth').parentElement.querySelector('output'))throw Error('Native slider or visible dimension value absent');
  input(field(modal,'filter.borderWidth'),'0');input(field(modal,'settings.ui.gate.radius'),'8');await p.updateStyleSettings(d=>{d.noteTypeStyles.Project.fontSize=29});save(modal);await waitFor(()=>!modal.modalEl.isConnected);
  const style=p.settings.noteTypeStyles.Project;if(style.strokeWidth!==0||style.gateRadius!==8||style.fontSize!==29||style.icon!=='star'||style.borderColor.variable!=='--text-normal')throw Error('Dimension save lost zero or concurrent fields');
  const restarted=sourceModules.migrateAndMergeSettings(p.writes.at(-1));if(restarted.noteTypeStyles.Project.strokeWidth!==0||restarted.noteTypeStyles.Project.gateRadius!==8)throw Error('Dimensions lost on restart');
  const inherit=(modal,key)=>field(modal,key).parentElement.querySelector('button[aria-label="'+t('styles.inheritDimension',{name:t(key)})+'"]').click();
  modal=open();inherit(modal,'filter.borderWidth');inherit(modal,'settings.ui.gate.radius');const store=p.saveData;p.saveData=async()=>{throw Error('Expected dimension disk failure')};save(modal);await waitFor(()=>modal.modalEl.getAttribute('aria-busy')==='false');if(!modal.modalEl.isConnected||p.settings.noteTypeStyles.Project.gateRadius!==8||!field(modal,'filter.borderWidth').parentElement.querySelector('output').textContent.includes(t('colors.inherit')))throw Error('Failed write lost durable state/draft');p.saveData=store;save(modal);await waitFor(()=>!modal.modalEl.isConnected);
  if('strokeWidth' in p.settings.noteTypeStyles.Project||'gateRadius' in p.settings.noteTypeStyles.Project)throw Error('Empty dimensions did not restore inheritance');
  modal=open();input(field(modal,'filter.borderWidth'),'9');if(field(modal,'filter.borderWidth').value!=='8')throw Error('Native range failed to constrain the maximum');save(modal);await waitFor(()=>!modal.modalEl.isConnected);if(p.settings.noteTypeStyles.Project.strokeWidth!==8)throw Error('Bounded slider value lost');tab.disposeActionSettings();return true;
 })()`),true);
});

test("an open native color chooser cannot complete into a theme draft after A to B to A",async()=>{
 assert.equal(await scenario(`(async()=>{
  const p=await createAppearanceHost({baseNodeStyle:{textColor:{kind:'theme',variable:'--text-normal'}}}),t=p.translator;
  const tab=new sourceModules.KplexSettingTab({workspace:{on:()=>({}),offref:()=>{}}},p);tab.openStandardColor('baseNodeStyle','textColor');const modal=sourceModules.TestModal.instances.at(-1);
  modal.contentEl.querySelector('.kplex-theme-color-choice').click();const chooser=sourceModules.TestModal.instances.at(-1),choice=chooser.getSuggestions('--color-green').find(item=>item.value==='--color-green');
  await p.updateAppearanceThemes({kind:'select',id:'default'});await p.updateAppearanceThemes({kind:'select',id:'user'});await new Promise(r=>setTimeout(r,0));const before=p.writes.length;
  chooser.selectSuggestion(choice,new MouseEvent('click'));if(modal.editor.getValue().variable!=='--text-normal'||modal.canEdit()||p.writes.length!==before)throw Error('Stale chooser changed the frozen draft or settings');
  modal.retire();tab.disposeActionSettings();if(window.migrationListeners)throw Error('Stale chooser leaked');return true;
 })()`),true);
});

test("unsupported future theme libraries expose existing appearance editors read-only and survive unrelated persistence", async () => {
 assert.equal(await scenario(`(async()=>{
  const future={version:999,themes:[{opaque:{keep:['future',42]}}]},p=await createAppearanceHost({appearanceThemes:future,noteTypeStyles:{Project:{fontSize:25,textColor:'#12345680'}}}),t=p.translator;
  const tab=new sourceModules.KplexSettingTab({workspace:{on:()=>({}),offref:()=>{}}},p),before=p.writes.length;tab.openNodeStyleEditor('property','Project');
  const modal=sourceModules.TestModal.instances.at(-1);await new Promise(r=>setTimeout(r,0));
  if(!modal.contentEl.textContent.includes(t('themes.unavailable'))||modal.canEdit())throw Error('Future library editable or unexplained');
  const controls=[...modal.contentEl.querySelectorAll('input,select,button')],close=controls.find(x=>x.textContent===t('styles.operation.close'));
  if(!close||close.disabled||controls.some(x=>x!==close&&!x.disabled)||p.writes.length!==before)throw Error('Read-only controls or opening write wrong');
  modal.runOperation(async()=>{throw Error('Future operation submitted')});if(p.writes.length!==before)throw Error('Future editor wrote');close.click();
  p.settings.showFullTagNames=true;await p.persistSettingsSnapshot();if(JSON.stringify(p.writes.at(-1).appearanceThemes)!==JSON.stringify(future)||p.writes.at(-1).appearanceThemesFuture!==undefined||p.settings.noteTypeStyles.Project.fontSize!==25)throw Error('Future payload overwritten by workflow save');
  tab.disposeActionSettings();if(p.appearanceThemeListeners.size||window.migrationListeners)throw Error('Read-only editor leaked');return true;
 })()`),true);
});

test("Visual styling exposes native theme selection, accessible manager/reset icons and one durable dismissible migration message", async () => {
 assert.equal(await scenario(`(async()=>{
  const p=await createAppearanceHost({backgroundColor:'#12345680'}),t=p.translator,tab=new sourceModules.KplexSettingTab({workspace:{on:()=>({}),offref:()=>{}}},p);
  p.app=tab.app;p.manifest={id:'k-plex'};const definitions=tab.getSettingDefinitions(),visual=definitions.find(x=>x.name===t('settings.ui.visual.styling'));
  if(visual.items[0].name!==t('themes.label')||visual.items[2].name!==t('colors.colorsPage'))throw Error('Theme controls displaced existing styling pages');
  const header=new sourceModules.Setting(scope).setName(visual.items[0].name),release=visual.items[0].render(header);
  const select=()=>header.controlEl.querySelector('select'),icon=key=>header.controlEl.querySelector('button[aria-label="'+t(key)+'"]');
  if(select().value!=='user'||select().options.length!==3||!icon('themes.manage')||icon('themes.reset').disabled||header.controlEl.querySelector('[title]'))throw Error('Native identity/accessibility missing');
  const before=p.writes.length;input(select(),'default','change');await waitFor(()=>p.settings.appearanceThemes.selectedId==='default');
  await waitFor(()=>!select().disabled);if(!icon('themes.reset').disabled||p.settings.backgroundColor!==undefined)throw Error('Factory activation/reset state wrong');
  const store=p.saveData;p.saveData=async()=>{throw Error('Expected selection storage fault')};input(select(),'user','change');await waitFor(()=>!select().disabled);
  if(select().value!=='default'||p.writes.length!==before+1||p.settings.appearanceThemes.selectedId!=='default')throw Error('Failed selection published');p.saveData=store;
  input(select(),'user','change');await waitFor(()=>p.settings.appearanceThemes.selectedId==='user');await waitFor(()=>!select().disabled);
  const message=new sourceModules.Setting(scope).setName(visual.items[1].name),releaseMessage=visual.items[1].render(message);
  message.controlEl.querySelector('button').click();await waitFor(()=>p.settings.appearanceThemes.migrationNotice===false);
  if(message.settingEl.style.display!=='none'||sourceModules.migrateAndMergeSettings(p.writes.at(-1)).appearanceThemes.migrationNotice)throw Error('Dismissal not durable');
  const retired=select();for(let i=0;i<20;i++)await p.updateAppearanceThemes({kind:'rename',id:'native-base',name:'Native '+i});
  if(header.components.length!==3)throw Error('Native components accumulated across metadata updates');const writes=p.writes.length;input(retired,'default','change');await new Promise(r=>setTimeout(r,10));if(p.writes.length!==writes)throw Error('Retired same-activation control submitted');
  window.dispatchEvent(new PageTransitionEvent('pagehide'));if(p.appearanceThemeListeners.size)throw Error('Window retirement retained rows');
  releaseMessage();release();tab.disposeActionSettings();if(p.appearanceThemeListeners.size)throw Error('Header/message retained subscriptions');return true;
 })()`),true);
});

test("theme manager rows never activate; factory is immutable and create/cancel/failure retain coherent source identity", async () => {
 assert.equal(await scenario(`(async()=>{
  const p=await createAppearanceHost({backgroundColor:'#12345680',noteTypeStyles:{Project:{textColor:'#abcdef',icon:'star'}}}),t=p.translator,tab=new sourceModules.KplexSettingTab({workspace:{on:()=>({}),offref:()=>{}}},p);
  const button=(modal,key)=>[...modal.contentEl.querySelectorAll('button')].find(x=>x.textContent===t(key)),latest=()=>sourceModules.TestModal.instances.at(-1);
  const count=p.writes.length;tab.openAppearanceThemes();let manager=latest();
  const row=name=>[...manager.contentEl.querySelectorAll('.kplex-style-manager-row')].find(x=>x.textContent.includes(name));
  row('Default theme').click();let editor=latest();if(p.settings.appearanceThemes.selectedId!=='user'||!editor.contentEl.querySelector('input').disabled||!button(editor,'common.save').disabled||!button(editor,'common.delete').disabled)throw Error('Factory row activated or editable');button(editor,'common.cancel').click();
  row('User theme').click();editor=latest();button(editor,'common.save').click();if(p.writes.length!==count||editor.modalEl.isConnected)throw Error('Unchanged rename wrote');
  button(manager,'themes.create').click();editor=latest();if(!editor.contentEl.querySelector('select').textContent.includes('User theme')||editor.contentEl.querySelector('select').value!=='copy')throw Error('Copy source not explicit/default');input(editor.contentEl.querySelector('input'),'Cancelled');button(editor,'common.cancel').click();if(p.writes.length!==count)throw Error('Cancelled create wrote');
  button(manager,'themes.create').click();editor=latest();const name=editor.contentEl.querySelector('input');input(name,'User theme');if(!button(editor,'themes.create').disabled||name.getAttribute('aria-invalid')!=='true')throw Error('Duplicate name accepted');
  input(name,'Fresh copy');input(editor.contentEl.querySelector('select'),'defaults','change');const snapshot=structuredClone(p.settings),store=p.saveData;p.saveData=async()=>{throw Error('Expected create storage fault')};
  button(editor,'themes.create').click();await waitFor(()=>editor.modalEl.getAttribute('aria-busy')==='false');if(JSON.stringify(p.settings)!==JSON.stringify(snapshot)||!editor.modalEl.isConnected||name.value!=='Fresh copy')throw Error('Failed create changed state/draft');
  p.saveData=store;button(editor,'themes.create').click();await waitFor(()=>!editor.modalEl.isConnected);if(manager.modalEl.isConnected||p.settings.appearanceThemes.themes.length!==4||p.settings.appearanceThemes.selectedId==='user'||Object.keys(p.settings.noteTypeStyles).length||p.settings.backgroundColor!==undefined)throw Error('Factory create was not atomic/independent');
  const selected=p.settings.appearanceThemes.selectedId;await p.updateStyleSettings(d=>{d.baseNodeStyle.textColor='#222222'});if(p.settings.appearanceThemes.themes.find(x=>x.id==='user').appearance.base.baseNodeStyle.textColor==='#222222'||p.settings.appearanceThemes.selectedId!==selected)throw Error('Created copy shared mutable state');
  tab.disposeActionSettings();await new Promise(r=>setTimeout(r,20));if(p.appearanceThemeListeners.size||document.querySelector('iframe[sandbox]'))throw Error('Manager/editor leaked preview/owner');return true;
 })()`),true);
});

test("inactive rename/delete produce no presentation work; active delete confirms factory fallback and rejects failed storage", async () => {
 assert.equal(await scenario(`(async()=>{
  const p=await createAppearanceHost({backgroundColor:'#12345680'}),t=p.translator,tab=new sourceModules.KplexSettingTab({workspace:{on:()=>({}),offref:()=>{}}},p);let presentation=0;p.index.refreshPresentationSettings=async()=>{presentation++};
  const latest=()=>sourceModules.TestModal.instances.at(-1),button=(modal,key)=>[...modal.contentEl.querySelectorAll('button')].find(x=>x.textContent===t(key));
  tab.openAppearanceThemes();let manager=latest();const row=name=>[...manager.contentEl.querySelectorAll('.kplex-style-manager-row')].find(x=>x.textContent.includes(name));
  row('Default base + my semantic colors').click();let editor=latest();input(editor.contentEl.querySelector('input'),'Inactive');button(editor,'common.save').click();await waitFor(()=>!editor.modalEl.isConnected);
  if(p.settings.appearanceThemes.themes.find(x=>x.id==='native-base').name!=='Inactive'||p.settings.appearanceThemes.selectedId!=='user'||presentation)throw Error('Rename activated/rebuilt');
  row('Inactive').click();editor=latest();button(editor,'common.delete').click();await waitFor(()=>!editor.modalEl.isConnected);if(p.settings.appearanceThemes.themes.length!==2||p.settings.appearanceThemes.selectedId!=='user'||presentation||p.settings.backgroundColor!=='#12345680')throw Error('Inactive deletion changed appearance');
  row('User theme').click();editor=latest();button(editor,'common.delete').click();const confirm=latest();if(!confirm.titleEl.textContent.includes('User theme')||!confirm.contentEl.textContent.includes('Your notes will not be changed'))throw Error('Fallback confirmation unclear');
  const store=p.saveData,before=structuredClone(p.settings);p.saveData=async()=>{throw Error('Expected delete storage fault')};button(confirm,'common.delete').click();await waitFor(()=>confirm.modalEl.getAttribute('aria-busy')==='false');
  if(JSON.stringify(p.settings)!==JSON.stringify(before)||!confirm.modalEl.isConnected||presentation)throw Error('Failed delete published');p.saveData=store;
  button(confirm,'common.delete').click();await waitFor(()=>!confirm.modalEl.isConnected);if(p.settings.appearanceThemes.selectedId!=='default'||p.settings.appearanceThemes.themes.length!==1||p.settings.backgroundColor!==undefined||presentation!==1||manager.modalEl.isConnected||editor.modalEl.isConnected)throw Error('Active deletion did not atomically fall back');
  tab.disposeActionSettings();if(p.appearanceThemeListeners.size)throw Error('Delete retained owner');return true;
 })()`),true);
});

test("scoped reset previews never write, preserve named entries and non-color rules, and reject unreviewed concurrent scope", async () => {
 assert.equal(await scenario(`(async()=>{
  const raw={standardStyleDefaults:'native',backgroundColor:{kind:'palette',id:'shared'},baseNodeStyle:{textColor:{kind:'theme',variable:'--kplex-semantic-origin'},fontSize:25},noteTypeStyles:{Project:{textColor:{kind:'palette',id:'shared'},icon:'star'}},
   colorPreferences:{version:1,palette:[{id:'shared',name:'Shared',light:'#11223380',dark:'#aabbcc40'}],semantic:{origin:{kind:'palette',id:'shared'}},compass:{enabled:true,intensity:11,fills:{north:{kind:'palette',id:'shared'}}}},graphLenses:[{id:'lens',name:'Global',enabled:false,scope:'node',mode:'style',expression:'node.kind == "note"',style:{node:{textColor:{kind:'palette',id:'shared'},strokeWidth:3}}}]};
  const p=await createAppearanceHost(raw),t=p.translator,tab=new sourceModules.KplexSettingTab({workspace:{on:()=>({}),offref:()=>{}}},p),latest=()=>sourceModules.TestModal.instances.at(-1),button=(modal,key)=>[...modal.contentEl.querySelectorAll('button')].find(x=>x.textContent===t(key));
  tab.openThemeColorReset('base');let modal=latest();const before=p.writes.length;if(modal.contentEl.querySelector('select').value!=='base'||!modal.contentEl.textContent.includes(t('themes.baseWarning')))throw Error('Base default/warning missing');
  for(const scope of ['semantic','all','base'])input(modal.contentEl.querySelector('select'),scope,'change');if(p.writes.length!==before)throw Error('Scope preview wrote');button(modal,'common.cancel').click();
  tab.openThemeColorReset('semantic');modal=latest();if(!modal.contentEl.textContent.includes('Project')||!modal.contentEl.textContent.includes('Global')||modal.contentEl.textContent.includes(t('themes.baseWarning')))throw Error('Semantic scope unclear');
  button(modal,'themes.reset').click();await waitFor(()=>!modal.modalEl.isConnected);if(!p.settings.backgroundColor||p.settings.baseNodeStyle.textColor.variable!=='--kplex-semantic-origin'||p.settings.colorPreferences.palette.length!==1||p.settings.noteTypeStyles.Project.icon!=='star'||p.settings.noteTypeStyles.Project.textColor!==undefined||Object.keys(p.settings.colorPreferences.compass.fills).length||!p.settings.colorPreferences.compass.enabled||p.settings.colorPreferences.compass.intensity!==11||p.settings.graphLenses[0].style.node.strokeWidth!==3||p.settings.graphLenses[0].enabled)throw Error('Semantic reset crossed scope');
  tab.openThemeColorReset('base');modal=latest();await p.updateStyleSettings(d=>{d.baseNodeStyle.borderColor='#abcdef'});const count=p.writes.length;button(modal,'themes.reset').click();await waitFor(()=>modal.modalEl.getAttribute('aria-busy')==='false');if(!modal.modalEl.isConnected||p.writes.length!==count||p.settings.baseNodeStyle.borderColor!=='#abcdef')throw Error('Unreviewed source reset');button(modal,'common.cancel').click();
  tab.openColorAdoption();modal=latest();if(modal.contentEl.querySelector('select'))throw Error('Base shortcut became competing scope editor');button(modal,'colors.adoptConfirm').click();await waitFor(()=>!modal.modalEl.isConnected);if(p.settings.backgroundColor!==undefined||p.settings.baseNodeStyle.textColor!==undefined||p.settings.colorPreferences.palette.length!==1||p.settings.baseNodeStyle.fontSize!==25)throw Error('Base shortcut reset scope wrong');
  tab.disposeActionSettings();return true;
 })()`),true);
});

test("theme management windows large libraries, resolves private palettes per visible row and releases every preview", async () => {
 assert.equal(await scenario(`(async()=>{
  const p=await createAppearanceHost({backgroundColor:{kind:'palette',id:'pair'},colorPreferences:{version:1,palette:[{id:'pair',name:'Pair',light:'#12345680',dark:'#abcdef40'}],semantic:{},compass:{enabled:false,fills:{}}}}),t=p.translator;
  for(let i=0;i<40;i++){const theme=structuredClone(p.settings.appearanceThemes.themes[0]);theme.id='copy-'+i;theme.name='Copy '+i;theme.appearance.semantic.colorPreferences.palette[0].light='#ff000080';p.settings.appearanceThemes.themes.push(theme)}
  const tab=new sourceModules.KplexSettingTab({workspace:{on:()=>({}),offref:()=>{}}},p);let harvests=0;const create=createEl;window.createEl=(tag,options)=>{if(tag==='iframe')harvests++;return create(tag,options)};
  tab.openAppearanceThemes();const manager=sourceModules.TestModal.instances.at(-1),rows=()=>[...manager.contentEl.querySelectorAll('.kplex-style-manager-row')];if(rows().length!==12||!manager.contentEl.textContent.includes('43'))throw Error('Manager not bounded/counted');
  await waitFor(()=>rows()[0].querySelector('.kplex-color-swatch')?.style.getPropertyValue('--kplex-color-swatch')==='#12345680');
  const copy=rows().find(x=>x.textContent.includes('Copy 0'));await waitFor(()=>copy.querySelector('.kplex-color-swatch')?.style.getPropertyValue('--kplex-color-swatch')==='#ff000080');if(harvests!==1)throw Error('Per-theme paired harvesting '+harvests);
  manager.contentEl.querySelector('.kplex-style-manager-more').click();if(rows().length!==32)throw Error('Show more failed');input(manager.contentEl.querySelector('input[type=search]'),'no match');if(rows().length||!manager.contentEl.querySelector('.kplex-style-manager-empty'))throw Error('Empty search missing');input(manager.contentEl.querySelector('input[type=search]'),'Copy');if(rows().length!==12)throw Error('Search retained expansion');
  await p.updateAppearanceThemes({kind:'select',id:'default'});const discard=[...manager.contentEl.querySelectorAll('button')].find(x=>x.textContent===t('themes.discardDraft'));if(!discard||discard.disabled)throw Error('Stale manager has no dismissal');discard.click();tab.disposeActionSettings();window.createEl=create;await new Promise(r=>setTimeout(r,20));if(document.querySelector('iframe[sandbox]')||p.appearanceThemeListeners.size||window.migrationListeners)throw Error('Manager resource leak');return true;
 })()`),true);
});

test("theme create/delete retain saved-refresh feedback and dirty theme names never retarget after A-B-A", async () => {
 assert.equal(await scenario(`(async()=>{
  const p=await createAppearanceHost({backgroundColor:'#12345680'}),t=p.translator,tab=new sourceModules.KplexSettingTab({workspace:{on:()=>({}),offref:()=>{}}},p),latest=()=>sourceModules.TestModal.instances.at(-1),button=(modal,key)=>[...modal.contentEl.querySelectorAll('button')].find(x=>x.textContent===t(key));
  tab.openAppearanceThemes();let manager=latest();button(manager,'themes.create').click();let editor=latest();input(editor.contentEl.querySelector('input'),'Dirty name');
  const count=p.writes.length;await p.updateAppearanceThemes({kind:'select',id:'native-base'});await p.updateAppearanceThemes({kind:'select',id:'user'});
  if(!button(editor,'themes.create').disabled||editor.contentEl.querySelector('input').value!=='Dirty name')throw Error('Theme name draft retargeted');button(editor,'themes.create').dispatchEvent(new Event('click'));await new Promise(r=>setTimeout(r,10));if(p.writes.length!==count+2)throw Error('Stale name wrote');button(editor,'themes.discardDraft').click();if(manager.modalEl.isConnected)throw Error('Old manager survived child discard');
  p.index.refreshPresentationSettings=async()=>{throw Error('Expected saved presentation fault')};window.notices=[];
  tab.openAppearanceThemes();manager=latest();button(manager,'themes.create').click();editor=latest();input(editor.contentEl.querySelector('input'),'Saved despite refresh');input(editor.contentEl.querySelector('select'),'defaults','change');button(editor,'themes.create').click();await waitFor(()=>!editor.modalEl.isConnected);
  if(!window.notices.includes(t('styles.operation.savedRefreshPending'))||p.settings.appearanceThemes.themes.length!==4||p.settings.appearanceThemes.selectedId==='user')throw Error('Create lost durable recovery outcome');
  await p.updateStyleSettings(d=>{d.backgroundColor='#abcdef'});window.notices=[];tab.openAppearanceThemes();manager=latest();[...manager.contentEl.querySelectorAll('.kplex-style-manager-row')].find(x=>x.getAttribute('aria-current')==='true').click();editor=latest();button(editor,'common.delete').click();const confirmation=latest();button(confirmation,'common.delete').click();await waitFor(()=>!confirmation.modalEl.isConnected);
  if(!window.notices.includes(t('styles.operation.savedRefreshPending'))||p.settings.appearanceThemes.selectedId!=='default'||p.settings.appearanceThemes.themes.length!==3||manager.modalEl.isConnected||editor.modalEl.isConnected)throw Error('Delete lost durable recovery outcome');
  tab.disposeActionSettings();if(p.appearanceThemeListeners.size)throw Error('Recovery/stale test leaked');return true;
 })()`),true);
});

test("immediate native theme/scalar rows follow document adoption, fence replaced handlers and reflect concurrent committed fields", async () => {
 assert.equal(await scenario(`(async()=>{
  const p=await createAppearanceHost({baseLinkStyle:{strokeWidth:3}}),tab=new sourceModules.KplexSettingTab({workspace:{on:()=>({}),offref:()=>{}}},p),t=p.translator;
  const row=new sourceModules.Setting(scope).setName(t('themes.label')),release=tab.mountThemeControls(row),old=row.controlEl.querySelector('select');
  const frame=document.createElement('iframe');document.body.append(frame);const replacement=frame.contentDocument;
  for(const name of ['createEl','createDiv','createSpan','setText','empty','addClass','setCssStyles','setCssProps','toggle','onWindowMigrated'])frame.contentWindow.HTMLElement.prototype[name]=HTMLElement.prototype[name];
  replacement.body.append(row.settingEl);emitMigration(row.settingEl);
  if(row.controlEl.querySelector('select')===old||p.appearanceThemeListeners.size!==1)throw Error('Adopted header retired instead of rebinding');
  let count=p.writes.length;input(old,'default','change');await new Promise(r=>setTimeout(r,10));if(p.writes.length!==count)throw Error('Replaced pre-adoption header wrote');
  input(row.controlEl.querySelector('select'),'native-base','change');await waitFor(()=>p.settings.appearanceThemes.selectedId==='native-base');
  if(row.components.length!==3)throw Error('Adoption accumulated components');release();
  const scalar=new sourceModules.Setting(scope).setName('Width'),stop=tab.bindThemeScalar({name:'Width',control:{type:'slider',key:'baseLinkStyle.strokeWidth',min:.5,max:8,step:.5}}).render(scalar),retired=scalar.controlEl.querySelector('input');
  replacement.body.append(scalar.settingEl);emitMigration(scalar.settingEl);if(scalar.controlEl.querySelector('input')===retired)throw Error('Adopted scalar retained old realm handler');
  count=p.writes.length;input(retired,'6');await new Promise(r=>setTimeout(r,10));if(p.writes.length!==count)throw Error('Retired scalar event wrote');
  await p.updateStyleSettings(d=>{d.baseLinkStyle.strokeWidth=4});if(scalar.controlEl.querySelector('input').value!=='4')throw Error('Concurrent committed field did not refresh native peer');
  input(scalar.controlEl.querySelector('input'),'5');await waitFor(()=>p.settings.baseLinkStyle.strokeWidth===5);stop();tab.disposeActionSettings();frame.remove();if(p.appearanceThemeListeners.size||window.migrationListeners)throw Error('Adopted row ownership leaked');return true;
 })()`),true);
});

test("named-color deletion remaps only the active theme across base, semantic, Compass and lens consumers", async () => {
 assert.equal(await scenario(`(async()=>{
  const ref={kind:'palette',id:'shared'},raw={standardStyleDefaults:'native',backgroundColor:ref,baseNodeStyle:{textColor:ref},noteTypeStyles:{Project:{textColor:ref}},
   colorPreferences:{version:1,palette:[{id:'shared',name:'Shared',light:'#11223380',dark:'#aabbcc40'},{id:'replacement',name:'Replacement',light:'#ff000080',dark:'#00ff0080'}],semantic:{origin:ref},compass:{enabled:true,fills:{north:ref}}},graphLenses:[{id:'lens',name:'Global',enabled:false,scope:'node',mode:'style',expression:'node.kind == "note"',style:{node:{textColor:ref,strokeWidth:3}}}]};
  const p=await createAppearanceHost(raw),t=p.translator,tab=new sourceModules.KplexSettingTab({workspace:{on:()=>({}),offref:()=>{}}},p);await p.createAppearanceTheme('Independent',false);const inactive=structuredClone(p.settings.appearanceThemes.themes.find(x=>x.id==='user'));
  tab.openColorPalette();const palette=sourceModules.TestModal.instances.at(-1);palette.deletePair(p.settings.colorPreferences.palette[0]);const modal=sourceModules.TestModal.instances.at(-1);
  const select=modal.contentEl.querySelector('select');input(select,'named','change');modal.contentEl.querySelector('.kplex-color-source-editor button').click();const chooser=sourceModules.TestModal.instances.at(-1);chooser.selectSuggestion(chooser.getSuggestions('').find(item=>item.value.id===p.settings.colorPreferences.palette[1].id),new MouseEvent('click'));
  [...modal.contentEl.querySelectorAll('button')].find(x=>x.textContent===t('common.delete')).click();await waitFor(()=>!modal.modalEl.isConnected);
  if(p.settings.backgroundColor.id!=='replacement'||p.settings.baseNodeStyle.textColor.id!=='replacement'||p.settings.noteTypeStyles.Project.textColor.id!=='replacement'||p.settings.colorPreferences.semantic.origin.id!=='replacement'||p.settings.colorPreferences.compass.fills.north.id!=='replacement'||p.settings.graphLenses[0].style.node.textColor.id!=='replacement'||p.settings.colorPreferences.palette.some(x=>x.id==='shared'))throw Error('Active consumers/palette not atomically replaced');
  if(JSON.stringify(p.settings.appearanceThemes.themes.find(x=>x.id==='user'))!==JSON.stringify(inactive))throw Error('Inactive palette changed');
  const active=p.settings.appearanceThemes.themes.find(x=>x.id===p.settings.appearanceThemes.selectedId);if(active.appearance.base.backgroundColor.id!=='replacement'||active.appearance.semantic.colorPreferences.palette.length!==1)throw Error('Selected saved projection not synchronized');
  palette.retire();await p.updateAppearanceThemes({kind:'select',id:'user'});if(p.settings.backgroundColor.id!=='shared'||p.settings.colorPreferences.palette.length!==2||p.settings.graphLenses[0].style.node.textColor.id!=='shared'||p.settings.graphLenses[0].style.node.strokeWidth!==3||p.settings.graphLenses[0].enabled)throw Error('Theme-local palette/lens identity lost');tab.disposeActionSettings();return true;
 })()`),true);
});

test("a queued native scalar save survives Settings removal without touching its retired slider or accepting later events", async () => {
 assert.equal(await scenario(`(async()=>{
  const p=await createAppearanceHost({baseNodeStyle:{gateRadius:5}}),tab=new sourceModules.KplexSettingTab({workspace:{on:()=>({}),offref:()=>{}}},p);
  const row=new sourceModules.Setting(scope).setName('Gate radius');
  const release=tab.bindThemeScalar({name:'Gate radius',control:{type:'slider',key:'baseNodeStyle.gateRadius',min:2,max:8,step:.5}}).render(row);
  const slider=row.controlEl.querySelector('input'),descriptor=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');let touches=0;
  Object.defineProperty(slider,'value',{get(){return descriptor.get.call(this)},set(value){touches++;descriptor.set.call(this,value)}});
  const original=p.saveData;let finish,entered=false;p.saveData=async snapshot=>{entered=true;await new Promise(resolve=>{finish=resolve});return original.call(p,snapshot)};
  input(slider,'8');await waitFor(()=>entered);row.settingEl.remove();const before=touches;finish();await p.settingsWriteQueue;await new Promise(resolve=>setTimeout(resolve,20));
  if(p.settings.baseNodeStyle.gateRadius!==8||p.writes.at(-1).baseNodeStyle.gateRadius!==8)throw Error('Accepted save was canceled by Settings removal');
  if(touches!==before)throw Error('Save completion touched the retired native slider');
  p.saveData=original;const writes=p.writes.length;input(slider,'3');await new Promise(resolve=>setTimeout(resolve,20));
  if(p.writes.length!==writes)throw Error('Detached native scalar accepted a new save');
  release();tab.disposeActionSettings();return true;
 })()`),true);
});

test("theme reset and manager previews retain the stable owning Settings body after its declarative root is replaced", async () => {
 assert.equal(await scenario(`(async()=>{
  const p=await createAppearanceHost({backgroundColor:'#12345680'}),tab=new sourceModules.KplexSettingTab({workspace:{on:()=>({}),offref:()=>{}}},p),t=p.translator;
  tab.openThemeColorReset('base');const modal=sourceModules.TestModal.instances.at(-1);if(modal.preview.options.sourceScope!==document.body)throw Error('Bulk reset retained transient Settings root');
  tab.containerEl.remove();modal.preview.invalidate();await waitFor(()=>modal.preview.samples?.light.colors['--background-primary']&&[...modal.contentEl.querySelectorAll('.kplex-color-preview-canvas')].every(x=>!!x.style.getPropertyValue('--_kplex-preview-canvas')));
  if(!modal.modalEl.isConnected)throw Error('Root replacement retired valid reset draft');[...modal.contentEl.querySelectorAll('button')].find(x=>x.textContent===t('common.cancel')).click();
  tab.openAppearanceThemes();const manager=sourceModules.TestModal.instances.at(-1);if(manager.options.context.sourceScope!==document.body)throw Error('Manager retained detached Settings root');await waitFor(()=>manager.contentEl.querySelector('.kplex-color-swatch')?.style.getPropertyValue('--kplex-color-swatch'));
  manager.retire();tab.disposeActionSettings();await new Promise(r=>setTimeout(r,20));if(document.querySelector('iframe[sandbox]')||p.appearanceThemeListeners.size||window.migrationListeners)throw Error('Stable preview ownership leaked');return true;
 })()`),true);
});


test("durable style Save releases its modal while one optional refresh is held and later edits stay bounded",async()=>{
 assert.equal(await scenario(`(async()=>{
  const p=await createAppearanceHost({noteTypeStyles:{Project:{strokeWidth:1}}}),t=p.translator;
  const tab=new sourceModules.KplexSettingTab({workspace:{on:()=>({}),offref:()=>{}}},p);let release,refreshes=0;
  const refresh=p.index.refreshPresentationSettings;p.index.refreshPresentationSettings=async()=>{refreshes++;await new Promise(resolve=>release=resolve);await refresh()};
  tab.openNodeStyleEditor('property','Project');const modal=sourceModules.TestModal.instances.at(-1);
  input(modal.contentEl.querySelector('input[aria-label="'+t('filter.borderWidth')+'"]'),'2');
  [...modal.contentEl.querySelectorAll('button')].find(el=>el.textContent===t('common.save')).click();
  await waitFor(()=>p.settings.noteTypeStyles.Project.strokeWidth===2);await new Promise(r=>setTimeout(r,300));
  if(modal.modalEl.isConnected)throw Error('Durable editor remains trapped by optional refresh');
  const writes=p.writes.length;for(let n=0;n<12;n++)await p.updateStyleSettings(d=>{d.noteTypeStyles.Project.strokeWidth=3+n});
  if(p.writes.length!==writes+12||refreshes!==1)throw Error('Held optional work blocked writes or accumulated refresh tasks');
  const end=refreshes;release();p.index.refreshPresentationSettings=refresh;await new Promise(r=>setTimeout(r,30));
  if(p.settings.noteTypeStyles.Project.strokeWidth!==14||refreshes!==end)throw Error('Late refresh changed durable state');return true;
 })()`),true);
});
