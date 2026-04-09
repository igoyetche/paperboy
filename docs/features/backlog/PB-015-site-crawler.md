# PB-015: Multi-Page Site Crawler

**Status:** Backlog
**Date:** 2026-04-06

## Motivation

Some of the best learning resources live as multi-page websites (documentation sites, guides, tutorials) — for example, promptingguide.ai. Reading these on a Kindle is ideal for focused study, but there's no simple way to go from "a website with 30+ sub-pages" to "a single document on my Kindle."

Paperboy handles Markdown-to-Kindle delivery. Paperclip handles single-page browser-to-Markdown conversion. Neither handles the problem of crawling an entire site's navigation structure, converting every sub-page, and assembling the result into one coherent Markdown file.

## Scope

A **standalone CLI tool** (working name: `papercrawl`) that takes a URL, discovers sub-pages from the site's navigation/index, fetches and converts each page to Markdown, and outputs a single concatenated `.md` file. The tool is designed to compose with Paperboy:

```
papercrawl https://www.promptingguide.ai/ > guide.md
paperboy --title "Prompting Guide" --file guide.md
```

**This feature covers the tool design and architecture decisions only.** Implementation will follow in a separate plan after the design is reviewed.

### What this tool does

- Accepts a root URL as input
- Discovers sub-pages by following links within the site's navigation (configurable: CSS selector, sitemap.xml, or automatic detection)
- Fetches each sub-page and converts its main content to Markdown
- Assembles all pages into a single `.md` file with a table of contents and clear page separators
- Outputs to stdout (default) or to a file (`-o filename.md`)

### What this tool does NOT do

- Send anything to Kindle (that's Paperboy's job)
- Render JavaScript-heavy SPAs (initial version targets server-rendered content; JS support is a future extension)
- Bypass paywalls, authentication, or rate-limiting protections
- Crawl recursively beyond the site's own domain

## Acceptance Criteria

- [ ] `papercrawl <url>` outputs a single Markdown file to stdout containing all discovered sub-pages
- [ ] Sub-pages are discovered by following internal links from the root page's navigation
- [ ] Each sub-page is converted to clean Markdown (headings, paragraphs, lists, code blocks, tables, images preserved)
- [ ] Output includes a generated table of contents at the top with links to each section
- [ ] Pages are separated by horizontal rules and titled with their original page heading
- [ ] A `--selector <css>` flag allows specifying a CSS selector for the navigation element (e.g., `--selector "nav.sidebar a"`)
- [ ] A `--content-selector <css>` flag allows specifying a CSS selector for the main content area (e.g., `--content-selector "article.main"`)
- [ ] A `--sitemap` flag uses the site's `sitemap.xml` instead of link discovery
- [ ] A `--delay <ms>` flag controls delay between requests (default: reasonable politeness delay)
- [ ] A `--max-pages <n>` flag limits the number of pages crawled
- [ ] A `-o <file>` flag writes output to a file instead of stdout
- [ ] `--depth <n>` controls how many levels deep to follow links (default: 1 — only links on the root page)
- [ ] Progress is reported to stderr so it doesn't interfere with stdout piping
- [ ] Duplicate URLs are detected and skipped
- [ ] Errors on individual pages are reported to stderr but don't stop the crawl
- [ ] The tool respects `robots.txt`

## Out of Scope

- JavaScript rendering (SPA support) — future enhancement with Puppeteer/Playwright
- Authentication or session-based access
- PDF or EPUB output (use Paperboy for that)
- Incremental/cached crawling
- Image downloading and embedding (images are referenced by URL in the Markdown)

## Relationship to Other Tools

- **Paperboy** — Downstream consumer. `papercrawl` produces `.md` files that Paperboy converts to EPUB and delivers to Kindle.
- **Paperclip** — Complementary. Paperclip handles single pages in-browser with full JS rendering. `papercrawl` handles multi-page static crawling from the CLI.
- **PB-005 (URL to Kindle)** — Dropped. PB-005 aimed to add URL handling inside Paperboy itself. This feature takes the opposite approach: a separate composable tool, keeping Paperboy focused on delivery.

## Open Questions

1. **Separate repo or monorepo?** — Should `papercrawl` live in its own repository, or as a new package within the Paperboy repo?
2. **Page ordering** — Should pages follow the order they appear in the navigation, or alphabetical, or depth-first crawl order?
3. **Image handling** — Should images be left as remote URLs, downloaded locally, or stripped?
