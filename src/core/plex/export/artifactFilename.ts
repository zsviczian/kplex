/** Filename-only validation shared by native Markdown and PNG artifact handoffs. */
export function artifactFilename(raw: string, extension: "md" | "png"): string | null {
  const value = raw.trim();
  if (!value || value.length > 200 || value === "." || value === ".." || /[\\/:*?"<>|#[\]]/.test(value)
    || Array.from(value).some(/** Reject native control characters without a scanner-unsafe regex range. */ char => char.charCodeAt(0) < 32)) return null;
  return value.toLowerCase().endsWith(`.${extension}`) ? value : `${value}.${extension}`;
}

/** Suggest a safe initial name for a native save dialog; users edit the name in that dialog. */
export function suggestedArtifactFilename(label: string, extension: "md" | "png"): string {
  const stem = Array.from(label).map(/** Native filename separators and controls are presentation whitespace. */ char => char.charCodeAt(0) < 32 || /[\\/:*?"<>|#[\]]/.test(char) ? " " : char).join("").trim().slice(0, 160);
  return artifactFilename(stem, extension) ?? `export.${extension}`;
}
