import {
  ValidationError,
  SizeLimitError,
  type Result,
  ok,
  err,
} from "../errors.js";

export class MarkdownContent {
  static readonly MAX_BYTES = 25 * 1024 * 1024; // 25 MB

  private constructor(readonly value: string) {}

  static create(
    raw: string,
  ): Result<MarkdownContent, ValidationError | SizeLimitError> {
    if (raw.length === 0) {
      return err(
        new ValidationError(
          "content",
          "The 'content' parameter is required and must be non-empty.",
        ),
      );
    }
    const byteLength = Buffer.byteLength(raw, "utf-8");
    if (byteLength > MarkdownContent.MAX_BYTES) {
      return err(new SizeLimitError(byteLength, MarkdownContent.MAX_BYTES));
    }
    return ok(new MarkdownContent(raw));
  }
}
