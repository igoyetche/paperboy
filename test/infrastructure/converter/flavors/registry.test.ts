/**
 * Tests for the flavor registry (flavors/index.ts).
 *
 * Implements FR-38 (PB-026): static, type-safe flavor registry with
 * isFlavorName, getFlavor, and listFlavorNames.
 */

import { describe, it, expect } from "vitest";
import {
  listFlavorNames,
  getFlavor,
  isFlavorName,
} from "../../../../src/infrastructure/converter/flavors/index.js";

describe("listFlavorNames", () => {
  it("returns at least ['classic']", () => {
    const names = listFlavorNames();
    expect(names).toContain("classic");
  });

  it("returns a non-empty array", () => {
    expect(listFlavorNames().length).toBeGreaterThan(0);
  });
});

describe("getFlavor", () => {
  it("returns a CoverFlavor object with all three contract methods for 'classic'", () => {
    const flavor = getFlavor("classic");
    expect(typeof flavor.buildThumbnail).toBe("function");
    expect(typeof flavor.buildHtmlChapter).toBe("function");
    expect(typeof flavor.buildCoverCss).toBe("function");
  });

  it("returns a flavor whose name property matches the registry key", () => {
    const flavor = getFlavor("classic");
    expect(flavor.name).toBe("classic");
  });
});

describe("isFlavorName", () => {
  it("returns true for a known flavor name", () => {
    expect(isFlavorName("classic")).toBe(true);
  });

  it("returns false for an unknown name", () => {
    expect(isFlavorName("does-not-exist")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isFlavorName("")).toBe(false);
  });

  it("returns false for a name that looks like a valid flavor but is not registered", () => {
    expect(isFlavorName("dark")).toBe(false);
  });
});
