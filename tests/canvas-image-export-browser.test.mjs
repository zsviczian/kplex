/** Real Chromium image pixels, world crop, scroll clipping, bitmap/font ownership, immutable
 * snapshots and retirement. Test-only DOM helpers supply Obsidian construction methods; native
 * Obsidian acceptance remains authoritative for actual modal/clipboard/system behavior. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {browserBundle,chromiumHarness} from './support/browserTypeScript.mjs';

/** Install only public DOM construction/style helpers on each owned fixture realm. */
const helpers=`
function install(view){
 const Node=view.Node.prototype,Element=view.Element.prototype;
 Node.createEl=function(tag,options={}){const doc=this.nodeType===9?this:this.ownerDocument,child=doc.createElement(tag);if(options.cls)child.setAttribute('class',options.cls);if(options.text)child.textContent=options.text;for(const[key,value]of Object.entries(options.attr||{}))child.setAttribute(key,value);this.appendChild(child);return child};
 Node.createDiv=function(options){return this.createEl('div',options)};Node.createSpan=function(options){return this.createEl('span',options)};
 Node.createSvg=function(tag,options={}){const doc=this.nodeType===9?this:this.ownerDocument,child=doc.createElementNS('http://www.w3.org/2000/svg',tag);for(const[key,value]of Object.entries(options.attr||{}))child.setAttribute(key,value);this.appendChild(child);return child};
 Element.setCssProps=function(values){for(const[key,value]of Object.entries(values))this.style.setProperty(key,value)};
}
install(window);window.createFragment=()=>document.createDocumentFragment();
window.mountImageFixture=function(options={}){
 let frame=null,view=window;if(options.frame){frame=document.createElement('iframe');document.body.append(frame);view=frame.contentWindow;install(view)}const doc=view.document;
 const css=doc.createElement('style');css.textContent='.image-fixture{position:relative;width:320px;height:220px;overflow:hidden;background:white;font:16px Arial}.kplex-camera{position:absolute;width:0;height:0;transform-origin:0 0}.card{position:absolute;width:80px;height:40px;background:rgb(0,0,255);color:white;border:1px solid black;box-sizing:border-box}.card::after{content:"";position:absolute;right:2px;bottom:2px;width:4px;height:4px;background:yellow}.kplex-zone-panel{position:absolute;left:300px;top:150px;width:120px;height:70px}.kplex-zone-scroll{position:absolute;inset:0;overflow:auto}.kplex-zone-content{position:relative;height:300px;width:100px}.kplex-links{position:absolute;overflow:visible;left:0;top:0}';doc.head.append(css);
 const root=doc.createElement('div');root.className='image-fixture kplex-plex';doc.body.append(root);
 const backdrop=doc.createElementNS('http://www.w3.org/2000/svg','svg');backdrop.classList.add('kplex-compass-background');backdrop.setAttribute('width','320');backdrop.setAttribute('height','220');backdrop.style.position='absolute';
 ['north','east','south','west'].forEach((direction,index)=>{const p=doc.createElementNS(backdrop.namespaceURI,'polygon');p.dataset.direction=direction;p.setAttribute('points','0,0 1,0 0,1');p.setAttribute('fill',['purple','orange','green','cyan'][index]);backdrop.append(p)});root.append(backdrop);
 const camera=doc.createElement('div');camera.className='kplex-camera';camera.style.transform='translate(160px,110px) scale(1)';root.append(camera);
 const card=(id,left,top,color='rgb(0,0,255)',parent=camera)=>{const node=doc.createElement('div');node.className='card';node.dataset.kplexPath=id;node.textContent=id;node.style.left=left+'px';node.style.top=top+'px';node.style.backgroundColor=color;parent.append(node);return node};
 const center=card('Root',0,0),outside=card('Outside',620,60),hidden=card('Filtered',10000,10000);hidden.style.display='none';
 const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('kplex-links');svg.setAttribute('width','1000');svg.setAttribute('height','1000');const path=doc.createElementNS(svg.namespaceURI,'path');path.classList.add('kplex-edge-visible');path.setAttribute('d','M 80 20 L 620 80');path.setAttribute('stroke','rgb(0,170,0)');path.setAttribute('stroke-width','3');path.setAttribute('fill','none');path.setAttribute('vector-effect','non-scaling-stroke');svg.append(path);camera.prepend(svg);
 const panel=doc.createElement('div');panel.className='kplex-zone-panel';camera.append(panel);const scroll=doc.createElement('div');scroll.className='kplex-zone-scroll';panel.append(scroll);const content=doc.createElement('div');content.className='kplex-zone-content';scroll.append(content);
 card('Hidden first',0,0,'rgb(255,0,0)',content);card('Visible row',0,100,'rgb(255,0,255)',content);card('Hidden last',0,200,'rgb(255,0,0)',content);scroll.scrollTop=100;
 const photo=doc.createElement('img'),bitmap=doc.createElement('canvas');bitmap.width=16;bitmap.height=16;const ctx=bitmap.getContext('2d');ctx.fillStyle='rgb(255,80,0)';ctx.fillRect(0,0,16,16);photo.src=bitmap.toDataURL();photo.style.width='16px';photo.style.height='16px';center.append(photo);
 window.imageFixture={view,doc,root,camera,center,outside,scroll,photo,frame,css};return true;
};
window.clearImageFixture=function(){const f=window.imageFixture;f?.root.remove();f?.css.remove();f?.frame?.remove();delete window.imageFixture};
window.decodeImageArtifact=async function(artifact){const f=imageFixture,image=f.doc.createElement('img'),url=f.view.URL.createObjectURL(artifact.blob);try{image.src=url;await image.decode();const canvas=f.doc.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;canvas.getContext('2d').drawImage(image,0,0);const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);return{canvas,pixels}}finally{f.view.URL.revokeObjectURL(url);image.removeAttribute('src')}};
`;

test('real Chromium canvas image export preserves painted content and bounded ownership',async t=>{
 const bundle=await browserBundle(['src/ui/export/canvasImageSnapshot.ts','src/ui/export/canvasImage.ts']);const host=await chromiumHarness(bundle+'\n'+helpers);
 try{
  await t.test('whole canvas includes off-camera HTML/SVG, preserves scroll clips and captures decoded images',async()=>{
   const result=await host.evaluate(`(async()=>{mountImageFixture();const f=imageFixture;await f.photo.decode();const before=f.root.outerHTML,scroll=f.scroll.scrollTop,camera=f.camera.style.transform;const snapshot=await sourceModules.captureCanvasImage(f.root,{center:f.center,current:()=>true});const parsed=new f.view.DOMParser().parseFromString(snapshot.compass.markup,'image/svg+xml');const order=[...parsed.documentElement.children].map(p=>p.dataset.direction);const artifact=await sourceModules.renderCanvasPng(f.doc,snapshot,'canvas',{scale:1,current:()=>true}),decoded=await decodeImageArtifact(artifact);const pixel=(x,y)=>[...decoded.pixels.data.slice((Math.round(y-snapshot.bounds.y)*artifact.width+Math.round(x-snapshot.bounds.x))*4,(Math.round(y-snapshot.bounds.y)*artifact.width+Math.round(x-snapshot.bounds.x))*4+4)];let green=0;for(let i=0;i<decoded.pixels.data.length;i+=4)if(decoded.pixels.data[i]<20&&decoded.pixels.data[i+1]>120&&decoded.pixels.data[i+1]<200&&decoded.pixels.data[i+2]<20)green++;window.firstImageSnapshot=snapshot;window.firstImageArtifact=artifact;return{width:artifact.width,height:artifact.height,bounds:snapshot.bounds,order,outside:pixel(680,85),visibleRow:pixel(350,180),media:snapshot.warnings.media,scrollWarning:snapshot.warnings.scroll,green,unchanged:f.root.outerHTML===before&&f.scroll.scrollTop===scroll&&f.camera.style.transform===camera}})()`);
   assert(result.width>600);assert(result.height<400,'Hidden rows must not inflate canvas crop');assert.deepEqual(result.order,['north','east','south','west']);assert.deepEqual(result.outside,[0,0,255,255]);assert.deepEqual(result.visibleRow,[255,0,255,255]);assert.equal(result.media,0);assert(result.scrollWarning>0);assert(result.green>100);assert(result.unchanged);
  });
  await t.test('viewport is explicit and uses the same immutable snapshot after source removal',async()=>{
   const result=await host.evaluate(`(async()=>{const f=imageFixture,snapshot=firstImageSnapshot;f.root.remove();const artifact=await sourceModules.renderCanvasPng(f.doc,snapshot,'viewport',{scale:1,current:()=>true});return{width:artifact.width,height:artifact.height,scope:artifact.scope,blob:artifact.blob.type}})()`);
   assert.deepEqual(result,{width:320,height:220,scope:'viewport',blob:'image/png'});
  });
  await t.test('whole scene normalization works at half and double camera zoom',async()=>{
   const results=await host.evaluate(`(async()=>{clearImageFixture();mountImageFixture();const f=imageFixture;await f.photo.decode();const out=[];for(const scale of[.5,1,2]){f.camera.style.transform='translate(160px,110px) scale('+scale+')';const before=f.camera.style.transform;const snapshot=await sourceModules.captureCanvasImage(f.root,{center:f.center,current:()=>true});const artifact=await sourceModules.renderCanvasPng(f.doc,snapshot,'canvas',{scale:2,current:()=>true});out.push({width:artifact.width,height:artifact.height,camera:snapshot.camera.scale,unchanged:f.camera.style.transform===before})}return out})()`);
   assert.deepEqual(results.map(r=>r.camera),[.5,1,2]);assert(results.every(r=>r.unchanged));assert(Math.max(...results.map(r=>r.width))-Math.min(...results.map(r=>r.width))<=2);assert(Math.max(...results.map(r=>r.height))-Math.min(...results.map(r=>r.height))<=2);
  });
  await t.test('resource limits, caller cancellation and source teardown fail without publishing output',async()=>{
   const result=await host.evaluate(`(async()=>{const f=imageFixture,out=[];for(const options of[{maximumElements:2},{maximumCharacters:100}])try{await sourceModules.captureCanvasImage(f.root,{...options,current:()=>true});out.push('unexpected')}catch(error){out.push(error.reason)}const abort=new f.view.AbortController(),pending=sourceModules.captureCanvasImage(f.root,{signal:abort.signal,current:()=>true});abort.abort();try{await pending;out.push('unexpected')}catch(error){out.push(error.reason)}const retired=sourceModules.captureCanvasImage(f.root,{current:()=>true});f.root.remove();try{await retired;out.push('unexpected')}catch(error){out.push(error.reason)}return out})()`);
   assert.deepEqual(result,['limit','limit','retired','retired']);
  });
  await t.test('opaque embedded documents and external font resources warn without fetching or leaking their contents',async()=>{
   const result=await host.evaluate(`(async()=>{clearImageFixture();mountImageFixture();const f=imageFixture;await f.photo.decode();const embed=f.doc.createElement('iframe');f.camera.append(embed);embed.contentDocument.body.textContent='Synthetic hidden embedded document';const font=f.doc.createElement('style');font.textContent='@font-face{font-family:ExportRemote;src:url("https://example.invalid/no-font.woff2")}';f.doc.head.append(font);f.root.style.fontFamily='Arial,ExportRemote';const fetch=f.view.fetch;let requests=0;f.view.fetch=()=>{requests++;return Promise.reject(Error('Unexpected resource acquisition'))};try{const snapshot=await sourceModules.captureCanvasImage(f.root,{center:f.center,current:()=>true});return{media:snapshot.warnings.media,fonts:snapshot.warnings.fonts,requests,leaked:snapshot.markup.includes('Synthetic hidden embedded document')}}finally{f.view.fetch=fetch;font.remove()}})()`);
   assert(result.media>0&&result.fonts>0);assert.equal(result.requests,0);assert.equal(result.leaked,false);
  });
  await t.test('captured SVG and raster resources follow an independently owned iframe document',async()=>{
   const result=await host.evaluate(`(async()=>{clearImageFixture();mountImageFixture({frame:true});const f=imageFixture;await f.photo.decode();const snapshot=await sourceModules.captureCanvasImage(f.root,{center:f.center,current:()=>true});const artifact=await sourceModules.renderCanvasPng(f.doc,snapshot,'canvas',{scale:1,current:()=>true});const image=await decodeImageArtifact(artifact);return{iframe:f.doc!==document,owner:image.canvas.ownerDocument===f.doc,width:artifact.width,blob:artifact.blob.type}})()`);
   assert(result.iframe&&result.owner);assert(result.width>600);assert.equal(result.blob,'image/png');
  });
  await t.test('large constructed DOM yields to the browser while bounding captured memory',async()=>{
   const result=await host.evaluate(`(async()=>{clearImageFixture();mountImageFixture();const f=imageFixture;await f.photo.decode();for(let i=0;i<800;i++){const node=f.doc.createElement('div');node.className='card';node.dataset.kplexPath='Load'+i;node.textContent='Load '+i;node.style.left=(i%40)*100+'px';node.style.top=Math.floor(i/40)*60+'px';f.camera.append(node)}let beats=0,last=performance.now(),maximumGap=0;const timer=setInterval(()=>{const now=performance.now();maximumGap=Math.max(maximumGap,now-last);last=now;beats++},5);try{const snapshot=await sourceModules.captureCanvasImage(f.root,{center:f.center,current:()=>true});return{beats,maximumGap,elements:snapshot.elements,characters:snapshot.markup.length+snapshot.css.length+snapshot.fonts.length}}finally{clearInterval(timer)}})()`);
   assert(result.beats>2,'Large capture must yield browser tasks');assert(result.maximumGap<250,'Capture may not monopolize the browser task');assert(result.elements>800&&result.elements<24000);assert(result.characters<16000000);
  });
 }finally{try{await host.evaluate('clearImageFixture()')}finally{await host.cleanup()}}
});
