import { describe, it, expect } from "vitest";
import { buildThumbnail } from "../../../../../src/infrastructure/converter/flavors/brutalist/thumbnail.js";
import { accentFor, issueNumberFor } from "../../../../../src/infrastructure/converter/flavors/_shared/palette.js";
import { PAPER } from "../../../../../src/infrastructure/converter/flavors/brutalist/tokens.js";
import type { ThumbnailInput, SatoriNode } from "../../../../../src/domain/ports.js";

function makeInput(overrides: Partial<ThumbnailInput> = {}): ThumbnailInput {
  return {
    titleLines: ["The Quick Brown Fox", "Jumps Over The Lazy Dog"],
    author: "Claude",
    width: 600,
    height: 900,
    ...overrides,
  };
}

describe("buildThumbnail (brutalist)", () => {
  it("returns a root div with display flex and flexDirection column", () => {
    const node = buildThumbnail(makeInput());
    expect(node.type).toBe("div");
    expect(node.props.style?.display).toBe("flex");
    expect(node.props.style?.flexDirection).toBe("column");
  });

  it("root node carries width and height from input", () => {
    const node = buildThumbnail(makeInput({ width: 1264, height: 1680 }));
    expect(node.props.style?.width).toBe(1264);
    expect(node.props.style?.height).toBe(1680);
  });

  it("root node has exactly three children: masthead, title-hero, footer", () => {
    const node = buildThumbnail(makeInput());
    const children = node.props.children;
    expect(Array.isArray(children)).toBe(true);
    expect((children as unknown[]).length).toBe(3);
  });

  it("masthead is the first child and contains PAPERBOY text", () => {
    const node = buildThumbnail(makeInput());
    const children = node.props.children as readonly SatoriNode[];
    const masthead = children[0];
    expect(masthead).toBeDefined();
    const mastheadStr = JSON.stringify(masthead);
    expect(mastheadStr).toContain("PAPERBOY");
  });

  it("masthead contains the issue number derived from sourceDomain when provided", () => {
    const input = makeInput({ sourceDomain: "theverge.com" });
    const node = buildThumbnail(input);
    const children = node.props.children as readonly SatoriNode[];
    const masthead = children[0];
    const expected = issueNumberFor("theverge.com");
    expect(JSON.stringify(masthead)).toContain(expected);
  });

  it("masthead issue number derives from titleLines when sourceDomain is absent", () => {
    const input = makeInput({ sourceDomain: undefined });
    const node = buildThumbnail(input);
    const children = node.props.children as readonly SatoriNode[];
    const masthead = children[0];
    const seed = input.titleLines.join(" ");
    const expected = issueNumberFor(seed);
    expect(JSON.stringify(masthead)).toContain(expected);
  });

  it("title hero is the second child and renders each titleLine in uppercase", () => {
    const input = makeInput({ titleLines: ["Hello World", "Second Line"] });
    const node = buildThumbnail(input);
    const children = node.props.children as readonly SatoriNode[];
    const hero = children[1];
    const heroStr = JSON.stringify(hero);
    expect(heroStr).toContain("HELLO WORLD");
    expect(heroStr).toContain("SECOND LINE");
  });

  it("title hero has flex: 1 to absorb remaining space", () => {
    const node = buildThumbnail(makeInput());
    const children = node.props.children as readonly SatoriNode[];
    const hero = children[1];
    expect(hero.props.style?.flex).toBe(1);
  });

  it("footer is the third child with accent background color", () => {
    const input = makeInput({ sourceDomain: "nytimes.com" });
    const node = buildThumbnail(input);
    const children = node.props.children as readonly SatoriNode[];
    const footer = children[2];
    expect(footer.props.style?.backgroundColor).toBe(accentFor("nytimes.com"));
  });

  it("footer accent derives from titleLines when sourceDomain is absent", () => {
    const input = makeInput({ sourceDomain: undefined });
    const node = buildThumbnail(input);
    const children = node.props.children as readonly SatoriNode[];
    const footer = children[2];
    const seed = input.titleLines.join(" ");
    expect(footer.props.style?.backgroundColor).toBe(accentFor(seed));
  });

  it("footer contains the author as byline when author is present", () => {
    const input = makeInput({ author: "Jane Smith", sourceDomain: "bbc.com" });
    const node = buildThumbnail(input);
    const children = node.props.children as readonly SatoriNode[];
    const footer = children[2];
    expect(JSON.stringify(footer)).toContain("Jane Smith");
  });

  it("footer shows sourceDomain as byline when author is empty", () => {
    const input = makeInput({ author: "", sourceDomain: "bbc.com" });
    const node = buildThumbnail(input);
    const children = node.props.children as readonly SatoriNode[];
    const footer = children[2];
    expect(JSON.stringify(footer)).toContain("BBC.COM");
  });

  it("footer includes icon directly on accent background (no paper-colored backplate) when iconDataUri is provided", () => {
    const input = makeInput({ iconDataUri: "data:image/png;base64,abc123" });
    const node = buildThumbnail(input);
    const children = node.props.children as readonly SatoriNode[];
    const footer = children[2];
    const footerStr = JSON.stringify(footer);
    expect(footerStr).toContain("data:image/png;base64,abc123");
    expect(footerStr).not.toContain(PAPER);
  });

  it("footer omits icon block when iconDataUri is undefined", () => {
    const input = makeInput({ iconDataUri: undefined });
    const node = buildThumbnail(input);
    const children = node.props.children as readonly SatoriNode[];
    const footer = children[2];
    const footerChildren = footer.props.children as readonly SatoriNode[];
    expect(Array.isArray(footerChildren)).toBe(true);
    expect(footerChildren.length).toBe(1);
  });

  it("scales font sizes proportionally at 1264 width vs 600 width", () => {
    const n600 = buildThumbnail(makeInput({ width: 600, height: 900 }));
    const n1264 = buildThumbnail(makeInput({ width: 1264, height: 1680 }));
    const titleAt600 = JSON.parse(JSON.stringify(n600));
    const titleAt1264 = JSON.parse(JSON.stringify(n1264));
    const hero600 = (titleAt600.props.children as unknown[])[1] as { props: { children: unknown[] } };
    const hero1264 = (titleAt1264.props.children as unknown[])[1] as { props: { children: unknown[] } };
    const line600 = (hero600.props.children)[0] as { props: { style: { fontSize: number } } };
    const line1264 = (hero1264.props.children)[0] as { props: { style: { fontSize: number } } };
    expect(line1264.props.style.fontSize).toBeGreaterThan(line600.props.style.fontSize);
  });

  it("seed falls back to author when titleLines is empty and sourceDomain is absent", () => {
    const input = makeInput({ titleLines: [], author: "FallbackAuthor", sourceDomain: undefined });
    expect(() => buildThumbnail(input)).not.toThrow();
    const node = buildThumbnail(input);
    const children = node.props.children as readonly SatoriNode[];
    const footer = children[2];
    const expectedAccent = accentFor("FallbackAuthor");
    expect(footer.props.style?.backgroundColor).toBe(expectedAccent);
  });
});
