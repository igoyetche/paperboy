import type { Title, Author, MarkdownDocument, EpubDocument, KindleDevice, DocumentMetadata } from "./values/index.js";
import type { DeliveryError, ConversionError, FrontmatterError, Result } from "./errors.js";

export interface ContentConverter {
  toEpub(
    title: Title,
    document: MarkdownDocument,
    author: Author,
  ): Promise<Result<EpubDocument, ConversionError>>;
}

export interface DocumentMailer {
  send(
    document: EpubDocument,
    device: KindleDevice,
  ): Promise<Result<void, DeliveryError>>;
}

export interface DeliveryLogger {
  deliveryAttempt(title: string, format: string, deviceName: string): void;
  deliverySuccess(title: string, format: string, sizeBytes: number, deviceName: string): void;
  deliveryFailure(title: string, errorKind: string, message: string, deviceName: string): void;
}

export interface FrontmatterParser {
  /**
   * Splits a raw markdown string into its frontmatter block and body content.
   *
   * - No frontmatter → ok({ metadata: empty, body: raw })
   * - Well-formed frontmatter → ok({ metadata: parsed, body: content after closing '---' })
   * - Malformed frontmatter → err(FrontmatterError)
   */
  parse(
    raw: string,
  ): Result<{ metadata: DocumentMetadata; body: string }, FrontmatterError>;
}

// Cover flavor system
export interface ThumbnailInput {
  readonly titleLines: readonly string[];
  readonly author: string;
  readonly iconDataUri?: string;
  readonly width: number;
  readonly height: number;
  readonly sourceDomain?: string;
}

export interface ChapterInput {
  readonly title: string;
  readonly author: string;
  readonly sourceDomain?: string;
}

export interface SatoriStyle {
  // Layout
  readonly display?: "flex" | "block" | "none";
  readonly flexDirection?: "row" | "column" | "row-reverse" | "column-reverse";
  readonly justifyContent?:
    | "flex-start"
    | "flex-end"
    | "center"
    | "space-between"
    | "space-around"
    | "space-evenly";
  readonly alignItems?:
    | "flex-start"
    | "flex-end"
    | "center"
    | "stretch"
    | "baseline";
  readonly flexWrap?: "wrap" | "nowrap";
  readonly flex?: number;
  readonly gap?: number;

  // Spacing
  readonly padding?: number | string;
  readonly paddingTop?: number;
  readonly paddingRight?: number;
  readonly paddingBottom?: number;
  readonly paddingLeft?: number;
  readonly margin?: number | string;
  readonly marginTop?: number;
  readonly marginRight?: number;
  readonly marginBottom?: number;
  readonly marginLeft?: number;

  // Sizing
  readonly width?: number | string;
  readonly height?: number | string;
  readonly minWidth?: number;
  readonly minHeight?: number;
  readonly maxWidth?: number;
  readonly maxHeight?: number;

  // Appearance
  readonly backgroundColor?: string;
  readonly color?: string;
  readonly fontSize?: number;
  readonly fontWeight?: number | "normal" | "bold";
  readonly fontStyle?: "normal" | "italic";
  readonly fontFamily?: string;
  readonly lineHeight?: number | string;
  readonly letterSpacing?: number | string;
  readonly textAlign?: "left" | "center" | "right" | "justify";
  readonly textOverflow?: "ellipsis" | "clip";
  readonly whiteSpace?: "pre" | "normal" | "nowrap" | "pre-wrap";
  readonly overflow?: "hidden" | "visible";

  // Border
  readonly border?: string;
  readonly borderRadius?: number | string;
  readonly borderTop?: string;
  readonly borderRight?: string;
  readonly borderBottom?: string;
  readonly borderLeft?: string;

  // Transforms
  readonly transform?: string;
  readonly opacity?: number;

  // Other
  readonly backgroundImage?: string;
  readonly backgroundSize?: string;
  readonly backgroundPosition?: string;
}

export interface SatoriNode {
  readonly type: string;
  readonly props: {
    readonly style?: SatoriStyle;
    readonly children?: SatoriNode | string | readonly (SatoriNode | string)[];
    readonly src?: string;
    readonly width?: number;
    readonly height?: number;
    readonly [key: string]: unknown;
  };
}

export interface CoverFlavor {
  readonly name: string;
  readonly titleWrap?: { readonly maxChars: number; readonly maxLines: number };
  buildThumbnail(input: ThumbnailInput): SatoriNode;
  buildHtmlChapter(input: ChapterInput): string;
  buildCoverCss(): string;
}
