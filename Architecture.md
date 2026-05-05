# Paperboy — Architecture

A reference describing how Paperboy is structured: layers, modules, pipelines, and the key contracts that hold them together. Intended for contributors and reviewers who need more depth than `README.md` provides.

For decision rationale, see the per-feature ADRs under `docs/designs/PB-*/`. For requirements, see `docs/specs/main-spec.md` (and `docs/specs/PB-016-image-downloading-spec.md`). For a chronological log of how the system has changed, see `docs/CHANGELOG.md`.

---

## 1. System Overview

Paperboy ingests **Markdown** or **EPUB** content from one of three entry points and delivers an EPUB to a configured Kindle device by email.

```
              ┌──────────────────────────────────────────────────┐
              │                  ENTRY POINTS                    │
              │                                                  │
   Claude  →  │  MCP Server (stdio + HTTP/SSE)   index.ts        │
   Shell   →  │  CLI         (paperboy)          cli-entry.ts    │
   Disk    →  │  Watcher     (paperboy watch)    watch-entry.ts  │
              └──────────────────────────────────────────────────┘
                                  │
                                  ▼
              ┌──────────────────────────────────────────────────┐
              │                APPLICATION LAYER                 │
              │  ToolHandler · cli.run · startWatcher /          │
              │  processFile / processEpubFile                   │
              └──────────────────────────────────────────────────┘
                                  │
                                  ▼
              ┌──────────────────────────────────────────────────┐
              │                  DOMAIN LAYER                    │
              │  SendToKindleService  ·  DeviceRegistry          │
              │  TitleResolver  ·  Value Objects  ·  Ports       │
              │  Discriminated-union errors  ·  Result<T, E>     │
              └──────────────────────────────────────────────────┘
                                  ▲
                                  │ (implements ports)
              ┌──────────────────────────────────────────────────┐
              │              INFRASTRUCTURE LAYER                │
              │  MarkdownEpubConverter · ImageProcessor          │
              │  CoverGenerator · SmtpMailer · EpubReader        │
              │  GrayMatterFrontmatterParser · FolderWatcher     │
              │  Config · DotenvLoader · Pino logger             │
              └──────────────────────────────────────────────────┘
                                  │
                                  ▼
              ┌──────────────────────────────────────────────────┐
              │              EXTERNAL DEPENDENCIES               │
              │  HTTP image hosts · SMTP (Gmail/etc) · Kindle    │
              │  Send-to-Kindle email gateway · Disk             │
              └──────────────────────────────────────────────────┘
```

---

## 2. Layering and Dependency Rules

Three layers with a strict dependency direction enforced by the project structure under `src/`:

| Layer | Imports from | Imported by |
|---|---|---|
| **Domain** (`src/domain/`) | Nothing outside `domain/` | Application, Infrastructure |
| **Infrastructure** (`src/infrastructure/`) | Domain (contracts + errors only) | Composition roots |
| **Application** (`src/application/`) | Domain (services + values + ports) | Composition roots |
| **Composition roots** (`src/index.ts`, `src/cli-entry.ts`, `src/watch-entry.ts`) | All three layers | Process entry only |

**Invariants:**

1. Domain code never imports from `infrastructure/` or `application/`.
2. Infrastructure implements domain ports; it never imports from `application/`.
3. Application orchestrates domain services and depends only on domain abstractions (it receives infrastructure implementations through the composition root).
4. Only the composition roots use `new` to construct concrete infrastructure classes.

Layer boundaries are tested implicitly by the strict ESM imports — a violation produces a TypeScript error.

---

## 3. Entry Points and Composition Roots

Each entry point is a thin file that loads config, wires dependencies, and delegates to an application function.

### 3.1 `src/index.ts` — MCP server

- Loads config (fail-fast).
- Wires `ImageProcessor`, `CoverGenerator`, `MarkdownEpubConverter`, `SmtpMailer`, `SendToKindleService`, `GrayMatterFrontmatterParser`, and `ToolHandler`.
- Registers the `send_to_kindle` MCP tool with a Zod input schema (`title?`, `content`, `author?`, `device?`).
- Always starts a **stdio transport**.
- If `MCP_HTTP_PORT` is set, also starts an Express-based **HTTP/SSE transport** at `POST /mcp`, gated by `MCP_AUTH_TOKEN` (Bearer token middleware). `GET` and `DELETE` on `/mcp` return 405.

### 3.2 `src/cli-entry.ts` — CLI

- Handles `--help` and `--version` before loading config (so they work without env vars).
- If `argv[0] === "watch"`, rewrites `process.argv` and dynamically imports `./watch-entry.js`.
- Loads dotenv from CWD then `~/.paperboy/.env` (see §7.2), then loads config.
- Creates a Pino logger at level `silent` (CLI communicates exclusively via stderr; ADR #9).
- Wires the same converter/mailer/service stack as MCP.
- Calls `application/cli.ts → run({ ... })` with injected file/stdin/EPUB readers and `process.stderr` as the output sink.
- Coerces `process.stdin.isTTY` to a boolean (`undefined → false`; ADR #10) so the CLI knows whether stdin is connected to a terminal.
- Configuration errors caught here exit with code 4; any other thrown error exits with code 1.

### 3.3 `src/watch-entry.ts` — Folder watcher

- Handles `paperboy watch --help` before loading config.
- Loads dotenv (same logic as CLI) and config.
- Validates `WATCH_FOLDER` is set and the directory exists; either failure exits with code 4.
- Wires the same converter/mailer/service stack, plus a `FileMover` and a `chokidar`-based `FolderWatcher`.
- Calls `startWatcher({ ... })` which returns a handle; the entry registers `SIGINT`/`SIGTERM` handlers that drain in-flight work, close the watcher, and exit cleanly.

---

## 4. Domain Layer (`src/domain/`)

Pure TypeScript: no I/O, no framework imports, no `any`.

### 4.1 Value objects (`src/domain/values/`)

All value objects are **immutable**, validate at construction, and use static factory methods that return `Result<T, E>` (no exceptions for predictable failures).

| Type | Purpose | Notable invariants |
|---|---|---|
| `Title` | Document title | Trimmed, non-empty |
| `Author` | Author metadata | Trimmed, non-empty |
| `MarkdownContent` | Markdown body bytes | Non-empty, ≤ 25 MB after frontmatter strip |
| `DocumentMetadata` | Frontmatter values (`title?`, `url?`, `date?`, etc.) | Permissive parsing; only well-known fields surfaced |
| `MarkdownDocument` | `{ content: MarkdownContent, metadata: DocumentMetadata }` aggregate | Built via `fromParts(...)` |
| `EpubDocument` | EPUB output | Holds `title`, `buffer`, optional `imageStats`, `author`, `date` |
| `EmailAddress` | Validated email | Used by `KindleDevice` and `SENDER_EMAIL` |
| `KindleDevice` | `{ name, email }` pair | Name non-empty, email is `EmailAddress` |
| `ImageStats` | Per-document image processing summary | `total / downloaded / failed / skipped` |

### 4.2 Services

- **`SendToKindleService`** — orchestrates the pipeline. Two methods:
  - `execute(title, document, author, device)` — runs `ContentConverter.toEpub(...)` then `DocumentMailer.send(...)`. On failure of either step, logs and returns the `Result` error. Returns `DeliverySuccess { title, sizeBytes, deviceName, imageStats? }`.
  - `sendEpub(epub, device)` — PB-012 passthrough: skips conversion, calls the mailer directly with a pre-built `EpubDocument`.
  - Logging happens at the service boundary (attempt / success / failure), never inside value objects.

- **`DeviceRegistry`** — built from parsed `KINDLE_DEVICES` env var; resolves a device name (or the default) to a `KindleDevice`. Returns `Result<KindleDevice, ValidationError>` for unknown names.

- **`TitleResolver`** (`resolveTitle(candidates)`) — pure function; tries an ordered array of `string | undefined` candidates, returning the first one that passes `Title.create(...)`. Empty/whitespace candidates are skipped. Returns a `ValidationError` if no candidate yields a valid title. Used by every entry point to apply the priority chain (see §8).

- **`findFirstH1`** — helper that scans markdown body for the first ATX or Setext H1 heading, used as a fallback title source by the watcher.

### 4.3 Ports

```ts
interface ContentConverter {
  toEpub(title: Title, document: MarkdownDocument, author: Author):
    Promise<Result<EpubDocument, ConversionError>>;
}

interface DocumentMailer {
  send(document: EpubDocument, device: KindleDevice):
    Promise<Result<void, DeliveryError>>;
}

interface DeliveryLogger {
  deliveryAttempt(title, format, deviceName): void;
  deliverySuccess(title, format, sizeBytes, deviceName): void;
  deliveryFailure(title, errorKind, message, deviceName): void;
}

interface FrontmatterParser {
  parse(raw: string):
    Result<{ metadata: DocumentMetadata; body: string }, FrontmatterError>;
}
```

### 4.4 Errors and `Result<T, E>`

Discriminated union with a `kind` field on every error class so `switch` over `error.kind` is exhaustively type-checked:

```ts
type DomainError =
  | ValidationError    // kind: "validation"
  | SizeLimitError     // kind: "size_limit"
  | ConversionError    // kind: "conversion"
  | DeliveryError      // kind: "delivery", cause: "auth" | "connection" | "rejection"
  | FrontmatterError;  // kind: "frontmatter"

type Result<T, E> =
  | { readonly ok: true;  readonly value: T }
  | { readonly ok: false; readonly error: E };

const ok  = <T>(value: T): Result<T, never>  => ({ ok: true,  value });
const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
```

`Result` is used end-to-end for predictable failures. Exceptions are reserved for programming bugs and the config-loading fail-fast path.

---

## 5. Infrastructure Layer (`src/infrastructure/`)

Concrete adapters that implement domain ports and bridge to external systems. None of these are imported by the domain layer.

### 5.1 Conversion (`infrastructure/converter/`)

- **`MarkdownEpubConverter`** (implements `ContentConverter`):
  1. `marked.parse()` → raw HTML.
  2. `sanitize-html` with a curated allowlist (headings, paragraphs, code blocks, lists, tables, anchors, images, divs, spans). Allowed schemes: `http`, `https`, `mailto`.
  3. `ImageProcessor.process(html)` rewrites `<img src>` references and returns `ProcessedImage[]` buffers + `ImageStats`.
  4. `CoverGenerator` produces the cover JPEG, the cover HTML chapter, and the cover CSS.
  5. `createEpubWithPredownloadedImages(...)` builds the EPUB with the cover chapter first (excluded from TOC, before TOC), then the content chapter, attaching the pre-downloaded image buffer map on the instance.
  6. `genEpub()` returns the final `Buffer`, wrapped in `EpubDocument` along with stats, author, and date metadata.
  7. Any thrown error is caught and converted to `ConversionError`.

- **`ImageProcessor`** (used by the converter):
  - Walks the sanitized HTML, downloads each remote image with browser-compatible headers (`User-Agent`, `Accept`, `Accept-Language`).
  - **SSRF protection**: every URL — initial and redirected — is DNS-resolved and rejected if it points to private IPv4 ranges (`10/8`, `172.16/12`, `192.168/16`, `127/8`) or loopback.
  - **Redirect handling**: follows up to 5 hops, applying SSRF check at each hop, rejecting non-HTTP(S) protocols.
  - **Format conversion**: AVIF, WebP, TIFF, SVG, HEIF, HEIC are converted to JPEG via `sharp` before embedding (Kindle compatibility, PB-016/PB-017).
  - **Configurable** via env: `IMAGE_FETCH_TIMEOUT_MS` (15s), `IMAGE_MAX_RETRIES` (2), `IMAGE_MAX_CONCURRENCY` (5), `IMAGE_MAX_BYTES` per image (5 MB), `IMAGE_MAX_TOTAL_BYTES` per document (100 MB).
  - **Failure isolation**: a single failed image does not fail the document; `<img>` tags for unreachable URLs are removed and counted in `ImageStats`.

- **`CoverGenerator`**:
  - Builds an SVG cover from a template (`cover-templates.ts`) using title, author, and source domain (from frontmatter `url`, hostname only).
  - Rasterises to a 600×900 JPEG via `sharp`.
  - Also produces the cover CSS and an HTML chapter (`<img>` referencing `cover.jpg` plus title/author/source).
  - Source-domain text appears only on the cover chapter, not on the thumbnail (FR-37).

- **`epub-with-images`**:
  - Thin wrapper around `epub-gen-memory` that overrides the image-download step so pre-downloaded buffers are embedded as files inside `OEBPS/images/` rather than inlined as data URIs (PB-017 — required for Kindle to render images).

### 5.2 Delivery (`infrastructure/mailer/`)

- **`SmtpMailer`** (implements `DocumentMailer`):
  - `nodemailer`-based SMTP send.
  - Connection timeout 10 s, socket timeout 30 s.
  - Slugifies the title for the EPUB attachment filename (`/[^a-z0-9]+/g → "-"`).
  - **Error categorisation** (returned as `DeliveryError.cause`):
    - `EAUTH` → `"auth"` (permanent — never retried by the watcher).
    - `ECONNECTION` / `ESOCKET` / `ETIMEDOUT` → `"connection"` (transient — retried).
    - 5xx / SMTP rejection → `"rejection"` (permanent).

### 5.3 CLI input (`infrastructure/cli/`)

- **`content-reader.ts`** — `readFromFile(path)` (size-guarded) and `readFromStdin(stream, timeoutMs)` for Markdown.
- **`epub-reader.ts`** — `readEpubFile(path)` extracts `<dc:title>` from the OPF file via `jszip`, enforces a 50 MB ceiling (Send-to-Kindle attachment limit), returns `{ buffer, suggestedTitle }`.

### 5.4 Watcher (`infrastructure/watcher/`)

- **`folder-watcher.ts`** — wraps `chokidar`. Watches only the root of `WATCH_FOLDER` (no subdirectories). Waits for the file to stop changing before emitting (handles slow copies). Calls `onFile(path)` for each ready file.
- **`file-mover.ts`** — moves processed files to `WATCH_FOLDER/sent/` or `WATCH_FOLDER/error/`. On error, also writes a `<filename>.error.txt` file describing the failure. Creates the destination directories on demand.

### 5.5 Frontmatter (`infrastructure/frontmatter/`)

- **`GrayMatterFrontmatterParser`** (implements `FrontmatterParser`) — wraps `gray-matter`. On well-formed input returns `{ metadata, body }`; on malformed YAML returns a `FrontmatterError`. Body is the raw content with the frontmatter block stripped — used to enforce the 25 MB size limit on actual content (FR-17 amended via PB-018).

### 5.6 Configuration (`infrastructure/config.ts`, `infrastructure/dotenv-loader.ts`)

- `loadConfig()` reads and validates env vars and returns a typed `Config`. Throws synchronously on the first missing/invalid value (fail-fast).
- Parses `KINDLE_DEVICES` (`name1:email1,name2:email2`) into a `DeviceRegistry`, optionally honouring `KINDLE_DEFAULT_DEVICE`.
- Validates `SENDER_EMAIL` via `EmailAddress.create`.
- Image-processor knobs and watcher knobs are optional with sensible defaults (see §5.1).
- `loadDotenv(...)` loads `./.env` first, then `~/.paperboy/.env` as a fallback (ADR #11 — warns on parse errors but not on `ENOENT`).

### 5.7 Logging (`infrastructure/logger.ts`)

- Pino-based structured JSON logger.
- `createDeliveryLogger(pino)` adapts to the domain `DeliveryLogger` port.
- `createImageProcessorLogger(pino)` adapts to the image-processor logging interface.
- CLI mode uses level `silent`; MCP and watcher honour `LOG_LEVEL`.

---

## 6. Application Layer (`src/application/`)

Adapters that translate from a transport-specific shape into domain calls and back. They depend only on domain abstractions.

### 6.1 `tool-handler.ts` — MCP adapter

`ToolHandler.handle({ title?, content, author?, device? })`:

1. Resolve device via `DeviceRegistry`.
2. Parse frontmatter via `FrontmatterParser`.
3. Build `MarkdownContent` from the stripped body (size validation here).
4. Resolve title via `resolveTitle([args.title, metadata.title])` — MCP has **no filename fallback**; an unresolvable title is a hard error.
5. Build `Author` (arg or default).
6. Call `service.execute(...)`.

Errors are mapped to a JSON payload `{ success: false, error: <ERROR_CODE>, details }` with `isError: true` for the MCP transport. Codes: `VALIDATION_ERROR`, `SIZE_ERROR`, `FRONTMATTER_ERROR`, `CONVERSION_ERROR`, `SMTP_ERROR`. The success path returns `{ success, message, sizeBytes, imageStats? }` as JSON.

### 6.2 `cli.ts` — CLI adapter

Pure function `run({ ... })` that takes injected dependencies (no I/O of its own) and returns a numeric exit code. Pieces:

- `parseArgs(argv)` — produces a typed `ParsedArgs` discriminated union (`{kind: "ok", ...}` | `{kind: "error", message}` | `{kind: "help"}` | `{kind: "version"}`).
- `resolveContentSource(args, isTTY)` — decides between `--file <path>`, stdin, or "neither" (validation error). Detects `.epub` extension to dispatch through the EPUB-passthrough branch.
- `mapErrorToExitCode(error)` — maps `DomainError.kind` to:
  - `1` validation / size_limit / frontmatter
  - `2` conversion
  - `3` delivery
  - `4` config (handled by the entry point, not in `run()`)
- `formatSuccess(result)` / `formatError(error)` — human-readable strings written to stderr.

The CLI flow for **Markdown** input mirrors `ToolHandler` but adds a filename-stem fallback to the title resolver. The CLI flow for **EPUB** input calls `service.sendEpub(...)` directly with the title resolved from `--title`, then EPUB metadata, then filename stem.

### 6.3 `watcher.ts` — Folder-watcher orchestrator

- **`processFile(path, deps)`** — Markdown pipeline. Steps: read → empty check → frontmatter parse → MarkdownContent → title resolution (`metadata.title → first H1 → filename stem`) → device → `sendWithRetry(execute)`.
- **`processEpubFile(path, deps)`** — EPUB pipeline. Steps: read EPUB → title (metadata or filename stem) → device → `sendWithRetry(sendEpub)`.
- **`sendWithRetry(...)`** — exponential backoff (`2s · 2^attempt`, up to `MAX_RETRIES = 3`) **only** for transient `DeliveryError` with `cause: "connection"`. All other failures terminate the loop. On success → `moveToSent`; on terminal failure → `moveToError(filePath, kind, message)`.
- **`startWatcher(deps)`** — wires `createWatcher`, processes existing files first, then enqueues new files. Maintains a `sentPaths` set to deduplicate, processes one file at a time, and tolerates `moveToSent` failures by marking the file sent in-memory. Returns a `WatcherHandle` whose `shutdown()` drains in-flight work before closing the underlying watcher.

---

## 7. Cross-Cutting Concerns

### 7.1 Configuration

Required env vars:

| Var | Purpose |
|---|---|
| `KINDLE_DEVICES` | `name:email[,name:email]...` |
| `SENDER_EMAIL` | Approved Send-to-Kindle sender |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | SMTP credentials |

Optional env vars:

| Var | Default |
|---|---|
| `KINDLE_DEFAULT_DEVICE` | First device |
| `DEFAULT_AUTHOR` | `Claude` |
| `LOG_LEVEL` | `info` (CLI forces `silent`) |
| `WATCH_FOLDER` | (required for `paperboy watch`) |
| `MCP_HTTP_PORT` | (enables HTTP/SSE) |
| `MCP_AUTH_TOKEN` | (required when port is set) |
| `IMAGE_FETCH_TIMEOUT_MS` | `15000` |
| `IMAGE_MAX_RETRIES` | `2` |
| `IMAGE_MAX_CONCURRENCY` | `5` |
| `IMAGE_MAX_BYTES` | `5 MB` |
| `IMAGE_MAX_TOTAL_BYTES` | `100 MB` |

### 7.2 Dotenv resolution

`loadDotenv` (used by both CLI and watcher entry points) loads in this order:

1. Process environment (always wins).
2. `./.env` in CWD.
3. `~/.paperboy/.env` (global fallback for installs run from arbitrary directories).

`ENOENT` on the global fallback is silent. Parse errors emit a warning to stderr.

### 7.3 Error handling

- Predictable failures use `Result<T, E>` everywhere from value-object construction through to the application boundary.
- Exceptions are caught at infrastructure boundaries (e.g. `nodemailer` throws, `marked` throws) and converted to the appropriate domain error class.
- The composition roots wrap their main function in a final `try/catch` that maps to exit codes (`1` fatal, `4` config).

### 7.4 Logging

- Pino JSON logs flow through the `DeliveryLogger` and `ImageProcessorLogger` ports — domain code never imports Pino.
- The CLI sets log level to `silent` and writes user-visible messages to stderr; stdout is reserved (it is the MCP stdio transport channel when running as a server).
- No log statement ever serialises SMTP credentials, Kindle email addresses, or document body content.

### 7.5 Security

- **HTML sanitisation** — every Markdown-derived HTML chunk passes through `sanitize-html` with a fixed tag/attribute allowlist before being embedded.
- **SSRF defence** — `ImageProcessor` resolves DNS for every URL (and every redirect target) and rejects private/loopback addresses and non-HTTP(S) schemes.
- **Resource caps** — per-image, per-document, and per-fetch ceilings on size and time.
- **Auth on HTTP transport** — the optional MCP HTTP/SSE transport requires a Bearer token equal to `MCP_AUTH_TOKEN` on every request.
- **npm audit gate** — pre-commit hook and CI both fail the build on high/critical vulnerabilities.
- **Secrets hooks** — `.claude/hooks/sonar-secrets/` blocks accidental commits of credentials.

---

## 8. Title Resolution

Title resolution is centralised in `domain/title-resolver.ts` and applied per entry point with different candidate lists. First non-empty, valid candidate wins; `Title.create(...)` provides validation; if no candidate yields a valid title, returns a `ValidationError` mapped to exit code `1` / MCP `VALIDATION_ERROR`.

| Entry point | Candidate order |
|---|---|
| **MCP** | `args.title` → `metadata.title` → (error) |
| **CLI (Markdown)** | `--title` → `metadata.title` → first H1 → filename stem (file only) → (error) |
| **CLI (EPUB)** | `--title` → EPUB `<dc:title>` → filename stem → (error) |
| **Watcher (Markdown)** | `metadata.title` → first H1 → filename stem → (error) |
| **Watcher (EPUB)** | EPUB `<dc:title>` → filename stem → (error) |

---

## 9. Pipelines

### 9.1 Markdown → EPUB (default)

```
raw markdown
   │
   ▼  GrayMatterFrontmatterParser
{ metadata, body }
   │
   ▼  MarkdownContent.create  (size + non-empty)
MarkdownContent
   │
   ▼  resolveTitle(...)
Title
   │
   ▼  MarkdownDocument.fromParts(content, metadata)
MarkdownDocument
   │
   ▼  SendToKindleService.execute(title, document, author, device)
   │
   │  → MarkdownEpubConverter.toEpub(...)
   │       marked.parse → sanitize-html → ImageProcessor.process
   │       → CoverGenerator (cover JPEG + HTML chapter + CSS)
   │       → epub-with-images.createEpubWithPredownloadedImages
   │       → genEpub() → Buffer
   │  → EpubDocument(title, buffer, imageStats, author, date)
   │  → SmtpMailer.send(epub, device)  → Result<void, DeliveryError>
   ▼
DeliverySuccess { title, sizeBytes, deviceName, imageStats }
```

### 9.2 EPUB passthrough (PB-012)

```
.epub file
   │
   ▼  EpubReader.readEpubFile(path)  (size + <dc:title>)
{ buffer, suggestedTitle }
   │
   ▼  resolveTitle([cliTitle, suggestedTitle, filenameStem])
Title
   │
   ▼  EpubDocument(title.value, buffer)
   │
   ▼  SendToKindleService.sendEpub(epub, device)
   │       → SmtpMailer.send(...)
   ▼
DeliverySuccess { title, sizeBytes, deviceName }
```

EPUB passthrough is **not** available via MCP (binary content cannot be expressed as an MCP text parameter — FR-35).

### 9.3 Image processing (subset of 9.1)

```
sanitized HTML with <img src="https://...">
   │
   ▼  parse <img> nodes, queue URLs (unique)
   │
   ▼  for each URL (concurrency ≤ IMAGE_MAX_CONCURRENCY):
   │      DNS resolve → reject if private/loopback
   │      fetch with browser headers + timeout
   │      on 3xx (≤ 5 hops): re-resolve, re-check SSRF, re-fetch
   │      detect format → if AVIF/WebP/HEIC/etc → sharp → JPEG
   │      enforce per-image and per-document size caps
   │  → ProcessedImage { filename, buffer, format }
   │
   ▼  rewrite each <img src> to point at the local filename;
   │  drop <img> for failed URLs
   │
   ▼  ImageStats { total, downloaded, failed, skipped }
```

---

## 10. Watcher Lifecycle

```
startWatcher(deps)
   │
   ▼  listFiles(WATCH_FOLDER, ".md")  +  listFiles(WATCH_FOLDER, ".epub")
   │  enqueue each existing file
   │
   ▼  createWatcher({ inboxPath, onFile: enqueue })
   │  chokidar emits 'add' after the file stops changing
   │
   ▼  serial queue drain (one file at a time):
   │     dispatch by extension:
   │        .epub → processEpubFile
   │        else  → processFile
   │     sendWithRetry:
   │        attempt 0, 1×2s, 2×4s, 3×8s — only for transient connection errors
   │     on success → moveToSent (sent/) ; mark in sentPaths
   │     on terminal error → moveToError (error/ + .error.txt) ; mark in sentPaths
   │
   ▼  on SIGINT/SIGTERM:
   │     mark shutdownRequested
   │     wait until current file finishes
   │     watcher.close()
   ▼
process.exit(0)
```

---

## 11. Project Layout

```
src/
  domain/
    values/                    Title, Author, MarkdownContent, MarkdownDocument,
                                 EpubDocument, EmailAddress, KindleDevice,
                                 ImageStats, DocumentMetadata
    ports.ts                   ContentConverter, DocumentMailer, DeliveryLogger,
                                 FrontmatterParser
    errors.ts                  DomainError union + Result<T, E> + ok / err
    send-to-kindle-service.ts  Pipeline orchestration (execute, sendEpub)
    device-registry.ts         Name → KindleDevice resolution
    title-resolver.ts          Priority-ordered title selection
    find-first-h1.ts           Watcher title fallback
  infrastructure/
    converter/
      markdown-epub-converter.ts
      image-processor.ts
      cover-generator.ts
      cover-templates.ts
      epub-with-images.ts
      assets/cover-icon.png
    mailer/smtp-mailer.ts
    cli/
      content-reader.ts
      epub-reader.ts
    watcher/
      folder-watcher.ts
      file-mover.ts
    frontmatter/gray-matter-parser.ts
    config.ts
    dotenv-loader.ts
    logger.ts
  application/
    tool-handler.ts            MCP adapter
    cli.ts                     CLI adapter (parseArgs, run, ...)
    watcher.ts                 startWatcher, processFile, processEpubFile
  index.ts                     MCP composition root (stdio + HTTP/SSE)
  cli-entry.ts                 CLI composition root
  watch-entry.ts               Watcher composition root
test/                          Mirrors src/; 335 tests across 31 files
docs/
  features/{backlog,active,done}/   Change requests
  designs/PB-*/                     Per-feature ADRs
  specs/                            Permanent system truth (main-spec, image-spec)
  plans/{backlog,active,done}/      Task breakdowns
  STATUS.md                         Dashboard
  CHANGELOG.md                      Decision log
scripts/service-templates/     systemd, launchd, Windows Task Scheduler
sonar-project.properties       SonarCloud scan config
Dockerfile                     Multi-stage Node 22 Alpine
docker-compose.yml
```

---

## 12. Testing Strategy

- **Vitest**, fast and isolated.
- **Mocks at boundaries only** — domain code is exercised against fake ports; value objects and services are not mocked.
- **Per-layer coverage:**
  - Domain: every value object construction path + every service branch (happy + each error kind).
  - Infrastructure: the converter pipeline (HTML → EPUB → buffer round-trip), `SmtpMailer` error categorisation, `ImageProcessor` headers / redirect / SSRF / format conversion, `CoverGenerator` rasterisation, `EpubReader` title extraction, `GrayMatterParser` strip + error, watcher detection / debounce / dedupe.
  - Application: every `ToolHandler` and `cli.run` branch; watcher orchestrator dispatch + retry + file-movement.
- **Integration:**
  - `cli-binary.test.ts` — the built `dist/cli-entry.js` exits 0 for `--help`/`--version` and 4 for invalid configuration.
  - `image-downloading-real-sample.test.ts` — converts a real article with 70 remote images end-to-end. Live-network tests are skipped by default in `image-downloading.test.ts`.
- **Counts (current):** 335 passed, 3 skipped (long-running real-network), across 31 files. `npm test` runs the full suite in ~10 s.

---

## 13. Build, Packaging, Deployment

- **Build** — `npm run build` runs `tsc` then a `postbuild` script that copies `src/infrastructure/converter/assets/` (cover-icon PNG) into `dist/`.
- **Package** — `package.json` declares `"bin": { "paperboy": "./dist/cli-entry.js" }`, so `npm install -g .` (or any consumer) gets the `paperboy` and `paperboy watch` commands directly.
- **Containers** — multi-stage `Dockerfile` based on Node 22 Alpine; `docker-compose.yml` for local runs. Targets x86_64 and ARM64.
- **Service templates** under `scripts/service-templates/`:
  - Linux — `paperboy-watcher.service` for `systemctl --user`.
  - macOS — `com.paperboy.watcher.plist` for `launchctl`.
  - Windows — `windows-task.xml` for Task Scheduler.

---

## 14. Quality and CI

- **TypeScript** — `strict: true`, `noImplicitAny: true`, `noUncheckedIndexedAccess: true`, no `any`, no `as` assertions, no `@ts-ignore`/`!`.
- **ESLint** via husky + lint-staged on every commit.
- **npm audit** — `npm run audit:ci` enforced in pre-commit hook and CI; fails on high/critical vulnerabilities.
- **SonarCloud** — `sonar-project.properties` configures the scan; `npm run sonar:local` produces coverage and pushes a local scan; CI runs the same on PRs. Quality badges live in `README.md`.
- **Pre-PR checklist** in `CLAUDE.md` requires updating `STATUS.md`, `CHANGELOG.md`, moving feature/plan files to `done/`, and a clean SonarQube scan.

---

## 15. Where to Read Next

- **Decision rationale** — `docs/designs/PB-*/adr.md` (PB-001 main, PB-004 CLI, PB-009 watcher, PB-012 EPUB passthrough, PB-016 image downloads, PB-017 Kindle image embedding, PB-019 image headers + redirects, PB-008 cover, PB-014 SonarCloud).
- **System requirements** — `docs/specs/main-spec.md`, `docs/specs/PB-016-image-downloading-spec.md`.
- **Active and queued work** — `docs/STATUS.md`.
- **What changed and why** — `docs/CHANGELOG.md`.
- **Project conventions** — `CLAUDE.md` (coding rules, workflow, layering examples).
