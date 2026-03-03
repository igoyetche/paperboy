import type { Title, Author, MarkdownContent } from "./values/index.js";
import type { ContentConverter, DocumentMailer, DeliveryLogger } from "./ports.js";
import type { DomainError, Result } from "./errors.js";
import { ok, err } from "./errors.js";

export interface DeliverySuccess {
  readonly title: string;
  readonly sizeBytes: number;
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
  ): Promise<Result<DeliverySuccess, DomainError>> {
    this.logger.deliveryAttempt(title.value, "epub");

    const convertResult = await this.converter.toEpub(title, content, author);
    if (!convertResult.ok) {
      this.logger.deliveryFailure(
        title.value,
        convertResult.error.kind,
        convertResult.error.message,
      );
      return convertResult;
    }

    const document = convertResult.value;
    const sendResult = await this.mailer.send(document);
    if (!sendResult.ok) {
      this.logger.deliveryFailure(
        title.value,
        sendResult.error.kind,
        sendResult.error.message,
      );
      return sendResult;
    }

    this.logger.deliverySuccess(title.value, "epub", document.sizeBytes);

    return ok({
      title: title.value,
      sizeBytes: document.sizeBytes,
    });
  }
}
