# PB-026: Redesigned Thumbnail Rendering — Design

**Status:** Draft
**Date:** 2026-05-06
**Spec:** docs/specs/main-spec.md (FR-37 will be updated)
**Feature:** docs/features/active/PB-026-redesigned-thumbnail-rendering.md

## Summary

Replace the hand-written SVG template that produces Paperboy's Kindle library thumbnail with an HTML/CSS-authored template rendered by [Satori](https://github.com/vercel/satori). Satori produces an SVG string from JSX/HTML+CSS using a flexbox layout engine; that SVG is then rasterized to a 600×900 JPEG by `sharp` exactly as today. The artifact embedded in the EPUB (`cover.jpg`) is unchanged in role and dimensions; only the **authoring surface** changes — from coordinate-based SVG to flexbox-based HTML/CSS.

In addition, the cover templates (both the thumbnail and the title-page chapter HTML/CSS) are pulled out of the rendering implementation into a **flavor system**: each flavor is a self-contained set of template files providing thumbnail, chapter HTML, and chapter CSS for one visual identity. The active flavor is selected globally via an environment variable; every article uses the same flavor for one Paperboy install. This makes the templates fully decoupled from the renderer (Satori, sharp, epub-gen-memory) and lets multiple visual designs coexist behind one configurable selector.

The thumbnail's **target resolution** is also selectable, from a fixed set of three predefined Kindle screen sizes. The default is **1264 × 1680** (matches modern Paperwhite / Oasis screens at 300 ppi); legacy options **1072 × 1448** and **600 × 800** are also accepted. The chapter HTML is independent of resolution and is unaffected.

The change is contained to the infrastructure layer. No domain-layer logic changes — the new `CoverFlavor` interface and `CoverResolution` value type live in the domain (`domain/ports.ts` for the contract, `domain/values/cover-resolution.ts` for the value type). No EPUB-format changes. No frontmatter-pipeline changes.

## Current State

`CoverGenerator.generateCoverSvg(title, author)` returns a 600×900 SVG built by `buildCoverSvg(titleLines, author, iconDataUri)` in `cover-templates.ts`. Layout is purely positional: every `<text>` element has hard-coded `x`/`y` coordinates, and title-line stacking is computed by `wrapTitle()` (line count) multiplied by a constant `lineSpacing`. Adding any composition primitive (a header band, a padded inset, a justified two-column author/source row) requires re-deriving coordinates by hand.

`generateImage()` rasterizes that SVG through `sharp(...).jpeg({ quality: 90 })`. The fixture `test/fixtures/covers/sample-cover.svg` snapshots the SVG output for designer feedback and regression detection.

## Goal

After this change:

- The thumbnail is authored in HTML+CSS (or JSX with style objects — Satori accepts both).
- Layout uses flexbox; no manual coordinate math.
- Rasterization stays on `sharp` (already a project dependency, used elsewhere for image processing).
- The fixture testing pattern keeps working: a designer can open a single file, edit the thumbnail, and re-run the test to confirm the change.
- The Docker image grows by a small, bounded amount — single-digit megabytes.
- One-shot CLI/MCP renders stay fast: cold-start adds at most ~50 ms versus today.

## Decision: Satori + sharp (Approach A)

### Approaches Evaluated

| Approach | Description | Verdict |
|---|---|---|
| **A. Satori + sharp** | JSX/HTML+CSS → Satori → SVG string → sharp → JPEG | **Chosen.** Closes the authoring-surface gap, no browser binaries, ~few MB footprint, sharp stays. |
| **B. `puppeteer-core` + system Chromium** | HTML+CSS → headless Chromium → screenshot → JPEG | Rejected. Adds 250–350 MB to the Docker image and 500 ms–2 s per render unless a long-lived browser is kept around. Disproportionate for a single-user tool. |
| **C. `@resvg/resvg-js` instead of sharp** | Keep SVG authoring, swap rasterizer | Rejected. Doesn't solve the authoring-surface problem (the whole point of the feature). Faster than sharp on SVG, but irrelevant if SVG is no longer the input. |
| **D. Stay on SVG, add CSS-in-SVG primitives** | Use `<foreignObject>` to embed XHTML in the SVG | Rejected. `<foreignObject>` support in librsvg (sharp's SVG renderer) is partial and not Kindle-output-quality. Brittle. |
| **E. Custom layout engine** | Write a small flexbox-style layout in TypeScript | Rejected. Reinventing what Satori already does, on a personal project. |

### Why Satori specifically

- **Designed for this exact use case.** Satori is Vercel's renderer for OG images, social cards, and generated book covers. Server-side, deterministic, no browser.
- **Static input, static output.** Pure function: JSX/HTML+CSS in, SVG out. No scheduler, no state, no event loop.
- **Subset that matches our needs.** Supports flexbox, padding/margin, borders, gradients, transforms, custom fonts via buffer loading, multi-line text wrapping. Does **not** support `grid` (we don't need it), animations (we don't need them), or scripts (we don't want them).
- **Small footprint.** ~3 MB installed, no native binaries (uses pure JS/Wasm internally for font shaping via `yoga-wasm-web` and `opentype.js`).
- **Active maintenance** under the Vercel umbrella. MIT-licensed.

### What Satori Doesn't Do

- **Doesn't read system fonts.** Fonts must be passed as `Buffer`s or `ArrayBuffer`s at render time. We need to bundle one or two font files in `assets/`. Not a blocker — it's the same model as the existing `cover-icon.png` asset.
- **Doesn't rasterize.** It produces SVG. We pipe its output through `sharp` exactly as today. This is actually a virtue: the rasterization step stays in code we already understand and the JPEG output is byte-stable for tests.

## Flavor System

A **flavor** is a self-contained visual identity for a Paperboy article — a coordinated thumbnail and title-page design. The runtime selects one flavor per article and the rendering pipeline applies it. Templates live in their own files under `src/infrastructure/converter/flavors/`, fully decoupled from the rendering engine.

### Goals

1. **Templates depend only on a small contract.** A flavor file imports nothing from Satori, sharp, or epub-gen-memory. Swapping the renderer (e.g., to Puppeteer some day) doesn't require changing flavors.
2. **Adding a flavor is one folder + one registry line.** No engine changes, no infrastructure changes.
3. **Static, type-safe registry.** Flavors are statically imported and registered at compile time. Configuration validation fails fast at startup if the configured flavor name isn't registered.
4. **Single global selector.** One env var selects the flavor for the entire Paperboy install. No per-article override in v1; this keeps the configuration surface and validation path minimal.

### Contract

A flavor exports three pure functions and a name:

```typescript
// src/domain/ports.ts (new export)
export interface CoverFlavor {
  readonly name: string;

  // Thumbnail: returns a Satori-compatible node tree (object form, not JSX).
  // Satori's input shape is structural — see SatoriNode below.
  buildThumbnail(input: ThumbnailInput): SatoriNode;

  // Chapter title page: HTML body fragment (no <style>, no <script>).
  buildHtmlChapter(input: ChapterInput): string;

  // Chapter CSS: goes into the linked stylesheet via epub-gen-memory's `css:` option.
  buildCoverCss(): string;
}

export interface ThumbnailInput {
  readonly titleLines: readonly string[];   // pre-wrapped by wrapTitle()
  readonly author: string;
  readonly iconDataUri?: string;            // optional, flavor decides if it uses one
  readonly width: number;                   // canvas width in pixels (from CoverResolution)
  readonly height: number;                  // canvas height in pixels (from CoverResolution)
}

export interface ChapterInput {
  readonly title: string;
  readonly author: string;
  readonly sourceDomain?: string;           // already extracted by the renderer
}

// Structural type matching Satori's accepted input. Defined here so flavors
// don't import Satori. The shape is a public, stable JSON-like tree.
export interface SatoriNode {
  readonly type: string;
  readonly props: {
    readonly style?: SatoriStyle;
    readonly children?: SatoriNode | string | ReadonlyArray<SatoriNode | string>;
    readonly src?: string;                  // for <img>
    readonly width?: number;
    readonly height?: number;
  };
}

// Subset of CSS that Satori supports — explicit rather than `Record<string, unknown>`
// to keep the flavor authoring surface type-safe. Defined alongside SatoriNode.
export interface SatoriStyle { /* ... */ }
```

A flavor file is therefore renderer-agnostic at the type level. It produces strings (HTML/CSS) and a structural object tree. The structural type for `SatoriNode` is defined in the domain port, not imported from Satori — this is what "decoupled from the implementation" means in concrete terms.

> **Note on `SatoriStyle`.** Decided: define a Paperboy-owned `SatoriStyle` interface in `domain/ports.ts`, listing the CSS properties Satori actually supports (flexbox, padding/margin, border, color, gradients, transforms, font properties). The domain layer stays free of Satori imports even at type level. Maintenance cost: when Satori adds a new supported property, our interface gets a one-line update.

### File Layout

```
src/infrastructure/converter/flavors/
  index.ts                  # registry: { classic } as const, getFlavor(name)
  classic/
    index.ts                # the flavor module — exports CoverFlavor
    thumbnail.ts            # buildThumbnail() — Satori node tree
    chapter.ts              # buildHtmlChapter() — HTML body fragment
    css.ts                  # buildCoverCss() — CSS string
    fixtures/               # designer-facing samples for THIS flavor
      sample-thumbnail.svg
      sample-cover.html
  # (future flavors live in sibling folders, mirroring this structure)
```

A flavor is a folder, not a single file. Reasons:
- The thumbnail, chapter, and CSS for one design are co-located — drift between them is hard.
- Per-flavor fixtures mean the designer-feedback loop scales: each flavor has its own pair of inspectable files and its own snapshot test.
- Adding the second flavor doesn't bloat any one file beyond what's natural for one design.

### Registry

```typescript
// src/infrastructure/converter/flavors/index.ts
import type { CoverFlavor } from "../../../domain/ports.js";
import { classic } from "./classic/index.js";

const FLAVORS = {
  classic,
} as const satisfies Record<string, CoverFlavor>;

export type FlavorName = keyof typeof FLAVORS;

export function isFlavorName(value: string): value is FlavorName {
  return value in FLAVORS;
}

export function getFlavor(name: FlavorName): CoverFlavor {
  return FLAVORS[name];
}

export function listFlavorNames(): readonly FlavorName[] {
  return Object.keys(FLAVORS) as FlavorName[];
}
```

This is a static map. Type-narrowing on `FlavorName` gives compile-time exhaustiveness anywhere the renderer or config path needs to enumerate flavors. No `any`, no runtime discovery.

### Selection

A single configuration source: **`PAPERBOY_COVER_FLAVOR`** environment variable, loaded and validated by `loadConfig()` at startup. Defaults to `"classic"` when unset.

```typescript
// inside loadConfig()
const flavorName = process.env.PAPERBOY_COVER_FLAVOR ?? "classic";
if (!isFlavorName(flavorName)) {
  return err(new ConfigError(
    `PAPERBOY_COVER_FLAVOR=${flavorName} is not a registered flavor. ` +
    `Valid options: ${listFlavorNames().join(", ")}`,
  ));
}
// config.defaultCoverFlavor: FlavorName

// inside the renderer call site (MarkdownEpubConverter)
const flavor = getFlavor(config.defaultCoverFlavor);
// renderer uses flavor.buildThumbnail / buildHtmlChapter / buildCoverCss
```

The flavor is resolved once at startup (when `Config` is built) and the resulting `FlavorName` flows through to `MarkdownEpubConverter` as a constructor argument, then to `CoverGenerator` calls. There's no runtime fallback path, no per-article resolution, and no on-the-fly validation.

### Validation Strategy

**Startup validation only.** If `PAPERBOY_COVER_FLAVOR` is set and `isFlavorName(value)` returns false, `loadConfig()` returns a `ConfigError` listing the valid flavor names. Process exits non-zero before any article is processed. This matches the existing fail-fast config pattern (same shape as today's SMTP / Kindle email validation).

No new domain error variant is needed — the only failure mode is invalid configuration, which already has `ConfigError`. The domain error union (`DomainError`) is unchanged. Per-article rendering can no longer fail due to flavor selection because the flavor is resolved once at startup and reused.

## Resolution Selection

The thumbnail's pixel dimensions are configurable from a fixed set of three predefined Kindle screen resolutions. This is independent of the flavor system: any flavor renders at any of the three resolutions.

### Predefined Resolutions

| Name | Pixels | Notes |
|---|---|---|
| `1264x1680` | 1264 × 1680 | **Default.** Modern Kindle Paperwhite / Oasis (300 ppi). Aspect ratio ≈ 3:4. |
| `1072x1448` | 1072 × 1448 | Older Paperwhite (212–300 ppi). Aspect ratio ≈ 3:4. |
| `600x800` | 600 × 800 | Basic Kindle (167 ppi). Aspect ratio = 3:4. |

All three share a 3:4 aspect ratio (width:height), which simplifies flavor authoring — a flavor designed at one resolution scales proportionally to the others without aspect-ratio-driven layout shifts. The current MVP renders at 600 × 900 (2:3); this feature changes that to 1264 × 1680 (3:4) by default. Existing covers in the wild are not migrated.

### Domain Value Type

```typescript
// src/domain/values/cover-resolution.ts
export const COVER_RESOLUTIONS = {
  "1264x1680": { width: 1264, height: 1680 },
  "1072x1448": { width: 1072, height: 1448 },
  "600x800":   { width: 600,  height: 800  },
} as const;

export type CoverResolutionName = keyof typeof COVER_RESOLUTIONS;

export interface CoverResolution {
  readonly name: CoverResolutionName;
  readonly width: number;
  readonly height: number;
}

export function isCoverResolutionName(value: string): value is CoverResolutionName {
  return value in COVER_RESOLUTIONS;
}

export function getCoverResolution(name: CoverResolutionName): CoverResolution {
  return { name, ...COVER_RESOLUTIONS[name] };
}

export function listCoverResolutionNames(): readonly CoverResolutionName[] {
  return Object.keys(COVER_RESOLUTIONS) as CoverResolutionName[];
}
```

### Selection

Single configuration source: **`PAPERBOY_COVER_RESOLUTION`** environment variable, validated by `loadConfig()` at startup. Defaults to `"1264x1680"` when unset.

```typescript
// inside loadConfig()
const resolutionName = process.env.PAPERBOY_COVER_RESOLUTION ?? "1264x1680";
if (!isCoverResolutionName(resolutionName)) {
  return err(new ConfigError(
    `PAPERBOY_COVER_RESOLUTION=${resolutionName} is not a supported resolution. ` +
    `Valid options: ${listCoverResolutionNames().join(", ")}`,
  ));
}
// config.coverResolution: CoverResolution
```

The resolved `CoverResolution` flows through `MarkdownEpubConverter`'s constructor alongside the flavor, then into each thumbnail render call.

### How Flavors Use the Resolution

Satori sizes elements in pixels (no `vw`/`vh` support). To produce a layout that scales between 600 × 800 and 1264 × 1680, flavors derive font sizes, padding, and shape sizes from the canvas dimensions rather than hard-coding pixels. The recommended pattern for the `classic` flavor's `buildThumbnail`:

```typescript
export function buildThumbnail({ titleLines, author, iconDataUri, width, height }: ThumbnailInput): SatoriNode {
  const titleFontSize = Math.round(width * 0.108);  // ≈ 68 at width 600 (matches today's design)
  const authorFontSize = Math.round(width * 0.044); // ≈ 26 at width 600
  const padding = Math.round(width * 0.05);
  // ... build the node tree using these scaled sizes
}
```

This is a flavor-internal convention; the `CoverFlavor` contract doesn't dictate it. Each flavor decides how (or whether) to scale with canvas size. The `_shared/scale.ts` helper provides a `scale(width, designWidth, value)` utility for flavors that want consistent proportional sizing relative to their own native design width.

### Renderer Integration

`CoverGenerator`'s thumbnail-rendering methods receive the resolved `CoverResolution` from the converter and pass `width`/`height` both to the flavor (via `ThumbnailInput`) and to Satori (via its `width`/`height` options):

```typescript
async generateImage(
  flavor: CoverFlavor,
  resolution: CoverResolution,
  input: Omit<ThumbnailInput, "width" | "height">,
): Promise<Buffer> {
  const fullInput: ThumbnailInput = { ...input, width: resolution.width, height: resolution.height };
  const node = flavor.buildThumbnail(fullInput);
  const svg = satori(node, { width: resolution.width, height: resolution.height, fonts: this.fonts });
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
}
```

Sharp does **not** scale the SVG after the fact. Satori renders directly at the target resolution, so there's no resampling step and no quality loss from scaling.

### File Size and Performance Implications

- **JPEG file size:** A 1264 × 1680 JPEG at quality 90 is roughly 4–5× the bytes of the current 600 × 900 (estimated 200–400 KB versus 50–100 KB). Acceptable for a single-user tool sending one EPUB at a time over SMTP. Within the existing `MAX_BYTES = 25 MB` content limit by orders of magnitude.
- **Render time:** Larger canvas means more pixels for `sharp` to encode. Estimated +20–40 ms at 1264 × 1680 versus 600 × 900. Total still under the 200 ms budget.
- **Memory:** Sharp's encoding peak is roughly proportional to pixel count. 1264 × 1680 ≈ 2.1 MP versus current 600 × 900 ≈ 0.54 MP — a 4× increase in working memory during encoding (~10 MB peak). Negligible.

### Why a Fixed Set, Not Free-Form Width/Height

- **Predictability for flavor authoring.** A flavor author can target three known canvas sizes and tune scaling with confidence. Free-form dimensions force flavors to handle every aspect ratio, which inflates testing surface.
- **Validation simplicity.** Three named values are validated by a `keyof` check; arbitrary integer pairs require range checks, max bounds, aspect ratio sanity, etc.
- **Discoverability.** The user picks from a list whose names map to actual Kindle screen sizes. Free-form numbers invite "is 1080 × 1440 fine?" questions.
- **Out of scope** per feature doc (custom resolutions). Listed here so the rationale is captured in the design.

### Renderer Integration

`CoverGenerator` is parameterized by a flavor at call time, not at construction time. The constructor still loads bundled assets (font, icon) but doesn't bind a flavor:

```typescript
class CoverGenerator {
  constructor() { /* loads font + icon once */ }

  generateCoverCss(flavor: CoverFlavor): string {
    return flavor.buildCoverCss();
  }

  generateHtmlChapter(flavor: CoverFlavor, input: ChapterInput): string {
    return flavor.buildHtmlChapter(input);
  }

  generateCoverSvg(flavor: CoverFlavor, input: ThumbnailInput): string {
    return satori(flavor.buildThumbnail(input), {
      width: 600,
      height: 900,
      fonts: this.fonts,
    });
  }

  async generateImage(flavor: CoverFlavor, input: ThumbnailInput): Promise<Buffer> {
    const svg = this.generateCoverSvg(flavor, input);
    return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
  }
}
```

This **does** change the public method signatures (each method gains a `flavor` parameter), so `MarkdownEpubConverter` is updated to resolve the flavor and pass it in. The earlier "no signature change" claim from the pre-flavor draft is overridden by this design extension.

### Bundled Flavor for v1

One flavor ships: `classic` — a faithful port of the current design (cream `#f5efe4` background, maroon `#a03020` accent, Georgia serif, centered layout) into the new authoring format. The cut-over is therefore visually neutral by default: existing users see the same look unless they opt in to a different flavor.

### Sharing Primitives Across Flavors

Flavors will likely want to share things: typography scales, color tokens, the icon asset, helper functions. Three options:

| Option | Description | Verdict |
|---|---|---|
| **Each flavor fully independent** | Duplicate everything in each folder | Rejected. Drift, copy-paste bugs. |
| **Shared `flavors/_shared/` directory** | Common tokens, icons, helpers | **Chosen for v1.** Simple, explicit, no abstraction tax. |
| **Inheritance / composition framework** | Mixins, base flavor, etc. | Rejected for v1. Premature; we have one flavor. Revisit when there are 4+ flavors and a real duplication problem. |

`flavors/_shared/` initially contains:
- `tokens.ts` — color and typography constants used by `classic` (kept open so future flavors can choose to reuse or override).
- `icon.ts` — base64 data URI for the bundled `cover-icon.png`, loaded once.

Future flavors are free to ignore `_shared/` entirely.

## Architecture

### Updated Pipeline (thumbnail and chapter, with flavor and resolution)

```
[startup]
  loadConfig() validates:
    - PAPERBOY_COVER_FLAVOR     → config.defaultCoverFlavor: FlavorName
    - PAPERBOY_COVER_RESOLUTION → config.coverResolution: CoverResolution
  MarkdownEpubConverter is constructed with:
    - flavor     = getFlavor(config.defaultCoverFlavor)
    - resolution = config.coverResolution

[per article]
  article (title, author, content, metadata)
    → wrapTitle(title)                                                          → titleLines
    → flavor.buildThumbnail({ titleLines, author, iconDataUri, width, height }) → SatoriNode
    → satori(node, { width, height, fonts })                                    → SVG string
    → sharp(Buffer.from(svg)).jpeg({ quality: 90 })                             → JPEG Buffer
    → embedded in EPUB as cover.jpg

    → flavor.buildHtmlChapter({ title, author, sourceDomain })                  → HTML body fragment
    → flavor.buildCoverCss()                                                    → CSS string
    → epub-gen-memory({ ..., cover, css }, [chapter, content])                  → EPUB
```

The chapter title page (HTML inside the EPUB) is now also flavor-driven. The previous draft of this design treated it as out of scope; the flavor-system addition pulls it in because flavors must be coherent across both artifacts (otherwise the thumbnail and title page can drift visually inside a single design — exactly the problem flavors are meant to fix).

### Module Layout

**Modified:**
- `src/infrastructure/converter/cover-generator.ts`
  - All four methods (`generateCoverCss`, `generateHtmlChapter`, `generateCoverSvg`, `generateImage`) now take a `CoverFlavor` parameter and delegate to it.
  - Constructor loads bundled font(s) into a `Buffer` once, the same way it currently loads the icon PNG. The icon-loading code moves out of the constructor and into `flavors/_shared/icon.ts` (the icon is now flavor-shared, not generator-owned).
- `src/infrastructure/converter/markdown-epub-converter.ts`
  - Constructor signature gains `flavor: CoverFlavor` and `resolution: CoverResolution` parameters (resolved from `Config` once at startup).
  - Each thumbnail-related `CoverGenerator` call passes both through.
- `src/infrastructure/config.ts`
  - Loads and validates `PAPERBOY_COVER_FLAVOR` against `isFlavorName()`. Defaults to `"classic"` when unset.
  - Loads and validates `PAPERBOY_COVER_RESOLUTION` against `isCoverResolutionName()`. Defaults to `"1264x1680"` when unset.
  - Returns a `ConfigError` listing valid names if either value is invalid.
- `src/domain/ports.ts`
  - Adds `CoverFlavor`, `ThumbnailInput` (with `width`/`height`), `ChapterInput`, `SatoriNode`, `SatoriStyle` interfaces.
- `src/domain/values/cover-resolution.ts`
  - **New file.** Defines `COVER_RESOLUTIONS`, `CoverResolutionName`, `CoverResolution`, `isCoverResolutionName`, `getCoverResolution`, `listCoverResolutionNames`.
- All composition roots (`index.ts`, `cli-entry.ts`, `watch-entry.ts`)
  - Resolve the flavor (`getFlavor(config.defaultCoverFlavor)`) and pass it plus `config.coverResolution` into `MarkdownEpubConverter`.

**Unchanged (explicitly):**
- `src/domain/errors.ts` — no new error variant; `ConfigError` covers the only failure mode.
- `src/domain/values/document-metadata.ts` — no `coverFlavor` field; metadata is unrelated to flavor selection.
- `src/infrastructure/frontmatter/gray-matter-parser.ts` — no new keys; flavor isn't read from frontmatter.

**Removed:**
- `src/infrastructure/converter/cover-templates.ts` — its functions (`buildHtmlChapter`, `buildCoverCss`, `buildCoverSvg`) move into the `classic` flavor under `flavors/classic/`. The file itself is deleted.

**New:**
- `src/infrastructure/converter/flavors/index.ts` — registry, `isFlavorName`, `getFlavor`, `listFlavorNames`.
- `src/infrastructure/converter/flavors/classic/` — bundled v1 flavor (see "File Layout" above).
- `src/infrastructure/converter/flavors/_shared/` — shared tokens and icon helper.
- `src/infrastructure/converter/assets/fonts/` — directory with one font file (see "Font Selection" below).

### `CoverGenerator` API (changed)

```typescript
type ThumbnailContent = Omit<ThumbnailInput, "width" | "height">;

class CoverGenerator {
  constructor();                                                                          // loads bundled fonts
  generateCoverCss(flavor: CoverFlavor): string;
  generateHtmlChapter(flavor: CoverFlavor, input: ChapterInput): string;
  generateCoverSvg(flavor: CoverFlavor, resolution: CoverResolution, input: ThumbnailContent): string;
  generateImage(flavor: CoverFlavor, resolution: CoverResolution, input: ThumbnailContent): Promise<Buffer>;
}
```

Thumbnail-rendering methods take `resolution` as a separate argument; the generator merges it into the `ThumbnailInput` it passes to the flavor. Chapter-related methods don't take `resolution` (the chapter is HTML, no fixed pixel size).

Each method delegates rendering specifics to the flavor and handles only the engine concerns (Satori invocation, sharp encoding). Existing call sites in `MarkdownEpubConverter` are updated to pass the resolved flavor and resolution.

### Satori Input Shape

Satori accepts JSX **or** a plain object tree with `type`, `props`, `children`. We avoid the JSX path (would require adding a JSX runtime to the build for one file) and use the object form directly:

```typescript
const node = {
  type: "div",
  props: {
    style: { display: "flex", flexDirection: "column", /* ... */ },
    children: [
      { type: "div", props: { style: { /* kicker */ }, children: "PAPERBOY" } },
      // ...title lines, rule, author...
      { type: "img", props: { src: iconDataUri, width: 380, height: 320 } },
    ],
  },
};
```

This is verbose but explicit, type-safe, and avoids touching `tsconfig.json`. The verbosity sits in `cover-templates.ts` where it belongs (it's the template).

### Title Wrapping

`wrapTitle(title, maxLineChars=16, maxLines=4)` is **kept**. Two reasons:

1. Satori wraps text on its own based on container width and font metrics, which is good for English but unpredictable for the deliberate "≤16 chars per line" cap we want for tile readability at thumbnail size (rendered ~120×180 px on a Kindle).
2. The truncation-with-ellipsis behavior at `maxLines` is a product decision, not a layout one. Keeping it explicit means the test for that behavior keeps working unchanged.

The wrapped lines become children of a `<div>` flex column. Satori then handles the vertical stacking automatically — no `lineSpacing` constant, no per-line `y` math.

### Font Selection

Satori needs at least one font buffer at render time. Today's design uses Georgia, a system font that's available on most user machines but not bundled inside `node_modules`. We bundle one open-license font file:

- **Decided:** [Source Serif 4](https://github.com/adobe-fonts/source-serif) (SIL Open Font License). Visually close to Georgia, well-supported across weights, ~300 KB for a single weight TTF.
- **Weights:** regular 400 only for v1. Bold/italic can be added later as separate buffers if a future flavor's design needs them.
- **Sharing:** loaded once and shared across all flavors via `flavors/_shared/fonts.ts`. Flavors can opt out by loading their own font buffer if they need something different.

The font file lives at `src/infrastructure/converter/assets/fonts/source-serif-regular.ttf` and is loaded once in `CoverGenerator`'s constructor. Like the icon PNG, it must be copied into the production `dist/` folder by the postbuild asset-copy script (`scripts/copy-assets.*` per PB-022). The implementation plan includes a build-output validation test (see Testing) that asserts the font file is present in `dist/` after `npm run build`.

### Image (Icon) Handling

The bundled `cover-icon.png` keeps its current role. Satori's `<img>` element accepts data URIs and renders the image inline. The icon is loaded once in the constructor (already done today) and embedded as `data:image/png;base64,...` in the Satori input tree.

## Output Determinism and Test Fixtures

The fixture comparison test compares byte-for-byte. **Each flavor gets its own fixture pair** (`flavors/<name>/fixtures/sample-thumbnail.svg` and `sample-cover.html`). The comparison test iterates over `listFlavorNames()` so adding a flavor automatically adds two snapshot assertions without any test wiring.

Satori output **must be deterministic** for the test to be useful.

Satori's output is deterministic for a given input + font + version. The risks for non-determinism are:

| Source | Mitigation |
|---|---|
| Different Satori version produces different SVG | Pinned in `package-lock.json`; minor-version bumps will require fixture refresh (acceptable, same as `sharp` already). |
| Font shaping differences across OS / Node versions | Satori uses pure JS shaping (`opentype.js`), not native libraries — no OS dependence. |
| Floating-point differences in layout engine | Yoga's flexbox engine is deterministic for fixed inputs. |
| Embedded base64 (icon, font) | Both loaded from bundled files — same buffer → same base64. |

Refresh path is unchanged: `UPDATE_COVER_FIXTURE=1 npx vitest run`.

## Constraints Verification

The feature doc's acceptance criteria translate to the following design-level claims:

| Criterion | How this design satisfies it |
|---|---|
| HTML+CSS authoring surface (no hand-placed coordinates) | Each flavor's `thumbnail.ts` returns a Satori node tree; no `x`/`y`. |
| JPEG embedded as `cover.jpg` at the configured resolution | Pipeline still terminates at `sharp(...).jpeg({ quality: 90 })`, embedding unchanged in `markdown-epub-converter.ts`. Default resolution is `1264x1680`. |
| Resolution selectable via `PAPERBOY_COVER_RESOLUTION` from a fixed set | `CoverResolution` value type with `keyof`-narrowed name; validated by `loadConfig()`; flows through `MarkdownEpubConverter` constructor to `CoverGenerator` calls. |
| Default resolution `1264x1680` when env var unset | `loadConfig()` defaults the value before validation. |
| Unknown resolution fails fast at startup | `ConfigError` from `loadConfig()`, listing valid options. |
| All bundled flavors render correctly at all three resolutions | `classic` flavor uses `_shared/scale.ts` to derive font sizes and padding from canvas width; tested by rendering at each of the three resolutions and asserting valid SVG plus expected text-span count. |
| Title wraps 1–4 lines, no manual coordinates | `wrapTitle()` retained in the renderer; flavor receives `titleLines[]` and renders them as flex children. |
| Designer-inspectable artifact per flavor | Each flavor folder has its own `fixtures/` directory with `sample-thumbnail.svg` and `sample-cover.html`. |
| Fixture test detects regressions for every bundled flavor | Comparison test iterates `listFlavorNames()`. Adding a flavor adds assertions automatically. |
| Flavor templates depend only on a small contract | Flavor files import only from `domain/ports.ts` (interfaces) and optionally `flavors/_shared/`. They don't import Satori, sharp, or epub-gen-memory. Verified by an ESLint boundary rule (see "Testing"). |
| Static, type-safe registry | `FLAVORS` is a `const` map; `FlavorName = keyof typeof FLAVORS`. `getFlavor(name: FlavorName)` is exhaustive. |
| Env var validated fail-fast at startup | `loadConfig()` returns a `ConfigError` for unknown flavor names; process exits before any article is processed. |
| Default flavor used when env var unset | `loadConfig()` defaults `PAPERBOY_COVER_FLAVOR` to `"classic"` when undefined. |
| `classic` flavor matches today's design and is the default | The cut-over commit moves today's templates verbatim into `flavors/classic/`; visual diff against today's fixtures is empty modulo the renderer change (acknowledged below). |
| Adding a second flavor needs no engine changes | One folder + one registry line. Documented and tested by adding a stub `_test_flavor` in tests (deleted before commit) to verify the registry path is closed over the right surface. |
| Docker image grows ≤10 MB | Satori (~3 MB) + one font file (~300 KB) + Yoga Wasm (~600 KB) + flavors source (negligible) ≈ 4 MB. Comfortably under. |
| Render time ≤200 ms | At 1264×1680 (default): Satori render 50–100 ms + sharp JPEG encode 30–60 ms + flavor lookup O(1). At lower resolutions, both stages are faster. Headroom remains. |
| x86_64 + ARM64 Alpine | Satori is pure JS + Wasm, no native binaries. No arch-specific concerns. Yoga ships as Wasm. |
| 337 tests still pass | Existing tests are updated to pass `flavor.classic` where they previously called the cover generator without a flavor argument. The cover-generator comparison test is rewritten to iterate flavors. Other tests (JPEG magic bytes, error categorization, etc.) get a one-line argument addition. |
| No new `any`/`as`/`@ts-ignore` | Satori has TypeScript types. `FLAVORS as const satisfies Record<...>` enforces the contract without `as`. The structural `SatoriNode` type avoids any runtime-only escape hatches. |
| `npm audit` clean, no postinstall download | Satori has no postinstall scripts. Yoga Wasm ships inside the npm tarball. Verify at install time. |

## Spec Changes

`docs/specs/main-spec.md`:

- **FR-36** (cover thumbnail JPEG): replace the dimensions clause "600 × 900 px" with "one of `1264 × 1680` (default), `1072 × 1448`, or `600 × 800`, selected via `PAPERBOY_COVER_RESOLUTION`." Replace "no user-supplied image or configuration is required" with a note that the active flavor (`PAPERBOY_COVER_FLAVOR`) and resolution are user-configurable.
- **FR-37** (cover chapter HTML): update to reference flavor-driven rendering.
- **FR-38** (new) — Cover flavor selection. Defines: a flavor is a registered visual identity providing the thumbnail builder, chapter HTML builder, and chapter CSS; `PAPERBOY_COVER_FLAVOR` env var selects the active flavor for the whole install (default `classic`); unknown flavor names fail-fast at startup with a `ConfigError` listing valid options; one bundled flavor (`classic`) ships with the feature.
- **FR-39** (new) — Cover resolution selection. Defines: the thumbnail JPEG dimensions are selected from a fixed set of three predefined Kindle resolutions; `PAPERBOY_COVER_RESOLUTION` selects from `1264x1680` (default), `1072x1448`, `600x800`; unknown values fail-fast at startup; arbitrary widths/heights are not supported.

## Migration Path (Implementation-time)

The flavor system absorbs what would otherwise be a feature-flag toggle: the rendering rewrite and the flavor extraction land together in one logical step, with `classic` carrying the same visual identity as today. There's no ambiguity about which path is "live" — there's exactly one path through the renderer, and the flavor selects the templates.

Three-step migration to keep the diff reviewable:

1. **Introduce the contract and the registry.** Add `CoverFlavor`, `ThumbnailInput`, `ChapterInput`, `SatoriNode`, `SatoriStyle` to `domain/ports.ts`. Create `flavors/_shared/` and an empty `flavors/index.ts` with the typed registry skeleton. No behavior change yet.
2. **Implement the `classic` flavor and switch the renderer to it.** Move today's `cover-templates.ts` content into `flavors/classic/{thumbnail,chapter,css}.ts`, where `thumbnail.ts` is rewritten to produce a Satori node tree (this is where the visual output may shift slightly). Update `CoverGenerator` to take a `CoverFlavor` and delegate. Update `MarkdownEpubConverter` to take a `flavor` constructor argument; update all three composition roots to resolve and pass it. Refresh fixtures (`flavors/classic/fixtures/sample-thumbnail.svg`, `sample-cover.html`) once. Old `cover-templates.ts` and old top-level fixtures are deleted in this step.
3. **Wire config selection.** Add to `loadConfig()`:
   - `PAPERBOY_COVER_FLAVOR` with default `"classic"` and `isFlavorName()` validation; `ConfigError` for unknown names.
   - `PAPERBOY_COVER_RESOLUTION` with default `"1264x1680"` and `isCoverResolutionName()` validation; `ConfigError` for unknown values.
   - Add `domain/values/cover-resolution.ts` with the three predefined entries.
   Tests for the valid, default-when-unset, and invalid paths for both env vars.

Steps 1 and 2 are the bulk of the diff; step 3 is small. They're separate commits but one PR. No long-lived feature flag.

## Testing

### Unchanged in spirit (one-line argument addition)
- All existing `wrapTitle` tests — function is reused.
- `generateImage()` magic-bytes / non-empty / XML-special-chars tests — pass `flavor.classic` as the first argument; assertions stay the same.
- `generateHtmlChapter()` and `generateCoverCss()` tests — same one-line addition; assertions stay the same.

### Changed
- The byte-comparison fixture test is rewritten to iterate `listFlavorNames()`, asserting against each flavor's own `fixtures/sample-thumbnail.svg` and `sample-cover.html`. The old top-level `test/fixtures/covers/` files are removed.

### New
- **Determinism test**: render the `classic` flavor's thumbnail SVG twice in one process and assert byte equality. Cheap, catches accidental non-determinism if a future change introduces randomness (timestamps, random IDs, etc.).
- **Layout test**: render with a 1-line title and a 4-line title; assert the resulting SVG contains the expected line count of text spans. Guards against title wrapping silently breaking.
- **Registry test**: `listFlavorNames()` returns at least `["classic"]`; `getFlavor("classic")` returns a value with all three contract methods; `isFlavorName("does-not-exist")` returns false.
- **Resolution registry test**: `listCoverResolutionNames()` returns exactly `["1264x1680", "1072x1448", "600x800"]`; `getCoverResolution("1264x1680")` returns `{ name: "1264x1680", width: 1264, height: 1680 }`; `isCoverResolutionName("1280x800")` returns false.
- **Config validation tests for `PAPERBOY_COVER_FLAVOR`**: three cases — (a) `=classic` → `config.defaultCoverFlavor === "classic"`; (b) unset → defaults to `"classic"`; (c) `=unknown` → `ConfigError` listing valid flavor names.
- **Config validation tests for `PAPERBOY_COVER_RESOLUTION`**: three cases — (a) `=1072x1448` → `config.coverResolution.width === 1072`; (b) unset → defaults to `1264x1680`; (c) `=2000x3000` → `ConfigError` listing valid resolution names.
- **Multi-resolution rendering test**: render the `classic` flavor at all three resolutions; assert each produces valid SVG (parseable, contains expected text spans for the title) and a valid JPEG (magic bytes, non-empty buffer). Catches scaling regressions in `_shared/scale.ts` and flavor templates.
- **Boundary lint rule** (ESLint config addition): files under `flavors/<name>/` may import only from `domain/ports`, `domain/values/cover-resolution`, `flavors/_shared/`, and the standard library — not from Satori, sharp, epub-gen-memory, or other infrastructure. Enforced by `import/no-restricted-paths` or equivalent. Catches accidental coupling at compile time.
- **Build-output validation** (per OQ-5 decision): after `npm run build`, assert that `dist/infrastructure/converter/assets/fonts/source-serif-regular.ttf` and `dist/infrastructure/converter/assets/cover-icon.png` both exist and are non-empty. Implemented either as a vitest integration test that runs `npm run build` first (slow, more thorough) or a postbuild script invoked by `package.json:scripts.postbuild` that exits non-zero if assets are missing (fast, runs in CI without test wiring). Recommendation: postbuild script.

## Decisions

The following questions were raised during design review and have been resolved in this document:

- **OQ-1 — JSX runtime: Verbose object form, no JSX runtime.** Flavors author Satori input as plain TypeScript objects (`{ type, props, children }`). No `tsconfig.json` JSX changes, no factory shim. Revisit only if the `classic` flavor's `thumbnail.ts` becomes unreadable.
- **OQ-2 — Designer-facing fixture format: Bare SVG, no HTML wrapper.** Each flavor's `fixtures/sample-thumbnail.svg` is the inspectable artifact; modern browsers render SVG directly. The chapter still has its `fixtures/sample-cover.html` (HTML+CSS preview).
- **OQ-3 — Font: Source Serif 4, regular 400, single file, shared.** Bundled at `assets/fonts/source-serif-regular.ttf`, loaded once in `CoverGenerator`'s constructor, exposed to flavors through `flavors/_shared/fonts.ts`. Bold/italic added later only if a future flavor needs them.
- **OQ-5 — Postbuild asset validation: Add a postbuild script.** A `scripts/verify-assets` script runs after `npm run build` and exits non-zero if `dist/.../assets/cover-icon.png` or `dist/.../assets/fonts/source-serif-regular.ttf` is missing. Wired into `package.json:scripts.postbuild`. CI fails fast on missing assets without needing test wiring.
- **OQ-6 — `SatoriStyle` definition: Paperboy-owned interface.** Defined in `domain/ports.ts` listing the CSS subset Satori actually supports. Keeps the domain layer free of Satori imports even at type level. Maintenance cost: a one-line update if Satori adds a property we want to use.
- **OQ-7 — Default flavor name: `classic`.** Folder is `flavors/classic/`, registry entry is `classic`, env var default value is `"classic"`.
- **OQ-8 — Resolution naming: Raw dimension strings.** Env var values are `"1264x1680"`, `"1072x1448"`, `"600x800"`. Unambiguous, stable across Amazon's device renames, self-documenting in `.env.example`.

## Open Questions for Implementation

Two deferred questions remain — both flagged but non-blocking:

- **OQ-4: Cover icon — raster vs vector?** Satori can render inline SVG children, which would let us replace the bundled PNG icon with vector shapes that scale cleanly to the higher 1264 × 1680 default resolution. Out of scope for this feature per the feature doc, but the cut-over to a 1264 × 1680 default may make the existing PNG visibly soft. Flag during implementation; if it's a problem, file a follow-up and use the PNG for now.
- **OQ-9: Per-flavor scale tuning.** Whether `_shared/scale.ts` is sufficient or each flavor needs its own scaling helper depends on how different flavors author. The `classic` flavor is well-served by linear `scale-from-width`. A future flavor with a fixed-size header band might want non-linear scaling. Defer the abstraction until a second flavor's needs prove it.

## Out of Scope (Reaffirming Feature Doc)

- Designing additional visual flavors beyond `classic`. Each new flavor is its own (small) follow-up.
- Per-article custom thumbnails extracted from article images.
- User-configurable theming inside a flavor (custom palettes, etc.) — flavors are static, code-defined identities.
- **Custom cover resolutions.** Only the three predefined values are accepted. Adding another tier later is a one-line addition to `COVER_RESOLUTIONS`.
- **Per-article resolution override.** Like flavor, resolution is global only.
- Any change to the EPUB packaging (the cover is still embedded by epub-gen-memory via the same `File` mechanism).
