# Changelog — Spec, Design & Plan Deviations

Tracks every change to specs, designs, and plans that deviates from the original.

---

## 2026-03-05 — Multiple Kindle Addresses

### Feature Completed
- **Multiple Kindle Addresses**: Replaces single `KINDLE_EMAIL` with `KINDLE_DEVICES=name:email,...` tuple format supporting up to 10 named devices. Optional `device` parameter added to `send_to_kindle` tool. Device resolution happens at call time with fail-fast startup validation.

### Spec Changes
- **features/done/multiple-kindle-addresses.md — backwards compat removed**: Feature spec originally promised `KINDLE_EMAIL` fallback for existing users. Implementation chose clean break instead. `KINDLE_EMAIL` is removed entirely. Existing deployments must migrate to `KINDLE_DEVICES=default:addr@kindle.com`. Decision: personal single-user tool, controlled upgrade path.

### Plan Changes
- **2026-03-05-multiple-kindle-addresses.md (archived)**: 9 tasks, all completed. 87 tests total (32 new tests added).

### New Modules
- `src/domain/values/email-address.ts` — EmailAddress value object
- `src/domain/values/kindle-device.ts` — KindleDevice value object
- `src/domain/device-registry.ts` — DeviceRegistry domain type (max 10, resolve by name, never leaks emails)

### Modified Modules
- `src/domain/ports.ts` — DocumentMailer.send gains KindleDevice param; DeliveryLogger gains deviceName param
- `src/infrastructure/mailer/smtp-mailer.ts` — uses device.email.value as `to:` address
- `src/infrastructure/logger.ts` — all log methods include deviceName
- `src/domain/send-to-kindle-service.ts` — execute() gains KindleDevice param; DeliverySuccess gains deviceName
- `src/infrastructure/config.ts` — KINDLE_DEVICES parsing replaces KINDLE_EMAIL
- `src/application/tool-handler.ts` — device resolution via DeviceRegistry
- `src/index.ts` — registerTools() factory, httpConfig destructuring, 3-arg ToolHandler

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
