# PB-025: EPUB Navigation Support

**Status:** Complete (2026-05-06)
**Date:** 2026-05-06
**Design Started:** 2026-05-06
**Branch:** `pb-025-epub-navigation-support`

## Motivation

Paperboy currently generates single-section EPUBs regardless of how many headings the Markdown source contains. Kindle treats these as a single chapter, so the reader's table of contents (TOC) is empty and there is no way to jump between sections. Long-form documents — research notes, articles with multiple H2/H3 sections, generated reports — are harder to navigate as a result.

Adding multi-section EPUB support means the reader sees a proper TOC, can tap a chapter title to jump directly to it, and Kindle's "go-to" menu works correctly. This is a meaningful quality-of-life improvement for any document longer than a few pages.

## Scope

- Detect whether a Markdown document contains multiple logical sections (parseable from its TOC/heading structure).
- When multiple sections are detected, split the document into separate EPUB chapters rather than emitting a single monolithic chapter.
- Preserve HTML `id` attributes on headings so anchor links within and across chapters resolve correctly.
- Integrate detection and splitting into the existing `MarkdownEpubConverter` pipeline without changing any public interfaces or entry points.

## Acceptance Criteria

- [x] Multi-section documents are detected: a document is considered multi-section when its heading structure yields more than one logical chapter entry (`isMultiSection()` returns true for N > 1 TOC entries)
- [x] Chapter splitting works correctly: each chapter contains the right content and headings, with no content lost or duplicated (`splitIntoChapters()` verified with 16 tests covering two/three chapters, trailing content, empty chapters)
- [x] HTML `id` attributes are preserved on heading elements so in-document anchor links continue to work after splitting (`id` added to `allowedAttributes` in sanitizeHtml config; verified with test)
- [x] `MarkdownEpubConverter` respects chapter structure: multi-section documents produce a multi-chapter EPUB; single-section documents are unchanged (wired in Task 4; verified with 3 integration tests)
- [x] No regression in existing tests; new tests cover section detection, splitting logic, and id-attribute preservation (404 tests pass, 39 new tests added across 4 tasks)
- [x] TypeScript compiles with zero errors in strict mode (verified after each commit)
- [x] Verified on a real Kindle device (2026-05-07) — multi-section "Go To" navigation lists each section; single-section articles produce no TOC page in the reading spine

## Out of Scope

- Custom TOC authoring (explicit `<!-- toc -->` markers or frontmatter overrides)
- Nested chapter hierarchies beyond a single split level
- Changes to the MCP tool schema, CLI flags, or watcher behaviour
- EPUB 3 navigation document (`nav.xhtml`) — Kindle's `ncx` TOC is sufficient

## Open Questions

_None at creation — ready for implementation._
