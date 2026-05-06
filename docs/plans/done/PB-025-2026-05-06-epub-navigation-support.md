# PB-025: EPUB Navigation Support — Plan

**Status:** 🔄 In Progress
**Feature:** docs/features/active/PB-025-epub-navigation-support.md
**Branch:** `pb-025-epub-navigation-support`
**Created:** 2026-05-06
**Implementation Started:** 2026-05-06

---

## Goal

Add multi-section EPUB support to `MarkdownEpubConverter` by preserving HTML `id` attributes on headings, parsing the TOC manifest, detecting multi-section documents, splitting content into chapters, and wiring the whole pipeline together.

---

## Tasks

### Task 1 — id-attribute preservation

- [~] **T-01**: Add support for HTML `id` attributes in the `sanitize-html` configuration inside `MarkdownEpubConverter` so that heading elements rendered by `marked` retain their `id` attribute through the sanitization step. Verify that `allowedAttributes` includes `id` on at minimum `h1`–`h6` elements. Write unit tests confirming that a heading with an `id` survives sanitization.

### Task 2 — parseTocManifest + isMultiSection

- [~] **T-02**: Implement `parseTocManifest(html: string): TocEntry[]` — parses the rendered HTML and extracts all top-level heading entries (element tag, text content, `id` attribute) that would appear in a TOC. Implement `isMultiSection(toc: TocEntry[]): boolean` — returns `true` when the TOC contains more than one entry, indicating the document should be split into chapters. Write unit tests covering: empty HTML, single heading, multiple headings at the same level, mixed heading levels.

### Task 3 — splitIntoChapters

- [~] **T-03**: Implement `splitIntoChapters(html: string, toc: TocEntry[]): ChapterSlice[]` — splits the full rendered HTML into ordered slices, one per TOC entry, where each slice contains the heading element and all content up to (but not including) the next TOC entry. Each `ChapterSlice` carries the chapter title (from the heading text) and the HTML fragment. Write unit tests covering: two chapters, three or more chapters, trailing content after the last heading, a chapter with no body content.

### Task 4 — wire into MarkdownEpubConverter

- [~] **T-04**: Update `MarkdownEpubConverter.toEpub()` to use the new utilities. After sanitization: call `parseTocManifest` on the sanitized HTML; if `isMultiSection` returns `true`, call `splitIntoChapters` and pass each `ChapterSlice` as a separate content entry to `epub-gen-memory`; otherwise retain the existing single-chapter path. Ensure no public interface or port signature changes. Write integration-level unit tests verifying that a multi-section Markdown input produces an `EpubDocument` and that a single-section input follows the unchanged path.

---

## Dependency Order

```
T-01 → T-02 (id preservation needed before TOC parsing is meaningful)
T-02 → T-03 (TOC entries needed for splitting)
T-01, T-02, T-03 → T-04 (all utilities needed before wiring)
```

---

## Acceptance Criteria Checklist (from feature doc)

- [ ] Multi-section documents are detected
- [ ] Chapter splitting is correct — no lost or duplicated content
- [ ] HTML `id` attributes preserved on headings
- [ ] `MarkdownEpubConverter` respects chapter structure; single-section path unchanged
- [ ] No regression in existing tests; new tests added
- [ ] TypeScript strict mode, zero errors
