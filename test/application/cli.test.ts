import { describe, it, expect } from "vitest";
import {
  parseArgs,
  resolveContentSource,
  mapErrorToExitCode,
  formatSuccess,
  formatError,
} from "../../src/application/cli.js";
import type { CliArgs } from "../../src/application/cli.js";
import {
  ValidationError,
  SizeLimitError,
  ConversionError,
  DeliveryError,
} from "../../src/domain/errors.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCliArgs(overrides: Partial<CliArgs> = {}): CliArgs {
  return {
    kind: "args",
    title: "Test Title",
    filePath: undefined,
    author: undefined,
    device: undefined,
    help: false,
    version: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// parseArgs
// ---------------------------------------------------------------------------

describe("parseArgs", () => {
  describe("FR-CLI-1: happy path", () => {
    it("parses --title and --file into CliArgs", () => {
      const result = parseArgs(["--title", "Test", "--file", "notes.md"]);

      expect(result.kind).toBe("args");
      if (result.kind === "args") {
        expect(result.title).toBe("Test");
        expect(result.filePath).toBe("notes.md");
        expect(result.help).toBe(false);
        expect(result.version).toBe(false);
      }
    });

    it("parses --title, --author, and --device into CliArgs with all fields populated", () => {
      const result = parseArgs([
        "--title", "Test",
        "--author", "Team",
        "--device", "partner",
      ]);

      expect(result.kind).toBe("args");
      if (result.kind === "args") {
        expect(result.title).toBe("Test");
        expect(result.author).toBe("Team");
        expect(result.device).toBe("partner");
      }
    });

    it("parses all flags together", () => {
      const result = parseArgs([
        "--title", "My Doc",
        "--file", "doc.md",
        "--author", "Alice",
        "--device", "alice-kindle",
      ]);

      expect(result.kind).toBe("args");
      if (result.kind === "args") {
        expect(result.title).toBe("My Doc");
        expect(result.filePath).toBe("doc.md");
        expect(result.author).toBe("Alice");
        expect(result.device).toBe("alice-kindle");
        expect(result.help).toBe(false);
        expect(result.version).toBe(false);
      }
    });

    it("returns CliArgs with help: true when --help is passed", () => {
      const result = parseArgs(["--help"]);

      expect(result.kind).toBe("args");
      if (result.kind === "args") {
        expect(result.help).toBe(true);
        expect(result.version).toBe(false);
      }
    });

    it("returns CliArgs with version: true when --version is passed", () => {
      const result = parseArgs(["--version"]);

      expect(result.kind).toBe("args");
      if (result.kind === "args") {
        expect(result.version).toBe(true);
        expect(result.help).toBe(false);
      }
    });

    it("allows --help without --title (title not required for boolean flags)", () => {
      const result = parseArgs(["--help"]);

      expect(result.kind).toBe("args");
      if (result.kind === "args") {
        expect(result.title).toBe("");
      }
    });

    it("allows --version without --title (title not required for boolean flags)", () => {
      const result = parseArgs(["--version"]);

      expect(result.kind).toBe("args");
    });

    it("parses flags in any order", () => {
      const result = parseArgs(["--author", "Bob", "--title", "My Title"]);

      expect(result.kind).toBe("args");
      if (result.kind === "args") {
        expect(result.title).toBe("My Title");
        expect(result.author).toBe("Bob");
      }
    });
  });

  describe("FR-CLI-1: error cases", () => {
    it("returns ParseError with message about missing --title when argv is empty", () => {
      const result = parseArgs([]);

      expect(result.kind).toBe("parse-error");
      if (result.kind === "parse-error") {
        expect(result.message).toContain("--title");
      }
    });

    it("returns ParseError when --title flag has no value", () => {
      const result = parseArgs(["--title"]);

      expect(result.kind).toBe("parse-error");
      if (result.kind === "parse-error") {
        expect(result.message).toContain("--title");
      }
    });

    it("returns ParseError when --file flag has no value", () => {
      const result = parseArgs(["--title", "My Doc", "--file"]);

      expect(result.kind).toBe("parse-error");
      if (result.kind === "parse-error") {
        expect(result.message).toContain("--file");
      }
    });

    it("returns ParseError when --author flag has no value", () => {
      const result = parseArgs(["--title", "My Doc", "--author"]);

      expect(result.kind).toBe("parse-error");
      if (result.kind === "parse-error") {
        expect(result.message).toContain("--author");
      }
    });

    it("returns ParseError when --device flag has no value", () => {
      const result = parseArgs(["--title", "My Doc", "--device"]);

      expect(result.kind).toBe("parse-error");
      if (result.kind === "parse-error") {
        expect(result.message).toContain("--device");
      }
    });

    it("returns ParseError mentioning unknown flag when given --unknown", () => {
      const result = parseArgs(["--unknown", "value"]);

      expect(result.kind).toBe("parse-error");
      if (result.kind === "parse-error") {
        expect(result.message).toContain("--unknown");
      }
    });

    it("returns ParseError when a value-bearing flag is followed by another flag instead of a value", () => {
      const result = parseArgs(["--title", "--file"]);

      expect(result.kind).toBe("parse-error");
      if (result.kind === "parse-error") {
        expect(result.message).toContain("--title");
      }
    });

    it("returns ParseError when a bare word without -- prefix is passed", () => {
      const result = parseArgs(["myfile.md"]);

      expect(result.kind).toBe("parse-error");
    });
  });
});

// ---------------------------------------------------------------------------
// resolveContentSource
// ---------------------------------------------------------------------------

describe("resolveContentSource", () => {
  describe("FR-CLI-1: content source resolution", () => {
    it("returns file source when filePath is provided", () => {
      const args = makeCliArgs({ filePath: "notes.md" });
      const result = resolveContentSource(args, true);

      expect(result).toEqual({ kind: "file", path: "notes.md" });
    });

    it("returns file source when filePath is provided regardless of isTTY", () => {
      const args = makeCliArgs({ filePath: "article.md" });

      expect(resolveContentSource(args, false)).toEqual({ kind: "file", path: "article.md" });
      expect(resolveContentSource(args, true)).toEqual({ kind: "file", path: "article.md" });
    });

    it("returns stdin source when filePath is undefined and isTTY is false (piped input)", () => {
      const args = makeCliArgs({ filePath: undefined });
      const result = resolveContentSource(args, false);

      expect(result).toEqual({ kind: "stdin" });
    });

    it('returns "missing" when filePath is undefined and isTTY is true (interactive terminal)', () => {
      const args = makeCliArgs({ filePath: undefined });
      const result = resolveContentSource(args, true);

      expect(result).toBe("missing");
    });
  });
});

// ---------------------------------------------------------------------------
// mapErrorToExitCode
// ---------------------------------------------------------------------------

describe("mapErrorToExitCode", () => {
  describe("FR-CLI-2: exit code mapping", () => {
    it("maps ValidationError to exit code 1", () => {
      const error = new ValidationError("title", "Title is required");
      expect(mapErrorToExitCode(error)).toBe(1);
    });

    it("maps SizeLimitError to exit code 1", () => {
      const error = new SizeLimitError(30 * 1024 * 1024, 25 * 1024 * 1024);
      expect(mapErrorToExitCode(error)).toBe(1);
    });

    it("maps ConversionError to exit code 2", () => {
      const error = new ConversionError("EPUB generation failed");
      expect(mapErrorToExitCode(error)).toBe(2);
    });

    it("maps DeliveryError with auth cause to exit code 3", () => {
      const error = new DeliveryError("auth", "Authentication failed");
      expect(mapErrorToExitCode(error)).toBe(3);
    });

    it("maps DeliveryError with connection cause to exit code 3", () => {
      const error = new DeliveryError("connection", "Connection refused");
      expect(mapErrorToExitCode(error)).toBe(3);
    });

    it("maps DeliveryError with rejection cause to exit code 3", () => {
      const error = new DeliveryError("rejection", "Message rejected");
      expect(mapErrorToExitCode(error)).toBe(3);
    });
  });
});

// ---------------------------------------------------------------------------
// formatSuccess
// ---------------------------------------------------------------------------

describe("formatSuccess", () => {
  describe("FR-CLI-3: success output formatting", () => {
    it("returns a string containing the title, device name, and byte count", () => {
      const result = formatSuccess({
        title: "Test",
        sizeBytes: 1024,
        deviceName: "personal",
      });

      expect(result).toContain("Test");
      expect(result).toContain("personal");
      expect(result).toContain("1024");
    });

    it("includes title in single quotes", () => {
      const result = formatSuccess({
        title: "My Article",
        sizeBytes: 2048,
        deviceName: "work",
      });

      expect(result).toContain("'My Article'");
    });

    it("includes device name in parentheses", () => {
      const result = formatSuccess({
        title: "Notes",
        sizeBytes: 512,
        deviceName: "partner",
      });

      expect(result).toContain("(partner)");
    });

    it("produces the exact expected format for a representative input", () => {
      const result = formatSuccess({
        title: "Test",
        sizeBytes: 1024,
        deviceName: "personal",
      });

      expect(result).toBe("Sent 'Test' to Kindle (personal) — 1024 bytes");
    });
  });
});

// ---------------------------------------------------------------------------
// formatError
// ---------------------------------------------------------------------------

describe("formatError", () => {
  describe("FR-CLI-3: error output formatting", () => {
    it('returns a string starting with "Error:"', () => {
      const result = formatError("something went wrong");

      expect(result.startsWith("Error:")).toBe(true);
    });

    it("includes the provided message in the output", () => {
      const message = "Could not connect to SMTP server";
      const result = formatError(message);

      expect(result).toContain(message);
    });

    it("produces the exact expected format", () => {
      const result = formatError("validation failed");

      expect(result).toBe("Error: validation failed");
    });

    it("handles empty string message", () => {
      const result = formatError("");

      expect(result).toBe("Error: ");
    });
  });
});
