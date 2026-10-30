/** Filename-only validation shared by native Markdown and PNG artifact handoffs. */
export function artifactFilename(raw: string, extension: "md" | "png"): string | null {
  const value = raw.trim();
  if (!value || value.length > 200 || value === "." || value === ".." || /[\\/:*?"<>|#[\]]/.test(value)
    || Array.from(value).some(/** Reject native control characters without a scanner-unsafe regex range. */ char => char.charCodeAt(0) < 32)) return null;
  return value.toLowerCase().endsWith(`.${extension}`) ? value : `${value}.${extension}`;
}
