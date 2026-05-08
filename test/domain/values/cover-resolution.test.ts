/**
 * Tests for the CoverResolution value type and helpers.
 *
 * Implements FR-39 (PB-026): fixed set of three predefined Kindle resolutions
 * with isCoverResolutionName, getCoverResolution, and listCoverResolutionNames.
 */

import { describe, it, expect } from "vitest";
import {
  listCoverResolutionNames,
  getCoverResolution,
  isCoverResolutionName,
} from "../../../src/domain/values/cover-resolution.js";

describe("listCoverResolutionNames", () => {
  it("returns exactly three names", () => {
    expect(listCoverResolutionNames().length).toBe(3);
  });

  it("returns the three predefined Kindle resolution names", () => {
    const names = listCoverResolutionNames();
    expect(names).toContain("1264x1680");
    expect(names).toContain("1072x1448");
    expect(names).toContain("600x800");
  });

  it("does not include any extra entries", () => {
    const names = listCoverResolutionNames();
    expect([...names].sort()).toEqual(["1072x1448", "1264x1680", "600x800"].sort());
  });
});

describe("getCoverResolution", () => {
  it("returns { name: '1264x1680', width: 1264, height: 1680 } for the default resolution", () => {
    const res = getCoverResolution("1264x1680");
    expect(res.name).toBe("1264x1680");
    expect(res.width).toBe(1264);
    expect(res.height).toBe(1680);
  });

  it("returns { name: '1072x1448', width: 1072, height: 1448 } for the legacy Paperwhite resolution", () => {
    const res = getCoverResolution("1072x1448");
    expect(res.name).toBe("1072x1448");
    expect(res.width).toBe(1072);
    expect(res.height).toBe(1448);
  });

  it("returns { name: '600x800', width: 600, height: 800 } for the basic Kindle resolution", () => {
    const res = getCoverResolution("600x800");
    expect(res.name).toBe("600x800");
    expect(res.width).toBe(600);
    expect(res.height).toBe(800);
  });
});

describe("isCoverResolutionName", () => {
  it("returns true for '1264x1680'", () => {
    expect(isCoverResolutionName("1264x1680")).toBe(true);
  });

  it("returns true for '1072x1448'", () => {
    expect(isCoverResolutionName("1072x1448")).toBe(true);
  });

  it("returns true for '600x800'", () => {
    expect(isCoverResolutionName("600x800")).toBe(true);
  });

  it("returns false for '1280x800' (not a predefined resolution)", () => {
    expect(isCoverResolutionName("1280x800")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isCoverResolutionName("")).toBe(false);
  });

  it("returns false for a free-form resolution string", () => {
    expect(isCoverResolutionName("2000x3000")).toBe(false);
  });

  it("returns false for a near-miss (off by one pixel)", () => {
    expect(isCoverResolutionName("1264x1681")).toBe(false);
  });
});
