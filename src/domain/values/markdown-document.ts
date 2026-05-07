import type { MarkdownContent } from "./markdown-content.js";
import type { DocumentMetadata } from "./document-metadata.js";

/**
 * Wraps parsed Markdown content, extracted document metadata, and any HTML
 * id attributes found in the body.
 *
 * The body has already been stripped of frontmatter and validated for size.
 * Metadata (title, url, date) is available for use by the converter and
 * downstream processors (e.g., cover generation).
 *
 * `ids` holds the list of HTML element id values present in the document
 * body, in document order. They are stored as-is (no deduplication) and are
 * populated by the caller — this value object does not parse Markdown.
 *
 * Implements FR-25 (id-attribute preservation).
 */
export class MarkdownDocument {
  private constructor(
    readonly content: MarkdownContent,
    readonly metadata: DocumentMetadata,
    readonly ids: string[],
  ) {}

  /**
   * Constructs a MarkdownDocument from its parts.
   *
   * @param ids - HTML id attributes extracted from the body, in document
   *   order. Pass an empty array when no ids are present. Duplicates are
   *   preserved as-is.
   */
  static fromParts(
    content: MarkdownContent,
    metadata: DocumentMetadata,
    ids: string[] = [],
  ): MarkdownDocument {
    return new MarkdownDocument(content, metadata, ids);
  }
}
