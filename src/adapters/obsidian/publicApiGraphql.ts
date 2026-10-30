/** Lazy GraphQL.js transport for trusted local automation. Only synchronous existing API reads
 * are exposed; there is no server, mutation, index scheduler or body reader. Expanded selections,
 * variables, resolver work and serialized output have finite budgets. Disposal releases schema. */
/*! @license GraphQL.js
MIT License

Copyright (c) GraphQL Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
import {buildSchema,parse,validate,executeSync,getOperationAST,Kind,OperationTypeNode,GraphQLError,defaultFieldResolver,isObjectType,isInterfaceType,type GraphQLSchema,type SelectionSetNode,type FragmentDefinitionNode,type ValueNode,type GraphQLFieldResolver} from 'graphql';
import {PUBLIC_API_LIMITS as limits,PublicApiError,type PublicApiResult,type PublicGraphqlRequest,type PublicGraphqlExecution} from '../../application/publicApiContracts';
import type {PublicApi} from '../../application/PublicApi';

const schemaText=`
scalar JSON
type Revision { semantic: Int!, source: Int!, configuration: Int!, canvas: Int }
type Coverage { scope: String!, complete: Boolean!, pending: Boolean!, discoveryComplete: Boolean }
type Status { phase: String!, upToDate: Boolean!, indexedFiles: Int!, totalFiles: Int, coverage: Coverage!, searchComplete: Boolean!, hydrating: Boolean!, sourceReady: Boolean!, mode: String! }
type OntologyField { key: String!, name: String!, role: String!, roles: [String!]!, partner: String, partnerRole: String, description: String, configured: Boolean!, discovered: Boolean!, count: Int }
type Ontology { fields: [OntologyField!]!, truncated: Boolean!, discoveryComplete: Boolean!, coverage: Coverage!, revision: Revision! }
type File { name: String!, extension: String!, path: String!, mtime: Float, basename: String, ctime: Float, size: Float }
type Node { id: ID!, name: String!, path: String, kind: String!, resolution: String!, mtime: Float, url: String, aliases: [String!]!, tags: [String!]!, noteType: String, file: File, coverage: Coverage, revision: Revision }
type NodePage { items: [Node!]!, truncated: Boolean!, scanned: Int!, coverage: Coverage!, revision: Revision! }
type Relationship { sourceId: ID!, targetId: ID!, role: String!, relationType: Int!, direction: Int, definition: String }
type RelationshipPage { items: [Relationship!]!, truncated: Boolean!, scanned: Int!, coverage: Coverage!, revision: Revision! }
type ResolvedRole { role: String!, relationType: Int! }
type EvidenceDecision { id: String!, sourceId: ID!, targetId: ID!, role: String!, relationType: Int!, direction: Int!, sourceKind: String!, declaredByPath: String!, declaredTargetPath: String!, declaredRole: String!, fieldName: String, definition: String, line: Int, start: Int, end: Int, active: Boolean!, suppressionReason: String }
type Evidence { sourceId: ID!, targetId: ID!, resolvedRoles: [ResolvedRole!]!, hidden: Boolean!, summary: String!, decisions: [EvidenceDecision!]!, truncated: Boolean!, coverage: Coverage!, revision: Revision! }
type Rect { x: Float!, y: Float!, width: Float!, height: Float! }
type Point { x: Float!, y: Float! }
type Camera { x: Float!, y: Float!, scale: Float! }
type Viewport { width: Float!, height: Float! }
type CanvasSummary { id: ID!, viewId: String!, attention: ID, root: ID, surface: String!, visible: Boolean!, revision: Int! }
type Preset { id: String!, label: String! }
type Lens { id: String!, name: String!, mode: String!, scope: String! }
type QuickFilter { field: String!, operator: String!, value: String! }
type Filters { layoutMode: String!, globalActive: Boolean!, find: String!, areas: JSON!, quick: QuickFilter }
type Occurrence { id: ID!, nodeId: ID, kind: String!, label: String!, role: String!, areaId: String, bounds: Rect!, included: Boolean!, inViewport: Boolean!, description: String, badge: String }
type Connection { id: String!, kind: String!, sourceOccurrence: ID!, targetOccurrence: ID!, sourceNodeId: ID, targetNodeId: ID, role: String, definition: String, relationType: Int, direction: Int }
type Decoration { id: String!, kind: String!, label: String, bounds: Rect, points: [Point!] }
type Area { id: String!, bounds: Rect!, viewport: Rect, scrollTop: Float!, contentHeight: Float! }
type Canvas { canvas: CanvasSummary!, semanticRevision: Int!, sourceRevision: Int!, configurationRevision: Int!, scenePending: Boolean!, motionPending: Boolean!, state: JSON, preset: Preset, lenses: [Lens!]!, filters: Filters!, folds: [String!]!, selection: ID, occurrences: [Occurrence!]!, connections: [Connection!]!, decorations: [Decoration!]!, areas: [Area!]!, camera: Camera!, viewport: Viewport!, bounds: Rect, coverage: Coverage!, truncated: Boolean! }
type ExportCapabilities { image: Boolean!, mindmapMarkdown: Boolean! }
type Capabilities { version: Int!, readOnlyGraphql: Boolean!, operations: [String!]!, exports: ExportCapabilities!, limits: JSON! }
type Query {
 status: Status!
 coverage(id: ID): Coverage!
 ontology(includeDiscovered: Boolean = false, limit: Int = 2048): Ontology!
 ontologyGuide(format: String = "markdown", includeDiscovered: Boolean = false, limit: Int = 2048): JSON!
 node(id: ID!): Node
 search(query: String!, limit: Int = 40): NodePage!
 neighbors(id: ID!, role: String, limit: Int = 40): RelationshipPage!
 evidence(sourceId: ID!, targetId: ID!, limit: Int = 128): Evidence
 canvases: [CanvasSummary!]!
 canvas(canvasId: ID): Canvas!
 context(canvasId: ID): String!
 capabilities: Capabilities!
}`;

type ExecutionBudget={remaining:number;cancelled:()=>boolean};
const meteredFields=new WeakSet<object>();
/** Meter both ordinary and built-in introspection resolvers. GraphQL's default fieldResolver
 * alone cannot meter introspection because those fields have explicit library resolvers.
 * Shared introspection fields are wrapped once; wrappers retain no schema/service/host owner. */
function meterSchema(schema:GraphQLSchema):void {
  for(const type of Object.values(schema.getTypeMap()))if(isObjectType(type)||isInterfaceType(type))for(const field of Object.values(type.getFields())){
    if(meteredFields.has(field))continue;meteredFields.add(field);
    const original:GraphQLFieldResolver<unknown,ExecutionBudget>=field.resolve??defaultFieldResolver;
    field.resolve=/** Every selected field/list charges the same request-local work frame. */(source:unknown,args:Record<string,unknown>,context:ExecutionBudget,info)=>{
      if(context.cancelled())throw new GraphQLError('Request was cancelled',{extensions:{code:'CANCELLED'}});
      if(--context.remaining<0)throw new GraphQLError('GraphQL resolver cost exceeds its budget',{extensions:{code:'LIMIT_EXCEEDED'}});
      const value:unknown=original(source,args,context,info);
      if(Array.isArray(value)&&(context.remaining-=value.length)<0)throw new GraphQLError('GraphQL list cost exceeds its budget',{extensions:{code:'LIMIT_EXCEEDED'}});
      return value;
    };
  }
}

/** Read literal/variable list bounds without executing a resolver or interpreting query syntax anew. */
function argumentValue(value:ValueNode,variables:Readonly<Record<string,unknown>>):unknown {
  if(value.kind===Kind.VARIABLE)return variables[value.name.value];
  if(value.kind===Kind.INT)return Number(value.value);
  return undefined;
}
/** Expand fragments under a strict finite work/depth budget, including repeated alias selections. */
function selectionBudget(selection:SelectionSetNode,fragments:ReadonlyMap<string,FragmentDefinitionNode>,variables:Readonly<Record<string,unknown>>,depth=0,budget={cost:0},active=new Set<string>()):void {
  if(depth>limits.queryDepth)throw new PublicApiError('LIMIT_EXCEEDED','GraphQL selection depth exceeds its budget');
  for(const item of selection.selections){
    if(++budget.cost>limits.queryCost)throw new PublicApiError('LIMIT_EXCEEDED','GraphQL expanded selection exceeds its cost budget');
    if(item.kind===Kind.FRAGMENT_SPREAD){
      const name=item.name.value,fragment=fragments.get(name);if(active.has(name))throw new PublicApiError('INVALID_ARGUMENT','GraphQL fragment cycle');
      if(fragment){active.add(name);selectionBudget(fragment.selectionSet,fragments,variables,depth,budget,active);active.delete(name);}
    }else{
      if(item.kind===Kind.FIELD){
        const limit=item.arguments?.find(argument=>argument.name.value==='limit');
        if(limit){const amount=argumentValue(limit.value,variables);if(typeof amount==='number'&&(!Number.isInteger(amount)||amount<1||amount>limits.ontology))throw new PublicApiError('LIMIT_EXCEEDED','GraphQL page limit exceeds its budget');}
      }
      if(item.selectionSet)selectionBudget(item.selectionSet,fragments,variables,depth+1,budget,active);
    }
  }
}
/** Reject large/deep variables before GraphQL coercion; values remain JSON-only developer input. */
function variableBudget(value:unknown,depth=0,budget={nodes:4096,characters:65536}):void {
  if(depth>12||--budget.nodes<0)throw new PublicApiError('LIMIT_EXCEEDED','GraphQL variables exceed their structural budget');
  if(typeof value==='string')budget.characters-=value.length;
  else if(value&&typeof value==='object')for(const key in value){
    if(!Object.prototype.hasOwnProperty.call(value,key))continue;
    budget.characters-=key.length;variableBudget(Reflect.get(value,key),depth+1,budget);
  }
  else if(typeof value==='function'||typeof value==='symbol'||typeof value==='bigint')throw new PublicApiError('INVALID_ARGUMENT','GraphQL variables must be JSON values');
  if(budget.characters<0)throw new PublicApiError('LIMIT_EXCEEDED','GraphQL variables exceed their character budget');
}
/** Normalize API envelopes into GraphQL values while preserving field-specific revision/coverage. */
function unwrap<T>(result:PublicApiResult<T>):T {
  if(!result.ok)throw new GraphQLError(result.error.message,{extensions:{code:result.error.code,revision:result.revision}});
  const value=result.value;
  return typeof value==='object'&&value!==null&&!Array.isArray(value)?{...value,coverage:Reflect.get(value,'coverage')??result.coverage,revision:result.revision}:value;
}

/** Create a transport without constructing GraphQL types during plugin startup. */
export function createPublicApiGraphql():Readonly<{execute:(reads:PublicApi,request:PublicGraphqlRequest)=>PublicGraphqlExecution;dispose:()=>void}>{
  let schema:GraphQLSchema|null=null,closed=false;
  return{
    /** Execute one synchronous revision frame. No resolver can return an async host operation. */
    execute(reads,request){
      if(closed)throw new PublicApiError('API_UNAVAILABLE','GraphQL transport is unloaded');
      if(typeof request.query!=='string'||request.query.length>limits.queryCharacters)throw new PublicApiError('LIMIT_EXCEEDED','GraphQL query exceeds its character budget');
      if(request.operationName!==undefined&&(typeof request.operationName!=='string'||request.operationName.length>128))throw new PublicApiError('INVALID_ARGUMENT','Invalid GraphQL operation name');
      variableBudget(request.variables??{});
      let document;
      try{document=parse(request.query,{maxTokens:limits.queryTokens});}
      catch(error){if(error instanceof GraphQLError)return{errors:[{message:error.message,extensions:{code:'INVALID_ARGUMENT'}}]};throw error;}
      if(!schema){schema=buildSchema(schemaText);meterSchema(schema);}
      const errors=validate(schema,document,undefined,{maxErrors:32});if(errors.length)return{errors:errors.map(error=>({message:error.message,extensions:{code:'INVALID_ARGUMENT'}}))};
      const operation=getOperationAST(document,request.operationName);
      if(!operation)throw new PublicApiError('INVALID_ARGUMENT','Select one GraphQL operation');
      if(operation.operation!==OperationTypeNode.QUERY)throw new PublicApiError('UNSUPPORTED','GraphQL supports read-only queries');
      const fragments=new Map(document.definitions.filter((definition):definition is FragmentDefinitionNode=>definition.kind===Kind.FRAGMENT_DEFINITION).map(fragment=>[fragment.name.value,fragment]));
      selectionBudget(operation.selectionSet,fragments,request.variables??{});
      const options={requireComplete:request.requireComplete,isCancelled:request.isCancelled,expectedRevision:request.expectedRevision};
      const context:ExecutionBudget={remaining:limits.queryCost,cancelled:/** Caller cancellation is sampled at each actual resolver. */()=>request.isCancelled?.()===true};
      /** Reserve each reader's worst-case native read work before invocation, sharing the query's
       * budget across aliases. Per-operation caps alone would permit repeated dense operands. */
      const boundedRead=<T>(cost:number,read:()=>T):T=>{
        if((context.remaining-=cost)<0)throw new GraphQLError('GraphQL read work exceeds its budget',{extensions:{code:'LIMIT_EXCEEDED'}});
        return read();
      };
      const root={
        status:()=>unwrap(reads.status(options)),coverage:(args:{id?:string})=>unwrap(reads.coverage({...options,...args})),
        ontology:(args:{includeDiscovered?:boolean;limit?:number})=>boundedRead(limits.ontology,()=>unwrap(reads.ontology({...options,...args}))),
        ontologyGuide:(args:{format?:'json'|'markdown';includeDiscovered?:boolean;limit?:number})=>boundedRead(limits.ontology,()=>unwrap(reads.ontologyGuide({...options,...args}))),
        node:(args:{id:string})=>boundedRead(limits.scan,()=>unwrap(reads.node({...options,...args}))),
        search:(args:{query:string;limit?:number})=>boundedRead(limits.scan,()=>unwrap(reads.search({...options,...args}))),
        neighbors:(args:{id:string;role?:'parent'|'child'|'left'|'right'|'previous'|'next';limit?:number})=>boundedRead(limits.scan,()=>unwrap(reads.neighbors({...options,...args}))),
        evidence:(args:{sourceId:string;targetId:string;limit?:number})=>boundedRead(limits.scan,()=>unwrap(reads.evidence({...options,...args}))),
        canvases:()=>unwrap(reads.canvases(options)),canvas:(args:{canvasId?:string})=>boundedRead(limits.scan,()=>unwrap(reads.canvas({...options,...args}))),
        context:(args:{canvasId?:string})=>boundedRead(limits.scan,()=>unwrap(reads.context({...options,...args}))),capabilities:()=>unwrap(reads.capabilities()),
      };
      const result=executeSync({schema,document,rootValue:root,variableValues:request.variables,operationName:request.operationName,
        contextValue:context});
      const output:PublicGraphqlExecution={...(result.data?{data:result.data}:{}),...(result.errors?{errors:result.errors.slice(0,32).map(error=>({message:error.message,...(error.path?{path:error.path}:{}),extensions:error.extensions}))}:{})};
      if(JSON.stringify(output).length>limits.outputCharacters)throw new PublicApiError('LIMIT_EXCEEDED','GraphQL output exceeds its character budget');
      return output;
    },
    /** No retained service/plugin callback survives unload; the schema itself is released. */
    dispose(){closed=true;schema=null;},
  };
}
