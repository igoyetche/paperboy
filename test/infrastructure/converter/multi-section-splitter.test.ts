/**
 * Unit tests for multi-section-splitter.ts (PB-025, FR-25)
 *
 * Covers: parseTocManifest, isMultiSection, splitIntoChapters
 */

import { describe, it, expect } from "vitest";
import {
  parseTocManifest,
  isMultiSection,
  splitIntoChapters,
} from "../../../src/infrastructure/converter/multi-section-splitter.js";

// ---------------------------------------------------------------------------
// parseTocManifest
// ---------------------------------------------------------------------------

describe("parseTocManifest", () => {
  it("returns empty array for empty string", () => {
    expect(parseTocManifest("")).toEqual([]);
  });

  it("returns empty array for Markdown with no TOC links", () => {
    const md = "# Title\n\nSome paragraph text. No TOC links here.\n\n## Section";
    expect(parseTocManifest(md)).toEqual([]);
  });

  it("extracts a single TOC link", () => {
    const md = "- [Chapter One](#chapter-one)\n\n# Chapter One\n\nContent.";
    expect(parseTocManifest(md)).toEqual([
      { title: "Chapter One", anchorId: "chapter-one" },
    ]);
  });

  it("extracts multiple TOC links in document order", () => {
    const md = [
      "- [Introduction](#intro)",
      "- [The Problem](#problem)",
      "- [The Solution](#solution)",
    ].join("\n");
    expect(parseTocManifest(md)).toEqual([
      { title: "Introduction", anchorId: "intro" },
      { title: "The Problem", anchorId: "problem" },
      { title: "The Solution", anchorId: "solution" },
    ]);
  });

  it("handles TOC links with complex anchor ids containing hyphens and numbers", () => {
    const md = "- [Section 1](#page-1)\n- [Section 2](#page-2)";
    expect(parseTocManifest(md)).toEqual([
      { title: "Section 1", anchorId: "page-1" },
      { title: "Section 2", anchorId: "page-2" },
    ]);
  });

  it("does not extract non-fragment links (external URLs)", () => {
    const md = "- [External](https://example.com)\n- [Internal](#anchor-1)";
    expect(parseTocManifest(md)).toEqual([
      { title: "Internal", anchorId: "anchor-1" },
    ]);
  });

  it("extracts all 17 entries from a real-world multi-section sample structure", () => {
    const md = [
      "- [Agentic Engineering Patterns](#page-1)",
      "- [What is agentic engineering?](#page-2)",
      "- [Writing code is cheap now](#page-3)",
      "- [Hoard things you know how to do](#page-4)",
      "- [AI should help us produce better code](#page-5)",
      "- [Anti-patterns: things to avoid](#page-6)",
      "- [How coding agents work](#page-7)",
      "- [Using Git with coding agents](#page-8)",
      "- [Subagents](#page-9)",
      "- [Red/green TDD](#page-10)",
      "- [First run the tests](#page-11)",
      "- [Agentic manual testing](#page-12)",
      "- [Linear walkthroughs](#page-13)",
      "- [Interactive explanations](#page-14)",
      "- [GIF optimization tool using WebAssembly and Gifsicle](#page-15)",
      "- [Adding a new content type to my blog-to-newsletter tool](#page-16)",
      "- [Prompts I use](#page-17)",
    ].join("\n");
    const result = parseTocManifest(md);
    expect(result).toHaveLength(17);
    expect(result[0]).toEqual({ title: "Agentic Engineering Patterns", anchorId: "page-1" });
    expect(result[16]).toEqual({ title: "Prompts I use", anchorId: "page-17" });
  });
});

// ---------------------------------------------------------------------------
// isMultiSection
// ---------------------------------------------------------------------------

describe("isMultiSection", () => {
  it("returns false for empty TOC", () => {
    expect(isMultiSection([])).toBe(false);
  });

  it("returns false for a single-entry TOC", () => {
    expect(isMultiSection([{ title: "Only", anchorId: "only" }])).toBe(false);
  });

  it("returns true for exactly two entries", () => {
    expect(
      isMultiSection([
        { title: "One", anchorId: "one" },
        { title: "Two", anchorId: "two" },
      ]),
    ).toBe(true);
  });

  it("returns true for more than two entries", () => {
    const toc = [
      { title: "A", anchorId: "a" },
      { title: "B", anchorId: "b" },
      { title: "C", anchorId: "c" },
    ];
    expect(isMultiSection(toc)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// splitIntoChapters
// ---------------------------------------------------------------------------

describe("splitIntoChapters", () => {
  // Helper to build a minimal HTML fragment with an <hr> front-matter block
  // and anchor+H1 chapter boundaries, matching the output marked would produce.
  function buildHtml(sections: Array<{ id: string; h1: string; body: string }>): string {
    const front = "<p>Table of contents paragraph.</p>\n<hr>";
    const chapters = sections
      .map(
        (s) =>
          `\n<a id="${s.id}"></a>\n<h1>${s.h1}</h1>\n<p>${s.body}</p>`,
      )
      .join("\n");
    return front + chapters;
  }

  it("splits two chapters correctly", () => {
    const manifest = [
      { title: "Chapter One", anchorId: "ch-1" },
      { title: "Chapter Two", anchorId: "ch-2" },
    ];
    const html = buildHtml([
      { id: "ch-1", h1: "Chapter One", body: "Body of chapter one." },
      { id: "ch-2", h1: "Chapter Two", body: "Body of chapter two." },
    ]);

    const { chapters, warnings } = splitIntoChapters(html, manifest);

    expect(warnings).toHaveLength(0);
    expect(chapters).toHaveLength(2);

    expect(chapters[0]?.title).toBe("Chapter One");
    expect(chapters[0]?.anchorId).toBe("ch-1");
    expect(chapters[0]?.html).toContain('id="ch-1"');
    expect(chapters[0]?.html).toContain("Body of chapter one.");
    // H1 tag should be stripped
    expect(chapters[0]?.html).not.toContain("<h1>");

    expect(chapters[1]?.title).toBe("Chapter Two");
    expect(chapters[1]?.anchorId).toBe("ch-2");
    expect(chapters[1]?.html).toContain('id="ch-2"');
    expect(chapters[1]?.html).toContain("Body of chapter two.");
    expect(chapters[1]?.html).not.toContain("<h1>");
  });

  it("splits three chapters correctly", () => {
    const manifest = [
      { title: "Alpha", anchorId: "alpha" },
      { title: "Beta", anchorId: "beta" },
      { title: "Gamma", anchorId: "gamma" },
    ];
    const html = buildHtml([
      { id: "alpha", h1: "Alpha", body: "Alpha content." },
      { id: "beta", h1: "Beta", body: "Beta content." },
      { id: "gamma", h1: "Gamma", body: "Gamma content." },
    ]);

    const { chapters, warnings } = splitIntoChapters(html, manifest);

    expect(warnings).toHaveLength(0);
    expect(chapters).toHaveLength(3);
    expect(chapters.map((c) => c.title)).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  it("preserves trailing content after last heading", () => {
    const manifest = [
      { title: "Ch1", anchorId: "c1" },
      { title: "Ch2", anchorId: "c2" },
    ];
    const html =
      "<hr>\n<a id=\"c1\"></a>\n<h1>Ch1</h1>\n<p>C1 body.</p>\n<a id=\"c2\"></a>\n<h1>Ch2</h1>\n<p>C2 body.</p>\n<p>Trailing paragraph after last heading.</p>";

    const { chapters } = splitIntoChapters(html, manifest);

    expect(chapters).toHaveLength(2);
    expect(chapters[1]?.html).toContain("Trailing paragraph after last heading.");
  });

  it("handles a chapter with no body content (empty section)", () => {
    const manifest = [
      { title: "Empty Chapter", anchorId: "empty" },
      { title: "Full Chapter", anchorId: "full" },
    ];
    const html =
      "<hr>\n<a id=\"empty\"></a>\n<h1>Empty Chapter</h1>\n<a id=\"full\"></a>\n<h1>Full Chapter</h1>\n<p>Content here.</p>";

    const { chapters, warnings } = splitIntoChapters(html, manifest);

    expect(warnings).toHaveLength(0);
    expect(chapters).toHaveLength(2);
    // Empty chapter should still carry the anchor tag
    expect(chapters[0]?.html).toContain('id="empty"');
    expect(chapters[0]?.html).not.toContain("<p>");
  });

  it("drops content before the first <hr> (front-matter)", () => {
    const manifest = [{ title: "Main", anchorId: "main" }];
    const html =
      "<p>TOC paragraph here.</p>\n<hr>\n<a id=\"main\"></a>\n<h1>Main</h1>\n<p>Actual content.</p>";

    const { chapters } = splitIntoChapters(html, manifest);

    expect(chapters).toHaveLength(1);
    expect(chapters[0]?.html).not.toContain("TOC paragraph here.");
    expect(chapters[0]?.html).toContain("Actual content.");
  });

  it("uses H1 text as fallback title when anchor not in manifest", () => {
    const manifest = [{ title: "Known Chapter", anchorId: "known" }];
    const html =
      "<hr>\n<a id=\"known\"></a>\n<h1>Known Chapter</h1>\n<p>Body.</p>\n<a id=\"unknown\"></a>\n<h1>Unlisted Chapter</h1>\n<p>More.</p>";

    const { chapters, warnings } = splitIntoChapters(html, manifest);

    expect(chapters).toHaveLength(2);
    expect(chapters[1]?.title).toBe("Unlisted Chapter");
    // Should emit a warning for the unrecognised anchor
    expect(warnings.some((w) => w.includes('"unknown"'))).toBe(true);
  });

  it("emits warnings for manifest entries not found in HTML", () => {
    const manifest = [
      { title: "Present", anchorId: "present" },
      { title: "Missing Section", anchorId: "missing" },
    ];
    const html =
      "<hr>\n<a id=\"present\"></a>\n<h1>Present</h1>\n<p>Content.</p>";

    const { warnings } = splitIntoChapters(html, manifest);

    expect(warnings.some((w) => w.includes("Missing Section"))).toBe(true);
    expect(warnings.some((w) => w.includes("#missing"))).toBe(true);
  });

  it("uses manifest titles from the TOC, not the H1 text", () => {
    // The manifest title takes precedence over the H1 element text.
    const manifest = [
      { title: "Manifest Title", anchorId: "sec-1" },
    ];
    const html =
      "<hr>\n<a id=\"sec-1\"></a>\n<h1>H1 Title</h1>\n<p>Body.</p>";

    const { chapters } = splitIntoChapters(html, manifest);

    expect(chapters[0]?.title).toBe("Manifest Title");
  });

  it("handles HTML without any <hr> (no front-matter drop)", () => {
    const manifest = [
      { title: "Sec A", anchorId: "sec-a" },
      { title: "Sec B", anchorId: "sec-b" },
    ];
    // No <hr> — body starts immediately with anchor tags
    const html =
      "<a id=\"sec-a\"></a>\n<h1>Sec A</h1>\n<p>A body.</p>\n<a id=\"sec-b\"></a>\n<h1>Sec B</h1>\n<p>B body.</p>";

    const { chapters, warnings } = splitIntoChapters(html, manifest);

    expect(warnings).toHaveLength(0);
    expect(chapters).toHaveLength(2);
    expect(chapters[0]?.title).toBe("Sec A");
    expect(chapters[1]?.title).toBe("Sec B");
  });
});
