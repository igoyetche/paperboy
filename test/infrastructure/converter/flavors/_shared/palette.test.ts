/**
 * Tests for the shared palette hashing helpers.
 *
 * Implements FR-40 (PB-027): deterministic accent palette and issue number derivation.
 */

import { describe, it, expect } from "vitest";
import {
  fnv1a32,
  issueNumberFor,
  accentFor,
} from "../../../../../src/infrastructure/converter/flavors/_shared/palette.js";

describe("fnv1a32", () => {
  it("returns a stable known value for 'paperboy'", () => {
    // Value locked in from first run; any change to the algorithm will break this test.
    expect(fnv1a32("paperboy")).toBe(3225807593);
  });

  it("produces different hashes for different inputs", () => {
    expect(fnv1a32("a")).not.toBe(fnv1a32("b"));
  });

  it("returns a 32-bit unsigned integer (0 to 4294967295)", () => {
    const result = fnv1a32("paperboy");
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(4294967295);
  });

  it("is deterministic — same input produces the same result on every call", () => {
    expect(fnv1a32("hello")).toBe(fnv1a32("hello"));
  });

  it("does not throw on empty string and returns the FNV offset basis", () => {
    expect(() => fnv1a32("")).not.toThrow();
    expect(fnv1a32("")).toBe(2166136261);
  });

  it("does not throw on unicode input and returns a bounded number", () => {
    expect(() => fnv1a32("café")).not.toThrow();
    const result = fnv1a32("café");
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(4294967295);
  });
});

describe("accentFor", () => {
  it("returns a string matching the hsl(...) pattern", () => {
    const result = accentFor("example.com");
    expect(result).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/);
  });

  it("is deterministic — same seed produces the same accent on every call", () => {
    expect(accentFor("theverge.com")).toBe(accentFor("theverge.com"));
  });

  it("produces different accents for different seeds", () => {
    expect(accentFor("theverge.com")).not.toBe(accentFor("nytimes.com"));
  });

  it("does not throw on empty string", () => {
    expect(() => accentFor("")).not.toThrow();
  });
});

describe("issueNumberFor", () => {
  it("always returns a string of exactly 3 characters", () => {
    expect(issueNumberFor("paperboy")).toHaveLength(3);
    expect(issueNumberFor("a")).toHaveLength(3);
    expect(issueNumberFor("")).toHaveLength(3);
  });

  it("contains only digits", () => {
    expect(issueNumberFor("paperboy")).toMatch(/^\d{3}$/);
    expect(issueNumberFor("theverge.com")).toMatch(/^\d{3}$/);
  });

  it("is deterministic — same seed produces the same issue number on every call", () => {
    expect(issueNumberFor("paperboy")).toBe(issueNumberFor("paperboy"));
  });

  it("does not throw on empty string", () => {
    expect(() => issueNumberFor("")).not.toThrow();
  });
});
