/**
 * MarkdownEpubConverter — Implements FR-1, FR-25, FR-36, FR-37 (PB-008, PB-025)
 *
 * Converts a MarkdownDocument to an EpubDocument by:
 *  1. Parsing Markdown to HTML via marked
 *  2. Sanitizing HTML via sanitize-html (preserving id attributes on headings
 *     and anchor tags — FR-25)
 *  3. Processing embedded images via ImageProcessor
 *  4. Generating a cover image and HTML chapter via CoverGenerator
 *  5. Parsing the TOC manifest from the sanitized HTML (FR-25)
 *  6. If multi-section: splitting into per-chapter slices (FR-25)
 *  7. Assembling the EPUB via epub-gen-memory with pre-downloaded images
 */

import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { File } from "node:buffer";
import type { ContentConverter } from "../../domain/ports.js";
import type { Title, Author, MarkdownDocument } from "../../domain/values/index.js";
import { EpubDocument } from "../../domain/values/index.js";
import { ConversionError, type Result, ok, err } from "../../domain/errors.js";
import type { ImageProcessor } from "./image-processor.js";
import type { CoverGenerator } from "./cover-generator.js";
import { createEpubWithPredownloadedImages } from "./epub-with-images.js";
import { parseTocManifest, isMultiSection } from "../../domain/toc-parser.js";
import { splitIntoChapters } from "../../domain/chapter-splitter.js";

const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "br", "hr", "blockquote", "pre", "code",
  "b", "i", "em", "strong", "u", "s", "sup", "sub",
  "ul", "ol", "li",
  "a", "img",
  "table", "thead", "tbody", "tr", "th", "td",
  "div", "span",
];

/**
 * Converts Markdown content to EPUB format, injecting a styled cover page
 * and embedding any remote images locally inside the EPUB container.
 *
 * For multi-section documents (those with 2+ top-level headings in the
 * sanitized HTML), the content is split into separate EPUB chapters — one per
 * section — enabling Kindle's "Go To" navigation to list each section
 * independently.
 *
 * Implements FR-1 (PB-008): Markdown → EPUB conversion pipeline.
 * Implements FR-25 (PB-025): multi-section chapter splitting.
 * Implements FR-36, FR-37 (PB-008): cover HTML chapter and cover JPEG image.
 */
export class MarkdownEpubConverter implements ContentConverter {
  constructor(
    private readonly imageProcessor: ImageProcessor,
    private readonly coverGenerator: CoverGenerator,
  ) {}

  async toEpub(
    title: Title,
    document: MarkdownDocument,
    author: Author,
  ): Promise<Result<EpubDocument, ConversionError>> {
    try {
      const rawHtml = await marked.parse(document.content.value);

      // FR-25 (PB-025): preserve id attributes on heading elements and <a>
      // anchor tags so that internal TOC anchor links resolve correctly in the
      // EPUB and so that chapter-boundary anchors survive sanitization.
      const safeHtml = sanitizeHtml(rawHtml, {
        allowedTags: ALLOWED_TAGS,
        allowedAttributes: {
          h1: ["id"],
          h2: ["id"],
          h3: ["id"],
          h4: ["id"],
          h5: ["id"],
          h6: ["id"],
          a: ["href", "title", "id"],
          img: ["src", "alt", "title"],
          td: ["colspan", "rowspan"],
          th: ["colspan", "rowspan"],
        },
        allowedSchemes: ["http", "https", "mailto"],
      });

      // FR-25 (PB-025): Parse the TOC manifest from the sanitized HTML.
      // parseTocManifest returns top-level heading entries (min heading level).
      const tocManifest = parseTocManifest(safeHtml);

      // Process images — download remote images and return them as buffers.
      // Image processing runs on the whole document before chapter splitting so
      // that URL → UUID rewrites are applied once and carry into every chapter.
      const { html: processedHtml, images: processedImages, stats } =
        await this.imageProcessor.process(safeHtml);

      // Generate cover assets — FR-36 (HTML chapter) and FR-37 (JPEG image)
      const coverCss = this.coverGenerator.generateCoverCss();
      const jpegBuffer = await this.coverGenerator.generateImage(
        title.value,
        author.value,
      );
      const htmlChapter = this.coverGenerator.generateHtmlChapter(
        title.value,
        author.value,
        document.metadata.url,
      );
      // Copy into a concrete ArrayBuffer so File() receives ArrayBuffer (not
      // ArrayBufferLike, which includes SharedArrayBuffer and fails strict TS).
      const coverUint8 = new Uint8Array(jpegBuffer.byteLength);
      coverUint8.set(jpegBuffer);
      const coverFile = new File([coverUint8], "cover.jpg", { type: "image/jpeg" });

      // Build image buffer map for pre-downloaded images
      const imageBufferMap = new Map<string, { buffer: Buffer; format: string }>();
      for (const img of processedImages) {
        imageBufferMap.set(img.filename, {
          buffer: img.buffer,
          format: img.format,
        });
      }

      // FR-25 (PB-025): Build the chapter list for epub-gen-memory.
      // Multi-section documents produce one entry per top-level heading section;
      // single-section documents produce exactly one entry (unchanged behaviour).
      const coverEntry = {
        title: "",
        content: htmlChapter,
        excludeFromToc: true,
        beforeToc: true,
      };

      let contentEntries: Array<{ title: string; content: string; filename?: string }>;

      if (isMultiSection(tocManifest)) {
        const chapters = splitIntoChapters(processedHtml, tocManifest);
        contentEntries = chapters.map((ch, i) => ({
          title: ch.title,
          content: ch.html,
          filename: `section-${i + 1}.xhtml`,
        }));
      } else {
        contentEntries = [{ title: title.value, content: processedHtml }];
      }

      const epubInstance = createEpubWithPredownloadedImages(
        { title: title.value, author: author.value, cover: coverFile, css: coverCss },
        [coverEntry, ...contentEntries],
      );

      // Attach image map so the overridden downloadAllImages() can use it
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      (epubInstance as any).__imageBufferMap = imageBufferMap;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
      const buffer = await (epubInstance as any).genEpub();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return ok(new EpubDocument(title.value, buffer, stats, author.value, document.metadata.date));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown conversion error";
      return err(new ConversionError(message));
    }
  }
}
