import { describe, it, expect } from "vitest";
import { createEpubWithPredownloadedImages } from "../../../src/infrastructure/converter/epub-with-images.js";

/**
 * Unit tests for EpubWithPredownloadedImages wrapper.
 *
 * The wrapper's downloadAllImages() method overrides the parent EPub.downloadAllImages()
 * to use pre-downloaded image buffers instead of attempting to download from URLs.
 *
 * Detailed functional testing happens at the integration level where we:
 * 1. Process images through ImageProcessor
 * 2. Create EpubWithPredownloadedImages instance
 * 3. Pre-populate images array
 * 4. Generate EPUB and verify structure
 *
 * This test file validates basic instantiation and structure.
 */
describe("EpubWithPredownloadedImages", () => {
  it("exports the factory function", () => {
    // Verify the factory function is exported and can be imported
    expect(createEpubWithPredownloadedImages).toBeDefined();
    expect(typeof createEpubWithPredownloadedImages).toBe("function");
  });

  it("can create instance with basic options", () => {
    // Create instance with minimal required options
    const epub = createEpubWithPredownloadedImages(
      {
        title: "Test Book",
      },
      [{ title: "Chapter 1", content: "<h1>Test</h1>" }],
    );

    // Should exist and have basic structure
    expect(epub).toBeDefined();
    expect(epub).not.toBeNull();
  });

  it("accepts author, description, and version options", () => {
    // Create instance with extended options
    const epub = createEpubWithPredownloadedImages(
      {
        title: "Test Book",
        author: "Test Author",
        description: "Test Description",
        version: 3,
      },
      [{ title: "Chapter 1", content: "<h1>Test</h1><p>Content</p>" }],
    );

    expect(epub).toBeDefined();
  });

  it("handles multiple chapters", () => {
    const epub = createEpubWithPredownloadedImages(
      {
        title: "Multi-Chapter Book",
      },
      [
        { title: "Chapter 1", content: "<h1>Chapter 1</h1>" },
        { title: "Chapter 2", content: "<h1>Chapter 2</h1>" },
        { title: "Chapter 3", content: "<h1>Chapter 3</h1>" },
      ],
    );

    expect(epub).toBeDefined();
  });
});
