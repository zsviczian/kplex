/** Pure ontology vocabulary reads and bounded authored descriptions. Settings remain the
 * authority; callers supply optional discovery already in memory. No graph/source work occurs. */
import {normalizeFieldName} from './fieldName';
import {ONTOLOGY_ROLE_GROUP, type OntologyConfiguration, type OntologyRole} from './ontologyConfiguration';

export const ONTOLOGY_DESCRIPTION_LIMIT=1000;
export type OntologyDescriptions=Readonly<Record<string,string>>;
export type DiscoveredOntologyField=Readonly<{normalized:string;name:string;count:number}>;
export type OntologyReadField=Readonly<{key:string;name:string;role:OntologyRole|'unassigned';roles:readonly OntologyRole[];partner?:string;partnerRole?:OntologyRole;description?:string;configured:boolean;discovered:boolean;count?:number}>;

/** Read only an own string value; physical names such as constructor must not recover prototypes. */
export function ontologyDescription(descriptions:OntologyDescriptions|undefined,field:string):string|undefined {
  return descriptions&&Object.prototype.hasOwnProperty.call(descriptions,field)&&typeof descriptions[field]==='string'?descriptions[field]:undefined;
}

/** Preserve exact physical keys and literal authored text; malformed entries remain inert.
 * Older settings have no descriptions. Blank text means absence; excess text is bounded on load. */
export function normalizeOntologyDescriptions(value:unknown):OntologyDescriptions {
  if(!value||typeof value!=='object'||Array.isArray(value))return {};
  return Object.fromEntries(Object.entries(value).filter(/** Only literal property names and authored strings are accepted. */ ([name,text])=>Boolean(normalizeFieldName(name))&&typeof text==='string'&&Boolean(text.trim()))
    .map(/** Loading never changes property spelling or interprets Markdown/HTML. */ ([name,text])=>[name,String(text).slice(0,ONTOLOGY_DESCRIPTION_LIMIT)]));
}

/** Reject an oversized submitted draft rather than silently truncating an accepted Save. */
export function validateOntologyDescription(text:string):void {
  if(text.length>ONTOLOGY_DESCRIPTION_LIMIT){const error=new Error('Ontology description exceeds its limit');error.name='SettingsValidationError';throw error;}
}

/** Update just the selected exact physical names; undefined preserves, blank clears.
 * A detached dictionary keeps atomic pair edits out of live settings before durable acceptance. */
export function editOntologyDescriptions(current:OntologyDescriptions,changes:readonly Readonly<{field:string;description?:string}>[]):OntologyDescriptions {
  const result={...current};
  for(const {field,description} of changes){
    if(description===undefined)continue;
    validateOntologyDescription(description);
    if(description.trim())Object.defineProperty(result,field,{value:description,enumerable:true,writable:true,configurable:true});
    else delete result[field];
  }
  return result;
}

/** Project one entry per established ontology identity, retaining exact physical spelling,
 * reciprocal meaning, literal own description and truthful configured/discovered flags. */
export function ontologyReadModel(configuration:OntologyConfiguration,descriptions:OntologyDescriptions={},discovered:readonly DiscoveredOntologyField[]=[]):OntologyReadField[] {
  const fields=new Map<string,OntologyReadField>();
  for(const [role,group] of Object.entries(ONTOLOGY_ROLE_GROUP) as [OntologyRole,keyof typeof configuration.hierarchy][]){
    for(const name of configuration.hierarchy[group]??[]){
      const key=normalizeFieldName(name);if(!key)continue;
      const prior=fields.get(key);
      if(prior){if(!prior.roles.includes(role))fields.set(key,{...prior,roles:[...prior.roles,role]});continue;}
      const pair=configuration.pairs.get(key);
      fields.set(key,{key,name,role:configuration.roles.get(key)??role,roles:[role],partner:pair?.partner,partnerRole:pair?.partnerRole,description:ontologyDescription(descriptions,name),configured:true,discovered:false});
    }
  }
  for(const field of discovered){
    const key=normalizeFieldName(field.name);if(!key)continue;
    const prior=fields.get(key);
    fields.set(key,prior?{...prior,discovered:true,count:field.count}:{key,name:field.name,role:'unassigned',roles:[],configured:false,discovered:true,count:field.count});
  }
  return [...fields.values()];
}
