/** URI grammar, exact identities and safe web-only embedding use production owners. Worker
 * serialization and cooperative parsing must agree without any host protocol side effects. */
import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {plexViewModules} from './support/plexViewFixture.mjs';
const M=await plexViewModules(['src/core/parser/metadata.ts','src/adapters/obsidian/urlIdentity.ts','src/ui/features/urlEmbed.ts','src/adapters/obsidian/metadataSourceCollector.ts']);
const uri='obsidian://open?vault=Other%20Vault&file=Folder%2FMixed%20%2B%20%231.md&x=CaseSensitive#Part%20One';

test('bare, labelled and autolink URI references retain exact bytes, labels and line provenance',async()=>{
 const body=[uri,'[Readable]('+uri+')','<'+uri+'>','[Second label]('+uri+')','```','obsidian://excluded/code','```','`obsidian://excluded/inline`','<!-- obsidian://excluded/comment -->','javascript://excluded ftp://excluded file://excluded','obsidian://'].join('\n');
 const sync=M.parseBodyMetadataCore(body),cooperative=await M.parseBodyMetadataCooperativeCore(body,{now:()=>0,yield:async()=>{},shouldContinue:()=>true});
 assert.deepEqual(cooperative,sync);assert.equal(sync.urls.length,1);assert.equal(sync.urls[0].url,uri);assert.equal(sync.urls[0].line,1);
 assert.deepEqual(new Set([sync.urls[0].label,...sync.urls[0].aliases??[]].filter(Boolean)),new Set(['Readable','Second label']));
 const worker=vm.runInNewContext('('+M.parseBodyMetadataCore.toString()+')')(body);
 assert.deepEqual(JSON.parse(JSON.stringify(worker)),sync,'Serialized worker owns the same allowlist without imported helpers');
});

test('property URI links are external exact targets, never decoded internal-link edits or web origins',()=>{
 const refs=M.extractLinkReferencesFromValue('[Friendly]('+uri+')');
 assert(refs.length);assert(refs.every(ref=>ref.external&&ref.rawTarget===uri));
 assert.deepEqual([...M.iterateInternalLinkTokens('[Friendly]('+uri+')')],[]);
 assert.equal(M.canonicalWebUrl(uri),uri);assert.equal(M.webUrlOrigin(uri),null);assert.equal(M.urlEmbed(uri),null);
 assert.deepEqual([...M.frontmatterUrlLabelSteps({parent:'[Friendly]('+uri+')'})].filter(Boolean),[{url:uri,label:'Friendly'}]);
});
