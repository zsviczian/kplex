/**
 * Exact-installed B2 native fixed-label shared-target measurements. Uses actual owned files and
 * parser output with the installed publisher. Map work attribution and uninstrumented elapsed
 * trials use independent index lifetimes; display batches stay at 128 owners in both versions.
 */
import {runControlledProbe} from './controlledProbe.mjs';
import {nativeUrlFixture,nativeUrlGraphValue} from './nativeUrlFixture.mjs';

/** Acquire native inputs before observation; no source read or parser is substituted. */
async function scenario(app,c){
  const target='https://shared.example/path',f=await nativeUrlFixture(app,'[Fixed label]('+target+')',c,512),indexes=[],rows=[];
  try{
    const crypto=require('node:crypto');
    for(const observe of [true,false,false,false]){
      const i=new f.index.constructor(f.index.plugin,f.index.app);indexes.push(i);c.index=i;
      const flush=i.flushUrlPublication,parse=i.metadataParser.parse;let flushing=false,workingEntries=0,displayEntries=0;
      i.metadataParser.parse=/** Observe this trial's actual parser rather than the setup index. */ function(...args){f.operations.parses++;return parse.apply(this,args);};
      if(observe)i.flushUrlPublication=/** Observe the current map at the actual flush, even if preparation replaced the prior map. */ function(...args){
        const map=this.urlState.pages.get(target)?.neighbours,own=map&&Object.getOwnPropertyDescriptor(map,Symbol.iterator),iterator=map?.[Symbol.iterator];
        if(map)map[Symbol.iterator]=/** Count only the selected target's actual display iteration. */ function*(){for(const entry of iterator.call(this)){displayEntries++;yield entry;}};
        flushing=true;
        try{return flush.apply(this,args);}finally{flushing=false;if(map){if(own)Object.defineProperty(map,Symbol.iterator,own);else delete map[Symbol.iterator];}}
      };
      const before=f.foreground();f.begin();const at=performance.now();
      for(let n=0;n<f.files.length;n++){
        const map=observe?i.urlState.pages.get(target)?.neighbours:undefined,own=map&&Object.getOwnPropertyDescriptor(map,Symbol.iterator),iterator=map?.[Symbol.iterator];
        if(map)map[Symbol.iterator]=/** Work-count run only; display wrapping observes the current replacement independently. */ function*(){for(const entry of iterator.call(this)){if(!flushing)workingEntries++;yield entry;}};
        try{await i.publishUrlOwner(f.files[n],f.body,0,undefined,true);if((n+1)%128===0)i.flushUrlPublication();}
        finally{if(map){if(own)Object.defineProperty(map,Symbol.iterator,own);else delete map[Symbol.iterator];}}
      }
      const elapsedMs=performance.now()-at;f.end();i.flushUrlPublication=flush;i.metadataParser.parse=parse;
      f.check(f.operations.reads===0&&f.operations.parses===0,'No additional native acquisition');
      const value=nativeUrlGraphValue(i),after=f.foreground();
      f.check(i.urlState.pages.get(target).neighbours.size===513&&i.urlState.evidence.declarationCount===513,'Actual native multiplicity');
      f.check(!before.hidden&&before.windowFocused&&before.documentFocused&&!after.hidden&&after.windowFocused&&after.documentFocused,'Native foreground retained');
      f.check([before,after].every(/** Primary fixture-event work must not compete with the isolated publisher. */value=>!value.primary.urlRunning&&!value.primary.publications&&!value.primary.owners&&!value.primary.writes&&!value.primary.sourceInventory),'Primary inventory settled');
      rows.push({observe,...(observe?{workingEntries,displayEntries}:{elapsedMs}),flushes:i.urlPresentationFlushes,operations:{...f.operations},before,after,graphDigest:crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')});
      i.destroy();c.index=f.index;
    }
    f.check(rows.every(/** Exact ordered aliases/evidence/roles/IDs agree across independent lifetimes. */ row=>row.graphDigest===rows[0].graphDigest&&row.flushes===4),'Native sequence/cadence');
    return {owners:512,runtime:{node:process.versions.node,electron:process.versions.electron,chrome:process.versions.chrome,platform:process.platform},rows,limitations:'Selected target iterator counts; uninstrumented elapsed observations are prepared-body publication, not full index startup or paint.'};
  }finally{f.end();for(const i of indexes)i.destroy();await f.close();}
}

await runControlledProbe('url-adjacency',scenario,`const nativeUrlFixture=${nativeUrlFixture.toString()};const nativeUrlGraphValue=${nativeUrlGraphValue.toString()};`,process.env.KPLEX_PROBE_BASELINE_REF?[]:['src/index/UrlAdjacencyMap.ts']);
