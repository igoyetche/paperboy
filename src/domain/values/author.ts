import { ValidationError, type Result, ok, err } from "../errors.js";

export class Author {
  private constructor(readonly value: string) {}

  static create(raw: string): Result<Author, ValidationError> {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      return err(
        new ValidationError("author", "Author must be non-empty."),
      );
    }
    return ok(new Author(trimmed));
  }
}
