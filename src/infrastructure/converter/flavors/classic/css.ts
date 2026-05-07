/**
 * Classic flavor CSS — styles for the EPUB cover chapter (title page).
 *
 * Returns a CSS string that is injected into the EPUB stylesheet via
 * epub-gen-memory's `css` option so it lands in OEBPS/style.css and is
 * linked from every chapter's <head> — required by Amazon's EPUB validator.
 *
 * Implements FR-36 (PB-026) via the CoverFlavor contract.
 */

import { COLORS, TYPOGRAPHY } from "../_shared/tokens.js";

/**
 * Returns the CSS string for the classic cover chapter and global EPUB styles.
 */
export function buildCoverCss(): string {
  return `body { font-family: ${TYPOGRAPHY.fontFamily}; }
.cover { background: ${COLORS.background}; text-align: center; padding: 60px 20px; }
.kicker { color: ${COLORS.accent}; font-size: 0.75em; font-weight: bold; letter-spacing: 0.4em; text-transform: uppercase; margin-bottom: 24px; }
.title { color: #1a1a1a; font-size: 2.2em; font-weight: bold; line-height: 1.25; margin-bottom: 20px; }
.rule { width: 100px; height: 2px; background: ${COLORS.accent}; margin: 0 auto 20px; }
.author { color: #4a4a4a; font-size: 1.4em; font-style: italic; }
.source { color: #8a7a5a; font-size: 1em; margin-top: 24px; letter-spacing: 0.2em; text-transform: uppercase; }
hr { border: 0; border-bottom: 1px solid #dedede; margin: 60px 10%; }`;
}
