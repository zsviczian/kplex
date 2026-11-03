/** Actual URL compiler/publication/search in both strategies. URI identity is opaque and carries
 * no native-file or web-origin authority; shared owner removal must retire only the lost support. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {contributorBrowserBundle} from './support/contributorBrowserFixture.mjs';
import {urlSearchPublicationFixture} from './support/urlSearchPublicationProbe.mjs';
const bundle=await contributorBrowserBundle(['src/index/GraphIndex.ts','src/index/GraphBuilder.ts','src/index/RelationResolver.ts']);
const uri='obsidian://open?vault=Other%20Vault&file=Folder%2FCase%20%2B.md%23Mixed%20Heading';

for(const mode of ['on-demand','eager'])test(mode+': URI owner labels/search/publication retain exact targets and clean up without web parents',async()=>{
 const f=urlSearchPublicationFixture(bundle,mode),i=f.index;
 /** Publish only real production parsed facts through the existing bounded private owner. */
 const publish=async(path,body)=>{const record=f.add(path,body);await i.publishUrlOwner(record.file,record.body,i.urlOwnerEvents.get(path)??0,{},true);i.flushUrlPublication();return record};
 try{
  await publish('First.md',uri+'\n[URI label]('+uri+')');await publish('Second.md','[Alternative label]('+uri+')');
  const page=i.get(uri);assert(page?.url);assert.equal(page.path,uri);assert.equal(page.file,null);
  assert([...i.search('Alternative label',20,'vault')].some(page=>page.path===uri));
  for(const unsupported of ['obsidian://open','null','Folder/Case +.md','Other Vault'])assert.equal(i.get(unsupported),undefined,unsupported);
  assert(![...i.urlState.evidence.declarations()].some(item=>item.sourceKind==='url-origin'&&item.declaredTargetPath===uri));
  await publish('First.md','No URI now');assert(i.get(uri),'Another owner retains the target');
  await publish('Second.md','No URI now');assert.equal(i.get(uri),undefined,'Final support removal retires the URI');
  assert(![...i.search('Alternative label',20,'vault')].some(page=>page.path===uri),'Removed URI aliases leave search');
 }finally{f.close();}
});
