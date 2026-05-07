/**
 * Chapter splitting utilities for EPUB navigation support.
 *
 * Implements T-03 (PB-025): splitIntoChapters.
 *
 * This module takes fully rendered, sanitized HTML and a TOC manifest
 * (produced by parseTocManifest from toc-parser.ts) and splits the HTML
 * into ordered chapter slices — one slice per TOC entry.
 *
 * Pure functions: no I/O, no side effects.
 */

import type { TocEntry } from "./toc-parser.js";

/**
 * A single chapter slice produced by splitIntoChapters.
 *
 * - `title` — the chapter heading text (from the TOC entry)
 * - `html`  — the HTML fragment from the heading element (inclusive) to
 *             the next top-level heading (exclusive), or end of document
 */
export type ChapterSlice = { title: string; html: string };

/**
 * Strips all HTML tags from a string, leaving only text content.
 * Used for text-based heading lookup when no `id` attribute is available.
 */
function stripTags(html: string): string {
  return html.replaceAll(/<[^>]+>/g, "").trim();
}

/**
 * Finds the character index of a heading element in the HTML corresponding to
 * the given TocEntry. Returns -1 if not found.
 *
 * Lookup strategy:
 * 1. If the entry has a non-empty `id`: match the opening tag that carries
 *    `id="<value>"` (e.g. `<h1 id="intro">`).
 * 2. If the entry has no `id`: scan all headings of the matching tag level
 *    and return the first whose stripped text equals the entry text.
 */
function findHeadingIndex(html: string, entry: TocEntry): number {
  if (entry.id !== "") {
    // Locate opening tag that contains id="<entry.id>" for this tag level.
    // Build a pattern that matches <h1 ... id="intro" ...> (id anywhere in attrs).
    const idPattern = new RegExp(
      String.raw`<${entry.tag}\b[^>]*\bid\s*=\s*"${escapeRegExp(entry.id)}"[^>]*>`,
      "i",
    );
    const match = idPattern.exec(html);
    return match === null ? -1 : match.index;
  }

  // No id: find by tag level + text content match
  const scanPattern = new RegExp(
    String.raw`<${entry.tag}\b[^>]*>([\s\S]*?)<\/${entry.tag}>`,
    "gi",
  );

  let scanMatch: RegExpExecArray | null;
  while ((scanMatch = scanPattern.exec(html)) !== null) {
    const innerText = stripTags(scanMatch[1] ?? "");
    if (innerText === entry.text) {
      return scanMatch.index;
    }
  }

  return -1;
}

/**
 * Escapes special regex characters in a literal string so it can be safely
 * embedded in a RegExp pattern.
 */
function escapeRegExp(s: string): string {
  return s.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/**
 * Splits the fully processed HTML into ordered chapter slices.
 *
 * For each TOC entry, the corresponding heading element is located in the
 * HTML. The slice for that chapter extends from the heading's start position
 * (inclusive) up to — but not including — the start of the next chapter's
 * heading. The last chapter captures all remaining content.
 *
 * TOC entries whose heading cannot be located are silently skipped (their
 * title will not appear in the output). This is a degraded-mode behaviour to
 * avoid aborting conversion when HTML and TOC are partially mismatched.
 *
 * Implements T-03 (PB-025).
 *
 * @param html  - Fully rendered, sanitized (and image-processed) HTML
 * @param toc   - Ordered TOC manifest from parseTocManifest
 * @returns     Ordered array of ChapterSlice objects; empty when toc is empty
 *              or no headings can be located
 */
export function splitIntoChapters(
  html: string,
  toc: TocEntry[],
): ChapterSlice[] {
  if (toc.length === 0) {
    return [];
  }

  // Resolve the start index of each TOC entry's heading in the HTML.
  // Entries that cannot be found are represented as -1 and excluded below.
  const positions: Array<{ entry: TocEntry; index: number }> = toc
    .map((entry) => ({ entry, index: findHeadingIndex(html, entry) }))
    .filter((item) => item.index !== -1);

  if (positions.length === 0) {
    return [];
  }

  // Build slices: each slice runs from positions[i].index to positions[i+1].index
  const slices: ChapterSlice[] = [];

  for (let i = 0; i < positions.length; i++) {
    const current = positions[i];
    const next = positions[i + 1];

    // current and next are always defined within bounds, but satisfy TS strictness:
    if (current === undefined) {
      continue;
    }

    const start = current.index;
    const end = next === undefined ? html.length : next.index;
    let fragment = html.slice(start, end);

    // Strip the opening heading tag so it's not duplicated when epub-gen-memory
    // uses the title field to add a heading. The title is stored separately in
    // ChapterSlice.title, so it shouldn't appear in the HTML body as well.
    const headingCloseTag = `</${current.entry.tag}>`;
    const closeIndex = fragment.indexOf(headingCloseTag);
    if (closeIndex !== -1) {
      const afterClose = closeIndex + headingCloseTag.length;
      fragment = fragment.slice(afterClose);
    }

    slices.push({
      title: current.entry.text,
      html: fragment,
    });
  }

  return slices;
}
