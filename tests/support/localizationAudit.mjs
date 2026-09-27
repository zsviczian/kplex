/**
 * AST audit of direct UI copy sinks, including nested display expressions.
 * This guards known presentation APIs; it is not a general data-flow proof and does
 * not inspect developer diagnostics, stable IDs, user data or translator arguments.
 */
import ts from "typescript";

const methods = new Set(["setText", "setTitle", "setName", "setDesc", "setButtonText", "setPlaceholder", "setTooltip"]);
const properties = new Set(["text", "label", "placeholder", "aria-label", "ariaLabel", "title"]);
const attributes = new Set(["aria-label", "placeholder", "title", "alt"]);
const assignments = new Set(["textContent", "innerText", "placeholder", "title", "ariaLabel"]);

/** Audit a source string and return located violations without reading or changing files. */
export function auditUserCopy(source, filename = "fixture.tsx") {
  const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, filename.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const violations = [];
  /** Record only alphabetic copy; numbers, symbols and empty UI values are exempt. */
  function record(node, sink, text = node.text) {
    if (!/[\p{L}]{2}/u.test(text ?? "")) return;
    const position = file.getLineAndCharacterOfPosition(node.getStart(file));
    violations.push(`${filename}:${position.line + 1}:${position.character + 1} ${sink}: ${node.getText(file)}`);
  }
  /** Follow display branches without interpreting condition strings or translation call arguments. */
  function display(node, sink) {
    if (!node) return;
    if (ts.isStringLiteralLike(node)) record(node, sink);
    else if (ts.isTemplateExpression(node)) {
      record(node.head, sink);
      for (const span of node.templateSpans) { display(span.expression, sink); record(span.literal, sink); }
    } else if (ts.isConditionalExpression(node)) {
      display(node.whenTrue, sink); display(node.whenFalse, sink);
    } else if (ts.isBinaryExpression(node)) {
      const operator = node.operatorToken.kind;
      if ([ts.SyntaxKind.PlusToken, ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken].includes(operator)) display(node.left, sink);
      if ([ts.SyntaxKind.PlusToken, ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.AmpersandAmpersandToken].includes(operator)) display(node.right, sink);
    } else if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isNonNullExpression(node)) display(node.expression, sink);
    else if (ts.isArrayLiteralExpression(node)) for (const child of node.elements) display(child, sink);
  }
  /** Inspect known host, React and DOM sinks while leaving arbitrary application data alone. */
  function inspect(node) {
    if (ts.isCallExpression(node)) {
      const call = node.expression;
      const name = ts.isPropertyAccessExpression(call) ? call.name.text : ts.isIdentifier(call) ? call.text : "";
      if (methods.has(name)) display(node.arguments[0], name);
      if (name === "setAttribute" && ts.isStringLiteralLike(node.arguments[0]) && attributes.has(node.arguments[0].text)) display(node.arguments[1], name);
      if (name === "addOption") display(node.arguments[1], name);
      if (name === "addOptions" && node.arguments[0] && ts.isObjectLiteralExpression(node.arguments[0])) {
        for (const option of node.arguments[0].properties) if (ts.isPropertyAssignment(option)) display(option.initializer, name);
      }
      if (name === "createElement" && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) {
        for (const child of node.arguments.slice(2)) display(child, "React child");
      }
    }
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "Notice") display(node.arguments?.[0], "Notice");
    if (ts.isPropertyAssignment(node)) {
      const name = ts.isIdentifier(node.name) || ts.isStringLiteralLike(node.name) ? node.name.text : "";
      const settings = ts.isObjectLiteralExpression(node.parent) && node.parent.properties.some((property) =>
        ts.isPropertyAssignment(property) && (
          ["control", "items", "action"].includes(property.name.getText(file)) ||
          (property.name.getText(file) === "type" && ts.isStringLiteralLike(property.initializer) && ["page", "group", "heading"].includes(property.initializer.text))));
      const call = node.parent.parent;
      const command = ts.isCallExpression(call) && ts.isPropertyAccessExpression(call.expression) && call.expression.name.text === "addCommand";
      if (properties.has(name) || ((settings || command) && ["name", "desc", "heading"].includes(name))) display(node.initializer, `property ${name}`);
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isPropertyAccessExpression(node.left) && assignments.has(node.left.name.text)) display(node.right, `assignment ${node.left.name.text}`);
    if (ts.isJsxAttribute(node) && attributes.has(node.name.text) && node.initializer) {
      display(ts.isJsxExpression(node.initializer) ? node.initializer.expression : node.initializer, `JSX ${node.name.text}`);
    }
    if (ts.isJsxText(node)) record(node, "JSX text", node.text.trim());
    if (ts.isJsxExpression(node) && !ts.isJsxAttribute(node.parent)) display(node.expression, "JSX display");
    ts.forEachChild(node, inspect);
  }
  inspect(file);
  return [...new Set(violations)];
}
