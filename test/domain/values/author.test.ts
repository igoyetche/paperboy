import { describe, it, expect } from "vitest";
import { Author } from "../../../src/domain/values/author.js";

describe("Author", () => {
  it("creates an author from a valid string", () => {
    const result = Author.create("Claude");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.value).toBe("Claude");
    }
  });

  it("trims whitespace", () => {
    const result = Author.create("  Claude  ");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.value).toBe("Claude");
    }
  });

  it("rejects empty string", () => {
    const result = Author.create("");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("validation");
      expect(result.error.field).toBe("author");
    }
  });

  it("rejects whitespace-only string", () => {
    const result = Author.create("   ");
    expect(result.ok).toBe(false);
  });
});
