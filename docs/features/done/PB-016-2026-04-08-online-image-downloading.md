# PB-016: Online Image Downloading

**Status:** ✅ Complete
**Created:** 2026-04-08
**Completed:** 2026-04-08
**Priority:** High
**Ticket Code:** PB-016

## Motivation

Markdown content sent to Kindle frequently includes images from online sources — blog posts, articles, research notes all reference CDN-hosted images via `![alt](https://...)` syntax. Today, these images either break the conversion entirely (one failed download kills the whole document) or arrive in formats Kindle cannot render (AVIF, WebP). The reading experience suffers: users get documents with missing visuals or no document at all.

A real-world sample article contains 20+ remote image references, all in AVIF format. None of these would display on a Kindle even if successfully downloaded.

## Scope

Make image downloading reliable, resilient, and Kindle-compatible during the Markdown-to-EPUB conversion step.

- Download remote images referenced in Markdown content
- Handle download failures gracefully (skip failed images, don't fail the document)
- Convert unsupported formats (AVIF, WebP) to JPEG for Kindle compatibility
- Report image download results in the delivery response

## Acceptance Criteria

✅ 1. Documents with remote image URLs produce EPUBs with images embedded
✅ 2. A single failed image download does not prevent the rest of the document from being delivered
✅ 3. Images in AVIF and WebP formats are converted to JPEG before embedding
✅ 4. The delivery response includes image stats (total, downloaded, failed, skipped) when images are present
✅ 5. Text-only documents convert with no performance regression
✅ 6. The sample file `2026-04-08-high-agency-in-30-minutes-george-mack.md` converts successfully

## Out of Scope

- Image editing, cropping, or quality tuning
- Authenticated or paywalled image URLs
- Local/relative image path resolution
- `<picture>` elements or `srcset` support

## Implementation Summary

- **Modules Created:** `src/infrastructure/converter/image-processor.ts`, `src/domain/values/image-stats.ts`
- **Modules Modified:** MarkdownEpubConverter, EpubDocument, SendToKindleService, ToolHandler, CLI
- **Approach:** ImageProcessor downloads and converts images to JPEG/PNG, returns ProcessedImage[] with buffers. Stats tracked via ImageStats value object. Results surfaced in delivery response.
- **Tests Added:** Full test coverage for ImageProcessor and integration tests for real sample articles

## Notes

- AVIF and WebP conversion to JPEG required for Kindle compatibility
- Concurrent downloads with configurable limits for performance
- HEIF/HEIC formats also supported (discovered during PB-017 Kindle testing)
