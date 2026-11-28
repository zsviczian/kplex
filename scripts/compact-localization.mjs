/**
 * Projects the typed localization source into plain production data for esbuild.
 * English supplies the shared key order. Locale arrays use that order only within
 * the same build, while the checked-in catalogs retain stable keys and author guidance.
 */
import {readFile} from "node:fs/promises";
import {basename, dirname, join, resolve} from "node:path";
import ts from "typescript";

/** Read named literal properties, preserving initializer syntax and rejecting duplicate keys. */
function properties(source, object) {
  if (!object || !ts.isObjectLiteralExpression(object)) {
    throw Error(source.fileName + " must use a catalog object literal");
  }
  const entries = new Map();
  for (const field of object.properties) {
    if (!ts.isPropertyAssignment(field) || !(ts.isStringLiteral(field.name) || ts.isIdentifier(field.name))) {
      throw Error(source.fileName + " must use literal catalog property names");
    }
    if (entries.has(field.name.text)) throw Error(source.fileName + " contains duplicate key " + field.name.text);
    entries.set(field.name.text, field.initializer);
  }
  return entries;
}

/** Locate the catalog declaration while allowing the source's type assertions and satisfies clause. */
async function readCatalog(path, matchesName) {
  const source = ts.createSourceFile(path, await readFile(path, "utf8"), ts.ScriptTarget.Latest, true);
  const declarations = [];

  /** Find the source data declaration whether top-level or inside a lazy locale factory. */
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && matchesName(node.name.text)) {
      declarations.push(node);
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
  if (declarations.length !== 1) throw Error(path + " must declare exactly one localization catalog");
  let literal = declarations[0].initializer;
  while (literal && (ts.isAsExpression(literal) || ts.isSatisfiesExpression(literal))) {
    literal = literal.expression;
  }
  return {source, literal, entries: properties(source, literal)};
}

/** Verify all author guidance before omitting it from the English runtime catalog. */
function projectEnglish({source, entries}) {
  const projected = [];
  for (const [key, entry] of entries) {
    const fields = properties(source, entry);
    const context = fields.get("context");
    if (!context || !(ts.isStringLiteral(context) || ts.isNoSubstitutionTemplateLiteral(context)) || !context.text.trim()) {
      throw Error(source.fileName + ": " + key + " requires non-empty translator context");
    }
    fields.delete("context");
    const fieldsSource = Array.from(fields, ([name, value]) => JSON.stringify(name) + ":" + value.getText(source));
    projected.push(JSON.stringify(key) + ":{" + fieldsSource.join(",") + "}");
  }
  return "{" + projected.join(",") + "}";
}

/** Emit translated values in English key order, leaving gaps for the existing English fallback. */
function projectLocale({source, entries}, englishKeys) {
  const unknownKey = Array.from(entries.keys()).find(key => !englishKeys.has(key));
  if (unknownKey !== undefined) throw Error(source.fileName + " contains unknown localization key " + unknownKey);
  const values = Array.from(englishKeys, key => entries.get(key)?.getText(source));
  return "[" + values.slice(0, values.findLastIndex(value => value !== undefined) + 1)
    .map(value => value ?? "null").join(",") + "]";
}

/** Compact both native and standalone production builds through the same catalog projection. */
export function compactLocalization(root) {
  const directory = resolve(root, "src", "lang");
  const englishPath = join(directory, "en.ts");
  return {
    name: "compact-localization",
    setup(build) {
      let english;
      /** Load the English catalog once per build, regardless of esbuild's module load order. */
      build.onStart(() => { english = undefined; });
      /** Replace only the catalog literal so its module, stable IDs and lazy factory are preserved. */
      build.onLoad({filter: /[\\/]lang[\\/][a-z]{2}(-[A-Z]{2})?\.ts$/}, async ({path}) => {
        if (dirname(path) !== directory) return;
        english ??= readCatalog(englishPath, name => name === "englishCatalog");
        const base = await english;
        const isEnglish = basename(path) === "en.ts";
        const catalog = isEnglish ? base : await readCatalog(path, name => name.endsWith("Translations"));
        // Object.keys applies the same property ordering as the runtime English object.
        const data = isEnglish ? projectEnglish(base)
          : projectLocale(catalog, new Set(Object.keys(Object.fromEntries(base.entries))));
        const {source, literal} = catalog;
        return {
          contents: source.text.slice(0, literal.getStart(source)) + data + source.text.slice(literal.end),
          loader: "ts",
          watchFiles: [englishPath, path],
          resolveDir: directory,
        };
      });
    },
  };
}
