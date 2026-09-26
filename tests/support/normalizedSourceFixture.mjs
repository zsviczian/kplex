import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";

const normalizePath = (value) => value.replaceAll("\\", "/").replace(/^\/+|\/+$/g, "").replace(/\/{2,}/g, "/");
const normalizeField = (value) => value.toLowerCase().replace(/\s+/g, "-").trim();

function stableId(kind, key) {
  let hash = 2166136261 >>> 0;
  const input = `${kind}\u0000${key}`;
  for (let i = 0; i < input.length; i += 1) hash = Math.imul(hash ^ input.charCodeAt(i), 16777619) >>> 0;
  return `opaque-${hash.toString(36)}`;
}

function walk(root) {
  const output = [];
  const visit = (folder) => {
    for (const name of readdirSync(folder).sort()) {
      const absolute = join(folder, name);
      const stat = statSync(absolute);
      if (stat.isDirectory()) visit(absolute);
      else output.push(absolute);
    }
  };
  visit(root);
  return output;
}

function splitFrontmatter(content) {
  if (!content.startsWith("---\n") && !content.startsWith("---\r\n")) return { frontmatter: [], body: content, bodyOffset: 0 };
  const lines = content.split(/\r?\n/);
  let end = -1;
  for (let i = 1; i < lines.length; i += 1) if (lines[i] === "---") { end = i; break; }
  if (end < 0) return { frontmatter: [], body: content, bodyOffset: 0 };
  const frontmatter = [];
  let current = null;
  for (let i = 1; i < end; i += 1) {
    const line = lines[i];
    const item = line.match(/^\s*-\s+(.*)$/);
    if (item && current) {
      current.values.push(unquote(item[1].trim()));
      continue;
    }
    const match = line.match(/^([^:#][^:]*):\s*(.*)$/);
    if (!match) continue;
    current = { name: match[1].trim(), line: i + 1, values: [] };
    const value = match[2].trim();
    if (value) current.values.push(unquote(value));
    frontmatter.push(current);
  }
  const closingFence = /^---\r?$/gm;
  closingFence.exec(content);
  const closing = closingFence.exec(content);
  const bodyOffset = closing.index + closing[0].length + (content[closing.index + closing[0].length] === "\n" ? 1 : 0);
  return { frontmatter, body: content.slice(bodyOffset), bodyOffset };
}

function unquote(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) return value.slice(1, -1);
  return value;
}

function rawLinkTargets(value) {
  const output = [];
  const wiki = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;
  const markdown = /!?\[[^\]]*\]\(([^)]+)\)/g;
  let match;
  while ((match = wiki.exec(value)) !== null) output.push({ raw: match[1], index: match.index, length: match[0].length });
  while ((match = markdown.exec(value)) !== null) output.push({ raw: match[1], index: match.index, length: match[0].length });
  return output.sort((a, b) => a.index - b.index);
}

function semanticTargets(value) {
  const links = rawLinkTargets(value);
  if (links.length) return links;
  const output = [];
  const url = /https?:\/\/[^\s<>()\[\]{}"']+/gi;
  let match;
  while ((match = url.exec(value)) !== null) output.push({ raw: match[0].replace(/[.,;:!?]+$/, ""), index: match.index, length: match[0].length });
  return output;
}

function splitSubpath(raw) {
  let decoded = raw.trim();
  try { decoded = decodeURIComponent(decoded); } catch { /* retain source spelling */ }
  const hash = decoded.indexOf("#");
  return hash < 0 ? { path: decoded, subpath: undefined } : { path: decoded.slice(0, hash), subpath: decoded.slice(hash) };
}

function createInventory(root) {
  const files = walk(root);
  const relativeFiles = files.map((file) => normalizePath(relative(root, file)));
  const markdown = new Set(relativeFiles.filter((path) => path.toLowerCase().endsWith(".md")));
  const all = new Set(relativeFiles);
  return { files, relativeFiles, markdown, all };
}

function defaultResolveInternal(sourcePath, rawTarget, inventory) {
  const { path, subpath } = splitSubpath(rawTarget);
  if (!path) return { semanticPath: sourcePath, subpath };
  const sourceDir = normalizePath(dirname(sourcePath));
  const candidates = [];
  const add = (candidate) => {
    const normalized = normalizePath(candidate);
    candidates.push(normalized);
    if (!extname(normalized)) candidates.push(`${normalized}.md`);
  };
  if (path.startsWith("./") || path.startsWith("../")) add(normalizePath(relative("/", resolve("/", sourceDir, path))));
  else {
    add(path);
    if (!path.includes("/")) add(normalizePath([sourceDir, path].filter(Boolean).join("/")));
  }
  for (const candidate of candidates) if (inventory.all.has(candidate)) return { semanticPath: candidate, subpath };
  const leaf = path.split("/").pop();
  if (leaf) {
    const wanted = extname(leaf) ? leaf : `${leaf}.md`;
    const matches = [...inventory.all].filter((candidate) => candidate.split("/").pop() === wanted);
    if (matches.length === 1) return { semanticPath: matches[0], subpath };
  }
  return { semanticPath: path, subpath };
}

function entityFor(path, inventory, state = undefined) {
  const isUrl = /^https?:\/\//i.test(path);
  const exists = inventory.all.has(path);
  const extension = extname(path).slice(1);
  const kind = isUrl ? "url" : exists ? (extension.toLowerCase() === "md" ? "document" : "attachment") : "unresolved";
  return {
    id: stableId(kind, path),
    kind,
    state: state ?? (exists || isUrl ? "materialized" : "unresolved"),
    semanticPath: path,
    ...(exists ? { physicalPath: path } : {}),
  };
}

function folderEntity(path) {
  return { id: stableId("container", path), kind: "container", state: "materialized", semanticPath: path };
}

function tagEntity(path) {
  return { id: stableId("tag", path), kind: "tag", state: "materialized", semanticPath: path };
}

function targetRef(entity, rawTarget, resolvedBy, subpath) {
  return { entity, rawTarget, ...(subpath ? { subpath } : {}), resolvedBy };
}

function sourceRevisionFor(path) { return `fixture-revision:${path}`; }

function bodyLineAndOffset(content, bodyOffset, index) {
  const absolute = bodyOffset + index;
  let line = 1;
  for (let i = 0; i < absolute; i += 1) if (content.charCodeAt(i) === 10) line += 1;
  return { line, start: absolute };
}

function findInlineFields(body, bodyOffset, content) {
  const occurrences = [];
  const occupied = [];
  const add = (name, value, start, end) => {
    const loc = bodyLineAndOffset(content, bodyOffset, start);
    occurrences.push({ name: name.trim(), normalizedName: normalizeField(name), value: value.trim(), line: loc.line, start: bodyOffset + start, end: bodyOffset + end });
    occupied.push([start, end]);
  };
  const wrappers = [
    /\(([^()\n:]+?)::\s*(.*)\)/g,
    /\[([^\[\]\n:]+?)::\s*(\[\[[^\n]*?\]\])\]/g,
    /\[([^\[\]\n:]+?)::\s*([^\n\]]*)\]/g,
  ];
  for (const regex of wrappers) {
    let match;
    while ((match = regex.exec(body)) !== null) add(match[1], match[2], match.index, match.index + match[0].length);
  }
  let lineStart = 0;
  for (const physicalLine of body.split(/\n/)) {
    const line = physicalLine.replace(/\r$/, "");
    const match = line.match(/^\s*([^:\n\[\(]+?)::\s*(.+)$/);
    if (match) {
      const start = lineStart + line.indexOf(match[1]);
      if (!occupied.some(([a, b]) => start >= a && start < b)) add(match[1], match[2], start, lineStart + line.length);
    }
    lineStart += physicalLine.length + 1;
  }
  return occurrences.sort((a, b) => a.start - b.start);
}

function valuesFor(frontmatter, name) {
  const normalized = normalizeField(name);
  return frontmatter.filter((item) => normalizeField(item.name) === normalized).flatMap((item) => item.values.map((value) => ({ ...item, value })));
}

export function produceNormalizedFixtureRecords(root, options = {}) {
  const inventory = createInventory(root);
  const resolveInternal = options.resolveInternal ?? defaultResolveInternal;
  const hierarchyFields = new Set((options.ontologyFields ?? [
    "Parent", "Parents", "up", "u", "North", "origin", "inception", "source", "parent domain",
    "Children", "Child", "down", "d", "South", "leads to", "contributes to", "nurtures",
    "Friends", "Friend", "Jump", "Jumps", "j", "similar", "supports", "alternatives", "advantages", "pros",
    "opposes", "disadvantages", "missing", "cons", "Challenger", "Previous", "Prev", "West", "w", "Before",
    "Next", "n", "East", "e", "After", "hidden",
  ]).map(normalizeField));
  const dateFields = new Set((options.dateFields ?? ["date", "review-date", "follow-up-date", "milestone-date"]).map(normalizeField));
  const presentationFields = new Set((options.presentationFields ?? ["thumbnail", "node-image"]).map(normalizeField));
  const primaryTagField = normalizeField(options.primaryTagField ?? "Note type");
  const dailyFolder = options.dailyFolder ?? "Daily";
  const renderDaily = options.renderDaily ?? ((iso) => {
    const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[1]}/${match[2]}/${match[1]}${match[2]}${match[3]}` : null;
  });
  const records = [];
  const parsedFiles = new Map();
  const urlEntities = new Map();
  const unresolvedEntities = new Map();

  const refForInternal = (sourcePath, rawTarget, forceUnresolved = false) => {
    const resolved = resolveInternal(sourcePath, rawTarget, inventory);
    const exists = inventory.all.has(resolved.semanticPath);
    const entity = entityFor(resolved.semanticPath, inventory, forceUnresolved || !exists ? "unresolved" : "materialized");
    if (!exists) unresolvedEntities.set(entity.semanticPath, entity);
    return targetRef(entity, rawTarget, exists && !forceUnresolved ? "host" : "unresolved", resolved.subpath);
  };
  const refForUrl = (url) => {
    let entity = urlEntities.get(url);
    if (!entity) { entity = entityFor(url, inventory); urlEntities.set(url, entity); }
    return targetRef(entity, url, "url");
  };

  for (const absolute of inventory.files) {
    const path = normalizePath(relative(root, absolute));
    const extension = extname(path).slice(1);
    const source = entityFor(path, inventory);
    records.push({
      kind: "entity", source, sourceRevision: sourceRevisionFor(path), entity: source,
      name: extension.toLowerCase() === "md" ? path.split("/").pop().replace(/\.[^.]+$/, "") : path.split("/").pop(), url: null,
      file: { name: path.split("/").pop(), extension, path, mtime: 0, basename: path.split("/").pop().replace(/\.[^.]+$/, ""), ctime: 0, size: statSync(absolute).size },
    });
    if (extension.toLowerCase() !== "md") continue;
    const content = readFileSync(absolute, "utf8");
    const { frontmatter, body, bodyOffset } = splitFrontmatter(content);
    const inlineFields = findInlineFields(body, bodyOffset, content);
    parsedFiles.set(path, { source, content, frontmatter, body, bodyOffset, inlineFields });

    for (const item of valuesFor(frontmatter, "aliases").concat(valuesFor(frontmatter, "alias"))) {
      records.push({ kind: "semantic-metadata", source, sourceRevision: sourceRevisionFor(path), metadataKind: "alias", value: item.value,
        provenance: { definition: normalizeField(item.name), fieldName: item.name, normalizedFieldName: normalizeField(item.name), rawValue: item.value, location: { line: item.line } } });
    }
    const tags = new Set();
    for (const item of valuesFor(frontmatter, "tags").concat(valuesFor(frontmatter, "tag"))) for (const raw of item.value.split(/[\s,]+/)) if (raw) tags.add(raw.startsWith("#") ? raw : `#${raw}`);
    for (const match of body.matchAll(/(^|\s)(#[A-Za-z0-9_/-]+)/g)) tags.add(match[2]);
    for (const tag of tags) records.push({ kind: "semantic-metadata", source, sourceRevision: sourceRevisionFor(path), metadataKind: "tag", value: tag });

    for (const [surface, fields] of [["frontmatter", frontmatter], ["inline", inlineFields]]) {
      for (const item of fields) records.push({ kind: "field-name", source, sourceRevision: sourceRevisionFor(path),
        fieldName: item.name, normalizedFieldName: normalizeField(item.name), surface });
    }
    const noteTypeField = normalizeField(options.noteTypeField ?? "Note type");
    for (const [surface, fields] of [["frontmatter", frontmatter], ["inline", inlineFields]]) {
      for (const item of fields.filter((field) => normalizeField(field.name) === noteTypeField)) {
        for (const value of item.values ?? [item.value]) records.push({ kind: "semantic-metadata", source,
          sourceRevision: sourceRevisionFor(path), metadataKind: "note-type", value,
          provenance: { surface, fieldName: item.name, normalizedFieldName: noteTypeField, rawValue: value, location: { line: item.line } } });
      }
    }
    const primaryStyleValues = frontmatter.filter((item) => normalizeField(item.name) === primaryTagField)
      .flatMap((item) => item.values.map((value) => ({ item, value })))
      .concat(inlineFields.filter((item) => item.normalizedName === primaryTagField).map((item) => ({ item, value: item.value })));
    for (const { item, value } of primaryStyleValues) records.push({
      kind: "semantic-metadata", source, sourceRevision: sourceRevisionFor(path), metadataKind: "primary-tag-field", value,
      provenance: { surface: item.values ? "frontmatter" : "inline", definition: primaryTagField, fieldName: item.name, normalizedFieldName: primaryTagField, rawValue: value, location: { line: item.line } },
    });

    const linkCounts = new Map();
    for (const link of rawLinkTargets(content)) {
      if (/^https?:\/\//i.test(link.raw)) continue;
      const ref = refForInternal(path, link.raw);
      const key = `${ref.entity.semanticPath}\u0000${ref.entity.state}`;
      const current = linkCounts.get(key) ?? { ref, count: 0 };
      current.count += 1;
      linkCounts.set(key, current);
    }
    for (const { ref, count } of linkCounts.values()) records.push({
      kind: ref.entity.state === "materialized" ? "obsidian-link" : "unresolved-link",
      source, sourceRevision: sourceRevisionFor(path), target: ref, occurrenceCount: count,
    });

    for (const field of frontmatter) {
      const normalizedName = normalizeField(field.name);
      for (const value of field.values) {
        if (hierarchyFields.has(normalizedName)) for (const link of semanticTargets(value)) {
          const target = /^https?:\/\//i.test(link.raw) ? refForUrl(link.raw) : refForInternal(path, link.raw);
          records.push({ kind: "frontmatter-ontology", source, sourceRevision: sourceRevisionFor(path), target,
            provenance: { definition: normalizedName, fieldName: field.name, normalizedFieldName: normalizedName, rawValue: value, location: { line: field.line } } });
        }
        if (dateFields.has(normalizedName)) {
          const rendered = renderDaily(value.trim());
          if (rendered) {
            const targetPath = normalizePath(`${dailyFolder}/${rendered}.md`);
            const entity = entityFor(targetPath, inventory, inventory.all.has(targetPath) ? "materialized" : "unresolved");
            if (entity.state === "unresolved") unresolvedEntities.set(targetPath, entity);
            records.push({ kind: "date-property", source, sourceRevision: sourceRevisionFor(path),
              target: targetRef(entity, targetPath, "daily-notes"),
              provenance: { definition: normalizedName, fieldName: field.name, normalizedFieldName: normalizedName, rawValue: value, location: { line: field.line } } });
          }
        }
        if (presentationFields.has(normalizedName)) for (const link of rawLinkTargets(value)) {
          if (/^https?:\/\//i.test(link.raw)) continue;
          records.push({ kind: "presentation-link", surface: "frontmatter", source, sourceRevision: sourceRevisionFor(path), target: refForInternal(path, link.raw),
            provenance: { definition: normalizedName, fieldName: field.name, normalizedFieldName: normalizedName, rawValue: value, location: { line: field.line } } });
        }
      }
    }

    for (const occurrence of inlineFields) {
      if (hierarchyFields.has(occurrence.normalizedName)) for (const link of semanticTargets(occurrence.value)) {
        const target = /^https?:\/\//i.test(link.raw) ? refForUrl(link.raw) : refForInternal(path, link.raw);
        records.push({ kind: "inline-ontology", source, sourceRevision: sourceRevisionFor(path), target,
          provenance: { definition: occurrence.normalizedName, fieldName: occurrence.name, normalizedFieldName: occurrence.normalizedName, rawValue: occurrence.value,
            location: { line: occurrence.line, start: occurrence.start, end: occurrence.end } } });
      }
      if (presentationFields.has(occurrence.normalizedName)) for (const link of rawLinkTargets(occurrence.value)) {
        if (/^https?:\/\//i.test(link.raw)) continue;
        records.push({ kind: "presentation-link", surface: "inline", source, sourceRevision: sourceRevisionFor(path), target: refForInternal(path, link.raw),
          provenance: { definition: occurrence.normalizedName, fieldName: occurrence.name, normalizedFieldName: occurrence.normalizedName, rawValue: occurrence.value,
            location: { line: occurrence.line, start: occurrence.start, end: occurrence.end } } });
      }
    }

    const urlLabels = new Map();
    for (const match of body.matchAll(/!?\[([^\]]*)\]\(([^)]+)\)/g)) {
      if (/^https?:\/\//i.test(match[2])) urlLabels.set(match.index + match[0].indexOf(match[2]), match[1]);
    }
    const urlRegex = /https?:\/\/[^\s<>()\[\]{}"']+/gi;
    let urlMatch;
    while ((urlMatch = urlRegex.exec(body)) !== null) {
      const url = urlMatch[0].replace(/[.,;:!?]+$/, "");
      const target = refForUrl(url);
      let origin;
      try { origin = new URL(url).origin; } catch { /* retain URL without derived origin */ }
      const loc = bodyLineAndOffset(content, bodyOffset, urlMatch.index);
      records.push({ kind: "body-url", source, sourceRevision: sourceRevisionFor(path), target, ...(origin ? { origin: refForUrl(origin) } : {}),
        ...(urlLabels.get(urlMatch.index) ? { label: urlLabels.get(urlMatch.index) } : {}),
        provenance: { surface: "body", rawValue: url, location: { line: loc.line, start: bodyOffset + urlMatch.index, end: bodyOffset + urlMatch.index + url.length } } });
    }
  }

  const rootFolder = folderEntity("folder:/");
  records.push({ kind: "entity", source: rootFolder, sourceRevision: sourceRevisionFor("vault-tree"), entity: rootFolder, name: "/", url: null });
  const folders = new Set();
  for (const path of inventory.relativeFiles) {
    const segments = path.split("/");
    for (let i = 1; i < segments.length; i += 1) folders.add(segments.slice(0, i).join("/"));
  }
  for (const folder of [...folders].sort()) {
    const entity = folderEntity(`folder:${folder}`);
    records.push({ kind: "entity", source: entity, sourceRevision: sourceRevisionFor("vault-tree"), entity, name: folder.split("/").pop(), url: null });
  }
  for (const path of inventory.relativeFiles) {
    const parentPath = dirname(path) === "." ? "folder:/" : `folder:${normalizePath(dirname(path))}`;
    const parent = folderEntity(parentPath);
    records.push({ kind: "file-tree", source: parent, sourceRevision: sourceRevisionFor("vault-tree"), target: targetRef(entityFor(path, inventory), path, "structural") });
  }
  for (const folder of [...folders].sort()) {
    const parentFolder = dirname(folder) === "." ? "folder:/" : `folder:${normalizePath(dirname(folder))}`;
    const parent = folderEntity(parentFolder);
    const child = folderEntity(`folder:${folder}`);
    records.push({ kind: "file-tree", source: parent, sourceRevision: sourceRevisionFor("vault-tree"), target: targetRef(child, child.semanticPath, "structural") });
  }

  const allTags = new Set(records.filter((record) => record.kind === "semantic-metadata" && record.metadataKind === "tag").map((record) => record.value));
  for (const tag of [...allTags].sort()) {
    const parts = tag.replace(/^#/, "").split("/").filter(Boolean);
    for (let i = 1; i <= parts.length; i += 1) {
      const tagPath = `tag:${parts.slice(0, i).join("/")}`;
      const entity = tagEntity(tagPath);
      if (!records.some((record) => record.kind === "entity" && record.entity.id === entity.id)) records.push({ kind: "entity", source: entity, sourceRevision: sourceRevisionFor("tag-tree"), entity, name: parts[i - 1], url: null });
      if (i > 1) {
        const parent = tagEntity(`tag:${parts.slice(0, i - 1).join("/")}`);
        records.push({ kind: "tag-tree", membership: "tag-child", source: parent, sourceRevision: sourceRevisionFor("tag-tree"), target: targetRef(entity, tagPath, "structural") });
      }
    }
  }
  for (const record of records.filter((item) => item.kind === "semantic-metadata" && item.metadataKind === "tag")) {
    const tag = tagEntity(`tag:${record.value.replace(/^#/, "")}`);
    records.push({ kind: "tag-tree", membership: "entity-member", source: tag, sourceRevision: sourceRevisionFor("tag-tree"), contribution: { source: record.source, revision: record.sourceRevision }, target: targetRef(record.source, record.source.semanticPath ?? record.source.id, "structural") });
  }

  for (const entity of [...urlEntities.values(), ...unresolvedEntities.values()]) {
    if (!records.some((record) => record.kind === "entity" && record.entity.id === entity.id)) records.push({ kind: "entity", source: entity, sourceRevision: sourceRevisionFor("derived-targets"), entity, name: entity.semanticPath ?? entity.id, url: entity.kind === "url" ? entity.semanticPath : null });
  }

  return { records, inventory, parsedFiles };
}
