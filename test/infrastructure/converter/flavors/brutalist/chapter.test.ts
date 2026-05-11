import { describe, it, expect } from "vitest";
import { buildHtmlChapter } from "../../../../../src/infrastructure/converter/flavors/brutalist/chapter.js";
import { accentFor, issueNumberFor } from "../../../../../src/infrastructure/converter/flavors/_shared/palette.js";
import type { ChapterInput } from "../../../../../src/domain/ports.js";

function makeInput(overrides: Partial<ChapterInput> = {}): ChapterInput {
  return {
    title: "The Quick Brown Fox",
    author: "Claude",
    sourceDomain: "theverge.com",
    ...overrides,
  };
}

describe("buildHtmlChapter (brutalist)", () => {
  it("returns a string containing the root .cover div", () => {
    const html = buildHtmlChapter(makeInput());
    expect(html).toContain('class="cover"');
  });

  it("contains header.masthead with PAPERBOY kicker", () => {
    const html = buildHtmlChapter(makeInput());
    expect(html).toContain('class="masthead"');
    expect(html).toContain("PAPERBOY");
    expect(html).toContain('class="kicker"');
  });

  it("masthead contains the issue number", () => {
    const input = makeInput({ sourceDomain: "theverge.com" });
    const html = buildHtmlChapter(input);
    const expected = issueNumberFor("theverge.com");
    expect(html).toContain(expected);
    expect(html).toContain('class="issue"');
  });

  it("issue number derives from title when sourceDomain is absent", () => {
    const input = makeInput({ sourceDomain: undefined });
    const html = buildHtmlChapter(input);
    const expected = issueNumberFor(input.title);
    expect(html).toContain(expected);
  });

  it("contains h1.title with the article title", () => {
    const html = buildHtmlChapter(makeInput({ title: "My Article Title" }));
    expect(html).toContain('class="title"');
    expect(html).toContain("My Article Title");
  });

  it("contains footer with inline background style matching accentFor", () => {
    const input = makeInput({ sourceDomain: "nytimes.com" });
    const html = buildHtmlChapter(input);
    const expectedAccent = accentFor("nytimes.com");
    expect(html).toContain(`background:${expectedAccent}`);
    expect(html).toContain('class="footer"');
  });

  it("footer accent derives from title when sourceDomain is absent", () => {
    const input = makeInput({ sourceDomain: undefined });
    const html = buildHtmlChapter(input);
    const expectedAccent = accentFor(input.title);
    expect(html).toContain(`background:${expectedAccent}`);
  });

  it("XML-escapes title with special characters", () => {
    const html = buildHtmlChapter(makeInput({ title: 'A & B <em>"test"</em>' }));
    expect(html).toContain("A &amp; B &lt;em&gt;&quot;test&quot;&lt;/em&gt;");
    expect(html).not.toContain("<em>");
  });

  it("XML-escapes author with special characters", () => {
    const html = buildHtmlChapter(makeInput({ author: "O'<script>alert(1)</script>" }));
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("XML-escapes sourceDomain", () => {
    const html = buildHtmlChapter(makeInput({ sourceDomain: 'bad"domain' }));
    expect(html).toContain("&quot;");
  });

  it("shows author as primary byline and sourceDomain as secondary when both are present", () => {
    const input = makeInput({ author: "Jane Smith", sourceDomain: "bbc.com" });
    const html = buildHtmlChapter(input);
    expect(html).toContain('class="byline"');
    expect(html).toContain("Jane Smith");
    expect(html).toContain('class="source"');
    expect(html).toContain("bbc.com");
  });

  it("shows sourceDomain in uppercase as byline when author is empty", () => {
    const input = makeInput({ author: "", sourceDomain: "bbc.com" });
    const html = buildHtmlChapter(input);
    expect(html).toContain('class="byline"');
    expect(html).toContain("BBC.COM");
    expect(html).not.toContain('class="source"');
  });

  it("byline is empty string when both author and sourceDomain are absent", () => {
    const input = makeInput({ author: "", sourceDomain: undefined });
    expect(() => buildHtmlChapter(input)).not.toThrow();
    const html = buildHtmlChapter(input);
    expect(html).toContain('class="cover"');
  });
});
