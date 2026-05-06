import { describe, it, expect } from "vitest";
import { MarkdownDocument } from "../../../src/domain/values/markdown-document.js";
import { MarkdownContent } from "../../../src/domain/values/markdown-content.js";
import { DocumentMetadata } from "../../../src/domain/values/document-metadata.js";

/** Convenience helper — always succeeds for valid non-empty strings. */
function makeContent(text = "# Hello\n\nBody text."): MarkdownContent {
  const result = MarkdownContent.create(text);
  if (!result.ok) throw new Error("test setup: MarkdownContent.create failed");
  return result.value;
}

const metadata = DocumentMetadata.empty();

describe("MarkdownDocument", () => {
  describe("fromParts — default ids", () => {
    it("exposes content and metadata unchanged", () => {
      const content = makeContent();
      const doc = MarkdownDocument.fromParts(content, metadata);
      expect(doc.content).toBe(content);
      expect(doc.metadata).toBe(metadata);
    });

    it("defaults ids to an empty array when omitted", () => {
      const doc = MarkdownDocument.fromParts(makeContent(), metadata);
      expect(doc.ids).toEqual([]);
    });
  });

  describe("fromParts — explicit empty ids", () => {
    it("returns an empty ids array when passed an empty array", () => {
      const doc = MarkdownDocument.fromParts(makeContent(), metadata, []);
      expect(doc.ids).toEqual([]);
    });
  });

  describe("fromParts — ids from body", () => {
    it("stores ids in the order they were provided", () => {
      const ids = ["page-1", "page-2", "page-3"];
      const doc = MarkdownDocument.fromParts(makeContent(), metadata, ids);
      expect(doc.ids).toEqual(["page-1", "page-2", "page-3"]);
    });

    it("preserves duplicate ids without deduplication", () => {
      const ids = ["section-1", "section-1", "section-2"];
      const doc = MarkdownDocument.fromParts(makeContent(), metadata, ids);
      expect(doc.ids).toEqual(["section-1", "section-1", "section-2"]);
    });

    it("stores all 17 anchor ids from a multi-section document in order", () => {
      const pageIds = Array.from({ length: 17 }, (_, i) => `page-${i + 1}`);
      const doc = MarkdownDocument.fromParts(makeContent(), metadata, pageIds);
      expect(doc.ids).toHaveLength(17);
      expect(doc.ids[0]).toBe("page-1");
      expect(doc.ids[16]).toBe("page-17");
    });
  });
});
