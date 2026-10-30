/** Unified native vocabulary manager over StyleManagerList. The plugin retains configuration,
 * discovery and persistence; list interactions operate only on already available metadata. */
import {Modal,Notice} from 'obsidian';
import type KplexPlugin from '../main';
import {ontologyConfiguration} from '../core/contracts/ontologyConfiguration';
import {normalizeFieldName} from '../core/contracts/fieldName';
import type {OntologyUsageResult} from '../adapters/obsidian/ontologyUsage';
import {ontologyFieldViews,ontologyManagerEntries,ontologyFieldDetail,ontologyRoleLabel,withOntologyDocumentCounts,type OntologyFieldView,type OntologyDocumentCount,type OntologyFilter} from './features/ontologyPresentation';
import {StyleManagerList} from './StyleManagerList';
import {AddToOntologyModal} from './AddToOntologyModal';

export class OntologyManagerModal extends Modal {
  private manager:StyleManagerList|null=null;
  private query='';
  private opened=false;
  private release:(()=>void)|null=null;
  private releaseWindow:(()=>void)|null=null;
  private children=new Set<AddToOntologyModal>();
  private readonly documentCounts=new Map<string,OntologyDocumentCount>();
  private refreshGeneration=0;
  private refreshing=false;
  private refreshProgress={done:0,total:0};
  private refreshButton:HTMLButtonElement|null=null;

  /** Capture only the plugin's existing host owners and a presentation filter. */
  constructor(private readonly plugin:KplexPlugin,private filter:OntologyFilter='all',private readonly closed?:()=>void){super(plugin.app);}

  /** Reuse shared manager search/actions/windowing; no discovery rescan runs on open. */
  onOpen():void {
    this.opened=true;const t=this.plugin.translator;
    this.setTitle(t('ontology.manager.title'));this.modalEl.addClass('kplex-style-manager-modal','kplex-ontology-manager');
    this.contentEl.createEl('p',{text:t('ontology.manager.help'),cls:'setting-item-description'});
    this.manager=new StyleManagerList(this.contentEl,t,{placeholder:t('ontology.manager.search'),aria:t('ontology.manager.search')},/** Typing retires only an explicitly requested recount, never starts another. */ query=>{this.cancelRefresh();this.query=query;this.renderList();});
    const select=this.manager.controls.createEl('select',{attr:{'aria-label':t('ontology.manager.show')}});
    select.createEl('option',{text:t('styles.allRoles'),attr:{value:'all'}});
    const directions=select.createEl('optgroup',{attr:{label:t('ontology.relationshipRole')}});
    for(const role of ['parent','child','left','right','previous','next'] as const)directions.createEl('option',{text:ontologyRoleLabel(role,t),attr:{value:role}});
    const states=select.createEl('optgroup',{attr:{label:t('ontology.manager.states')}});
    for(const role of ['hidden','unassigned','excluded'] as const)states.createEl('option',{text:ontologyRoleLabel(role,t),attr:{value:role}});
    select.value=this.filter;select.addEventListener('change',/** Filtering never obtains additional source data. */ ()=>{this.cancelRefresh();this.filter=select.value as OntologyFilter;this.manager?.reset();this.renderList();});
    this.manager.action(t('ontology.manager.add'),'plus',()=>this.edit(''));
    this.refreshButton=this.manager.action(t('ontology.manager.refreshCounts'),'refresh-cw',()=>{void this.refreshCounts();});
    this.contentEl.createEl('p',{text:t('ontology.manager.refreshCountsHelp'),cls:'setting-item-description'});
    const rescan=this.contentEl.createDiv({cls:'kplex-style-actions'}).createEl('button',{text:t('ontology.manager.rescan'),attr:{type:'button'}});
    this.contentEl.createEl('p',{text:t('settings.ui.rescan.note.properties.now.this.can.take.longer.in.a.lar'),cls:'setting-item-description'});
    rescan.addEventListener('click',/** Deliberate costly discovery uses the existing index owner and warns before selection. */ ()=>{this.cancelRefresh();this.documentCounts.clear();rescan.disabled=true;void this.plugin.rebuildIndex(true,true,'ontology-discovery').then(/** Refresh only this still-mounted manager. */ ()=>{if(this.opened)this.renderList();}).catch(/** Fail visibly without treating missing inventory as complete. */ ()=>{if(this.opened)new Notice(t('styles.operation.notSaved'));}).finally(/** A retired shell cannot be revived by completion. */ ()=>{if(this.opened)rescan.disabled=false;});});
    this.release=this.plugin.index?.subscribePresentation(/** Semantic and caption publications refresh clean rows, never editor drafts. */ ()=>this.renderList())??null;
    const view=this.contentEl.ownerDocument.defaultView,close=():void=>this.close();view?.addEventListener('pagehide',close,{once:true});this.releaseWindow=()=>view?.removeEventListener('pagehide',close);
    this.renderList();
  }

  /** Open the existing structured editor; preserve manager query/filter/window and owning focus. */
  private edit(field:string):void {
    if(!this.opened)return;
    this.cancelRefresh();
    const focus=this.contentEl.ownerDocument.activeElement,scroll=this.contentEl.scrollTop;
    const dialog=new AddToOntologyModal(this.plugin,field,()=>this.renderList(),/** Exact child closure releases its lifetime and restores the manager's position. */ ()=>{this.children.delete(dialog);if(this.opened){this.contentEl.scrollTop=scroll;if(focus instanceof this.contentEl.ownerDocument.defaultView!.HTMLElement&&focus.isConnected)focus.focus({preventScroll:true});else this.manager?.search.focus({preventScroll:true});}},/** Reuse an already requested document list; never start a second lookup on editor return. */ (name,result)=>{if(this.opened)this.rememberCount(name,result);});
    this.children.add(dialog);dialog.open();
  }

  /** Read saved configuration plus the existing discovered vocabulary without querying any uses. */
  private fields():OntologyFieldView[]{return ontologyFieldViews(ontologyConfiguration(this.plugin.settings),this.plugin.index?.unassignedOntologyFields()??[],this.plugin.settings.ontologyDescriptions);}

  /** Retire stale completions on filter/search/editor changes or native close. */
  private cancelRefresh():void {this.refreshGeneration++;this.refreshing=false;if(this.refreshButton)this.refreshButton.disabled=false;}

  /** Share the completed lookup's numeric result; partial zeroes hide only unassigned rows. */
  private rememberCount(name:string,result:OntologyUsageResult):void {
    this.documentCounts.set(normalizeFieldName(name),{count:result.documents.length,partial:result.partial});this.renderList();
  }

  /** Explicitly recount all matching fields, including undisclosed or previously hidden zero rows.
   * No automatic recount runs on open/publication; only existing cached field postings are read.
   */
  private async refreshCounts():Promise<void> {
    if(!this.opened||this.refreshing)return;
    const generation=++this.refreshGeneration,current=():boolean=>this.opened&&this.refreshGeneration===generation;
    const entries=ontologyManagerEntries(this.fields(),this.filter,this.query,this.plugin.translator);
    const fields=new Map<string,OntologyFieldView>();
    for(const entry of entries)for(const field of [entry.first,entry.second])if(field)fields.set(field.key,field);
    this.refreshing=true;this.refreshProgress={done:0,total:fields.size};this.renderList();
    try{
      for(const field of fields.values()){
        if(!current())return;
        try{const result=await this.plugin.index.ontologyUsage(field.name,current);if(!current())return;this.rememberCount(field.name,result);}
        catch{if(!current())return;this.documentCounts.set(field.key,{partial:true});}
        this.refreshProgress.done++;this.renderList();
      }
    }finally{if(current()){this.refreshing=false;this.renderList();}}
  }

  /** Render bounded pair rows from current saved configuration and the existing discovered inventory. */
  private renderList():void {
    if(!this.opened||!this.manager)return;
    const t=this.plugin.translator,fields=withOntologyDocumentCounts(this.fields(),this.documentCounts);
    const entries=ontologyManagerEntries(fields,this.filter,this.query,t),windowed=this.manager.window(entries);
    this.manager.status.setText(t('ontology.manager.counts',{entries:entries.length,fields:fields.filter(/** Configured counts exclude incomplete discovery. */ field=>field.role!=='unassigned').length})+' '+(this.refreshing?t('ontology.manager.counting',this.refreshProgress):entries.some(/** Visible partial counts remain labelled; a failed lookup has no numeric result. */ entry=>entry.first.countPartial||entry.second?.countPartial)?t('ontology.manager.countsPartial'):''));
    if(this.refreshButton)this.refreshButton.disabled=this.refreshing;
    this.manager.list.empty();
    if(!entries.length)this.manager.list.createDiv({cls:'kplex-style-manager-empty',text:t('ontology.manager.empty')});
    for(const entry of windowed.visible){
      const row=this.manager.row(()=>this.edit(entry.first.name)),copy=row.createDiv({cls:'kplex-style-manager-copy'});
      for(const field of [entry.first,entry.second])if(field){
        copy.createDiv({cls:'kplex-style-manager-name',text:field.name});
        copy.createDiv({cls:'kplex-style-manager-summary',text:ontologyFieldDetail({...field,partner:undefined,partnerRole:undefined,description:undefined},t)});
        if(field.description)copy.createDiv({cls:'kplex-ontology-description',text:field.description,attr:{'aria-label':field.description}});
        if(field.documentCount!==undefined)copy.createDiv({cls:'kplex-style-manager-summary',text:t(field.countPartial?'ontology.manager.documentsPartial':'ontology.manager.documents',{count:field.documentCount})});
        else if(field.count!==undefined)copy.createDiv({cls:'kplex-style-manager-summary',text:t(field.count===1?'settings.occurrenceOne':'settings.occurrenceMany',{count:field.count})});
      }
      if(!entry.second)copy.createDiv({cls:'kplex-style-manager-summary',text:t(entry.first.role==='unassigned'?'ontology.manager.unassignedHelp':'ontology.pairNone')});
    }
    this.manager.more(windowed,()=>this.renderList());
  }

  /** Release subscriptions and every child without cancelling operations already accepted by storage. */
  onClose():void {
    this.opened=false;this.cancelRefresh();this.documentCounts.clear();this.release?.();this.release=null;this.releaseWindow?.();this.releaseWindow=null;
    for(const child of this.children)child.close();this.children.clear();this.manager=null;this.contentEl.empty();this.closed?.();
  }
}
