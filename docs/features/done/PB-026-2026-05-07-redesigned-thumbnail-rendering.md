# PB-026: Redesigned Thumbnail Rendering

**Status:** Complete
**Date:** 2026-05-06
**Completed:** 2026-05-07

## Motivation

Paperboy embeds a 600×900 JPEG cover image inside every generated EPUB so each article gets a recognizable tile in the Kindle library grid. The current thumbnail is built from a hand-written SVG template (`cover-templates.ts:buildCoverSvg`) and rasterized with `sharp`. This pipeline has served the MVP, but it has reached a ceiling that's now blocking design improvements:

1. **Visual ceiling.** The current thumbnail is functional but visually dated: centered title, single accent color, embedded raster icon, no real layout system. Iterating on the design means hand-editing SVG `<text>` elements with hard-coded `x`/`y` coordinates and recomputing line offsets manually whenever the title wraps.
2. **No layout primitives.** SVG-as-layout has no flexbox/box model. Anything resembling responsive composition (header band, padded content area, justified text, multi-column author/source line) requires re-deriving coordinates by hand, which is tedious and error-prone.
3. **Poor design-review feedback loop.** Asking a designer for help means handing them an SVG template they can't easily modify (most designers think in HTML/CSS, Figma, or design tools — not raw SVG with manual coordinate math). The output of any redesign has to be re-translated by an engineer back into the SVG template.
4. **Identity drift between thumbnail and title page.** The title page (HTML chapter rendered by Kindle) and the thumbnail (rasterized SVG) are authored in two different languages. Keeping them visually consistent — same palette, same typographic scale, same identity — requires duplicating intent across HTML/CSS and SVG, and the two drift apart over time.

The goal of this feature is to **change how the thumbnail and the title page are rendered** so the design surface becomes HTML/CSS-compatible, and to introduce a **flavor system** that lets multiple visual designs coexist and be selected per article — making it cheaper to iterate visually, easier to share with a designer, and easier to keep visually aligned with the title page.

A second motivation, surfaced during design review: as Paperboy is used for different kinds of source material (long-form essays, news clippings, technical docs, fiction), one fixed visual identity is too rigid. Different content types deserve different visual treatments, but a per-article custom design is too much work. **Flavors** sit between those extremes: a small set of pre-built designs the user picks from per article (or globally as a default).

## Scope

Replace the current SVG-authoring approach for the Kindle library thumbnail with an HTML/CSS-authoring approach. The output of the system is unchanged — still a 600×900 JPEG embedded in the EPUB at `cover.jpg`, plus an HTML title-page chapter — but the **input** the developer or designer writes is HTML and CSS instead of SVG with manual coordinate placement, and the templates are organized into selectable **flavors**.

In scope:

- Thumbnail authoring switches from raw SVG to an HTML/CSS-style template.
- Thumbnail rendering pipeline produces the same 600×900 JPEG artifact embedded in the EPUB.
- Title wrapping continues to work for 1–4 line titles without manual coordinate adjustment.
- The fixture-based test workflow (`test/fixtures/covers/sample-cover.*`) continues to work — designers can still preview the thumbnail standalone.
- The container image, CLI startup time, and watcher startup time stay within acceptable bounds for a single-user tool — no heavyweight runtime additions that double or triple the Docker image size.
- **A flavor system** lets multiple thumbnail + title-page designs coexist. Each flavor is a self-contained set of template files (thumbnail builder, chapter HTML builder, chapter CSS) decoupled from the rendering implementation (Satori, sharp, epub-gen-memory).
- **Global flavor selection** via env var (`PAPERBOY_COVER_FLAVOR`). A single flavor is selected for the entire Paperboy install; every article uses it. Per-article override is **out of scope** for this feature.
- **At least one bundled flavor** ships with this feature (the default — visually matching the current design so the cut-over is neutral). Adding more flavors after the cut-over is a simple, isolated change.
- The title-page chapter (HTML) authoring is brought into the flavor system alongside the thumbnail. The two artifacts stop drifting apart because they are co-located inside one flavor file/folder.
- **Selectable target resolution** for the JPEG thumbnail. The user picks one of three predefined Kindle resolutions via env var: **1264 × 1680 (default)**, **1072 × 1448**, or **600 × 800**. The current MVP renders at a single fixed 600 × 900 size; this widens the support to match the actual Kindle screen sizes shipped over the last decade.

Out of scope:

- Designing the actual new visual flavors. This feature delivers the *mechanism* (the flavor system + the rendering pipeline). Each new visual flavor is a separate, lightweight follow-up — adding one folder of templates and one registry entry.
- Free-form theme/palette configuration by end users (custom colors, fonts, etc.). Users pick from the bundled flavor list; they don't author flavors via configuration.
- **Per-article flavor override.** This v1 has a single global flavor set via env var; an article cannot opt into a different flavor through frontmatter or any other per-document mechanism. Per-article selection is a possible follow-up if the use case justifies it.
- **Custom cover resolutions.** Only the three predefined Kindle resolutions are accepted. Arbitrary widths/heights are not supported.
- **Per-article resolution override.** Resolution is a global setting like flavor.
- Per-article custom thumbnails extracted from article images or remote sources.
- Replacing the existing image-processing or EPUB-assembly pipelines.
- Discovering flavors dynamically from disk at runtime. Flavors are statically registered at compile time (one entry per flavor in a typed registry); adding a flavor requires a code change, not a config change.

## Acceptance Criteria

**Rendering pipeline:**
- [ ] The thumbnail authoring file (or files) consists of HTML and CSS — not raw SVG with hand-placed coordinates.
- [ ] Generating an EPUB produces a JPEG embedded as `cover.jpg` at the configured resolution (default 1264 × 1680).
- [ ] Title wrapping (1–4 lines) works without any manual coordinate adjustment in the template — the layout reflows as the line count changes.
- [ ] The existing `sample-cover.svg` fixture is replaced or supplemented by an inspectable artifact that a designer can open and modify, **per flavor**.
- [ ] The fixture comparison test (`cover-generator.test.ts`) continues to detect regressions when the thumbnail authoring file changes, **for every bundled flavor**.

**Resolution selection:**
- [ ] The active resolution is selected via the `PAPERBOY_COVER_RESOLUTION` environment variable. Accepted values are exactly `1264x1680`, `1072x1448`, and `600x800`.
- [ ] If `PAPERBOY_COVER_RESOLUTION` is unset, the default resolution `1264x1680` is used.
- [ ] An unrecognized resolution value fails fast at startup with a `ConfigError` listing the accepted options.
- [ ] Each bundled flavor renders correctly at all three resolutions. "Correctly" means: produces valid SVG/JPEG, layout does not collapse, title text remains readable.

**Flavor system:**
- [ ] Each flavor is a self-contained set of template files containing a thumbnail builder, a chapter HTML builder, and chapter CSS — none of which depend on Satori, sharp, or epub-gen-memory directly. Templates depend only on a small typed contract defined by Paperboy.
- [ ] Flavors are registered statically in a typed registry; adding a flavor is a single-file addition plus one registry line.
- [ ] The active flavor is selected via the `PAPERBOY_COVER_FLAVOR` environment variable. Configuration validation fails fast at startup if the value names a flavor that isn't registered; the error message lists the valid flavor names.
- [ ] If `PAPERBOY_COVER_FLAVOR` is unset, the default flavor (`classic`) is used.
- [ ] A `classic` (or equivalently named) flavor ships with this feature, visually matching today's output, and is the default.
- [ ] Adding a second flavor inside this feature is **not required** — but the design must demonstrate that doing so requires no engine changes.

**Performance, packaging, quality:**
- [ ] The Docker image size grows by **no more than ~10 MB** versus the current image. Heavyweight additions (full headless browser engines) are excluded.
- [ ] Thumbnail generation time stays under **200 ms per article** on the existing CI hardware. CLI/MCP one-shot invocations do not regress noticeably.
- [ ] The feature works on both x86_64 and ARM64 Alpine containers (current deployment targets).
- [ ] Existing test suite (337 tests) continues to pass.
- [ ] No new `any` types, `as` assertions, or `@ts-ignore` directives are introduced (project TypeScript strictness rule).
- [ ] No supply-chain regressions: `npm audit` clean, no postinstall scripts that download untrusted binaries at install time.

## Open Questions for Design

These are decisions the design doc (next pipeline step) is expected to resolve — listed here so the design phase has clear inputs:

- Which rendering library satisfies the size/speed/expressiveness constraints above (the conversation that produced this feature converged on Vercel's Satori as the most likely candidate, but the design phase should validate that and consider alternatives like `@resvg/resvg-js` for SVG-only rasterization or `puppeteer-core` with a system Chromium, and document the tradeoff).
- How the thumbnail template integrates with the existing `CoverGenerator` API (`generateImage`, `generateCoverSvg`) without breaking call sites in `MarkdownEpubConverter`.
- How the fixture file format should change (HTML standalone, JSX-source plus rendered SVG, etc.) to keep the designer-feedback workflow working — and whether each flavor needs its own fixture pair.
- The exact shape of the flavor contract — whether a flavor is a single TypeScript module exporting three functions, a folder with three files, or some other layout — and how flavors share or duplicate primitives like fonts, icons, and color tokens.

## Relationship to Other Tools

- **PB-008 (EPUB Cover Generation)** — direct predecessor. PB-008 introduced the current SVG-based thumbnail. This feature changes the rendering approach without changing the artifact's role in the EPUB, and adds the flavor system on top.
