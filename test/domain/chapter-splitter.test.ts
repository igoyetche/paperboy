import { describe, it, expect } from "vitest";
import { splitIntoChapters } from "../../src/domain/chapter-splitter.js";
import type { ChapterSlice } from "../../src/domain/chapter-splitter.js";
import type { TocEntry } from "../../src/domain/toc-parser.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toc(...entries: Array<{ tag: string; text: string; id: string }>): TocEntry[] {
  return entries;
}

// ---------------------------------------------------------------------------
// Empty / trivial cases
// ---------------------------------------------------------------------------

describe("splitIntoChapters — empty / trivial cases", () => {
  it("returns an empty array when toc is empty", () => {
    expect(splitIntoChapters("<h1>Hello</h1>", [])).toEqual([]);
  });

  it("returns an empty array when html is empty and toc is non-empty", () => {
    const tocEntries = toc({ tag: "h1", text: "Chapter One", id: "ch1" });
    expect(splitIntoChapters("", tocEntries)).toEqual([]);
  });

  it("returns an empty array when no headings in html match the toc entries", () => {
    const html = "<p>No headings here at all.</p>";
    const tocEntries = toc({ tag: "h1", text: "Missing Chapter", id: "missing" });
    expect(splitIntoChapters(html, tocEntries)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Two chapters
// ---------------------------------------------------------------------------

describe("splitIntoChapters — two chapters", () => {
  it("splits two chapters with bodies — each slice has correct title and content", () => {
    const html = [
      '<h1 id="ch1">Chapter One</h1>',
      "<p>Body of chapter one.</p>",
      '<h1 id="ch2">Chapter Two</h1>',
      "<p>Body of chapter two.</p>",
    ].join("\n");

    const tocEntries = toc(
      { tag: "h1", text: "Chapter One", id: "ch1" },
      { tag: "h1", text: "Chapter Two", id: "ch2" },
    );

    const result = splitIntoChapters(html, tocEntries);

    expect(result).toHaveLength(2);

    const [first, second] = result as [ChapterSlice, ChapterSlice];

    expect(first.title).toBe("Chapter One");
    expect(first.html).toContain('<h1 id="ch1">Chapter One</h1>');
    expect(first.html).toContain("Body of chapter one.");
    expect(first.html).not.toContain("Chapter Two");

    expect(second.title).toBe("Chapter Two");
    expect(second.html).toContain('<h1 id="ch2">Chapter Two</h1>');
    expect(second.html).toContain("Body of chapter two.");
    expect(second.html).not.toContain("Chapter One");
  });

  it("chapter boundary is exclusive — first chapter does not include second heading", () => {
    const html =
      '<h2 id="a">Alpha</h2><p>Alpha content</p><h2 id="b">Beta</h2><p>Beta content</p>';

    const tocEntries = toc(
      { tag: "h2", text: "Alpha", id: "a" },
      { tag: "h2", text: "Beta", id: "b" },
    );

    const result = splitIntoChapters(html, tocEntries);

    expect(result).toHaveLength(2);
    expect(result[0]?.html).not.toContain('<h2 id="b">');
    expect(result[1]?.html).not.toContain('<h2 id="a">');
  });

  it("titles come from toc entry text, not from raw HTML", () => {
    const html =
      '<h1 id="s1">Section <em>One</em></h1><p>A</p><h1 id="s2">Section Two</h1><p>B</p>';

    const tocEntries = toc(
      { tag: "h1", text: "Section One", id: "s1" },
      { tag: "h1", text: "Section Two", id: "s2" },
    );

    const result = splitIntoChapters(html, tocEntries);

    // title uses the plain-text value stored in the TocEntry, not the raw HTML
    expect(result[0]?.title).toBe("Section One");
    expect(result[1]?.title).toBe("Section Two");
  });
});

// ---------------------------------------------------------------------------
// Three chapters
// ---------------------------------------------------------------------------

describe("splitIntoChapters — three chapters", () => {
  it("splits three chapters with correct ordering and boundaries", () => {
    const html = [
      '<h1 id="p1">Part One</h1>',
      "<p>Content of part one.</p>",
      "<p>More content of part one.</p>",
      '<h1 id="p2">Part Two</h1>',
      "<p>Content of part two.</p>",
      '<h1 id="p3">Part Three</h1>',
      "<p>Content of part three.</p>",
    ].join("\n");

    const tocEntries = toc(
      { tag: "h1", text: "Part One", id: "p1" },
      { tag: "h1", text: "Part Two", id: "p2" },
      { tag: "h1", text: "Part Three", id: "p3" },
    );

    const result = splitIntoChapters(html, tocEntries);

    expect(result).toHaveLength(3);
    expect(result[0]?.title).toBe("Part One");
    expect(result[1]?.title).toBe("Part Two");
    expect(result[2]?.title).toBe("Part Three");

    // Each chapter contains its own content
    expect(result[0]?.html).toContain("Content of part one.");
    expect(result[0]?.html).toContain("More content of part one.");
    expect(result[1]?.html).toContain("Content of part two.");
    expect(result[2]?.html).toContain("Content of part three.");

    // Cross-contamination check
    expect(result[0]?.html).not.toContain("Part Two");
    expect(result[1]?.html).not.toContain("Part One");
    expect(result[1]?.html).not.toContain("Part Three");
    expect(result[2]?.html).not.toContain("Part One");
    expect(result[2]?.html).not.toContain("Part Two");
  });

  it("preserves document order with three h2 chapters", () => {
    const html =
      '<h2 id="z">Zeta</h2><p>Z</p><h2 id="a">Alpha</h2><p>A</p><h2 id="m">Mu</h2><p>M</p>';

    const tocEntries = toc(
      { tag: "h2", text: "Zeta", id: "z" },
      { tag: "h2", text: "Alpha", id: "a" },
      { tag: "h2", text: "Mu", id: "m" },
    );

    const result = splitIntoChapters(html, tocEntries);

    expect(result).toHaveLength(3);
    expect(result[0]?.title).toBe("Zeta");
    expect(result[1]?.title).toBe("Alpha");
    expect(result[2]?.title).toBe("Mu");
  });
});

// ---------------------------------------------------------------------------
// Trailing content after last chapter
// ---------------------------------------------------------------------------

describe("splitIntoChapters — trailing content", () => {
  it("includes trailing content after the last heading in the last chapter", () => {
    const html = [
      '<h1 id="ch1">Chapter One</h1>',
      "<p>Chapter one body.</p>",
      '<h1 id="ch2">Chapter Two</h1>',
      "<p>Chapter two body.</p>",
      "<p>Trailing paragraph after last heading.</p>",
      "<p>Another trailing paragraph.</p>",
    ].join("\n");

    const tocEntries = toc(
      { tag: "h1", text: "Chapter One", id: "ch1" },
      { tag: "h1", text: "Chapter Two", id: "ch2" },
    );

    const result = splitIntoChapters(html, tocEntries);

    expect(result).toHaveLength(2);
    expect(result[1]?.html).toContain("Trailing paragraph after last heading.");
    expect(result[1]?.html).toContain("Another trailing paragraph.");
  });

  it("single chapter — entire html from the heading to end is returned", () => {
    const html =
      '<h1 id="only">Only Chapter</h1><p>All the content goes here.</p><p>More content.</p>';

    const tocEntries = toc({ tag: "h1", text: "Only Chapter", id: "only" });

    const result = splitIntoChapters(html, tocEntries);

    expect(result).toHaveLength(1);
    expect(result[0]?.html).toContain('<h1 id="only">Only Chapter</h1>');
    expect(result[0]?.html).toContain("All the content goes here.");
    expect(result[0]?.html).toContain("More content.");
  });

  it("content before the first heading is excluded from all slices", () => {
    const html = [
      "<p>Preamble paragraph before any heading.</p>",
      '<h1 id="ch1">Chapter One</h1>',
      "<p>Chapter content.</p>",
    ].join("\n");

    const tocEntries = toc({ tag: "h1", text: "Chapter One", id: "ch1" });

    const result = splitIntoChapters(html, tocEntries);

    expect(result).toHaveLength(1);
    expect(result[0]?.html).not.toContain("Preamble paragraph");
    expect(result[0]?.html).toContain("Chapter content.");
  });
});

// ---------------------------------------------------------------------------
// Empty chapter body (heading immediately followed by next heading)
// ---------------------------------------------------------------------------

describe("splitIntoChapters — empty chapter body", () => {
  it("returns an empty html string body for a chapter with no content", () => {
    const html =
      '<h1 id="ch1">Chapter One</h1><h1 id="ch2">Chapter Two</h1><p>Content.</p>';

    const tocEntries = toc(
      { tag: "h1", text: "Chapter One", id: "ch1" },
      { tag: "h1", text: "Chapter Two", id: "ch2" },
    );

    const result = splitIntoChapters(html, tocEntries);

    expect(result).toHaveLength(2);

    // Chapter One has no body — its html is just the heading tag itself
    expect(result[0]?.title).toBe("Chapter One");
    expect(result[0]?.html).toBe('<h1 id="ch1">Chapter One</h1>');

    // Chapter Two has the content
    expect(result[1]?.html).toContain("Content.");
  });

  it("handles all chapters with no body content", () => {
    const html =
      '<h2 id="a">Alpha</h2><h2 id="b">Beta</h2><h2 id="c">Gamma</h2>';

    const tocEntries = toc(
      { tag: "h2", text: "Alpha", id: "a" },
      { tag: "h2", text: "Beta", id: "b" },
      { tag: "h2", text: "Gamma", id: "c" },
    );

    const result = splitIntoChapters(html, tocEntries);

    expect(result).toHaveLength(3);
    expect(result[0]?.html).toBe('<h2 id="a">Alpha</h2>');
    expect(result[1]?.html).toBe('<h2 id="b">Beta</h2>');
    expect(result[2]?.html).toBe('<h2 id="c">Gamma</h2>');
  });
});

// ---------------------------------------------------------------------------
// Headings without id attribute
// ---------------------------------------------------------------------------

describe("splitIntoChapters — headings without id", () => {
  it("splits chapters identified by tag and text when no id is present", () => {
    const html = "<h2>First Section</h2><p>Body A.</p><h2>Second Section</h2><p>Body B.</p>";

    const tocEntries = toc(
      { tag: "h2", text: "First Section", id: "" },
      { tag: "h2", text: "Second Section", id: "" },
    );

    const result = splitIntoChapters(html, tocEntries);

    expect(result).toHaveLength(2);
    expect(result[0]?.title).toBe("First Section");
    expect(result[0]?.html).toContain("Body A.");
    expect(result[1]?.title).toBe("Second Section");
    expect(result[1]?.html).toContain("Body B.");
  });
});

// ---------------------------------------------------------------------------
// Mixed: some toc entries not found in html
// ---------------------------------------------------------------------------

describe("splitIntoChapters — missing entries", () => {
  it("skips toc entries whose heading is not found, still returns the rest", () => {
    const html = '<h1 id="present">Present Chapter</h1><p>Some content.</p>';

    const tocEntries = toc(
      { tag: "h1", text: "Present Chapter", id: "present" },
      { tag: "h1", text: "Missing Chapter", id: "notinhtml" },
    );

    const result = splitIntoChapters(html, tocEntries);

    // Only the found entry should appear in output
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("Present Chapter");
  });
});

// ---------------------------------------------------------------------------
// Realistic multi-section HTML (integration-style)
// ---------------------------------------------------------------------------

describe("splitIntoChapters — realistic HTML", () => {
  it("correctly splits a realistic multi-section document", () => {
    const html = `<h1 id="introduction">Introduction</h1>
<p>Welcome to this document. Here is some introductory text.</p>
<ul><li>Point one</li><li>Point two</li></ul>
<h1 id="background">Background</h1>
<p>Some background information on the topic.</p>
<h2 id="history">History</h2>
<p>Historical context here.</p>
<h1 id="conclusion">Conclusion</h1>
<p>Wrapping up the document.</p>`;

    // TOC uses only h1 entries (as parseTocManifest would return)
    const tocEntries = toc(
      { tag: "h1", text: "Introduction", id: "introduction" },
      { tag: "h1", text: "Background", id: "background" },
      { tag: "h1", text: "Conclusion", id: "conclusion" },
    );

    const result = splitIntoChapters(html, tocEntries);

    expect(result).toHaveLength(3);

    expect(result[0]?.title).toBe("Introduction");
    expect(result[0]?.html).toContain("Welcome to this document");
    expect(result[0]?.html).toContain("Point one");
    // h2 sub-section belongs to Background chapter, not Introduction
    expect(result[0]?.html).not.toContain("Background");

    expect(result[1]?.title).toBe("Background");
    expect(result[1]?.html).toContain("Some background information");
    // Sub-heading h2 is inside Background chapter
    expect(result[1]?.html).toContain("History");
    expect(result[1]?.html).not.toContain("Conclusion");

    expect(result[2]?.title).toBe("Conclusion");
    expect(result[2]?.html).toContain("Wrapping up the document.");
  });
});
