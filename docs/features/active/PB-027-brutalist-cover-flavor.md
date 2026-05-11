# PB-027: Brutalist Cover Flavor

**Status:** Backlog
**Created:** 2026-05-11

## Motivation

PB-026 introduced the cover flavor system specifically so new visual identities could be added as lightweight, isolated follow-ups — a single flavor folder plus one registry entry, no engine changes. Today there is exactly one bundled flavor (`classic`), which means the flavor system has never been exercised with a second, visually distinct design. Without a second flavor:

1. The mechanism's "self-contained flavor folder" claim is unproven — we don't know whether classic accidentally leaked assumptions into the engine that a second flavor would expose.
2. The Kindle library shelf is visually uniform: every Paperboy article looks the same regardless of source or topic, which is exactly the rigidity PB-026 set out to dissolve.
3. There's no working precedent for what a non-classic flavor looks like, so users who want different visual treatments for different content types have no concrete second option to switch to.

A complete brutalist design has already been authored as a Satori-ready JSX template (`docs/assets/covers/brutalist/thumbnail-brutalist.jsx`). It uses heavy uppercase typography, a black masthead, an accent footer with a per-article hashed palette seeded from the source domain, and the paperboy mascot icon (`docs/assets/icons/main-icon-inverted.png`) on a paper-colored backplate for contrast — a strong visual contrast to classic's cream/maroon centered-serif layout. Adopting it as the second bundled flavor delivers three things at once: validates PB-026's extensibility claim, gives the user a real visual choice via `PAPERBOY_COVER_FLAVOR=brutalist`, and creates a precedent template (file structure, asset handling, palette logic) for future flavors.

## Scope

Add a `brutalist` flavor to the existing flavor registry. The flavor is self-contained — its own thumbnail builder, chapter HTML builder, and chapter CSS — and selectable via `PAPERBOY_COVER_FLAVOR=brutalist`. The classic flavor remains the default and is unchanged.

In scope:

- A new `brutalist` flavor folder under the flavors directory containing the three CoverFlavor artifacts (thumbnail builder, chapter HTML builder, chapter CSS).
- The thumbnail visual identity matches the supplied `thumbnail-brutalist.jsx`: black masthead with `PAPERBOY` kicker and an issue-number kicker on the right; large uppercase title hero with tight letter spacing; accent-colored footer strip containing the byline (author or source domain) and the paperboy mascot icon (`docs/assets/icons/main-icon-inverted.png`) on a paper-colored backplate.
- The chapter (title page rendered inside the EPUB) adopts the brutalist visual identity — same palette, same typographic scale, same uppercase title treatment — so the thumbnail and the title page read as one design, per PB-026's "stop drift between thumbnail and chapter" principle.
- A **per-article hashed accent palette** seeded from the article's source domain. Every article rendered with the brutalist flavor gets a distinct accent color while ink and paper colors stay constant. This is the defining trait of the flavor and is preserved from the supplied JSX.
- A **hash-derived issue number** rendered in the masthead kicker (e.g. `№ 042`). The number is derived deterministically from the article's source + title so repeat runs produce the same number, and no persistent state is introduced. This replaces the JSX's hard-coded `№ 014`.
- The flavor renders correctly at all three supported resolutions (`1264×1680`, `1072×1448`, `600×800`) — proportional scaling from a design baseline width, no manual coordinate math.
- Configuration validation: `PAPERBOY_COVER_FLAVOR=brutalist` is accepted at startup. An unknown value continues to fail fast with a `ConfigError` listing the available flavor names (now including `brutalist`).
- Fixture artifact(s) checked in under the flavor folder, mirroring how `classic` ships its sample fixtures, so a designer can open and modify the brutalist artifact standalone and the fixture comparison test detects regressions.
- The brutalist flavor reuses `docs/assets/icons/main-icon-inverted.png` (black silhouette on transparent), copied into the flavor's `assets/` directory so it ships with the runtime build. A paper-colored backplate behind the icon in the footer ensures legibility against any hashed accent color.

Out of scope:

- Designing additional flavors beyond brutalist.
- Per-article flavor override (still global via env var; PB-026 left this explicitly out of scope and this feature doesn't reopen it).
- Custom user-authored palettes or fonts. The brutalist palette is fixed except for the per-article accent derived deterministically from the source domain; users do not configure the hash or the ink/paper colors.
- Changing how `classic` looks or behaves.
- Changing the cover artifact contract (still a 600×900-relative JPEG embedded as `cover.jpg`, still an HTML chapter).
- Engine-level changes to the rendering pipeline. If brutalist requires a new primitive (e.g. per-article tokens) that primitive becomes part of the shared flavor scaffolding rather than living inside the flavor — but only if the design phase confirms it can't be implemented within the existing CoverFlavor contract.
- Persistent issue-number counters or any persistent state on disk.
- Per-article icon selection. The brutalist flavor ships one icon variant.

## Acceptance Criteria

**Flavor registration:**
- [ ] `brutalist` appears in the flavor registry alongside `classic` and is selectable via `PAPERBOY_COVER_FLAVOR=brutalist`.
- [ ] `PAPERBOY_COVER_FLAVOR=brutalist` is accepted at startup without error; `PAPERBOY_COVER_FLAVOR=unknown` continues to fail fast with a `ConfigError` whose message lists both `classic` and `brutalist`.
- [ ] `classic` remains the default when `PAPERBOY_COVER_FLAVOR` is unset.

**Visual identity:**
- [ ] Rendered thumbnails match the supplied `thumbnail-brutalist.jsx` reference: black masthead, uppercase title hero, accent footer with byline and the mascot icon on a paper-colored backplate.
- [ ] Each article rendered with the brutalist flavor uses an accent color derived deterministically from its source domain — two articles with the same source produce the same accent; two articles from different sources produce visually distinguishable accents.
- [ ] The masthead issue-number kicker renders a number derived deterministically from the article's source + title — repeat runs produce the same number for the same article.
- [ ] The brutalist title-page chapter rendered inside the EPUB uses the same palette, typography, and uppercase title treatment as the thumbnail — they read as one design, not two.

**Resolution support:**
- [ ] Brutalist renders correctly at `1264×1680`, `1072×1448`, and `600×800` — layout does not collapse, masthead and footer stay proportional, title remains readable, icon scales proportionally.
- [ ] No manual coordinate adjustments are required when switching between resolutions.

**Quality and packaging:**
- [ ] Existing test suite continues to pass.
- [ ] The fixture comparison test detects regressions in the brutalist thumbnail and chapter outputs (per-flavor fixtures as PB-026 already supports).
- [ ] No new `any`, `as` assertions, or `@ts-ignore` introduced.
- [ ] Adding `brutalist` requires no engine changes — only a new flavor folder, one registry line, and any necessary additions to the shared flavor scaffolding (tokens, scale helpers). If engine changes turn out to be needed, that is a signal the design needs revision before implementation.
- [ ] Docker image size growth from this feature is negligible — the only new asset is the brutalist icon PNG, no new runtime dependencies.

## Open Questions for Design

- ~~Icon source and placement~~ — Resolved: reuse `docs/assets/icons/main-icon-inverted.png`, copy into the flavor's `assets/` at build time, render in the footer on a paper-colored backplate for contrast.
- The supplied JSX uses an FNV-1a hash for the palette. The design phase should decide whether to lift hashing into shared flavor scaffolding (since future flavors may want it too) or keep it brutalist-internal.
- The supplied JSX renders the masthead in `Inter Bold`; classic uses Source Serif. The design phase should decide whether brutalist ships its own font file or composes one already on disk under the assets folder.
- The brutalist thumbnail uses `WebkitLineClamp` and an absolute-uppercase title. The design phase should validate Satori's support for these specific properties at the target resolutions and choose a fallback line-counting strategy if needed (the existing classic flavor already implements per-line node generation that could be reused).
- The exact derivation function for the issue-number kicker (digit count, modulus, formatting) is a design decision.

## Relationship to Other Tools

- **PB-026 (Redesigned Thumbnail Rendering)** — direct prerequisite. PB-026 introduced the CoverFlavor contract, the static flavor registry, and the env-var-driven selection. This feature is the first follow-up flavor that contract was built to enable, and is the test case for the "adding a flavor is a one-folder change" claim.
- **PB-008 (EPUB Cover Generation)** — predecessor to PB-026. Established the cover artifact's role in the EPUB; unchanged by this feature.
