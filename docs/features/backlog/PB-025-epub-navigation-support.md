# PB-025: EPUB Navigation Support

**Status:** Backlog
**Date:** 2026-05-05

## Motivation

Paperboy currently produces EPUBs that work well for single-document content (one article, one chapter, one note), where linear scrolling is the natural reading experience. As Paperboy begins to receive **multi-section documents** — for example, a single Markdown file that concatenates many pages of a documentation site (see paperclip site-crawler pipeline) — readers lose the ability to navigate within the document. A 50-section guide becomes a single uninterrupted scroll on Kindle, with no jump-to-section, no chapter list, and no working in-document links.

Two specific gaps:

1. **In-document anchor links don't survive.** A TOC at the top of the source Markdown that links to anchors further down (`[Section](#section-3)`) ends up with non-functional links in the produced EPUB, because the HTML sanitization step strips the `id` attribute.
2. **Kindle's native chapter navigation is missing.** The "Go To" menu on a Kindle device relies on the EPUB's navigation structure (the `<nav>` element / NCX file). Paperboy's current EPUB output does not surface section boundaries to the device, so the chapter list is empty or shows only the document title.

The result: Kindle-side navigation for multi-section documents is effectively broken even when the Markdown source contains all the necessary structure.

## Scope

Make multi-section Markdown documents navigable on Kindle by preserving the structure the source already provides:

- In-document anchor links written by the Markdown author should work in the produced EPUB.
- Kindle's native chapter navigation should list each major section of the document.
- Section boundaries are inferred from H1 headings in the source Markdown (one H1 = one navigable section).

Single-section documents must continue to behave exactly as today.

## Acceptance Criteria

- [ ] A Markdown source containing `[link](#anchor)` links and matching `<a id="anchor"></a>` (or equivalent) targets produces an EPUB where clicking the link jumps to the anchor target on Kindle.
- [ ] A Markdown source split into multiple sections by H1 headings produces an EPUB whose Kindle "Go To" menu lists each section's H1 title in order.
- [ ] Tapping a section title in the Kindle "Go To" menu jumps to that section.
- [ ] A single-section Markdown document (one or zero H1 headings) produces an EPUB indistinguishable from today's output (no regression).
- [ ] Existing test suite continues to pass.
- [ ] The behavior is verified on a real Kindle device, not only in EPUB-validator tooling.

## Out of Scope

- TOC *generation* by Paperboy. The source Markdown is responsible for any visible table of contents at the top of the document; Paperboy only preserves what's there and feeds Kindle's chapter list.
- Configurable navigation depth (e.g. listing H2 sub-sections in addition to H1).
- Custom navigation styling, ordering, or labeling.
- Cover page or front-matter customization.
- Migration of existing EPUBs in the wild.

## Relationship to Other Tools

- **paperclip site-crawler** (cross-repo: `paperclip/docs/specs/2026-05-05-site-crawler-spec.md`) — the immediate consumer of this feature. The crawler pipeline concatenates many pages into one Markdown file with a TOC and per-page anchors; without this feature the resulting EPUB is unnavigable on Kindle.
- **PB-018 (Markdown Frontmatter Metadata)** — independent. Metadata is about authoring identity; this is about reader navigation.
