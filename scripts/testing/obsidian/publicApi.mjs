/** Native v1 acceptance against the exact staged build in the explicitly selected Small vault.
 * Reads run through the same public surface used by official CLI eval; setup/actions are kept
 * outside passive-work measurement. Existing notes are reused, and all settings/layout restore. */
import {runControlledProbe} from './controlledProbe.mjs';
import {validateTarget} from './runner.mjs';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

/** Exercise independent committed canvases and bounded graph/configuration reads in Obsidian. */
async function scenario(app,c){
  const p=app.plugins.plugins['k-plex'],api=p?.api?.v1;
  if(!api||app.vault.getFiles().length>=1000||app.setting.isOpen)throw Error('Loaded disposable Small vault required');
  const settings=structuredClone(p.settings),policy=p.savedSettingsPolicy,layout=app.workspace.getLayout(),restores=[],hosts=[],cases=[];
  const work={reads:0,parses:0,acquisitions:0,rebuilds:0,semantic:0,allPages:0};
  c.progress={phase:'setup',cases,work};
  /** Retain precise assertions while fencing a timed-out controller. */
  const check=(value,message)=>{if(c.closed||!value)throw Error(message);};
  /** Wait for actual committed state rather than inferring it from an action receipt. */
  const until=async(read,message)=>{const end=Date.now()+30000;while(!read()){check(Date.now()<end,message);await new Promise(resolve=>window.setTimeout(resolve,40));}};
  /** Observe existing operations unchanged and restore their exact owners independently. */
  const observe=(owner,key,counter)=>{const original=owner[key];check(typeof original==='function','Missing measured owner '+key);owner[key]=function(...args){work[counter]++;return original.apply(this,args)};restores.push(()=>owner[key]=original);};
  /** Only structured successful public values enter subsequent acceptance steps. */
  const value=result=>{check(result?.ok,'Public failure: '+JSON.stringify(result));return result.value;};
  /** Find the exact API identity from the native session's root, never from global focus. */
  const canvasFor=path=>value(api.canvases()).find(row=>row.root===path);
  /** A snapshot must be available and carry its exact root/attention independently of readiness. */
  const snapshot=(id,path)=>{const result=api.canvas({canvasId:id});return result.ok&&result.value.canvas.root===path&&result.value.canvas.attention===path?result.value:null;};
  try{
    await until(()=>!p.isStartupInitializing()&&!p.index.hasActiveSemanticPreparation(),'Startup did not settle');
    value(api.ontology({requireComplete:true}));const initialStatus=value(api.status());value(api.capabilities());
    if(!initialStatus.coverage.complete)check(api.search({query:'',requireComplete:true}).error?.code==='INDEX_INCOMPLETE','Incomplete index falsely proved complete');
    Object.assign(p.settings,{documentSyncMode:'off',sidecarOpen:false,embedCentralNode:false,animationSpeed:0});
    const files=app.vault.getMarkdownFiles().filter(file=>p.index.getVaultSearchPage(file.path));check(files.length>=3,'Existing fixture notes unavailable');
    const paths=files.slice(0,3).map(file=>file.path);
    const a=app.workspace.getLeaf('tab');hosts.push(a);await a.setViewState({type:'k-plex-react-view',active:true});await a.view.waitUntilReady();
    const b=app.workspace.createLeafBySplit(a,'vertical',false);hosts.push(b);await b.setViewState({type:'k-plex-react-view',active:true});await b.view.waitUntilReady();
    p.notifyNavigation(paths[0],a);p.notifyNavigation(paths[1],b);
    await until(()=>canvasFor(paths[0])&&canvasFor(paths[1]),'Independent public canvas registrations absent');
    const first=canvasFor(paths[0]),second=canvasFor(paths[1]);check(first.id!==second.id,'Canvas identities collided');
    await until(()=>snapshot(first.id,paths[0])&&snapshot(second.id,paths[1]),'Committed scenes unavailable');
    check(api.canvas().error?.code==='AMBIGUOUS_CANVAS','Omitted canvas did not reject ambiguity');
    const selection=await api.selectView({canvasId:second.id,viewId:'mindmap'});
    value(selection);await until(()=>value(api.canvases()).find(row=>row.id===second.id)?.viewId==='mindmap','Selected view did not commit');
    check(value(api.canvases()).find(row=>row.id===first.id)?.viewId===first.viewId,'View selection crossed canvases');
    const nav=value(await api.navigate({canvasId:first.id,path:paths[2]}));check(['accepted','completed'].includes(nav.status),'Invalid action receipt');
    await until(()=>snapshot(first.id,paths[2]),'Targeted navigation did not commit');
    check(snapshot(second.id,paths[1]),'Navigation crossed canvases');
    cases.push('two simultaneous canvases retain independent roots, views and targeted actions');
    await until(()=>!p.index.hasActiveSemanticPreparation(),'Action source work did not settle');
    for(const [owner,key,counter]of [[app.vault,'read','reads'],[app.vault,'cachedRead','reads'],[p.index.sourceAcquisition,'parse','parses'],[p.index.sourceAcquisition,'acquire','acquisitions'],[p.index,'rebuild','rebuilds'],[p.index,'invalidateSemanticPolicy','semantic'],[p.index,'allPages','allPages']])observe(owner,key,counter);
    c.progress.phase='passive public reads';
    for(let n=0;n<12;n++){
      const status=value(api.status()),ontology=value(api.ontology()),scene=value(api.canvas({canvasId:first.id}));
      check(typeof scene.sourceRevision==='number'&&typeof scene.configurationRevision==='number','Snapshot revision coordinates absent');
      check(scene.occurrences.some(row=>row.nodeId===paths[2]),'Committed center absent from semantic snapshot');
      check(scene.occurrences.every(row=>row.inViewport===false||row.included===true),'Viewport membership ignored filtering');
      check(scene.connections.every(edge=>edge.kind==='semantic'||edge.sourceNodeId===null&&edge.targetNodeId===null),'Structural edge invented canonical identity');
      value(api.node({id:paths[2]}));value(api.search({query:'',limit:10}));value(api.neighbors({id:paths[2],limit:10}));value(api.evidence({sourceId:paths[0],targetId:paths[1],limit:10}));
      value(api.context({canvasId:first.id}));value(api.ontologyGuide({format:'markdown'}));
      const graph=value(api.query({query:'query Native($id:ID!,$canvas:ID!){ ontology{fields{name description partner}} node(id:$id){id kind} canvas(canvasId:$canvas){sourceRevision configurationRevision scenePending occurrences{id nodeId included inViewport}} }',variables:{id:paths[2],canvas:first.id}}));
      check(!graph.errors,'GraphQL failed: '+JSON.stringify(graph.errors));
      check(Array.isArray(ontology.fields)&&typeof status.coverage.complete==='boolean','Readiness DTO missing');
    }
    check(value(api.query({query:'{__schema{queryType{name} mutationType{name}}}'})).data.__schema.mutationType===null,'GraphQL exposed mutations');
    const mutation=api.query({query:'mutation { navigate }'});check(!mutation.ok&&mutation.error.code==='UNSUPPORTED','Mutation was accepted');
    check(api.search({query:'',limit:201}).error?.code==='INVALID_ARGUMENT','Page limit was silently enlarged');
    check(api.node({id:paths[2],isCancelled:()=>true}).error?.code==='CANCELLED','Cancellation ignored');
    const revision=api.status().revision;check(api.node({id:paths[2],expectedRevision:{...revision,source:revision.source-1}}).error?.code==='STALE_REVISION','Stale publication accepted');
    for(const key of Object.keys(work))check(work[key]===0,'Passive API caused '+key);
    cases.push('repeated JSON, Markdown and actual GraphQL reads perform zero source/index work');
    cases.push('GraphQL introspection, mutation refusal, bounds, cancellation and revision fences');
    const config=value(api.configuration.list());check(config.totals&&Array.isArray(config.presets),'Configuration inventory absent');
    const preset=config.presets.find(item=>item.available);
    if(preset){const exported=value(api.configuration.export({kind:'facets',id:preset.id,allowPrivate:true}));const validated=value(api.configuration.validate(exported));check(validated.status==='valid','Native exported package failed canonical validation');cases.push('configuration inventory and canonical package export/validation');}
    const targetId='kplex240-native-lens';check(!p.settings.graphLenses.some(lens=>lens.id===targetId),'Native lens fixture collision');
    const pkg={format:'kplex-preset',version:1,kind:'lens',id:targetId,aiContext:'Native API acceptance',lens:{id:targetId,name:'Native API acceptance',scope:'node',mode:'include',expression:'note.state == "draft"'}};
    const reviewed=value(api.configuration.preview(pkg,{targetId,replace:false,lensIds:[],replacePalette:[]}));
    check((await api.configuration.apply({previewId:reviewed.previewId,confirm:false})).error?.code==='CONFIRMATION_REQUIRED','Configuration apply omitted confirmation');
    const saved=value(await api.configuration.apply({previewId:reviewed.previewId,confirm:true}));
    check(saved.state==='saved'&&saved.verified&&saved.readback.enabled===false,'Native queued import did not verify disabled lens');
    check((await api.configuration.apply({previewId:reviewed.previewId,confirm:true})).error?.code==='STALE_REVISION','Consumed preview replayed');
    for(const key of Object.keys(work))check(work[key]===0,'Disabled configuration import caused '+key);
    cases.push('confirmed one-shot queued configuration import, disabled lens and durable readback');
    for(const restore of restores.splice(0).reverse())restore();
    const popout=app.workspace.getLeaf('window');hosts.push(popout);await popout.setViewState({type:'k-plex-react-view',active:true});await popout.view.waitUntilReady();p.notifyNavigation(paths[0],popout);
    await until(()=>value(api.canvases()).some(row=>row.surface==='popout'&&row.root===paths[0]),'Popout public canvas absent');
    const remote=value(api.canvases()).find(row=>row.surface==='popout'&&row.root===paths[0]);await until(()=>snapshot(remote.id,paths[0]),'Popout committed frame absent');
    value(await api.selectView({canvasId:remote.id,viewId:'mindmap'}));await until(()=>value(api.canvases()).find(row=>row.id===remote.id)?.viewId==='mindmap','Popout view did not commit');
    check(snapshot(second.id,paths[1]),'Popout action moved main canvas');cases.push('native popout snapshot and isolated view action');
    return {cases,work,canvases:value(api.canvases()).length,coverage:value(api.coverage()),limitations:'Windows desktop native CLI. macOS and physical mobile remain separate environments; no paint/performance claim.'};
  }finally{
    const errors=[];
    /** Cleanup continues after an independent restoration failure. */
    const clean=async run=>{try{await run()}catch(error){errors.push(String(error))}};
    for(const restore of restores.reverse())await clean(restore);
    for(const host of hosts.reverse())await clean(()=>host.detach());
    await clean(()=>p.settingsWriteQueue);p.settings=settings;p.savedSettingsPolicy=policy;
    await clean(()=>p.saveSettings(false,false));await clean(()=>app.workspace.changeLayout(layout));
    await new Promise(resolve=>window.setTimeout(resolve,2500));await clean(()=>app.vault.adapter.write(p.manifest.dir+'/data.json',c.originalData));
    if(errors.length)throw Error('Public API cleanup: '+errors.join('; '));
  }
}

if(process.env.KPLEX_TEST_VAULT_NAME!=='kplex-test-small')throw Error('Explicit disposable Small vault required');
const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
await runControlledProbe('public-api-240',scenario,'c.originalData='+JSON.stringify(readFileSync(join(target.pluginDir,'data.json'),'utf8'))+';',[
  'src/main.ts','src/application/PublicApi.ts','src/application/PublicApiConfiguration.ts','src/application/PublicCanvasRegistry.ts',
  'src/adapters/obsidian/publicApiGraphql.ts','src/publicApi/createPublicApi.ts','src/ui/App.tsx','src/ui/PlexGraph.tsx','src/ui/publicCanvasScene.ts',
]);
