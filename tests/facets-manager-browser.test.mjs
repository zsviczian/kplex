/** Real registered native manager and original plugin queue/reconciliation prototypes.
 * Finite Obsidian controls surround actual preset/color/settings behavior. No alternate writer. */
import {archivedFacetPresets} from './support/facetPresetArchive.mjs';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {colorEditorScenario} from './support/colorEditorBrowser.mjs';

const initialize=`
 const ARCHIVE=${JSON.stringify(archivedFacetPresets)};
 const M=sourceModules,check=(value,message)=>{if(!value)throw Error(message)},copy=value=>structuredClone(value);
 const equal=(a,b,message)=>check(JSON.stringify(a)===JSON.stringify(b),message+' '+JSON.stringify([a,b]));
 const p=await createAppearanceHost({canvasViewSettings:{wuxing:{version:2,values:{presets:{arc:ARCHIVE.arc,para:ARCHIVE.para}}}}});p.viewSettingsRegistry=M.builtInCanvasViewSettings;p.manifest={id:'k-plex'};
 let disk=copy(p.writes.at(-1));p.writes=[];p.loadData=async()=>copy(disk);p.saveData=async value=>{disk=copy(value);p.writes.push(copy(value))};
 p.initializeSettingsReconciliation(copy(disk));
 const app={workspace:{on:()=>({}),offref:()=>{}}},tab=new M.KplexSettingTab(app,p),t=M.createTranslator('en');
 const last=()=>M.TestModal.instances.at(-1),button=(modal,label)=>[...modal.contentEl.querySelectorAll('button')].filter(row=>row.textContent===label).at(-1);
 const fields=(modal,name)=>[...modal.contentEl.querySelectorAll('input,textarea,select')].filter(input=>input.closest('.setting-item')?.querySelector('.setting-item-name')?.textContent===name);
 const manager=()=>{tab.openCanvasViewManager('wuxing');return last()};
 const edit=(manager,name)=>{[...manager.contentEl.querySelectorAll('.kplex-style-manager-row')].find(row=>row.textContent.startsWith(name)).click();return last()};
 const save=async modal=>{button(modal,t('common.save')).click();await waitFor(()=>!modal.modalEl.isConnected)};
 const close=modal=>modal.close();
 const drain=async()=>{await p.settingsWriteQueue;await Promise.resolve();await new Promise(resolve=>setTimeout(resolve,20))};
`;
const scenario=body=>colorEditorScenario(`(async()=>{${initialize}\n${body}\ntab.hide();return true})()`);

test('preset native rows align dropdowns and color actions, space help and center footer glyphs',async()=>{
 assert.equal(await scenario(`
 const css=document.createElement('style');css.textContent=${JSON.stringify(readFileSync('styles.css','utf8'))};document.head.append(css);
 const m=manager(),e=edit(m,'Wu Xing'),before=JSON.stringify(disk);
 for(const width of [920,360]){e.modalEl.style.width=width+'px';
 const source=fields(e,t('wuxing.source'))[0],layout=fields(e,t('facets.layout'))[0],help=e.contentEl.querySelector('.kplex-facet-help-settings');
 check(source.closest('.setting-item').getBoundingClientRect().top-help.getBoundingClientRect().bottom>=8,'Classification source touches help disclosure');
 const a=source.getBoundingClientRect(),b=layout.getBoundingClientRect();check(Math.abs(a.left-b.left)<1&&Math.abs(a.right-b.right)<1,'Preset dropdown columns differ');
 for(const row of e.contentEl.querySelectorAll('.kplex-style-color-row')){const control=row.querySelector(':scope > .setting-item-control'),button=control.querySelector('button'),label=row.querySelector('.setting-item-name');
 check(row.classList.contains('setting-item')&&control.contains(row.querySelector('.kplex-color-strips')),'Color row bypasses native Setting structure');
 const r=row.getBoundingClientRect(),c=control.getBoundingClientRect(),v=button.getBoundingClientRect();check(v.right<=r.right+1&&v.left>=c.left-1&&v.top>=c.top-1&&v.bottom<=c.bottom+1,'Color source escaped right-side control group');
 if(width>420)check(v.left>=label.getBoundingClientRect().right,'Color selector moved to a different label column');}
 const actions=[...e.contentEl.querySelectorAll('.kplex-modal-action-row button')];
 for(const button of actions){const box=button.getBoundingClientRect(),glyph=button.querySelector('svg').getBoundingClientRect();check(Math.abs(box.left+box.right-glyph.left-glyph.right)<1&&Math.abs(box.top+box.bottom-glyph.top-glyph.bottom)<1,'Preset footer glyph is off-center');}
 }close(e);check(JSON.stringify(disk)===before,'Layout/cancel saved a preset');close(m);css.remove();
 `),true);
});

test('per-preset focus and center links share detached Save Cancel Reset and persisted reload semantics',async()=>{
 assert.equal(await scenario(`
 const m=manager(),toggle=(editor,key,value)=>{const control=fields(editor,t(key))[0];check(control?.type==='checkbox','Native presentation toggle absent');control.checked=value;control.dispatchEvent(new Event('change',{bubbles:true}))};
 let editor=edit(m,'Wu Xing');check(fields(editor,t('facets.focusInCategory'))[0].checked===false&&fields(editor,t('facets.centerAnchoredLinks'))[0].checked===false,'Missing fields default off');
 toggle(editor,'facets.focusInCategory',true);toggle(editor,'facets.centerAnchoredLinks',true);close(editor);equal(p.writes,[],'Cancel never persists presentation draft');
 editor=edit(m,'Wu Xing');check(!fields(editor,t('facets.focusInCategory'))[0].checked,'Canceled option stayed off');toggle(editor,'facets.focusInCategory',true);await save(editor);await drain();
 let preset=disk.canvasViewSettings.wuxing.values.presets.wuxing;check(preset.focusInCategory===true&&preset.centerAnchoredLinks!==true,'First option independent');
 editor=edit(m,'Wu Xing');toggle(editor,'facets.centerAnchoredLinks',true);await save(editor);await drain();preset=disk.canvasViewSettings.wuxing.values.presets.wuxing;check(preset.focusInCategory&&preset.centerAnchoredLinks,'Both options durable through one existing writer');
 check(!disk.canvasViewSettings.wuxing.values.presets.arc.focusInCategory,'Other preset unaffected');
 editor=edit(m,'Wu Xing');const reset=[...editor.contentEl.querySelectorAll('button')].find(row=>row.getAttribute('aria-label')===t('facets.restore'));check(reset,'Explicit preset Reset reachable');reset.click();check(!fields(editor,t('facets.focusInCategory'))[0].checked&&!fields(editor,t('facets.centerAnchoredLinks'))[0].checked,'Reset restores default-off draft');close(editor);
 check(disk.canvasViewSettings.wuxing.values.presets.wuxing.centerAnchoredLinks,'Canceled reset retained accepted options');
 editor=edit(m,'Wu Xing');[...editor.contentEl.querySelectorAll('button')].find(row=>row.getAttribute('aria-label')===t('facets.restore')).click();await save(editor);await drain();
 check(!disk.canvasViewSettings.wuxing.values.presets.wuxing.focusInCategory&&!disk.canvasViewSettings.wuxing.values.presets.wuxing.centerAnchoredLinks,'Saved reset persisted default presentation');close(m);
 `),true);
});

test('help source preview Save Cancel locale and explicit reset reuse one guarded preset writer',async()=>{
 assert.equal(await scenario(`
 const m=manager(),initialDisk=JSON.stringify(disk);let editor=edit(m,'ARC'),rendered=0;
 const source='# My literal help'+String.fromCharCode(10,10)+'- A personal explanation';
 check(fields(editor,t('facets.help'))[0].value.startsWith('# ARC'),'Built-in Help is a lazy editable default');equal(p.writes,[],'Opening Help source never saves defaults');
 window.testNativeMarkdownRender=async(_app,markdown,element,path,component)=>{rendered++;check(markdown===source&&path===''&&component.loaded,'Preview uses the shared native API and current detached source');element.createEl('h1',{text:'Controlled native preview'})};
 editor.contentEl.querySelector('.kplex-facet-help-settings').open=true;input(fields(editor,t('facets.help'))[0],source);button(editor,t('facets.previewHelp')).click();await waitFor(()=>editor.contentEl.querySelector('.kplex-preset-help-preview h1'));
 check(rendered===1&&p.writes.length===0,'Preview never saves');close(editor);check(JSON.stringify(disk)===initialDisk&&window.testMarkdownComponents.every(component=>!component.loaded),'Cancel preserves accepted settings and unloads the preview');
 editor=edit(m,'ARC');input(fields(editor,t('facets.help'))[0],source);await save(editor);await drain();let preset=disk.canvasViewSettings.wuxing.values.presets.arc;
 equal([preset.helpMarkdown,preset.helpSourceLocale],[source,'en'],'Literal source and source locale persist in the same entry');equal(M.effectiveFacetHelp('arc',preset,M.createTranslator('ja')),source,'Locale change never rewrites a user override');
 editor=edit(m,'ARC');input(fields(editor,t('wuxing.spacing'))[0],88);await save(editor);equal(disk.canvasViewSettings.wuxing.values.presets.arc.helpMarkdown,source,'Unrelated preset edit retains literal Help');
 editor=edit(m,'ARC');input(fields(editor,t('facets.help'))[0],'');await save(editor);preset=disk.canvasViewSettings.wuxing.values.presets.arc;equal(M.effectiveFacetHelp('arc',preset,M.createTranslator('de')),'','An explicit blank does not silently restore a template');
 p.writes=[];editor=edit(m,'ARC');button(editor,t('facets.resetHelp')).click();check(fields(editor,t('facets.help'))[0].value.startsWith('# ARC'),'Reset restores the default only in the draft');close(editor);equal(p.writes,[],'Canceled reset does not save');equal(disk.canvasViewSettings.wuxing.values.presets.arc.helpMarkdown,'','Canceled reset preserves explicit blank');
 editor=edit(m,'ARC');button(editor,t('facets.resetHelp')).click();await save(editor);check(!Object.hasOwn(disk.canvasViewSettings.wuxing.values.presets.arc,'helpMarkdown'),'Explicit saved reset removes the literal override');
 editor=edit(m,'ARC');input(fields(editor,t('facets.help'))[0],'<script>must not execute</script>');check(button(editor,t('common.save')).disabled,'Unsafe imported/authored source cannot be saved');const prior=rendered;button(editor,t('facets.previewHelp')).click();check(rendered===prior&&editor.contentEl.textContent.includes(t('view.invalidHelp')),'Unsafe source is refused before the native renderer');close(editor);close(m);delete window.testNativeMarkdownRender;check(window.migrationListeners===0,'Help and native editor lifetimes retire');
 `),true);
});

test('native workflow defaults and stable pair overrides compose without editing relationship data',async()=>{
 assert.equal(await scenario(`
 const m=manager(),editor=edit(m,'ARC'),select=(key,value,index=0)=>{const node=fields(editor,t(key))[index];node.value=value;node.dispatchEvent(new Event('change',{bubbles:true}))};
 select('facets.layout','horizontal');editor.contentEl.querySelector('.kplex-facet-flow-settings').open=true;
 select('facets.flowDirection','both');select('facets.flowStyle','line');input(fields(editor,t('facets.flowCaption'))[0],'Default workflow');
 const pair=fields(editor,t('facets.flowPair',{source:'Add',target:'Relate'}))[0];pair.checked=true;pair.dispatchEvent(new Event('change',{bubbles:true}));
 check(editor.contentEl.querySelector('.kplex-facet-flow-settings').open,'Pair edits preserve the open native disclosure');
 input(fields(editor,t('facets.flowCaption'))[1],'');select('facets.flowDirection','backward',1);
 equal(p.writes,[],'Workflow remains inert detached configuration');await save(editor);await drain();
 const preset=disk.canvasViewSettings.wuxing.values.presets.arc;equal(preset.flow,{direction:'both',style:'line',caption:'Default workflow'},'Sequential default fields compose');equal(preset.flowOverrides,[{source:'add',target:'relate',caption:'',direction:'backward'}],'Pair stores explicit fields only, including an intentional blank caption');
 equal(preset.categories,ARCHIVE.arc.categories,'Guide editing never changes recognizers or assignment values');close(m);
 `),true);
});

test('native layout defaults preview anchors and preserve exact independent area defaults through one save',async()=>{
 assert.equal(await scenario(`
 const m=manager(),editor=edit(m,'PARA'),select=(key,value)=>{const node=fields(editor,t(key))[0];node.value=value;node.dispatchEvent(new Event('change',{bubbles:true}))};
 select('facets.layout','horizontal');check(editor.contentEl.querySelector('.kplex-facet-anchor-preview.is-horizontal.is-anchor-top'),'Native anchor preview matches the horizontal default');
 select('facets.focusAnchor','right');check(editor.contentEl.querySelector('.kplex-facet-anchor-preview.is-anchor-right'),'Explicit cardinal anchor is previewed');
 const first=editor.contentEl.querySelector('h3').parentElement,width=[...first.querySelectorAll('input')].find(node=>node.closest('.setting-item')?.querySelector('.setting-item-name')?.textContent===t('wuxing.width'));
 input(width,920);const height=[...first.querySelectorAll('input')].find(node=>node.closest('.setting-item')?.querySelector('.setting-item-name')?.textContent===t('wuxing.height'));input(height,460);
 equal(p.writes,[],'Layout and exact dimensions remain detached');await save(editor);await drain();
 const preset=disk.canvasViewSettings.wuxing.values.presets.para;equal([preset.layout,preset.focusAnchor],['horizontal','right'],'Layout and anchor use the existing preset writer');equal(preset.areaSizes.categories.projects,{width:920,height:460},'Exact area defaults compose without overwriting their other axis');close(m);
 `),true);
});

test('diagnostics dock edits compose in one detached native draft and save through the existing queue',async()=>{
 assert.equal(await scenario(`
 const m=manager(),editor=edit(m,'Wu Xing');
 check(!fields(editor,t('facets.diagnosticsArrangement')).length,'Combined mode hides the irrelevant inter-area arrangement');
 const combine=fields(editor,t('facets.combineDiagnostics'))[0];combine.checked=false;combine.dispatchEvent(new Event('change',{bubbles:true}));
 for(const [label,value]of [['facets.diagnosticsSide','left'],['facets.diagnosticsArrangement','horizontal']]){const select=fields(editor,t(label))[0];select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}))}
 const empty=fields(editor,t('facets.diagnosticsShowEmpty'))[0];empty.checked=false;empty.dispatchEvent(new Event('change',{bubbles:true}));
 equal(p.writes,[],'Dock remains a detached draft until Save');await save(editor);await drain();
 equal(disk.canvasViewSettings.wuxing.values.presets.wuxing.diagnostics,{combined:false,side:'left',orientation:'horizontal',showEmpty:false},'Sequential controls retain sibling draft changes in one queued save');
 check(p.writes.length===1,'One durable preset update');close(m);
 `),true);
});

test('selected preset deep link opens the existing editor without activating or saving a preset',async()=>{
 assert.equal(await scenario(`
 check(tab.openCanvasViewManager('wuxing','para'),'Registered target opens');
 const editor=last(),parent=M.TestModal.instances.at(-2);equal(fields(editor,t('facets.name'))[0].value,'PARA','Exact selected preset draft');
 check(fields(editor,t('wuxing.label')).length===4,'Existing four-category editor reused');equal(p.writes,[],'Opening does not save or activate');
 close(editor);close(parent);check(window.migrationListeners===0,'Deep-link child and manager retire original lifetimes');
 `),true);
});

test('Wu Xing model controls use the original preset draft and queued writer, with read-only explanatory help',async()=>{
 assert.equal(await scenario(`
 const m=manager(),editor=edit(m,'Wu Xing');
 const name=t('facets.relativeLabels'),control=fields(editor,name)[0];
 check(control&&editor.contentEl.textContent.includes(t('facets.wuxingHelp')),'Relative role help is reachable in the native preset editor');
 check(editor.contentEl.textContent.includes(t('facets.cyclesHelp')),'Both model cycles are explained');
 check(control.type==='checkbox','Original native toggle');control.checked=false;control.dispatchEvent(new Event('change',{bubbles:true}));
 equal(p.writes,[],'Model controls remain local until Save');await save(editor);await drain();
 const preset=M.facetLibrary(M.readViewConfiguration(M.builtInPlexViews.resolve('wuxing'),p.settings.canvasViewSettings)).presets.wuxing;
 check(preset.relativeLabels===false&&preset.interpretation==='wuxing','Same entry writer persists optional model presentation');
 check(preset.categories.wood.assignment==='\u{1f7e2}','Model control does not change assignment values');close(m);
 `),true);
});

test('registered Settings opens searchable presets without saving defaults or choosing a canvas preset',async()=>{
 assert.equal(await scenario(`
 const a=new M.PlexViewSession(M.builtInPlexViews,()=>{}),b=new M.PlexViewSession(M.builtInPlexViews,()=>{});a.select('wuxing');b.select('wuxing');
 const before=[copy(a.getState()),copy(b.getState())],m=manager();
 check(m.contentEl.querySelectorAll('.kplex-style-manager-row').length===4,'Two built-ins and two explicitly saved archive fixtures');
 input(m.contentEl.querySelector('input[type=search]'),'para');check(m.contentEl.querySelectorAll('.kplex-style-manager-row').length===1,'Shared searchable manager');
 equal(p.writes,[],'Opening/filtering never saves');equal([a.getState(),b.getState()],before,'Manager never chooses canvas state');
 const pages=M.builtInCanvasViewSettings.pages({translate:t,areaTint:()=>({name:'Tint'}),openManager:()=>{}});
 const page=pages.find(page=>page.name==='Facets');check(page.items.some(item=>item.name===t('facets.manage')&&typeof item.action==='function'),'Existing native page exposes registered manager action');
 close(m);a.dispose();b.dispose();check(window.migrationListeners===0,'Manager native lifecycle released');
 `),true);
});

test('preset editing saves one sparse stable entry with category labels, aliases, canonical assignment and order',async()=>{
 assert.equal(await scenario(`
 const m=manager(),e=edit(m,'ARC'),initial=copy(ARCHIVE.arc);
 input(fields(e,t('facets.name'))[0],'My ARC');input(fields(e,t('wuxing.label'))[0],'Ideas');
 input(fields(e,t('wuxing.spacing'))[0],88);input(fields(e,t('wuxing.width'))[0],440);
 input(fields(e,t('wuxing.values'))[0],['inbox','Idea','idea'].join(String.fromCharCode(10)));input(fields(e,t('facets.assignment'))[0],'inbox');
 const first=e.contentEl.querySelector('h3').parentElement;[...first.querySelectorAll('button')].find(row=>row.textContent===t('facets.moveDown')).click();
 await save(e);equal(Object.keys(disk.canvasViewSettings.wuxing.values.presets).sort(),['arc','para'],'Only addressed saved entry changes; sibling retained');
 const preset=disk.canvasViewSettings.wuxing.values.presets.arc;equal(preset.order,['relate','add','communicate'],'Category stable IDs reordered');
 equal(preset.categories.add.values,['inbox','Idea','idea'],'Exact aliases retain case');equal(preset.categories.add.assignment,'inbox','Explicit canonical value');
 equal(preset.categories.add.label,'Ideas','Rename does not change category ID');equal(preset.categories.relate,initial.categories.relate,'Other category unchanged');
 equal([preset.spacing,preset.regionWidth],[88,440],'Native preset layout defaults share the same saved fields as canvas rails');
 check(p.writes.length===1,'One durable entry operation');equal(M.facetLibrary(p.readCanvasViewConfiguration('wuxing')).presets.para,ARCHIVE.para,'Untouched saved archive entry remains unchanged');
 close(m);check(window.migrationListeners===0,'Nested native editors released');
 `),true);
});

test('manager preset reordering retains unknown order intent and persists through the existing queue',async()=>{
 assert.equal(await scenario(`
 await p.updateCanvasViewConfiguration('wuxing',{field:'presetOrder'},{kind:'set',value:['future-meta','arc','para','wuxing','gtd','eaccess']});p.writes=[];
 const m=manager(),row=[...m.contentEl.querySelectorAll('.kplex-style-manager-row')].find(row=>row.textContent.startsWith('ARC'));
 [...row.nextElementSibling.querySelectorAll('button')].find(button=>button.textContent===t('facets.moveDown')).click();await waitFor(()=>!m.modalEl.isConnected);
 equal(disk.canvasViewSettings.wuxing.values.presetOrder,['future-meta','para','arc','wuxing','gtd','eaccess','map-roles'],'Unknown ordering ID retained while adjacent known presets move and new inherited entries remain ordered');
 equal(disk.canvasViewSettings.wuxing.values.presets,{arc:ARCHIVE.arc,para:ARCHIVE.para},'Ordering retains the exact saved preset map');check(p.writes.length===1,'One queued order write');
 `),true);
});

test('create and duplicate preserve stable originals, category count bounds and explicit cancellation',async()=>{
 assert.equal(await scenario(`
 const m=manager();button(m,t('facets.create')).click();let e=last();
 for(let i=0;i<4;i++)button(e,t('facets.addCategory')).click();check(e.contentEl.querySelectorAll('h3').length===7,'Seven categories admitted');
 check(button(e,t('facets.addCategory')).disabled,'Eighth category unavailable');close(e);equal(p.writes,[],'Cancel discards new identity and category draft');
 e=edit(m,'PARA');button(e,t('facets.duplicate')).click();const duplicate=last();input(fields(duplicate,t('facets.name'))[0],'Project state');await save(duplicate);
 const entries=disk.canvasViewSettings.wuxing.values.presets,ids=Object.keys(entries).filter(id=>id.startsWith('preset-'));check(Object.keys(entries).length===3&&ids.length===1,'Duplicate gets one independent stable ID');
 equal(entries[ids[0]].order,ARCHIVE.para.order,'Duplicate retains category IDs within independent preset');
 equal(M.facetLibrary(p.readCanvasViewConfiguration('wuxing')).presets.para,ARCHIVE.para,'Original saved entry unmodified');
 close(e);close(m);check(window.migrationListeners===0,'Duplicate and original child lifetimes released');
 `),true);
});

test('deletion requires explicit replacement, Cancel retains the editor and restored sessions resolve the redirect',async()=>{
 assert.equal(await scenario(`
 const m=manager(),e=edit(m,'ARC');button(e,t('common.delete')).click();let confirmation=last();
 check(button(confirmation,t('common.delete')).disabled,'Deletion has no implicit replacement');close(confirmation);
 check(e.modalEl.isConnected&&p.writes.length===0,'Cancel retains parent draft and settings');
 button(e,t('common.delete')).click();confirmation=last();input(confirmation.contentEl.querySelector('select'),'para','change');
 button(confirmation,t('common.delete')).click();await waitFor(()=>!confirmation.modalEl.isConnected);await drain();
 equal(disk.canvasViewSettings.wuxing.values.presets.arc,{version:1,replacement:'para'},'One atomic explicit replacement');
 const resolution=M.resolveFacetPreset(M.facetLibrary(p.readCanvasViewConfiguration('wuxing')),'arc');check(resolution.id==='para'&&resolution.status==='replaced','Closed/restored ARC intent follows explicit redirect');
 const contribution=p.viewSettingsRegistry.contribution(p.viewSettingsRegistry.definition('wuxing')),configuration=p.readCanvasViewConfiguration('wuxing');
 const choice=contribution.choices({configuration,state:{version:1,preset:'arc'}})[0];check(choice.selected==='para'&&!choice.options.some(option=>option.id==='arc'),'Valid retired preset resolves without an unavailable dropdown placeholder');
 const missing=contribution.choices({configuration,state:{version:1,preset:'missing'}})[0];check(missing.options[0].id==='missing'&&missing.options[0].enabled===false,'Genuinely missing requested presets retain their explicit unavailable recovery entry');
 close(m);check(window.migrationListeners===0,'Deletion lifetimes released');
 `),true);
});

test('same-entry changes retain the stale draft while sibling preset edits rebase safely',async()=>{
 assert.equal(await scenario(`
 const m=manager(),e=edit(m,'ARC');input(fields(e,t('facets.name'))[0],'Unsaved local');
 await p.updateCanvasViewConfiguration('wuxing',{field:'presets',path:['para','name']},{kind:'set',value:'Remote PARA'});
 await save(e);check(disk.canvasViewSettings.wuxing.values.presets.arc.name==='Unsaved local'&&disk.canvasViewSettings.wuxing.values.presets.para.name==='Remote PARA','Sibling saves both retained');
 const stale=edit(m,'Unsaved local');input(fields(stale,t('facets.name'))[0],'Keep my draft');
 await p.updateCanvasViewConfiguration('wuxing',{field:'presets',path:['arc','name']},{kind:'set',value:'New accepted ARC'});
 check(button(stale,t('common.save')).disabled,'Changed opening entry excludes Save');check(fields(stale,t('facets.name'))[0].value==='Keep my draft','Stale draft retained');
 check(stale.contentEl.textContent.includes(t('facets.staleDraft')),'Actionable stale ownership message');close(stale);close(m);
 `),true);
});

test('native retirement before queue acceptance cannot publish the captured preset draft',async()=>{
 assert.equal(await scenario(`
 const m=manager(),e=edit(m,'ARC');input(fields(e,t('facets.name'))[0],'Retired write');
 let release;p.settingsWriteQueue=new Promise(resolve=>release=resolve);button(e,t('common.save')).click();
 e.retire();release();await drain();equal(p.writes,[],'Retired queued operation never saves');equal(disk.canvasViewSettings.wuxing.values.presets.arc,ARCHIVE.arc,'Retired operation preserves the saved archive entry');close(m);
 `),true);
});

test('unchanged Save and canceled template restoration do not write, while explicit restore retains sibling presets',async()=>{
 assert.equal(await scenario(`
 const m=manager();await save(edit(m,'Wu Xing'));equal(p.writes,[],'Unchanged Save has no settings or presentation work');
 await p.updateCanvasViewConfiguration('wuxing',{field:'presets',path:['wuxing','name']},{kind:'set',value:'Custom Wu Xing'});
 await p.updateCanvasViewConfiguration('wuxing',{field:'presets',path:['para','name']},{kind:'set',value:'My PARA'});p.writes=[];
 let e=edit(m,'Custom Wu Xing');button(e,t('facets.restore')).click();close(e);equal(p.writes,[],'Restore is a detached draft until explicit Save');
 e=edit(m,'Custom Wu Xing');button(e,t('facets.restore')).click();await save(e);
 equal(disk.canvasViewSettings.wuxing.values.presets.wuxing,M.FACET_TEMPLATES.wuxing,'Explicit restore matches the ordinary template');
 check(disk.canvasViewSettings.wuxing.values.presets.para.name==='My PARA','Sibling preset retained');close(m);
 `),true);
});

test('real shared color-source child edits only the detached preset until parent Save',async()=>{
 assert.equal(await scenario(`
 const m=manager(),e=edit(m,'ARC'),row=e.contentEl.querySelector('.kplex-style-row');
 row.querySelector(':scope > .setting-item-control > button').click();const child=last();chooseThemeColor(child,'--color-green');button(child,t('colors.useColor')).click();await waitFor(()=>!child.modalEl.isConnected);
 equal(p.writes,[],'Choosing a source in the child does not persist the parent draft');await save(e);
 equal(disk.canvasViewSettings.wuxing.values.presets.arc.categories.add.color,{kind:'theme',variable:'--color-green'},'Parent Save retains the source identity');
 close(m);check(window.migrationListeners===0,'Shared color child resources retired');
 `),true);
});

test('failed durable save preserves the exact native draft and allows cancellation',async()=>{
 assert.equal(await scenario(`
 const m=manager(),e=edit(m,'ARC');input(fields(e,t('facets.name'))[0],'Keep this failed draft');let attempts=0;
 p.saveData=async()=>{attempts++;throw Error('Expected native disk failure')};button(e,t('common.save')).click();
 await waitFor(()=>attempts===1&&e.modalEl.getAttribute('aria-busy')==='false');
 check(e.modalEl.isConnected&&fields(e,t('facets.name'))[0].value==='Keep this failed draft','Exact rejected draft stays open');
 check(e.contentEl.textContent.includes(t('styles.operation.notSaved')),'Truthful actionable save failure');equal(disk.canvasViewSettings.wuxing.values.presets.arc,ARCHIVE.arc,'Failed write preserves accepted archive entry');
 close(e);close(m);check(window.migrationListeners===0,'Failed draft remains cleanly disposable');
 `),true);
});

test('registered preset palette uses are protected and new missing references reject inside the original writer',async()=>{
 assert.equal(await scenario(`
 const address={field:'presets',path:['arc','categories','add','color']};let failed=false;
 try{await p.updateCanvasViewConfiguration('wuxing',address,{kind:'set',value:{kind:'palette',id:'color-missing'}})}catch{failed=true}
 check(failed&&p.writes.length===0,'Missing new named reference cannot be saved');
 await p.updateStyleSettings(draft=>{draft.colorPreferences.palette.push({id:'color-preset',name:'Preset pair',light:'#eeee22',dark:'#222288'})});p.writes=[];
 await p.updateCanvasViewConfiguration('wuxing',address,{kind:'set',value:{kind:'palette',id:'color-preset'}});
 const uses=M.builtInCanvasViewSettings.paletteUsage(p.settings.canvasViewSettings);check(uses.available&&uses.uses.get('color-preset')===1,'Exact configured use counted once');
 tab.openColorPalette();const palette=last(),row=palette.contentEl.querySelector('[data-kplex-color-id="color-preset"]');
 check(button({contentEl:row},t('common.delete')).disabled&&row.textContent.includes(t('facets.paletteProtected')),'Existing palette manager protects the other settings owner');
 close(palette);check(!M.builtInCanvasViewSettings.paletteUsage({'future.view':{version:2,values:{}}}).available,'Unknown view metadata excludes unsafe deletion');
 `),true);
});


test('category Code editor shares full-width expression styling and shows only relevant fields',async()=>{
 assert.equal(await scenario(`
 const css=document.createElement('style');css.textContent=${JSON.stringify(readFileSync('styles.css','utf8'))};document.head.append(css);document.body.style.setProperty('--font-ui-smaller','12px');document.body.style.setProperty('--font-monospace','monospace');
 const m=manager(),e=edit(m,'ARC'),unchanged=JSON.stringify(disk),field=fields(e,t('wuxing.field'))[0].value,values=fields(e,t('wuxing.values'))[0].value;
 input(fields(e,t('wuxing.source'))[0],'rules','change');await waitFor(()=>e.contentEl.querySelector('.kplex-predicate-rule-editor'));
 check(fields(e,t('wuxing.field')).length===0&&fields(e,t('wuxing.values')).length===0&&fields(e,t('facets.assignment')).length===0,'Rules hide property-only settings without discarding their draft');
 const rule=e.contentEl.querySelector('.kplex-predicate-rule-editor');[...rule.querySelectorAll('button')].find(b=>b.textContent.trim()===t('filter.code')).click();await waitFor(()=>rule.querySelector('.kplex-predicate-expression-field textarea'));
 const textarea=rule.querySelector('textarea'),label=textarea.parentElement.querySelector('span');for(const width of [960,620,360]){e.modalEl.style.width=width+'px';const r=textarea.getBoundingClientRect(),parent=rule.getBoundingClientRect(),name=label.getBoundingClientRect();check(Math.abs(r.width-parent.width)<2&&r.top>=name.bottom,'Expression uses the complete available width below its label');check(r.height>=60&&getComputedStyle(textarea).fontFamily.includes('monospace'),'Readable code height and shared monospace style');}
 const expression='note.learningMode == "read" and note.sessionSize == "short"';textarea.focus();Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(textarea,expression);textarea.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,40));check(rule.querySelector('textarea')===textarea&&document.activeElement===textarea&&textarea.value===expression,'Typing retains the mounted code editor and focus');
 input(fields(e,t('wuxing.source'))[0],'property','change');check(fields(e,t('wuxing.field'))[0].value===field&&fields(e,t('wuxing.values'))[0].value===values,'Source switching preserves hidden sibling values');close(e);check(JSON.stringify(disk)===unchanged,'Layout/source preview did not save a draft');close(m);css.remove();
 `),true);
});
