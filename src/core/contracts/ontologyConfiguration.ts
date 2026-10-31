/** Settings-only ontology grammar and projection. Raw configured lists are the persisted authority;
 * compiled consumers receive ordinary physical fields while presentation receives reciprocal pairs.
 * No source parsing, evidence classification, host work or persistence belongs to this module. */
import {normalizeFieldName} from './fieldName';

export const ONTOLOGY_GROUPS = ['hidden','parents','children','leftFriends','rightFriends','previous','next','exclusions'] as const;
export type OntologyGroup = typeof ONTOLOGY_GROUPS[number];
export type OntologyHierarchy = Readonly<Record<OntologyGroup, readonly string[]>> & Readonly<{friends?: readonly string[]}>;
export type OntologyRole = 'parent'|'child'|'left'|'right'|'previous'|'next'|'hidden'|'excluded';
export const ONTOLOGY_ROLE_GROUP: Readonly<Record<OntologyRole,OntologyGroup>> = {hidden:'hidden',parent:'parents',child:'children',left:'leftFriends',right:'rightFriends',previous:'previous',next:'next',excluded:'exclusions'};
export const ONTOLOGY_RECIPROCAL: Readonly<Partial<Record<OntologyRole,OntologyRole>>> = {parent:'child',child:'parent',left:'left',right:'right',previous:'next',next:'previous'};
export type OntologyPair = Readonly<{field:string;partner:string;role:OntologyRole;partnerRole:OntologyRole}>;
export type OntologyConfiguration = Readonly<{hierarchy:OntologyHierarchy;pairs:ReadonlyMap<string,OntologyPair>;roles:ReadonlyMap<string,OntologyRole>}>;
export type OntologyConfigurationInput = Readonly<{hierarchy:OntologyHierarchy;ontologyPairingVersion?:number;ontologyDescriptions?:Readonly<Record<string,string>>}>;
export type OntologyIssue = 'malformed'|'self'|'duplicate'|'role'|'unsupported';
/** Callers translate one finite issue code; private property names never become diagnostics. */
export class OntologyConfigurationError extends Error {
  /** Retain a localized-feedback key without leaking field names into generic logs. */
  constructor(readonly issue:OntologyIssue){super('Invalid ontology configuration: '+issue);this.name='SettingsValidationError';}
}
const projected=new WeakMap<OntologyHierarchy,Readonly<{configuration:OntologyConfiguration;lists:readonly Readonly<{fields:readonly string[];count:number}>[]}>>();
/** Escape only settings syntax; the resulting effective field is exactly the original property name. */
export function escapeOntologyField(field:string):string {return field.replace(/\\/g,'\\\\').replace(/\//g,'\\/');}
/** Recognize one unescaped separator and explicit slash/backslash escapes without touching note grammar. */
function entryParts(entry:string):string[] {
  const parts=[''];let escaped=false;
  for(const char of entry){if(escaped){if(char!=='/'&&char!=='\\')throw new OntologyConfigurationError('malformed');parts[parts.length-1]+=char;escaped=false;}else if(char==='\\')escaped=true;else if(char==='/')parts.push('');else parts[parts.length-1]+=char;}
  if(!escaped&&parts.length===1&&!parts[0].trim())return parts;
  if(escaped||parts.length>2||parts.some(/** Both pair names must be nonempty before normalization. */ part=>!part.trim()||!normalizeFieldName(part.trim())))throw new OntologyConfigurationError('malformed');
  return parts.length===1?parts:parts.map(/** Surrounding pair syntax whitespace is not part of a physical property. */ part=>part.trim());
}
/** Expand once per immutable committed hierarchy identity; legacy callers retain literal slash semantics. */
export function ontologyConfiguration(input:OntologyConfigurationInput, captureMutation=false):OntologyConfiguration {
  if(input.ontologyPairingVersion!==undefined&&input.ontologyPairingVersion!==1)throw new OntologyConfigurationError('unsupported');
  if(input.ontologyPairingVersion!==1)return {hierarchy:input.hierarchy,pairs:new Map(),roles:rolesFor(input.hierarchy)};
  if(captureMutation)projected.delete(input.hierarchy);
  const cached=projected.get(input.hierarchy);
  // Legacy controls can replace/push a list before committing. Check only eight array identities
  // and lengths, never scan/compare field contents on a rendering or compiler read. saveSettings
  // explicitly captures rarer same-length in-place changes; immutable field edits need no reset.
  if(cached&&cached.lists.every(/** Constant-size role metadata detects legacy list replacement without reparsing unchanged settings. */ (list,index)=>list.fields===input.hierarchy[ONTOLOGY_GROUPS[index]]&&list.count===list.fields.length))return cached.configuration;
  const fields=Object.fromEntries(ONTOLOGY_GROUPS.map(/** New arrays never share mutable state with the editable settings. */ group=>[group,[] as string[]])) as Record<OntologyGroup,string[]>;
  const pairs=new Map<string,OntologyPair>();
  for(const [role,group] of Object.entries(ONTOLOGY_ROLE_GROUP) as [OntologyRole,OntologyGroup][]){
    for(const entry of input.hierarchy[group]){
      const parts=entryParts(entry);fields[group].push(parts[0]);
      if(parts.length===1)continue;
      const inverse=ONTOLOGY_RECIPROCAL[role];if(!inverse)throw new OntologyConfigurationError('role');
      const first=normalizeFieldName(parts[0]),second=normalizeFieldName(parts[1]);
      if(first===second)throw new OntologyConfigurationError('self');
      if(pairs.has(first)||pairs.has(second))throw new OntologyConfigurationError('duplicate');
      pairs.set(first,{field:parts[0],partner:parts[1],role,partnerRole:inverse});pairs.set(second,{field:parts[1],partner:parts[0],role:inverse,partnerRole:role});
    }
  }
  const roles=rolesFor(fields);
  for(const pair of pairs.values()){
    const normalized=normalizeFieldName(pair.field),group=ONTOLOGY_ROLE_GROUP[pair.role];
    for(const other of ONTOLOGY_GROUPS)if(other!==group&&fields[other].some(/** Competing roles require explicit correction, never silent precedence. */ field=>normalizeFieldName(field)===normalized))throw new OntologyConfigurationError('role');
    if(!roles.has(normalized)){fields[group].push(pair.field);roles.set(normalized,pair.role);}
    // A standalone counterpart can anchor its existing ordering. Only paired fields collapse
    // redundant assignments; genuine multiplicity of every unrelated field remains untouched.
    let seen=false;fields[group]=fields[group].filter(/** Keep the first physical assignment's position and spelling. */ field=>{if(normalizeFieldName(field)!==normalized)return true;if(seen)return false;seen=true;return true;});
  }
  const result={hierarchy:fields,pairs,roles:rolesFor(fields)};
  projected.set(input.hierarchy,{configuration:result,lists:ONTOLOGY_GROUPS.map(/** Retain only this root's finite list metadata. */ group=>({fields:input.hierarchy[group],count:input.hierarchy[group].length}))});return result;
}
/** Retain established group precedence for ordinary unpaired field lookup. */
function rolesFor(hierarchy:OntologyHierarchy):Map<string,OntologyRole> {
  const roles=new Map<string,OntologyRole>();for(const [role,group] of Object.entries(ONTOLOGY_ROLE_GROUP) as [OntologyRole,OntologyGroup][])for(const field of hierarchy[group]??[]){const normalized=normalizeFieldName(field);if(!roles.has(normalized))roles.set(normalized,role);}return roles;
}
/** Preserve every pre-syntax property spelling losslessly; migration runs before setting version 1. */
export function escapeLegacyOntology(hierarchy:OntologyHierarchy):Record<OntologyGroup,string[]> {
  return Object.fromEntries(ONTOLOGY_GROUPS.map(/** Preserve ordering and multiplicity already established by legacy migration. */ group=>[group,hierarchy[group].map(escapeOntologyField)])) as Record<OntologyGroup,string[]>;
}

/** A textarea owns its primary assignments, not an implicitly assigned former counterpart.
 * Removing/replacing a pair preserves that counterpart as an ordinary field in its old role. */
export function editOntologyEntries(input:OntologyConfigurationInput, group:OntologyGroup, entries:readonly string[]):Record<OntologyGroup,string[]> {
  return retainOntologyCounterparts(input,{...input.hierarchy,[group]:[...entries]} as Record<OntologyGroup,string[]>);
}

/** Preserve former implicit counterparts unless a complete imported role explicitly replaces them.
 * Manual field edits and partial foreign imports share this reconciliation and validator; a full
 * imported role remains authoritative rather than restoring fields it deliberately replaced. */
export function retainOntologyCounterparts(input:OntologyConfigurationInput,next:Record<OntologyGroup,string[]>,replacedGroups:readonly OntologyGroup[]=[]):Record<OntologyGroup,string[]> {
  const previous=ontologyConfiguration(input);
  const projected=ontologyConfiguration({...input,hierarchy:next});
  for(const group of ONTOLOGY_GROUPS)for(const entry of input.hierarchy[group]){
    const parts=input.ontologyPairingVersion===1?entryParts(entry):[entry];if(parts.length!==2)continue;
    const key=normalizeFieldName(parts[1]);if(projected.roles.has(key))continue;
    const role=previous.roles.get(key)!;const counterpartGroup=ONTOLOGY_ROLE_GROUP[role];
    if(replacedGroups.includes(counterpartGroup))continue;
    next[counterpartGroup]=[...next[counterpartGroup],escapeOntologyField(parts[1])];
  }
  ontologyConfiguration({...input,hierarchy:next},true);return next;
}

/** Existing compatible fields only; the edited field's current partner remains selectable.
 * Hidden/Excluded have no counterpart. No discovery, host lookup or silent reassignment occurs. */
export function eligibleOntologyPartners(configuration:OntologyConfiguration, field:string, role:OntologyRole):string[] {
  const reciprocal=ONTOLOGY_RECIPROCAL[role];if(!reciprocal)return [];
  const normalized=normalizeFieldName(field),seen=new Set<string>();
  return configuration.hierarchy[ONTOLOGY_ROLE_GROUP[reciprocal]].filter(/** One physical field can have at most one current partner, including across other roles. */ candidate=>{
    if(!candidate.trim())return false;
    const key=normalizeFieldName(candidate),paired=configuration.pairs.get(key);
    if(key===normalized||seen.has(key)||paired&&normalizeFieldName(paired.partner)!==normalized)return false;
    seen.add(key);return true;
  });
}

/** Update one field/pair without stealing a partner, sorting unrelated fields or losing role anchors.
 * Standalone counterpart entries preserve their old position; projection suppresses only their
 * redundant paired assignments. Clearing/replacing a pair retains the former partner's role. */
export function assignOntologyField(input:OntologyConfigurationInput, field:string, role:OntologyRole, partner:string|null):Record<OntologyGroup,string[]> {
  if(input.ontologyPairingVersion===undefined)return assignOntologyField({hierarchy:escapeLegacyOntology(input.hierarchy),ontologyPairingVersion:1},field,role,partner);
  const configuration=ontologyConfiguration(input),normalized=normalizeFieldName(field),paired=configuration.pairs.get(normalized);
  const reciprocal=ONTOLOGY_RECIPROCAL[role],partnerKey=partner===null?null:normalizeFieldName(partner);
  if(!normalized||partnerKey==='')throw new OntologyConfigurationError('malformed');
  if(partnerKey===normalized)throw new OntologyConfigurationError('self');
  if(partnerKey){
    if(!reciprocal||configuration.roles.get(partnerKey)!==reciprocal)throw new OntologyConfigurationError('role');
    const other=configuration.pairs.get(partnerKey);if(other&&normalizeFieldName(other.partner)!==normalized)throw new OntologyConfigurationError('duplicate');
  }
  if(configuration.roles.get(normalized)===role&&(paired?normalizeFieldName(paired.partner):null)===partnerKey)
    return {...input.hierarchy,...Object.fromEntries(ONTOLOGY_GROUPS.map(/** An unchanged Save must not rewrite the pair's original declaration side or retained legacy keys. */ group=>[group,[...input.hierarchy[group]]]))} as Record<OntologyGroup,string[]>;
  const result={...input.hierarchy,...Object.fromEntries(ONTOLOGY_GROUPS.map(/** Work only on independent settings arrays, preserving unrelated retained legacy configuration. */ group=>[group,[...input.hierarchy[group]]]))} as Record<OntologyGroup,string[]>;
  if(paired){
    for(const group of ONTOLOGY_GROUPS)result[group]=result[group].map(/** Detach just this pair, preserving its declaration-side assignment. */ entry=>{
      const parts=input.ontologyPairingVersion===1?entryParts(entry):[entry];return parts.length===2&&parts.some(/** Either endpoint owns the same declaration. */ part=>normalizeFieldName(part)===normalized)?escapeOntologyField(parts[0]):entry;
    });
    for(const endpoint of [paired.field,paired.partner]){
      const key=normalizeFieldName(endpoint),endpointRole=configuration.roles.get(key)!;
      const group=ONTOLOGY_ROLE_GROUP[endpointRole];
      if(!result[group].some(/** A counterpart's existing anchor already owns its ordering. */ entry=>normalizeFieldName(entryParts(entry)[0])===key))result[group].push(escapeOntologyField(endpoint));
    }
  }
  const target=ONTOLOGY_ROLE_GROUP[role];let kept=false;
  for(const group of ONTOLOGY_GROUPS)result[group]=result[group].flatMap(/** Move only the edited assignment; retain all other fields verbatim. */ entry=>{
    const parts=input.ontologyPairingVersion===1?entryParts(entry):[entry];if(normalizeFieldName(parts[0])!==normalized)return [entry];
    if(group!==target||kept)return [];kept=true;return [escapeOntologyField(field.trim())];
  });
  if(!kept)result[target].push(escapeOntologyField(field.trim()));
  if(partnerKey){const canonical=configuration.hierarchy[ONTOLOGY_ROLE_GROUP[reciprocal!]].find(/** Reuse the actual configured physical spelling. */ value=>normalizeFieldName(value)===partnerKey)!;
    result[target]=result[target].map(/** Replace precisely the retained edited-field anchor. */ entry=>normalizeFieldName(entryParts(entry)[0])===normalized?`${escapeOntologyField(field.trim())}/${escapeOntologyField(canonical)}`:entry);
  }
  ontologyConfiguration({hierarchy:result,ontologyPairingVersion:1});return result;
}

/** Finite editor intents; pair changes are prepared together before the single durable host write. */
export type OntologyEdit = Readonly<{kind:'assign';field:string;role:OntologyRole;partner:string|null;createPartner?:boolean;movePair?:boolean;description?:string;partnerDescription?:string}> | Readonly<{kind:'remove';field:string}>;

/** Capture only an endpoint's raw assignments and pair declaration for optimistic concurrency.
 * Unrelated local edits remain mergeable; changed spelling, multiplicity or declaration side conflicts. */
export function ontologyEndpointState(input:OntologyConfigurationInput, field:string):readonly unknown[] {
  const key=normalizeFieldName(field),configuration=ontologyConfiguration(input);
  return [configuration.roles.get(key),configuration.pairs.get(key),input.ontologyDescriptions&&Object.prototype.hasOwnProperty.call(input.ontologyDescriptions,field)?input.ontologyDescriptions[field]:undefined,...ONTOLOGY_GROUPS.map(/** Retain exact affected declarations without depending on unrelated list positions. */ group=>[group,input.hierarchy[group].filter(/** A pair's implicit endpoint owns its original declaration too. */ entry=>(input.ontologyPairingVersion===1?entryParts(entry):[entry]).some(/** Use established identity, never presentation spelling. */ name=>normalizeFieldName(name)===key))])];
}

/** Apply a complete editor candidate without touching source properties or unrelated raw entries.
 * New partners and pair-wide role moves are explicit; hidden/excluded pairs must first be unpaired. */
export function applyOntologyEdit(input:OntologyConfigurationInput, edit:OntologyEdit):Record<OntologyGroup,string[]> {
  if(input.ontologyPairingVersion===undefined)return applyOntologyEdit({hierarchy:escapeLegacyOntology(input.hierarchy),ontologyPairingVersion:1},edit);
  const config=ontologyConfiguration(input),key=normalizeFieldName(edit.field),oldRole=config.roles.get(key),oldPair=config.pairs.get(key);
  if(!key||!edit.field.trim())throw new OntologyConfigurationError('malformed');
  if(edit.kind==='remove'){
    if(!oldRole)return {...input.hierarchy} as Record<OntologyGroup,string[]>;
    const unpaired=oldPair?assignOntologyField(input,edit.field,oldRole,null):input.hierarchy;
    const result={...unpaired} as Record<OntologyGroup,string[]>;
    for(const group of ONTOLOGY_GROUPS)result[group]=unpaired[group].filter(/** Remove this name's assignments only, retaining its partner and ordering. */ entry=>normalizeFieldName(entryParts(entry)[0])!==key);
    ontologyConfiguration({...input,hierarchy:result});return result;
  }
  let candidate=input;
  const partnerKey=edit.partner===null?null:normalizeFieldName(edit.partner),reciprocal=ONTOLOGY_RECIPROCAL[edit.role];
  if(edit.movePair){
    if(!oldPair||partnerKey!==normalizeFieldName(oldPair.partner)||!reciprocal)throw new OntologyConfigurationError('role');
    // An unchanged Save must retain the original declaration side and raw order.
    if(oldRole===edit.role)return assignOntologyField(input,edit.field,edit.role,edit.partner);
    const detached=assignOntologyField(input,edit.field,oldRole!,null);
    const moved=assignOntologyField({...input,hierarchy:detached},oldPair.partner,reciprocal,null);
    candidate={...input,hierarchy:moved};
  }
  if(edit.createPartner){
    if(!partnerKey||partnerKey===key)throw new OntologyConfigurationError(partnerKey===key?'self':'malformed');
    if(!reciprocal||config.roles.has(partnerKey)||config.pairs.has(partnerKey))throw new OntologyConfigurationError('role');
    candidate={...candidate,hierarchy:assignOntologyField(candidate,edit.partner!,reciprocal,null)};
  }
  return assignOntologyField(candidate,edit.field,edit.role,edit.partner);
}
