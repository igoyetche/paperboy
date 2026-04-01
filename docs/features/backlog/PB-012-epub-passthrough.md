# PB-012: Accept EPUB Files Without Transformation

**Status:** Backlog
**Date:** 2026-04-01

## Motivation

Users may already have content in EPUB format (from Calibre, other tools, or third-party sources). Currently Paperboy only accepts Markdown input and always runs the conversion pipeline. Skipping conversion for files that are already EPUB avoids unnecessary processing and potential quality loss from a round-trip conversion.

## Scope

Allow Paperboy to detect `.epub` files and send them directly to Kindle without running the Markdown-to-EPUB conversion step.

## Acceptance Criteria

- [ ] CLI accepts `--file <path>` with a `.epub` extension and sends it without conversion
- [ ] Watcher picks up `.epub` files in the watch folder and sends them without conversion
- [ ] MCP tool accepts an optional parameter indicating the content is already EPUB (or auto-detects)
- [ ] Markdown files continue to go through the existing conversion pipeline unchanged
- [ ] Title is extracted from the EPUB metadata when `--title` is not provided, or from the filename as fallback

## Out of Scope

- Accepting other formats (PDF, MOBI, HTML)
- Validating or repairing malformed EPUB files
- Converting EPUB to a different EPUB version
