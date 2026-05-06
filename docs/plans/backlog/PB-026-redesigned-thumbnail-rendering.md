# PB-026: Redesigned Thumbnail Rendering — Implementation Plan

**Goal:** Replace the hand-written SVG thumbnail template with an HTML/CSS template rendered by Satori, introduce a flavor system that decouples cover templates (thumbnail + chapter) from the renderer, and make the thumbnail resolution selectable from three predefined Kindle sizes.

**Architecture:** see `docs/designs/PB-026-redesigned-thumbnail-rendering/design.md`. Three-phase migration:

1. **Contract + registry skeleton** — domain interfaces, `CoverResolution` value type, empty `flavors/` tree. No behavior change.
2. **`classic` flavor + Satori cut-over** — port today's templates into `flavors/classic/`, switch `CoverGenerator` to Satori, update `MarkdownEpubConverter` and composition roots, refresh fixtures, delete `cover-templates.ts`.
3. **Config wiring** — `PAPERBOY_COVER_FLAVOR` and `PAPERBOY_COVER_RESOLUTION` env vars in `loadConfig()` with fail-fast validation; `.env.example` update.

**Tech additions:**
- `satori` (Vercel) — JSX/HTML → SVG, ~3 MB
- One bundled font: Source Serif 4 regular (~300 KB)
- `scripts/verify-assets` postbuild script (asset presence guard)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Add | `package.json` (dep) | Add `satori` dependency |
| Create | `src/domain/values/cover-resolution.ts` | `CoverResolution`, `COVER_RESOLUTIONS`, `isCoverResolutionName`, `getCoverResolution`, `listCoverResolutionNames` |
| Modify | `src/domain/ports.ts` | Add `CoverFlavor`, `ThumbnailInput`, `ChapterInput`, `SatoriNode`, `SatoriStyle` interfaces |
| Create | `src/infrastructure/converter/flavors/index.ts` | Static registry (`FLAVORS`, `getFlavor`, `isFlavorName`, `listFlavorNames`) |
| Create | `src/infrastructure/converter/flavors/_shared/tokens.ts` | Color and typography constants used by `classic` |
| Create | `src/infrastructure/converter/flavors/_shared/fonts.ts` | Loads Source Serif 4 buffer once; exports for flavors |
| Create | `src/infrastructure/converter/flavors/_shared/icon.ts` | Loads `cover-icon.png` once and exposes a base64 data URI |
| Create | `src/infrastructure/converter/flavors/_shared/scale.ts` | `scale(width, designWidth, value)` proportional helper |
| Create | `src/infrastructure/converter/flavors/classic/index.ts` | Exports the `classic` `CoverFlavor` object |
| Create | `src/infrastructure/converter/flavors/classic/thumbnail.ts` | `buildThumbnail()` returning a Satori node tree (replaces `buildCoverSvg`) |
| Create | `src/infrastructure/converter/flavors/classic/chapter.ts` | `buildHtmlChapter()` (ports `buildHtmlChapter` from `cover-templates.ts`) |
| Create | `src/infrastructure/converter/flavors/classic/css.ts` | `buildCoverCss()` (ports `buildCoverCss` from `cover-templates.ts`) |
| Create | `src/infrastructure/converter/flavors/classic/fixtures/sample-thumbnail.svg` | Per-flavor designer fixture (Satori SVG) |
| Create | `src/infrastructure/converter/flavors/classic/fixtures/sample-cover.html` | Per-flavor designer fixture (HTML+CSS preview) |
| Create | `src/infrastructure/converter/assets/fonts/source-serif-regular.ttf` | Bundled font for Satori |
| Create | `scripts/verify-assets.mjs` | Postbuild guard: fail if `dist/.../assets/cover-icon.png` or `dist/.../assets/fonts/source-serif-regular.ttf` is missing |
| Modify | `package.json` | Wire `verify-assets` into `postbuild` |
| Modify | `src/infrastructure/converter/cover-generator.ts` | Take `CoverFlavor` and `CoverResolution`; render via Satori; load font(s) at construction |
| Modify | `src/infrastructure/converter/markdown-epub-converter.ts` | Constructor takes `flavor` + `resolution`; pass through to `CoverGenerator` calls |
| Modify | `src/infrastructure/config.ts` | Validate `PAPERBOY_COVER_FLAVOR` (default `classic`) and `PAPERBOY_COVER_RESOLUTION` (default `1264x1680`); expose on `Config` |
| Modify | `src/index.ts` | Resolve flavor + resolution from config; pass into converter |
| Modify | `src/cli-entry.ts` | Same |
| Modify | `src/watch-entry.ts` | Same |
| Modify | `.env.example` | Document `PAPERBOY_COVER_FLAVOR` and `PAPERBOY_COVER_RESOLUTION` |
| Modify | `eslint.config.*` | Add `import/no-restricted-paths` boundary rule for `flavors/<name>/` |
| Delete | `src/infrastructure/converter/cover-templates.ts` | Content moves into `flavors/classic/` |
| Delete | `test/fixtures/covers/sample-cover.html` | Replaced by per-flavor fixture |
| Delete | `test/fixtures/covers/sample-cover.svg` | Replaced by per-flavor fixture |
| Modify | `test/infrastructure/converter/cover-generator.test.ts` | Iterate flavors; pass flavor + resolution arguments; resolution-coverage tests |
| Modify | `test/infrastructure/converter/markdown-epub-converter.test.ts` | Pass `flavor` + `resolution` to converter constructor |
| Create | `test/infrastructure/converter/flavors/registry.test.ts` | `listFlavorNames`, `getFlavor`, `isFlavorName` behavior |
| Create | `test/domain/values/cover-resolution.test.ts` | `isCoverResolutionName`, `getCoverResolution`, `listCoverResolutionNames` |
| Modify | `test/infrastructure/config.test.ts` | Cases for both new env vars: valid, default-when-unset, invalid → `ConfigError` |
| Modify | `docs/STATUS.md` | Move PB-026 to Active Work / In Progress; reference plan file |

---

## Phase 1 — Contract and registry skeleton

No behavior change in this phase. The new types and empty registry compile and pass type-checks; nothing imports them yet.

### Task 1: Add `CoverResolution` value type

**Files:**
- Create: `src/domain/values/cover-resolution.ts`
- Create: `test/domain/values/cover-resolution.test.ts`

- [ ] **Step 1.1: Write failing tests** — assert `listCoverResolutionNames()` returns `["1264x1680", "1072x1448", "600x800"]`, `getCoverResolution("1264x1680")` returns `{ name, width: 1264, height: 1680 }`, `isCoverResolutionName("1280x800")` is `false`, `isCoverResolutionName("1264x1680")` is `true`.
- [ ] **Step 1.2: Implement** `cover-resolution.ts` per the design (`COVER_RESOLUTIONS` `as const`, `CoverResolutionName = keyof typeof COVER_RESOLUTIONS`, four exported helpers).
- [ ] **Step 1.3: Run** `npm test test/domain/values/cover-resolution.test.ts`; expect green.
- [ ] **Step 1.4: Commit** `feat: PB-026 add CoverResolution value type`.

### Task 2: Add flavor contract to `domain/ports.ts`

**Files:**
- Modify: `src/domain/ports.ts`

- [ ] **Step 2.1: Add interfaces** — `CoverFlavor`, `ThumbnailInput` (incl. `width: number; height: number`), `ChapterInput`, `SatoriNode`, `SatoriStyle` (Paperboy-owned, listing the CSS subset Satori supports — flexbox, padding/margin, borders, color, fontFamily, fontSize, fontWeight, lineHeight, letterSpacing, textTransform, textAlign, opacity, transform, background gradients, borderRadius). No `any`, no `as`.
- [ ] **Step 2.2: Run** `npm run build`; expect clean compilation.
- [ ] **Step 2.3: Commit** `feat: PB-026 add CoverFlavor contract to domain ports`.

### Task 3: Create `flavors/` skeleton

**Files:**
- Create: `src/infrastructure/converter/flavors/index.ts`
- Create: `src/infrastructure/converter/flavors/_shared/tokens.ts`
- Create: `src/infrastructure/converter/flavors/_shared/fonts.ts`
- Create: `src/infrastructure/converter/flavors/_shared/icon.ts`
- Create: `src/infrastructure/converter/flavors/_shared/scale.ts`
- Create: `test/infrastructure/converter/flavors/registry.test.ts`

- [ ] **Step 3.1: Write failing registry test** — `listFlavorNames()` returns at least `["classic"]`; `getFlavor("classic")` returns a value with `buildThumbnail`, `buildHtmlChapter`, `buildCoverCss`; `isFlavorName("nope")` is `false`.
- [ ] **Step 3.2: Implement `_shared/`:**
  - `tokens.ts` — color and typography constants (`COLOR_BG`, `COLOR_ACCENT`, etc., taken from today's hard-coded values in `cover-templates.ts`).
  - `fonts.ts` — reads `assets/fonts/source-serif-regular.ttf` once via `readFileSync` + `import.meta.url`; exports a `Buffer`. Add a deferred-load TODO if the file isn't bundled yet (Task 5 bundles it).
  - `icon.ts` — moves the icon-loading logic from today's `CoverGenerator` constructor into a shared helper; exports `iconDataUri()` returning `data:image/png;base64,...`.
  - `scale.ts` — exports `scale(canvasWidth: number, designWidth: number, value: number): number` returning `Math.round(value * canvasWidth / designWidth)`.
- [ ] **Step 3.3: Implement `flavors/index.ts`** — empty registry first: `const FLAVORS = {} as const satisfies Record<string, CoverFlavor>`. The `classic` flavor lands in Phase 2; the registry test will fail until then. Note: leave the registry test in `it.skip` until Task 6 lands `classic`.
- [ ] **Step 3.4: Run** `npm run build`; expect clean compilation.
- [ ] **Step 3.5: Commit** `feat: PB-026 add flavors registry skeleton + _shared helpers`.

---

## Phase 2 — `classic` flavor and Satori cut-over

This phase changes runtime behavior: the renderer switches from hand-authored SVG to Satori. Visual output for the `classic` flavor is intended to match today's design, but byte-for-byte equivalence with the old SVG is **not** expected (different layout engine).

### Task 4: Install `satori` dependency

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 4.1:** `npm install satori --save`. Verify the version landed in `package.json` and `package-lock.json`.
- [ ] **Step 4.2:** `npm audit` — clean.
- [ ] **Step 4.3:** Commit `chore: PB-026 add satori dependency`.

### Task 5: Bundle Source Serif 4 font + verify-assets script

**Files:**
- Create: `src/infrastructure/converter/assets/fonts/source-serif-regular.ttf`
- Create: `scripts/verify-assets.mjs`
- Modify: `package.json` (postbuild hook)

- [ ] **Step 5.1:** Download Source Serif 4 regular 400 TTF (Adobe Fonts repo on GitHub, SIL OFL). Place at `src/infrastructure/converter/assets/fonts/source-serif-regular.ttf`. Verify license file is committed if required by OFL terms (typically `OFL.txt` next to the font).
- [ ] **Step 5.2:** Write `scripts/verify-assets.mjs` — checks that `dist/infrastructure/converter/assets/cover-icon.png` and `dist/infrastructure/converter/assets/fonts/source-serif-regular.ttf` both exist and are non-empty; exits 1 with a helpful message if not.
- [ ] **Step 5.3:** Update `package.json` `scripts.postbuild`: chain the existing asset-copy with `node scripts/verify-assets.mjs`.
- [ ] **Step 5.4:** `npm run build`; expect both assets present in `dist/`.
- [ ] **Step 5.5:** Commit `feat: PB-026 bundle Source Serif font + add verify-assets postbuild guard`.

### Task 6: Implement `classic` flavor

**Files:**
- Create: `src/infrastructure/converter/flavors/classic/index.ts`
- Create: `src/infrastructure/converter/flavors/classic/css.ts`
- Create: `src/infrastructure/converter/flavors/classic/chapter.ts`
- Create: `src/infrastructure/converter/flavors/classic/thumbnail.ts`
- Modify: `src/infrastructure/converter/flavors/index.ts` (register `classic`)
- Un-skip: registry test in Task 3

- [ ] **Step 6.1: Port `css.ts`** — copy the body of today's `buildCoverCss()` from `cover-templates.ts`. Replace inline color hex codes with imports from `_shared/tokens.ts`.
- [ ] **Step 6.2: Port `chapter.ts`** — copy the body of today's `buildHtmlChapter()` from `cover-templates.ts`. Signature changes from `(title, author, domain)` to `(input: ChapterInput)` per the new contract; inside, destructure to `title`, `author`, `sourceDomain`.
- [ ] **Step 6.3: Implement `thumbnail.ts`** — replace today's `buildCoverSvg` with a `buildThumbnail(input: ThumbnailInput): SatoriNode` function. Use flexbox layout (`display: "flex"`, `flexDirection: "column"`, `alignItems: "center"`, `justifyContent: "center"`), proportional sizing via `scale(input.width, 600, baseSize)` for typography. Render kicker ("PAPERBOY"), title lines (one `<div>` per `titleLines[i]`), rule (a `<div>` with `width`, `height`, `background`), author, and the icon (`<img src={input.iconDataUri}>`).
- [ ] **Step 6.4: Implement `flavors/classic/index.ts`** — exports the `CoverFlavor` object: `{ name: "classic", buildThumbnail, buildHtmlChapter, buildCoverCss }`.
- [ ] **Step 6.5: Register in `flavors/index.ts`** — replace the empty registry with `{ classic } as const satisfies Record<string, CoverFlavor>`. Un-skip Task 3's registry test.
- [ ] **Step 6.6: Run** `npm test test/infrastructure/converter/flavors/registry.test.ts`; expect green.
- [ ] **Step 6.7: Run** `npm run build`; expect clean.
- [ ] **Step 6.8: Commit** `feat: PB-026 add classic flavor with thumbnail/chapter/css templates`.

### Task 7: Update `CoverGenerator` to use flavor + resolution + Satori

**Files:**
- Modify: `src/infrastructure/converter/cover-generator.ts`
- Modify: `test/infrastructure/converter/cover-generator.test.ts`

- [ ] **Step 7.1: Update tests first** — modify each existing test to pass `getFlavor("classic")` and `getCoverResolution("1264x1680")` as arguments to the corresponding methods. The byte-comparison fixture test stays for now but its fixture path moves to `flavors/classic/fixtures/sample-thumbnail.svg`. Add the new tests:
  - **Determinism**: render `generateCoverSvg(classic, res, input)` twice; assert byte equality.
  - **Multi-resolution**: render at all three resolutions; for each assert valid SVG (parseable, contains expected text spans for the title) and a valid JPEG (magic bytes, non-empty).
  - **Layout** (1-line vs 4-line title): both produce valid SVG with the expected number of title text spans.
  Tests should fail to compile or run because `CoverGenerator`'s signatures haven't changed yet.
- [ ] **Step 7.2: Update `CoverGenerator`:**
  - Constructor: load font buffer from `_shared/fonts.ts` once.
  - `generateCoverCss(flavor: CoverFlavor): string` → `flavor.buildCoverCss()`
  - `generateHtmlChapter(flavor: CoverFlavor, input: ChapterInput): string` → `flavor.buildHtmlChapter(input)`
  - `generateCoverSvg(flavor: CoverFlavor, resolution: CoverResolution, input: ThumbnailContent): string` → calls `satori(flavor.buildThumbnail({ ...input, width, height }), { width, height, fonts: this.fonts })`
  - `generateImage(flavor, resolution, input): Promise<Buffer>` → `sharp(generateCoverSvg(...)).jpeg({ quality: 90 }).toBuffer()`
  - `ThumbnailContent` type alias: `Omit<ThumbnailInput, "width" | "height">`
- [ ] **Step 7.3: Run** `npm test test/infrastructure/converter/cover-generator.test.ts`; iterate until green. The byte-comparison fixture test will fail on the first run because Satori output differs from today's hand-authored SVG — refresh the fixture in Task 9 (deliberately deferred so refresh is the last step).
- [ ] **Step 7.4: Commit** `feat: PB-026 switch CoverGenerator to flavor + Satori rendering`.

### Task 8: Update `MarkdownEpubConverter` and composition roots

**Files:**
- Modify: `src/infrastructure/converter/markdown-epub-converter.ts`
- Modify: `test/infrastructure/converter/markdown-epub-converter.test.ts`
- Modify: `src/index.ts`
- Modify: `src/cli-entry.ts`
- Modify: `src/watch-entry.ts`

- [ ] **Step 8.1: Update converter tests first** — pass `getFlavor("classic")` and `getCoverResolution("1264x1680")` to the constructor. Update the assertions on `fakeCoverGenerator.generateImage` and `fakeCoverGenerator.generateHtmlChapter` to expect the new signatures (flavor and resolution arguments). Tests fail because constructor still takes only `imageProcessor` and `coverGenerator`.
- [ ] **Step 8.2: Update converter:**
  - Constructor: add `private readonly flavor: CoverFlavor` and `private readonly resolution: CoverResolution`.
  - `toEpub`: call `this.coverGenerator.generateImage(this.flavor, this.resolution, { titleLines, author, iconDataUri })`, `generateHtmlChapter(this.flavor, { title, author, sourceDomain })`, `generateCoverCss(this.flavor)`.
- [ ] **Step 8.3: Update composition roots** — in each of `index.ts`, `cli-entry.ts`, `watch-entry.ts`, after `loadConfig()`:
  ```ts
  const flavor = getFlavor(config.defaultCoverFlavor);
  const resolution = config.coverResolution;
  const converter = new MarkdownEpubConverter(imageProcessor, coverGenerator, flavor, resolution);
  ```
  (Note: `config.defaultCoverFlavor` and `config.coverResolution` are added in Phase 3. Until then, hard-code: `getFlavor("classic")` and `getCoverResolution("1264x1680")`. Replace in Task 11.)
- [ ] **Step 8.4: Run** `npm run build` and `npm test`; iterate until green (excluding the fixture comparison test).
- [ ] **Step 8.5: Commit** `feat: PB-026 thread flavor + resolution through converter and composition roots`.

### Task 9: Refresh per-flavor fixtures and delete legacy

**Files:**
- Create: `src/infrastructure/converter/flavors/classic/fixtures/sample-thumbnail.svg`
- Create: `src/infrastructure/converter/flavors/classic/fixtures/sample-cover.html`
- Modify: `test/infrastructure/converter/cover-generator.test.ts` (point fixture test at new path; iterate `listFlavorNames()`)
- Delete: `src/infrastructure/converter/cover-templates.ts`
- Delete: `test/fixtures/covers/sample-cover.html`
- Delete: `test/fixtures/covers/sample-cover.svg`
- Delete: `test/fixtures/covers/` (if empty)

- [ ] **Step 9.1:** Update the fixture comparison test to iterate `listFlavorNames()` and read fixtures from `src/infrastructure/converter/flavors/<name>/fixtures/`. Use `UPDATE_COVER_FIXTURE=1` to write missing or stale fixtures.
- [ ] **Step 9.2:** Run `UPDATE_COVER_FIXTURE=1 npx vitest run test/infrastructure/converter/cover-generator.test.ts` to bootstrap `flavors/classic/fixtures/sample-thumbnail.svg` and `sample-cover.html`.
- [ ] **Step 9.3:** Open `flavors/classic/fixtures/sample-cover.html` in a browser; sanity-check it visually matches today's title page.
- [ ] **Step 9.4:** Open `flavors/classic/fixtures/sample-thumbnail.svg` in a browser; sanity-check the thumbnail looks right at the new 1264 × 1680 default.
- [ ] **Step 9.5:** Delete `cover-templates.ts` and `test/fixtures/covers/`. Confirm no remaining imports of the deleted file via `grep` / IDE search.
- [ ] **Step 9.6:** Run `npm run build` and `npm test`; full suite passes.
- [ ] **Step 9.7:** Commit `feat: PB-026 refresh per-flavor fixtures, delete cover-templates.ts`.

### Task 10: Add ESLint boundary rule for `flavors/<name>/`

**Files:**
- Modify: ESLint config (likely `eslint.config.js` or equivalent)

- [ ] **Step 10.1:** Add an `import/no-restricted-paths` rule (or equivalent — check existing config) so files under `src/infrastructure/converter/flavors/<name>/` may import only from:
  - `src/domain/ports`
  - `src/domain/values/cover-resolution`
  - `src/infrastructure/converter/flavors/_shared/`
  - Standard library (`node:fs`, `node:path`, etc.)
  And explicitly **not** from Satori, sharp, epub-gen-memory, or other infrastructure modules.
- [ ] **Step 10.2:** Run `npm run lint` (or equivalent); confirm the rule activates without breaking `classic`.
- [ ] **Step 10.3:** Add a deliberately-failing experiment locally to verify the rule fires (e.g., `import sharp from "sharp"` in `classic/thumbnail.ts`); revert before commit.
- [ ] **Step 10.4:** Commit `chore: PB-026 add lint boundary preventing flavors from coupling to renderer`.

---

## Phase 3 — Config wiring

### Task 11: Validate `PAPERBOY_COVER_FLAVOR` and `PAPERBOY_COVER_RESOLUTION` in `loadConfig()`

**Files:**
- Modify: `src/infrastructure/config.ts`
- Modify: `test/infrastructure/config.test.ts`
- Modify: `src/index.ts`, `src/cli-entry.ts`, `src/watch-entry.ts` (replace hard-coded flavor/resolution from Task 8 with config values)

- [ ] **Step 11.1: Write failing tests** — six cases total in `config.test.ts`:
  - `PAPERBOY_COVER_FLAVOR=classic` → `config.defaultCoverFlavor === "classic"`
  - unset → defaults to `"classic"`
  - `=unknown` → `ConfigError` listing valid flavor names
  - `PAPERBOY_COVER_RESOLUTION=1072x1448` → `config.coverResolution.width === 1072`
  - unset → defaults to `1264x1680`
  - `=2000x3000` → `ConfigError` listing valid resolution names
- [ ] **Step 11.2: Update `loadConfig()`** — read both env vars, validate via `isFlavorName` / `isCoverResolutionName`, return `ConfigError` with helpful messages. Add `defaultCoverFlavor: FlavorName` and `coverResolution: CoverResolution` to the `Config` type.
- [ ] **Step 11.3: Replace the hard-coded composition-root values from Task 8** with `config.defaultCoverFlavor` and `config.coverResolution` lookups.
- [ ] **Step 11.4:** Run full test suite — green.
- [ ] **Step 11.5:** Commit `feat: PB-026 validate cover flavor and resolution env vars at startup`.

### Task 12: Update `.env.example`

**Files:**
- Modify: `.env.example`

- [ ] **Step 12.1:** Add a "Cover (PB-026)" section documenting both env vars with their defaults, valid values, and a brief explanation of what each controls.
- [ ] **Step 12.2:** Commit `docs: PB-026 document PAPERBOY_COVER_FLAVOR and PAPERBOY_COVER_RESOLUTION in .env.example`.

---

## Phase 4 — Final validation and sync

### Task 13: Full validation

- [ ] **Step 13.1:** `npm run build` — clean.
- [ ] **Step 13.2:** `npm test` — all tests pass; expect ≥340 passing (337 prior + new).
- [ ] **Step 13.3:** `npm run sonar:local` — review issues; resolve any new bugs/vulnerabilities introduced; confirm hotspots are safe.
- [ ] **Step 13.4: End-to-end smoke test** — generate an EPUB through the CLI (`paperboy --title "Smoke Test" --file scripts/sample.md`), open it on a real Kindle device, verify:
  - Library thumbnail visible with the new design.
  - Title page renders as expected.
  - Source domain visible when frontmatter `url` is present.
- [ ] **Step 13.5: Resolution smoke test** — repeat 13.4 with `PAPERBOY_COVER_RESOLUTION=600x800` and `=1072x1448`; confirm each renders without layout collapse.
- [ ] **Step 13.6: Flavor failure smoke test** — set `PAPERBOY_COVER_FLAVOR=nonexistent`; confirm process exits at startup with the expected `ConfigError` message.

### Task 14: Sync — STATUS.md, plan/feature movement

**Files:**
- Modify: `docs/STATUS.md`
- Move: `docs/features/active/PB-026-redesigned-thumbnail-rendering.md` → `docs/features/done/PB-026-2026-MM-DD-redesigned-thumbnail-rendering.md`
- Move: `docs/plans/active/PB-026-redesigned-thumbnail-rendering.md` → `docs/plans/done/PB-026-2026-MM-DD-redesigned-thumbnail-rendering.md`
- Modify: `docs/CHANGELOG.md` (append completion entry)
- Modify: `docs/features/done/PB-026-...md` — flip Status field to `Complete` with completion date

- [ ] **Step 14.1:** Mark every task `[x]` in this plan with completion date.
- [ ] **Step 14.2:** Move feature and plan to `done/` per CLAUDE.md naming convention.
- [ ] **Step 14.3:** Update `STATUS.md`: remove PB-026 from Active Work, add to Completed table with date and plan-archive link.
- [ ] **Step 14.4:** Append CHANGELOG entry: feature complete summary (visual change at the default 1264 × 1680 resolution; flavor system available for future extension; legacy `cover-templates.ts` removed).
- [ ] **Step 14.5: Pre-PR checklist** (CLAUDE.md): all tasks closed, fixtures committed, sonar reviewed, ready for PR.
- [ ] **Step 14.6:** Open PR (only after explicit user approval per CLAUDE.md rule 15).

---

## Verification Reference (per design constraints)

After Phase 3, before opening the PR, verify these design-level claims hold:

- [ ] Docker image growth ≤ 10 MB versus pre-feature baseline. Measure: `docker build` before and after; compare image sizes.
- [ ] Render time at default resolution ≤ 200 ms per article. Measure: log timestamps in `MarkdownEpubConverter.toEpub` around the cover-generation block; convert one representative article; assert.
- [ ] All bundled flavors render correctly at all three resolutions (Task 7's multi-resolution test).
- [ ] No new `any`, `as`, or `@ts-ignore` introduced. Audit: `grep -nE "\bany\b|@ts-ignore|@ts-expect-error|\bas \b" src/` shows no new entries from this branch.
- [ ] `npm audit` clean.
- [ ] `flavors/classic/` imports nothing from Satori or sharp (lint rule from Task 10 enforces).

---

## Open Questions (deferred from design)

These do not block implementation but should be revisited during build:

- **OQ-4: Cover icon raster vs vector** — at 1264 × 1680 the bundled PNG icon may look soft. If so, file a follow-up; do not expand scope here.
- **OQ-9: Per-flavor scaling** — the `_shared/scale.ts` helper is sufficient for `classic`. Re-evaluate when a second flavor lands.
