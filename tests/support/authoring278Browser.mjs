/** Finite native ports for actual Chromium authoring shells. Production settings validation and
 * queued ontology saves remain real; vault and connection writes are explicit observable receipts. */
import {colorEditorScenario} from './colorEditorBrowser.mjs';
import {readFileSync} from 'node:fs';

export const authoringSetup=`
const M=sourceModules,check=(value,message)=>{if(!value)throw Error(message)},equal=(a,b,message)=>check(JSON.stringify(a)===JSON.stringify(b),message+' '+JSON.stringify([a,b]));
const p=await createAppearanceHost({ontologyPairingVersion:1,hierarchy:{parents:['Parent'],children:['Child'],leftFriends:['Friend'],rightFriends:['Challenger'],previous:['Previous'],next:['Next'],hidden:['Hidden'],exclusions:[]}}),t=p.translator;
const root=Object.assign(new M.TFolder(),{path:'/',name:'',parent:null,children:[]}),folder=Object.assign(new M.TFolder(),{path:'Folder',name:'Folder',parent:root,children:[]});root.children.push(folder);
const folders=new Map([['/',root],['Folder',folder]]),files=new Map(),bytes=new Map(),writes=[],links=[],events=new Map();
const addFile=(path,extension='md')=>{const name=path.split('/').pop(),file=Object.assign(new M.TFile(),{path,name,basename:name.replace(/\\.[^.]+$/,''),extension,stat:{mtime:1,size:0},parent:root});files.set(path,file);root.children.push(file);return file};
const page=file=>({path:file.path,file,name:file.basename,url:null,isFolder:false,isTag:false,neighbours:new Map(),aliases:[],tags:[],styleTags:[],noteType:null,primaryStyleTag:null});
const origin=page(addFile('Source.md')),target=page(addFile('Target.md'));
p.app={vault:{getRoot:()=>root,getAllFolders:()=>[...folders.values()],getFolderByPath:path=>folders.get(path)??null,getAbstractFileByPath:path=>files.get(path)??folders.get(path)??null,getFileByPath:path=>files.get(path)??null,getFiles:()=>[...files.values()],getMarkdownFiles:()=>[...files.values()].filter(f=>f.extension==='md'),
 on:(name,callback)=>{const ref={name,callback};let set=events.get(name);if(!set)events.set(name,set=new Set());set.add(ref);return ref},offref:ref=>events.get(ref.name)?.delete(ref),
 createFolder:async path=>{check(!files.has(path)&&!folders.has(path),'No native overwrite');const parent=folders.get(path.slice(0,path.lastIndexOf('/')))??root,item=Object.assign(new M.TFolder(),{path,name:path.split('/').pop(),parent,children:[]});parent.children.push(item);folders.set(path,item);writes.push(['folder',path]);return item},
 createBinary:async(path,data)=>{check(!files.has(path)&&!folders.has(path),'No binary overwrite');const file=addFile(path,path.split('.').pop());bytes.set(file,new Uint8Array(data).slice());writes.push(['binary',path]);return file}},
 fileManager:{getNewFileParent:()=>root,renameFile:async(file,path)=>{writes.push(['move',file.path,path]);const map=file instanceof M.TFolder?folders:files;map.delete(file.path);file.path=path;file.name=path.split('/').pop();map.set(path,file)}},metadataCache:{getFileCache:()=>({frontmatter:{}})}};
p.index.get=path=>files.has(path)?page(files.get(path)):undefined;p.index.titleFor=value=>value.name??value.path;
p.index.search=(query,limit)=>[...files.values()].filter(f=>f.path.includes(query)).slice(0,limit).map(page);p.index.relationshipStorageCandidates=()=>[origin.path,target.path];p.index.evidenceBetween=()=>[];
p.index.insertCreatedFile=file=>page(file);
p.index.invalidateSemanticPolicy=()=>{};p.index.refreshSemanticSettings=async()=>{};
p.isExcalidrawAvailable=()=>false;p.drawingTemplateOptions=()=>null;
p.createFileWithAutomation=create=>create();p.waitForCreatedFileAutomation=async()=>{};
p.createdNoteCompletionControl=()=>({value:'return',choices:['return','another'],onChange:()=>{}});
p.createNewNodeInFolder=async(parent,name)=>{const file=addFile(parent.path.slice(7)+'/'+name+'.md');writes.push(['note',file.path]);return page(file)};
p.createNewRelatedFileForOrigin=async(_origin,name)=>addFile(name+'.md');p.rememberNewNodeDefaultType=async()=>{};
p.linkNewRelatedFile=async(...args)=>{links.push(args);return {state:'saved-pending',page:page(args[2])}};
p.createRelationToPage=async(...args)=>{links.push(args);return {state:'saved-published',page:args[2]}};
p.requestNodeFlair=()=>{};p.finishNewRelatedNode=async()=>{};p.openInDocumentLeaf=async()=>{};
const host=document.body.createDiv(),leaf={view:{containerEl:host}},openComposer=(fixed,invocation={})=>{const modal=new M.NewRelatedNoteModal(p,origin,'child',undefined,leaf,fixed,invocation);modal.open();return modal};
const reactInput=(element,value)=>{const proto=element.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(element,value);element.dispatchEvent(new Event(element.tagName==='SELECT'?'change':'input',{bubbles:true}))};
const field=modal=>modal.contentEl.querySelector('.kplex-add-related-ontology-search input'),name=modal=>modal.contentEl.querySelector('.kplex-add-related-note-search input'),button=(modal,key)=>[...modal.contentEl.querySelectorAll('button')].find(b=>b.getAttribute('role')!=='tab'&&b.textContent===t(key));
`;

/** Each document owns actual React/native-shaped controls, timers and teardown independently. */
export function authoringScenario(body,{styles=false,width,height}={}){
  const css=styles?readFileSync(new URL('../../styles.css',import.meta.url),'utf8'):'';
  return colorEditorScenario(`(async()=>{${authoringSetup}\n${styles?`const productionStyles=new CSSStyleSheet();productionStyles.replaceSync(${JSON.stringify(css)});document.adoptedStyleSheets=[...document.adoptedStyleSheets,productionStyles];`:''}\n${body}\nreturn true})()`,{width,height});
}
