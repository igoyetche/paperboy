# PB-012: Accept EPUB Files — Technical Design

**Status:** In Progress
**Branch:** pb-012-epub-passthrough
**Feature:** docs/features/active/PB-012-epub-passthrough.md

---

## 1. Problem

Paperboy's CLI and watcher only accept Markdown files. Users with pre-built EPUBs (from Calibre, web clippers, other tools) must convert their files to Markdown before Paperboy will accept them — an unnecessary round-trip that can lose formatting.

## 2. Approach

**Approach A: New `sendEpub()` method on `SendToKindleService`**

The service gains a second public method that accepts an already-built `EpubDocument` and sends it directly to the mailer, bypassing the `ContentConverter` entirely. The CLI and watcher detect the `.epub` extension and branch to this path. The existing `execute()` method and Markdown pipeline are untouched.

**Rejected alternatives:**
- **Unified `execute()` with discriminated input** — adds `instanceof` checks at domain level, changes existing public API
- **Bypass service, call mailer directly from CLI/watcher** — loses structured logging and error handling the service provides

## 3. Architecture

### New File

**`src/infrastructure/cli/epub-reader.ts`**
Reads an EPUB file from disk and extracts its title:
1. Size check: reject files over 50 MB (Amazon's Send to Kindle limit)
2. Read bytes into `Buffer`
3. Try to extract `<dc:title>` from EPUB metadata:
   - Open ZIP (via `jszip`)
   - Parse `META-INF/container.xml` to find OPF path
   - Parse OPF file to extract `<dc:title>`
   - On any failure: fall back to filename stem
4. Return `{ buffer, suggestedTitle }`

The `EpubDocument` is constructed by the caller (CLI or watcher) after title resolution, so the reader stays focused on I/O and metadata extraction.

### Modified Files

**`src/domain/send-to-kindle-service.ts`**
New `sendEpub(epub: EpubDocument, device: KindleDevice)` method:
- Logs delivery attempt
- Calls `mailer.send(epub, device)` directly
- Logs success or failure
- Returns `Result<DeliverySuccess, DomainError>`

No change to `execute()`.

**`src/application/cli.ts`**
- `CliDeps.service` pick extended to include `sendEpub`
- `CliDeps` gains `readEpubFile: (path: string) => Promise<EpubReadResult>`
- `run()` inserts an EPUB branch after content source resolution: if `source.kind === "file"` and path ends with `.epub`, take the passthrough path (read → resolve title → sendEpub) and return early

Title resolution for EPUB in CLI: `[explicit --title, suggestedTitle from epub metadata]`
The filename stem is already embedded in `suggestedTitle` as a fallback, so `resolveTitle` always finds a non-empty candidate.

**`src/application/watcher.ts`**
- `WatcherDeps.service` pick extended to include `sendEpub`
- `WatcherDeps` gains `readEpubFile: (path: string) => Promise<EpubReadResult>`
- New `processEpubFile(filePath, deps)` function: mirrors `processFile()` structure — read, resolve title, resolve device, call `service.sendEpub()` with the same transient SMTP retry loop, move to `sent/` or `error/`
- `startWatcher()` lists both `.md` and `.epub` files at startup
- `processNext()` dispatches based on file extension

**`src/cli-entry.ts`**
Wires `readEpubFile` from `epub-reader.ts` into `CliDeps`.

**`src/watch-entry.ts`**
Wires `readEpubFile` from `epub-reader.ts` into `WatcherDeps`.

**`package.json`**
Adds `jszip` as a direct dependency (currently transitive via `epub-gen-memory`).

## 4. Data Flow

### CLI EPUB path
```
paperboy --file book.epub
  → resolveContentSource() → { kind: "file", path: "book.epub" }
  → detect .epub extension
  → readEpubFile("book.epub") → { buffer, suggestedTitle }
  → resolveTitle([explicit --title, suggestedTitle])
  → resolve device
  → new EpubDocument(resolvedTitle, buffer)
  → service.sendEpub(epub, device)
  → mailer.send(epub, device)
  → formatSuccess() → exit 0
```

### Watcher EPUB path
```
book.epub dropped in watch folder
  → chokidar picks it up
  → processEpubFile() called
  → readEpubFile() → { buffer, suggestedTitle }
  → resolveTitle([suggestedTitle])  ← filename stem always present
  → resolve device (default)
  → new EpubDocument(resolvedTitle, buffer)
  → service.sendEpub(epub, device) with retry for transient SMTP failures
  → move to sent/ or error/
```

### Markdown path (unchanged)
```
paperboy --file article.md
  → existing execute() path → no change
```

## 5. EPUB Metadata Extraction

EPUB is a ZIP archive. Title extraction:

```
META-INF/container.xml  →  find rootfile[@full-path]  →  OPF file path
OPF file                →  find <dc:title>             →  title string
```

All failures (not a valid ZIP, missing container.xml, missing dc:title, XML parse error) fall back to filename stem silently. This is intentional — a malformed EPUB is still delivered, just with a title derived from the filename.

Regex approach (no XML parser dependency):
- container.xml: `/full-path="([^"]+\.opf)"/i`
- OPF dc:title: `/<dc:title[^>]*>([^<]+)<\/dc:title>/i`

This is safe because the OPF format is tightly specified and these patterns are unambiguous in valid EPUBs.

## 6. Dependency: jszip

`jszip` ^3.10.1 is already in `node_modules` (transitive via `epub-gen-memory`). Declaring it as a direct dependency in `package.json` makes the relationship explicit and prevents accidental breakage if `epub-gen-memory` ever drops it.

## 7. MCP Out of Scope

The MCP `send_to_kindle` tool accepts `content: string` (Markdown). Binary EPUB cannot be transmitted over MCP text parameters. MCP callers are AI agents generating Markdown — not users dropping pre-built EPUB files. MCP passthrough is not implemented in PB-012.

## 8. Testing Strategy

- `epub-reader.test.ts`: title extraction from valid EPUB, fallback to filename, size limit rejection, malformed ZIP handling
- `send-to-kindle-service.test.ts`: `sendEpub()` success path, delivery error path
- `cli.test.ts`: EPUB branch invokes `sendEpub`, `--title` overrides metadata, read error exits 1
- `watcher.test.ts`: `processEpubFile()` success, read error, device missing, SMTP retry
- `startWatcher` test: lists both `.md` and `.epub` files at startup
