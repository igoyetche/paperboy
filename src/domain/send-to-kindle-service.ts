import type { Title, Author, MarkdownContent, KindleDevice } from "./values/index.js";
import type { ContentConverter, DocumentMailer, DeliveryLogger } from "./ports.js";
import type { DomainError, Result } from "./errors.js";
import { ok } from "./errors.js";

/** Implements FR-3: Orchestrate convert-then-deliver pipeline with device routing */
export interface DeliverySuccess {
  readonly title: string;
  readonly sizeBytes: number;
  readonly deviceName: string;
}

export class SendToKindleService {
  constructor(
    private readonly converter: ContentConverter,
    private readonly mailer: DocumentMailer,
    private readonly logger: DeliveryLogger,
  ) {}

  async execute(
    title: Title,
    content: MarkdownContent,
    author: Author,
    device: KindleDevice,
  ): Promise<Result<DeliverySuccess, DomainError>> {
    this.logger.deliveryAttempt(title.value, "epub", device.name);

    const convertResult = await this.converter.toEpub(title, content, author);
    if (!convertResult.ok) {
      this.logger.deliveryFailure(
        title.value,
        convertResult.error.kind,
        convertResult.error.message,
        device.name,
      );
      return convertResult;
    }

    const document = convertResult.value;
    const sendResult = await this.mailer.send(document, device);
    if (!sendResult.ok) {
      this.logger.deliveryFailure(
        title.value,
        sendResult.error.kind,
        sendResult.error.message,
        device.name,
      );
      return sendResult;
    }

    this.logger.deliverySuccess(title.value, "epub", document.sizeBytes, device.name);

    return ok({
      title: title.value,
      sizeBytes: document.sizeBytes,
      deviceName: device.name,
    });
  }
}
