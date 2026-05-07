/**
 * CoverGenerator — Implements FR-36, FR-37, FR-38, FR-39 (PB-008, PB-026)
 *
 * Generates an HTML first-page chapter and a JPEG cover image for EPUB documents.
 * Templates (HTML, CSS, Satori node tree) live in flavors/<name>/; this module
 * handles asset loading (font, icon), Satori invocation, and JPEG rasterisation.
 *
 * The active flavor and resolution are passed at call time, not at construction
 * time, so the generator remains stateless with respect to visual identity.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";
import satori, { type Font as SatoriFont } from "satori";
import type { CoverFlavor, ChapterInput, ThumbnailInput } from "../../domain/ports.js";
import type { CoverResolution } from "../../domain/values/cover-resolution.js";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function extractDomain(url: string): string | undefined {
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Type alias
// ---------------------------------------------------------------------------

/** ThumbnailInput without the canvas dimensions — those come from CoverResolution. */
type ThumbnailContent = Omit<ThumbnailInput, "width" | "height">;

// ---------------------------------------------------------------------------
// Exported helpers
// ---------------------------------------------------------------------------

/**
 * Word-wraps a title string into lines of at most `maxLineChars` characters,
 * breaking only at word boundaries. At most `maxLines` lines are produced.
 * If the title requires more lines, the last line is truncated with an ellipsis (…).
 *
 * A single word longer than `maxLineChars` is returned as-is on its own line.
 *
 * Implements FR-36 (PB-008): title wrapping for the cover image.
 */
export function wrapTitle(
  title: string,
  maxLineChars = 30,
  maxLines = 3,
): string[] {
  const words = title.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (current.length === 0) {
      current = word;
      continue;
    }

    const candidate = `${current} ${word}`;

    if (candidate.length <= maxLineChars) {
      current = candidate;
      continue;
    }

    if (lines.length >= maxLines - 1) {
      const withEllipsis = `${current}…`;
      lines.push(
        withEllipsis.length <= maxLineChars
          ? withEllipsis
          : `${current.slice(0, maxLineChars - 1)}…`,
      );
      return lines;
    }

    lines.push(current);
    current = word;
  }

  if (current.length > 0) {
    lines.push(current);
  }

  return lines;
}

// ---------------------------------------------------------------------------
// CoverGenerator
// ---------------------------------------------------------------------------

/**
 * Generates cover assets for EPUB documents:
 *  - `generateHtmlChapter`: styled XHTML first chapter (title page) for Kindle rendering
 *  - `generateImage`: JPEG cover image at the configured resolution for the Kindle library thumbnail
 *
 * Constructor loads bundled font(s) and the cover icon once. All rendering
 * is delegated to the flavor passed at call time.
 *
 * Implements FR-36, FR-37, FR-38, FR-39 (PB-008, PB-026).
 */
export class CoverGenerator {
  private readonly iconDataUri: string;
  private readonly fonts: SatoriFont[];

  constructor() {
    const dir = dirname(fileURLToPath(import.meta.url));

    // Load cover icon as base64 data URI for embedding in Satori node trees
    const iconPath = join(dir, "assets", "cover-icon.png");
    const iconBuffer = readFileSync(iconPath);
    this.iconDataUri = `data:image/png;base64,${iconBuffer.toString("base64")}`;

    // Load Source Serif 4 regular font for Satori rendering
    const fontPath = join(dir, "assets", "fonts", "source-serif-regular.ttf");
    const fontBuffer = readFileSync(fontPath);
    this.fonts = [
      {
        name: "Source Serif 4",
        data: fontBuffer,
        weight: 400 as const,
        style: "normal" as const,
      },
    ];
  }

  /**
   * Returns the CSS string for the EPUB stylesheet.
   * Pass this to epub-gen-memory's `css` option so styles land in <head>, not <body>.
   *
   * Implements FR-36 (PB-008, PB-026).
   */
  generateCoverCss(flavor: CoverFlavor): string {
    return flavor.buildCoverCss();
  }

  /**
   * Generates a styled XHTML cover chapter (title page) with title, author,
   * and optional source domain. No inline styles — CSS comes from generateCoverCss().
   *
   * Implements FR-36 (PB-008, PB-026).
   */
  generateHtmlChapter(
    flavor: CoverFlavor,
    title: string,
    author: string,
    sourceUrl?: string,
  ): string {
    const sourceDomain = sourceUrl ? extractDomain(sourceUrl) : undefined;
    const input: ChapterInput = { title, author, sourceDomain };
    return flavor.buildHtmlChapter(input);
  }

  /**
   * Returns the SVG string for the Kindle library thumbnail at the given resolution.
   * Exposed so the SVG can be inspected/snapshotted independently of rasterisation.
   * Uses Satori to render the flavor's Satori node tree to SVG.
   *
   * Implements FR-37 (PB-008, PB-026).
   */
  async generateCoverSvg(
    flavor: CoverFlavor,
    resolution: CoverResolution,
    input: ThumbnailContent,
  ): Promise<string> {
    const fullInput: ThumbnailInput = {
      ...input,
      width: resolution.width,
      height: resolution.height,
    };
    const node = flavor.buildThumbnail(fullInput);
    return satori(node, {
      width: resolution.width,
      height: resolution.height,
      fonts: this.fonts,
    });
  }

  /**
   * Generates a JPEG cover image for the Kindle library thumbnail at the given resolution.
   * SVG is produced by Satori (via generateCoverSvg) and rasterised to JPEG via sharp.
   *
   * Implements FR-37, FR-39 (PB-008, PB-026).
   */
  async generateImage(
    flavor: CoverFlavor,
    resolution: CoverResolution,
    input: ThumbnailContent,
  ): Promise<Buffer> {
    const fullInput: ThumbnailInput = {
      ...input,
      width: resolution.width,
      height: resolution.height,
    };
    const node = flavor.buildThumbnail(fullInput);
    const svg = await satori(node, {
      width: resolution.width,
      height: resolution.height,
      fonts: this.fonts,
    });
    return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
  }

  /**
   * Convenience: build the ThumbnailContent from title and author for callers
   * that don't compose the object themselves. Wraps the title and attaches the
   * bundled icon data URI.
   */
  buildThumbnailContent(title: string, author: string): ThumbnailContent {
    const titleLines = wrapTitle(title, 16, 4);
    return { titleLines, author, iconDataUri: this.iconDataUri };
  }
}
