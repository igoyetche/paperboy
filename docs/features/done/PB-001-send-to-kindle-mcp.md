# PB-001: Send to Kindle MCP Server (MVP)

> Status: Done
> Created: 2026-03-03
> Completed: 2026-03-05

## Problem

No automated way existed to send content from Claude directly to a Kindle device. Users had to manually format documents, export files, and use Amazon's web uploader or email interface.

## Goal

Build an MCP server that converts Markdown to EPUB and emails it to a Kindle device in a single tool call from Claude.

## Acceptance Criteria

- Claude can invoke `send_to_kindle` with a title and Markdown content
- Content is converted to EPUB and delivered via SMTP to the configured Kindle email address
- Server runs locally via stdio transport
- Configuration is environment-variable driven
- TypeScript strict mode, no `any`, no assertions
- Containerized and deployable via Docker

## Outcome

All acceptance criteria met. 149 tests across 17 test files. Three-layer architecture (Application → Domain ← Infrastructure) with Result types, value objects, and dependency injection established as the project foundation.

See `docs/designs/PB-001-main/adr.md` for architecture decisions.
See `docs/plans/done/PB-001-2026-03-03-send-to-kindle-mcp.md` for task archive.
