#!/usr/bin/env node

/**
 * CLI composition root.
 *
 * Wires all dependencies and delegates to `run()` from the CLI application
 * module. Handles dotenv loading (CWD first, then ~/.paperboy/.env fallback),
 * config validation (fail-fast, exit 4 on error), and process.exit.
 *
 * Implements FR-CLI-4: CLI entry point / composition root
 * ADR #9: Pino log level set to "silent" in CLI mode
 * ADR #10: process.stdin.isTTY coerced to boolean (undefined → false)
 * ADR #11: dotenv fallback warns on parse errors but not on ENOENT
 */

import dotenv from "dotenv";
import { homedir } from "node:os";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { loadConfig } from "./infrastructure/config.js";
import { createPinoLogger, createDeliveryLogger } from "./infrastructure/logger.js";
import { MarkdownEpubConverter } from "./infrastructure/converter/markdown-epub-converter.js";
import { SmtpMailer } from "./infrastructure/mailer/smtp-mailer.js";
import { SendToKindleService } from "./domain/send-to-kindle-service.js";
import { readFromFile, readFromStdin } from "./infrastructure/cli/content-reader.js";
import { run, getUsageText } from "./application/cli.js";

interface PackageJson {
  readonly version: string;
}

// ---------------------------------------------------------------------------
// 0. Handle --help and --version before loading config (no env vars needed)
// ---------------------------------------------------------------------------

const rawArgs = process.argv.slice(2);

if (rawArgs.includes("--help")) {
  process.stderr.write(getUsageText() + "\n");
  process.exit(0);
}

if (rawArgs.includes("--version")) {
  const pkgUrl = new URL("../package.json", import.meta.url);
  const pkgJson = JSON.parse(readFileSync(pkgUrl, "utf-8")) as PackageJson;
  process.stderr.write(pkgJson.version + "\n");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// 1. Load .env files
//    CWD/.env is loaded first (dotenv default behaviour).
//    ~/.paperboy/.env is loaded as a fallback — values already set by the
//    first call are NOT overwritten (dotenv never overwrites existing vars).
// ---------------------------------------------------------------------------

dotenv.config(); // CWD/.env — silently skips if absent

const fallbackPath = join(homedir(), ".paperboy", ".env");
const fallbackResult = dotenv.config({ path: fallbackPath });

// Warn only when the file exists but could not be parsed.
// ENOENT means the file simply isn't there — that is expected and silent.
if (fallbackResult.error) {
  const nodeError = fallbackResult.error as NodeJS.ErrnoException;
  if (nodeError.code !== "ENOENT") {
    process.stderr.write(
      `Warning: could not parse ${fallbackPath}: ${fallbackResult.error.message}\n`,
    );
  }
}

// ---------------------------------------------------------------------------
// 2. Read version from package.json
//    Use URL + readFileSync so the path resolves correctly regardless of CWD.
// ---------------------------------------------------------------------------

const pkgPath = new URL("../package.json", import.meta.url);
const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as PackageJson;
const version = pkg.version;

// ---------------------------------------------------------------------------
// 3. Load config (fail-fast) → wire dependencies → run CLI
//    Config errors are the only expected failure path here; all other
//    errors propagate through the Result types inside run().
// ---------------------------------------------------------------------------

try {
  const config = loadConfig();

  // ADR #9: Use "silent" log level so pino produces no output in CLI mode.
  // The CLI communicates with the user exclusively through stderr.
  const pinoLogger = createPinoLogger("silent");
  const deliveryLogger = createDeliveryLogger(pinoLogger);

  const converter = new MarkdownEpubConverter();
  const mailer = new SmtpMailer({ sender: config.sender, smtp: config.smtp });
  const service = new SendToKindleService(converter, mailer, deliveryLogger);

  // ADR #10: Coerce process.stdin.isTTY to boolean — it is `undefined` when
  // stdin is redirected, which would be incorrectly truthy if not narrowed.
  const isTTY: boolean = process.stdin.isTTY === true;

  const exitCode = await run({
    service,
    devices: config.devices,
    defaultAuthor: config.defaultAuthor,
    argv: process.argv.slice(2),
    isTTY,
    readFromFile,
    readFromStdin,
    stdin: process.stdin,
    stderr: (msg: string) => process.stderr.write(msg + "\n"),
    version,
  });

  process.exit(exitCode);
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  process.stderr.write(`Configuration error: ${message}\n`);
  process.exit(4);
}
