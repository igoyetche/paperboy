# Plan: PB-005 — URL to Kindle

> Status: Dropped — 2026-03-31
> Created: 2026-03-26
> Feature: docs/features/active/PB-005-url-to-kindle.md
> Design: docs/designs/PB-005-url-approach/adr.md

## Scope

Add a URL-to-Kindle workflow to the paperboy Claude Code skill. No changes to paperboy source code, tests, or dependencies.

## Tasks

- [x] **T1** — Add URL workflow section to `examples/claude-skill/SKILL.md` (2026-03-26)
  - Instruct Claude to fetch the URL via `WebFetch`
  - Extract article body (ignore nav, ads, footers, sidebars)
  - Convert to clean Markdown (preserve headings, paragraphs, lists, code blocks)
  - Derive title from page `<title>` or `<h1>`; ask user if ambiguous
  - Write to `/tmp/kindle-article.md`, then call `paperboy --title "<title>" --file /tmp/kindle-article.md`
  - Document known limitations: paywalls, JS-rendered SPAs, bot-blocking pages

- [ ] **T2** — Validate against acceptance criteria
  - Manually trigger the skill with a public article URL and confirm the article arrives on Kindle
  - Verify title is extracted automatically
  - Verify known limitations are documented in the skill

- [ ] **T3** — Sync docs
  - Move feature: `features/backlog/` → `features/done/`
  - Move plan: `plans/backlog/` → `plans/done/`
  - Update STATUS.md to ✅ Complete
  - Add CHANGELOG.md completion entry
