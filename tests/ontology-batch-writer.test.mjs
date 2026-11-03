/** Real extracted plugin ontology writer, reconciliation and refresh policy in isolated Chromium. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {colorEditorScenario as scenario} from './support/colorEditorBrowser.mjs';
const setup=`const check=(value,message)=>{if(!value)throw Error(message)},copy=value=>structuredClone(value);
const p=await createAppearanceHost({ontologyPairingVersion:1,hierarchy:{parents:['Parent'],children:['Child'],leftFriends:['Friend'],rightFriends:[],previous:[],next:[],hidden:[],exclusions:[]},ontologyDescriptions:{Parent:'Ancestor',Child:'Descendant'},unknownFuture:{kept:true}});
p.writes=[];let disk=copy(p.settings);p.loadData=async()=>copy(disk);p.saveData=async next=>{disk=copy(next);p.writes.push(copy(next))};
Object.assign(p,{actionPreferenceQueue:Promise.resolve(),actionPreferenceListeners:new Set(),graphLensListeners:new Set(),appearanceThemeListeners:new Set(),externalSettingsRefresh:0,externalSettingsQueued:false});
p.work={invalidate:0,semantic:0,presentation:0,notify:0};p.index.invalidateSemanticPolicy=()=>p.work.invalidate++;p.index.refreshSemanticSettings=async()=>p.work.semantic++;p.index.refreshPresentationSettings=async()=>p.work.presentation++;p.index.notifyPresentation=()=>p.work.notify++;p.initializeSettingsReconciliation(copy(disk));
const opening=()=>({hierarchy:copy(p.settings.hierarchy),ontologyPairingVersion:1,ontologyDescriptions:copy(p.settings.ontologyDescriptions)});
`;
test('real queued batch performs one coherent save preserving unknown roots and presentation-only pairing',async()=>{
 assert.equal(await scenario(`(async()=>{${setup}
const result=await p.editOntologyConfigurationBatch([{kind:'assign',field:'Parent',role:'parent',partner:'Child',description:'Ancestor, elder',partnerDescription:'Descendant, younger'},{kind:'describe',field:'Friend',description:'Peer'}],opening(),()=>true);
check(p.writes.length===1&&!result.refreshPending,'Batch did not save exactly once');check(disk.unknownFuture.kept,'Unknown setting lost');check(disk.ontologyDescriptions.Parent==='Ancestor, elder'&&disk.ontologyDescriptions.Child==='Descendant, younger'&&disk.ontologyDescriptions.Friend==='Peer','Independent descriptions lost');check(p.work.semantic===0&&p.work.invalidate===0,'Compatible pairing rebuilt semantics');
const count=p.writes.length;await p.editOntologyConfigurationBatch([{kind:'describe',field:'Parent',description:'Updated ancestor'}],opening(),()=>true);check(p.writes.length===count+1&&p.work.notify===1&&p.work.semantic===0,'Description-only save requested source/semantic work');return true;})()`),true);
});
test('real batch validator prevents partial saves and storage rejection publishes no draft; semantic assignments retain refresh',async()=>{
 assert.equal(await scenario(`(async()=>{${setup}
const before=JSON.stringify(p.settings.hierarchy);let refused=false;
try{await p.editOntologyConfigurationBatch([{kind:'assign',field:'New',role:'parent',partner:null},{kind:'assign',field:'Parent',role:'parent',partner:'Friend'}],opening(),()=>true)}catch{refused=true}check(refused&&p.writes.length===0&&JSON.stringify(p.settings.hierarchy)===before,'Invalid tail partially saved');
const store=p.saveData;p.saveData=async()=>{throw Error('Expected disk failure')};refused=false;try{await p.editOntologyConfigurationBatch([{kind:'describe',field:'Parent',description:'Must not publish'}],opening(),()=>true)}catch{refused=true}check(refused&&p.settings.ontologyDescriptions.Parent==='Ancestor','Storage failure published description');p.saveData=store;
await p.editOntologyConfigurationBatch([{kind:'assign',field:'New',role:'previous',partner:null}],opening(),()=>true);check(p.writes.length===1&&p.work.invalidate===1&&p.work.semantic===1,'Real semantic assignment did not use normal update policy');return true;})()`),true);
});
test('actual queue refuses received owner changes and stale endpoints before saving while unrelated settings survive',async()=>{
 assert.equal(await scenario(`(async()=>{${setup}
const expected=opening(),guard=p.receivedSettingsOwner('ontologyDescriptions');disk={...disk,ontologyDescriptions:{...disk.ontologyDescriptions,Parent:'Received text'}};
let refused=false;try{await p.editOntologyConfigurationBatch([{kind:'describe',field:'Parent',description:'Stale text'}],expected,guard)}catch(error){refused=error.name==='SettingsConflictError'}check(refused&&p.writes.length===0&&disk.ontologyDescriptions.Parent==='Received text','Received description was overwritten');
await p.settingsWriteQueue;const fresh=opening();disk={...disk,unknownFuture:{kept:true,newKey:42}};
await p.editOntologyConfigurationBatch([{kind:'describe',field:'Child',description:'Updated descendant'}],fresh,()=>true);check(disk.unknownFuture.newKey===42&&p.writes.length===1,'Unrelated incoming root lost');return true;})()`),true);
});
