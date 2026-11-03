/** Read-only field-use lookup over existing neutral-source field postings and metadata families.
 * No acquisition, parsing, inventory, cache mutation or semantic preparation is requested here.
 * Only terminally authenticated, physically current document names escape the selected reader. */
import type {TFile} from 'obsidian';
import {normalizeFieldName} from '../../core/contracts/fieldName';
import type {NeutralSourceRepository} from '../../index/SourceRepository';

export type OntologyUsageDocument=Readonly<{path:string;name:string}>;
export type OntologyUsageResult=Readonly<{documents:readonly OntologyUsageDocument[];partial:boolean}>;

/** Authenticate one posting through the same metadata family used by the native usage dialog.
 * Explicit paged API requests opt into a pre-decode/visit budget; native callers keep their
 * existing compatibility behavior. Over-budget facts are partial, never evidence of absence.
 * Locations/values never escape this membership-only reader. */
export async function readOntologyUsageSource(repository:Pick<NeutralSourceRepository,'readSelected'>,id:string,key:string,
  fileForPath:(path:string)=>TFile|null,current:()=>boolean,bounded=false):Promise<Readonly<{document:OntologyUsageDocument|null;partial:boolean}>> {
  const selected:{file:TFile|null}={file:null};let mtime=0,size=0;
  const result=await repository.readSelected(id,/** Authenticate the selected native file both before and after family reads. */ stamp=>{
    const physical=stamp.head.physical,file=fileForPath(physical.path);
    if(!file||file.extension!=='md'||file.stat.mtime!==physical.mtime||physical.size!==undefined&&file.stat.size!==physical.size||selected.file&&selected.file!==file)return 'stale';
    selected.file=file;mtime=file.stat.mtime;size=file.stat.size;return 'ready';
  },/** Inspect physical names even when no ontology assignment or link-valued semantic edge exists. */ async reader=>{
    let found=false,count=0;
    const reason=await reader.visit('metadata',/** Refuse exceptional families with explicit partial coverage. */ records=>{
      count+=records.length;if(bounded&&count>8192)return false;
      for(const record of records)if(record.kind==='field-name'&&record.normalizedFieldName===key)found=true;
      return current();
    });
    return {path:reason==='ready'&&found?reader.head.physical.path:null,complete:reason==='ready'};
  },current,bounded?{family:'metadata',records:8192,bytes:1_048_576,chunks:128}:undefined);
  if(!current()||result.outcome!=='ready')return {document:null,partial:true};
  if(!result.value.path)return {document:null,partial:!result.value.complete};
  const live=fileForPath(result.value.path);
  return live&&live===selected.file&&live.stat.mtime===mtime&&live.stat.size===size
    ?{document:{path:live.path,name:live.basename},partial:false}:{document:null,partial:true};
}

/** Query the existing field posting, then authenticate its name-only family and native identity.
 * Missing/stale sources yield a truthful partial list, never implicit repair or negative proof.
 * @param current Caller-owned modal/query lifetime, rechecked across every repository await.
 */
export async function readOntologyUsage(repository:Pick<NeutralSourceRepository,'querySources'|'readSelected'>,
  field:string,fileForPath:(path:string)=>TFile|null,current:()=>boolean):Promise<OntologyUsageResult> {
  const key=normalizeFieldName(field),documents=new Map<string,{document:OntologyUsageDocument;file:TFile;mtime:number;size:number}>();let partial=false;
  if(!key||!current())return {documents:[],partial:true};
  const complete=await repository.querySources('field',key,/** Process one bounded posting page without a second vault inventory. */ async ids=>{
    for(const id of ids){
      if(!current())return false;
      const result=await readOntologyUsageSource(repository,id,key,fileForPath,current);
      if(!current())return false;
      if(result.document){
        const live=fileForPath(result.document.path);
        if(live)documents.set(live.path,{document:result.document,file:live,mtime:live.stat.mtime,size:live.stat.size});else partial=true;
      }
      partial ||= result.partial;
    }
    return current();
  },current);
  const available:OntologyUsageDocument[]=[];
  for(const value of documents.values()){
    const live=fileForPath(value.document.path);
    if(live===value.file&&live.stat.mtime===value.mtime&&live.stat.size===value.size)available.push(value.document);else partial=true;
  }
  return {documents:current()?available.sort(/** Stable path ordering disambiguates duplicate basenames. */ (a,b)=>a.path.localeCompare(b.path)):[],partial:partial||!complete||!current()};
}
