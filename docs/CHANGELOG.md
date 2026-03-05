# Changelog — Spec, Design & Plan Deviations

Tracks every change to specs, designs, and plans that deviates from the original.

---

## 2026-03-05 — MCP Server Completion & Backlog Features

### Spec Changes
- **specs/main-spec.md — NFR-6 updated**: Added requirement that logs must be written to stderr when using stdio transport (stdout reserved for JSON-RPC)

### Design Changes
- **docs/design/main/adr.md**: Updated to document `pino.destination(2)` for stderr logging
- **docs/design/main/adr.md**: Documented correct `EPub` API usage (named export, not default export)

### Plan Changes
- **2026-03-03-send-to-kindle-mcp.md (archived)**: Implementation complete, all 16 tasks delivered with 55 passing tests
- **2026-03-04-dotenv-local-fallback.md (archived)**: dotenv integration complete, 4 commits

### Bug Fixes & Implementation Notes
- Fixed `epub-gen-memory` API: corrected from `epubGen(...)` to `new EPub(...).genEpub()`
- Redirected Pino logger to stderr so stdout stays clean for JSON-RPC on stdio transport
- Added converter tests that explicitly verify error paths (catches silent conversion failures)
- Bug discovery: tests were only asserting `result.ok === true` path, missing silent failures in error paths

### Features Added to Backlog
- Multiple Kindle Addresses (send to one or multiple devices)
- URL to Kindle (extract and send articles from URLs)
- CLI Version + Claude Code Skill (dual distribution: MCP server + npm CLI)
- Trusted HTTPS Certificate (support Let's Encrypt, Tailscale, Cloudflare Tunnel)
