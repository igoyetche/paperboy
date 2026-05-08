/**
 * Classic flavor chapter HTML — styled body fragment for the EPUB cover chapter.
 *
 * Returns the HTML body fragment (no <style>, no <script>) for the title page.
 * CSS is provided separately via buildCoverCss() so it can be placed in
 * OEBPS/style.css and linked from <head> — required by Amazon's EPUB validator.
 *
 * Implements FR-37 (PB-026) via the CoverFlavor contract.
 */

import type { ChapterInput } from "../../../../domain/ports.js";

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Returns a styled body fragment for the EPUB cover chapter (title page).
 *
 * No <style> block — CSS is injected via the epub `css` option so it lands
 * in the EPUB stylesheet linked from <head>, which is EPUB-compliant.
 *
 * The cover icon is intentionally omitted from the HTML chapter to avoid
 * embedding a large base64 data URI in the chapter XHTML. The icon appears
 * in the JPEG cover thumbnail.
 */
export function buildHtmlChapter(input: ChapterInput): string {
  const { title, author } = input;

  return `<div class="cover">
  <p class="kicker">PAPERBOY</p>
  <h1 class="title">${escapeXml(title)}</h1>
  <div class="rule"></div>
  <p class="author">by ${escapeXml(author)}</p>
</div>`;
}
