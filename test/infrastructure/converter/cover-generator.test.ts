import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CoverGenerator, wrapTitle } from "../../../src/infrastructure/converter/cover-generator.js";
import { getFlavor, listFlavorNames } from "../../../src/infrastructure/converter/flavors/index.js";
import { getCoverResolution } from "../../../src/domain/values/cover-resolution.js";

const classic = getFlavor("classic");
const defaultResolution = getCoverResolution("1264x1680");

describe("wrapTitle", () => {
  it("returns a single line for a short title", () => {
    expect(wrapTitle("Short Title")).toEqual(["Short Title"]);
  });

  it("returns the title unchanged when it fits within 30 chars", () => {
    expect(wrapTitle("Exactly thirty characters here")).toEqual([
      "Exactly thirty characters here",
    ]);
  });

  it("wraps at word boundary when line would exceed 30 chars", () => {
    const lines = wrapTitle("The quick brown fox jumps over the lazy dog");
    expect(lines.length).toBeGreaterThan(1);
    lines.forEach((line) => expect(line.length).toBeLessThanOrEqual(30));
  });

  it("appends ellipsis when content doesn't fit in maxLines", () => {
    // This title needs more than 3 lines with 30-char limit
    const tooLong =
      "One Two Three Four Five Six Seven Eight Nine Ten Eleven Twelve Thirteen Fourteen Fifteen";
    const lines = wrapTitle(tooLong);
    expect(lines.length).toBeLessThanOrEqual(3);
    const lastLine = lines.at(-1) ?? "";
    expect(lastLine.endsWith("…")).toBe(true);
  });

  it("does NOT append ellipsis when all words fit in maxLines", () => {
    // This title fits exactly in 3 lines without overflow
    const fitsExactly = "Short line Short line Short";
    const lines = wrapTitle(fitsExactly);
    expect(lines.length).toBeLessThanOrEqual(3);
    const lastLine = lines.at(-1) ?? "";
    expect(lastLine.endsWith("…")).toBe(false);
  });

  it("returns a single line even if it exceeds 30 chars (single long word)", () => {
    const singleLongWord = "Supercalifragilisticexpialidocious";
    const lines = wrapTitle(singleLongWord);
    expect(lines).toEqual([singleLongWord]);
  });
});

describe("CoverGenerator.generateHtmlChapter", () => {
  const generator = new CoverGenerator();

  it("includes the title in the HTML output", () => {
    const html = generator.generateHtmlChapter(classic, "My Title", "Claude");
    expect(html).toContain("My Title");
  });

  it("includes the author in the HTML output", () => {
    const html = generator.generateHtmlChapter(classic, "Title", "Arthur Author");
    expect(html).toContain("Arthur Author");
  });

  it("includes source domain when a valid URL is provided", () => {
    const html = generator.generateHtmlChapter(
      classic,
      "Title",
      "Claude",
      "https://theverge.com/article/123",
    );
    expect(html).toContain("theverge.com");
  });

  it("omits source section when sourceUrl is undefined", () => {
    const html = generator.generateHtmlChapter(classic, "Title", "Claude");
    expect(html).not.toContain('class="source"');
  });

  it("omits source section when sourceUrl is malformed", () => {
    const html = generator.generateHtmlChapter(classic, "Title", "Claude", "not-a-url");
    expect(html).not.toContain('class="source"');
    expect(html).not.toContain("not-a-url");
  });

  it("escapes HTML special characters in title", () => {
    const html = generator.generateHtmlChapter(
      classic,
      "Title & Subtitle <test>",
      "Claude",
    );
    expect(html).toContain("Title &amp; Subtitle &lt;test&gt;");
    expect(html).not.toContain("<test>");
  });

  it("escapes HTML special characters in author", () => {
    const html = generator.generateHtmlChapter(classic, "Title", 'Author "Quoted"');
    expect(html).toContain("Author &quot;Quoted&quot;");
  });

  it("does not contain any inline styles or embedded images", () => {
    const html = generator.generateHtmlChapter(classic, "Title", "Claude");
    expect(html).not.toContain("<style");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("data:");
  });
});

describe("CoverGenerator.generateCoverCss", () => {
  const generator = new CoverGenerator();

  it("returns a non-empty CSS string", () => {
    const css = generator.generateCoverCss(classic);
    expect(typeof css).toBe("string");
    expect(css.length).toBeGreaterThan(0);
  });

  it("contains cover chapter class selectors", () => {
    const css = generator.generateCoverCss(classic);
    expect(css).toContain(".cover");
    expect(css).toContain(".kicker");
    expect(css).toContain(".title");
    expect(css).toContain(".author");
    expect(css).toContain(".rule");
  });

  it("does not contain any base64 data URIs", () => {
    const css = generator.generateCoverCss(classic);
    expect(css).not.toContain("data:image");
    expect(css).not.toContain("base64");
  });
});

describe("CoverGenerator cover fixtures", () => {
  const generator = new CoverGenerator();

  const sampleTitle = "The Quick Brown Fox Jumps Over the Lazy Dog";
  const sampleAuthor = "Claude";
  const sampleSource = "https://www.theverge.com/2026/05/example-article";

  function buildSampleHtml(flavorName: string): string {
    const flavor = getFlavor(flavorName as "classic");
    const css = generator.generateCoverCss(flavor);
    const chapter = generator.generateHtmlChapter(
      flavor,
      sampleTitle,
      sampleAuthor,
      sampleSource,
    );
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Paperboy cover sample</title>
<style>
${css}
</style>
</head>
<body>
${chapter}
</body>
</html>
`;
  }

  for (const flavorName of listFlavorNames()) {
    const flavor = getFlavor(flavorName);
    const fixturesDir = join(
      dirname(fileURLToPath(import.meta.url)),
      "..",
      "..",
      "..",
      "src",
      "infrastructure",
      "converter",
      "flavors",
      flavorName,
      "fixtures",
    );
    const htmlFixturePath = join(fixturesDir, "sample-cover.html");
    const svgFixturePath = join(fixturesDir, "sample-thumbnail.svg");

    it(`[${flavorName}] matches sample-cover.html fixture`, () => {
      const generated = buildSampleHtml(flavorName);

      if (process.env.UPDATE_COVER_FIXTURE === "1" || !existsSync(htmlFixturePath)) {
        mkdirSync(fixturesDir, { recursive: true });
        writeFileSync(htmlFixturePath, generated, "utf-8");
      }

      const fixture = readFileSync(htmlFixturePath, "utf-8");
      expect(generated).toBe(fixture);
    });

    it(`[${flavorName}] matches sample-thumbnail.svg fixture (Kindle library thumbnail)`, async () => {
      const thumbnailContent = generator.buildThumbnailContent(sampleTitle, sampleAuthor);
      const generated = await generator.generateCoverSvg(flavor, defaultResolution, thumbnailContent);

      if (process.env.UPDATE_COVER_FIXTURE === "1" || !existsSync(svgFixturePath)) {
        mkdirSync(fixturesDir, { recursive: true });
        writeFileSync(svgFixturePath, generated, "utf-8");
      }

      const fixture = readFileSync(svgFixturePath, "utf-8");
      expect(generated).toBe(fixture);
    });
  }
});

describe("CoverGenerator.generateImage", () => {
  const generator = new CoverGenerator();

  it("returns a Buffer with JPEG magic bytes (FF D8 FF)", async () => {
    const content = generator.buildThumbnailContent("My Title", "Claude");
    const buffer = await generator.generateImage(classic, defaultResolution, content);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer[0]).toBe(0xff);
    expect(buffer[1]).toBe(0xd8);
    expect(buffer[2]).toBe(0xff);
  });

  it("returns a non-empty buffer for a short title", async () => {
    const content = generator.buildThumbnailContent("Hi", "Author");
    const buffer = await generator.generateImage(classic, defaultResolution, content);
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it("returns valid JPEG when title longer than 30 characters", async () => {
    const content = generator.buildThumbnailContent(
      "This is a very long title that exceeds thirty characters and needs wrapping",
      "Author",
    );
    const buffer = await generator.generateImage(classic, defaultResolution, content);
    expect(buffer[0]).toBe(0xff);
    expect(buffer[1]).toBe(0xd8);
  });

  it("returns valid JPEG when title needing more than 3 lines", async () => {
    const content = generator.buildThumbnailContent(
      "Chapter One Two Three Four Five Six Seven Eight Nine Ten Eleven Twelve",
      "Some Author Name",
    );
    const buffer = await generator.generateImage(classic, defaultResolution, content);
    expect(buffer[0]).toBe(0xff);
    expect(buffer[1]).toBe(0xd8);
  });

  it("returns valid JPEG when title and author have XML special characters", async () => {
    const content = generator.buildThumbnailContent(
      "Title & <Subtitle>",
      'Author "Quoted"',
    );
    const buffer = await generator.generateImage(classic, defaultResolution, content);
    expect(buffer[0]).toBe(0xff);
    expect(buffer[1]).toBe(0xd8);
  });
});

describe("CoverGenerator determinism", () => {
  const generator = new CoverGenerator();

  it("generateCoverSvg produces identical output when called twice with the same input", async () => {
    const content = generator.buildThumbnailContent("Determinism Test Title", "Claude");
    const svg1 = await generator.generateCoverSvg(classic, defaultResolution, content);
    const svg2 = await generator.generateCoverSvg(classic, defaultResolution, content);
    expect(svg1).toBe(svg2);
  });
});

describe("CoverGenerator multi-resolution rendering", () => {
  const generator = new CoverGenerator();
  const resolutionNames = ["1264x1680", "1072x1448", "600x800"] as const;

  for (const name of resolutionNames) {
    it(`[${name}] generates valid SVG with correct dimensions`, async () => {
      const resolution = getCoverResolution(name);
      const content = generator.buildThumbnailContent("Multi Resolution Test", "Claude");
      const svg = await generator.generateCoverSvg(classic, resolution, content);
      expect(typeof svg).toBe("string");
      expect(svg.length).toBeGreaterThan(0);
      // Satori outputs an <svg> element with explicit width and height
      expect(svg).toContain("<svg");
      expect(svg).toContain(`width="${resolution.width}"`);
      expect(svg).toContain(`height="${resolution.height}"`);
      // Satori renders text as vector paths — verify path elements are present
      expect(svg).toContain("<path");
    });

    it(`[${name}] generates valid JPEG from thumbnail`, async () => {
      const resolution = getCoverResolution(name);
      const content = generator.buildThumbnailContent("Multi Resolution Test", "Claude");
      const buffer = await generator.generateImage(classic, resolution, content);
      expect(buffer[0]).toBe(0xff); // JPEG magic bytes
      expect(buffer[1]).toBe(0xd8);
      expect(buffer[2]).toBe(0xff);
      expect(buffer.length).toBeGreaterThan(1000);
    });
  }
});

describe("CoverGenerator layout — title line count", () => {
  const generator = new CoverGenerator();

  it("1-line title produces valid SVG", async () => {
    const content = generator.buildThumbnailContent("Short", "Claude");
    const svg = await generator.generateCoverSvg(classic, defaultResolution, content);
    expect(svg).toContain("<svg");
  });

  it("4-line title (wrapTitle with maxLines=4) produces valid SVG", async () => {
    // Force 4 title lines by using 16-char max directly
    const titleLines = wrapTitle("Word1 Word2 Word3 Word4 Word5 Word6 Word7 Word8", 16, 4);
    expect(titleLines.length).toBeGreaterThanOrEqual(2);
    const content = { titleLines, author: "Claude", iconDataUri: undefined };
    const svg = await generator.generateCoverSvg(classic, defaultResolution, content);
    expect(svg).toContain("<svg");
  });
});
