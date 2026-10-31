/** Native input adapter for reciprocal ontology matching and explicit new-partner choices.
 * The caller validates creation and owns assignment; this adapter renders bounded suggestions. */
import {AbstractInputSuggest,type App} from 'obsidian';
import {fuzzyFilterStrings} from './FuzzySearchInput';
import {ontologyFieldDetail,ontologyFieldViews} from './features/ontologyPresentation';
import {normalizeFieldName} from '../core/contracts/fieldName';
import type {OntologyDescriptions} from '../core/contracts/ontologyReadModel';
import type {OntologyConfiguration} from '../core/contracts/ontologyConfiguration';
import type {Translator} from '../lang';

/** Existing physical names remain plain strings; creation is an explicit, revalidated intent. */
type OntologyPartnerSuggestion=string|Readonly<{create:string}>;

export class OntologyPartnerSuggest extends AbstractInputSuggest<OntologyPartnerSuggestion> {
  /** Attach one native input; no vault or graph inventory is acquired. */
  constructor(app:App,input:HTMLInputElement,private readonly fields:()=>readonly string[],private readonly choose:(field:string,create:boolean)=>void,private readonly configuration?:()=>OntologyConfiguration,private readonly translate?:Translator,private readonly canCreate?:(field:string)=>boolean,private readonly descriptions:()=>OntologyDescriptions=()=>({})){super(app,input);this.limit=24;}
  /** Reuse reciprocal-field matching and reserve a row for a valid, explicitly new name. */
  protected getSuggestions(query:string):OntologyPartnerSuggestion[]{
    const field=query.trim(),create=Boolean(this.translate&&this.canCreate?.(field));
    const matches:OntologyPartnerSuggestion[]=fuzzyFilterStrings(this.fields(),query,this.limit-(create?1:0));
    if(create)matches.push({create:field});
    return matches;
  }
  /** Native rows use the owning document and physical field spelling. */
  renderSuggestion(suggestion:OntologyPartnerSuggestion,element:HTMLElement):void {
    if(typeof suggestion!=='string'){
      element.createDiv({text:this.translate!('ontology.manager.createPartnerChoice',{field:suggestion.create}),cls:'suggestion-title'});return;
    }
    const field=suggestion;
    element.createDiv({text:field,cls:'suggestion-title'});
    if(this.configuration&&this.translate){const view=ontologyFieldViews(this.configuration(),[],this.descriptions()).find(/** Locate the selectable physical field without changing its identity. */ item=>item.key===normalizeFieldName(field));element.createDiv({text:ontologyFieldDetail(view?{...view,description:undefined}:undefined,this.translate),cls:'suggestion-note'});if(view?.description)element.createDiv({text:view.description,cls:'suggestion-note kplex-ontology-description',attr:{'aria-label':view.description}});element.setAttribute('aria-label',[field,ontologyFieldDetail(view,this.translate)].join('\n'));}
  }
  /** Accept only a still-eligible native choice; closing cannot retarget another editor. */
  selectSuggestion(suggestion:OntologyPartnerSuggestion):void {
    const create=typeof suggestion!=='string',field=typeof suggestion==='string'?suggestion:suggestion.create;
    if(create?this.canCreate?.(field):this.fields().includes(field)){this.setValue(field);this.choose(field,create);}
    this.close();
  }
}
