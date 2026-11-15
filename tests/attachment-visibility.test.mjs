/** Shared extension categories, legacy migration, exact runtime visibility and view-only policy.
 * No file bodies, MIME sniffing or semantic source acquisition are granted to visibility. */
import assert from 'node:assert/strict';import test from 'node:test';
import {plexViewModules} from './support/plexViewFixture.mjs';
const M=await plexViewModules(['src/core/plex/attachmentVisibility.ts','src/core/graph/settingsPolicy.ts','src/core/plex/contentVisibility.ts']);
const keys=M.ATTACHMENT_VISIBILITY_KEYS;
const groups={document:['pdf','EPUB','docx','txt','csv','pptx','canvas','base'],image:['png','JPG','gif','svg','heic','tiff'],media:['mp3','MP4','avi','wav','flac','mov'],other:['zip','bin','unknown','']};
for(const[category,extensions]of Object.entries(groups))test(category+' attachment formats use only their native extension',()=>{
 for(const extension of extensions){assert.equal(M.attachmentCategory(extension),category);if(extension)assert.equal(M.attachmentCategory('.'+extension),category);}
});
test('old attachment preferences migrate to all four groups and explicit nondefault groups survive reload',()=>{
 for(const value of [false,true]){const loaded=M.migrateAndMergeSettings({showAttachments:value,future:{keep:true}});assert(keys.every(key=>loaded[key]===value));assert.deepEqual(loaded.future,{keep:true});}
 const mixed=M.migrateAndMergeSettings({showAttachments:true,showDocumentAttachments:false,showImageAttachments:true,showMediaAttachments:false,showOtherAttachments:true});
 const reloaded=M.migrateAndMergeSettings(JSON.parse(JSON.stringify(mixed)));assert.deepEqual(keys.map(key=>reloaded[key]),[false,true,false,true]);
 const imported=M.importExcaliBrainGraphSettings({showAttachments:false},mixed);assert(keys.every(key=>imported[key]===false));
 const importedOn=M.importExcaliBrainGraphSettings({showAttachments:true},mixed);assert(keys.every(key=>importedOn[key]===true));
});
test('actual GraphIndex visibility separates categories, Markdown, URLs and the legacy gate',()=>{
 const settings=M.migrateAndMergeSettings({}),index={plugin:{settings}},visible=page=>M.GraphIndex.prototype.isVisiblePage.call(index,page,settings);
 for(let i=0;i<keys.length;i++){
  for(let j=0;j<keys.length;j++)settings[keys[j]]=i===j;
  for(const[category,extensions]of Object.entries(groups))for(const extension of extensions){
   const page={path:'opaque-identity.png',file:{extension},isFolder:false,isTag:false,url:null};
   assert.equal(visible(page),['document','image','media','other'][i]===category,category+': '+extension);
  }
 }
 for(const key of keys)settings[key]=false;
 assert.equal(visible({path:'Markdown',file:{extension:'md'}}),true);settings.showPageNodes=false;assert.equal(visible({path:'Markdown',file:{extension:'md'}}),false);
 assert.equal(visible({path:'opaque:web',file:null,url:'https://example.com/file.pdf'}),true);
 for(const key of keys)settings[key]=true;settings.showAttachments=false;
 for(const extension of ['pdf','png','wav','zip'])assert.equal(visible({path:'opaque',file:{extension}}),false);
});
test('legacy edits retain all-on/off semantics while an individual category lifts a disabled old gate',()=>{
 const previous={showAttachments:true,...Object.fromEntries(keys.map(key=>[key,true]))};
 assert(keys.every(key=>M.reconcileAttachmentVisibility({...previous,showAttachments:false},previous)[key]===false));
 const off={showAttachments:false,...Object.fromEntries(keys.map(key=>[key,false]))};
 assert.deepEqual(M.reconcileAttachmentVisibility({...off,showImageAttachments:true},off),{showAttachments:true});
 assert(keys.every(key=>M.reconcileAttachmentVisibility({...off,showAttachments:true},off)[key]===true));
});
test('category changes affect presentation signatures without invalidating semantic policy',()=>{
 const before=M.migrateAndMergeSettings({}),after={...before,showImageAttachments:false};
 const effects=M.classifySettingsChange(M.captureSettingsPolicy(before),M.captureSettingsPolicy(after));assert.equal(effects.render,true);assert.equal(effects.semanticInvalidation,false);
 assert.notEqual(M.attachmentVisibilitySignature(before),M.attachmentVisibilitySignature(after));
 const inherited={showAttachments:true};assert.notEqual(M.attachmentVisibilitySignature(inherited),M.attachmentVisibilitySignature({...inherited,showDocumentAttachments:false}));
 const off={...before,showAttachments:false};const patch=M.contentVisibilityPatch(off,'lenses',true);assert.equal(patch.showAttachments,true);assert(keys.every(key=>patch[key]===true));
 const allOff={...before,...Object.fromEntries(M.contentVisibilityKeys('lenses').map(key=>[key,false]))};assert.deepEqual(M.contentVisibilityPatch(allOff,'lenses',false),{},'A hidden legacy gate must not produce redundant all-off writes');
});
