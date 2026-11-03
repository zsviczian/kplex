/** Bounded ontology-only batch preparation over the canonical validator and editor intents.
 * This settings projection owns no host, source, persistence or automatic note migration. */
import {applyOntologyEdit,ontologyConfiguration,ONTOLOGY_GROUPS,ONTOLOGY_ROLE_GROUP,type OntologyConfigurationInput,type OntologyEdit,type OntologyGroup} from './ontologyConfiguration';
import {editOntologyDescriptions,ontologyDescription,ontologyReadModel,validateOntologyDescription,type OntologyReadField,type OntologyDescriptions} from './ontologyReadModel';
import {normalizeFieldName} from './fieldName';

export const ONTOLOGY_BATCH_LIMITS=Object.freeze({edits:128,fieldCharacters:4096,entries:8192,characters:1_048_576});
export type OntologyBatchEdit=OntologyEdit|Readonly<{kind:'describe';field:string;description:string}>;
export type OntologyBatchChange=Readonly<{index:number;edit:OntologyBatchEdit;before:readonly OntologyReadField[];after:readonly OntologyReadField[]}>;
export type OntologyBatchPlan=Readonly<{edits:readonly OntologyBatchEdit[];input:OntologyConfigurationInput;output:OntologyConfigurationInput;before:readonly OntologyReadField[];after:readonly OntologyReadField[];changes:readonly OntologyBatchChange[]}>;
/** Canonical validation failures carry an edit index for a reviewable whole-batch refusal. */
export class OntologyBatchError extends Error {
  /** Retain a bounded reason without carrying live settings or thrown host objects. */
  constructor(readonly index:number,readonly issue:string,message:string){super(message);this.name='OntologyBatchError';}
}

/** Bound configured facts before cloning; arbitrary unrelated settings never enter a plan. */
export function captureOntologyBatchInput(source:OntologyConfigurationInput):OntologyConfigurationInput {
  let count=0,characters=0,descriptions=0;
  const hierarchy=Object.fromEntries(ONTOLOGY_GROUPS.map(/** Capture only ontology domains, never unknown unrelated hierarchy payloads. */ group=>[group,[] as string[]])) as Record<OntologyGroup,string[]>&{friends?:string[]};
  for(const group of [...ONTOLOGY_GROUPS,'friends'] as const){
    const entries=source.hierarchy[group];if(group==='friends'&&entries===undefined)continue;
    if(!Array.isArray(entries))throw new OntologyBatchError(-1,'malformed','Invalid ontology assignment array');
    count+=entries.length;if(count>ONTOLOGY_BATCH_LIMITS.entries)throw new OntologyBatchError(-1,'limit','Ontology configuration exceeds the batch budget');
    const copied:string[]=[];
    for(let index=0;index<entries.length;index++){
      const descriptor=Object.getOwnPropertyDescriptor(entries,String(index)),entry:unknown=descriptor&&'value' in descriptor?descriptor.value:undefined;
      if(typeof entry!=='string')throw new OntologyBatchError(-1,'malformed','Ontology assignments must be literal strings');
      characters+=entry.length;if(characters>ONTOLOGY_BATCH_LIMITS.characters)throw new OntologyBatchError(-1,'limit','Ontology configuration exceeds the batch budget');copied.push(entry);
    }
    hierarchy[group]=copied;
  }
  const dictionary:Record<string,string>={},current=source.ontologyDescriptions??{};
  for(const field in current){
    if(++descriptions>ONTOLOGY_BATCH_LIMITS.entries)throw new OntologyBatchError(-1,'limit','Ontology configuration exceeds the batch budget');
    if(!Object.prototype.hasOwnProperty.call(current,field))continue;
    const descriptor=Object.getOwnPropertyDescriptor(current,field),description:unknown=descriptor&&'value' in descriptor?descriptor.value:undefined;
    if(typeof description!=='string')throw new OntologyBatchError(-1,'malformed','Ontology descriptions must be literal strings');
    characters+=field.length+description.length;if(characters>ONTOLOGY_BATCH_LIMITS.characters)throw new OntologyBatchError(-1,'limit','Ontology configuration exceeds the batch budget');
    Object.defineProperty(dictionary,field,{value:description,enumerable:true,writable:true,configurable:true});
  }
  const snapshot={hierarchy,ontologyPairingVersion:source.ontologyPairingVersion,ontologyDescriptions:dictionary};
  const text=JSON.stringify(snapshot);if(text.length>ONTOLOGY_BATCH_LIMITS.characters)throw new OntologyBatchError(-1,'limit','Ontology configuration exceeds the batch budget');
  return JSON.parse(text) as OntologyConfigurationInput;
}

/** Validate untrusted intent shape before canonical owners read field strings or copy a batch. */
export function validateOntologyBatchEdits(value:unknown):readonly OntologyBatchEdit[] {
  if(!Array.isArray(value)||!value.length||value.length>ONTOLOGY_BATCH_LIMITS.edits)throw new OntologyBatchError(-1,'limit','Supply between 1 and 128 ontology edits');
  const result:OntologyBatchEdit[]=[];
  for(let index=0;index<value.length;index++){
    const item:unknown=value[index];
    if(!item||typeof item!=='object'||Array.isArray(item))throw new OntologyBatchError(index,'malformed','Invalid ontology edit');
    const record:Record<string,unknown>={};let members=0;
    for(const key in item){
      if(++members>8)throw new OntologyBatchError(index,'malformed','Ontology edit exceeds its member budget');
      if(!Object.prototype.hasOwnProperty.call(item,key))continue;
      if(!['kind','field','role','partner','createPartner','movePair','description','partnerDescription'].includes(key))throw new OntologyBatchError(index,'malformed','Unknown ontology edit member');
      const descriptor=Object.getOwnPropertyDescriptor(item,key);
      if(!descriptor||!('value' in descriptor))throw new OntologyBatchError(index,'malformed','Ontology edit members must be literal data');
      Object.defineProperty(record,key,{value:descriptor.value,enumerable:true,writable:true,configurable:true});
    }
    const field=record.field;
    if(typeof field!=='string'||!field.trim()||field!==field.trim()||field.length>ONTOLOGY_BATCH_LIMITS.fieldCharacters||!normalizeFieldName(field))throw new OntologyBatchError(index,'malformed','Invalid physical field name');
    const allowed=record.kind==='assign'?['kind','field','role','partner','createPartner','movePair','description','partnerDescription']:record.kind==='describe'?['kind','field','description']:record.kind==='remove'?['kind','field']:[];
    if(!allowed.length)throw new OntologyBatchError(index,'malformed','Unknown ontology edit kind');
    for(const key in record)if(!allowed.includes(key))throw new OntologyBatchError(index,'malformed','Unknown ontology edit member');
    for(const key of ['description','partnerDescription'])if(record[key]!==undefined){
      if(typeof record[key]!=='string')throw new OntologyBatchError(index,'malformed','Invalid description');
      try{validateOntologyDescription(record[key]);}catch{throw new OntologyBatchError(index,'description','Ontology description exceeds its limit');}
    }
    if(record.kind==='describe'&&typeof record.description!=='string')throw new OntologyBatchError(index,'malformed','Description is required');
    if(record.kind==='assign'){
      if(typeof record.role!=='string'||!Object.prototype.hasOwnProperty.call(ONTOLOGY_ROLE_GROUP,record.role))throw new OntologyBatchError(index,'role','Invalid ontology role');
      if(record.partner!==null&&(typeof record.partner!=='string'||!record.partner.trim()||record.partner!==record.partner.trim()||record.partner.length>ONTOLOGY_BATCH_LIMITS.fieldCharacters||!normalizeFieldName(record.partner)))throw new OntologyBatchError(index,'malformed','Invalid inverse field name');
      for(const key of ['createPartner','movePair'])if(record[key]!==undefined&&typeof record[key]!=='boolean')throw new OntologyBatchError(index,'malformed','Invalid ontology edit flag');
    }
    result.push({...record} as OntologyBatchEdit);
  }
  if(JSON.stringify(result).length>ONTOLOGY_BATCH_LIMITS.characters)throw new OntologyBatchError(-1,'limit','Ontology batch exceeds the input budget');
  return result;
}

/** Prepare every ordered intent before accepting a write; a failed later edit publishes nothing.
 * Normalization-equivalent spelling edits transfer authored wording, while stale exact-name
 * removals refuse to delete a newly canonical spelling of that same configured identity. */
export function prepareOntologyBatch(source:OntologyConfigurationInput,requested:unknown):OntologyBatchPlan {
  const edits=validateOntologyBatchEdits(requested),input=captureOntologyBatchInput(source);
  let output=input;const before=ontologyReadModel(ontologyConfiguration(input),input.ontologyDescriptions),changes:OntologyBatchChange[]=[];
  for(let index=0;index<edits.length;index++){
    const edit=edits[index];
    try{
      const current=ontologyReadModel(ontologyConfiguration(output),output.ontologyDescriptions),key=normalizeFieldName(edit.field),old=current.find(/** The configured identity chooses one exact canonical spelling. */ field=>field.key===key);
      let descriptions:OntologyDescriptions=output.ontologyDescriptions??{};
      if(edit.kind==='describe'){
        if(!old||old.name!==edit.field)throw new OntologyBatchError(index,'spelling','Description requires the exact configured physical name');
        descriptions=editOntologyDescriptions(descriptions,[{field:edit.field,description:edit.description}]);
        output={...output,ontologyDescriptions:descriptions};
      }else{
        if(edit.kind==='remove'&&old&&old.name!==edit.field)throw new OntologyBatchError(index,'spelling','Removal names a different canonical spelling of the same identity');
        const hierarchy=applyOntologyEdit(output,edit);
        if(edit.kind==='assign'&&old&&old.name!==edit.field){
          const previous=ontologyDescription(descriptions,old.name),next=ontologyDescription(descriptions,edit.field);
          if(edit.description===undefined&&previous!==undefined&&next!==undefined&&previous!==next)throw new OntologyBatchError(index,'description','Spelling change has conflicting exact-name descriptions');
          if(edit.description===undefined&&previous!==undefined)descriptions=editOntologyDescriptions(descriptions,[{field:edit.field,description:previous}]);
          descriptions=editOntologyDescriptions(descriptions,[{field:old.name,description:''}]);
        }
        descriptions=editOntologyDescriptions(descriptions,edit.kind==='remove'?[{field:edit.field,description:''}]:[{field:edit.field,description:edit.description},...(edit.partner?[{field:edit.partner,description:edit.partnerDescription}]:[])]);
        output={...output,hierarchy,ontologyPairingVersion:1,ontologyDescriptions:descriptions};
      }
      const next=ontologyReadModel(ontologyConfiguration(output),output.ontologyDescriptions);
      const affected=new Set([key,...(old?.partner?[normalizeFieldName(old.partner)]:[]),...(edit.kind==='assign'&&edit.partner?[normalizeFieldName(edit.partner)]:[])]);
      changes.push({index,edit,before:current.filter(/** Only affected endpoints travel in the per-intent diff. */ field=>affected.has(field.key)),after:next.filter(/** Include retained old partners and newly created endpoints. */ field=>affected.has(field.key))});
    }catch(error){if(error instanceof OntologyBatchError)throw error;throw new OntologyBatchError(index,error instanceof Error&&'issue' in error?String(error.issue):'invalid',error instanceof Error?error.message:'Invalid ontology edit');}
  }
  output=captureOntologyBatchInput(output);
  const after=ontologyReadModel(ontologyConfiguration(output),output.ontologyDescriptions);
  if(JSON.stringify({before,after,changes}).length>ONTOLOGY_BATCH_LIMITS.characters)throw new OntologyBatchError(-1,'limit','Ontology review exceeds the output budget');
  return {edits,input,output,before,after,changes};
}
