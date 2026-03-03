import { describe, it, expect } from "vitest";
import { MarkdownContent } from "../../../src/domain/values/markdown-content.js";

describe("MarkdownContent", () => {
  it("creates content from a valid string", () => {
    const result = MarkdownContent.create("# Hello World");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.value).toBe("# Hello World");
    }
  });

  it("rejects empty string", () => {
    const result = MarkdownContent.create("");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("validation");
      expect(result.error.field).toBe("content");
    }
  });

  it("rejects content exceeding 25 MB", () => {
    const oversized = "x".repeat(25 * 1024 * 1024 + 1);
    const result = MarkdownContent.create(oversized);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("size_limit");
    }
  });

  it("accepts content exactly at 25 MB", () => {
    // Single-byte characters, so length === byte length
    const exact = "x".repeat(25 * 1024 * 1024);
    const result = MarkdownContent.create(exact);
    expect(result.ok).toBe(true);
  });
});
