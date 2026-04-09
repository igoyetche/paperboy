# PB-017: Fix Image Embedding for Kindle EPUB Compatibility — Design

**Status:** ✅ Implemented (Verified on Kindle Device)  
**Date:** 2026-04-08  
**Feature:** docs/features/backlog/PB-017-kindle-epub-image-files.md  
**Related:** PB-016 (discovered limitation)  
**Implementation Date:** 2026-04-09  
**Validation:** Tested on physical Kindle device — images render correctly

## Summary

Make images render on Kindle devices by embedding them as files within the EPUB zip structure instead of as data URIs. The existing download, format detection, and conversion logic from PB-016 remains unchanged; only the final EPUB construction changes.

## Current Problem (PB-016 Limitation)

The PB-016 implementation uses this approach:

```html
<img src="data:image/jpeg;base64,/9j/4AAQSkZJRg...">
```

This works on desktop and web readers but **Kindle devices do not support data URIs**. They require:

```html
<img src="images/image-001.jpeg">
```

Where `image-001.jpeg` is an actual file in the EPUB zip at `OEBPS/images/image-001.jpeg`.

## Solution: Three Approaches Evaluated

| Approach | Description | Verdict |
|----------|-------------|---------|
| **A. Use `epub-gen-memory` image options** | Check if `epub-gen-memory` has an `images` parameter for pre-downloaded buffers | **TBD**: Needs investigation |
| **B. Manual EPUB construction with `jszip`** | Use `jszip` to construct the EPUB zip, add images to `OEBPS/images/`, update manifest | **Likely chosen**: Full control, no new dependency needed if we can reuse existing EPUB structure |
| **C. Fork/replace `epub-gen-memory`** | Use a different EPUB library that supports image file injection | Overkill: existing library likely works with approach A or B |

## Proposed Architecture

### ImageProcessor Output Change

Instead of returning modified HTML with data URIs:

```typescript
// CURRENT (PB-016)
interface ProcessResult {
  html: string;                    // "... <img src="data:image/..."> ..."
  stats: ImageStats;
}
```

Return a list of actual image files:

```typescript
// PROPOSED (PB-017)
interface ProcessedImage {
  filename: string;                // "image-001.jpeg"
  buffer: Buffer;                  // raw image bytes
  format: string;                  // "jpeg", "png", etc.
}

interface ProcessResult {
  html: string;                    // "... <img src="images/image-001.jpeg"> ..."
  images: ProcessedImage[];        // list of files to add to EPUB
  stats: ImageStats;
}
```

**Backward compatibility:** If there are no images, `images` is an empty array. The HTML has no img tags to replace.

### MarkdownEpubConverter Integration

Current flow:
```
Markdown → marked → rawHtml → sanitize-html → safeHtml → ImageProcessor → processedHtml → epub-gen-memory → EPUB buffer
```

New flow:
```
Markdown → marked → rawHtml → sanitize-html → safeHtml → ImageProcessor → {processedHtml, images} → EPUB constructor → EPUB buffer
```

**Option A: Use `epub-gen-memory` with image options**

```typescript
const buffer = await new EPub(
  { title: title.value, author: author.value },
  [{ title: title.value, content: processedHtml }],
  {
    images: processedImages.map(img => ({
      name: img.filename,
      data: img.buffer,
    }))
  }
).genEpub();
```

Requires investigation: Does `epub-gen-memory` support this? Check v1.1.2 source.

**Option B: Manual EPUB construction**

If `epub-gen-memory` doesn't support image injection, manually construct the EPUB:

```typescript
// 1. Use epub-gen-memory without images to get base EPUB zip
// 2. Unzip it
// 3. Add image files to OEBPS/images/
// 4. Update OPF manifest to list images
// 5. Re-zip the EPUB

// Dependencies: jszip (or use Node.js zip library)
```

This is more complex but gives us full control.

### ImageProcessor Changes

The HTML modification logic changes from:

```typescript
// CURRENT
private replaceImageUrl(html: string, url: string, dataUri: string): string {
  return html.replace(
    new RegExp(`src="${url}"`, "g"),
    `src="${dataUri}"`
  );
}
```

To:

```typescript
// PROPOSED
private replaceImageUrl(html: string, url: string, filename: string): string {
  return html.replace(
    new RegExp(`src="${url}"`, "g"),
    `src="images/${filename}"`
  );
}

// Add filename generation
private generateFilename(format: string, index: number): string {
  const ext = format === "jpeg" ? "jpg" : format;
  return `image-${String(index + 1).padStart(3, "0")}.${ext}`;
  // Result: "image-001.jpeg", "image-002.png", etc.
}
```

### EPUB Image File Structure

Standard EPUB 3 image directory:
```
EPUB/
  OEBPS/
    content.xhtml          (chapter content)
    images/                (NEW)
      image-001.jpeg
      image-002.jpeg
      image-003.png
      ...
    package.opf            (must reference images in manifest)
    toc.ncx
```

The `package.opf` manifest needs entries like:
```xml
<item id="image-001" href="images/image-001.jpeg" media-type="image/jpeg"/>
<item id="image-002" href="images/image-002.jpeg" media-type="image/jpeg"/>
```

If `epub-gen-memory` doesn't handle this automatically (Option B), we add it manually.

## Testing Implications

### New Tests Needed

1. **ImageProcessor returns image list** — modify existing unit tests to verify `ProcessResult.images` array
2. **EPUB contains image files** — extract EPUB zip and verify `OEBPS/images/` contains expected files
3. **HTML references correct filenames** — verify HTML has `src="images/image-001.jpeg"` not data URIs
4. **Kindle device rendering** — real-world test (manual for now; automated if we find a Kindle emulator)

### Existing Tests

- Must update existing `MarkdownEpubConverter` tests to handle the new image structure
- Integration test (George Mack article) should verify rendered images on Kindle (manual step)

## Dependencies

### Investigation Required

1. **Does `epub-gen-memory` v1.1.2 support image file injection?**
   - Check source code and documentation
   - If yes: use Option A (minimal changes)
   - If no: use Option B (manual EPUB construction)

2. **If Option B is chosen, do we need `jszip`?**
   - Node.js has no built-in zip support
   - `jszip` is lightweight and pure JavaScript
   - Alternative: `archiver` (more complex API)

### Likely New Production Dependency

- `jszip` (if Option B) — for EPUB zip manipulation
  - Alternative: `adm-zip` (also pure JavaScript)

## Risk & Mitigation

| Risk | Mitigation |
|------|-----------|
| `epub-gen-memory` doesn't support image injection | Investigate upfront; have Option B ready |
| Manual EPUB construction breaks manifest/structure | Test with EPUB validation tool, inspect intermediate files |
| Image filenames conflict or break XHTML paths | Use deterministic naming (`image-001`, `image-002`, etc.) |
| Performance regression from additional zip manipulation | Benchmark; EPUB is small file so impact should be minimal |

## Final Implementation Approach

After investigation, we discovered that `epub-gen-memory` already handles EPUB image file structure correctly. The library's `normalizeHTML()` method:
1. Detects image URLs in HTML
2. Generates UUID-based filenames (e.g., `images/373cf655-e1c3-4ce2-9c92-3f8a4cb3b4cf.avif`)
3. Replaces HTML src to point to these UUID paths
4. Calls `downloadAllImages()` to fetch and write image files

**Our solution (Option D - Class Override):**
1. Create a wrapper function `createEpubWithPredownloadedImages()` that overrides `downloadAllImages()`
2. Map pre-downloaded image buffers (from ImageProcessor) by filename
3. When `downloadAllImages()` runs, fill in `image.data` with pre-downloaded buffers (by sequential order)
4. Write image files with UUID-based filenames that HTML already references

**Key insight:** Let `epub-gen-memory` handle URL detection and UUID generation; we just fill in the actual file data instead of downloading.

**Result:**
- HTML references correct UUID paths: `<img src="images/uuid.avif">`
- Files exist with matching UUID names: `OEBPS/images/uuid.avif`
- Kindle can find and display images
- No additional dependencies needed
- No library modifications needed
- Reuses existing robust epub-gen-memory infrastructure

## Success Criteria

1. ✅ Images render correctly on Kindle device (primary acceptance criterion) — **VERIFIED**
2. ✅ Images render correctly on desktop/web readers
3. ✅ EPUB structure is valid (passes validation)
4. ✅ All existing tests updated and passing (209 tests passing)
5. ✅ Integration test (George Mack, 66 images) verified in EPUB (66/66 image files embedded)
6. ✅ No performance regression

## Implementation Strategy

1. **Phase 1: Investigate** — Check `epub-gen-memory` source for image support
2. **Phase 2: Design** — Decide between Option A or Option B based on findings
3. **Phase 3: Refactor ImageProcessor** — Update to return image list with filenames
4. **Phase 4: Refactor MarkdownEpubConverter** — Integrate images into EPUB construction
5. **Phase 5: Testing** — Update unit tests, run integration test, verify on Kindle
6. **Phase 6: Validation** — Use EPUB validator to confirm structure is correct

## Open Questions

1. **Can we test Kindle rendering without a physical device?** Possible with Kindle Previewer (Amazon's official tool) or Calibre's EPUB viewer.
2. **Should we generate SEO-friendly image filenames** (e.g., `high-agency-image-001.jpeg`) or simple sequential names? Simple names preferred for simplicity.
3. **What EPUB validation tool to use?** W3C EPUB Checker is official; epubcheck is also popular.
