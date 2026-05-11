import type { CoverFlavor } from "../../../../domain/ports.js";
import { buildThumbnail } from "./thumbnail.js";
import { buildHtmlChapter } from "./chapter.js";
import { buildCoverCss } from "./css.js";

export const brutalist: CoverFlavor = {
  name: "brutalist",
  buildThumbnail,
  buildHtmlChapter,
  buildCoverCss,
  titleWrap: { maxChars: 18, maxLines: 4 },
};
