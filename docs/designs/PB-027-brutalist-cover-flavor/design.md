# PB-027: Brutalist Cover Flavor — Design

**Status:** Draft
**Date:** 2026-05-11
**Spec:** docs/specs/main-spec.md (FR-38 — bundled flavor list)
**Feature:** docs/features/active/PB-027-brutalist-cover-flavor.md
**Predecessor:** docs/designs/PB-026-redesigned-thumbnail-rendering/design.md

## Summary

Add a second bundled flavor, `brutalist`, to the existing CoverFlavor registry introduced by PB-026. The flavor delivers its own thumbnail (Satori node tree), title-page chapter (HTML), and chapter CSS in a self-contained folder under `src/infrastructure/converter/flavors/brutalist/`. Selection is via the existing `PAPERBOY_COVER_FLAVOR=brutalist` env var — no new configuration surface.

The brutalist design has three defining traits that distinguish it from `classic`:

1. **Per-article hashed accent palette** — accent color is derived deterministically from the article's source domain via FNV-1a, so every article gets a distinct hue while ink and paper colors stay constant.
2. **Hash-derived issue number** — the masthead kicker renders a stable 3-digit number derived from the article's source + title. No persistent counter.
3. **Block typography** — heavy uppercase sans-serif title with tight negative letter-spacing, black masthead bar, accent-colored footer strip with byline + tinted icon.

The only shared-contract addition is one new optional field on `ThumbnailInput` (`sourceDomain`). Today only the chapter side receives the source domain; the thumbnail side does not. Brutalist needs it on both, classic ignores it. Everything else is contained inside the flavor folder.

Brutalist derives the issue-number hash from the existing `titleLines` array (`titleLines.join(" ")`) rather than introducing a separate `title` field — `titleLines` already carries the full title content, and the hash stays deterministic per article since `wrapTitle` is deterministic for the same input.

## Current State

After PB-026:

- `src/infrastructure/converter/flavors/` holds the flavor registry plus `classic/` and `_shared/` folders.
- `CoverFlavor` (in `src/domain/ports.ts`) has three methods: `buildThumbnail`, `buildHtmlChapter`, `buildCoverCss`.
- `ThumbnailInput` carries `titleLines`, `author`, `iconDataUri`, `width`, `height`. **No source domain.**
- `ChapterInput` carries `title`, `author`, `sourceDomain`.
- `loadConfig()` validates `PAPERBOY_COVER_FLAVOR` against `isFlavorName()`. Adding a flavor to `FLAVORS` automatically makes the new name accepted; the error message also lists it.
- `MarkdownEpubConverter` resolves the flavor once at startup and passes it to each `CoverGenerator` call. `generateHtmlChapter` already forwards `sourceUrl` (which gets converted to `sourceDomain` inside `CoverGenerator`); `generateImage` does not.
- `CoverGenerator.buildThumbnailContent(title, author)` builds the `ThumbnailContent` from title + author only.
- `_shared/` contains `tokens.ts` (colors used by classic), `fonts.ts` (font registry helper, unused by classic which reads its own font in `CoverGenerator`), and `scale.ts` (resolution scaling helper).
- Bundled assets live under `src/infrastructure/converter/assets/`: `cover-icon.png` and `fonts/source-serif-regular.ttf`.

## Goal

After this change:

- `PAPERBOY_COVER_FLAVOR=brutalist` produces a visually distinct EPUB that matches the supplied `docs/assets/covers/brutalist/thumbnail-brutalist.jsx` reference for the thumbnail, plus a matching brutalist title-page chapter.
- The brutalist flavor renders correctly at all three supported resolutions (`1264×1680`, `1072×1448`, `600×800`).
- The accent color of any brutalist thumbnail is reproducible from the article's source domain alone — same input, same color, always.
- The flavor folder is self-contained: removing it (plus its registry line) leaves the rest of the system intact and `classic` unaffected.
- One shared-contract change lands: `ThumbnailInput.sourceDomain?: string`. Classic ignores it.

## Decision Summary

| Decision | Choice | Why |
|---|---|---|
| Where to put per-article color hashing | `_shared/palette.ts` | Future flavors may want it (the JSX itself anticipated this). Brutalist owns the only consumer in v1. |
| Hash function | FNV-1a 32-bit (same as the JSX) | Already proven in the reference, no crypto needs, deterministic, no dependencies. |
| Issue-number derivation | `hash(sourceDomain + titleLines.join(" ")) % 1000`, zero-padded to 3 digits | Deterministic, source-aware (so different titles on the same source still differ), bounded length to fit the masthead. Reads the title from `titleLines` rather than adding a redundant `title` field to the contract. |
| Font | Inter (variable, single buffer for bold) | The reference uses Inter Bold; Inter is SIL-OFL, a single ~340 KB file covers our needs, no system font assumption. |
| Icon | Reuse `docs/assets/icons/main-icon-inverted.png` (black silhouette on transparent) — copied into the flavor's `assets/` at build time | Already in the repo and matches the brutalist aesthetic. Black-on-transparent forces a backplate in the footer for contrast against accent (see Footer Treatment below) — a strong "stamp" frame, which suits the brutalist visual language. |
| Whether to expand `ThumbnailInput` with `sourceDomain` | Yes — add it as optional, classic ignores it | Smallest possible contract change; lets brutalist hash on the same value the chapter already gets. |
| Where flavor-specific assets live | Inside the flavor folder | The JSX reference colocates the icon next to the template. Treat that as the convention going forward; `_shared/` is for things ≥2 flavors actually use. |
| Title wrapping for brutalist | Use the existing `wrapTitle()` with brutalist-specific maxLineChars/maxLines | Reference design clamps to ~4 lines. Existing helper already supports configurable bounds. |

## Visual Identity

Brutalist's thumbnail (top to bottom):

```
+----------------------------------+
|  PAPERBOY            № 042       |   ← masthead — black bar, paper text, letter-spaced
+----------------------------------+
|                                  |
|  THE QUICK BROWN FOX             |
|  JUMPS OVER THE LAZY             |   ← title hero — uppercase, tight tracking, black
|  DOG                             |
|                                  |
+----------------------------------+
|  BY CLAUDE         +-------+     |   ← footer strip — per-article accent background
|  THEVERGE.COM      | [ICN] |     |     icon on a paper-colored badge for contrast
|                    +-------+     |     paper-colored byline text
+----------------------------------+
```

Brutalist's title-page chapter mirrors the same visual identity using flat HTML/CSS:

- `<header>` with black background, paper-colored `PAPERBOY` kicker and issue number.
- `<h1>` uppercase, ultra-bold, tight letter-spacing, ink color.
- `<footer>` with accent-color background, paper-colored byline (author or source domain).

The icon is intentionally omitted from the HTML chapter (same convention as classic, to avoid embedding a large base64 payload in the chapter XHTML). The thumbnail keeps the icon.

## Shared-Contract Change

One additive change to `src/domain/ports.ts`:

```typescript
export interface ThumbnailInput {
  readonly titleLines: readonly string[];
  readonly author: string;
  readonly iconDataUri?: string;
  readonly width: number;
  readonly height: number;
  readonly sourceDomain?: string;   // NEW — used by flavors that key on the article source (brutalist)
}
```

`sourceDomain` is optional. Classic ignores it. Brutalist uses it for the accent palette; the issue-number hash is seeded from `titleLines.join(" ")` so no second field is needed (the title content is already in the input).

If `sourceDomain` is missing, brutalist falls back to seeding the accent palette from the joined `titleLines` as well — both the accent and the issue number then derive from the same seed, which means an article without a source still gets a consistent visual identity but loses the per-source distinctiveness across articles. If `titleLines` is somehow empty, brutalist seeds from `author` as a last resort. This matches the spirit of the existing fallback chain in `TitleResolver`.

### Corresponding renderer changes

- `CoverGenerator.buildThumbnailContent(title, author, sourceDomain?)` gains the third parameter; existing call sites pass it.
- `MarkdownEpubConverter` already extracts `sourceDomain` from `document.metadata.url` for the chapter path. Pull that extraction up so it happens once and feeds both `buildThumbnailContent` and `generateHtmlChapter`.
- No other call sites change.

This is the only engine-touching modification in the feature. It is additive and backwards-compatible: classic and any future flavor that doesn't care about the source domain simply doesn't reference the new fields.

## File Layout

```
src/infrastructure/converter/flavors/
  index.ts                        # MODIFIED — add { classic, brutalist }
  _shared/
    tokens.ts                     # unchanged
    fonts.ts                      # unchanged
    scale.ts                      # unchanged
    palette.ts                    # NEW — FNV-1a hash + paletteFor(seed) + numberFor(seed)
  classic/                        # unchanged
  brutalist/                      # NEW
    index.ts                      # exports CoverFlavor
    thumbnail.ts                  # buildThumbnail() — Satori node tree
    chapter.ts                    # buildHtmlChapter() — HTML body fragment
    css.ts                        # buildCoverCss() — CSS string
    tokens.ts                     # brutalist-internal ink/paper colors
    assets/
      main-icon-inverted.png      # copied from docs/assets/icons/, ~20 KB
      fonts/
        inter-bold.ttf            # SIL-OFL, ~340 KB, weight 700
    fixtures/
      sample-thumbnail.svg
      sample-cover.html
```

Decisions encoded in this layout:

- **Per-flavor assets live inside the flavor folder.** The JSX co-located its icon; we follow that convention because the alternative (everything under `_shared/`) creates pressure to genericize assets prematurely.
- **Per-flavor tokens** in `brutalist/tokens.ts` for ink/paper/accent-ink/accent-bg-fallback. The hashed accent is computed at render time, not stored as a token.
- **Per-flavor fonts directory** mirrors the shared assets layout under `assets/fonts/`. The build's asset-copy script needs to learn about flavor-internal `assets/` folders (see Build & Packaging).

## `_shared/palette.ts`

```typescript
/**
 * FNV-1a 32-bit hash of a string. Deterministic, dependency-free.
 * Lifted from docs/assets/covers/brutalist/thumbnail-brutalist.jsx.
 */
export function fnv1a32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/**
 * Returns a deterministic 3-digit issue number string (e.g. "042") for a seed.
 * Brutalist uses this for the masthead kicker.
 */
export function issueNumberFor(seed: string): string {
  const n = fnv1a32(seed) % 1000;
  return n.toString().padStart(3, "0");
}

/**
 * Returns an HSL accent color string deterministic for a seed.
 * Two hue families (cool/saturated and warm/muted) keep the palette coherent
 * across different sources while still feeling varied.
 */
export function accentFor(seed: string): string {
  const h = fnv1a32(seed);
  const hue = h % 360;
  const family = (h >> 8) & 1;
  if (family === 0) {
    return `hsl(${hue}, 65%, 38%)`;
  }
  const warmHue = (hue % 60) + 10;
  return `hsl(${warmHue}, 55%, 42%)`;
}
```

These are pure functions, no imports beyond `Math.imul`. Brutalist is the only v1 consumer. If a third flavor wants different palette logic, it implements its own — these helpers are a convenience, not a contract.

## `brutalist/thumbnail.ts`

Mirrors the structure of `classic/thumbnail.ts`: returns a `SatoriNode` tree with a flexbox column layout. Three rows:

1. **Masthead** — flex row with `PAPERBOY` on the left, `№ NNN` on the right, black background, paper-colored text.
2. **Title hero** — flex column, flex:1 to absorb extra space, uppercase title lines with tight negative letter-spacing.
3. **Footer** — flex row with byline column on the left, icon-on-backplate on the right, accent background.

### Footer Icon Treatment

`docs/assets/icons/main-icon-inverted.png` is a black silhouette on transparent. Dropped directly onto a medium-dark hashed accent (HSL lightness 38–42%) the icon would have low contrast and the transparent regions inside the silhouette (eye highlights, smile lines) would fill with the accent color, muddying the read.

The fix is a **paper-colored backplate** behind the icon — a flat rectangle in `paper` (`#f4efe2`) sized about 20% larger than the icon, with a small inset. Visually this reads as a stamp or seal pressed into the accent strip, which fits the brutalist vocabulary. No icon recoloring, no `sharp` runtime tint pass, no extra assets — just a flat-colored `div` behind the `img` in the Satori tree.

Implementation: nest the `<img>` inside a `<div>` with `backgroundColor: paper`, fixed padding, in the footer's right slot. Total footer-icon block stays inside the same proportional sizing the JSX used (~130/600 of canvas width).

Sizing is proportional to canvas width via the existing `scale(width, DESIGN_WIDTH=600, value)` helper from `_shared/scale.ts` — same approach classic uses. The brutalist design's native dimensions are 600 × 900 (matching the JSX); at 1264 × 1680 every dimension scales up by 1264/600 ≈ 2.1×.

Title sizing follows a heuristic similar to the JSX's `fitTitle()`:

| Word count | Font size at width=600 | Line height |
|---|---|---|
| ≤4 | 104 px | 1.02 |
| 5–7 | 80 px | 1.04 |
| 8–10 | 67 px | 1.05 |
| 11–14 | 56 px | 1.08 |
| 15+ | 48 px | 1.10 |

These are scaled at render time via `scale()`. The wrapped line list comes from the existing `wrapTitle()`, called from `CoverGenerator.buildThumbnailContent` with brutalist-tuned bounds (~16 chars per line, 4 lines max — see the JSX's `fitTitle(maxLines=4)`).

> **Per-flavor wrap tuning.** Classic uses `wrapTitle(title, 13, 4)`. Brutalist's heavier type and tighter tracking allow longer lines — `wrapTitle(title, 18, 4)` is a better fit. `buildThumbnailContent` is the natural place to apply per-flavor wrap parameters, but `CoverGenerator` doesn't currently know which flavor it's serving when it wraps. Three options considered:
>
> | Option | Verdict |
> |---|---|
> | Pass the flavor name into `buildThumbnailContent` and have it consult a per-flavor wrap table | Rejected — leaks flavor identity into the generator. |
> | Move wrap parameters onto the flavor itself (`flavor.titleWrap: { maxChars, maxLines }`) and have the generator read them | **Chosen.** Extends `CoverFlavor` with a small data field (not a method), classic gets `{ maxChars: 13, maxLines: 4 }`, brutalist gets `{ maxChars: 18, maxLines: 4 }`. |
> | Have each flavor re-wrap inside `buildThumbnail` from a single full title string | Rejected — every flavor reimplements wrapping. |
>
> Adds one optional field to `CoverFlavor`:
> ```typescript
> readonly titleWrap?: { readonly maxChars: number; readonly maxLines: number };
> ```
> `buildThumbnailContent` reads it, defaulting to `{ 13, 4 }` for flavors that omit it.

The icon, when provided, sits in the footer's right column with a fixed proportional size (130/600 of the canvas width).

## `brutalist/chapter.ts` and `brutalist/css.ts`

The chapter HTML structure:

```html
<div class="cover">
  <header class="masthead">
    <span class="kicker">PAPERBOY</span>
    <span class="issue">№ {{issueNumber}}</span>
  </header>
  <h1 class="title">{{title}}</h1>
  <footer class="footer" style="background:{{accent}};">
    <div class="byline">{{author OR sourceDomain}}</div>
    <div class="source">{{sourceDomain when author was used}}</div>
  </footer>
</div>
```

Inline `style="background:..."` on the footer is the only inline style; the rest comes from the linked stylesheet. This is necessary because the accent color is per-article and the EPUB stylesheet is shared across all chapters of all articles in a given install. Amazon's EPUB validator accepts inline `style` attributes (classic-flavor avoids them only as a stylistic preference). The XHTML XSS sanitizer accepts `style` on `footer` already.

CSS in `brutalist/css.ts` uses brutalist-internal tokens (black `#141210`, paper `#f4efe2`, accent-ink `#fbf7ee`) and ships a `@font-face` declaration for the bundled Inter Bold so the chapter's title renders consistently inside Kindle. Font loading inside Kindle is not as reliable as in the thumbnail rasterization path — see Fonts below.

## Fonts

Brutalist needs Inter Bold:

- **For the thumbnail (Satori path):** loaded as a `Buffer` at `CoverGenerator` construction time alongside Source Serif, registered with Satori as `{ name: "Inter", data, weight: 700, style: "normal" }`. Both font buffers stay in the generator; the active flavor's `buildThumbnail` references the font family it needs by string name.
- **For the chapter (Kindle path):** ship `inter-bold.ttf` as an EPUB resource and declare `@font-face` in `buildCoverCss()`. Kindle Paperwhites support `@font-face` with WOFF/WOFF2/TTF in EPUB 3. The font file is added to the EPUB via `epub-gen-memory`'s `content` parameter (existing API supports custom OEBPS files; see `epub-with-images.ts` for the pattern).

The shared `CoverGenerator` constructor currently hard-codes loading Source Serif. After this feature it loads both fonts (Source Serif + Inter Bold) unconditionally. The cost is one extra ~340 KB file read at startup, a one-time, sub-millisecond cost. Loading per-flavor on demand (lazy) was considered and rejected — extra complexity for negligible benefit on a single-user tool.

### Why not let each flavor own its `CoverGenerator`-side font loading

The `CoverGenerator` is shared across flavors; it loads fonts once. Pushing font loading into each flavor would either require the flavor to be a class with construction-time side effects (a regression on the "flavor is a pure folder of functions" property) or require lazy-loading on first render (worse cold start). Treating fonts as a generator-owned registry is consistent with how the icon is handled today.

## `brutalist/index.ts`

```typescript
import type { CoverFlavor } from "../../../../domain/ports.js";
import { buildThumbnail } from "./thumbnail.js";
import { buildHtmlChapter } from "./chapter.js";
import { buildCoverCss } from "./css.js";

export const brutalist: CoverFlavor = {
  name: "brutalist",
  buildThumbnail,
  buildHtmlChapter,
  buildCoverCss,
  titleWrap: { maxChars: 18, maxLines: 4 },
};
```

## Registry update

```typescript
// src/infrastructure/converter/flavors/index.ts
import { classic } from "./classic/index.js";
import { brutalist } from "./brutalist/index.ts";

const FLAVORS = {
  classic,
  brutalist,
} satisfies Record<string, CoverFlavor>;
```

Two-line diff. `isFlavorName`, `getFlavor`, `listFlavorNames` adapt automatically — `FlavorName` becomes `"classic" | "brutalist"`. Config error messages list both.

## Build & Packaging

- **Asset copy.** PB-022's postbuild script copies `src/infrastructure/converter/assets/**` into `dist/`. Update it to also copy `src/infrastructure/converter/flavors/*/assets/**` so brutalist's icon and font reach the production build. A test verifies that `dist/infrastructure/converter/flavors/brutalist/assets/fonts/inter-bold.ttf` exists after `npm run build`.
- **Image size.** Brutalist adds two assets: ~30 KB icon + ~340 KB font ≈ 370 KB. Well inside the feature's "negligible" budget and PB-026's overall ~10 MB ceiling.
- **No new npm dependencies.** Everything is implementable with the existing toolchain (Satori, sharp, epub-gen-memory). No new postinstall scripts.

## Test Strategy

Following PB-026's pattern:

- **Per-flavor fixture pair.** `flavors/brutalist/fixtures/sample-thumbnail.svg` and `sample-cover.html` are snapshot-tested by the existing fixture comparison test, which already iterates over `listFlavorNames()` and will pick up the new entry automatically.
- **Unit tests for `palette.ts`.** `fnv1a32` determinism (same input → same hash), `accentFor` produces a CSS-parsable HSL string, `issueNumberFor` always returns a 3-digit zero-padded string. Cover edge cases: empty string, very long string, unicode source domains.
- **Unit tests for `buildThumbnail`.** Brutalist renders a valid Satori node tree at all three resolutions; title lines appear once each; accent is reflected in the footer background; issue number string appears in the masthead.
- **Unit tests for `buildHtmlChapter`.** Output contains escaped title, escaped author, escaped source domain, accent color in the inline style, and issue number. Verifies sourceDomain absence falls back to title-only seeding without crashing.
- **Unit tests for `buildCoverCss`.** Output contains `@font-face` referencing the bundled Inter file path.
- **Config integration test.** `PAPERBOY_COVER_FLAVOR=brutalist` resolves without error; unknown flavor errors now include `brutalist` in the listed options.
- **Render-at-each-resolution test.** For each of the three `CoverResolution` entries, render a brutalist thumbnail and assert the resulting SVG parses cleanly and is non-empty. Same pattern PB-026 introduced for classic.
- **End-to-end converter test.** With `PAPERBOY_COVER_FLAVOR=brutalist`, run `MarkdownEpubConverter` on a sample article and assert the resulting EPUB contains `cover.jpg`, the inter-bold font file under `OEBPS/fonts/`, and the brutalist `@font-face` declaration inside `style.css`.

No new test infrastructure. All tests use the existing Vitest setup.

## Affected Spec Surface

- **`docs/specs/main-spec.md`** — the FR governing the bundled flavor list (FR-38 per PB-026) should be updated to enumerate `classic` and `brutalist`. Confirm the FR number when writing the spec change; PB-026's design says FR-38 covers the flavor system but the spec content is authoritative.
- **No new FRs.** The mechanism, configuration surface, and validation rules are all already specified by PB-026. This feature only adds a new value to an existing enumerated list.
- **`ThumbnailInput.sourceDomain?` and `ThumbnailInput.title?`** — if the spec references the thumbnail-input contract, add the two optional fields. Most likely lives in the FR-37 / FR-38 spec section.
- **`CoverFlavor.titleWrap?`** — same treatment. Document that flavors may declare a custom wrap table; default `{ maxChars: 13, maxLines: 4 }`.

CHANGELOG entry: one bullet per spec section touched plus a top-level "PB-027: brutalist flavor added" entry.

## Open Questions

- **Issue-number visual treatment when ≥3 digits would clip at small resolution.** At `600×800`, the masthead is ~38 px tall after scaling; "№ 999" may approach the edge. Solvable in the flavor with `letterSpacing` and a tighter font weight, but worth confirming during implementation rather than designing on paper.
- **Whether to expose `sourceDomain` on `ThumbnailInput` as required vs optional going forward.** Today it has to be optional (no breaking change), but every realistic future flavor will probably want it. Revisit when a third flavor lands.
- **`titleWrap` shape.** The proposal here is `{ maxChars, maxLines }`. If a future flavor wants character-class-aware wrapping (CJK, hyphenation), the field shape will need to evolve. Out of scope for this design; flag for revisit.

## Rejected Alternatives

| Alternative | Why rejected |
|---|---|
| Add brutalist as a thumbnail-only override, reuse classic chapter | Breaks PB-026's "a flavor is self-contained" principle. Would create visible drift between the thumbnail (bold black/uppercase) and the title page (cream/serif/centered). |
| Bake the accent color in (single fixed color like classic) | Loses the per-article distinctiveness, which is the brutalist design's main contribution to the library shelf. |
| Persist an incrementing issue counter in `~/.paperboy/state.json` | Introduces persistent state Paperboy doesn't have today. Per-article uniqueness can be achieved deterministically without persistence. |
| Use Cloudscape/Helvetica from system fonts | Satori doesn't read system fonts. Bundling Inter is the established pattern (mirrors how Source Serif ships for classic). |
| Promote `palette.ts` into the domain layer | Hashing for visual identity isn't domain logic. Keep it in `_shared/`. |
| Make `ThumbnailInput.sourceDomain` required | Breaking change to the contract — would force classic and any custom flavor to acknowledge a field they don't use. Optional + fallback is correct. |
| Add `title?: string` to `ThumbnailInput` for hashing | Rejected — `titleLines` already carries the full title content. `titleLines.join(" ")` reconstructs it (truncation-with-ellipsis still produces a deterministic seed for the same article). Duplicating the same data in two fields is a contract smell. |
