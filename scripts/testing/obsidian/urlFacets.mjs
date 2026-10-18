/**
 * Native B1 URL-facet comparison using one actual 512-label source note and the installed URL
 * publisher. Counts target alias-array enumeration independently of display flushes, forwards
 * original methods/results, and verifies exact same-sequence graph/evidence digest outside timing.
 */
import { runControlledProbe } from './controlledProbe.mjs';
import { nativeUrlFixture,nativeUrlGraphValue } from './nativeUrlFixture.mjs';

/** Execute three matched warm replacements; the shared fixture owns all native resource cleanup. */
async function scenario(app,c) {
  const target='https://shared.example/path',text=Array.from({length:512},/** Genuine distinct labels preserve original occurrence multiplicity. */ (_,n)=>`[Label ${n}](${target})`).join('\n');
  const f=await nativeUrlFixture(app,text,c),i=f.index,rows=[];
  try{
    await i.publishUrlOwner(f.file,f.body,0,undefined,true);
    f.check(i.urlState.pages.get(target)?.aliases.length===512,'Actual native vocabulary');
    for(let trial=0;trial<3;trial++){
      const page=i.urlState.pages.get(target),aliases=page.aliases,value=JSON.stringify(aliases);
      const own=Object.getOwnPropertyDescriptor(aliases,Symbol.iterator),iterator=aliases[Symbol.iterator],flush=i.flushUrlPublication;
      let aliasEntries=0,displayEntries=0,flushing=false,flushes=0;
      aliases[Symbol.iterator]=/** Count only this target's retained alias input; preserve results/order. */ function*(){for(const item of iterator.call(this)){if(flushing)displayEntries++;else aliasEntries++;yield item;}};
      i.flushUrlPublication=/** Isolate display materialization without changing cadence or receiver/result. */ function(...args){flushing=true;flushes++;try{return flush.apply(this,args);}finally{flushing=false;}};
      try{
        const before=f.foreground();f.begin();const at=performance.now();
        await i.publishUrlOwner(f.file,f.body,0,undefined,true);
        const elapsedMs=performance.now()-at;f.end();
        f.check(JSON.stringify(aliases)===value&&JSON.stringify(page.aliases)===value,'Retained alias values/order');
        f.check(f.operations.reads===0&&f.operations.parses===0,'No additional body acquisition');
        rows.push({trial,aliasEntries,displayEntries,flushes,elapsedMs,operations:{...f.operations},before,after:f.foreground()});
      }finally{f.end();i.flushUrlPublication=flush;if(own)Object.defineProperty(aliases,Symbol.iterator,own);else delete aliases[Symbol.iterator];}
    }
    const value=nativeUrlGraphValue(i),crypto=require('node:crypto');
    f.check(rows.every(/** Foreground failures invalidate the native comparison. */ row=>!row.before.hidden&&row.before.windowFocused&&row.before.documentFocused&&!row.after.hidden&&row.after.windowFocused&&row.after.documentFocused),'Foreground retained');
    return {rows,pages:i.urlState.pages.size,declarations:i.urlState.evidence.declarationCount,graphDigest:crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')};
  }finally{await f.close();}
}

await runControlledProbe('url-facets',scenario,`const nativeUrlFixture=${nativeUrlFixture.toString()};const nativeUrlGraphValue=${nativeUrlGraphValue.toString()};`);
