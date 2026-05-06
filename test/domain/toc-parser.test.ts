import { describe, it, expect } from "vitest";
import { parseTocManifest, isMultiSection } from "../../src/domain/toc-parser.js";
import type { TocEntry } from "../../src/domain/toc-parser.js";

// ---------------------------------------------------------------------------
// parseTocManifest
// ---------------------------------------------------------------------------

describe("parseTocManifest", () => {
  // ------------------------------------------------------------------
  // Empty / no-heading cases
  // ------------------------------------------------------------------

  it("returns an empty array for empty HTML", () => {
    expect(parseTocManifest("")).toEqual([]);
  });

  it("returns an empty array for whitespace-only HTML", () => {
    expect(parseTocManifest("   \n  ")).toEqual([]);
  });

  it("returns an empty array when there are no heading elements", () => {
    expect(parseTocManifest("<p>Just a paragraph</p>")).toEqual([]);
  });

  // ------------------------------------------------------------------
  // Single heading
  // ------------------------------------------------------------------

  it("returns one entry for a single h2 heading without id", () => {
    const result = parseTocManifest("<h2>Section 1</h2>");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ tag: "h2", text: "Section 1", id: "" });
  });

  it("returns one entry for a single h1 with an id attribute", () => {
    const result = parseTocManifest('<h1 id="intro">Introduction</h1>');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ tag: "h1", text: "Introduction", id: "intro" });
  });

  it("returns one entry for a heading whose inner HTML contains markup", () => {
    const result = parseTocManifest('<h2 id="s1"><em>Bold</em> Section</h2>');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ tag: "h2", text: "Bold Section", id: "s1" });
  });

  // ------------------------------------------------------------------
  // Multiple headings at the same level
  // ------------------------------------------------------------------

  it("returns N entries for N headings at the same level (h2)", () => {
    const html = [
      '<h2 id="s1">Section One</h2><p>Content</p>',
      '<h2 id="s2">Section Two</h2><p>Content</p>',
      '<h2 id="s3">Section Three</h2><p>Content</p>',
    ].join("\n");

    const result = parseTocManifest(html);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ tag: "h2", text: "Section One", id: "s1" });
    expect(result[1]).toEqual({ tag: "h2", text: "Section Two", id: "s2" });
    expect(result[2]).toEqual({ tag: "h2", text: "Section Three", id: "s3" });
  });

  it("returns N entries for N h1 headings", () => {
    const html =
      '<h1 id="a">Alpha</h1><h1 id="b">Beta</h1><h1 id="c">Gamma</h1>';
    const result = parseTocManifest(html);
    expect(result).toHaveLength(3);
    expect(result.map((e) => e.text)).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  it("preserves document order of headings", () => {
    const html = '<h2 id="z">Zeta</h2><h2 id="a">Alpha</h2>';
    const result = parseTocManifest(html);
    expect(result[0]?.text).toBe("Zeta");
    expect(result[1]?.text).toBe("Alpha");
  });

  // ------------------------------------------------------------------
  // Mixed heading levels — only top-level (minimum) entries returned
  // ------------------------------------------------------------------

  it("returns only h1 entries when h1 and h2 are mixed", () => {
    const html = [
      '<h1 id="ch1">Chapter One</h1>',
      '<h2 id="s1">Sub-section 1.1</h2>',
      '<h2 id="s2">Sub-section 1.2</h2>',
      '<h1 id="ch2">Chapter Two</h1>',
      '<h2 id="s3">Sub-section 2.1</h2>',
    ].join("\n");

    const result = parseTocManifest(html);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ tag: "h1", text: "Chapter One", id: "ch1" });
    expect(result[1]).toEqual({ tag: "h1", text: "Chapter Two", id: "ch2" });
  });

  it("returns only h2 entries when h2 and h3 are mixed (no h1 present)", () => {
    const html = [
      '<h2 id="top1">Top One</h2>',
      '<h3 id="sub1">Sub One</h3>',
      '<h2 id="top2">Top Two</h2>',
      '<h3 id="sub2">Sub Two</h3>',
    ].join("\n");

    const result = parseTocManifest(html);
    expect(result).toHaveLength(2);
    expect(result[0]?.tag).toBe("h2");
    expect(result[1]?.tag).toBe("h2");
  });

  it("handles h1 + h2 + h3 — returns only h1 entries", () => {
    const html = [
      '<h1 id="p1">Part One</h1>',
      '<h2 id="c1">Chapter One</h2>',
      '<h3 id="s1">Section One</h3>',
      '<h1 id="p2">Part Two</h1>',
    ].join("\n");

    const result = parseTocManifest(html);
    expect(result).toHaveLength(2);
    expect(result.every((e) => e.tag === "h1")).toBe(true);
  });

  // ------------------------------------------------------------------
  // id extraction edge cases
  // ------------------------------------------------------------------

  it("returns empty string for id when heading has no id attribute", () => {
    const result = parseTocManifest("<h2>No Id Here</h2>");
    expect(result[0]?.id).toBe("");
  });

  it("extracts id correctly when other attributes precede id", () => {
    const result = parseTocManifest('<h3 class="foo" id="bar">Heading</h3>');
    expect(result[0]?.id).toBe("bar");
  });

  it("extracts id correctly when id attribute comes first", () => {
    const result = parseTocManifest('<h2 id="first" class="foo">Heading</h2>');
    expect(result[0]?.id).toBe("first");
  });

  // ------------------------------------------------------------------
  // Realistic sanitized-HTML input
  // ------------------------------------------------------------------

  it("handles a realistic multi-section HTML fragment", () => {
    const html = `
<h1 id="introduction">Introduction</h1>
<p>Welcome to the document.</p>
<h1 id="background">Background</h1>
<p>Some background information.</p>
<h2 id="history">History</h2>
<p>Historical context here.</p>
<h1 id="conclusion">Conclusion</h1>
<p>Wrapping up.</p>
`.trim();

    const result = parseTocManifest(html);
    expect(result).toHaveLength(3);
    expect(result.map((e) => e.id)).toEqual(["introduction", "background", "conclusion"]);
    expect(result.map((e) => e.tag)).toEqual(["h1", "h1", "h1"]);
  });
});

// ---------------------------------------------------------------------------
// isMultiSection
// ---------------------------------------------------------------------------

describe("isMultiSection", () => {
  it("returns false for an empty TOC", () => {
    expect(isMultiSection([])).toBe(false);
  });

  it("returns false for a single-entry TOC", () => {
    const toc: TocEntry[] = [{ tag: "h1", text: "Only One", id: "only" }];
    expect(isMultiSection(toc)).toBe(false);
  });

  it("returns true for a two-entry TOC", () => {
    const toc: TocEntry[] = [
      { tag: "h2", text: "First", id: "first" },
      { tag: "h2", text: "Second", id: "second" },
    ];
    expect(isMultiSection(toc)).toBe(true);
  });

  it("returns true for a three-entry TOC", () => {
    const toc: TocEntry[] = [
      { tag: "h1", text: "A", id: "a" },
      { tag: "h1", text: "B", id: "b" },
      { tag: "h1", text: "C", id: "c" },
    ];
    expect(isMultiSection(toc)).toBe(true);
  });

  it("integrates with parseTocManifest — single section", () => {
    const html = '<h2 id="only">Only Section</h2><p>Content</p>';
    expect(isMultiSection(parseTocManifest(html))).toBe(false);
  });

  it("integrates with parseTocManifest — multi section", () => {
    const html = [
      '<h2 id="s1">Section One</h2><p>Content one.</p>',
      '<h2 id="s2">Section Two</h2><p>Content two.</p>',
    ].join("\n");
    expect(isMultiSection(parseTocManifest(html))).toBe(true);
  });

  it("integrates with parseTocManifest — empty HTML is never multi-section", () => {
    expect(isMultiSection(parseTocManifest(""))).toBe(false);
  });
});
