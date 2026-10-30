/** Read-only ontology vocabulary projections shared by native managers and selection surfaces.
 * Rows collapse pairs; options preserve every physical field. Neither projection discovers or saves data. */
import {normalizeFieldName} from '../../core/contracts/fieldName';
import {type OntologyConfiguration, type OntologyRole} from '../../core/contracts/ontologyConfiguration';
import type {Translator} from '../../lang';
import {ontologyReadModel,type OntologyDescriptions,type DiscoveredOntologyField} from '../../core/contracts/ontologyReadModel';
export type {DiscoveredOntologyField} from '../../core/contracts/ontologyReadModel';

export type OntologyFilter='all'|OntologyRole|'unassigned';
export type OntologyFieldView=Readonly<{key:string;name:string;role:OntologyRole|'unassigned';roles:readonly OntologyRole[];partner?:string;partnerRole?:OntologyRole;description?:string;count?:number;documentCount?:number;countPartial?:boolean}>;
export type OntologyManagerEntry=Readonly<{key:string;first:OntologyFieldView;second?:OntologyFieldView}>;
export type OntologyDocumentCount=Readonly<{count?:number;partial:boolean}>;

/** Overlay explicitly checked document counts without rewriting the historical discovery catalog.
 * A returned zero hides an unassigned name even under partial coverage. Configured fields and
 * failed lookups without a numeric result survive; no stored catalog or assignment is removed.
 */
export function withOntologyDocumentCounts(fields:readonly OntologyFieldView[],counts:ReadonlyMap<string,OntologyDocumentCount>):OntologyFieldView[] {
  const result:OntologyFieldView[]=[];
  for(const field of fields){
    const checked=counts.get(field.key);
    if(field.role==='unassigned'&&checked?.count===0)continue;
    result.push(checked?{...field,documentCount:checked.count,countPartial:checked.partial}:field);
  }
  return result;
}

/** One selectable option per normalized physical identity, retaining the caller's order and spelling. */
export function ontologySelectionFields(fields:readonly string[]):string[] {
  const seen=new Set<string>();return fields.filter(/** Legacy multi-role assignments must not duplicate a physical option. */ field=>{const key=normalizeFieldName(field);if(!key||seen.has(key))return false;seen.add(key);return true;});
}

/** Translate role/state captions identically across the native and React adapters. */
export function ontologyRoleLabel(role:OntologyRole|'unassigned',t:Translator):string {
  switch(role){case 'parent':return t('role.parent');case 'child':return t('role.child');case 'left':return t('role.friendLeft');case 'right':return t('role.challengerRight');case 'previous':return t('role.previous');case 'next':return t('role.next');case 'hidden':return t('role.hidden');case 'excluded':return t('role.excludedMetadata');case 'unassigned':return t('ontology.manager.unassigned');}
}

/** Keep physical spelling, effective precedence and truthful legacy multiplicity without changing lists. */
export function ontologyFieldViews(configuration:OntologyConfiguration,discovered:readonly DiscoveredOntologyField[]=[],descriptions:OntologyDescriptions={}):OntologyFieldView[] {
  return ontologyReadModel(configuration,descriptions,discovered);
}

/** Compact detail annotates a selectable physical field; it never becomes the inserted property. */
export function ontologyFieldDetail(field:OntologyFieldView|undefined,t:Translator,partnerMatch=false):string {
  if(!field)return '';
  const parts=[ontologyRoleLabel(field.role,t)];
  if(field.partner&&field.partnerRole)parts.push(t('ontology.manager.pairedWith',{field:field.partner,role:ontologyRoleLabel(field.partnerRole,t)}));
  if(partnerMatch)parts.push(t('ontology.manager.partnerMatch'));
  if(field.roles.length>1)parts.push(t('ontology.manager.multipleAssignments',{roles:field.roles.map(/** Show every retained assignment's role. */ role=>ontologyRoleLabel(role,t)).join(', ')}));
  return [parts.join(' · '),field.description].filter(Boolean).join('\n');
}

/** Extend an existing ranked matcher with partner-only candidates, retaining original physical values.
 * Matching is injected so native/editor consumers keep their established ranking contracts. */
export function ontologyFuzzyMatches(fields:readonly string[],views:readonly OntologyFieldView[],query:string,match:(values:readonly string[],query:string,limit:number)=>string[],limit:number):string[] {
  const byKey=new Map(views.map(/** Lookup annotations without another vocabulary registry. */ field=>[field.key,field]));
  const unique=ontologySelectionFields(fields),direct=match(unique,query,limit),seen=new Set(direct);
  for(const field of unique){if(seen.has(field))continue;const partner=byKey.get(normalizeFieldName(field))?.partner;if(partner&&match([partner],query,1).length){direct.push(field);seen.add(field);if(direct.length>=limit)break;}}
  return direct.slice(0,limit);
}

/** One deterministic row per pair, oriented by the selected role rather than the query. */
export function ontologyManagerEntries(fields:readonly OntologyFieldView[],filter:OntologyFilter='all',query='',t:Translator):OntologyManagerEntry[] {
  const byKey=new Map(fields.map(/** Index only this already decoded vocabulary. */ field=>[field.key,field])),seen=new Set<string>(),rows:OntologyManagerEntry[]=[];
  for(const field of fields){
    if(seen.has(field.key))continue;
    const partner=field.partner?byKey.get(normalizeFieldName(field.partner)):undefined;
    seen.add(field.key);if(partner)seen.add(partner.key);
    if(filter!=='all'&&field.role!==filter&&partner?.role!==filter)continue;
    let first=field,second=partner;
    if(partner&&(filter!=='all'&&partner.role===filter&&field.role!==filter||((filter==='all'||field.role===partner.role)&&partner.key.localeCompare(field.key)<0))){first=partner;second=field;}
    const haystack=[first,second].filter(/** A single field has no artificial partner. */ (item):item is OntologyFieldView=>Boolean(item)).map(/** Search names and localized status without graph queries. */ item=>`${item.name} ${ontologyFieldDetail(item,t)}`).join(' ').toLocaleLowerCase();
    if(query.trim()&&!haystack.includes(query.trim().toLocaleLowerCase()))continue;
    rows.push({key:[field.key,partner?.key??''].sort().join('\u0000'),first,second});
  }
  return rows.sort(/** Alphabetical presentation never reorders persisted defaults. */ (a,b)=>a.first.name.localeCompare(b.first.name));
}

/** Direct physical-name matches precede partner-only matches; role eligibility is supplied by the caller. */
export function ontologySelectionMatches(fields:readonly string[],views:readonly OntologyFieldView[],query:string):string[] {
  const byKey=new Map(views.map(/** Reuse current field annotations for native string-valued options. */ field=>[field.key,field]));
  const needle=query.toLocaleLowerCase(),direct:string[]=[],indirect:string[]=[];
  for(const name of ontologySelectionFields(fields)){if(name.toLocaleLowerCase().includes(needle))direct.push(name);else if(byKey.get(normalizeFieldName(name))?.partner?.toLocaleLowerCase().includes(needle))indirect.push(name);}
  return [...direct,...indirect];
}
