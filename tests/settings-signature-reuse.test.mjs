/** Repeated hydration guards retain exact policy bytes without reserializing unchanged ontology. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {loadPortableModules} from './support/portableTypeScript.mjs';
const loaded=loadPortableModules(['src/core/graph/settingsPolicy.ts','src/core/contracts/ontologyConfiguration.ts']);
const M=loaded.exports;
const settings=()=>({ontologyPairingVersion:1,hierarchy:{hidden:[],parents:Array.from({length:427},(_,n)=>'Field '+n),children:[],leftFriends:[],rightFriends:[],previous:[],next:[],exclusions:[]},
 inferAllLinksAsFriends:false,inverseInfer:false,datePropertyRelations:'parent',thumbnailProperty:'thumbnail',nodeImageProperty:'node-image'});

test('repeated current-policy guards serialize the immutable paired projection once',()=>{
 const value=settings(),stringify=JSON.stringify;let encodings=0;
 JSON.stringify=function(input,...args){if(input?.signatureVersion===4)encodings++;return stringify(input,...args)};
 try{const first=M.encodeIndexSettingsSignature(value);for(let n=0;n<10000;n++)assert.equal(M.encodeIndexSettingsSignature(value),first);
  assert.equal(encodings,1,'No repeated 427-field serialization during unchanged hydration');
 }finally{JSON.stringify=stringify;}
});

test('canonical ontology mutations and every scalar policy input retire signature reuse',()=>{
 const value=settings();let previous=M.encodeIndexSettingsSignature(value);
 const change=edit=>{edit();const next=M.encodeIndexSettingsSignature(value);assert.notEqual(next,previous);previous=next;assert.equal(M.encodeIndexSettingsSignature(value),next)};
 change(()=>value.hierarchy.parents.push('Added'));
 change(()=>{value.hierarchy.parents[0]='Replaced';M.ontologyConfiguration(value,true)});
 change(()=>value.hierarchy={...value.hierarchy,children:['Child']});
 for(const [key,next]of [['inferAllLinksAsFriends',true],['inverseInfer',true],['datePropertyRelations','child'],['thumbnailProperty','Cover'],['nodeImageProperty','Portrait']])change(()=>value[key]=next);
 const before=previous;Object.assign(value,{showFullTagName:false,noteTypeField:'Different',primaryTagField:'Style',tagStyleList:['Style'],baseNodeStyle:{maxLabelLength:10}});
 assert.equal(M.encodeIndexSettingsSignature(value),before,'Presentation does not become semantic policy');
});

test('legacy mutable hierarchies and malformed optional inputs retain their existing encoding',()=>{
 const value=settings();delete value.ontologyPairingVersion;
 const before=M.encodeIndexSettingsSignature(value);value.hierarchy.parents[0]='Legacy mutation';assert.notEqual(M.encodeIndexSettingsSignature(value),before);
 value.ontologyPairingVersion=1;value.thumbnailProperty={value:'first'};
 const malformed=M.encodeIndexSettingsSignature(value);value.thumbnailProperty.value='second';assert.notEqual(M.encodeIndexSettingsSignature(value),malformed);
});
