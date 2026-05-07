/**
 * Classic flavor — the bundled default visual identity for Paperboy covers.
 *
 * Visual design: cream (#f5efe4) background, maroon (#a03020) accent, serif typography,
 * centered layout. Faithful port of the original hand-authored SVG/HTML templates
 * into the CoverFlavor contract, now rendered via Satori's flexbox layout engine.
 *
 * Implements FR-38 (PB-026): bundled classic flavor.
 */

import type { CoverFlavor } from "../../../../domain/ports.js";
import { buildThumbnail } from "./thumbnail.js";
import { buildHtmlChapter } from "./chapter.js";
import { buildCoverCss } from "./css.js";

/**
 * The classic CoverFlavor — cream background, maroon accent, centered serif layout.
 * This is the default flavor; selected when PAPERBOY_COVER_FLAVOR is unset.
 */
export const classic: CoverFlavor = {
  name: "classic",
  buildThumbnail,
  buildHtmlChapter,
  buildCoverCss,
};
