/** Real-XML/DOM acceptance for the production content adapter and a confined companion double. */
import assert from "node:assert/strict";
import {build} from "esbuild";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {chromiumHarness} from "./support/browserTypeScript.mjs";

const root = new URL("../", import.meta.url);
const source = `import {inspectPublicationContent,capturePublicationContent} from './src/adapters/obsidian/publishContent.ts';
import {sanitizePublicationContent} from './src/ui/features/publicationContent.ts';
window.sourceModules = window.contentTest = {inspectPublicationContent,capturePublicationContent,sanitizePublicationContent};`;
const obsidian = `export class FileView {} export class TextFileView extends FileView {} export class TFile {} export class TFolder {}
export class Component {} export class WorkspaceLeaf {} export class WorkspaceSplit {} export class MarkdownView extends TextFileView {}
export class Notice {} export class Menu {} export class Modal {} export class AbstractInputSuggest {}
export const Platform={isDesktopApp:true}; export const apiVersion='1.13.0';
export function parseLinktext(text){const index=text.indexOf('#');return index<0?{path:text,subpath:''}:{path:text.slice(0,index),subpath:text.slice(index)}}
export function getFrontMatterInfo(source){const match=/^---\\r?\\n[\\s\\S]*?\\r?\\n---(?:\\r?\\n|$)/.exec(source);return {exists:!!match,contentStart:match?.[0].length??0}}
export function normalizePath(path){return path} export function getAllTags(){return []}
export function setIcon(){} export function getIcon(){return null} export function requireApiVersion(){return true}
export function getLanguage(){return 'en'} export function parseYaml(){return {}}`;

/** Build the real Markdown opener, sanitizers and drawing companion adapter into a browser test realm. */
async function fixture() {
  const result = await build({stdin: {contents: source, resolveDir: fileURLToPath(root)},
    bundle: true, write: false, format: "iife", target: "es2021", platform: "browser", plugins: [{name: "obsidian-fixture", setup(plugin) {
      plugin.onResolve({filter: /^obsidian$/}, () => ({path: "fixture", namespace: "virtual"}));
      plugin.onLoad({filter: /^fixture$/, namespace: "virtual"}, () => ({contents: obsidian}));
    }}]});
  return chromiumHarness(result.outputFiles[0].text);
}

test("publication content excludes hidden references and validates named media before emitting inert XHTML", async () => {
  const host = await fixture();
  try {
    const report = await host.evaluate(`(async()=>{
      const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
      const marker='PRIVATE_PUBLICATION_SENTINEL';
      const headline='Inspection';
      const bodies={
        'Public.md': ["---", "Secret: " + marker, "---", "# Heading", "", "**visible** [[Private/"+marker+"]] [[Other#Inspection|meeting]]", "", "![[Other#Inspection]]", "", "(Hidden:: "+marker+")", "", "%%"+marker+"%%", "", "![[picture.png]] ![[Private/"+marker+".png]]", "", "![pixel](https://example.invalid/leak-"+marker+")", "", '<img src="https://example.invalid/'+marker+'" />', "", "<obsidian://open?file="+marker+">", "", "Public block ^example", "", "| A |", "| - |", "| B |"].join('\\n'),
        'Other.md':'# '+headline+'\\n\\nSelected excerpt\\n\\n# Remaining\\n\\nKeep separately',
        ['Private/'+marker+'.md']:'unapproved bytes'
      };
      const image=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jAtsAAAAASUVORK5CYII='),x=>x.charCodeAt(0));
      const hidden=new TextEncoder().encode(marker), extra=new Uint8Array(12+hidden.length);
      new DataView(extra.buffer).setUint32(0,hidden.length);extra.set(new TextEncoder().encode('tEXt'),4);extra.set(hidden,8);
      const media=new Uint8Array(image.length+extra.length);media.set(image.subarray(0,33));media.set(extra,33);media.set(image.subarray(33),33+extra.length);
      const files=new Map(Object.entries(bodies).map(([path,body])=>[path,{path,basename:path.slice(0,-3).split('/').at(-1),extension:'md',stat:{size:body.length,mtime:1}}]));
      files.set('picture.png',{path:'picture.png',basename:'picture',extension:'png',stat:{size:media.byteLength,mtime:1}});
      const privateMedia='Private/'+marker+'.png';
      files.set(privateMedia,{path:privateMedia,basename:marker,extension:'png',stat:{size:media.byteLength,mtime:1}});
      const reads=[], binaries=[];
      const position=offset=>({start:{offset},end:{offset}});
      const cache={headings:[{heading:headline,level:1,position:position(0)},{heading:'Remaining',level:1,position:position(bodies['Other.md'].indexOf('# Remaining'))}]};
      const app={vault:{getFileByPath:path=>files.get(path)??null,read:async file=>{reads.push(file.path);return bodies[file.path]},readBinary:async file=>{binaries.push(file.path);return media.buffer}},
        workspace:{iterateAllLeaves(){}},metadataCache:{getFileCache:()=>cache,getFirstLinkpathDest(path){return files.get(path)??files.get(path+'.md')??null}}};
      const notes=new Map([['Public.md',a],['Other.md',b]]);
      const request={app,notes,ownerDocument:document,current:()=>true,mediaAllowed:file=>!file.path.startsWith('Private/')};
      const preview=await contentTest.inspectPublicationContent(request);
      const before=await contentTest.capturePublicationContent({...request,approvedMedia:new Set()});
      const after=await contentTest.capturePublicationContent({...request,approvedMedia:new Set(['picture.png',privateMedia])});
      const chosen=after.assets[0];
      const current=after.isCurrent();files.get('picture.png').stat.mtime++;
      return {html:after.notes.get(a).html,text:after.notes.get(a).text,unapproved:before.assets.length,preview,binaries,reads,current,changed:after.isCurrent(),
        marker, stripped:!new TextDecoder().decode(chosen.bytes).includes(marker),path:chosen.path};
    })()`);
    assert.deepEqual(report.preview.assets.map(resource => resource.path), ["picture.png"]);
    assert(report.preview.warnings.some(warning => warning.code === "excluded" && warning.target.endsWith(".png")));
    assert.equal(report.unapproved, 0);
    assert.deepEqual(report.binaries, ["picture.png"]);
    assert.equal(report.current, true);
    assert.equal(report.changed, false);
    assert(report.reads.every(path => !path.includes(report.marker)));
    assert(!report.html.includes(report.marker));
    assert(!report.text.includes(report.marker));
    assert.match(report.html, /<strong[^>]*>visible<\/strong>/);
    assert.match(report.html, /href="\?node=00000000-0000-4000-8000-000000000002#h-inspection"/);
    assert.match(report.html, /Selected excerpt/);
    assert(!report.html.includes("Keep separately"));
    assert.match(report.html, /data-publication-fragment="b-example"/);
    assert(report.stripped);
    assert.match(report.path, /^assets\/[0-9a-f]{64}\.png$/);
  } finally { await host.cleanup(); }
});

test("reader strips active content, scopes local SVG and never starts deferred media", async () => {
  const host = await fixture();
  try {
    const result = await host.evaluate(`(()=>{
      const id='00000000-0000-4000-8000-000000000001',asset='assets/'+'a'.repeat(64)+'.png';
      const raw='<h1 id="h-heading">Heading</h1><img src="./'+asset+'" onerror="window.bad=true" alt="approved" /><img src="https://example.invalid/no" /><script>window.bad=true</script>'+
        '<svg xmlns="http://www.w3.org/2000/svg" onload="window.bad=true"><defs><clipPath id="aclip"><rect width="20" height="20" /></clipPath></defs>'+
        '<desc>PRIVATE_SVG_METADATA</desc><foreignObject><div xmlns="http://www.w3.org/1999/xhtml">PRIVATE_SVG_FOREIGN</div></foreignObject>'+
        '<a href="?node='+id+'#h-heading"><rect fill="#123456" clip-path="url(#aclip)" transform="matrix(1 0 0 1 0 0)" /></a>'+
        '<a href="javascript:alert(1)"><text>inert</text></a><image href="data:image/png;base64,private" /></svg>';
      const policy={siteURL:new URL('https://example.test/project/'),nodeIds:new Set([id]),assetPaths:new Set([asset]),idPrefix:'reader-one',deferMedia:true};
      const fragment=contentTest.sanitizePublicationContent(raw,document,policy);
      const other=contentTest.sanitizePublicationContent(raw,document,{...policy,idPrefix:'reader-two'});
      document.body.append(fragment,other);
      const nested=document.body.querySelector('svg a rect');
      return {active:!!window.bad,script:!!document.body.querySelector('script,foreignObject,[onload],[onerror]'),src:document.body.querySelector('img').hasAttribute('src'),
        remote:!!document.querySelector('img[src],image[href]'),asset:document.querySelector('[data-publication-asset]').dataset.publicationAsset,
        heading:document.querySelector('h1').dataset.publicationFragment, ids:[...document.querySelectorAll('clipPath')].map(n=>n.id),clip:nested.getAttribute('clip-path'),transform:nested.getAttribute('transform'),
        svgAnchor:nested.parentElement.getAttribute('href'),unsafeAnchor:[...document.querySelectorAll('svg a')][1].hasAttribute('href'),private:document.body.textContent.includes('PRIVATE_SVG_')};
    })()`);
    assert.equal(result.active, false);
    assert.equal(result.script, false);
    assert.equal(result.src, false);
    assert.equal(result.remote, false);
    assert.equal(result.asset, `assets/${"a".repeat(64)}.png`);
    assert.equal(result.heading, "h-heading");
    assert.deepEqual(result.ids, ["reader-one-s1-1", "reader-two-s1-1"]);
    assert.equal(result.clip, "url(#reader-one-s1-1)");
    assert.equal(result.transform, "matrix(1 0 0 1 0 0)");
    assert.equal(result.svgAnchor, "https://example.test/project/?node=00000000-0000-4000-8000-000000000001#h-heading");
    assert.equal(result.unsafeAnchor, false);
    assert.equal(result.private, false);
  } finally { await host.cleanup(); }
});

test("drawing export rewrites public links and restores the shared hook and isolated loader", async () => {
  const host = await fixture();
  try {
    const result = await host.evaluate(`(async()=>{
      const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
      const title='Drawing.excalidraw.md',target='Other.md',privateName='PRIVATE_DRAWING_DESTINATION.md';
      const bases=new Map([title,target,privateName].map(path=>[path,{path,basename:path.slice(0,-3),extension:'md',stat:{size:10,mtime:1}}]));
      const drawing=bases.get(title), selected=bases.get(target), excluded=bases.get(privateName);
      const markdown='---\\nexcalidraw-plugin: parsed\\n---\\n\\n## Drawing\\n\\x60\\x60\\x60json\\n'+JSON.stringify({elements:[{type:'rectangle'}],files:{}})+'\\n\\x60\\x60\\x60\\n';
      const base=()=>'/existing-hook'; let exportCount=0,cleaned=0,released=0,foreignReads=0;
      const registry={verifyMinimumPluginVersion:minimum=>minimum==='2.29.0',onUpdateElementLinkForExportHook:base,getAPI:()=>({
        destroy(){released++},decompressFromBase64(){throw Error('Unexpected compression')},getEmbeddedFilesLoader(){return {terminate:false,loadSceneFiles:async()=>{foreignReads++},emptyPDFDocsMap(){cleaned++}}},
        async createSVG(path,fonts,settings,loader,theme,padding,rewrite,internal){
          if(path!==title||fonts||!rewrite||!internal)throw Error('Unsafe drawing invocation');
          exportCount++;await loader.loadSceneFiles({});
          const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
          for(const file of [selected,excluded]){
            const anchor=document.createElementNS(svg.namespaceURI,'a');
            anchor.setAttribute('href',registry.onUpdateElementLinkForExportHook({hostFile:drawing,linkedFile:file,originalLink:'[['+file.path+'#Heading]]',obsidianLink:'obsidian://open?file='+file.path}));
            anchor.appendChild(document.createElementNS(svg.namespaceURI,'rect'));svg.appendChild(anchor);
          }
          return svg;
        }
      })};
      window.ExcalidrawAutomate=registry;
      const app={vault:{getFileByPath:path=>bases.get(path)??null,read:async file=>file===drawing?markdown:'# Heading'},workspace:{iterateAllLeaves(){}},
        metadataCache:{getFileCache:file=>file===drawing?{frontmatter:{'excalidraw-plugin':'parsed'}}:{},getFirstLinkpathDest:path=>bases.get(path)??null}};
      const next=await contentTest.capturePublicationContent({app,ownerDocument:document,notes:new Map([[title,a],[target,b]]),approvedMedia:new Set(),current:()=>true});
      return {html:next.notes.get(a).html,asset:new TextDecoder().decode(next.assets[0].bytes),restored:registry.onUpdateElementLinkForExportHook===base,exportCount,cleaned,released,foreignReads};
    })()`);
    assert.match(result.html, /\?node=00000000-0000-4000-8000-000000000002#h-heading/);
    assert.match(result.asset, /href="\.\.\/\?node=00000000-0000-4000-8000-000000000002#h-heading"/);
    assert(!result.html.includes("PRIVATE_DRAWING_DESTINATION"));
    assert(!result.html.includes("obsidian:"));
    assert.equal(result.restored, true);
    assert.equal(result.cleaned, 1);
    assert.equal(result.released, 1);
    assert.equal(result.exportCount, 1);
    assert.equal(result.foreignReads, 0);
  } finally { await host.cleanup(); }
});
