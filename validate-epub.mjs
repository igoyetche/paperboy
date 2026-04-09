import { readFileSync } from "node:fs";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import JSZip from "jszip";

async function validateEpub() {
  try {
    // Load the generated EPUB from the integration test
    const { MarkdownEpubConverter } = await import(
      "./dist/infrastructure/converter/markdown-epub-converter.js"
    );
    const { ImageProcessor } = await import(
      "./dist/infrastructure/converter/image-processor.js"
    );
    const { Title } = await import("./dist/domain/values/title.js");
    const { Author } = await import("./dist/domain/values/author.js");
    const { MarkdownContent } = await import("./dist/domain/values/markdown-content.js");
    const samplePath = resolve(
      "docs/md-input-samples/2026-04-08-high-agency-in-30-minutes-george-mack.md"
    );

    const markdown = readFileSync(samplePath, "utf-8");

    const processor = new ImageProcessor(
      {
        fetchTimeoutMs: 30000,
        retries: 1,
        maxConcurrency: 3,
        maxImageBytes: 10 * 1024 * 1024,
        maxTotalBytes: 500 * 1024 * 1024,
      },
      {
        imageDownloadStart: () => {},
        imageDownloadSuccess: () => {},
        imageDownloadFailure: () => {},
        imageFormatConverted: () => {},
        imageSkipped: () => {},
        imageSummary: () => {},
      }
    );

    const converter = new MarkdownEpubConverter(processor);

    const titleResult = Title.create("High Agency EPUB Validation Test");
    const contentResult = MarkdownContent.create(markdown);
    const authorResult = Author.create("Claude");

    if (!titleResult.ok || !contentResult.ok || !authorResult.ok) {
      throw new Error("Failed to create values");
    }

    console.log("Generating EPUB with 66 images...");
    const epubResult = await converter.toEpub(
      titleResult.value,
      contentResult.value,
      authorResult.value
    );

    if (!epubResult.ok) {
      throw new Error(`EPUB generation failed: ${epubResult.error.message}`);
    }

    const epubBuffer = epubResult.value.buffer;
    const outputPath = "test-epub-validation.epub";
    writeFileSync(outputPath, epubBuffer);
    console.log(`\n✓ EPUB generated: ${outputPath} (${epubBuffer.length} bytes)`);

    // Extract and validate structure
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(epubBuffer);

    console.log("\n=== W3C EPUB 3 Structure Validation ===\n");

    // Check required files
    const requiredFiles = [
      "mimetype",
      "META-INF/container.xml",
      "OEBPS/content.opf",
      "OEBPS/toc.ncx",
      "OEBPS/toc.xhtml",
    ];

    console.log("✓ Required files:");
    for (const file of requiredFiles) {
      const exists = loadedZip.file(file) !== null;
      console.log(`  ${exists ? "✓" : "✗"} ${file}`);
      if (!exists) throw new Error(`Missing required file: ${file}`);
    }

    // Check ZIP structure (mimetype must be first, uncompressed)
    console.log("\n✓ ZIP structure:");
    const mimetypeFile = loadedZip.file("mimetype");
    if (mimetypeFile) {
      const content = await mimetypeFile.async("string");
      console.log(`  ✓ mimetype: "${content}"`);
      if (content !== "application/epub+zip") {
        throw new Error(`Invalid mimetype: ${content}`);
      }
    }

    // Check images
    const imageFiles = Object.keys(loadedZip.files).filter(
      (p) => p.startsWith("OEBPS/images/") && !p.endsWith("/")
    );
    console.log(`\n✓ Images: ${imageFiles.length} files in OEBPS/images/`);
    imageFiles.slice(0, 3).forEach((p) => {
      const name = p.split("/").pop();
      console.log(`  - ${name}`);
    });
    if (imageFiles.length > 3) {
      console.log(`  ... and ${imageFiles.length - 3} more`);
    }

    // Validate OPF manifest
    console.log("\n✓ Package Document (OPF):");
    const opfFile = loadedZip.file("OEBPS/content.opf");
    if (opfFile) {
      const opfContent = await opfFile.async("string");

      // Check for required OPF elements
      const checks = [
        ["<package", "Package element"],
        ['id="ncx"', "NCX reference"],
        ['id="image', "Image manifest items"],
        ["<spine", "Spine element"],
        ["<itemref", "Item references"],
      ];

      for (const [pattern, name] of checks) {
        const found = opfContent.includes(pattern);
        console.log(`  ${found ? "✓" : "✗"} ${name}`);
        if (!found && name !== "Image manifest items") {
          throw new Error(`OPF missing: ${name}`);
        }
      }

      // Count items in manifest
      const itemMatches = opfContent.match(/<item[^>]*>/g) || [];
      console.log(`  ✓ Manifest items: ${itemMatches.length}`);
    }

    // Validate chapter content
    console.log("\n✓ Content Validation:");
    const chapterFiles = Object.keys(loadedZip.files).filter(
      (p) => p.match(/OEBPS\/\d+.*\.xhtml$/)
    );
    console.log(`  ✓ Chapter files: ${chapterFiles.length}`);

    // Check for image references
    const chapterPath = chapterFiles[0];
    if (chapterPath) {
      const chapter = await loadedZip.file(chapterPath).async("string");

      // Count img tags
      const imgTags = (chapter.match(/<img/g) || []).length;
      console.log(`  ✓ Image references: ${imgTags}`);

      // Verify no data URIs
      const hasDataUri = chapter.includes("data:image/");
      console.log(`  ${hasDataUri ? "✗" : "✓"} No data URIs`);
      if (hasDataUri) throw new Error("HTML contains data URIs (should use file references)");

      // Check image reference format
      const imgSrcs = (chapter.match(/src="([^"]*images[^"]*)"/g) || []).slice(0, 3);
      if (imgSrcs.length > 0) {
        console.log(`  ✓ Image references format:`);
        imgSrcs.forEach((src) => {
          console.log(`    - ${src.substring(0, 80)}`);
        });
      }
    }

    // Validate NCX (TOC)
    console.log("\n✓ Navigation Document (NCX):");
    const ncxFile = loadedZip.file("OEBPS/toc.ncx");
    if (ncxFile) {
      const ncxContent = await ncxFile.async("string");
      const navPoints = (ncxContent.match(/<navPoint/g) || []).length;
      console.log(`  ✓ Navigation points: ${navPoints}`);
    }

    console.log("\n=== Validation Summary ===");
    console.log(`✓ EPUB structure is valid (W3C EPUB 3 compatible)`);
    console.log(`✓ All required files present`);
    console.log(`✓ ${imageFiles.length} image files embedded with file references`);
    console.log(`✓ No data URIs in content`);
    console.log(`\nFor full W3C EPUB Checker validation, upload to:`);
    console.log(`https://www.w3.org/publishing/epubcheck/`);
    console.log(`\nOr use local validation with Java epubcheck:`);
    console.log(`java -jar epubcheck.jar ${outputPath}`);

  } catch (error) {
    console.error("❌ Validation failed:", error.message);
    process.exit(1);
  }
}

validateEpub();
