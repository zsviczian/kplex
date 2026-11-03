/** Explicit, serialized selected-file ontology inspection. The caller supplies native Vault reads,
 * supported Obsidian YAML facilities, live-editor guards and host CPU/digest services. This owner
 * never acquires graph sources, repairs an index, reads unrelated files or writes persistent data.
 * Disposal/cancellation and native file identity are checked across every asynchronous boundary. */
import type {TFile} from "obsidian";
import {PublicApiError} from "../../application/publicApiContracts";
import {normalizeFieldName} from "../../core/contracts/fieldName";
import {ONTOLOGY_OCCURRENCE_LIMITS as limits, type OntologyOccurrenceRequest,
  type OntologyOccurrenceInspection, type OntologyPhysicalOccurrence,
  type OntologyInspectionUnsupported} from "../../core/contracts/ontologyOccurrences";
import {inspectBodyFieldKeys} from "../../core/parser/ontologyOccurrences";

export type OntologyOccurrencePorts=Readonly<{
  fileForPath:(path:string)=>TFile|null;
  /** Read the selected physical file through Vault.read, not potentially stale metadata/cache text. */
  readFile:(file:TFile)=>Promise<string>;
  /** True for dirty/ambiguous live buffers; host composition must include its embedded editors. */
  hasUnsavedBuffer:(path:string,savedText:string)=>boolean;
  getFrontmatter:(text:string)=>Readonly<{exists:boolean;frontmatter:string}>;
  /** Native supported YAML decoder; thrown malformed/duplicate-key errors become unsupported data. */
  parseYaml:(text:string)=>unknown;
  runtime:Readonly<{now:()=>number;yield:()=>Promise<void>;digest:(text:string)=>Promise<string>}>;
}>;

/** Validate caller data before reading anything; limits bound actual input work and retained data. */
function inspectionRequest(request:OntologyOccurrenceRequest):{path:string;fields:Set<string>;limit:number;expectedSnapshot?:string}{
  if(!request||typeof request.path!=="string"||!request.path||request.path.length>1_024
    ||request.path.startsWith("/")||request.path.includes("\\")||request.path.split("/").some(part=>part===".."||part==="."))
    throw new PublicApiError("INVALID_ARGUMENT","Inspection requires an exact bounded vault-relative Markdown path");
  if(!Array.isArray(request.fields)||!request.fields.length||request.fields.length>limits.fields)
    throw new PublicApiError("INVALID_ARGUMENT",`Inspection requires from 1 through ${limits.fields} fields`);
  const fields=new Set<string>();
  for(const field of request.fields){
    if(typeof field!=="string"||!field.trim()||field.length>limits.fieldCharacters)
      throw new PublicApiError("INVALID_ARGUMENT","Inspection field names must be nonempty bounded strings");
    fields.add(normalizeFieldName(field));
  }
  const limit=request.limit??limits.defaultOccurrences;
  if(!Number.isInteger(limit)||limit<1||limit>limits.occurrences)
    throw new PublicApiError("INVALID_ARGUMENT",`Inspection limit must be from 1 through ${limits.occurrences}`);
  if(request.expectedSnapshot!==undefined&&(typeof request.expectedSnapshot!=="string"||!/^[a-f0-9]{64}$/.test(request.expectedSnapshot)))
    throw new PublicApiError("INVALID_ARGUMENT","Expected snapshot must be a SHA-256 content identity");
  return {path:request.path,fields,limit,expectedSnapshot:request.expectedSnapshot};
}

/** Project top-level keys through Obsidian's YAML decoder, never inventing textual key positions.
 * Unsupported frontmatter leaves body inspection available but prevents a complete-source claim.
 */
function yamlOccurrences(text:string, fields:ReadonlySet<string>, limit:number, ports:OntologyOccurrencePorts):{
  occurrences:OntologyPhysicalOccurrence[];unsupported:OntologyInspectionUnsupported[];truncated:boolean}{
  const info=ports.getFrontmatter(text),occurrences:OntologyPhysicalOccurrence[]=[];
  if(!info.exists){
    // The body grammar treats an opening fence as frontmatter even when its closer is missing.
    // Native YAML metadata must not turn that unsupported source into a complete empty result.
    const firstEnd=text.indexOf("\n"),first=text.slice(0,firstEnd<0?text.length:firstEnd).trim();
    return {occurrences,unsupported:first==="---"?[{surface:"frontmatter",reason:"invalid-yaml"}]:[],truncated:false};
  }
  if(info.frontmatter.length>limits.yamlCharacters)return {occurrences,unsupported:[{surface:"frontmatter",reason:"yaml-limit"}],truncated:false};
  // Native decoding resolves aliases and merge keys. With no public YAML token tree, reject this
  // syntax conservatively instead of advertising merged/complex keys as physical declarations.
  // This is a safety gate, not another property decoder; ordinary keys still come from parseYaml.
  if(/(?:^|[\s[{: ,])[&*][^\s[\]{},]+|<<\s*:|^\s*\?/m.test(info.frontmatter))
    return {occurrences,unsupported:[{surface:"frontmatter",reason:"yaml-indirection"}],truncated:false};
  let decoded:unknown;
  try{decoded=ports.parseYaml(info.frontmatter);}catch{return {occurrences,unsupported:[{surface:"frontmatter",reason:"invalid-yaml"}],truncated:false};}
  if(decoded===null||decoded===undefined)return {occurrences,unsupported:[],truncated:false};
  if(typeof decoded!=="object"||Array.isArray(decoded))return {occurrences,unsupported:[{surface:"frontmatter",reason:"non-mapping-yaml"}],truncated:false};
  // Plain mappings from any realm have no prototype or a prototype whose parent is null.
  // Native dates/binary/scalar objects must not become complete empty property inventories.
  const prototype:unknown=Object.getPrototypeOf(decoded);
  if(prototype!==null&&Object.getPrototypeOf(prototype)!==null)
    return {occurrences,unsupported:[{surface:"frontmatter",reason:"non-mapping-yaml"}],truncated:false};
  let scanned=0;
  for(const name in decoded){
    if(!Object.prototype.hasOwnProperty.call(decoded,name))continue;
    if(++scanned>limits.yamlProperties||name.length>limits.fieldCharacters)
      return {occurrences,unsupported:[{surface:"frontmatter",reason:"yaml-limit"}],truncated:false};
    const normalizedName=normalizeFieldName(name);
    if(!fields.has(normalizedName))continue;
    if(occurrences.length>=limit)return {occurrences,unsupported:[],truncated:true};
    occurrences.push({name,normalizedName,syntax:"frontmatter",keyRange:null,line:null,column:null,yamlKey:name});
  }
  return {occurrences,unsupported:[],truncated:false};
}

/** Own at most one active bounded inspection and release host closures when the API retires. */
export function createOntologyOccurrenceInspector(initialPorts:OntologyOccurrencePorts){
  let ports:OntologyOccurrencePorts|null=initialPorts,active=false;
  return {
    /** Inspect one saved file once for every requested field; no values or note text escape.
     * @throws PublicApiError on invalid/budgeted/stale/dirty/unavailable/cancelled sources.
     * @remarks SHA-256 is a review identity, not permission to reuse offsets after a later write.
     */
    async inspect(request:OntologyOccurrenceRequest,current:()=>boolean):Promise<OntologyOccurrenceInspection>{
      const input=inspectionRequest(request),owner=ports;
      if(!owner)throw new PublicApiError("API_UNAVAILABLE","Ontology inspection owner is disposed");
      if(active)throw new PublicApiError("LIMIT_EXCEEDED","Another ontology inspection is already active");
      /** Cancellation and owner retirement are distinct; stale source checks follow native awaits. */
      const checkCurrent=():void=>{if(ports!==owner)throw new PublicApiError("API_UNAVAILABLE","Ontology inspection owner is disposed");if(!current())throw new PublicApiError("CANCELLED","Ontology inspection was cancelled");};
      checkCurrent();
      const file=owner.fileForPath(input.path);
      if(!file||file.extension!=="md"||file.path!==input.path)throw new PublicApiError("NOT_FOUND","Selected Markdown source is unavailable");
      const mtime=file.stat.mtime,size=file.stat.size;
      if(!Number.isFinite(size)||size<0||size>limits.sourceBytes)throw new PublicApiError("LIMIT_EXCEEDED","Selected source exceeds the inspection byte budget");
      /** Preserve exact native object/path/stat identity across reads, digests and cooperative slices. */
      const checkFile=():void=>{checkCurrent();if(owner.fileForPath(input.path)!==file||file.path!==input.path||file.stat.mtime!==mtime||file.stat.size!==size)throw new PublicApiError("STALE_REVISION","Selected source changed during inspection");};
      active=true;
      try{
        const text=await owner.readFile(file);checkFile();
        if(typeof text!=="string"||text.length>limits.sourceCharacters||new TextEncoder().encode(text).byteLength>limits.sourceBytes)
          throw new PublicApiError("LIMIT_EXCEEDED","Selected contents exceed the inspection budget");
        if(owner.hasUnsavedBuffer(input.path,text))throw new PublicApiError("UNAVAILABLE","Selected source has an unsaved or ambiguous live editor buffer");
        const id=await owner.runtime.digest(text);checkFile();
        if(input.expectedSnapshot!==undefined&&id!==input.expectedSnapshot)throw new PublicApiError("STALE_REVISION","Saved contents no longer match the inspected snapshot");
        const yaml=yamlOccurrences(text,input.fields,input.limit,owner);
        const body=yaml.truncated?{occurrences:[],truncated:true,masked:false}:await inspectBodyFieldKeys(text,input.fields,input.limit-yaml.occurrences.length,
          {...owner.runtime,shouldContinue:/** Check all native and caller guards at canonical CPU checkpoints. */()=>{checkFile();return true;}});
        checkFile();
        if(owner.hasUnsavedBuffer(input.path,text))throw new PublicApiError("STALE_REVISION","A live editor changed during source inspection");
        const unsupported=[...yaml.unsupported,...(body.masked?[{surface:"body",reason:"masked-key"} as const]:[])];
        const truncated=yaml.truncated||body.truncated;
        return {path:input.path,snapshot:{id,authority:"saved",mtime,size},occurrences:[...yaml.occurrences,...body.occurrences],unsupported,complete:!truncated&&!unsupported.length,truncated};
      }finally{active=false;}
    },
    /** Retire in-flight work at its next checkpoint and stop retained API handles owning host ports. */
    dispose():void{ports=null;},
  };
}
