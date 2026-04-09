# PB-017: Investigation Findings — `epub-gen-memory` Image Handling

**Date:** 2026-04-09  
**Status:** Task 1 Complete — CRITICAL DISCOVERY

## Key Finding: `epub-gen-memory` Already Supports EPUB Image Files

### Current epub-gen-memory Behavior

The library **already**:
1. **Extracts image URLs** from HTML via DOM parsing (`fixHTML` function)
2. **Auto-registers images** in an internal `this.images` array
3. **Replaces URLs** with proper EPUB paths: `images/{uuid}.{extension}`
4. **Downloads images** from remote URLs during `downloadAllImages()`
5. **Stores them** in `OEBPS/images/` directory within the EPUB zip
6. **Updates the manifest** with proper image references

**Evidence:** 
- File: `node_modules/epub-gen-memory/dist/lib/util/html.js`
- The `imgSrc` callback (lines 7-20) automatically:
  - Detects if image URL already in registry
  - Creates image object with UUID and media type
  - Returns proper EPUB path: `images/{id}.{extension}`

### Current PB-016 Problem

We **bypass** this capability by:
1. Downloading images ourselves in `ImageProcessor`
2. Converting them to JPEG
3. Replacing URLs with **data URIs**: `src="data:image/jpeg;base64,..."`
4. Passing the data URI HTML to epub-gen-memory

Data URIs work on desktop but **fail on Kindle** because Kindle doesn't support inline base64 images.

## Solution: Don't Use Data URIs, Use ImageProcessor + HTMLPassthrough

Instead of replacing image URLs with data URIs, we can:

1. **Pass modified HTML to epub-gen-memory** with actual HTTP/HTTPS image URLs (unchanged OR replaced with a temporary local path)
2. **Pre-populate epub-gen-memory's `this.images` array** with our already-downloaded and converted image buffers
3. **Prevent epub-gen-memory from downloading** by setting image data directly OR by making the URLs point to local buffers

### Three Specific Approaches:

**Option A: Direct Image Array Injection (SIMPLEST)**
```typescript
// ImageProcessor downloads and converts images as before
// Instead of returning data URIs, return image file info
const processResult = await imageProcessor.process(safeHtml);
// processResult.images contains: [{filename, buffer, format}, ...]

// Create EPub instance
const epubInstance = new EPub({ title, author }, [{ title, content: safeHtml }]);

// BEFORE calling render(), inject our images directly
for (const img of processResult.images) {
  epubInstance.images.push({
    url: `images/${img.filename}`,  // doesn't matter, won't be downloaded
    mediaType: `image/${img.format}`,
    id: img.filename.replace(/\.[^.]+$/, ''),  // remove extension for ID
    extension: img.format,
    data: img.buffer  // INJECT: pre-downloaded data
  });
}

// Now call render - it will skip downloading since data is already present
await epubInstance.render();
const buffer = await epubInstance.generateAsync({ type: 'nodebuffer' });
```

**Option B: Hook `downloadAllImages` to Skip Downloaded Images**
- Subclass EPub or extend it to check if image already has `.data` before attempting download
- Minimal code change, fully compatible

**Option C: Use Direct BLOB References**
- Pass Blob/Buffer objects as image URLs
- Let epub-gen-memory handle the rest
- Requires testing if library supports this

### Recommended: Option A

**Why:**
- Simplest conceptually
- Direct manipulation of image registry before rendering
- Zero library changes needed
- Clear separation: ImageProcessor handles downloading/converting, EPub handles packaging

## What Needs to Change in PB-016 Implementation

1. **ImageProcessor output**: Return image list with filenames/buffers, NOT data URIs
   ```typescript
   interface ProcessedImage {
     filename: string;        // "image-001.jpeg"
     buffer: Buffer;          // raw image bytes
     format: string;          // "jpeg", "png", "gif"
   }
   
   // Instead of modifying HTML, return images separately
   return { images, stats }  // HTML unchanged or minimally modified
   ```

2. **MarkdownEpubConverter**: 
   ```typescript
   // Get processed images
   const { images, stats } = await imageProcessor.process(safeHtml);
   
   // Create EPub
   const epubInstance = new EPub(options, [{ title, content: safeHtml }]);
   
   // Inject pre-downloaded images
   for (const img of images) {
     epubInstance.images.push({
       url: `images/${img.filename}`,
       mediaType: `image/${img.format}`,
       id: img.filename.replace(/\.[^.]+$/, ''),
       extension: img.format,
       data: img.buffer  // <-- KEY: pre-populated data
     });
   }
   
   // Now render will use pre-downloaded images
   await epubInstance.render();
   const buffer = await epubInstance.generateAsync({ type: 'nodebuffer' });
   ```

3. **HTML modification**: Keep the original image URLs in the HTML
   - epub-gen-memory will see them and register them
   - But images already have `.data` so epub-gen-memory skips download
   - Result: proper EPUB structure with embedded images

## Validation

This approach should work because:
- ✅ `epub-gen-memory` already creates `OEBPS/images/` directory
- ✅ Proper manifest entries are generated automatically
- ✅ No data URIs (Kindle-compatible)
- ✅ Minimal code changes to PB-016
- ✅ Reuses existing robust epub-gen-memory infrastructure

## Next Steps

1. **Implement Option A** in a test to verify images are embedded correctly
2. **Test on Kindle** to confirm images render (not error placeholders)
3. **Update MarkdownEpubConverter** to use this approach
4. **Refactor ImageProcessor** to return image list (not modify HTML)
5. **Update tests** to validate EPUB structure

## Critical Finding: `epub-gen-memory` ALWAYS Downloads from image.url

**Evidence:** `downloadAllImages()` method (index.js, around line 200):
```javascript
EPub.prototype.downloadAllImages = function () {
  // ... for each image:
  var d = retryFetch(image.url, ...)  // ALWAYS fetches, regardless of image.data
    .then(function (res) { 
      return Object.assign({...image}, { data: res });  // Overwrites image.data
    });
}
```

**Problem:** The library always calls `retryFetch(image.url)` even if `image.data` is already populated. It will:
- Try to download from the URL (which may fail if we use a fake URL)
- Overwrite any pre-set data with the downloaded content

## Viable Approach: Option C — Special URL + ignoreFailedDownloads

Since epub-gen-memory always tries to download, we can leverage the `ignoreFailedDownloads` option:

```typescript
// Create EPub with ignoreFailedDownloads: true
const epubInstance = new EPub(
  { title, author, ignoreFailedDownloads: true },
  [{ title, content: safeHtml }]
);

// Pre-populate images with fake URLs and actual data
for (const img of processResult.images) {
  epubInstance.images.push({
    url: `blob:imagedata/${img.filename}`,  // Fake URL that will fail to download
    mediaType: `image/${img.format}`,
    id: img.filename.replace(/\.[^.]+$/, ''),
    extension: img.format,
    data: img.buffer  // Pre-populated with actual image data
  });
}

// When downloadAllImages() runs:
// 1. Tries to fetch from blob:imagedata/... (fails)
// 2. ignoreFailedDownloads=true catches error
// 3. Sets image.data = '' (empty string)
// ... PROBLEM: This overwrites our pre-set image.data!
```

**This approach fails** because even with `ignoreFailedDownloads=true`, it overwrites data.

## Recommended Solution: Option D — Extend EPub Class

Create a thin wrapper that prevents download attempt:

```typescript
class EpubWithPredownloadedImages extends EPub {
  async downloadAllImages() {
    // Skip the download step entirely since we've pre-populated image.data
    this.log('Using pre-downloaded images');
    
    const oebps = this.zip.folder('OEBPS');
    const images = oebps.folder('images');
    
    // Directly write image files without download
    this.images.forEach(image => {
      images.file(`${image.id}.${image.extension}`, image.data);
    });
  }
}
```

Usage:
```typescript
// Create extended instance
const epubInstance = new EpubWithPredownloadedImages(options, content);

// Pre-populate with our images
for (const img of processResult.images) {
  epubInstance.images.push({
    url: `images/${img.filename}`,  // Won't be used
    mediaType: `image/${img.format}`,
    id: img.filename.replace(/\.[^.]+$/, ''),
    extension: img.format,
    data: img.buffer
  });
}

// Render - our override skips download, uses pre-set data
await epubInstance.render();
```

**Advantages:**
- ✅ Clean, non-invasive
- ✅ Zero modification to library
- ✅ Reuses all other epub-gen-memory functionality
- ✅ Pre-populated images used directly
- ✅ No fake URLs needed

**Disadvantages:**
- Requires extending EPub class (minor coupling to library structure)

## Alternative: Option E — Manual EPUB Construction

If extending the class feels uncomfortable, construct EPUB manually:

1. Use epub-gen-memory to generate base EPUB (without images)
2. Unzip the result
3. Add image files to OEBPS/images/
4. Update OPF manifest
5. Re-zip

**Requires:** jszip library (or already bundled with epub-gen-memory!)

## Recommendation: Use Option D

**Best balance** of simplicity, reliability, and maintainability:
- Small wrapper class (15-20 lines)
- Reuses robust epub-gen-memory infrastructure
- Clear intent in code
- No library patches needed
- Will continue to work as library updates
