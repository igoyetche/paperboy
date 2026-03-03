import type { Title, Author, MarkdownContent, EpubDocument } from "./values/index.js";
import type { DeliveryError, ConversionError, Result } from "./errors.js";

export interface ContentConverter {
  toEpub(
    title: Title,
    content: MarkdownContent,
    author: Author,
  ): Promise<Result<EpubDocument, ConversionError>>;
}

export interface DocumentMailer {
  send(document: EpubDocument): Promise<Result<void, DeliveryError>>;
}

export interface DeliveryLogger {
  deliveryAttempt(title: string, format: string): void;
  deliverySuccess(title: string, format: string, sizeBytes: number): void;
  deliveryFailure(title: string, errorKind: string, message: string): void;
}
