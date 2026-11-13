/**
 * Host-free, typed localization lookup with bundled locale catalogs, validated parameters, plural
 * forms and exact/base/English fallback. Developer diagnostics remain English; presentation receives
 * the translator through dependency injection rather than reading host language state directly.
 * Source-owned reference metadata quotes literal note/property references consistently across locales;
 * template quote wrappers are normalized while interpolated user values remain opaque text.
 */
import { englishCatalog, type EnglishCatalog } from "./en";
import { germanCatalog } from "./de";
import { spanishCatalog } from "./es";
import { frenchCatalog } from "./fr";
import { japaneseCatalog } from "./ja";
import { dutchCatalog } from "./nl";
import { russianCatalog } from "./ru";
import { traditionalChineseCatalog } from "./zh-TW";

type PrimitiveParam = string | number;
type CatalogEntry = Readonly<{
  context: string;
  params: readonly string[];
  referenceParams?: readonly string[];
  message?: string;
  plural?: Readonly<Record<string, string>>;
  countParam?: string;
}>;

type RuntimeCatalog = Readonly<Record<string, unknown>>;
type RuntimeLocaleCatalogs = Readonly<Record<string, RuntimeCatalog | undefined>>;

type TranslationKey = keyof EnglishCatalog;
type ParamName<K extends TranslationKey> = EnglishCatalog[K]["params"][number];
type TranslationArgs<K extends TranslationKey> = [ParamName<K>] extends [never]
  ? []
  : [params: { [P in ParamName<K>]: PrimitiveParam }];

export type Translator = <K extends TranslationKey>(key: K, ...args: TranslationArgs<K>) => string;
export type { TranslationKey };

/** Catalog keys that can safely appear in label tables without interpolation parameters. */
export type PlainTranslationKey = {
  [K in TranslationKey]: [ParamName<K>] extends [never] ? K : never;
}[TranslationKey];

const PLACEHOLDER = /\{([A-Za-z][A-Za-z0-9_]*)\}/g;
const PLURAL_CATEGORIES = new Set(["zero", "one", "two", "few", "many", "other"]);
const REFERENCE_QUOTES: Readonly<Record<string,string>> = { '"':'"', "'":"'", "“":"”", "„":"“", "«":"»", "»":"«", "‹":"›", "›":"‹", "「":"」", "『":"』", "‘":"’", "‚":"‘" };

const bundledLocaleCatalogs: RuntimeLocaleCatalogs = {
  de: germanCatalog,
  es: spanishCatalog,
  fr: frenchCatalog,
  ja: japaneseCatalog,
  nl: dutchCatalog,
  ru: russianCatalog,
  "zh-tw": traditionalChineseCatalog,
};

/** Collect declared interpolation names without examining literal parameter values. */
function placeholders(template: string): Set<string> {
  return new Set([...template.matchAll(PLACEHOLDER)].map(/** Each occurrence contributes its source-owned name. */ (match) => match[1]));
}

/** Reject invalid catalog metadata before any localized text can be formatted. */
function fail(catalogName: string, key: string, message: string): never {
  throw new Error(`Invalid localization entry ${catalogName}:${key}: ${message}`);
}

/** Validate parameter subsets, reference classification and every message/plural form. */
function validateEntry(catalogName: string, key: string, raw: unknown): CatalogEntry {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) fail(catalogName, key, "entry must be an object");
  const entry = raw as Record<string, unknown>;
  const context = entry.context;
  const rawParams = entry.params;
  if (typeof context !== "string" || !context.trim()) fail(catalogName, key, "context must be non-empty");
  if (!Array.isArray(rawParams) || rawParams.some((param) => typeof param !== "string" || !param)) {
    fail(catalogName, key, "params must be an array of non-empty names");
  }
  const params = rawParams as string[];
  if (new Set(params).size !== params.length) fail(catalogName, key, "params must not contain duplicates");
  if (entry.referenceParams !== undefined) {
    if (!Array.isArray(entry.referenceParams) || entry.referenceParams.some(/** Reference metadata names only declared literal parameters. */ name => typeof name !== "string" || !params.includes(name))) {
      fail(catalogName,key,"referenceParams must be an array of declared parameter names");
    }
    if (new Set(entry.referenceParams).size !== entry.referenceParams.length) fail(catalogName,key,"referenceParams must not contain duplicates");
    if (entry.countParam !== undefined && entry.referenceParams.includes(entry.countParam)) fail(catalogName,key,"plural countParam cannot be a reference parameter");
  }

  const hasMessage = "message" in entry;
  const hasPlural = "plural" in entry;
  if (hasMessage === hasPlural) fail(catalogName, key, "entry must define exactly one of message or plural");

  let templates: string[];
  if (hasMessage) {
    const message = entry.message as string;
    if (!message.trim()) fail(catalogName, key, "message must be non-empty");
    templates = [message];
  } else {
    if (!entry.plural || typeof entry.plural !== "object" || Array.isArray(entry.plural)) {
      fail(catalogName, key, "plural must be an object");
    }
    const plural = entry.plural as Record<string, unknown>;
    const forms = Object.keys(plural);
    if (!forms.includes("other") || forms.some((form) => !PLURAL_CATEGORIES.has(form))) {
      fail(catalogName, key, "plural must define other and use valid plural categories");
    }
    if (forms.some((form) => typeof plural[form] !== "string" || !plural[form].trim())) {
      fail(catalogName, key, "plural forms must be non-empty strings");
    }
    if (typeof entry.countParam !== "string" || !params.includes(entry.countParam)) {
      fail(catalogName, key, "plural countParam must name one declared parameter");
    }
    templates = forms.map((form) => plural[form] as string);
  }

  const declared = new Set(params);
  for (const template of templates) {
    const used = placeholders(template);
    for (const name of used) if (!declared.has(name)) fail(catalogName, key, `placeholder {${name}} is not declared in params`);
    for (const name of declared) if (!used.has(name)) fail(catalogName, key, `declared param ${name} is not used by every form`);
  }

  return entry as CatalogEntry;
}

/** Validate a catalog before it can participate in fallback/formatting. */
export function validateCatalog(catalogName: string, catalog: RuntimeCatalog): void {
  for (const [key, entry] of Object.entries(catalog)) validateEntry(catalogName, key, entry);
}

/** Normalize exact/base locale identifiers without changing translated user text. */
function normalizeLocale(language: string): string {
  return language.trim().replace(/_/g, "-").toLocaleLowerCase();
}

/** Order exact then base language lookup, with English fallback owned separately. */
function localeCandidates(language: string): string[] {
  const exact = normalizeLocale(language);
  if (!exact) return [];
  const base = exact.split("-")[0];
  return exact === base ? [exact] : [exact, base];
}

/** Use the selected message locale's plural rules, rejecting unsupported locale identifiers. */
function pluralRules(locale: string): Intl.PluralRules {
  try {
    return new Intl.PluralRules(locale);
  } catch {
    throw new Error(`Invalid localization locale: ${locale}`);
  }
}

/** Require all forms the message locale can select before rendering any plural entry. */
function validatePluralCoverage(locale: string, key: string, entry: CatalogEntry): void {
  if (!entry.plural) return;
  const required = pluralRules(locale).resolvedOptions().pluralCategories;
  for (const category of required) {
    if (!(category in entry.plural)) fail(locale, key, `plural form ${category} is required for this locale`);
  }
}

/** Resolve one validated key with source reference metadata retained across locale fallback. */
function entryFor(key: string, language: string, localeCatalogs: RuntimeLocaleCatalogs): { entry: CatalogEntry; locale: string; referenceParams: readonly string[] } {
  const fallback = (englishCatalog as RuntimeCatalog)[key];
  if (fallback === undefined) throw new Error(`Unknown localization key: ${key}`);
  const source = validateEntry("en",key,fallback), referenceParams = source.referenceParams ?? [];
  for (const locale of localeCandidates(language)) {
    const candidate = localeCatalogs[locale]?.[key];
    if (candidate !== undefined) return { entry: validateEntry(locale, key, candidate), locale, referenceParams };
  }
  return { entry: source, locale: "en", referenceParams };
}

/** Remove only paired template-owned wrappers immediately enclosing one marked placeholder. */
function referencePlaceholderBounds(template: string, start: number, end: number, cursor: number): readonly [number,number] {
  for (;;) {
    let left = start - 1, right = end;
    while (left >= cursor && /\s/u.test(template[left])) left--;
    while (right < template.length && /\s/u.test(template[right])) right++;
    if (left < cursor || right >= template.length || !REFERENCE_QUOTES[template[left]] || REFERENCE_QUOTES[template[left]] !== template[right]) break;
    start = left;end = right + 1;
  }
  return [start,end];
}

/** Interpolate once; literal values containing quotes, backslashes or placeholders remain unchanged data. */
function formatTemplate(template: string, params: Readonly<Record<string,PrimitiveParam>>, references: readonly string[]): string {
  const marked = new Set(references);
  let formatted = "", cursor = 0;
  for (const match of template.matchAll(PLACEHOLDER)) {
    let start = match.index, end = start + match[0].length;
    const name = match[1], value = String(params[name]);
    if (marked.has(name)) {
      [start,end] = referencePlaceholderBounds(template,start,end,cursor);
      formatted += template.slice(cursor,start) + `"${value}"`;
    } else formatted += template.slice(cursor,start) + value;
    cursor = end;
  }
  return formatted + template.slice(cursor);
}

/** Enforce exact arguments and plural selection, then quote only source-classified literal references. */
function formatEntry(key: string, entry: CatalogEntry, locale: string, rawParams: Readonly<Record<string, PrimitiveParam>> | undefined, references: readonly string[]): string {
  const expected = entry.params;
  const params = rawParams ?? {};
  for (const name of expected) {
    if (!(name in params)) throw new Error(`Missing localization parameter ${name} for ${key}`);
  }
  for (const name of Object.keys(params)) {
    if (!expected.includes(name)) throw new Error(`Unexpected localization parameter ${name} for ${key}`);
  }

  let template: string;
  if (entry.message !== undefined) {
    template = entry.message;
  } else {
    const countName = entry.countParam;
    if (!countName || !entry.plural) throw new Error(`Malformed plural localization entry: ${key}`);
    const count = Number(params[countName]);
    if (!Number.isFinite(count)) throw new Error(`Plural count parameter ${countName} for ${key} must be numeric`);
    template = entry.plural[pluralRules(locale).select(count)];
    if (!template) throw new Error(`Malformed plural localization entry: ${key}`);
  }

  const formatted = formatTemplate(template,params,references);
  if (!formatted.trim()) throw new Error(`Localization entry ${key} formatted to blank text`);
  return formatted;
}

validateCatalog("en", englishCatalog);
for (const [key, rawEntry] of Object.entries(englishCatalog)) {
  validatePluralCoverage("en", key, validateEntry("en", key, rawEntry));
}

/** Preserve validated built-in text and nested metadata independently of the exported source objects. */
function immutableEntry(entry: CatalogEntry): CatalogEntry {
  return Object.freeze({
    context: entry.context,
    params: Object.freeze([...entry.params]),
    ...(entry.referenceParams === undefined ? {} : {referenceParams: Object.freeze([...entry.referenceParams])}),
    ...(entry.message === undefined
      ? {plural: Object.freeze({...entry.plural}), countParam: entry.countParam}
      : {message: entry.message}),
  });
}

/** Validate every supplied catalog; only built-in preparation takes an owned immutable snapshot. */
function prepareCatalogs(localeCatalogs: RuntimeLocaleCatalogs, immutable = false): RuntimeLocaleCatalogs {
  const normalizedCatalogs: Record<string, RuntimeCatalog | undefined> = {};
  for (const [locale, catalog] of Object.entries(localeCatalogs)) {
    if (!catalog) continue;
    validateCatalog(locale, catalog);
    const entries: Record<string, CatalogEntry> = {};
    for (const [key, rawEntry] of Object.entries(catalog)) {
      const source = (englishCatalog as RuntimeCatalog)[key];
      if (source === undefined) fail(locale, key, "key is absent from the English source catalog");
      const sourceEntry = validateEntry("en", key, source);
      const translatedEntry = validateEntry(locale, key, rawEntry);
      if (sourceEntry.params.length !== translatedEntry.params.length ||
        sourceEntry.params.some((param) => !translatedEntry.params.includes(param))) {
        fail(locale, key, "parameters differ from the English source catalog");
      }
      if (Boolean(sourceEntry.plural) !== Boolean(translatedEntry.plural) || sourceEntry.countParam !== translatedEntry.countParam) {
        fail(locale, key, "plural shape differs from the English source catalog");
      }
      const sourceReferences = sourceEntry.referenceParams ?? [], translatedReferences = translatedEntry.referenceParams;
      if (translatedReferences !== undefined && (sourceReferences.length !== translatedReferences.length
        || sourceReferences.some(/** Locales preserve semantic classification rather than reinterpreting parameter names. */ name => !translatedReferences.includes(name)))) {
        fail(locale,key,"reference parameters differ from the English source catalog");
      }
      validatePluralCoverage(normalizeLocale(locale), key, translatedEntry);
      if (immutable) entries[key] = immutableEntry(translatedEntry);
    }
    normalizedCatalogs[normalizeLocale(locale)] = immutable ? Object.freeze(entries) : catalog;
  }
  return immutable ? Object.freeze(normalizedCatalogs) : normalizedCatalogs;
}

/** This module alone owns prepared built-in snapshots; mutable injected catalog maps never enter it. */
const preparedBundledCatalogs = new Map<string, RuntimeCatalog>();

/** Prepare only the requested exact/base built-in fallback chain, once per locale and module lifetime. */
function bundledCatalogsFor(language: string): RuntimeLocaleCatalogs {
  const selected: Record<string, RuntimeCatalog> = {};
  for (const locale of localeCandidates(language)) {
    const catalog = bundledLocaleCatalogs[locale];
    if (!catalog) continue;
    let prepared = preparedBundledCatalogs.get(locale);
    if (!prepared) {
      prepared = prepareCatalogs({[locale]: catalog}, true)[locale];
      if (!prepared) continue;
      preparedBundledCatalogs.set(locale, prepared);
    }
    selected[locale] = prepared;
  }
  return selected;
}

/**
 * Create a typed translator for the requested host language. Built-in exact/base locale snapshots
 * validate lazily once; English startup does not prepare unused translations. Explicit injected
 * maps retain full validation on every call, including unused locales, and are never memoized.
 * Missing locales/keys fall back to English. Reference classification remains owned by English.
 */
export function createTranslator(language: string, localeCatalogs: RuntimeLocaleCatalogs = bundledLocaleCatalogs): Translator {
  const normalizedCatalogs = localeCatalogs === bundledLocaleCatalogs
    ? bundledCatalogsFor(language) : prepareCatalogs(localeCatalogs);
  return (/** Resolve and render one message without reinterpreting values as templates. */ (key: TranslationKey, params?: Readonly<Record<string, PrimitiveParam>>) => {
    const { entry, locale, referenceParams } = entryFor(key, language, normalizedCatalogs);
    return formatEntry(key, entry, locale, params, referenceParams);
  });
}
