/**
 * Host-free predicate grammar and AST construction. Syntax failures return structured, one-based character locations; presentation belongs to the consumer.
 */
import {
  predicateAll,
  predicateAny,
  predicateCall,
  predicateCompare,
  predicateLiteral,
  predicateNot,
  predicateProperty,
  type GraphPredicateExpression,
  type GraphPredicateFunction,
  type GraphPredicateNamespace,
  type GraphPredicateValue,
} from "./predicate";

type TokenKind = "identifier" | "string" | "number" | "operator" | "punct" | "eof";
type Token = { kind: TokenKind; text: string; value?: unknown; position: number };

const NAMESPACES = new Set<GraphPredicateNamespace>(["node", "edge", "evidence", "note", "file", "this"]);

export type PredicateParseIssue =
  | { code: "unterminated-string"; position: number }
  | { code: "invalid-number"; position: number; value: string }
  | { code: "unexpected-token"; position: number; value: string }
  | { code: "empty-expression"; position: number }
  | { code: "expected-token"; position: number; expected: string; found: string | null }
  | { code: "comparison-right-value"; position: number }
  | { code: "expected-value"; position: number; found: string | null }
  | { code: "unknown-namespace"; position: number; value: string }
  | { code: "expected-property"; position: number; namespace: string }
  | { code: "function-arguments-values"; position: number }
  | { code: "unknown-function"; position: number; value: string }
  | { code: "unknown-method"; position: number; value: string }
  | { code: "invalid-expression"; position: number };

class PredicateSyntaxError extends Error {
  /** Retain the structured syntax issue as an English machine diagnostic; no user-visible sentence is created here. */
  constructor(readonly issue: PredicateParseIssue) {
    super(issue.code);
    this.name = "PredicateSyntaxError";
  }
}

/** Tokenize predicate syntax while reporting invalid literals as structured issues with one-based source positions. */
function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const push = (kind: TokenKind, text: string, position: number, value?: unknown) => tokens.push({ kind, text, position, value });
  while (i < source.length) {
    const ch = source[i];
    if (/\s/.test(ch)) { i += 1; continue; }
    const start = i;
    const pair = source.slice(i, i + 2);
    if (["==", "!=", ">=", "<=", "&&", "||"].includes(pair)) {
      push("operator", pair, start); i += 2; continue;
    }
    if ([">", "<", "!"].includes(ch)) { push("operator", ch, start); i += 1; continue; }
    if (["(", ")", "[", "]", ".", ","].includes(ch)) { push("punct", ch, start); i += 1; continue; }
    if (ch === "\"" || ch === "'") {
      const quote = ch;
      i += 1;
      let value = "";
      let closed = false;
      while (i < source.length) {
        const current = source[i++];
        if (current === quote) { closed = true; break; }
        if (current !== "\\") { value += current; continue; }
        if (i >= source.length) break;
        const escaped = source[i++];
        if (escaped === "n") value += "\n";
        else if (escaped === "r") value += "\r";
        else if (escaped === "t") value += "\t";
        else value += escaped;
      }
      if (!closed) throw new PredicateSyntaxError({ code: "unterminated-string", position: start + 1 });
      push("string", source.slice(start, i), start, value);
      continue;
    }
    if (/[0-9]/.test(ch) || (ch === "-" && /[0-9]/.test(source[i + 1] ?? ""))) {
      i += 1;
      while (i < source.length && /[0-9.]/.test(source[i])) i += 1;
      const text = source.slice(start, i);
      const value = Number(text);
      if (!Number.isFinite(value)) throw new PredicateSyntaxError({ code: "invalid-number", position: start + 1, value: text });
      push("number", text, start, value);
      continue;
    }
    if (/[A-Za-z_$]/.test(ch)) {
      i += 1;
      while (i < source.length && /[A-Za-z0-9_$-]/.test(source[i])) i += 1;
      push("identifier", source.slice(start, i), start);
      continue;
    }
    throw new PredicateSyntaxError({ code: "unexpected-token", position: start + 1, value: ch });
  }
  tokens.push({ kind: "eof", text: "", position: source.length });
  return tokens;
}

type PropertyPath = { namespace: GraphPredicateNamespace; key: string };

type PrimaryValue =
  | { kind: "value"; value: GraphPredicateValue }
  | { kind: "expression"; expression: GraphPredicateExpression };

class Parser {
  private cursor = 0;
  constructor(private readonly source: string, private readonly tokens: Token[]) {}

  /** Parse the complete expression and reject empty input or trailing tokens with structured issues. */
  parse(): GraphPredicateExpression {
    if (!this.source.trim()) throw new PredicateSyntaxError({ code: "empty-expression", position: 1 });
    const expression = this.parseOr();
    this.expect("eof");
    return expression;
  }

  private current(): Token { return this.tokens[this.cursor]; }
  private advance(): Token { return this.tokens[this.cursor++]; }
  private is(text: string): boolean { return this.current().text.toLowerCase() === text.toLowerCase(); }
  private match(text: string): boolean { if (!this.is(text)) return false; this.advance(); return true; }
  /** Consume the required token or report its expected kind and the found text; null denotes end of input. */
  private expect(kindOrText: string): Token {
    const token = this.current();
    if (token.kind === kindOrText || token.text === kindOrText) return this.advance();
    throw new PredicateSyntaxError({ code: "expected-token", position: token.position + 1, expected: kindOrText, found: token.text || null });
  }

  private parseOr(): GraphPredicateExpression {
    let left = this.parseAnd();
    const parts = [left];
    while (this.match("||") || this.match("or")) parts.push(this.parseAnd());
    return parts.length === 1 ? left : predicateAny(...parts);
  }

  private parseAnd(): GraphPredicateExpression {
    let left = this.parseUnary();
    const parts = [left];
    while (this.match("&&") || this.match("and")) parts.push(this.parseUnary());
    return parts.length === 1 ? left : predicateAll(...parts);
  }

  private parseUnary(): GraphPredicateExpression {
    if (this.match("!") || this.match("not")) return predicateNot(this.parseUnary());
    if (this.match("(")) {
      const expression = this.parseOr();
      this.expect(")");
      return expression;
    }
    return this.parseComparisonOrCall();
  }

  /** Parse a comparison or boolean-valued call and reject an absent right-hand value at its source position. */
  private parseComparisonOrCall(): GraphPredicateExpression {
    const left = this.parsePrimary();
    if (left.kind === "expression") return left.expression;
    const operatorToken = this.current();
    const operator = operatorToken.text;
    if (["==", "!=", ">", ">=", "<", "<="].includes(operator)) {
      this.advance();
      const right = this.parsePrimary();
      if (right.kind !== "value") throw new PredicateSyntaxError({ code: "comparison-right-value", position: operatorToken.position + 1 });
      const mapped = operator === "==" ? "eq" : operator === "!=" ? "neq" : operator === ">" ? "gt" : operator === ">=" ? "gte" : operator === "<" ? "lt" : "lte";
      return predicateCompare(mapped, left.value, right.value);
    }
    // A bare property is useful for boolean frontmatter fields and mirrors common expression languages.
    return predicateCompare("eq", left.value, predicateLiteral(true));
  }

  /** Parse a grouped expression, literal or namespaced selector without producing presentation copy. */
  private parsePrimary(): PrimaryValue {
    const token = this.current();
    if (token.kind === "string" || token.kind === "number") {
      this.advance();
      return { kind: "value", value: predicateLiteral(token.value) };
    }
    if (token.kind !== "identifier") throw new PredicateSyntaxError({ code: "expected-value", position: token.position + 1, found: token.text || null });
    const lowered = token.text.toLowerCase();
    if (lowered === "true" || lowered === "false" || lowered === "null") {
      this.advance();
      return { kind: "value", value: predicateLiteral(lowered === "null" ? null : lowered === "true") };
    }

    const path = this.parseIdentifierPath();
    if (this.match("(")) return { kind: "expression", expression: this.parseCall(path) };

    // Property method call, e.g. note.status.contains("active") or file.hasTag("meeting").
    if (this.is(".")) {
      const saved = this.cursor;
      this.advance();
      const method = this.expect("identifier").text;
      if (this.match("(")) return { kind: "expression", expression: this.parseMethodCall(path, method) };
      this.cursor = saved;
    }

    return { kind: "value", value: predicateProperty(path.namespace, path.key) };
  }

  /** Read a namespaced property path and report unknown namespaces or missing property names as structured issues. */
  private parseIdentifierPath(): PropertyPath {
    const first = this.expect("identifier");
    const namespace = first.text as GraphPredicateNamespace;
    if (!NAMESPACES.has(namespace)) throw new PredicateSyntaxError({ code: "unknown-namespace", position: first.position + 1, value: first.text });
    if (namespace === "this" && !this.is(".") && !this.is("[")) return { namespace, key: "path" };

    let key = "";
    if (this.match(".")) key = this.expect("identifier").text;
    else if (this.match("[")) {
      const field = this.expect("string");
      key = typeof field.value === "string" ? field.value : "";
      this.expect("]");
    } else if (namespace !== "this") {
      // Function namespaces such as value.exists(...) are handled as call paths below.
      return { namespace, key: "" };
    }
    if (!key && namespace !== "this") throw new PredicateSyntaxError({ code: "expected-property", position: this.current().position + 1, namespace });
    return { namespace, key: key || "path" };
  }

  /** Read comma-separated function values and reject nested expressions where the grammar requires values. */
  private parseArguments(): GraphPredicateValue[] {
    const args: GraphPredicateValue[] = [];
    if (this.match(")")) return args;
    while (true) {
      const primary = this.parsePrimary();
      if (primary.kind !== "value") throw new PredicateSyntaxError({ code: "function-arguments-values", position: this.current().position + 1 });
      args.push(primary.value);
      if (this.match(")")) return args;
      this.expect(",");
    }
  }

  /** Resolve a supported predicate function name and return its AST call, reporting unknown names structurally. */
  private parseCall(path: PropertyPath): GraphPredicateExpression {
    const args = this.parseArguments();
    const name = `${path.namespace}.${path.key}`;
    if (name === "file.hasTag") return predicateCall("tags.has", predicateProperty("file", "tags"), ...args);
    if (name === "file.inFolder") return predicateCall("file.inFolder", predicateProperty("file", "path"), ...args);
    const allowed = new Set<GraphPredicateFunction>(["text.contains", "text.equals", "text.startsWith", "text.endsWith", "collection.contains", "tags.has", "value.exists", "file.inFolder"]);
    if (!allowed.has(name as GraphPredicateFunction)) throw new PredicateSyntaxError({ code: "unknown-function", position: this.current().position + 1, value: name });
    return predicateCall(name as GraphPredicateFunction, ...args);
  }

  /** Resolve selector-method syntax to the shared predicate function AST or return a structured unknown-method issue. */
  private parseMethodCall(path: PropertyPath, method: string): GraphPredicateExpression {
    const args = this.parseArguments();
    const property = predicateProperty(path.namespace, path.key);
    const normalized = method.toLowerCase();
    if (path.namespace === "file" && path.key === "hasTag" && normalized === "") {
      return predicateCall("tags.has", predicateProperty("file", "tags"), ...args);
    }
    // parseIdentifierPath consumes `file.hasTag` as a path. Treat it as a function-like convenience.
    if (path.namespace === "file" && path.key === "hasTag") return predicateCall("tags.has", predicateProperty("file", "tags"), ...args);
    if (path.namespace === "file" && path.key === "inFolder") return predicateCall("file.inFolder", predicateProperty("file", "path"), ...args);
    if (normalized === "contains") return predicateCall("text.contains", property, ...args);
    if (normalized === "equals") return predicateCall("text.equals", property, ...args);
    if (normalized === "startswith") return predicateCall("text.startsWith", property, ...args);
    if (normalized === "endswith") return predicateCall("text.endsWith", property, ...args);
    if (normalized === "hastag") return predicateCall("tags.has", property, ...args);
    if (normalized === "infolder") return predicateCall("file.inFolder", property, ...args);
    if (normalized === "exists") return predicateCall("value.exists", property);
    throw new PredicateSyntaxError({ code: "unknown-method", position: this.current().position + 1, value: method });
  }
}

/**
 * Parse the safe, Bases-inspired expression syntax used by named K-Plex Graph Lenses.
 * This is a hand-written parser that produces the checkpoint-1 predicate AST; it never evaluates
 * JavaScript and deliberately has no arbitrary function-call escape hatch.
 */
export function parseGraphPredicateExpression(source: string): GraphPredicateExpression {
  return new Parser(source, tokenize(source)).parse();
}

/** Return a parsed AST or a structured syntax issue, keeping error wording outside portable parsing. */
export function tryParseGraphPredicateExpression(source: string): { expression?: GraphPredicateExpression; error?: PredicateParseIssue } {
  try { return { expression: parseGraphPredicateExpression(source) }; }
  catch (error) {
    if (error instanceof PredicateSyntaxError) return { error: error.issue };
    return { error: { code: "invalid-expression", position: 1 } };
  }
}
