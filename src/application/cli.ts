/**
 * CLI argument parser, content source resolver, exit code mapper, and output formatter.
 * Implements pure functions with no I/O or side effects.
 *
 * Implements FR-CLI-1: CLI argument parsing
 * Implements FR-CLI-2: Exit code mapping
 * Implements FR-CLI-3: Output formatting
 */

import type { DomainError } from "../domain/errors.js";
import type { DeliverySuccess } from "../domain/send-to-kindle-service.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CliArgs {
  readonly kind: "args";
  readonly title: string;
  readonly filePath: string | undefined;
  readonly author: string | undefined;
  readonly device: string | undefined;
  readonly help: boolean;
  readonly version: boolean;
}

export interface ParseError {
  readonly kind: "parse-error";
  readonly message: string;
}

export type ContentSource =
  | { readonly kind: "file"; readonly path: string }
  | { readonly kind: "stdin" };

// ---------------------------------------------------------------------------
// parseArgs
// ---------------------------------------------------------------------------

const KNOWN_FLAGS = new Set([
  "--title",
  "--file",
  "--author",
  "--device",
  "--help",
  "--version",
]);

const BOOLEAN_FLAGS = new Set(["--help", "--version"]);

/**
 * Parses a pre-sliced argv array (no argv[0]/argv[1]) into CliArgs or ParseError.
 * Unknown flags → ParseError. Flag without value → ParseError.
 * Empty argv → ParseError about missing --title (unless --help or --version).
 *
 * Implements FR-CLI-1
 */
export function parseArgs(
  argv: ReadonlyArray<string>,
): CliArgs | ParseError {
  let title: string | undefined;
  let filePath: string | undefined;
  let author: string | undefined;
  let device: string | undefined;
  let help = false;
  let version = false;

  let i = 0;
  while (i < argv.length) {
    const token = argv[i];

    if (token === undefined) {
      break;
    }

    if (!token.startsWith("--")) {
      return {
        kind: "parse-error",
        message: `Unexpected argument: '${token}'. All arguments must start with '--'.`,
      };
    }

    if (!KNOWN_FLAGS.has(token)) {
      return {
        kind: "parse-error",
        message: `Unknown flag: '${token}'. Run with --help for usage.`,
      };
    }

    if (BOOLEAN_FLAGS.has(token)) {
      if (token === "--help") {
        help = true;
      } else if (token === "--version") {
        version = true;
      }
      i += 1;
      continue;
    }

    // Value-bearing flag: next token must exist and not be another flag
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      return {
        kind: "parse-error",
        message: `Flag '${token}' requires a value but none was provided.`,
      };
    }

    switch (token) {
      case "--title":
        title = next;
        break;
      case "--file":
        filePath = next;
        break;
      case "--author":
        author = next;
        break;
      case "--device":
        device = next;
        break;
      default: {
        // Should be unreachable given KNOWN_FLAGS check above, but keeps TS happy
        const _exhaustive: never = token as never;
        void _exhaustive;
        break;
      }
    }

    i += 2;
  }

  // --help and --version short-circuit: title not required
  if (help || version) {
    return {
      kind: "args",
      title: title ?? "",
      filePath,
      author,
      device,
      help,
      version,
    };
  }

  if (title === undefined) {
    return {
      kind: "parse-error",
      message:
        "Missing required flag: --title. Run with --help for usage.",
    };
  }

  return {
    kind: "args",
    title,
    filePath,
    author,
    device,
    help,
    version,
  };
}

// ---------------------------------------------------------------------------
// resolveContentSource
// ---------------------------------------------------------------------------

/**
 * Resolves where to read Markdown content from.
 * - filePath present → file source
 * - no filePath and stdin is piped (!isTTY) → stdin source
 * - no filePath and terminal (!isTTY is false) → "missing"
 *
 * Implements FR-CLI-1
 */
export function resolveContentSource(
  args: CliArgs,
  isTTY: boolean,
): ContentSource | "missing" {
  if (args.filePath !== undefined) {
    return { kind: "file", path: args.filePath };
  }
  if (!isTTY) {
    return { kind: "stdin" };
  }
  return "missing";
}

// ---------------------------------------------------------------------------
// mapErrorToExitCode
// ---------------------------------------------------------------------------

/**
 * Maps a DomainError to a POSIX exit code.
 * - validation → 1
 * - size_limit → 1
 * - conversion → 2
 * - delivery → 3
 *
 * Uses an exhaustive switch with a `never` default to ensure all
 * DomainError variants are covered at compile time.
 *
 * Implements FR-CLI-2
 */
export function mapErrorToExitCode(error: DomainError): number {
  switch (error.kind) {
    case "validation":
      return 1;
    case "size_limit":
      return 1;
    case "conversion":
      return 2;
    case "delivery":
      return 3;
    default: {
      const _exhaustive: never = error;
      void _exhaustive;
      return 1;
    }
  }
}

// ---------------------------------------------------------------------------
// formatOutput
// ---------------------------------------------------------------------------

/**
 * Formats a successful delivery result as a human-readable string.
 * Pattern: "Sent '<title>' to Kindle (<deviceName>) — <sizeBytes> bytes"
 *
 * Implements FR-CLI-3
 */
export function formatSuccess(result: DeliverySuccess): string {
  return `Sent '${result.title}' to Kindle (${result.deviceName}) — ${result.sizeBytes} bytes`;
}

/**
 * Formats an error message for CLI output.
 * Pattern: "Error: <message>"
 *
 * Implements FR-CLI-3
 */
export function formatError(message: string): string {
  return `Error: ${message}`;
}

// ---------------------------------------------------------------------------
// getUsageText
// ---------------------------------------------------------------------------

/**
 * Returns the CLI help/usage text shown when --help is passed.
 *
 * Implements FR-CLI-1
 */
export function getUsageText(): string {
  return `
send-to-kindle — Send Markdown content to your Kindle device

USAGE
  send-to-kindle --title <title> [--file <path>] [options]
  echo "# Hello" | send-to-kindle --title <title> [options]

FLAGS
  --title <title>     (required) Title of the document sent to Kindle
  --file  <path>      Path to a Markdown file; reads from stdin if omitted
  --author <name>     Author name embedded in the EPUB (default: configured value)
  --device <name>     Target Kindle device name (default: first configured device)
  --help              Show this help text and exit
  --version           Show version number and exit

EXIT CODES
  0   Success
  1   Validation or input size error
  2   EPUB conversion error
  3   Email delivery error

EXAMPLES
  send-to-kindle --title "My Article" --file article.md
  cat article.md | send-to-kindle --title "My Article"
  send-to-kindle --title "Notes" --file notes.md --author "Alice" --device "Alice's Kindle"
`.trimStart();
}
