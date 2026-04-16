import type { Title, Author, MarkdownDocument, EpubDocument, KindleDevice, ImageStats } from "./values/index.js";
import type { ContentConverter, DocumentMailer, DeliveryLogger } from "./ports.js";
import type { DomainError, Result } from "./errors.js";
import { ok } from "./errors.js";

/** Implements FR-3: Orchestrate convert-then-deliver pipeline with device routing */
export interface DeliverySuccess {
  readonly title: string;
  readonly sizeBytes: number;
  readonly deviceName: string;
  readonly imageStats?: ImageStats;
}

export class SendToKindleService {
  constructor(
    private readonly converter: ContentConverter,
    private readonly mailer: DocumentMailer,
    private readonly logger: DeliveryLogger,
  ) {}

  async execute(
    title: Title,
    document: MarkdownDocument,
    author: Author,
    device: KindleDevice,
  ): Promise<Result<DeliverySuccess, DomainError>> {
    this.logger.deliveryAttempt(title.value, "epub", device.name);

    const convertResult = await this.converter.toEpub(title, document, author);
    if (!convertResult.ok) {
      this.logger.deliveryFailure(
        title.value,
        convertResult.error.kind,
        convertResult.error.message,
        device.name,
      );
      return convertResult;
    }

    const epubDocument = convertResult.value;
    const sendResult = await this.mailer.send(epubDocument, device);
    if (!sendResult.ok) {
      this.logger.deliveryFailure(
        title.value,
        sendResult.error.kind,
        sendResult.error.message,
        device.name,
      );
      return sendResult;
    }

    this.logger.deliverySuccess(title.value, "epub", epubDocument.sizeBytes, device.name);

    return ok({
      title: title.value,
      sizeBytes: epubDocument.sizeBytes,
      deviceName: device.name,
      imageStats: epubDocument.imageStats,
    });
  }

  /**
   * Sends a pre-built EPUB document directly to the mailer, bypassing conversion.
   *
   * Implements PB-012: EPUB passthrough for CLI and watcher entry points.
   */
  async sendEpub(
    epub: EpubDocument,
    device: KindleDevice,
  ): Promise<Result<DeliverySuccess, DomainError>> {
    this.logger.deliveryAttempt(epub.title, "epub", device.name);

    const sendResult = await this.mailer.send(epub, device);
    if (!sendResult.ok) {
      this.logger.deliveryFailure(
        epub.title,
        sendResult.error.kind,
        sendResult.error.message,
        device.name,
      );
      return sendResult;
    }

    this.logger.deliverySuccess(epub.title, "epub", epub.sizeBytes, device.name);

    return ok({
      title: epub.title,
      sizeBytes: epub.sizeBytes,
      deviceName: device.name,
    });
  }
}
