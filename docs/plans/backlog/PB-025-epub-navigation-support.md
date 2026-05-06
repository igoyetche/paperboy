# PB-025: EPUB Navigation Support — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split multi-section Markdown documents into separate EPUB chapters so Kindle's "Go To" navigation lists every H1 section, while removing the source's hand-written TOC and keeping epub-gen-memory's auto-generated TOC as the single navigation page.

**Architecture:** A new pure-function module `multi-section-splitter.ts` handles TOC manifest parsing and HTML splitting. `MarkdownEpubConverter` detects multi-section documents, invokes the splitter after image processing, and passes the resulting chapter array to epub-gen-memory.

**Tech Stack:** TypeScript (strict), vitest, sanitize-html, marked, epub-gen-memory, jszip (for EPUB inspection in tests)

---

## File Map

| File | Change |
|---|---|
| `src/infrastructure/converter/multi-section-splitter.ts` | **New** — `parseTocManifest`, `isMultiSection`, `splitIntoChapters` |
| `src/infrastructure/converter/markdown-epub-converter.ts` | Add `id` to `a` allowlist; invoke splitter; pass chapter array |
| `test/infrastructure/converter/multi-section-splitter.test.ts` | **New** — unit tests |
| `test/infrastructure/converter/markdown-epub-converter.test.ts` | Add multi-section integration test |

---

### Task 1: Fix `id` attribute stripping in sanitize-html

**Files:**
- Modify: `src/infrastructure/converter/markdown-epub-converter.ts:57`
- Modify: `test/infrastructure/converter/markdown-epub-converter.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test to `test/infrastructure/converter/markdown-epub-converter.test.ts` inside the `describe("MarkdownEpubConverter")` block:

```typescript
it("preserves id attributes on anchor tags after sanitization", async () => {
  const md = '# Section One\n\n<a id="section-1"></a>\n\nSome content here.';
  const result = await converter.toEpub(
    makeTitle("Anchor Test"),
    makeDocument(md),
    makeAuthor("Claude"),
  );
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);

  const zip = new JSZip();
  const loaded = await zip.loadAsync(result.value.buffer);
  const chapterPaths = Object.keys(loaded.files).filter((p) =>
    /OEBPS\/\d+_.*\.xhtml$/.test(p),
  );
  let found = false;
  for (const path of chapterPaths) {
    const file = loaded.file(path);
    if (file) {
      const html = await file.async("string");
      if (html.includes('id="section-1"')) {
        found = true;
        break;
      }
    }
  }
  expect(found).toBe(true);
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```
npx vitest run test/infrastructure/converter/markdown-epub-converter.test.ts
```

Expected: FAIL — `id="section-1"` is stripped by sanitize-html.

- [ ] **Step 3: Apply the one-line fix**

In `src/infrastructure/converter/markdown-epub-converter.ts` line 57, change:

```typescript
          a: ["href", "title"],
```

to:

```typescript
          a: ["href", "title", "id"],
```

- [ ] **Step 4: Run tests to confirm all pass**

```
npx vitest run test/infrastructure/converter/markdown-epub-converter.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```
git add src/infrastructure/converter/markdown-epub-converter.ts test/infrastructure/converter/markdown-epub-converter.test.ts
git commit -m "fix(converter): preserve id attributes on anchor tags in sanitize-html"
```

---

### Task 2: Implement `parseTocManifest` and `isMultiSection`

**Files:**
- Create: `src/infrastructure/converter/multi-section-splitter.ts`
- Create: `test/infrastructure/converter/multi-section-splitter.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `test/infrastructure/converter/multi-section-splitter.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  parseTocManifest,
  isMultiSection,
} from "../../../src/infrastructure/converter/multi-section-splitter.js";

describe("parseTocManifest", () => {
  it("extracts ordered TOC entries from preamble", () => {
    const md = [
      "## Table of Contents",
      "- [Chapter One](#section-1)",
      "- [Chapter Two](#section-2)",
      "- [Chapter Three](#section-3)",
      "",
      "---",
      "",
      '<a id="section-1"></a>',
      "",
      "# Chapter One",
    ].join("\n");

    const entries = parseTocManifest(md);
    expect(entries).toHaveLength(3);
    expect(entries[0]).toEqual({ title: "Chapter One", anchorId: "section-1" });
    expect(entries[1]).toEqual({ title: "Chapter Two", anchorId: "section-2" });
    expect(entries[2]).toEqual({ title: "Chapter Three", anchorId: "section-3" });
  });

  it("returns empty array when no TOC links found", () => {
    const md = "# Just a heading\n\nSome content.";
    expect(parseTocManifest(md)).toHaveLength(0);
  });

  it("ignores TOC-style links that appear after the first H1", () => {
    const md = [
      "# Title",
      "",
      "- [Chapter One](#section-1)",
      "- [Chapter Two](#section-2)",
    ].join("\n");
    expect(parseTocManifest(md)).toHaveLength(0);
  });

  it("handles parenthetical links in preamble that are not TOC entries", () => {
    const md = [
      "See [this article](https://example.com) for more.",
      "- [Chapter One](#section-1)",
      "- [Chapter Two](#section-2)",
      "",
      "# Title",
    ].join("\n");
    const entries = parseTocManifest(md);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({ title: "Chapter One", anchorId: "section-1" });
  });
});

describe("isMultiSection", () => {
  it("returns true when preamble has 2 or more TOC links", () => {
    const md = "- [A](#a)\n- [B](#b)\n\n# First\n\nContent";
    expect(isMultiSection(md)).toBe(true);
  });

  it("returns false when preamble has exactly one TOC link", () => {
    const md = "- [A](#a)\n\n# First\n\nContent";
    expect(isMultiSection(md)).toBe(false);
  });

  it("returns false when preamble has no TOC links", () => {
    const md = "# Just a heading\n\nContent.";
    expect(isMultiSection(md)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isMultiSection("")).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npx vitest run test/infrastructure/converter/multi-section-splitter.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the module with parseTocManifest and isMultiSection**

Create `src/infrastructure/converter/multi-section-splitter.ts`:

```typescript
export type TocEntry = { title: string; anchorId: string };
export type SplitChapter = { title: string; anchorId: string; html: string };
export type SplitResult = { chapters: SplitChapter[]; warnings: string[] };

export function parseTocManifest(markdown: string): TocEntry[] {
  const firstH1Index = markdown.search(/^#\s/m);
  const preamble = firstH1Index === -1 ? markdown : markdown.slice(0, firstH1Index);
  const pattern = /\[([^\]]+)\]\(#([^)]+)\)/g;
  const entries: TocEntry[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(preamble)) !== null) {
    const title = match[1];
    const anchorId = match[2];
    if (title !== undefined && anchorId !== undefined) {
      entries.push({ title, anchorId });
    }
  }
  return entries;
}

export function isMultiSection(markdown: string): boolean {
  return parseTocManifest(markdown).length >= 2;
}

export function splitIntoChapters(html: string, manifest: TocEntry[]): SplitResult {
  return { chapters: [], warnings: ["splitIntoChapters not yet implemented"] };
}
```

- [ ] **Step 4: Run tests to confirm parseTocManifest and isMultiSection pass**

```
npx vitest run test/infrastructure/converter/multi-section-splitter.test.ts
```

Expected: all `parseTocManifest` and `isMultiSection` tests PASS. `splitIntoChapters` tests don't exist yet.

- [ ] **Step 5: Commit**

```
git add src/infrastructure/converter/multi-section-splitter.ts test/infrastructure/converter/multi-section-splitter.test.ts
git commit -m "feat(splitter): add parseTocManifest and isMultiSection"
```

---

### Task 3: Implement `splitIntoChapters`

**Files:**
- Modify: `src/infrastructure/converter/multi-section-splitter.ts`
- Modify: `test/infrastructure/converter/multi-section-splitter.test.ts`

- [ ] **Step 1: Write the failing tests**

Append these tests to the `describe` block in `test/infrastructure/converter/multi-section-splitter.test.ts`:

```typescript
describe("splitIntoChapters", () => {
  import { splitIntoChapters } from "../../../src/infrastructure/converter/multi-section-splitter.js";
```

Wait — the import is already at the top. Just append the describe block. Add this import to the top of the file (update the existing import line):

```typescript
import {
  parseTocManifest,
  isMultiSection,
  splitIntoChapters,
} from "../../../src/infrastructure/converter/multi-section-splitter.js";
```

Then add this describe block:

```typescript
describe("splitIntoChapters", () => {
  const manifest = [
    { title: "Chapter One", anchorId: "section-1" },
    { title: "Chapter Two", anchorId: "section-2" },
  ];

  // Anchor appears BEFORE the H1 — this matches the real sample format where
  // <a id="page-N"></a> precedes the <h1>. The split on (?=<h1) places the
  // anchor into the preceding raw part, so the algorithm finds it there.
  const html = [
    "<p>TOC content to drop</p>",
    "<hr>",
    '<a id="section-1"></a>',
    "<h1>Chapter One</h1>",
    "<p>First chapter content.</p>",
    "<hr>",
    '<a id="section-2"></a>',
    "<h1>Chapter Two</h1>",
    "<p>Second chapter content.</p>",
  ].join("\n");

  it("returns one chapter per H1 section", () => {
    const result = splitIntoChapters(html, manifest);
    expect(result.chapters).toHaveLength(2);
  });

  it("assigns titles from manifest by anchorId", () => {
    const result = splitIntoChapters(html, manifest);
    expect(result.chapters[0]?.title).toBe("Chapter One");
    expect(result.chapters[1]?.title).toBe("Chapter Two");
  });

  it("strips the H1 tag from chapter content", () => {
    const result = splitIntoChapters(html, manifest);
    expect(result.chapters[0]?.html).not.toMatch(/<h1/i);
    expect(result.chapters[1]?.html).not.toMatch(/<h1/i);
  });

  it("retains the anchor id tag in chapter html", () => {
    const result = splitIntoChapters(html, manifest);
    expect(result.chapters[0]?.html).toContain('id="section-1"');
    expect(result.chapters[1]?.html).toContain('id="section-2"');
  });

  it("strips trailing <hr> separator from chapter content", () => {
    const result = splitIntoChapters(html, manifest);
    expect(result.chapters[0]?.html).not.toMatch(/<hr/i);
  });

  it("preserves actual content", () => {
    const result = splitIntoChapters(html, manifest);
    expect(result.chapters[0]?.html).toContain("First chapter content.");
    expect(result.chapters[1]?.html).toContain("Second chapter content.");
  });

  it("drops the front-matter (TOC) section before the first H1", () => {
    const result = splitIntoChapters(html, manifest);
    for (const chapter of result.chapters) {
      expect(chapter.html).not.toContain("TOC content to drop");
    }
  });

  it("returns no warnings when all manifest entries are matched", () => {
    const result = splitIntoChapters(html, manifest);
    expect(result.warnings).toHaveLength(0);
  });

  it("warns when a manifest entry has no matching chapter", () => {
    const brokenManifest = [
      { title: "Chapter One", anchorId: "section-1" },
      { title: "Missing Chapter", anchorId: "section-999" },
    ];
    const result = splitIntoChapters(html, brokenManifest);
    const warningText = result.warnings.join(" ");
    expect(warningText).toContain("section-999");
  });

  it("falls back to H1 text when anchorId not in manifest", () => {
    const result = splitIntoChapters(html, []);
    // chapters still produced, titles come from H1 text
    expect(result.chapters).toHaveLength(2);
    expect(result.chapters[0]?.title).toBe("Chapter One");
    expect(result.chapters[1]?.title).toBe("Chapter Two");
  });

  it("returns empty chapters array and a warning when html has no H1", () => {
    const result = splitIntoChapters("<p>No headings here.</p>", manifest);
    expect(result.chapters).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to confirm new tests fail**

```
npx vitest run test/infrastructure/converter/multi-section-splitter.test.ts
```

Expected: FAIL — `splitIntoChapters` returns stub result.

- [ ] **Step 3: Implement splitIntoChapters**

Replace the stub `splitIntoChapters` in `src/infrastructure/converter/multi-section-splitter.ts` with:

```typescript
export function splitIntoChapters(html: string, manifest: TocEntry[]): SplitResult {
  const warnings: string[] = [];
  const chapters: SplitChapter[] = [];

  const rawParts = html.split(/(?=<h1(?:\s[^>]*)?>)/i);
  const sectionParts = rawParts.slice(1);

  if (sectionParts.length === 0) {
    warnings.push("No H1 headings found in HTML; no chapters produced");
    return { chapters, warnings };
  }

  for (let i = 0; i < sectionParts.length; i++) {
    const part = sectionParts[i];
    if (part === undefined) continue;

    const h1Match = part.match(/<h1(?:\s[^>]*)?>([^<]*)<\/h1>/i);
    const h1Text = h1Match?.[1]?.trim() ?? `Section ${i + 1}`;
    let content = part.replace(/<h1(?:\s[^>]*)?>.*?<\/h1>/i, "").trim();

    const lastHrIdx = content.lastIndexOf("<hr");
    if (lastHrIdx !== -1) {
      const afterHr = content.slice(lastHrIdx);
      if (/^<hr[^>]*\/?>\s*(<a[^>]*>\s*<\/a>)?\s*$/i.test(afterHr)) {
        content = content.slice(0, lastHrIdx).trim();
      }
    }

    let anchorId = "";
    const precedingPart = i === 0 ? rawParts[0] : sectionParts[i - 1];
    if (precedingPart !== undefined) {
      const idMatches = [...precedingPart.matchAll(/id="([^"]+)"/gi)];
      const lastMatch = idMatches[idMatches.length - 1];
      if (lastMatch?.[1] !== undefined) {
        anchorId = lastMatch[1];
      }
    }

    const manifestEntry = manifest.find((e) => e.anchorId === anchorId);
    const title = manifestEntry?.title ?? h1Text;

    const anchorTag = anchorId.length > 0 ? `<a id="${anchorId}"></a>\n` : "";
    const chapterHtml = (anchorTag + content).trim();

    chapters.push({ title, anchorId, html: chapterHtml });
  }

  for (const entry of manifest) {
    if (!chapters.some((c) => c.anchorId === entry.anchorId)) {
      warnings.push(
        `Manifest entry "${entry.title}" (#${entry.anchorId}) not found in any chapter`,
      );
    }
  }

  for (const chapter of chapters) {
    if (chapter.anchorId !== "" && !manifest.some((e) => e.anchorId === chapter.anchorId)) {
      warnings.push(`Chapter with anchor "#${chapter.anchorId}" not in manifest`);
    }
  }

  return { chapters, warnings };
}
```

- [ ] **Step 4: Run tests to confirm all pass**

```
npx vitest run test/infrastructure/converter/multi-section-splitter.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Run the full test suite to check for regressions**

```
npx vitest run
```

Expected: all existing tests still PASS.

- [ ] **Step 6: Commit**

```
git add src/infrastructure/converter/multi-section-splitter.ts test/infrastructure/converter/multi-section-splitter.test.ts
git commit -m "feat(splitter): implement splitIntoChapters with validation warnings"
```

---

### Task 4: Wire splitter into MarkdownEpubConverter

**Files:**
- Modify: `src/infrastructure/converter/markdown-epub-converter.ts`
- Modify: `test/infrastructure/converter/markdown-epub-converter.test.ts`

- [ ] **Step 1: Write the failing integration test**

Add this test inside `describe("MarkdownEpubConverter")` in `test/infrastructure/converter/markdown-epub-converter.test.ts`. It reads the fixture file at test time:

```typescript
it("splits multi-section markdown into separate EPUB chapters", async () => {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const samplePath = path.resolve(
    "docs/md-input-samples/mutli-section-sample.md",
  );
  const markdown = await fs.readFile(samplePath, "utf-8");

  const result = await converter.toEpub(
    makeTitle("Agentic Engineering Patterns"),
    makeDocument(markdown),
    makeAuthor("Claude"),
  );
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);

  const zip = new JSZip();
  const loaded = await zip.loadAsync(result.value.buffer);

  // epub-gen-memory names chapters as {index}_{slug}.xhtml
  // With explicit filenames they are section-1.xhtml, section-2.xhtml etc.
  const sectionFiles = Object.keys(loaded.files).filter((p) =>
    /OEBPS\/section-\d+\.xhtml$/.test(p),
  );

  // The sample has 17 sections in its TOC
  expect(sectionFiles.length).toBe(17);
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```
npx vitest run test/infrastructure/converter/markdown-epub-converter.test.ts --reporter=verbose
```

Expected: FAIL — only 1 content chapter, no `section-N.xhtml` files.

- [ ] **Step 3: Wire splitter into MarkdownEpubConverter**

Replace `src/infrastructure/converter/markdown-epub-converter.ts` with:

```typescript
/**
 * MarkdownEpubConverter — Implements FR-1, FR-36, FR-37 (PB-008)
 * Multi-section splitting added in PB-025.
 */

import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { File } from "node:buffer";
import type { ContentConverter } from "../../domain/ports.js";
import type { Title, Author, MarkdownDocument } from "../../domain/values/index.js";
import { EpubDocument } from "../../domain/values/index.js";
import { ConversionError, type Result, ok, err } from "../../domain/errors.js";
import type { ImageProcessor } from "./image-processor.js";
import type { CoverGenerator } from "./cover-generator.js";
import { createEpubWithPredownloadedImages } from "./epub-with-images.js";
import { isMultiSection, parseTocManifest, splitIntoChapters } from "./multi-section-splitter.js";

const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "br", "hr", "blockquote", "pre", "code",
  "b", "i", "em", "strong", "u", "s", "sup", "sub",
  "ul", "ol", "li",
  "a", "img",
  "table", "thead", "tbody", "tr", "th", "td",
  "div", "span",
];

export class MarkdownEpubConverter implements ContentConverter {
  constructor(
    private readonly imageProcessor: ImageProcessor,
    private readonly coverGenerator: CoverGenerator,
  ) {}

  async toEpub(
    title: Title,
    document: MarkdownDocument,
    author: Author,
  ): Promise<Result<EpubDocument, ConversionError>> {
    try {
      const rawMarkdown = document.content.value;

      const rawHtml = await marked.parse(rawMarkdown);

      const safeHtml = sanitizeHtml(rawHtml, {
        allowedTags: ALLOWED_TAGS,
        allowedAttributes: {
          a: ["href", "title", "id"],
          img: ["src", "alt", "title"],
          td: ["colspan", "rowspan"],
          th: ["colspan", "rowspan"],
        },
        allowedSchemes: ["http", "https", "mailto"],
      });

      const { html: processedHtml, images: processedImages, stats } =
        await this.imageProcessor.process(safeHtml);

      const coverCss = this.coverGenerator.generateCoverCss();
      const jpegBuffer = await this.coverGenerator.generateImage(
        title.value,
        author.value,
      );
      const htmlChapter = this.coverGenerator.generateHtmlChapter(
        title.value,
        author.value,
        document.metadata.url,
      );
      const coverUint8 = new Uint8Array(jpegBuffer.byteLength);
      coverUint8.set(jpegBuffer);
      const coverFile = new File([coverUint8], "cover.jpg", { type: "image/jpeg" });

      const imageBufferMap = new Map<string, { buffer: Buffer; format: string }>();
      for (const img of processedImages) {
        imageBufferMap.set(img.filename, { buffer: img.buffer, format: img.format });
      }

      const coverChapter = {
        title: "",
        content: htmlChapter,
        excludeFromToc: true as const,
        beforeToc: true as const,
      };

      let contentChapters: Array<{ title: string; content: string; filename?: string }>;

      if (isMultiSection(rawMarkdown)) {
        const manifest = parseTocManifest(rawMarkdown);
        const { chapters, warnings } = splitIntoChapters(processedHtml, manifest);
        for (const warning of warnings) {
          console.warn(`[PB-025] ${warning}`);
        }
        contentChapters = chapters.map((chapter, index) => ({
          title: chapter.title,
          content: chapter.html,
          filename: `section-${index + 1}.xhtml`,
        }));
      } else {
        contentChapters = [{ title: title.value, content: processedHtml }];
      }

      const epubInstance = createEpubWithPredownloadedImages(
        { title: title.value, author: author.value, cover: coverFile, css: coverCss },
        [coverChapter, ...contentChapters],
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      (epubInstance as any).__imageBufferMap = imageBufferMap;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
      const buffer = await (epubInstance as any).genEpub();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return ok(new EpubDocument(title.value, buffer, stats, author.value, document.metadata.date));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown conversion error";
      return err(new ConversionError(message));
    }
  }
}
```

- [ ] **Step 4: Run the full test suite**

```
npx vitest run
```

Expected: all tests PASS including the new multi-section integration test.

- [ ] **Step 5: Build to verify TypeScript compilation**

```
npm run build
```

Expected: `dist/` built with no type errors.

- [ ] **Step 6: Commit**

```
git add src/infrastructure/converter/markdown-epub-converter.ts test/infrastructure/converter/markdown-epub-converter.test.ts
git commit -m "feat(converter): wire multi-section splitter for Kindle chapter navigation (PB-025)"
```

---

## Done Criteria

All four tasks complete when:
- `npm test` passes with no failures
- `npm run build` succeeds
- The multi-section integration test confirms 17 `section-N.xhtml` chapters in the EPUB
- All acceptance criteria in `docs/features/backlog/PB-025-epub-navigation-support.md` are met (pending real Kindle device test)
