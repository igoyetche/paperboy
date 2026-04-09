# PB-016: Online Image Downloading — Design

**Status:** Implemented with Discovered Limitation (Data URI Incompatibility)
**Date:** 2026-04-08
**Last Updated:** 2026-04-08 — DISCOVERED: Kindle does not support data URI images in EPUB (see below)
**Spec:** docs/specs/PB-016-image-downloading-spec.md

## Summary

Make remote images in Markdown content download reliably, convert to Kindle-compatible formats, and embed in the generated EPUB. The implementation lives entirely within the infrastructure layer — the domain ports and service remain unchanged.

**Current Implementation Status:** Feature works end-to-end (204 tests passing, 66/66 real images downloaded). However, **images appear as error placeholders on actual Kindle devices** due to data URI incompatibility. Follow-up refactor required to use proper EPUB image files instead of data URIs.

## Current State

The conversion pipeline today:

```
Markdown → marked.parse() → rawHtml → sanitize-html → safeHtml → epub-gen-memory → EPUB buffer
```

`epub-gen-memory` v1.1.2 already downloads remote images from `<img src="https://...">` tags in the chapter HTML. However, Paperboy passes **no image options** to the library:

```typescript
// Current: no fetchTimeout, no retries, no ignoreFailedDownloads
const buffer = await new EPub(
  { title: title.value, author: author.value },
  [{ title: title.value, content: safeHtml }],
).genEpub();
```

This means:
- **One failed image kills the entire conversion** (`ignoreFailedDownloads` defaults to `false`)
- **No format conversion** — AVIF/WebP images are embedded raw, which Kindle can't render
- **No visibility** — no stats about what happened with images
- **No size protection** — a 50 MB image would be embedded as-is

## Decision: Pre-Process Images Before epub-gen-memory

Three approaches were evaluated:

| Approach | Description | Verdict |
|----------|-------------|---------|
| **A. Configure epub-gen-memory only** | Set `ignoreFailedDownloads`, `fetchTimeout`, `retries` | Insufficient: no format conversion, no stats, no per-image size limits |
| **B. Pre-process images ourselves** | Download, convert formats, replace URLs in HTML, then pass clean HTML to epub-gen-memory | **Chosen**: full control over download, conversion, stats, and error handling |
| **C. Hybrid** | Pre-process + configure epub-gen-memory as fallback | Over-engineering: if we've already replaced all remote URLs, epub-gen-memory has nothing to download |

**Approach B** is chosen because format conversion (AVIF → JPEG) is a hard requirement that epub-gen-memory cannot satisfy, and once we're downloading images ourselves we get stats and size management for free.

## Architecture

### Updated Conversion Pipeline

```
Markdown
  → marked.parse()          → rawHtml
  → sanitize-html           → safeHtml
  → ImageProcessor.process() → { html: processedHtml, stats: ImageStats }   ← NEW
  → epub-gen-memory          → EPUB buffer (no remote URLs left to download)
  → EpubDocument (with imageStats)
```

### Component Diagram

```
Infrastructure Layer:
  MarkdownEpubConverter (implements ContentConverter)
    ├── uses: marked, sanitize-html, epub-gen-memory (existing)
    └── uses: ImageProcessor (new, injected via constructor)
              ├── downloads images via fetch()
              └── converts formats via sharp

Domain Layer (UNCHANGED):
  ContentConverter port     — same signature
  EpubDocument value object — gains optional imageStats field
  SendToKindleService       — forwards imageStats in DeliverySuccess
```

### New Components

| Component | Layer | Responsibility |
|-----------|-------|----------------|
| `ImageProcessor` | Infrastructure (`infrastructure/converter/image-processor.ts`) | Download remote images, convert formats, replace URLs in HTML, track stats |
| `ImageStats` | Domain (`domain/values/index.ts`) | Plain data type for image processing results |

### ImageProcessor

```typescript
// infrastructure/converter/image-processor.ts

export interface ImageProcessorConfig {
  readonly fetchTimeoutMs: number;    // default: 15000
  readonly retries: number;           // default: 2
  readonly maxConcurrency: number;    // default: 5
  readonly maxImageBytes: number;     // default: 5 * 1024 * 1024 (5 MB)
  readonly maxTotalBytes: number;     // default: 100 * 1024 * 1024 (100 MB)
}

export interface ProcessResult {
  readonly html: string;
  readonly stats: ImageStats;
}

export class ImageProcessor {
  constructor(
    private readonly config: ImageProcessorConfig,
    private readonly logger: ImageProcessorLogger,
  ) {}

  async process(html: string): Promise<ProcessResult> {
    // 1. Extract <img src="https://..."> URLs from HTML
    // 2. Download each image (with timeout, retries, concurrency limit)
    // 3. Detect format via magic bytes
    // 4. Convert unsupported formats (AVIF, WebP, TIFF, SVG) to JPEG via sharp
    // 5. Skip images exceeding maxImageBytes
    // 6. Stop downloading if total exceeds maxTotalBytes
    // 7. Replace src URLs with data URIs in HTML
    // 8. Return modified HTML + stats
  }
}
```

**Image URL extraction:** Parse the sanitized HTML for `<img src="...">` where src starts with `http://` or `https://`. This runs after `sanitize-html`, which has already validated URL schemes.

**Download approach:** Use Node.js built-in `fetch()` (available in Node 22) with `AbortSignal.timeout()` for per-request timeout. No new HTTP dependencies needed.

**Format detection:** Use `sharp`'s metadata to determine the actual image format from the binary content, not from URL extension or Content-Type header (per FR-10).

**Format conversion:** `sharp(buffer).jpeg({ quality: 85 }).toBuffer()` for unsupported formats. JPEG is chosen over PNG because photos (the most common image type in articles) compress much better as JPEG, and Kindle screens render JPEG well.

**URL replacement:** Replace `src="https://..."` with `src="data:image/jpeg;base64,..."` (or `data:image/png;base64,...` for already-PNG images). epub-gen-memory will embed data URIs as-is without attempting to download them.

⚠️ **LIMITATION DISCOVERED:** Data URIs work on desktop/web readers but fail on Kindle devices (show as error placeholders). Follow-up refactor needed — see "DISCOVERED LIMITATION" section below.

**Concurrency:** Process images in batches using a simple semaphore pattern (array of promises, `Promise.allSettled` per batch). This avoids overwhelming the source server and controls memory usage.

### ImageStats (Domain Value)

```typescript
// Added to domain/values/index.ts

export interface ImageStats {
  readonly total: number;
  readonly downloaded: number;
  readonly failed: number;
  readonly skipped: number;
}
```

This is a plain data type (interface, not class) because it has no invariants to enforce. It lives in the domain because it flows through `EpubDocument` → `DeliverySuccess` → response formatting.

### EpubDocument Changes

```typescript
// domain/values/epub-document.ts

export class EpubDocument {
  constructor(
    readonly title: string,
    readonly buffer: Buffer,
    readonly imageStats?: ImageStats,  // NEW: optional, absent for text-only docs
  ) {}

  get sizeBytes(): number {
    return this.buffer.length;
  }
}
```

The constructor gains an optional third parameter. Existing call sites that don't pass it continue to work. This is a backward-compatible change.

### DeliverySuccess Changes

```typescript
// domain/send-to-kindle-service.ts

export interface DeliverySuccess {
  readonly title: string;
  readonly sizeBytes: number;
  readonly deviceName: string;
  readonly imageStats?: ImageStats;  // NEW: forwarded from EpubDocument
}
```

`SendToKindleService.execute()` forwards `document.imageStats` to the success result. No logic changes in the service.

### MarkdownEpubConverter Changes

```typescript
// infrastructure/converter/markdown-epub-converter.ts

export class MarkdownEpubConverter implements ContentConverter {
  constructor(
    private readonly imageProcessor: ImageProcessor,  // NEW: injected
  ) {}

  async toEpub(
    title: Title,
    content: MarkdownContent,
    author: Author,
  ): Promise<Result<EpubDocument, ConversionError>> {
    try {
      const rawHtml = await marked.parse(content.value);
      const safeHtml = sanitizeHtml(rawHtml, { /* existing config */ });

      // NEW: process images before EPUB generation
      const { html: processedHtml, stats } = await this.imageProcessor.process(safeHtml);

      const buffer = await new EPub(
        { title: title.value, author: author.value },
        [{ title: title.value, content: processedHtml }],
      ).genEpub();

      return ok(new EpubDocument(title.value, buffer, stats));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown conversion error";
      return err(new ConversionError(message));
    }
  }
}
```

The `ContentConverter` port signature is unchanged. The converter now takes an `ImageProcessor` via constructor injection. All composition roots (MCP, CLI, watcher) wire it during startup.

### Response Formatting

**MCP (ToolHandler):**

```typescript
// When imageStats is present and has failures:
{
  success: true,
  message: "Document 'High Agency' sent to Kindle (personal) successfully.",
  sizeBytes: 4200000,
  imageStats: { total: 20, downloaded: 18, failed: 2, skipped: 0 }
}
```

**CLI (formatSuccess):**

```
Sent 'High Agency' to Kindle (personal) — 4200000 bytes (18 of 20 images embedded, 2 failed)
```

When all images succeed, the parenthetical is simpler: `(20 images embedded)`. When there are no images, the parenthetical is omitted entirely.

## Configuration

New optional environment variables added to `Config`:

| Variable | Default | Description |
|----------|---------|-------------|
| `IMAGE_FETCH_TIMEOUT_MS` | `15000` | Per-image download timeout in milliseconds |
| `IMAGE_MAX_RETRIES` | `2` | Number of retry attempts per failed download |
| `IMAGE_MAX_CONCURRENCY` | `5` | Maximum parallel image downloads |
| `IMAGE_MAX_BYTES` | `5242880` (5 MB) | Maximum size per individual image |
| `IMAGE_MAX_TOTAL_BYTES` | `104857600` (100 MB) | Maximum total image payload |

All optional — sensible defaults work for most cases. Added to `loadConfig()` in `infrastructure/config.ts` with zod validation.

## Dependencies

### New Production Dependency

- **`sharp`** — Image format detection and conversion (AVIF/WebP/TIFF/SVG → JPEG)
  - Supports x86_64 and ARM64 (pre-built binaries for both, including Alpine Linux)
  - v0.33+ uses `@img/sharp-*` platform-specific packages, no external system dependencies
  - Used for: `sharp(buffer).metadata()` (format detection) and `sharp(buffer).jpeg().toBuffer()` (conversion)
  - Alternative considered: `jimp` — pure JavaScript, no native binaries, but does NOT support AVIF decode

### No New Dev Dependencies

Testing uses the existing vitest setup with mocked `ImageProcessor`.

### Dockerfile Impact

`sharp` with Alpine Linux requires no additional system packages in modern versions (0.33+). The `npm install` step in the Dockerfile will automatically pull the correct platform-specific binary. Verify during implementation that the multi-stage build produces a working binary in the final stage.

## Logging

The `ImageProcessor` uses a dedicated logger interface:

```typescript
export interface ImageProcessorLogger {
  imageDownloadStart(url: string): void;
  imageDownloadSuccess(url: string, format: string, sizeBytes: number, durationMs: number): void;
  imageDownloadFailure(url: string, reason: string): void;
  imageFormatConverted(url: string, from: string, to: string): void;
  imageSkipped(url: string, reason: string): void;
  imageSummary(stats: ImageStats): void;
}
```

Log levels:
- `debug`: individual download start, success, format conversion
- `warn`: download failure, image skipped
- `info`: summary stats after all downloads complete

In CLI mode (silent logger), none of these emit. In MCP/watcher mode, they go through pino.

## Security Considerations

- **SSRF prevention**: Only follow redirects to `http://` and `https://` URLs. Reject redirects to `file://`, `data:`, `ftp://`, or other protocols. Node.js `fetch()` follows redirects by default — use `redirect: "manual"` and validate each redirect URL, or limit redirect count.
- **Image bombs**: `sharp` handles decompression internally with memory limits. The per-image size check (5 MB) applies to the downloaded bytes, not the decompressed pixels. For an extra safeguard, consider limiting image dimensions (e.g., 10000x10000px max) via `sharp.metadata()` before processing.
- **Content-Type sniffing**: Format is detected from actual bytes, not HTTP headers. A file served as `image/jpeg` but containing HTML won't be processed as an image — `sharp` will throw on invalid input, which is caught and treated as a failed download.

## Testing

### Unit Tests (ImageProcessor)

- **Happy path**: HTML with 3 image URLs → downloads all, returns modified HTML with data URIs + stats `{3, 3, 0, 0}`
- **Partial failure**: 2 of 3 images fail → returns HTML with 1 data URI, 2 img tags removed + stats `{3, 1, 2, 0}`
- **Format conversion**: AVIF input → JPEG data URI in output
- **Size skip**: Image > 5 MB → skipped, stats reflect it
- **Total limit**: After 100 MB total, remaining images skipped
- **No images**: HTML without `<img>` tags → returns HTML unchanged + stats `{0, 0, 0, 0}`
- **Timeout**: Slow server → download fails after timeout, other images proceed
- **Redirect safety**: Redirect to `file://` → treated as failure, logged
- **All mocked**: `fetch` and `sharp` are mocked — no network, no real image processing

### Unit Tests (MarkdownEpubConverter)

- Existing tests updated to inject a mock `ImageProcessor` that passes HTML through unchanged
- New test: converter passes sanitized HTML to `ImageProcessor` and uses its output
- New test: `EpubDocument` carries `imageStats` from `ImageProcessor`

### Unit Tests (DeliverySuccess formatting)

- CLI `formatSuccess` includes image stats when present
- CLI `formatSuccess` omits image stats for text-only documents
- MCP response includes `imageStats` field when present

### Integration Test

- Convert `docs/md-input-samples/2026-04-08-high-agency-in-30-minutes-george-mack.md` end-to-end (requires network)
- Verify: EPUB is valid, images are embedded, AVIF images were converted to JPEG

## Affected Specs

- `docs/specs/main-spec.md` — FR-4 through FR-6 (content conversion) need updates to mention image handling. New FRs for image downloading, format conversion, and graceful degradation.

## DISCOVERED LIMITATION: Data URIs Don't Work on Kindle

**Status:** Discovered during real-world testing (2026-04-08)

**Issue:** The initial implementation embeds images as data URIs in the HTML:
```html
<img src="data:image/jpeg;base64,/9j/4AAQSkZJRg...">
```

This approach works perfectly on desktop/computer readers (images display correctly), but **Kindle devices show a generic error image placeholder** instead of the actual image.

**Root Cause:** Kindle's EPUB renderer does not support data URIs. EPUB 3 spec allows them, but Amazon's implementation requires images to be actual files within the EPUB zip archive, referenced by relative file paths:
```html
<img src="images/image-001.jpeg">
```

**Impact:** All 204 tests pass, real-world integration test confirms 66/66 images download and embed, but the feature fails on actual Kindle devices.

## Planned Fix (Follow-up Task)

The refactor requires:

1. **ImageProcessor output change:** Instead of returning modified HTML with data URIs, return a list of `{ filename, buffer }` image files
2. **MarkdownEpubConverter change:** Pass the image list to `epub-gen-memory` via its image options (if available), OR manually construct the EPUB with image files in the proper `images/` directory within the zip
3. **HTML modification:** Replace `src="https://..."` with `src="images/image-NNN.jpeg"` (or similar pattern)
4. **EPUBDocument change:** May need to track which images were embedded for reporting accuracy

This is a significant refactor but the architecture supports it — `ImageProcessor` already handles format detection and conversion, we just need to decouple the HTML modification from data URI creation.

---

## Open Design Questions

1. **EPUB image file embedding approach**: Three options exist:
   - Use `epub-gen-memory` image options parameter if it supports passing pre-downloaded image buffers
   - Manually construct EPUB zip with `jszip` and add images to `OEBPS/images/` directory
   - Explore if newer `EPub` library versions support image file injection
   
   Needs investigation before PB-017 implementation begins.

2. **Image resizing**: The spec's OQ-1 asks about resizing large-dimension images. This design does NOT include resizing in the initial implementation. If image dimensions prove problematic (huge EPUBs, slow Kindle rendering), resizing can be added later as a single `sharp.resize()` call in the conversion step — the architecture supports it without structural changes.

3. **Placeholder text for failed images**: The spec's OQ-3 asks whether to insert `[Image: alt text]` for failed images. This design omits the `<img>` tag entirely for failed downloads. Adding a text placeholder is a one-line change if desired later.
