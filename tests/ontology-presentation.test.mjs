/** Shared read-only row and physical-option projections; configuration is never mutated by presentation. */
import assert from 'node:assert/strict';import test from 'node:test';import {loadPortableModules} from './support/portableTypeScript.mjs';
const loaded=loadPortableModules(['src/core/contracts/ontologyConfiguration.ts','src/core/contracts/ontologyReadModel.ts','src/ui/features/ontologyPresentation.ts']);const c=loaded.exports;
const t=(key,params={})=>key+JSON.stringify(params);
const input={ontologyPairingVersion:1,hierarchy:{hidden:['Hidden'],parents:['based on/quoted in','Legacy'],children:['Legacy'],leftFriends:['supports/supported by'],rightFriends:['challenges/challenged by'],previous:['replies to/replied by'],next:[],exclusions:['Meta']}};
const before=JSON.stringify(input),views=c.ontologyFieldViews(c.ontologyConfiguration(input),[{name:'topic',normalized:'topic',count:4},{name:'based on',normalized:'based-on',count:6}]);
test('manager collapses pairs while per-field options retain both same-role endpoints',()=>{
 const all=c.ontologyManagerEntries(views,'all','',t);assert.equal(all.length,8);assert.equal(views.length,12);assert.equal(c.ontologyManagerEntries(views,'left','',t).length,1);assert.equal(c.ontologyManagerEntries(views,'right','',t).length,1);
 assert.deepEqual(c.ontologySelectionMatches(['supports','supported by'],views,'support'),['supports','supported by']);assert.equal(JSON.stringify(input),before);
});
test('role orientation is independent of partner search and raw declaration side',()=>{
 const next=c.ontologyManagerEntries(views,'next','replies',t);assert.equal(next.length,1);assert.equal(next[0].first.name,'replied by');assert.equal(next[0].second.name,'replies to');
 const child=c.ontologyManagerEntries(views,'child','based',t);assert.equal(child[0].first.name,'quoted in');assert.equal(child[0].second.name,'based on');
 const first=c.ontologyManagerEntries(views,'all','supports',t)[0];assert.deepEqual(c.ontologyManagerEntries(views,'all','supported by',t)[0],first);
});
test('Unassigned, Excluded, Hidden and legacy multiple assignments remain truthful',()=>{
 assert.equal(c.ontologyManagerEntries(views,'unassigned','',t)[0].first.count,4);assert.equal(c.ontologyManagerEntries(views,'excluded','',t)[0].first.name,'Meta');assert.equal(c.ontologyManagerEntries(views,'hidden','',t)[0].first.name,'Hidden');
 const legacy=views.find(v=>v.name==='Legacy');assert.deepEqual(legacy.roles,['parent','child']);assert.equal(legacy.role,'parent');assert(c.ontologyFieldDetail(legacy,t).includes('multipleAssignments'));assert.equal(JSON.stringify(input),before);
});
test('direct physical matches precede partner matches while role eligibility is unchanged',()=>{
 assert.deepEqual(c.ontologySelectionMatches(['quoted in','based on'],views,'based'),['based on','quoted in']);assert.deepEqual(c.ontologySelectionMatches(['quoted in'],views,'based'),['quoted in']);assert.deepEqual(c.ontologySelectionMatches(['Meta'],views,'based'),[]);
});

test('explicit document counts hide returned unassigned zeroes even when partial and keep configured fields without uses',()=>{
 const counts=new Map([['topic',{count:0,partial:false}],['meta',{count:0,partial:false}],['hidden',{count:0,partial:false}]]);
 const updated=c.withOntologyDocumentCounts(views,counts);assert(!updated.some(field=>field.name==='topic'));
 assert.equal(updated.find(field=>field.name==='Meta').documentCount,0);assert.equal(updated.find(field=>field.name==='Hidden').documentCount,0);
 counts.set('topic',{count:0,partial:true});assert(!c.withOntologyDocumentCounts(views,counts).some(field=>field.name==='topic'));
 counts.set('meta',{count:0,partial:true});assert(c.withOntologyDocumentCounts(views,counts).some(field=>field.name==='Meta'&&field.documentCount===0&&field.countPartial));
 counts.set('topic',{partial:true});assert(c.withOntologyDocumentCounts(views,counts).some(field=>field.name==='topic'&&field.documentCount===undefined&&field.countPartial));
 counts.set('topic',{count:2,partial:false});assert.equal(c.withOntologyDocumentCounts(views,counts).find(field=>field.name==='topic').documentCount,2);
 assert.equal(views.find(field=>field.name==='topic').count,4);assert.equal(JSON.stringify(input),before);
});


test('authored descriptions retain exact physical names, literal content and independent inverse meaning',()=>{
 const descriptions=c.normalizeOntologyDescriptions({'based on':'Cites an earlier idea.','quoted in':'Later work that cites this note.','Based on':'Separate exact spelling.','empty':'   ','bad':42,'long':'x'.repeat(1001),'__proto__':'Literal property'});
 assert.equal(descriptions['based on'],'Cites an earlier idea.');assert.equal(descriptions['Based on'],'Separate exact spelling.');assert.equal(descriptions.long.length,1000);assert(!Object.hasOwn(descriptions,'empty'));assert(!Object.hasOwn(descriptions,'bad'));
 const config=c.ontologyConfiguration(input),rows=c.ontologyReadModel(config,descriptions,[{name:'based on',normalized:'based-on',count:3},{name:'topic',normalized:'topic',count:4}]);
 const source=rows.find(row=>row.name==='based on'),inverse=rows.find(row=>row.name==='quoted in');
 assert.equal(source.description,'Cites an earlier idea.');assert.equal(inverse.description,'Later work that cites this note.');assert.equal(source.partner,'quoted in');assert(source.configured&&source.discovered);assert(!inverse.discovered);assert.equal(rows.find(row=>row.name==='topic').configured,false);
 assert.deepEqual(c.normalizeOntologyDescriptions(undefined),{});assert.equal(c.ontologyReadModel(config).find(row=>row.name==='based on').description,undefined);
 const updated=c.editOntologyDescriptions(descriptions,[{field:'based on',description:''},{field:'quoted in',description:'<literal> **text**'}]);assert(!Object.hasOwn(updated,'based on'));assert.equal(updated['quoted in'],'<literal> **text**');assert.equal(descriptions['based on'],'Cites an earlier idea.');assert.throws(()=>c.editOntologyDescriptions(updated,[{field:'quoted in',description:'x'.repeat(1001)}]),error=>error.name==='SettingsValidationError');
});

test('description matches extend physical options after name and partner tiers',()=>{
 const descriptions={'based on':'A literal <b>description</b>.','quoted in':'The inverse has its own meaning.'},rows=c.ontologyFieldViews(c.ontologyConfiguration(input),[],descriptions);
 assert(c.ontologyFieldDetail(rows.find(row=>row.name==='based on'),t).endsWith('A literal <b>description</b>.'));
 assert.deepEqual(c.ontologySelectionMatches(['quoted in','based on'],rows,'based'),['based on','quoted in']);assert.deepEqual(c.ontologySelectionMatches(['quoted in','based on'],rows,'literal'),['based on']);
 assert.equal(c.ontologyManagerEntries(rows,'all','literal',t)[0].first.name,'based on');
});

test('substring tiers preserve physical order, own-description independence and normalized deduplication',()=>{
 const fields=['Described','Inverse','Match direct','described','Direct tail'];
 const annotated=[{key:'described',name:'Described',description:'Match synonym',roles:['parent'],role:'parent'},{key:'inverse',name:'Inverse',partner:'Match partner',description:'irrelevant',roles:['child'],role:'child'},{key:'match-direct',name:'Match direct',roles:['parent'],role:'parent'},{key:'direct-tail',name:'Direct tail',partner:'Other',description:'MATCH alias',roles:['parent'],role:'parent'}];
 assert.deepEqual(c.ontologySelectionMatches(fields,annotated,'match'),['Match direct','Inverse','Described','Direct tail']);
 assert.deepEqual(c.ontologySelectionMatches(['Inverse'],annotated,'synonym'),[]);
 assert.deepEqual(c.ontologySelectionMatches(fields,annotated,''),['Described','Inverse','Match direct','Direct tail']);
 assert.deepEqual(c.ontologySelectionMatches(['Écriture'],[{key:'écriture',description:'référence ancienne'}],'RÉFÉRENCE'),['Écriture']);
});

test('fuzzy tiers retain injected direct rank, configured indirect order and finite result caps',()=>{
 const fields=['Description first','Partner first','Physical needle','Description second','Partner second','physical needle'];
 const annotated=[{key:'description-first',description:'needle old term'},{key:'partner-first',partner:'needle inverse'},{key:'physical-needle'},{key:'description-second',description:'needle synonym'},{key:'partner-second',partner:'needle counterpart'}];
 /** Stand in only for the caller-owned ranking policy; tier projection is the production owner. */
 const match=(values,query,limit)=>values.filter(value=>value.toLowerCase().includes(query.toLowerCase())).reverse().slice(0,limit);
 assert.deepEqual(c.ontologyFuzzyMatches(fields,annotated,'needle',match,10),['Physical needle','Partner first','Partner second','Description first','Description second']);
 assert.deepEqual(c.ontologyFuzzyMatches(fields,annotated,'needle',match,3),['Physical needle','Partner first','Partner second']);
 assert.deepEqual(c.ontologyFuzzyMatches(fields,annotated,'needle',match,0),[]);
 assert.deepEqual(c.ontologyFuzzyMatches(fields,annotated,'',match,2),['Partner second','Description second']);
});


test('prototype-shaped physical names never expose inherited values or mutate dictionaries',()=>{
 const source={ontologyPairingVersion:1,hierarchy:{hidden:[],parents:['constructor','toString','__proto__'],children:[],leftFriends:[],rightFriends:[],previous:[],next:[],exclusions:[]}},config=c.ontologyConfiguration(source);
 assert(c.ontologyReadModel(config).every(field=>field.description===undefined));assert.equal(c.ontologyDescription({},'constructor'),undefined);assert.equal(c.ontologyDescription({},'toString'),undefined);
 const descriptions=c.normalizeOntologyDescriptions(JSON.parse('{"__proto__":"Literal prototype name","constructor":"Literal constructor"}'));assert.equal(c.ontologyDescription(descriptions,'__proto__'),'Literal prototype name');assert.equal(c.ontologyDescription(descriptions,'constructor'),'Literal constructor');
 const changed=c.editOntologyDescriptions({},[{field:'__proto__',description:'Saved literal'},{field:'toString',description:'Own string'}]);assert.equal(Object.getPrototypeOf(changed),Object.prototype);assert.equal(c.ontologyDescription(changed,'__proto__'),'Saved literal');assert.equal(c.ontologyDescription(changed,'toString'),'Own string');assert.equal({}.polluted,undefined);
});
