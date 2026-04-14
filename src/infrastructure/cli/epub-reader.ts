/**
 * EPUB file reader for the CLI and watcher entry points.
 *
 * Reads an EPUB file from disk and extracts its title from EPUB metadata.
 * Falls back to the filename stem if metadata extraction fails for any reason
 * (malformed EPUB, missing container.xml, missing dc:title, etc.).
 *
 * Implements PB-012: Accept EPUB files without transformation.
 */

import JSZip from "jszip";
import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";

/** 50 MB — Amazon Send to Kindle attachment ceiling */
const MAX_EPUB_BYTES = 50 * 1024 * 1024;

export interface EpubReadResult {
  /** Raw bytes of the EPUB file */
  readonly buffer: Buffer;
  /**
   * Best-effort title from EPUB metadata, or filename stem as fallback.
   * Always non-empty.
   */
  readonly suggestedTitle: string;
}

/**
 * Reads an EPUB file from disk.
 *
 * Rejects with an Error when:
 *   - The file size exceeds 50 MB
 *   - The file cannot be accessed (ENOENT, EACCES, etc.)
 *
 * Title extraction is best-effort: any failure silently falls back to the
 * filename stem. The EPUB is never rejected for having bad metadata.
 */
export async function readEpubFile(filePath: string): Promise<EpubReadResult> {
  const fileStats = await stat(filePath);

  if (fileStats.size > MAX_EPUB_BYTES) {
    throw new Error(
      `EPUB file is too large: ${fileStats.size} bytes exceeds the 50 MB limit (${MAX_EPUB_BYTES} bytes).`,
    );
  }

  const buffer = await readFile(filePath);
  const suggestedTitle = await extractEpubTitle(buffer, filePath);

  return { buffer, suggestedTitle };
}

/**
 * Attempts to extract the document title from EPUB metadata (OPF dc:title).
 * Returns the filename stem on any failure.
 */
async function extractEpubTitle(buffer: Buffer, filePath: string): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(buffer);

    // Step 1: Read META-INF/container.xml to find the OPF file path
    const containerFile = zip.file("META-INF/container.xml");
    if (containerFile === null) return filenameStem(filePath);

    const containerXml = await containerFile.async("text");

    // Extract full-path attribute of the rootfile element
    const opfPathMatch = /full-path="([^"]+\.opf)"/i.exec(containerXml);
    const opfPath = opfPathMatch?.[1];
    if (!opfPath) return filenameStem(filePath);

    // Step 2: Read the OPF package document
    const opfFile = zip.file(opfPath);
    if (opfFile === null) return filenameStem(filePath);

    const opfContent = await opfFile.async("text");

    // Step 3: Extract dc:title from OPF
    const titleMatch = /<dc:title[^>]*>([^<]+)<\/dc:title>/i.exec(opfContent);
    const title = titleMatch?.[1]?.trim();

    return title ?? filenameStem(filePath);
  } catch {
    return filenameStem(filePath);
  }
}

function filenameStem(filePath: string): string {
  return basename(filePath).replace(/\.epub$/i, "");
}
