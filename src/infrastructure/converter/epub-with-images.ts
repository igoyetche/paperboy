/**
 * EPub factory that supports pre-downloaded images.
 *
 * epub-gen-memory always attempts to download images from URLs, even if
 * image.data is pre-populated. This helper overrides downloadAllImages()
 * on an EPub instance to skip download attempts and directly write pre-set
 * image buffers.
 *
 * This allows us to:
 * 1. Download and convert images ourselves (via ImageProcessor)
 * 2. Pre-populate the EPub instance with downloaded image buffers
 * 3. Let EPub create proper OEBPS/images/ structure
 * 4. Avoid double-downloading and get proper EPUB image files (Kindle-compatible)
 *
 * See: PB-017 design for motivation and architecture
 */

import * as epubModule from "epub-gen-memory";

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
const EPubClass = (epubModule as any).EPub;

type EpubBufferMap = Map<string, { buffer: Buffer; format: string }>;

function isDataUri(image: Record<string, unknown>): boolean {
  return typeof image.url === "string" && image.url.startsWith("data:");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fillImageBuffers(images: any[], bufferMap: EpubBufferMap, log: (msg: string) => void): void {
  const buffers = Array.from(bufferMap.values());
  let bufferIndex = 0;

  for (const image of images) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    if (isDataUri(image)) continue;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    let bufferData = bufferMap.get(image.filename ?? "");
    if (!bufferData && bufferIndex < buffers.length) {
      bufferData = buffers[bufferIndex];
      bufferIndex += 1;
    }

    if (bufferData) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      image.data = bufferData.buffer;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      log(`Assigned buffer to ${image.id}`);
    }
  }
}

function writeImageFiles(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  images: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  folder: any,
  log: (msg: string) => void,
  warn: (msg: string) => void,
): void {
  for (const image of images) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    if (isDataUri(image)) continue;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const hrefMatch = image.href?.match(/images\/(.+)$/);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const filename = hrefMatch ? hrefMatch[1] : `${image.id}.${image.extension}`;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (image.data && typeof image.data !== "string") {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      folder.file(filename, image.data);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      log(`Embedded image ${filename} (${image.data.length} bytes)`);
    } else {
      warn(`Image ${filename} has no data - skipping (will appear as broken image in EPUB)`);
    }
  }
}

/**
 * Creates an EPub instance with pre-downloaded images embedded correctly.
 *
 * Strategy:
 * 1. Pass HTML with original image URLs unchanged to EPub
 * 2. Let epub-gen-memory's normalizeHTML() detect URLs and create image objects with UUID filenames
 * 3. Override downloadAllImages() to:
 *    - Match detected image URLs to pre-downloaded buffers (from __imageBufferMap)
 *    - Fill in image.data for matched images
 *    - Write files with UUID-based filenames that HTML references
 *
 * This ensures downloaded image buffers are paired with the correct UUID paths.
 */
export function createEpubWithPredownloadedImages(
  options: unknown,
  chapters: unknown,
): unknown {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
  const epub = new EPubClass(options, chapters);

  // Override downloadAllImages to match pre-downloaded images to detected URLs
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  (epub).downloadAllImages = function (): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!this.images?.length) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      this.log?.("No images to embed");
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.log?.("Embedding pre-downloaded images (skipping network download)");

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const bufferMap = (this).__imageBufferMap as EpubBufferMap | undefined;
    if (bufferMap) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      fillImageBuffers(this.images, bufferMap, (msg) => { this.log?.(msg); });
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const oebps = this.zip?.folder("OEBPS");
    if (!oebps) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      this.warn?.("Could not access OEBPS folder");
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const imagesFolder = oebps.folder("images");
    if (!imagesFolder) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      this.warn?.("Could not create OEBPS/images folder");
      return;
    }

    writeImageFiles(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      this.images,
      imagesFolder,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      (msg) => { this.log?.(msg); },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      (msg) => { this.warn?.(msg); },
    );
  };

  return epub;
}
