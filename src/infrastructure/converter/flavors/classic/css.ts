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
  return `html, body { margin: 0; padding: 0; }
body { font-family: ${TYPOGRAPHY.fontFamily}; }
.cover { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 10% 8%; background: ${COLORS.background}; }
.kicker { color: ${COLORS.accent}; font-size: 0.8em; font-weight: bold; letter-spacing: 0.4em; text-transform: uppercase; margin: 0 0 2em; }
.title { color: #1a1a1a; font-size: 3.2em; font-weight: bold; line-height: 1.3; margin: 0 0 0.4em; }
.rule { width: 5em; height: 2px; background: ${COLORS.accent}; border: none; margin: 0.8em auto 1em; }
.author { color: #4a4a4a; font-size: 1.3em; font-style: italic; }
hr { border: 0; border-bottom: 1px solid #dedede; margin: 3em 10%; }`;
}
