import { englishCatalog, type EnglishCatalog } from "./en";

type PrimitiveParam = string | number;
type CatalogEntry = Readonly<{
  context: string;
  params: readonly string[];
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

const PLACEHOLDER = /\{([A-Za-z][A-Za-z0-9_]*)\}/g;
const PLURAL_CATEGORIES = new Set(["zero", "one", "two", "few", "many", "other"]);

function placeholders(template: string): Set<string> {
  return new Set([...template.matchAll(PLACEHOLDER)].map((match) => match[1]));
}

function fail(catalogName: string, key: string, message: string): never {
  throw new Error(`Invalid localization entry ${catalogName}:${key}: ${message}`);
}

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

function normalizeLocale(language: string): string {
  return language.trim().replace(/_/g, "-").toLocaleLowerCase();
}

function localeCandidates(language: string): string[] {
  const exact = normalizeLocale(language);
  if (!exact) return [];
  const base = exact.split("-")[0];
  return exact === base ? [exact] : [exact, base];
}

function pluralRules(locale: string): Intl.PluralRules {
  try {
    return new Intl.PluralRules(locale);
  } catch {
    throw new Error(`Invalid localization locale: ${locale}`);
  }
}

function validatePluralCoverage(locale: string, key: string, entry: CatalogEntry): void {
  if (!entry.plural) return;
  const required = pluralRules(locale).resolvedOptions().pluralCategories;
  for (const category of required) {
    if (!(category in entry.plural)) fail(locale, key, `plural form ${category} is required for this locale`);
  }
}

function entryFor(key: string, language: string, localeCatalogs: RuntimeLocaleCatalogs): { entry: CatalogEntry; locale: string } {
  const fallback = (englishCatalog as RuntimeCatalog)[key];
  if (fallback === undefined) throw new Error(`Unknown localization key: ${key}`);
  for (const locale of localeCandidates(language)) {
    const candidate = localeCatalogs[locale]?.[key];
    if (candidate !== undefined) return { entry: validateEntry(locale, key, candidate), locale };
  }
  return { entry: validateEntry("en", key, fallback), locale: "en" };
}

function formatEntry(key: string, entry: CatalogEntry, locale: string, rawParams: Readonly<Record<string, PrimitiveParam>> | undefined): string {
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

  const formatted = template.replace(PLACEHOLDER, (_match, name: string) => String(params[name]));
  if (!formatted.trim()) throw new Error(`Localization entry ${key} formatted to blank text`);
  return formatted;
}

validateCatalog("en", englishCatalog);
for (const [key, rawEntry] of Object.entries(englishCatalog)) {
  validatePluralCoverage("en", key, validateEntry("en", key, rawEntry));
}

/**
 * Create a typed translator for the requested host language. Locale catalogs are optional so L00
 * can ship English only; missing locales/keys fall back to the English source catalog.
 */
export function createTranslator(language: string, localeCatalogs: RuntimeLocaleCatalogs = {}): Translator {
  const normalizedCatalogs: Record<string, RuntimeCatalog | undefined> = {};
  for (const [locale, catalog] of Object.entries(localeCatalogs)) {
    if (!catalog) continue;
    validateCatalog(locale, catalog);
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
      validatePluralCoverage(normalizeLocale(locale), key, translatedEntry);
    }
    normalizedCatalogs[normalizeLocale(locale)] = catalog;
  }
  return ((key: TranslationKey, params?: Readonly<Record<string, PrimitiveParam>>) => {
    const { entry, locale } = entryFor(key, language, normalizedCatalogs);
    return formatEntry(key, entry, locale, params);
  });
}
