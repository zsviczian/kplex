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

class PredicateSyntaxError extends Error {
  constructor(message: string, readonly position: number) {
    super(`${message} at character ${position + 1}`);
    this.name = "PredicateSyntaxError";
  }
}

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
      if (!closed) throw new PredicateSyntaxError("Unterminated string", start);
      push("string", source.slice(start, i), start, value);
      continue;
    }
    if (/[0-9]/.test(ch) || (ch === "-" && /[0-9]/.test(source[i + 1] ?? ""))) {
      i += 1;
      while (i < source.length && /[0-9.]/.test(source[i])) i += 1;
      const text = source.slice(start, i);
      const value = Number(text);
      if (!Number.isFinite(value)) throw new PredicateSyntaxError(`Invalid number '${text}'`, start);
      push("number", text, start, value);
      continue;
    }
    if (/[A-Za-z_$]/.test(ch)) {
      i += 1;
      while (i < source.length && /[A-Za-z0-9_$-]/.test(source[i])) i += 1;
      push("identifier", source.slice(start, i), start);
      continue;
    }
    throw new PredicateSyntaxError(`Unexpected '${ch}'`, start);
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

  parse(): GraphPredicateExpression {
    if (!this.source.trim()) throw new PredicateSyntaxError("Expression is empty", 0);
    const expression = this.parseOr();
    this.expect("eof");
    return expression;
  }

  private current(): Token { return this.tokens[this.cursor]; }
  private advance(): Token { return this.tokens[this.cursor++]; }
  private is(text: string): boolean { return this.current().text.toLowerCase() === text.toLowerCase(); }
  private match(text: string): boolean { if (!this.is(text)) return false; this.advance(); return true; }
  private expect(kindOrText: string): Token {
    const token = this.current();
    if (token.kind === kindOrText || token.text === kindOrText) return this.advance();
    throw new PredicateSyntaxError(`Expected ${kindOrText}, found '${token.text || "end of expression"}'`, token.position);
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

  private parseComparisonOrCall(): GraphPredicateExpression {
    const left = this.parsePrimary();
    if (left.kind === "expression") return left.expression;
    const operatorToken = this.current();
    const operator = operatorToken.text;
    if (["==", "!=", ">", ">=", "<", "<="].includes(operator)) {
      this.advance();
      const right = this.parsePrimary();
      if (right.kind !== "value") throw new PredicateSyntaxError("The right side of a comparison must be a value", operatorToken.position);
      const mapped = operator === "==" ? "eq" : operator === "!=" ? "neq" : operator === ">" ? "gt" : operator === ">=" ? "gte" : operator === "<" ? "lt" : "lte";
      return predicateCompare(mapped, left.value, right.value);
    }
    // A bare property is useful for boolean frontmatter fields and mirrors common expression languages.
    return predicateCompare("eq", left.value, predicateLiteral(true));
  }

  private parsePrimary(): PrimaryValue {
    const token = this.current();
    if (token.kind === "string" || token.kind === "number") {
      this.advance();
      return { kind: "value", value: predicateLiteral(token.value) };
    }
    if (token.kind !== "identifier") throw new PredicateSyntaxError(`Expected a value, found '${token.text || "end of expression"}'`, token.position);
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

  private parseIdentifierPath(): PropertyPath {
    const first = this.expect("identifier");
    const namespace = first.text as GraphPredicateNamespace;
    if (!NAMESPACES.has(namespace)) throw new PredicateSyntaxError(`Unknown namespace '${first.text}'`, first.position);
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
    if (!key && namespace !== "this") throw new PredicateSyntaxError(`Expected a property after '${namespace}'`, this.current().position);
    return { namespace, key: key || "path" };
  }

  private parseArguments(): GraphPredicateValue[] {
    const args: GraphPredicateValue[] = [];
    if (this.match(")")) return args;
    while (true) {
      const primary = this.parsePrimary();
      if (primary.kind !== "value") throw new PredicateSyntaxError("Function arguments must be values", this.current().position);
      args.push(primary.value);
      if (this.match(")")) return args;
      this.expect(",");
    }
  }

  private parseCall(path: PropertyPath): GraphPredicateExpression {
    const args = this.parseArguments();
    const name = `${path.namespace}.${path.key}`;
    if (name === "file.hasTag") return predicateCall("tags.has", predicateProperty("file", "tags"), ...args);
    if (name === "file.inFolder") return predicateCall("file.inFolder", predicateProperty("file", "path"), ...args);
    const allowed = new Set<GraphPredicateFunction>(["text.contains", "text.equals", "text.startsWith", "text.endsWith", "collection.contains", "tags.has", "value.exists", "file.inFolder"]);
    if (!allowed.has(name as GraphPredicateFunction)) throw new PredicateSyntaxError(`Unknown function '${name}'`, this.current().position);
    return predicateCall(name as GraphPredicateFunction, ...args);
  }

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
    throw new PredicateSyntaxError(`Unknown method '${method}'`, this.current().position);
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

export function tryParseGraphPredicateExpression(source: string): { expression?: GraphPredicateExpression; error?: string } {
  try { return { expression: parseGraphPredicateExpression(source) }; }
  catch (error) { return { error: error instanceof Error ? error.message : String(error) }; }
}
