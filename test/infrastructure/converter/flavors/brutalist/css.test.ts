import { describe, it, expect } from "vitest";
import { buildCoverCss } from "../../../../../src/infrastructure/converter/flavors/brutalist/css.js";
import { INK, PAPER, ACCENT_INK, FONT_FAMILY } from "../../../../../src/infrastructure/converter/flavors/brutalist/tokens.js";

describe("buildCoverCss (brutalist)", () => {
  it("returns a non-empty string", () => {
    const css = buildCoverCss();
    expect(typeof css).toBe("string");
    expect(css.length).toBeGreaterThan(0);
  });

  it("contains a @font-face block for Inter Bold", () => {
    const css = buildCoverCss();
    expect(css).toContain("@font-face");
    expect(css).toContain(`font-family: "${FONT_FAMILY}"`);
    expect(css).toContain("font-weight: 700");
    expect(css).toContain("fonts/inter-bold.ttf");
  });

  it("@font-face src uses a relative url pointing to fonts/inter-bold.ttf", () => {
    const css = buildCoverCss();
    expect(css).toMatch(/url\("fonts\/inter-bold\.ttf"\)/);
  });

  it("applies font-family to body", () => {
    const css = buildCoverCss();
    expect(css).toContain(`font-family: "${FONT_FAMILY}"`);
    expect(css).toMatch(/body\s*\{[^}]*font-family/);
  });

  it("declares .cover class", () => {
    const css = buildCoverCss();
    expect(css).toContain(".cover");
  });

  it("declares .masthead class with INK background", () => {
    const css = buildCoverCss();
    expect(css).toContain(".masthead");
    expect(css).toContain(INK);
  });

  it("declares .title class with PAPER or INK color and text-transform: uppercase", () => {
    const css = buildCoverCss();
    expect(css).toContain(".title");
    expect(css).toContain("text-transform: uppercase");
  });

  it("declares .footer class", () => {
    const css = buildCoverCss();
    expect(css).toContain(".footer");
  });

  it("declares .byline class with ACCENT_INK color", () => {
    const css = buildCoverCss();
    expect(css).toContain(".byline");
    expect(css).toContain(ACCENT_INK);
  });

  it("uses PAPER as background on .cover", () => {
    const css = buildCoverCss();
    expect(css).toContain(PAPER);
  });

  it("declares .kicker class with text-transform: uppercase", () => {
    const css = buildCoverCss();
    expect(css).toContain(".kicker");
    expect(css).toContain("text-transform: uppercase");
  });

  it("declares .issue class", () => {
    const css = buildCoverCss();
    expect(css).toContain(".issue");
  });
});
