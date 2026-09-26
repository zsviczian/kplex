export const normalizeFieldName = (name: string): string => name.toLowerCase().replace(/\s+/g, "-").trim();

const WIKI_LINK_RE = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;
const MARKDOWN_LINK_RE = /\[[^\]]*\]\(([^)]+)\)/g;
const URL_RE = /\bhttps?:\/\/[^\s<>()\u005B\u005D{}"']+/gi;

export type ExtractedLinkReference = Readonly<{
  /** Literal target text from the property value, before host resolution or URI decoding. */
  rawTarget: string;
  /** Heading/block subpath when the literal internal target carries one. */
  subpath?: string;
  external: boolean;
}>;

export type ExternalUrlReference = {
  url: string;
  label?: string;
  line?: number;
};

export type InlineFieldOccurrence = {
  name: string;
  normalizedName: string;
  value: string;
  line: number;
  start: number;
  end: number;
  syntax: "line" | "parenthesized" | "bracketed";
};

export type ParsedBodyMetadata = {
  inlineFields: Record<string, unknown[]>;
  inlineFieldOccurrences: InlineFieldOccurrence[];
  urls: ExternalUrlReference[];
};

export type ParsedFileMetadata = {
  frontmatter: Record<string, unknown>;
  inlineFields: Record<string, unknown[]>;
  inlineFieldOccurrences: InlineFieldOccurrence[];
  aliases: string[];
  tags: string[];
  urls: ExternalUrlReference[];
};

/**
 * CPU-only parser intentionally kept as one self-contained function. MetadataParser serializes
 * this exact function into its Web Worker without a module closure; frozen parity tests keep the
 * synchronous worker grammar aligned with the cooperative implementation below.
 */
export function parseBodyMetadataCore(content: string): ParsedBodyMetadata {
  const normalize = (name: string): string => name.toLowerCase().replace(/\s+/g, "-").trim();
  const hasFieldDelimiter = (value: string): boolean =>
    value.includes("[") || value.includes("]") || value.includes("(") || value.includes(")");
  const inlineFields: Record<string, unknown[]> = {};
  const inlineFieldOccurrences: InlineFieldOccurrence[] = [];
  const urls: ExternalUrlReference[] = [];
  const seenUrls = new Set<string>();

  const stripFieldFormatting = (raw: string): string => {
    let text = raw.trim().replace(/^[-*+]\s+/, "").trim();
    const wrappers: Array<[string, string]> = [["**", "**"], ["__", "__"], ["~~", "~~"], ["==", "=="], ["*", "*"], ["_", "_"]];
    let changed = true;
    while (changed) {
      changed = false;
      for (const [open, close] of wrappers) {
        if (text.startsWith(open) && text.endsWith(close) && text.length > open.length + close.length) {
          text = text.slice(open.length, -close.length).trim();
          changed = true;
          break;
        }
      }
    }
    return text;
  };

  const addField = (rawName: string, rawValue: string, syntax: InlineFieldOccurrence["syntax"], line: number, start: number, end: number): void => {
    const name = stripFieldFormatting(rawName);
    const normalizedName = normalize(name);
    const value = rawValue.trim();
    if (!normalizedName || !value || hasFieldDelimiter(name)) return;
    inlineFields[normalizedName] ??= [];
    inlineFields[normalizedName].push(value);
    inlineFieldOccurrences.push({ name, normalizedName, value, syntax, line, start, end });
  };

  const maskRanges = (text: string, ranges: Array<[number, number]>): string => {
    if (!ranges.length) return text;
    const pieces: string[] = [];
    let cursor = 0;
    for (const [start, end] of ranges) {
      if (start > cursor) pieces.push(text.slice(cursor, start));
      if (end > start) pieces.push(" ".repeat(end - start));
      cursor = Math.max(cursor, end);
    }
    if (cursor < text.length) pieces.push(text.slice(cursor));
    return pieces.join("");
  };

  const maskInlineCode = (text: string): string => {
    if (!text.includes("`")) return text;
    const ranges: Array<[number, number]> = [];
    let i = 0;
    while (i < text.length) {
      if (text[i] !== "`") { i += 1; continue; }
      let run = 1;
      while (text[i + run] === "`") run += 1;
      const marker = "`".repeat(run);
      const close = text.indexOf(marker, i + run);
      if (close < 0) {
        ranges.push([i, text.length]);
        break;
      }
      ranges.push([i, close + run]);
      i = close + run;
    }
    return maskRanges(text, ranges);
  };

  // Precompute same-delimiter matches once per line. The previous implementation rescanned the
  // entire suffix for every unmatched opening bracket/parenthesis, making malformed pasted text
  // quadratic. Separate stacks preserve the old grammar: nested delimiters of the same kind count,
  // while the other delimiter kind is ignored for balancing purposes.
  const matchingDelimiterCloses = (text: string): Map<number, number> => {
    const round: number[] = [];
    const square: number[] = [];
    const closes = new Map<number, number>();
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      if (ch === "\\") { i += 1; continue; }
      if (ch === "(") round.push(i);
      else if (ch === "[") square.push(i);
      else if (ch === ")") {
        const start = round.pop();
        if (start !== undefined) closes.set(start, i);
      } else if (ch === "]") {
        const start = square.pop();
        if (start !== undefined) closes.set(start, i);
      }
    }
    return closes;
  };

  // Scan by offsets instead of `content.split(...)`. Large Excalidraw files often contain a
  // megabyte-scale JSON payload inside a fenced block. Splitting the whole file duplicates all of
  // that text into thousands of strings even though K-Plex intentionally ignores fenced content.
  // While inside a fence we inspect only a short prefix of each line and never materialize the
  // potentially enormous JSON line itself.
  const firstNewline = content.indexOf("\n");
  const firstRawEnd = firstNewline < 0 ? content.length : firstNewline;
  const firstLogicalEnd = firstRawEnd > 0 && content.charCodeAt(firstRawEnd - 1) === 13 ? firstRawEnd - 1 : firstRawEnd;
  const firstLine = content.slice(0, firstLogicalEnd);
  let offset = 0;
  let lineStart = 0;
  let lineIndex = 0;
  let inFrontmatter = firstLine.trim() === "---";
  let frontmatterClosed = !inFrontmatter;
  let fence: string | null = null;
  let inHtmlComment = false;

  while (lineStart <= content.length) {
    const newlineAt = content.indexOf("\n", lineStart);
    const rawEnd = newlineAt < 0 ? content.length : newlineAt;
    const logicalEnd = rawEnd > lineStart && content.charCodeAt(rawEnd - 1) === 13 ? rawEnd - 1 : rawEnd;
    const logicalLength = logicalEnd - lineStart;
    const lineNumber = lineIndex + 1;
    const advance = (): boolean => {
      // Preserve the historical offset convention: CRLF counts like one newline because the old
      // split(/\r?\n/) parser removed both delimiter characters and then added one.
      offset += logicalLength + 1;
      lineIndex += 1;
      if (newlineAt < 0) {
        lineStart = content.length + 1;
        return false;
      }
      lineStart = newlineAt + 1;
      return true;
    };

    if (inFrontmatter && !frontmatterClosed) {
      const originalLine = content.slice(lineStart, logicalEnd);
      const trimmed = originalLine.trim();
      if (lineIndex > 0 && (trimmed === "---" || trimmed === "...")) {
        frontmatterClosed = true;
        inFrontmatter = false;
      }
      if (!advance()) break;
      continue;
    }

    // Fence detection needs only the leading characters. This is the important fast path for
    // Excalidraw's large ```json drawing block.
    const preview = content.slice(lineStart, Math.min(logicalEnd, lineStart + 256));
    const fenceMatch = preview.match(/^\s*(```+|~~~+)/);
    if (fence) {
      if (fenceMatch && fence === fenceMatch[1][0]) fence = null;
      if (!advance()) break;
      continue;
    }
    if (fenceMatch) {
      fence = fenceMatch[1][0];
      if (!advance()) break;
      continue;
    }

    const originalLine = content.slice(lineStart, logicalEnd);
    let visible = maskInlineCode(originalLine);
    const commentRanges: Array<[number, number]> = [];
    let commentCursor = 0;
    if (inHtmlComment) {
      const commentEnd = visible.indexOf("-->");
      if (commentEnd < 0) {
        if (!advance()) break;
        continue;
      }
      commentRanges.push([0, commentEnd + 3]);
      commentCursor = commentEnd + 3;
      inHtmlComment = false;
    }
    for (;;) {
      const commentStart = visible.indexOf("<!--", commentCursor);
      if (commentStart < 0) break;
      const commentEnd = visible.indexOf("-->", commentStart + 4);
      if (commentEnd < 0) {
        commentRanges.push([commentStart, visible.length]);
        inHtmlComment = true;
        break;
      }
      commentRanges.push([commentStart, commentEnd + 3]);
      commentCursor = commentEnd + 3;
    }
    visible = maskRanges(visible, commentRanges);

    let firstFieldSeparator = -1;
    let firstNonSpace = -1;
    let hasRoundOpen = false;
    let hasRoundClose = false;
    let hasSquareOpen = false;
    let hasSquareClose = false;
    let hasHttp = false;
    const isWhitespace = (ch: string | undefined): boolean => Boolean(ch && /\s/.test(ch));
    const isWord = (ch: string | undefined): boolean => Boolean(ch && /[A-Za-z0-9_]/.test(ch));
    const isUrlChar = (ch: string | undefined): boolean => Boolean(ch && !/[\s<>()[\]{}"']/.test(ch));
    const isTrailingUrlPunctuation = (ch: string | undefined): boolean => Boolean(ch && ".,;:!?".includes(ch));
    for (let i = 0; i < visible.length; i += 1) {
      const ch = visible[i];
      if (firstNonSpace < 0 && !isWhitespace(ch)) firstNonSpace = i;
      if (firstFieldSeparator < 0 && ch === ":" && visible[i + 1] === ":") firstFieldSeparator = i;
      if (ch === "(") hasRoundOpen = true;
      else if (ch === ")") hasRoundClose = true;
      else if (ch === "[") hasSquareOpen = true;
      else if (ch === "]") hasSquareClose = true;
      else if ((ch === "h" || ch === "H") && (visible.slice(i, i + 7).toLowerCase() === "http://" || visible.slice(i, i + 8).toLowerCase() === "https://")) hasHttp = true;
    }

    const hasFieldSyntax = firstFieldSeparator >= 0;
    const hasInlineFieldSyntax = hasFieldSyntax && ((hasRoundOpen && hasRoundClose) || (hasSquareOpen && hasSquareClose));
    const delimiterCloses = hasInlineFieldSyntax ? matchingDelimiterCloses(visible) : null;
    let firstClaimed = false;

    // Dataview's parenthesized and square-bracket inline forms can occur mid-sentence. Search at
    // most the supported 120-character key span; do not materialize/rescan a giant balanced value.
    if (hasInlineFieldSyntax) {
      for (let i = 0; i < visible.length; i += 1) {
        const open = visible[i];
        if (open !== "(" && open !== "[") continue;
        if (open === "[" && visible[i + 1] === "[") { i += 1; continue; }
        const balancedEnd = delimiterCloses?.get(i) ?? -1;
        if (balancedEnd < 0) continue;
        let separator = -1;
        const searchEnd = Math.min(balancedEnd, i + 1 + 122);
        for (let cursor = i + 1; cursor + 1 < searchEnd; cursor += 1) {
          if (visible[cursor] === ":" && visible[cursor + 1] === ":") { separator = cursor - (i + 1); break; }
        }
        if (separator <= 0 || separator > 120) { i = balancedEnd; continue; }
        const name = stripFieldFormatting(visible.slice(i + 1, i + 1 + separator));
        if (!name || hasFieldDelimiter(name)) { i = balancedEnd; continue; }
        const valueStart = i + 1 + separator + 2;
        addField(name, originalLine.slice(valueStart, balancedEnd), open === "(" ? "parenthesized" : "bracketed", lineNumber, offset + i, offset + balancedEnd + 1);
        if (i === firstNonSpace) firstClaimed = true;
        i = balancedEnd;
      }
    }

    // Full-line Dataview fields. Parse this manually instead of a backtracking regex so malformed
    // list markers are deterministic in worker and cooperative modes. A bare "-" / "*" / "+"
    // is a list marker, never a valid field name.
    if (hasFieldSyntax && !firstClaimed && firstNonSpace >= 0) {
      let keyStart = firstNonSpace;
      if ((visible[keyStart] === "-" || visible[keyStart] === "*" || visible[keyStart] === "+") && isWhitespace(visible[keyStart + 1])) {
        keyStart += 2;
        while (isWhitespace(visible[keyStart])) keyStart += 1;
      }
      const separatorAt = visible.indexOf("::", keyStart);
      if (separatorAt > keyStart && separatorAt - keyStart <= 120) {
        const name = stripFieldFormatting(visible.slice(keyStart, separatorAt));
        if (name && !hasFieldDelimiter(name)) {
          addField(name, originalLine.slice(separatorAt + 2), "line", lineNumber, offset + firstNonSpace, offset + originalLine.length);
        }
      }
    }

    // External URLs use the same explicit scanner as the cooperative fallback. Incomplete schemes
    // such as `https://` are deliberately ignored; a URL must contain at least one URL character
    // after the scheme. This also keeps malformed partially typed Markdown grammar deterministic.
    if (hasHttp) {
      const aliasByUrl = new Map<string, string>();
      let markdownCursor = 0;
      while (markdownCursor < visible.length) {
        const open = visible.indexOf("[", markdownCursor);
        if (open < 0) break;
        const closeLabel = visible.indexOf("]", open + 1);
        if (closeLabel < 0) break;
        if (visible[closeLabel + 1] !== "(") {
          markdownCursor = closeLabel + 1;
          continue;
        }
        const urlStart = closeLabel + 2;
        const scheme = visible.slice(urlStart, urlStart + 8).toLowerCase();
        const schemeLength = scheme.startsWith("https://") ? 8 : scheme.startsWith("http://") ? 7 : 0;
        if (!schemeLength) {
          markdownCursor = closeLabel + 1;
          continue;
        }
        const closeUrl = visible.indexOf(")", urlStart);
        if (closeUrl < 0) break;
        let rawStart = urlStart;
        let rawEnd = closeUrl;
        while (rawStart < rawEnd && isWhitespace(visible[rawStart])) rawStart += 1;
        while (rawEnd > rawStart && isWhitespace(visible[rawEnd - 1])) rawEnd -= 1;
        while (rawEnd > rawStart && isTrailingUrlPunctuation(visible[rawEnd - 1])) rawEnd -= 1;
        if (rawEnd - rawStart > schemeLength) {
          const raw = visible.slice(rawStart, rawEnd);
          let labelStart = open + 1;
          let labelEnd = closeLabel;
          while (labelStart < labelEnd && isWhitespace(visible[labelStart])) labelStart += 1;
          while (labelEnd > labelStart && isWhitespace(visible[labelEnd - 1])) labelEnd -= 1;
          aliasByUrl.set(raw, visible.slice(labelStart, labelEnd));
        }
        markdownCursor = closeUrl + 1;
      }

      for (let i = 0; i < visible.length; i += 1) {
        const lower = visible.slice(i, i + 8).toLowerCase();
        const schemeLength = lower.startsWith("https://") ? 8 : lower.startsWith("http://") ? 7 : 0;
        if (!schemeLength || isWord(visible[i - 1])) continue;
        let end = i + schemeLength;
        while (end < visible.length && isUrlChar(visible[end])) end += 1;
        if (end === i + schemeLength) { i = Math.max(i, end - 1); continue; }
        while (end > i + schemeLength && isTrailingUrlPunctuation(visible[end - 1])) end -= 1;
        if (end > i + schemeLength) {
          const raw = visible.slice(i, end);
          if (!seenUrls.has(raw)) {
            seenUrls.add(raw);
            const label = aliasByUrl.get(raw);
            urls.push(label ? { url: raw, label, line: lineNumber } : { url: raw, line: lineNumber });
          }
        }
        i = Math.max(i, end - 1);
      }
    }

    if (!advance()) break;
  }

  return { inlineFields, inlineFieldOccurrences, urls };
}


/**
 * Cooperative renderer-thread parser used when a worker is unavailable and by view-local section
 * expansion. It mirrors `parseBodyMetadataCore`, but every potentially long character scan is
 * resumable and checks the caller's lifetime token. This matters on iOS where one pathological
 * pasted line must not monopolize the WebView until the entire file has finished parsing.
 */
export type CooperativeMetadataParseRuntime = Readonly<{
  now: () => number;
  yield: () => Promise<void>;
  shouldContinue: (phase?: string) => boolean;
}>;

export async function parseBodyMetadataCooperativeCore(
  content: string,
  runtime: CooperativeMetadataParseRuntime,
  budgetMs = 4,
): Promise<ParsedBodyMetadata> {
  if (!runtime) throw new Error("K-Plex cooperative metadata parse runtime is required");
  const normalize = (name: string): string => name.toLowerCase().replace(/\s+/g, "-").trim();
  const hasFieldDelimiter = (value: string): boolean =>
    value.includes("[") || value.includes("]") || value.includes("(") || value.includes(")");
  const inlineFields: Record<string, unknown[]> = {};
  const inlineFieldOccurrences: InlineFieldOccurrence[] = [];
  const urls: ExternalUrlReference[] = [];
  const seenUrls = new Set<string>();
  let deadline = runtime.now() + Math.max(1, budgetMs);

  const yieldToHost = async (force = false, phase = "generic"): Promise<void> => {
    if (!runtime.shouldContinue(phase)) throw new Error("K-Plex cooperative metadata parse cancelled");
    if (!force && runtime.now() < deadline) return;
    await runtime.yield();
    if (!runtime.shouldContinue(phase)) throw new Error("K-Plex cooperative metadata parse cancelled");
    deadline = runtime.now() + Math.max(1, budgetMs);
  };

  const findString = async (text: string, needle: string, start: number): Promise<number> => {
    if (!needle) return Math.max(0, start);
    const windowSize = 16 * 1024;
    let cursor = Math.max(0, start);
    while (cursor <= text.length - needle.length) {
      const end = Math.min(text.length, cursor + windowSize + needle.length - 1);
      const found = text.slice(cursor, end).indexOf(needle);
      if (found >= 0) return cursor + found;
      cursor += windowSize;
      await yieldToHost();
    }
    return -1;
  };

  const isWhitespace = (ch: string | undefined): boolean => Boolean(ch && /\s/.test(ch));
  const isWord = (ch: string | undefined): boolean => Boolean(ch && /[A-Za-z0-9_]/.test(ch));
  const isUrlChar = (ch: string | undefined): boolean => Boolean(ch && !/[\s<>()[\]{}"']/.test(ch));
  const isTrailingUrlPunctuation = (ch: string | undefined): boolean => Boolean(ch && ".,;:!?".includes(ch));

  const trimBounds = async (text: string, start = 0, end = text.length): Promise<[number, number]> => {
    let left = Math.max(0, start);
    let right = Math.min(text.length, end);
    let scanned = 0;
    while (left < right && isWhitespace(text[left])) {
      left += 1;
      scanned += 1;
      if ((scanned & 2047) === 0) await yieldToHost();
    }
    scanned = 0;
    while (right > left && isWhitespace(text[right - 1])) {
      right -= 1;
      scanned += 1;
      if ((scanned & 2047) === 0) await yieldToHost();
    }
    return [left, right];
  };

  const trimmedEquals = async (text: string, token: string): Promise<boolean> => {
    const [start, end] = await trimBounds(text);
    return end - start === token.length && text.slice(start, end) === token;
  };

  const trimText = async (text: string): Promise<string> => {
    const [start, end] = await trimBounds(text);
    return text.slice(start, end);
  };

  const stripTrailingUrlPunctuation = async (text: string, start: number, end: number): Promise<number> => {
    let right = end;
    let scanned = 0;
    while (right > start && isTrailingUrlPunctuation(text[right - 1])) {
      right -= 1;
      scanned += 1;
      if ((scanned & 2047) === 0) await yieldToHost();
    }
    return right;
  };

  const matchingDelimiterCloses = async (text: string): Promise<Map<number, number>> => {
    const round: number[] = [];
    const square: number[] = [];
    const closes = new Map<number, number>();
    let checkpoint = 0;
    for (let i = 0; i < text.length; i += 1) {
      if (i >= checkpoint) {
        await yieldToHost(false, "inline-field-scan");
        checkpoint = i + 512;
      }
      const ch = text[i];
      if (ch === "\\") { i += 1; continue; }
      if (ch === "(") round.push(i);
      else if (ch === "[") square.push(i);
      else if (ch === ")") {
        const start = round.pop();
        if (start !== undefined) closes.set(start, i);
      } else if (ch === "]") {
        const start = square.pop();
        if (start !== undefined) closes.set(start, i);
      }
    }
    return closes;
  };

  const stripFieldFormatting = (raw: string): string => {
    let text = raw.trim().replace(/^[-*+]\s+/, "").trim();
    const wrappers: Array<[string, string]> = [["**", "**"], ["__", "__"], ["~~", "~~"], ["==", "=="], ["*", "*"], ["_", "_"]];
    let changed = true;
    while (changed) {
      changed = false;
      for (const [open, close] of wrappers) {
        if (text.startsWith(open) && text.endsWith(close) && text.length > open.length + close.length) {
          text = text.slice(open.length, -close.length).trim();
          changed = true;
          break;
        }
      }
    }
    return text;
  };

  const addField = async (rawName: string, rawValue: string, syntax: InlineFieldOccurrence["syntax"], line: number, start: number, end: number): Promise<void> => {
    const name = stripFieldFormatting(rawName);
    const normalizedName = normalize(name);
    const value = await trimText(rawValue);
    if (!normalizedName || !value || hasFieldDelimiter(name)) return;
    inlineFields[normalizedName] ??= [];
    inlineFields[normalizedName].push(value);
    inlineFieldOccurrences.push({ name, normalizedName, value, syntax, line, start, end });
  };

  const maskRanges = async (text: string, ranges: Array<[number, number]>): Promise<string> => {
    if (!ranges.length) return text;
    const pieces: string[] = [];
    let cursor = 0;
    for (const [start, end] of ranges) {
      if (start > cursor) pieces.push(text.slice(cursor, start));
      let remaining = Math.max(0, end - start);
      while (remaining > 0) {
        const chunk = Math.min(16 * 1024, remaining);
        pieces.push(" ".repeat(chunk));
        remaining -= chunk;
        await yieldToHost();
      }
      cursor = Math.max(cursor, end);
      await yieldToHost();
    }
    if (cursor < text.length) pieces.push(text.slice(cursor));
    await yieldToHost();
    return pieces.join("");
  };

  const maskInlineCode = async (text: string): Promise<string> => {
    const firstTick = await findString(text, "`", 0);
    if (firstTick < 0) return text;
    const ranges: Array<[number, number]> = [];
    let i = firstTick;
    while (i < text.length) {
      if (text[i] !== "`") {
        const next = await findString(text, "`", i + 1);
        if (next < 0) break;
        i = next;
      }
      let run = 1;
      while (text[i + run] === "`") {
        run += 1;
        if ((run & 2047) === 0) await yieldToHost();
      }
      const marker = "`".repeat(run);
      const close = await findString(text, marker, i + run);
      if (close < 0) {
        ranges.push([i, text.length]);
        break;
      }
      ranges.push([i, close + run]);
      i = close + run;
      await yieldToHost();
    }
    return maskRanges(text, ranges);
  };



  const firstNewline = await findString(content, "\n", 0);
  const firstRawEnd = firstNewline < 0 ? content.length : firstNewline;
  const firstLogicalEnd = firstRawEnd > 0 && content.charCodeAt(firstRawEnd - 1) === 13 ? firstRawEnd - 1 : firstRawEnd;
  const firstLine = content.slice(0, firstLogicalEnd);
  let offset = 0;
  let lineStart = 0;
  let lineIndex = 0;
  let inFrontmatter = await trimmedEquals(firstLine, "---");
  let frontmatterClosed = !inFrontmatter;
  let fence: string | null = null;
  let inHtmlComment = false;

  while (lineStart <= content.length) {
    const newlineAt = await findString(content, "\n", lineStart);
    const rawEnd = newlineAt < 0 ? content.length : newlineAt;
    const logicalEnd = rawEnd > lineStart && content.charCodeAt(rawEnd - 1) === 13 ? rawEnd - 1 : rawEnd;
    const logicalLength = logicalEnd - lineStart;
    const lineNumber = lineIndex + 1;
    const advance = (): boolean => {
      offset += logicalLength + 1;
      lineIndex += 1;
      if (newlineAt < 0) {
        lineStart = content.length + 1;
        return false;
      }
      lineStart = newlineAt + 1;
      return true;
    };

    if (inFrontmatter && !frontmatterClosed) {
      const originalLine = content.slice(lineStart, logicalEnd);
      const isClosingFrontmatter = lineIndex > 0 && (
        await trimmedEquals(originalLine, "---") || await trimmedEquals(originalLine, "...")
      );
      if (isClosingFrontmatter) {
        frontmatterClosed = true;
        inFrontmatter = false;
      }
      if (!advance()) break;
      await yieldToHost();
      continue;
    }

    const preview = content.slice(lineStart, Math.min(logicalEnd, lineStart + 256));
    const fenceMatch = preview.match(/^\s*(```+|~~~+)/);
    if (fence) {
      if (fenceMatch && fence === fenceMatch[1][0]) fence = null;
      if (!advance()) break;
      await yieldToHost();
      continue;
    }
    if (fenceMatch) {
      fence = fenceMatch[1][0];
      if (!advance()) break;
      await yieldToHost();
      continue;
    }

    const originalLine = content.slice(lineStart, logicalEnd);
    let visible = await maskInlineCode(originalLine);
    const commentRanges: Array<[number, number]> = [];
    let commentCursor = 0;
    if (inHtmlComment) {
      const commentEnd = await findString(visible, "-->", 0);
      if (commentEnd < 0) {
        if (!advance()) break;
        await yieldToHost();
        continue;
      }
      commentRanges.push([0, commentEnd + 3]);
      commentCursor = commentEnd + 3;
      inHtmlComment = false;
    }
    for (;;) {
      const commentStart = await findString(visible, "<!--", commentCursor);
      if (commentStart < 0) break;
      const commentEnd = await findString(visible, "-->", commentStart + 4);
      if (commentEnd < 0) {
        commentRanges.push([commentStart, visible.length]);
        inHtmlComment = true;
        break;
      }
      commentRanges.push([commentStart, commentEnd + 3]);
      commentCursor = commentEnd + 3;
      await yieldToHost();
    }
    visible = await maskRanges(visible, commentRanges);

    let firstFieldSeparator = -1;
    let firstNonSpace = -1;
    let hasRoundOpen = false;
    let hasRoundClose = false;
    let hasSquareOpen = false;
    let hasSquareClose = false;
    let hasHttp = false;
    let lineFeatureCheckpoint = 0;
    for (let i = 0; i < visible.length; i += 1) {
      if (i >= lineFeatureCheckpoint) {
        await yieldToHost(false, "line-feature-scan");
        lineFeatureCheckpoint = i + 1024;
      }
      const ch = visible[i];
      if (firstNonSpace < 0 && !isWhitespace(ch)) firstNonSpace = i;
      if (firstFieldSeparator < 0 && ch === ":" && visible[i + 1] === ":") firstFieldSeparator = i;
      if (ch === "(") hasRoundOpen = true;
      else if (ch === ")") hasRoundClose = true;
      else if (ch === "[") hasSquareOpen = true;
      else if (ch === "]") hasSquareClose = true;
      else if ((ch === "h" || ch === "H") && (visible.slice(i, i + 7).toLowerCase() === "http://" || visible.slice(i, i + 8).toLowerCase() === "https://")) hasHttp = true;
    }

    const hasFieldSyntax = firstFieldSeparator >= 0;
    const hasInlineFieldSyntax = hasFieldSyntax && ((hasRoundOpen && hasRoundClose) || (hasSquareOpen && hasSquareClose));
    const delimiterCloses = hasInlineFieldSyntax ? await matchingDelimiterCloses(visible) : null;
    let firstClaimed = false;

    if (hasInlineFieldSyntax) {
      let inlineCheckpoint = 0;
      for (let i = 0; i < visible.length; i += 1) {
        if (i >= inlineCheckpoint) {
          await yieldToHost(false, "inline-field-scan");
          inlineCheckpoint = i + 512;
        }
        const open = visible[i];
        if (open !== "(" && open !== "[") continue;
        if (open === "[" && visible[i + 1] === "[") { i += 1; continue; }
        const balancedEnd = delimiterCloses?.get(i) ?? -1;
        if (balancedEnd < 0) continue;
        let separator = -1;
        const searchEnd = Math.min(balancedEnd, i + 1 + 122);
        for (let cursor = i + 1; cursor + 1 < searchEnd; cursor += 1) {
          if (visible[cursor] === ":" && visible[cursor + 1] === ":") { separator = cursor - (i + 1); break; }
        }
        if (separator <= 0 || separator > 120) { i = balancedEnd; continue; }
        const name = stripFieldFormatting(visible.slice(i + 1, i + 1 + separator));
        if (!name || hasFieldDelimiter(name)) { i = balancedEnd; continue; }
        const valueStart = i + 1 + separator + 2;
        await addField(name, originalLine.slice(valueStart, balancedEnd), open === "(" ? "parenthesized" : "bracketed", lineNumber, offset + i, offset + balancedEnd + 1);
        if (i === firstNonSpace) firstClaimed = true;
        i = balancedEnd;
      }
    }

    if (hasFieldSyntax && !firstClaimed && firstNonSpace >= 0) {
      let keyStart = firstNonSpace;
      if ((visible[keyStart] === "-" || visible[keyStart] === "*" || visible[keyStart] === "+") && isWhitespace(visible[keyStart + 1])) {
        keyStart += 2;
        let nextWhitespaceCheckpoint = keyStart + 512;
        while (isWhitespace(visible[keyStart])) {
          keyStart += 1;
          if (keyStart >= nextWhitespaceCheckpoint) {
            await yieldToHost(false, "list-whitespace-scan");
            nextWhitespaceCheckpoint = keyStart + 512;
          }
        }
      }
      const separatorAt = await findString(visible, "::", keyStart);
      if (separatorAt > keyStart && separatorAt - keyStart <= 120) {
        const name = stripFieldFormatting(visible.slice(keyStart, separatorAt));
        if (name && !hasFieldDelimiter(name)) {
          await addField(name, originalLine.slice(separatorAt + 2), "line", lineNumber, offset + firstNonSpace, offset + originalLine.length);
        }
      }
    }

    if (hasHttp) {
      const aliasByUrl = new Map<string, string>();
      let markdownCursor = 0;
      while (markdownCursor < visible.length) {
        const open = await findString(visible, "[", markdownCursor);
        if (open < 0) break;
        const closeLabel = await findString(visible, "]", open + 1);
        if (closeLabel < 0) break;
        if (visible[closeLabel + 1] !== "(") {
          markdownCursor = closeLabel + 1;
          await yieldToHost();
          continue;
        }
        const urlStart = closeLabel + 2;
        const scheme = visible.slice(urlStart, urlStart + 8).toLowerCase();
        const schemeLength = scheme.startsWith("https://") ? 8 : scheme.startsWith("http://") ? 7 : 0;
        if (!schemeLength) {
          markdownCursor = closeLabel + 1;
          await yieldToHost();
          continue;
        }
        const closeUrl = await findString(visible, ")", urlStart);
        if (closeUrl < 0) break;
        let [rawStart, rawEnd] = await trimBounds(visible, urlStart, closeUrl);
        rawEnd = await stripTrailingUrlPunctuation(visible, rawStart, rawEnd);
        if (rawEnd - rawStart > schemeLength) {
          const [labelStart, labelEnd] = await trimBounds(visible, open + 1, closeLabel);
          aliasByUrl.set(visible.slice(rawStart, rawEnd), visible.slice(labelStart, labelEnd));
        }
        markdownCursor = closeUrl + 1;
        await yieldToHost();
      }

      let urlCheckpoint = 0;
      for (let i = 0; i < visible.length; i += 1) {
        if (i >= urlCheckpoint) {
          await yieldToHost(false, "url-scan");
          urlCheckpoint = i + 1024;
        }
        const lower = visible.slice(i, i + 8).toLowerCase();
        const schemeLength = lower.startsWith("https://") ? 8 : lower.startsWith("http://") ? 7 : 0;
        if (!schemeLength || isWord(visible[i - 1])) continue;
        let end = i + schemeLength;
        let scanned = 0;
        while (end < visible.length && isUrlChar(visible[end])) {
          end += 1;
          scanned += 1;
          if ((scanned & 2047) === 0) await yieldToHost();
        }
        if (end === i + schemeLength) { i = Math.max(i, end - 1); continue; }
        end = await stripTrailingUrlPunctuation(visible, i + schemeLength, end);
        if (end > i + schemeLength) {
          const raw = visible.slice(i, end);
          if (!seenUrls.has(raw)) {
            seenUrls.add(raw);
            const label = aliasByUrl.get(raw);
            urls.push(label ? { url: raw, label, line: lineNumber } : { url: raw, line: lineNumber });
          }
        }
        i = Math.max(i, end - 1);
      }
    }

    if (!advance()) break;
    await yieldToHost();
  }

  await yieldToHost(false);
  return { inlineFields, inlineFieldOccurrences, urls };
}

export const parseBodyMetadata = (content: string): ParsedBodyMetadata => parseBodyMetadataCore(content);

function splitInternalSubpath(rawTarget: string): { rawTarget: string; subpath?: string } {
  const hash = rawTarget.indexOf("#");
  if (hash < 0) return { rawTarget };
  const subpath = rawTarget.slice(hash);
  return subpath ? { rawTarget, subpath } : { rawTarget };
}

/**
 * Extract literal property-value link references without resolving them through Obsidian. Host
 * destination selection belongs to the adapter; this shared grammar keeps legacy edit/image
 * consumers and normalized ontology collection on one portable grammar owner.
 */
export function extractLinkReferencesFromValue(value: unknown): ExtractedLinkReference[] {
  return [...iterateLinkReferencesFromValue(value)];
}

/** Streaming form used by normalized source collectors so one dense value need not first build a
 * target array. Regex instances are local to each scanned string because consumers may checkpoint
 * asynchronously between yielded references. */
export function* iterateLinkReferencesFromValue(value: unknown): IterableIterator<ExtractedLinkReference> {
  if (Array.isArray(value)) {
    for (const nested of value) yield* iterateLinkReferencesFromValue(nested);
    return;
  }
  if (value && typeof value === "object") {
    for (const nested of Object.values(value as Record<string, unknown>)) yield* iterateLinkReferencesFromValue(nested);
    return;
  }
  if (typeof value !== "string") return;

  const wikiLinkRe = new RegExp(WIKI_LINK_RE.source, WIKI_LINK_RE.flags);
  const markdownLinkRe = new RegExp(MARKDOWN_LINK_RE.source, MARKDOWN_LINK_RE.flags);
  const urlRe = new RegExp(URL_RE.source, URL_RE.flags);
  let match: RegExpExecArray | null;
  while ((match = wikiLinkRe.exec(value)) !== null) {
    const rawTarget = match[1].trim();
    if (rawTarget) yield { ...splitInternalSubpath(rawTarget), external: false };
  }
  while ((match = markdownLinkRe.exec(value)) !== null) {
    const rawTarget = match[1];
    if (!rawTarget) continue;
    // Preserve the legacy external Markdown target exactly, including surrounding spaces.
    // Internal targets are trimmed later by host resolution.
    yield /^https?:\/\//i.test(rawTarget)
      ? { rawTarget, external: true }
      : { ...splitInternalSubpath(rawTarget), external: false };
  }
  while ((match = urlRe.exec(value)) !== null) {
    const rawTarget = match[0].replace(/[.,;:!?]+$/, "");
    if (rawTarget) yield { rawTarget, external: true };
  }
}

export function getNormalizedFrontmatterValues(meta: ParsedFileMetadata, normalizedField: string): unknown[] {
  const values: unknown[] = [];
  for (const [key, value] of Object.entries(meta.frontmatter)) {
    if (normalizeFieldName(key) === normalizedField) values.push(value);
  }
  return values;
}

export function getNormalizedInlineFieldValues(meta: ParsedFileMetadata, normalizedField: string): unknown[] {
  return meta.inlineFields[normalizedField] ? [...meta.inlineFields[normalizedField]] : [];
}

export function getInlineFieldOccurrences(meta: ParsedFileMetadata, normalizedField: string): InlineFieldOccurrence[] {
  return meta.inlineFieldOccurrences.filter((item) => item.normalizedName === normalizedField);
}

export function getNormalizedFieldValues(meta: ParsedFileMetadata, normalizedField: string): unknown[] {
  return [
    ...getNormalizedFrontmatterValues(meta, normalizedField),
    ...getNormalizedInlineFieldValues(meta, normalizedField),
  ];
}
