/**
 * TOC parsing utilities for EPUB navigation support.
 *
 * Implements T-02 (PB-025): parseTocManifest and isMultiSection.
 *
 * These utilities operate on sanitized HTML rendered from Markdown and
 * extract heading elements to build a table-of-contents manifest used
 * for multi-section EPUB chapter splitting.
 */

/**
 * A single entry in the table-of-contents manifest.
 *
 * - `tag`  — the lowercase heading tag name (e.g. "h1", "h2")
 * - `text` — the plain-text content of the heading element
 * - `id`   — the value of the heading's `id` attribute (empty string when absent)
 */
export type TocEntry = { tag: string; text: string; id: string };

/**
 * Heading levels in ascending priority order (h1 is highest / most specific).
 */
const HEADING_TAGS = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;

/**
 * Matches a single opening heading tag with optional attributes, capturing:
 *   [1] the tag name (h1–h6)
 *   [2] the attributes string (may be empty)
 *
 * Designed for sanitized HTML where attributes do not contain `>` and
 * tags are well-formed (no self-closing headings in practice).
 */
const HEADING_RE =
  /<(h[1-6])([^>]*)>([\s\S]*?)<\/\1>/gi;

/**
 * Extracts the value of an `id` attribute from a tag's attribute string.
 * Returns an empty string when no `id` attribute is present.
 */
function extractId(attrs: string): string {
  const match = /\bid\s*=\s*"([^"]*)"/i.exec(attrs);
  return match?.[1] ?? "";
}

/**
 * Strips all inner HTML tags, leaving only text nodes.
 * Used to get the plain-text label of a heading.
 */
function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

/**
 * Parses the rendered, sanitized HTML and returns a TOC manifest.
 *
 * Only headings at the **minimum heading level** present in the HTML are
 * returned — these form the top-level chapters. For example, if the HTML
 * contains both `<h1>` and `<h2>` elements, only the `<h1>` entries are
 * returned; if it contains only `<h2>` and `<h3>` elements, only the
 * `<h2>` entries are returned.
 *
 * Implements T-02 (PB-025).
 *
 * @param html - Sanitized HTML string produced by the Markdown converter
 * @returns Ordered array of top-level TocEntry objects
 */
export function parseTocManifest(html: string): TocEntry[] {
  if (!html.trim()) {
    return [];
  }

  // Collect all heading elements present in the HTML
  const all: TocEntry[] = [];
  let match: RegExpExecArray | null;
  HEADING_RE.lastIndex = 0;

  while ((match = HEADING_RE.exec(html)) !== null) {
    const tag = match[1]?.toLowerCase() ?? "";
    const attrs = match[2] ?? "";
    const inner = match[3] ?? "";
    all.push({ tag, text: stripTags(inner), id: extractId(attrs) });
  }

  if (all.length === 0) {
    return [];
  }

  // Find the minimum (highest-priority) heading level present
  const minLevel = HEADING_TAGS.find((t) =>
    all.some((entry) => entry.tag === t),
  );

  if (minLevel === undefined) {
    return [];
  }

  return all.filter((entry) => entry.tag === minLevel);
}

/**
 * Returns `true` when the TOC manifest contains more than one entry,
 * indicating the document should be split into multiple EPUB chapters.
 *
 * Implements T-02 (PB-025).
 *
 * @param toc - TOC manifest produced by `parseTocManifest`
 */
export function isMultiSection(toc: TocEntry[]): boolean {
  return toc.length > 1;
}
