# PB-027: Brutalist Cover Flavor — Implementation Plan

**Goal:** Add a second bundled `CoverFlavor` called `brutalist` — a self-contained folder under `src/infrastructure/converter/flavors/brutalist/` that ships its own thumbnail (Satori node tree), title-page chapter (HTML), chapter CSS, icon asset, and bold font. Selectable via `PAPERBOY_COVER_FLAVOR=brutalist`. Classic stays the default and is untouched.

**Architecture:** see `docs/designs/PB-027-brutalist-cover-flavor/design.md`. Four-phase rollout:

1. **Shared scaffolding** — extend `ThumbnailInput` with optional `sourceDomain`, extend `CoverFlavor` with optional `titleWrap`, plumb `sourceDomain` through `CoverGenerator` + `MarkdownEpubConverter`, add `_shared/palette.ts` with hashing helpers. Classic ignores the new fields and stays visually identical.
2. **Brutalist flavor** — copy `main-icon-inverted.png` and Inter Bold into `flavors/brutalist/assets/`, write the four flavor files (thumbnail, chapter, css, index), add brutalist-internal tokens, wire Inter Bold loading into `CoverGenerator`, ship Inter Bold inside the EPUB via a `@font-face` declaration plus a custom OEBPS file.
3. **Registry + packaging** — add `brutalist` to `FLAVORS`, extend the postbuild asset-copy to include flavor-internal `assets/` folders, update `verify-assets.mjs` to assert brutalist assets land in `dist/`, document the value in `.env.example`.
4. **Tests, fixtures, spec sync** — palette unit tests, brutalist fixture pair, render-at-each-resolution test, end-to-end converter test, spec + CHANGELOG entries.

**Tech additions:**
- One bundled font: Inter Bold (~340 KB, SIL-OFL)
- One bundled icon (copied from existing `docs/assets/icons/main-icon-inverted.png`, ~20 KB)
- No new npm dependencies

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/domain/ports.ts` | Add `sourceDomain?: string` to `ThumbnailInput`; add `titleWrap?: { maxChars: number; maxLines: number }` to `CoverFlavor` |
| Create | `src/infrastructure/converter/flavors/_shared/palette.ts` | `fnv1a32`, `accentFor`, `issueNumberFor` — pure functions, no imports |
| Modify | `src/infrastructure/converter/cover-generator.ts` | `buildThumbnailContent` takes optional `sourceDomain`; reads `flavor.titleWrap` for wrap parameters; loads Inter Bold buffer at construction |
| Modify | `src/infrastructure/converter/markdown-epub-converter.ts` | Extract `sourceDomain` once from `document.metadata.url`; pass to both `buildThumbnailContent` and `generateHtmlChapter` |
| Create | `src/infrastructure/converter/flavors/brutalist/index.ts` | Exports the `brutalist` `CoverFlavor` object |
| Create | `src/infrastructure/converter/flavors/brutalist/tokens.ts` | Brutalist-internal ink/paper/accent-ink colors |
| Create | `src/infrastructure/converter/flavors/brutalist/thumbnail.ts` | `buildThumbnail()` — Satori node tree: masthead, title hero, footer with icon-on-backplate |
| Create | `src/infrastructure/converter/flavors/brutalist/chapter.ts` | `buildHtmlChapter()` — HTML body fragment with inline accent-color footer style |
| Create | `src/infrastructure/converter/flavors/brutalist/css.ts` | `buildCoverCss()` — chapter CSS plus `@font-face` for Inter Bold |
| Create | `src/infrastructure/converter/flavors/brutalist/assets/main-icon-inverted.png` | Copied from `docs/assets/icons/main-icon-inverted.png` |
| Create | `src/infrastructure/converter/flavors/brutalist/assets/fonts/inter-bold.ttf` | SIL-OFL, weight 700, ~340 KB |
| Create | `src/infrastructure/converter/flavors/brutalist/assets/fonts/OFL.txt` | OFL license for Inter |
| Create | `src/infrastructure/converter/flavors/brutalist/fixtures/sample-thumbnail.svg` | Per-flavor designer fixture (Satori SVG output) |
| Create | `src/infrastructure/converter/flavors/brutalist/fixtures/sample-cover.html` | Per-flavor designer fixture (HTML+CSS preview) |
| Modify | `src/infrastructure/converter/flavors/index.ts` | Register `brutalist` in the `FLAVORS` map |
| Modify | `src/infrastructure/converter/epub-with-images.ts` | Accept additional OEBPS files so brutalist can ship `OEBPS/fonts/inter-bold.ttf` inside the EPUB (verify whether the existing API already supports this; if it does, only the call site changes) |
| Modify | `scripts/verify-assets.mjs` | Add brutalist icon + font to the required-assets list |
| Modify | `package.json` (`postbuild`) | Extend asset-copy to include `src/infrastructure/converter/flavors/*/assets/` → `dist/...` |
| Modify | `.env.example` | Document `brutalist` as an accepted `PAPERBOY_COVER_FLAVOR` value |
| Create | `test/infrastructure/converter/flavors/_shared/palette.test.ts` | Unit tests for hashing helpers |
| Create | `test/infrastructure/converter/flavors/brutalist/thumbnail.test.ts` | Node-tree shape + sizing tests |
| Create | `test/infrastructure/converter/flavors/brutalist/chapter.test.ts` | HTML output tests (escaping, accent-color inline style, issue number) |
| Create | `test/infrastructure/converter/flavors/brutalist/css.test.ts` | CSS output tests (`@font-face`, color tokens) |
| Modify | `test/infrastructure/converter/cover-generator.test.ts` | Fixture-comparison loop already iterates `listFlavorNames()`; verify it picks up brutalist; add brutalist's three-resolution render test |
| Modify | `test/infrastructure/converter/markdown-epub-converter.test.ts` | End-to-end test with `flavor: brutalist` — assert `cover.jpg` and `OEBPS/fonts/inter-bold.ttf` exist in the EPUB and `@font-face` appears in `style.css` |
| Modify | `test/infrastructure/config.test.ts` | `PAPERBOY_COVER_FLAVOR=brutalist` is accepted; unknown flavor error message lists both `classic` and `brutalist` |
| Modify | `docs/specs/main-spec.md` | Update the FR enumerating bundled flavors (FR-38 per PB-026) to list both `classic` and `brutalist`; document `sourceDomain` on `ThumbnailInput` and `titleWrap` on `CoverFlavor` |
| Modify | `docs/CHANGELOG.md` | Spec changes + feature completion entry |
| Modify | `docs/STATUS.md` | Move PB-027 to Active Work, then to Completed |

---

## Phase 1 — Shared scaffolding

No new flavor visible yet. Classic continues to render identically. Contract additions are purely additive.

### Task 1: Extend `ThumbnailInput` and `CoverFlavor`

**Files:**
- Modify: `src/domain/ports.ts`

- [ ] **Step 1.1:** Add `sourceDomain?: string` to `ThumbnailInput`. Add `titleWrap?: { readonly maxChars: number; readonly maxLines: number }` to `CoverFlavor`. Both optional. No `any`, no `as`.
- [ ] **Step 1.2:** Run `npm run build`; expect clean compilation (classic compiles unchanged because it never reads the new fields).
- [ ] **Step 1.3:** Commit `feat: PB-027 extend ThumbnailInput and CoverFlavor for source-keyed flavors`.

### Task 2: Plumb `sourceDomain` through `CoverGenerator` and `MarkdownEpubConverter`

**Files:**
- Modify: `src/infrastructure/converter/cover-generator.ts`
- Modify: `src/infrastructure/converter/markdown-epub-converter.ts`
- Modify: `test/infrastructure/converter/cover-generator.test.ts`

- [ ] **Step 2.1:** Change `buildThumbnailContent(title, author)` to `buildThumbnailContent(title, author, sourceDomain?)`. Pass `sourceDomain` into the returned `ThumbnailContent`. Read `flavor.titleWrap ?? { maxChars: 13, maxLines: 4 }` and pass into `wrapTitle`. Take the active flavor as a parameter (or expose `titleWrap` via a small overload — choose whichever keeps the call site in `MarkdownEpubConverter` cleanest; reflect the final shape in the design's "titleWrap" section).
- [ ] **Step 2.2:** In `MarkdownEpubConverter`, extract `sourceDomain` once via the existing `extractDomain(document.metadata.url)` helper (lift it out of `CoverGenerator` if needed, or call the existing private helper through a small public wrapper). Pass the extracted domain into both `buildThumbnailContent` and `generateHtmlChapter`.
- [ ] **Step 2.3:** Update existing cover-generator tests to exercise the new signature; classic-specific tests should pass `sourceDomain: undefined` (or pass a sample domain — either path; both must compile and pass).
- [ ] **Step 2.4:** Run `npm test`; expect green (classic renders unchanged because it ignores `sourceDomain` and uses its default wrap).
- [ ] **Step 2.5:** Commit `feat: PB-027 plumb sourceDomain through cover generator and converter`.

### Task 3: Add `_shared/palette.ts` with hashing helpers

**Files:**
- Create: `src/infrastructure/converter/flavors/_shared/palette.ts`
- Create: `test/infrastructure/converter/flavors/_shared/palette.test.ts`

- [ ] **Step 3.1:** Write failing tests:
  - `fnv1a32("paperboy")` returns a stable known value (compute once, lock).
  - `fnv1a32("a")` !== `fnv1a32("b")`.
  - `accentFor(seed)` returns a string matching `/^hsl\(\d+, \d+%, \d+%\)$/`.
  - `accentFor(seed)` is deterministic across calls.
  - `accentFor("theverge.com")` !== `accentFor("nytimes.com")`.
  - `issueNumberFor(seed)` returns a 3-character zero-padded numeric string.
  - `issueNumberFor("seed-0")` is deterministic across calls.
  - Edge cases: empty string, very long string, unicode (`fnv1a32("café")` doesn't throw and produces a 32-bit-bounded number).
- [ ] **Step 3.2:** Implement `palette.ts` per the design's pseudocode. No imports beyond `Math.imul`. All exports are pure functions.
- [ ] **Step 3.3:** Run `npm test test/infrastructure/converter/flavors/_shared/palette.test.ts`; expect green.
- [ ] **Step 3.4:** Commit `feat: PB-027 add _shared/palette.ts hashing helpers`.

---

## Phase 2 — Brutalist flavor

This phase introduces the visible new flavor. After it lands, `PAPERBOY_COVER_FLAVOR=brutalist` works end-to-end but config still rejects the value because validation in Phase 3 hasn't extended the registry yet. (Manual verification in this phase happens by temporarily importing `brutalist` directly into a test.)

### Task 4: Bundle the brutalist icon

**Files:**
- Create: `src/infrastructure/converter/flavors/brutalist/assets/main-icon-inverted.png`

- [ ] **Step 4.1:** Copy `docs/assets/icons/main-icon-inverted.png` to `src/infrastructure/converter/flavors/brutalist/assets/main-icon-inverted.png`. Do not modify the file. Commit as a binary.
- [ ] **Step 4.2:** Commit `feat: PB-027 bundle brutalist icon asset`.

### Task 5: Bundle Inter Bold font

**Files:**
- Create: `src/infrastructure/converter/flavors/brutalist/assets/fonts/inter-bold.ttf`
- Create: `src/infrastructure/converter/flavors/brutalist/assets/fonts/OFL.txt`

- [ ] **Step 5.1:** Download Inter Bold (weight 700) TTF from the Inter font GitHub release (`rsms/inter`). SIL-OFL.
- [ ] **Step 5.2:** Place the file at `src/infrastructure/converter/flavors/brutalist/assets/fonts/inter-bold.ttf` and the OFL license at the same level. Verify file size is in the ~340 KB range.
- [ ] **Step 5.3:** Run `npm audit` — clean (no install-time effects).
- [ ] **Step 5.4:** Commit `feat: PB-027 bundle Inter Bold font for brutalist flavor`.

### Task 6: Brutalist tokens

**Files:**
- Create: `src/infrastructure/converter/flavors/brutalist/tokens.ts`

- [ ] **Step 6.1:** Define the brutalist palette:
  - `INK = "#141210"` (black masthead text, title color, footer fallback)
  - `PAPER = "#f4efe2"` (background, kicker text on masthead, icon backplate, byline text on accent)
  - `ACCENT_INK = "#fbf7ee"` (text on accent footer — slightly warmer paper for the byline)
  - `FONT_FAMILY = "Inter"` (used by brutalist nodes only)
- [ ] **Step 6.2:** Run `npm run build`.
- [ ] **Step 6.3:** Commit `feat: PB-027 add brutalist token palette`.

### Task 7: Implement `buildThumbnail`

**Files:**
- Create: `src/infrastructure/converter/flavors/brutalist/thumbnail.ts`
- Create: `test/infrastructure/converter/flavors/brutalist/thumbnail.test.ts`

- [ ] **Step 7.1:** Write failing tests:
  - Returns a root `div` Satori node with `display: "flex"` and `flexDirection: "column"`, with the canvas `width`/`height` from the input.
  - Contains exactly three children: masthead, title-hero, footer.
  - Masthead contains "PAPERBOY" and the issue-number string from `issueNumberFor(seed)` where `seed = sourceDomain ?? titleLines.join(" ")`.
  - Title hero contains one child node per entry in `titleLines`, each in uppercase.
  - Footer's background color equals `accentFor(seed)`.
  - Footer contains the byline (author or sourceDomain when author is absent) and an `<img>` whose `src` equals the input's `iconDataUri`.
  - The icon `<img>` is wrapped in a `div` whose `backgroundColor` is `PAPER` (the backplate).
  - Title font size at width 600 follows the heuristic table in the design; at width 1264 it scales via `scale()`.
  - When `iconDataUri` is `undefined`, the footer omits the icon block entirely (the byline still renders).
  - When `sourceDomain` is `undefined`, both accent and issue number derive from `titleLines.join(" ")`.
  - When both `sourceDomain` and `titleLines` are empty/missing, seed falls back to `author`.
- [ ] **Step 7.2:** Implement `buildThumbnail` per the design — proportional sizing via `_shared/scale.ts`, three flex sections, icon-on-backplate composition, uppercase titles. `fontFamily: "Inter"` for masthead and title.
- [ ] **Step 7.3:** Run tests; expect green.
- [ ] **Step 7.4:** Commit `feat: PB-027 implement brutalist thumbnail node tree`.

### Task 8: Implement `buildHtmlChapter`

**Files:**
- Create: `src/infrastructure/converter/flavors/brutalist/chapter.ts`
- Create: `test/infrastructure/converter/flavors/brutalist/chapter.test.ts`

- [ ] **Step 8.1:** Write failing tests:
  - Output is a single root `<div class="cover">` containing `<header class="masthead">`, `<h1 class="title">`, `<footer class="footer" style="...">`.
  - Title, author, and sourceDomain are XML-escaped (covers `<`, `>`, `&`, `"`).
  - Masthead contains the literal text `PAPERBOY` and the issue number from `issueNumberFor(seed)`.
  - Footer's `style` attribute contains `background:` with the value returned by `accentFor(seed)`.
  - When author is provided, byline is the author and source domain appears as a secondary line; when author is absent, byline is `sourceDomain.toUpperCase()` and no secondary line renders.
  - Empty author + empty sourceDomain still produces valid XHTML (byline is empty but the structural elements are present).
- [ ] **Step 8.2:** Implement using the same `escapeXml` helper pattern as classic.
- [ ] **Step 8.3:** Run tests; expect green.
- [ ] **Step 8.4:** Commit `feat: PB-027 implement brutalist HTML chapter`.

### Task 9: Implement `buildCoverCss`

**Files:**
- Create: `src/infrastructure/converter/flavors/brutalist/css.ts`
- Create: `test/infrastructure/converter/flavors/brutalist/css.test.ts`

- [ ] **Step 9.1:** Write failing tests:
  - Output contains a `@font-face` block referencing `fonts/inter-bold.ttf` with `font-family: "Inter"` and `font-weight: 700`.
  - Output declares the three classes (`.cover`, `.masthead`, `.title`, `.footer`, `.kicker`, `.issue`, `.byline`) with the brutalist tokens (ink, paper, accent-ink).
  - Output applies `text-transform: uppercase` to `.title`, `.masthead .kicker`, `.masthead .issue`.
  - Output applies `font-family: "Inter", sans-serif` to body and title.
- [ ] **Step 9.2:** Implement `buildCoverCss` returning the CSS string with the brutalist palette and `@font-face` declaration. Use a relative `url("fonts/inter-bold.ttf")` consistent with how the font lands inside the EPUB at `OEBPS/fonts/inter-bold.ttf`.
- [ ] **Step 9.3:** Run tests; expect green.
- [ ] **Step 9.4:** Commit `feat: PB-027 implement brutalist chapter CSS`.

### Task 10: Wire Inter Bold loading into `CoverGenerator`

**Files:**
- Modify: `src/infrastructure/converter/cover-generator.ts`

- [ ] **Step 10.1:** In the constructor, load `flavors/brutalist/assets/fonts/inter-bold.ttf` and add a second Satori font entry: `{ name: "Inter", data, weight: 700, style: "normal" }`. Both fonts now sit in `this.fonts`.
- [ ] **Step 10.2:** Verify no existing test breaks (classic flavor uses Source Serif; Satori picks the font by name from the available font list, so loading an extra font is harmless).
- [ ] **Step 10.3:** Commit `feat: PB-027 load Inter Bold font in CoverGenerator`.

### Task 11: Embed Inter Bold inside the EPUB at `OEBPS/fonts/`

**Files:**
- Modify: `src/infrastructure/converter/epub-with-images.ts` (or `markdown-epub-converter.ts` — wherever the EPUB build pipeline accepts custom OEBPS files)

- [ ] **Step 11.1:** Investigate the existing `epub-with-images` wrapper. Determine whether the current call path can ship `OEBPS/fonts/inter-bold.ttf` inside the EPUB. If yes, only the call site changes. If no, extend the wrapper to accept arbitrary `(path, buffer)` files alongside the existing image-files list.
- [ ] **Step 11.2:** When the active flavor is `brutalist`, include the Inter Bold buffer at `OEBPS/fonts/inter-bold.ttf`. Skip for other flavors (no font shipping needed for classic — its `@font-face`-free CSS uses serif as a system fallback). Use the flavor's `name` to decide; do **not** introduce a new contract method for font shipping. If a future flavor needs the same plumbing, generalize then.
- [ ] **Step 11.3:** Write a test in `markdown-epub-converter.test.ts` (Task 17) that opens the resulting EPUB with `jszip` and asserts the font file exists at `OEBPS/fonts/inter-bold.ttf`.
- [ ] **Step 11.4:** Commit `feat: PB-027 embed Inter Bold inside EPUB for brutalist flavor`.

### Task 12: Brutalist flavor `index.ts`

**Files:**
- Create: `src/infrastructure/converter/flavors/brutalist/index.ts`

- [ ] **Step 12.1:** Export a `CoverFlavor` object with `name: "brutalist"`, the three builder functions, and `titleWrap: { maxChars: 18, maxLines: 4 }`.
- [ ] **Step 12.2:** Run `npm run build`.
- [ ] **Step 12.3:** Commit `feat: PB-027 add brutalist CoverFlavor entry point`.

---

## Phase 3 — Registry, packaging, config

After this phase, `PAPERBOY_COVER_FLAVOR=brutalist` works through the full configuration path.

### Task 13: Register `brutalist` in the registry

**Files:**
- Modify: `src/infrastructure/converter/flavors/index.ts`
- Modify: `test/infrastructure/converter/flavors/registry.test.ts` (if it exists; otherwise touch the cover-generator test that exercises the registry)

- [ ] **Step 13.1:** Import `brutalist` and add it to the `FLAVORS` map after `classic`.
- [ ] **Step 13.2:** Update or add a test that `listFlavorNames()` returns `["classic", "brutalist"]` in that order, that `getFlavor("brutalist").name === "brutalist"`, and `isFlavorName("brutalist") === true`.
- [ ] **Step 13.3:** Run `npm test`; expect green.
- [ ] **Step 13.4:** Commit `feat: PB-027 register brutalist in flavors registry`.

### Task 14: Extend postbuild to copy flavor-internal assets

**Files:**
- Modify: `package.json` (`postbuild` script)
- Modify: `scripts/verify-assets.mjs`

- [ ] **Step 14.1:** Extend the `postbuild` inline node command to also copy `src/infrastructure/converter/flavors/` to `dist/infrastructure/converter/flavors/` recursively (this picks up `assets/` subfolders inside every flavor and `fixtures/`, both of which `tsc` doesn't copy). Strip `*.ts` source files from the copy — only static assets need to land in dist. (If the existing tsc output already overwrites `*.js` correctly because tsc runs first, a recursive copy may suffice; verify by running `npm run build` and checking dist contents.)
- [ ] **Step 14.2:** Update `scripts/verify-assets.mjs` `requiredAssets` to include:
  - `dist/infrastructure/converter/flavors/brutalist/assets/main-icon-inverted.png`
  - `dist/infrastructure/converter/flavors/brutalist/assets/fonts/inter-bold.ttf`
- [ ] **Step 14.3:** Run `npm run build`; expect `verify-assets` to pass with all four assets reported present.
- [ ] **Step 14.4:** Commit `feat: PB-027 copy flavor-internal assets in postbuild and verify`.

### Task 15: Document `brutalist` in `.env.example`

**Files:**
- Modify: `.env.example`

- [ ] **Step 15.1:** Update the `PAPERBOY_COVER_FLAVOR` example/comment to list both `classic` and `brutalist` as accepted values, with `classic` as default.
- [ ] **Step 15.2:** Commit `docs: PB-027 document brutalist flavor in .env.example`.

### Task 16: Confirm config validation accepts `brutalist`

**Files:**
- Modify: `test/infrastructure/config.test.ts`

- [ ] **Step 16.1:** Add test: `PAPERBOY_COVER_FLAVOR=brutalist` loads without error and `config.defaultCoverFlavor === "brutalist"`.
- [ ] **Step 16.2:** Update the existing "unknown flavor" error-message test to assert the error message lists both `classic` and `brutalist`.
- [ ] **Step 16.3:** Run `npm test`; expect green.
- [ ] **Step 16.4:** Commit `test: PB-027 confirm config accepts brutalist and lists it in errors`.

---

## Phase 4 — Fixtures, end-to-end tests, spec sync

### Task 17: Brutalist fixture pair + render-at-each-resolution test

**Files:**
- Create: `src/infrastructure/converter/flavors/brutalist/fixtures/sample-thumbnail.svg`
- Create: `src/infrastructure/converter/flavors/brutalist/fixtures/sample-cover.html`
- Modify: `test/infrastructure/converter/cover-generator.test.ts`

- [ ] **Step 17.1:** Generate the brutalist thumbnail SVG via `UPDATE_COVER_FIXTURE=1 npx vitest run` (PB-026's existing fixture-refresh path) using a stable sample article (`title: "The Quick Brown Fox Jumps Over the Lazy Dog"`, `author: "Claude"`, `sourceDomain: "theverge.com"`). Save the result as `sample-thumbnail.svg`.
- [ ] **Step 17.2:** Hand-write `sample-cover.html` as a standalone HTML file that previews the chapter body + CSS together (mirrors the classic fixture). A designer can open it in a browser.
- [ ] **Step 17.3:** Re-run `npm test`; expect the fixture-comparison loop to pick up brutalist automatically (it iterates `listFlavorNames()`).
- [ ] **Step 17.4:** Add an explicit test that calls `coverGenerator.generateCoverSvg(brutalist, resolution, content)` for each of the three `CoverResolution` entries and asserts the SVG parses cleanly and contains the title text.
- [ ] **Step 17.5:** Commit `test: PB-027 add brutalist fixture pair and three-resolution render test`.

### Task 18: End-to-end converter test with `flavor: brutalist`

**Files:**
- Modify: `test/infrastructure/converter/markdown-epub-converter.test.ts`

- [ ] **Step 18.1:** Add a test: construct `MarkdownEpubConverter` with `flavor: brutalist`, run it on a sample article (with a `url` so `sourceDomain` flows through), unzip the resulting EPUB with `jszip`, and assert:
  - `OEBPS/cover.jpg` exists and is non-empty.
  - `OEBPS/fonts/inter-bold.ttf` exists and matches the source file size.
  - `OEBPS/style.css` contains the substring `@font-face` and references `fonts/inter-bold.ttf`.
  - The first chapter's XHTML contains `<header class="masthead">` and an `<footer` with `background:` inline style.
- [ ] **Step 18.2:** Run `npm test`; expect green.
- [ ] **Step 18.3:** Commit `test: PB-027 add end-to-end brutalist flavor render test`.

### Task 19: Update `main-spec.md` and `CHANGELOG.md`

**Files:**
- Modify: `docs/specs/main-spec.md`
- Modify: `docs/CHANGELOG.md`

- [ ] **Step 19.1:** Locate the FR in `main-spec.md` that enumerates bundled flavors (introduced by PB-026, likely FR-38). Update it to list `classic` and `brutalist`. Add `> Updated 2026-MM-DD via feature: PB-027 brutalist cover flavor` marker.
- [ ] **Step 19.2:** Document `ThumbnailInput.sourceDomain?` and `CoverFlavor.titleWrap?` in whichever FR specifies the cover contract (FR-37/FR-38).
- [ ] **Step 19.3:** Append a CHANGELOG entry: top-level "PB-027: brutalist flavor added" plus one bullet per spec section touched.
- [ ] **Step 19.4:** Commit `docs: PB-027 sync main-spec and CHANGELOG for brutalist flavor`.

### Task 20: Move plan + feature to done, mark STATUS

**Files:**
- Modify: `docs/STATUS.md`
- Move: `docs/features/active/PB-027-brutalist-cover-flavor.md` → `docs/features/done/PB-027-YYYY-MM-DD-brutalist-cover-flavor.md`
- Move: `docs/plans/active/PB-027-brutalist-cover-flavor.md` → `docs/plans/done/PB-027-YYYY-MM-DD-brutalist-cover-flavor.md`

- [ ] **Step 20.1:** Run the full Pre-PR checklist from `CLAUDE.md`. All boxes must be checked.
- [ ] **Step 20.2:** Run `npm test` and `npm run sonar:local`; resolve bugs/vulnerabilities; confirm hotspots are safe.
- [ ] **Step 20.3:** Update `STATUS.md`: remove PB-027 from Backlog/Active Work, add to Completed with the date and plan-archive path.
- [ ] **Step 20.4:** Move feature and plan files to `done/` with the YYYY-MM-DD prefix following existing convention.
- [ ] **Step 20.5:** Mark the feature doc status field "Complete" with completion date. Mark the design doc status "Complete" (or "Updated During Implementation" if the design diverged).
- [ ] **Step 20.6:** Verify file movements with the commands in `CLAUDE.md`'s Pre-PR verification step.
- [ ] **Step 20.7:** Ask the user before creating the PR.

---

## Verification (end-to-end manual smoke)

After Phase 3 lands, before Phase 4 fixtures are finalized:

1. Set `PAPERBOY_COVER_FLAVOR=brutalist` in `.env`.
2. Run `npm run cli -- --title "Sample Article" --file test-fixture.md` against a small markdown file.
3. Open the resulting EPUB on a Kindle (or a desktop EPUB reader) and confirm:
   - The library thumbnail shows the brutalist masthead + accent footer + paperboy mascot on a paper backplate.
   - The first chapter's title page mirrors the thumbnail's visual identity with uppercase title and accent footer.
   - The accent color is consistent between thumbnail and chapter for the same article.

If any visual issue surfaces, fix in the relevant `flavors/brutalist/*.ts` file and refresh the fixture in Task 17.5.

---

## Rollback

If something breaks beyond easy fix:

- Revert the `FLAVORS` map entry in `flavors/index.ts` — config still rejects `brutalist`, no users affected.
- Revert the `ThumbnailInput.sourceDomain?` and `CoverFlavor.titleWrap?` additions in `src/domain/ports.ts` — they are optional fields, removing them affects only brutalist code.
- Brutalist flavor folder can stay in the tree dormant; it imports cleanly and runs through type-check but is unreachable without the registry entry.

No data migration concerns. No EPUBs in flight depend on brutalist.
