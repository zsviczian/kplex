import type { GraphNodeView } from "../graph/model";

export type GraphPredicateEvidence = Readonly<Record<string, unknown>>;
export interface GraphPropertyProvider { getNoteProperty(node: GraphNodeView, key: string): unknown; }
const NO_PROPERTIES: GraphPropertyProvider = { getNoteProperty: () => undefined };

export type GraphPredicateNamespace = "node" | "edge" | "evidence" | "note" | "file" | "this";
export type GraphPredicateComparison = "eq" | "neq" | "gt" | "gte" | "lt" | "lte";
export type GraphPredicateFunction =
  | "text.contains"
  | "text.equals"
  | "text.startsWith"
  | "text.endsWith"
  | "collection.contains"
  | "tags.has"
  | "value.exists"
  | "file.inFolder";

export type GraphPredicateValue =
  | { kind: "literal"; value: unknown }
  | { kind: "property"; namespace: GraphPredicateNamespace; key: string };

export type GraphPredicateExpression =
  | { kind: "all"; expressions: GraphPredicateExpression[] }
  | { kind: "any"; expressions: GraphPredicateExpression[] }
  | { kind: "not"; expression: GraphPredicateExpression }
  | { kind: "compare"; operator: GraphPredicateComparison; left: GraphPredicateValue; right: GraphPredicateValue }
  | { kind: "call"; functionName: GraphPredicateFunction; args: GraphPredicateValue[] };

export type GraphPredicateDependencies = {
  namespaces: ReadonlySet<GraphPredicateNamespace>;
  noteProperties: ReadonlySet<string>;
  usesFrontmatter: boolean;
};

export type CompiledGraphPredicate = {
  expression: GraphPredicateExpression;
  dependencies: GraphPredicateDependencies;
};

export type GraphPredicateNodeContext = {
  node: GraphNodeView;
  label?: string;
};

export type GraphPredicateEdgeContext = {
  role?: "parent" | "child" | "left" | "right" | "previous" | "next" | "sibling" | "center";
  /** Preserve raw selector values: defined=1, inferred=2. */
  relationType?: 1 | 2;
  definition?: string;
  /** Preserve raw selector values: to=1, from=2, both=3. */
  linkDirection?: 1 | 2 | 3 | null;
  sourcePath?: string;
  targetPath?: string;
};

export type GraphPredicateContext = {
  node: GraphPredicateNodeContext;
  edge?: GraphPredicateEdgeContext;
  evidence?: GraphPredicateEvidence;
  center?: GraphNodeView;
};

export const predicateLiteral = (value: unknown): GraphPredicateValue => ({ kind: "literal", value });
export const predicateProperty = (namespace: GraphPredicateNamespace, key: string): GraphPredicateValue => ({ kind: "property", namespace, key });
export const predicateAll = (...expressions: GraphPredicateExpression[]): GraphPredicateExpression => ({ kind: "all", expressions });
export const predicateAny = (...expressions: GraphPredicateExpression[]): GraphPredicateExpression => ({ kind: "any", expressions });
export const predicateNot = (expression: GraphPredicateExpression): GraphPredicateExpression => ({ kind: "not", expression });
export const predicateCompare = (
  operator: GraphPredicateComparison,
  left: GraphPredicateValue,
  right: GraphPredicateValue,
): GraphPredicateExpression => ({ kind: "compare", operator, left, right });
export const predicateCall = (functionName: GraphPredicateFunction, ...args: GraphPredicateValue[]): GraphPredicateExpression => ({ kind: "call", functionName, args });

function collectValueDependency(value: GraphPredicateValue, namespaces: Set<GraphPredicateNamespace>, noteProperties: Set<string>): void {
  if (value.kind !== "property") return;
  namespaces.add(value.namespace);
  if (value.namespace === "note" && value.key.trim()) noteProperties.add(value.key.trim());
}

function collectExpressionDependencies(
  expression: GraphPredicateExpression,
  namespaces: Set<GraphPredicateNamespace>,
  noteProperties: Set<string>,
): void {
  if (expression.kind === "all" || expression.kind === "any") {
    for (const child of expression.expressions) collectExpressionDependencies(child, namespaces, noteProperties);
    return;
  }
  if (expression.kind === "not") {
    collectExpressionDependencies(expression.expression, namespaces, noteProperties);
    return;
  }
  if (expression.kind === "compare") {
    collectValueDependency(expression.left, namespaces, noteProperties);
    collectValueDependency(expression.right, namespaces, noteProperties);
    return;
  }
  for (const arg of expression.args) collectValueDependency(arg, namespaces, noteProperties);
}

export function compileGraphPredicate(expression: GraphPredicateExpression): CompiledGraphPredicate {
  const namespaces = new Set<GraphPredicateNamespace>();
  const noteProperties = new Set<string>();
  collectExpressionDependencies(expression, namespaces, noteProperties);
  return {
    expression,
    dependencies: {
      namespaces,
      noteProperties,
      usesFrontmatter: namespaces.has("note"),
    },
  };
}

function asText(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function normalizedText(value: unknown): string | null {
  const text = asText(value);
  return text === null ? null : text.toLocaleLowerCase();
}

function normalizeTag(value: unknown): string | null {
  const text = asText(value)?.trim();
  if (!text) return null;
  return text.replace(/^#/, "").toLocaleLowerCase();
}

function collectionValues(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value === null || value === undefined ? [] : [value];
}

function textContains(value: unknown, query: unknown): boolean {
  const wanted = normalizedText(query);
  if (wanted === null) return false;
  return collectionValues(value).some((item) => normalizedText(item)?.includes(wanted) === true);
}

function textEquals(left: unknown, right: unknown): boolean {
  const leftText = normalizedText(left);
  const rightText = normalizedText(right);
  return leftText !== null && rightText !== null && leftText === rightText;
}

function textStartsWith(value: unknown, query: unknown): boolean {
  const wanted = normalizedText(query);
  if (wanted === null) return false;
  return collectionValues(value).some((item) => normalizedText(item)?.startsWith(wanted) === true);
}

function textEndsWith(value: unknown, query: unknown): boolean {
  const wanted = normalizedText(query);
  if (wanted === null) return false;
  return collectionValues(value).some((item) => normalizedText(item)?.endsWith(wanted) === true);
}

function collectionContains(value: unknown, query: unknown): boolean {
  return collectionValues(value).some((item) => {
    if (typeof item === "string" || typeof query === "string") return textEquals(item, query);
    return item === query;
  });
}

function tagsHave(value: unknown, query: unknown): boolean {
  const wanted = normalizeTag(query);
  if (!wanted) return false;
  return collectionValues(value).some((item) => {
    const tag = normalizeTag(item);
    return tag === wanted || tag?.startsWith(`${wanted}/`) === true;
  });
}

function valueExists(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function fileInFolder(pathValue: unknown, folderValue: unknown): boolean {
  const path = asText(pathValue)?.replaceAll("\\", "/");
  const folder = asText(folderValue)?.replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
  if (!path || folder === undefined || folder === null) return false;
  if (!folder) return !path.includes("/");
  return path === folder || path.startsWith(`${folder}/`);
}

function compareOrdered(left: unknown, right: unknown, operator: Exclude<GraphPredicateComparison, "eq" | "neq">): boolean {
  if (typeof left === "number" && typeof right === "number") {
    if (operator === "gt") return left > right;
    if (operator === "gte") return left >= right;
    if (operator === "lt") return left < right;
    return left <= right;
  }
  const leftText = asText(left);
  const rightText = asText(right);
  if (leftText === null || rightText === null) return false;
  const result = leftText.localeCompare(rightText, undefined, { sensitivity: "base", numeric: true });
  if (operator === "gt") return result > 0;
  if (operator === "gte") return result >= 0;
  if (operator === "lt") return result < 0;
  return result <= 0;
}

function compareValues(left: unknown, right: unknown, operator: GraphPredicateComparison): boolean {
  if (operator === "eq" || operator === "neq") {
    const equal = left === right;
    return operator === "eq" ? equal : !equal;
  }
  return compareOrdered(left, right, operator);
}

function unknownRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function lookupRecordValue(record: Record<string, unknown> | null, key: string): unknown {
  if (!record) return undefined;
  if (Object.prototype.hasOwnProperty.call(record, key)) return record[key];
  const wanted = key.toLocaleLowerCase();
  const match = Object.keys(record).find((candidate) => candidate.toLocaleLowerCase() === wanted);
  return match ? record[match] : undefined;
}

export class GraphPredicateEngine {
  constructor(private readonly properties: GraphPropertyProvider = NO_PROPERTIES) {}

  matches(predicate: CompiledGraphPredicate | null, context: GraphPredicateContext): boolean {
    if (!predicate) return true;
    return this.evaluate(predicate.expression, context);
  }

  private evaluate(expression: GraphPredicateExpression, context: GraphPredicateContext): boolean {
    if (expression.kind === "all") return expression.expressions.every((child) => this.evaluate(child, context));
    if (expression.kind === "any") return expression.expressions.some((child) => this.evaluate(child, context));
    if (expression.kind === "not") return !this.evaluate(expression.expression, context);
    if (expression.kind === "compare") {
      return compareValues(this.resolve(expression.left, context), this.resolve(expression.right, context), expression.operator);
    }
    const args = expression.args.map((arg) => this.resolve(arg, context));
    if (expression.functionName === "text.contains") return textContains(args[0], args[1]);
    if (expression.functionName === "text.equals") return textEquals(args[0], args[1]);
    if (expression.functionName === "text.startsWith") return textStartsWith(args[0], args[1]);
    if (expression.functionName === "text.endsWith") return textEndsWith(args[0], args[1]);
    if (expression.functionName === "collection.contains") return collectionContains(args[0], args[1]);
    if (expression.functionName === "tags.has") return tagsHave(args[0], args[1]);
    if (expression.functionName === "value.exists") return valueExists(args[0]);
    return fileInFolder(args[0], args[1]);
  }

  private resolve(value: GraphPredicateValue, context: GraphPredicateContext): unknown {
    if (value.kind === "literal") return value.value;
    const { namespace, key } = value;
    if (namespace === "node") return this.resolveNode(context.node, key);
    if (namespace === "edge") return this.resolveEdge(context.edge, key);
    if (namespace === "evidence") return this.resolveEvidence(context.evidence, key);
    if (namespace === "file") return this.resolveFile(context.node.node, key);
    if (namespace === "this") return context.center ? this.resolvePage(context.center, key) : undefined;
    return this.resolveNoteProperty(context.node.node, key);
  }

  private resolveNode(node: GraphPredicateNodeContext, key: string): unknown {
    if (key === "label") return node.label ?? node.node.name;
    return this.resolvePage(node.node, key);
  }

  private resolvePage(page: GraphNodeView, key: string): unknown {
    if (key === "path") return page.path;
    if (key === "name") return page.name;
    if (key === "aliases") return page.aliases;
    if (key === "tags") return page.tags;
    if (key === "noteType") return page.noteType;
    if (key === "url") return page.url;
    if (key === "isFolder") return page.kind === "container";
    if (key === "isTag") return page.kind === "tag";
    if (key === "mtime") return page.mtime;
    return undefined;
  }

  private resolveEdge(edge: GraphPredicateEdgeContext | undefined, key: string): unknown {
    if (!edge) return undefined;
    if (key === "role") return edge.role;
    if (key === "relationType") return edge.relationType;
    if (key === "kind") return edge.relationType === 1 ? "defined" : edge.relationType === 2 ? "inferred" : undefined;
    if (key === "definition") return edge.definition;
    if (key === "linkDirection") return edge.linkDirection;
    if (key === "direction") {
      if (edge.linkDirection === 1) return "to";
      if (edge.linkDirection === 2) return "from";
      if (edge.linkDirection === 3) return "both";
      return undefined;
    }
    if (key === "sourcePath") return edge.sourcePath;
    if (key === "targetPath") return edge.targetPath;
    return undefined;
  }

  private resolveEvidence(evidence: GraphPredicateEvidence | undefined, key: string): unknown {
    if (!evidence) return undefined;
    return lookupRecordValue(unknownRecord(evidence), key);
  }

  private resolveFile(page: GraphNodeView, key: string): unknown {
    const file = page.file;
    if (key === "path") return page.path;
    if (!file) return undefined;
    if (key === "name") return file.name;
    if (key === "basename") return file.basename;
    if (key === "extension") return file.extension;
    if (key === "mtime") return file.mtime;
    if (key === "ctime") return file.ctime;
    if (key === "size") return file.size;
    if (key === "tags") return page.tags;
    return undefined;
  }

  private resolveNoteProperty(page: GraphNodeView, key: string): unknown {
    if (page.kind !== "document") return undefined;
    return this.properties.getNoteProperty(page, key);
  }
}
