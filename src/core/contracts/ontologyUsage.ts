/** Detached cached ontology-usage pages. Physical documents are inspection candidates, not
 * editable evidence or whole-vault absence certificates. Cursors are opaque expiring leases. */
export type OntologyDocumentsRequest=Readonly<{field:string;limit?:number;cursor?:string}>;
export type OntologyDocumentsPage=Readonly<{field:string;normalizedField:string;
  documents:readonly Readonly<{path:string;name:string;sourceId:string}>[];cursor:string|null;
  exhausted:boolean;postingComplete:boolean;wholeVaultComplete:false;partial:boolean;scanned:number;truncated:boolean}>;
