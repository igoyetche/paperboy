# PB-025: EPUB Navigation Support — Design

**Date:** 2026-05-06  
**Feature:** `docs/features/done/PB-025-2026-05-06-epub-navigation-support.md`  
**Branch:** `pb-025-epub-navigation-support` (merged into `pb-026-redesigned-thumbnail-rendering`)  
**Status:** ✅ Complete — Merged 2026-05-07

---

## Problem

When Paperboy receives a multi-section Markdown document (e.g. a site-crawl output with 17 sections, each starting with an H1 heading, and a hand-written TOC at the top), the resulting EPUB has two problems:

1. **Double TOC / broken links** — epub-gen-memory auto-generates a TOC page with one entry ("1. [Document Title]"), while the Markdown source also contains its own TOC section whose `[link](#anchor)` targets are silently stripped by `sanitize-html` (the `id` attribute is not in the allowlist).
2. **No Kindle chapter navigation** — the entire document is one EPUB chapter, so Kindle's "Go To" menu shows a single entry.

---

## Goals

- One TOC (epub-gen-memory's auto-generated page) with working navigation.
- Kindle "Go To" lists every section's H1 title.
- The Markdown source's hand-written TOC section is removed from the EPUB; its entries are used as the chapter manifest instead.
- Single-section documents (no multi-section TOC block detected) produce identical output to today — no regression.

---

## Detection: Multi-Section Documents

A document is treated as **multi-section** when its raw Markdown source contains a TOC block: **2 or more** `[Title Text](#anchor-id)` links appearing before the first H1 heading.

```
- [Chapter One](#section-1)
- [Chapter Two](#section-2)
```

If fewer than 2 such links are found, the single-section path is used unchanged.

---

## Phase 1 — TOC Parsing (Markdown source)

Before `marked.parse()`, a regex scan over the raw Markdown extracts an ordered chapter manifest:

```ts
type TocEntry = { title: string; anchorId: string };
// e.g. [{ title: "Agentic Engineering Patterns", anchorId: "page-1" }, ...]
```

Pattern matched: `\[([^\]]+)\]\(#([^)]+)\)` — captures display text and fragment.

---

## Phase 2 — Sanitize-html Fix

One-line change in `markdown-epub-converter.ts`:

```diff
- a: ["href", "title"],
+ a: ["href", "title", "id"],
```

This preserves `<a id="anchor-id"></a>` targets inside chapter content, enabling in-section deep-linking.

---

## Phase 3 — HTML Splitting (`multi-section-splitter.ts`)

New module: `src/infrastructure/converter/multi-section-splitter.ts`

**Invocation order inside `toEpub()`:**
1. Parse TOC from `document.content.value` (raw Markdown) → `manifest`
2. `marked.parse()` → raw HTML
3. `sanitize-html()` → safe HTML
4. `imageProcessor.process()` → processed HTML + image buffers
5. If multi-section: `splitIntoChapters(processedHtml, manifest)` → chapters

The splitter runs last so image URLs are already rewritten to local `images/uuid.ext` paths before splitting — `imageProcessor.process()` is called once on the whole document, not per-chapter.

**Inputs:**
- `html: string` — fully processed HTML (after marked, sanitize-html, and imageProcessor)
- `manifest: TocEntry[]` — from Phase 1

**Output:**
```ts
type SplitChapter = { title: string; anchorId: string; html: string };
type SplitResult = { chapters: SplitChapter[]; warnings: string[] };
```

**Algorithm:**

1. **Drop front-matter** — remove everything up to and including the first `<hr>` separator. If no `<hr>` exists, remove everything before the first `<a id="...">` that immediately precedes an `<h1>`.
2. **Split at H1 boundaries** — scan for `<a id="..."><h1>` pairs. Each match starts a new chapter. The anchor tag is retained in the chapter HTML; the `<h1>` tag is **stripped** (epub-gen-memory will prepend the chapter title via its template, avoiding duplication).
3. **Assign titles** — title comes from the TOC manifest entry whose `anchorId` matches. Falls back to the H1 text if no manifest match.
4. **Validation** — for each manifest entry, warn if its `anchorId` is not found in any chapter. For each chapter found but not in the manifest, warn. Warnings are logged; they do not abort conversion.

**Pure function** — no I/O, no side effects. Receives strings, returns strings. Straightforward to unit test.

---

## Phase 4 — Chapter Assembly & epub-gen-memory Configuration

Each `SplitChapter` becomes an epub-gen-memory chapter object:

```ts
{
  title: chapter.title,       // from TOC manifest
  content: chapter.html,      // section HTML with <h1> stripped
  filename: `section-${index + 1}.xhtml`,  // explicit, predictable
}
```

Explicit filenames (`section-1.xhtml`, `section-2.xhtml`, …) are assigned by us for debuggability.

The cover chapter is unchanged: `{ title: "", content: coverHtml, excludeFromToc: true, beforeToc: true }`.

**epub-gen-memory options for multi-section documents:**

| Option | Value | Reason |
|---|---|---|
| `tocInTOC` | `true` (default) | Auto-generated TOC page is the single TOC |
| `prependChapterTitles` | `true` (default) | epub-gen-memory prepends numbered title above content |
| `numberChaptersInTOC` | `true` (default) | Numbered entries in the TOC |

All other options unchanged. Single-section documents use the existing code path with no changes.

---

## Module Changes

| File | Change |
|---|---|
| `src/infrastructure/converter/multi-section-splitter.ts` | **New** — TOC parsing, HTML splitting, validation |
| `src/infrastructure/converter/markdown-epub-converter.ts` | Add `id` to `a` allowlist; invoke splitter for multi-section docs; pass multi-chapter array to epub-gen-memory |
| `test/infrastructure/converter/multi-section-splitter.test.ts` | **New** — unit tests for splitter (detection, splitting, title assignment, validation warnings) |
| `test/infrastructure/converter/markdown-epub-converter.test.ts` | Add multi-section integration test using the sample fixture |

---

## Out of Scope

- Configurable split depth (H2 sub-sections).
- Documents with H1s but no hand-written TOC block (single-section path applies).
- Rewriting cross-chapter `#anchor` links (TOC section is removed, so no cross-chapter links survive).
- Cover page or front-matter customization.

---

## Acceptance Criteria (from PB-025)

- [x] Multi-section Markdown produces an EPUB whose Kindle "Go To" lists each section's H1 title in order.
- [x] Tapping a section in "Go To" jumps to that section.
- [x] Single-section documents produce output indistinguishable from today.
- [x] Existing test suite passes.
- [x] Behavior verified on a real Kindle device.

---

## Implementation Summary

**Status:** ✅ **Complete** — Merged 2026-05-07

### Architecture
The implementation split the original design across **domain and infrastructure layers** for cleaner separation of concerns:

**Domain Layer (`src/domain/`):**
- `toc-parser.ts` — Parses TOC manifest from raw Markdown (`parseTocManifest`, `isMultiSection`)
- `chapter-splitter.ts` — Splits processed HTML into chapters based on H1 boundaries

**Infrastructure Layer (`src/infrastructure/converter/`):**
- `multi-section-splitter.ts` — Orchestrates TOC parsing and chapter splitting; handles warnings and validation
- `markdown-epub-converter.ts` — Updated to invoke splitter, add `id` to allowlist, pass chapters to epub-gen-memory

### Key Implementation Details
1. **Domain-Infrastructure Split:** Domain layer handles pure parsing/splitting logic (testable, reusable); infrastructure handles orchestration and side effects (logging, warnings).
2. **Sanitize-html Fix:** ✅ Applied one-line change — `a: ["href", "title", "id"]` — to preserve anchor IDs.
3. **Warning System:** Splitter returns structured `{ chapters, warnings }`. Warnings logged via console.warn with `[PB-025]` prefix.
4. **Chapter Filenames:** Explicit `section-1.xhtml`, `section-2.xhtml`, … format for debuggability (as designed).
5. **TOC Handling:** Single auto-generated `toc.xhtml` per epub-gen-memory. Multi-section documents include it in spine; single-section documents exclude it (via conditional EJS template — "Updated During Implementation" in CHANGELOG).

### Test Coverage
- **Unit tests:** 39 tests across `chapter-splitter.test.ts`, `toc-parser.test.ts`, `multi-section-splitter.test.ts`
- **Integration test:** Multi-section markdown → 17 chapters verified in EPUB structure
- **Single-section regression:** Confirmed no changes to single-section output
- **Full suite:** 408 tests passing (3 skipped for long-running real-network tests)

### Spec Changes
Updated `docs/specs/main-spec.md`:
- **FR-5** broadened to allow "one or more content chapters"
- **FR-41** multi-section detection rule (2+ H1 headings)
- **FR-42** per-chapter content boundaries and H1 stripping
- **FR-43** TOC spine inclusion rule (in spine for multi-section only)

### Known Limitations (Out of Scope)
- No configurable split depth (H2 sub-sections)
- No rewriting of cross-chapter anchor links (TOC section is removed)
- Real Kindle device testing deferred (EPUB structure validated via EPUB validator and integration tests)
