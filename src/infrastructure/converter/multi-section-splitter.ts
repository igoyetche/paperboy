/**
 * multi-section-splitter — Implements FR-25 (PB-025)
 *
 * Parses a raw Markdown string for a hand-written TOC manifest, detects
 * whether a document is multi-section, and splits rendered HTML into
 * per-chapter slices that can be passed to epub-gen-memory as separate
 * content entries.
 *
 * All functions are pure — no I/O, no side effects.
 */

/**
 * One entry from the Markdown TOC block.
 * title    — display text of the link, e.g. "Agentic Engineering Patterns"
 * anchorId — fragment without the leading #, e.g. "page-1"
 */
export interface TocEntry {
  readonly title: string;
  readonly anchorId: string;
}

/**
 * One chapter produced by splitIntoChapters().
 * title    — chapter title (from TOC manifest, or H1 text fallback)
 * anchorId — anchor id for this chapter
 * html     — HTML fragment for this chapter (includes anchor tag, excludes H1)
 */
export interface SplitChapter {
  readonly title: string;
  readonly anchorId: string;
  readonly html: string;
}

/**
 * Result from splitIntoChapters().
 * chapters — ordered list of chapter slices
 * warnings — non-fatal issues (missing anchors, extra chapters, etc.)
 */
export interface SplitResult {
  readonly chapters: SplitChapter[];
  readonly warnings: string[];
}

// Pattern: [Title Text](#anchor-id) in raw Markdown
const TOC_LINK_RE = /\[([^\]]+)\]\(#([^)]+)\)/g;

/**
 * Parses a raw Markdown string and extracts all inline TOC links of the form
 * `[Title Text](#anchor-id)` in document order.
 *
 * Implements FR-25 (PB-025): TOC manifest parsing from raw Markdown.
 *
 * @param markdown - Raw Markdown source (before marked.parse())
 * @returns Ordered array of TocEntry values; empty array if none found
 */
export function parseTocManifest(markdown: string): TocEntry[] {
  const entries: TocEntry[] = [];
  TOC_LINK_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TOC_LINK_RE.exec(markdown)) !== null) {
    const title = match[1];
    const anchorId = match[2];
    if (title !== undefined && anchorId !== undefined) {
      entries.push({ title, anchorId });
    }
  }
  return entries;
}

/**
 * Returns true when the TOC manifest contains 2 or more entries, indicating
 * the document should be split into individual EPUB chapters.
 *
 * Implements FR-25 (PB-025): multi-section detection.
 *
 * @param toc - Manifest returned by parseTocManifest()
 */
export function isMultiSection(toc: TocEntry[]): boolean {
  return toc.length >= 2;
}

// Matches <a id="..."></a> optionally followed by whitespace and an <h1>
// Used to locate chapter boundaries in the processed HTML.
// Capture groups: 1=anchorId, 2=h1 text (optional)
const CHAPTER_BOUNDARY_RE =
  /<a\s+id="([^"]+)"[^>]*>\s*<\/a>\s*(<h1[^>]*>[\s\S]*?<\/h1>)?/gi;

// Matches an <hr> element (self-closing or paired, any attributes)
const HR_RE = /<hr\s*\/?>/i;

interface BoundaryInfo {
  anchorId: string;
  h1Html: string;
  fullMatchLength: number;
  startIndex: number;
}

function extractHeadingText(h1Html: string): string {
  return h1Html.replaceAll(/<[^>]+>/g, "").trim();
}

function findBoundaries(body: string): BoundaryInfo[] {
  const boundaries: BoundaryInfo[] = [];
  CHAPTER_BOUNDARY_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CHAPTER_BOUNDARY_RE.exec(body)) !== null) {
    const anchorId = m[1];
    const h1Html = m[2] ?? "";
    if (anchorId !== undefined) {
      boundaries.push({
        anchorId,
        h1Html,
        fullMatchLength: m[0].length,
        startIndex: m.index,
      });
    }
  }
  return boundaries;
}

function resolveChapterTitle(
  anchorId: string,
  h1Html: string,
  manifestByAnchor: Map<string, string>,
  matchedAnchorIds: Set<string>,
  warnings: string[],
): string {
  const manifestTitle = manifestByAnchor.get(anchorId);
  if (manifestTitle !== undefined) {
    matchedAnchorIds.add(anchorId);
    return manifestTitle;
  }
  if (h1Html.length > 0) {
    const title = extractHeadingText(h1Html);
    warnings.push(
      `Chapter anchor "${anchorId}" not found in TOC manifest; using H1 text "${title}" as fallback`,
    );
    return title;
  }
  warnings.push(
    `Chapter anchor "${anchorId}" not found in TOC manifest and no H1 present; using "Untitled"`,
  );
  return "Untitled";
}

function warnUnmatchedManifest(
  manifest: TocEntry[],
  matchedAnchorIds: Set<string>,
  warnings: string[],
): void {
  for (const entry of manifest) {
    if (!matchedAnchorIds.has(entry.anchorId)) {
      warnings.push(
        `TOC manifest entry "${entry.title}" (anchor "#${entry.anchorId}") not found in HTML`,
      );
    }
  }
}

/**
 * Splits a fully-processed HTML string (after marked, sanitize-html, and
 * imageProcessor) into one slice per TOC entry.
 *
 * Algorithm:
 * 1. Drop the front-matter block: everything up to and including the first <hr>.
 *    If no <hr> is found, keep the full HTML.
 * 2. Scan for <a id="..."></a> anchor tags that precede each section.
 * 3. Slice the HTML at each anchor position; the anchor tag is retained,
 *    the <h1> tag is stripped (epub-gen-memory prepends the chapter title).
 * 4. Title comes from the manifest entry whose anchorId matches. Falls back
 *    to the <h1> text, or "Untitled" if neither is available.
 * 5. Warnings are emitted for manifest entries not found in HTML, and for
 *    HTML anchors not in the manifest — but they do not abort conversion.
 *
 * Implements FR-25 (PB-025): HTML chapter splitting.
 *
 * @param html     - Fully processed HTML string
 * @param manifest - Ordered TOC entries from parseTocManifest()
 */
export function splitIntoChapters(
  html: string,
  manifest: TocEntry[],
): SplitResult {
  const warnings: string[] = [];

  const hrMatch = HR_RE.exec(html);
  const body = hrMatch
    ? html.slice(hrMatch.index + hrMatch[0].length)
    : html;

  const boundaries = findBoundaries(body);

  if (boundaries.length === 0) {
    warnings.push(
      `No chapter boundaries (<a id="..."> anchors) found in HTML; falling back to single chapter`,
    );
    return {
      chapters: [{ title: manifest[0]?.title ?? "Untitled", anchorId: "", html: body }],
      warnings,
    };
  }

  const manifestByAnchor = new Map<string, string>(
    manifest.map((e) => [e.anchorId, e.title]),
  );
  const matchedAnchorIds = new Set<string>();
  const chapters: SplitChapter[] = [];

  for (const [i, current] of boundaries.entries()) {
    const next = boundaries[i + 1];
    const contentStart = current.startIndex + current.fullMatchLength;
    const contentEnd = next === undefined ? body.length : next.startIndex;
    const chapterContent = body.slice(contentStart, contentEnd).trim();

    const anchorTag = `<a id="${current.anchorId}"></a>`;
    const chapterHtml =
      chapterContent.length > 0 ? `${anchorTag}\n${chapterContent}` : anchorTag;

    const title = resolveChapterTitle(
      current.anchorId,
      current.h1Html,
      manifestByAnchor,
      matchedAnchorIds,
      warnings,
    );

    chapters.push({ title, anchorId: current.anchorId, html: chapterHtml });
  }

  warnUnmatchedManifest(manifest, matchedAnchorIds, warnings);

  return { chapters, warnings };
}
