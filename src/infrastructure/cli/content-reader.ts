/**
 * Content reader utilities for the CLI transport.
 *
 * Provides two entry points for reading Markdown content into a plain string:
 *   - readFromFile   — reads from a filesystem path with a size guard
 *   - readFromStdin  — reads from a Readable stream with a 30-second timeout
 *
 * Both functions return Promise<string> so the caller stays decoupled from
 * domain types.  Size validation against MarkdownContent.MAX_BYTES happens
 * here (infrastructure concern) rather than being deferred to the domain.
 */

import { stat, readFile } from "node:fs/promises";
import type { Readable } from "node:stream";

/** 25 MB — mirrors MarkdownContent.MAX_BYTES so we fail fast before parsing. */
const MAX_FILE_BYTES = 25 * 1024 * 1024;

/** Timeout (ms) before stdin is considered idle and the read is rejected. */
const STDIN_TIMEOUT_MS = 30_000;

/**
 * Reads UTF-8 content from a file at the given path.
 *
 * Rejects with an Error when:
 *   - The file size exceeds 25 MB (checked via stat before reading)
 *   - The file cannot be accessed (ENOENT, EACCES, etc.)
 *
 * Files whose size is exactly 25 MB are accepted.
 */
export async function readFromFile(path: string): Promise<string> {
  const fileStats = await stat(path);

  if (fileStats.size > MAX_FILE_BYTES) {
    throw new Error(
      `File is too large: ${fileStats.size} bytes exceeds the 25 MB limit (${MAX_FILE_BYTES} bytes).`,
    );
  }

  return readFile(path, "utf-8");
}

/**
 * Reads UTF-8 content from a Readable stream (typically process.stdin).
 *
 * Rejects with an Error when:
 *   - No data is received within 30 seconds — message suggests using --file
 *   - The stream emits an error event
 *
 * Resolves with the full accumulated content when the stream ends normally
 * before the timeout.
 */
export function readFromStdin(stream: Readable): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];

    const timer = setTimeout(() => {
      cleanup();
      reject(
        new Error(
          "Timed out waiting for stdin input after 30 seconds. " +
            "Pipe content via stdin or use the --file option to specify a file path.",
        ),
      );
    }, STDIN_TIMEOUT_MS);

    function onData(chunk: Buffer | string): void {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    function onEnd(): void {
      clearTimeout(timer);
      cleanup();
      resolve(Buffer.concat(chunks).toString("utf-8"));
    }

    function onError(error: Error): void {
      clearTimeout(timer);
      cleanup();
      reject(error);
    }

    function cleanup(): void {
      stream.off("data", onData);
      stream.off("end", onEnd);
      stream.off("error", onError);
    }

    stream.on("data", onData);
    stream.on("end", onEnd);
    stream.on("error", onError);
  });
}
