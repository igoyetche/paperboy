import { describe, it, expect, vi, afterEach } from "vitest";
import { writeFile, unlink } from "node:fs/promises";
import { Readable } from "node:stream";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFromFile, readFromStdin } from "../../../src/infrastructure/cli/content-reader.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TMP_DIR = tmpdir();

function tmpPath(name: string): string {
  return join(TMP_DIR, `content-reader-test-${name}`);
}

async function writeTmp(name: string, content: string): Promise<string> {
  const path = tmpPath(name);
  await writeFile(path, content, "utf-8");
  return path;
}

async function writeTmpBytes(name: string, buffer: Buffer): Promise<string> {
  const path = tmpPath(name);
  await writeFile(path, buffer);
  return path;
}

async function removeTmp(name: string): Promise<void> {
  try {
    await unlink(tmpPath(name));
  } catch {
    // File may not exist if the test never created it — that is fine.
  }
}

/** Build a Readable that emits the given string then ends. */
function streamOf(content: string): Readable {
  return Readable.from([content]);
}

/** Build a Readable that never emits any data and never ends. */
function hangingStream(): Readable {
  return new Readable({ read() {} });
}

/** Build a Readable that emits data then emits an error. */
function errorStream(message: string): Readable {
  const stream = new Readable({ read() {} });
  // Emit on next tick so listeners are attached first.
  process.nextTick(() => {
    stream.emit("error", new Error(message));
  });
  return stream;
}

// ---------------------------------------------------------------------------
// readFromFile
// ---------------------------------------------------------------------------

describe("readFromFile", () => {
  afterEach(async () => {
    await removeTmp("valid.md");
    await removeTmp("exact-limit.md");
    await removeTmp("over-limit.md");
  });

  it("FR: returns file content for a valid file path", async () => {
    const path = await writeTmp("valid.md", "# Hello");
    const result = await readFromFile(path);
    expect(result).toBe("# Hello");
  });

  it("FR: throws ENOENT for a path that does not exist", async () => {
    const path = tmpPath("nonexistent-file-that-does-not-exist.md");
    await expect(readFromFile(path)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("FR: throws an error mentioning '25 MB' for a file larger than 25 MB", async () => {
    // 25 MB + 1 byte
    const MAX_FILE_BYTES = 25 * 1024 * 1024;
    const overSized = Buffer.alloc(MAX_FILE_BYTES + 1, "a");
    const path = await writeTmpBytes("over-limit.md", overSized);

    await expect(readFromFile(path)).rejects.toThrow("25 MB");

    await unlink(path);
  });

  it("FR: reads and returns content for a file exactly 25 MB in size", async () => {
    const MAX_FILE_BYTES = 25 * 1024 * 1024;
    // Fill with ASCII 'a' so the byte length equals the character length.
    const content = "a".repeat(MAX_FILE_BYTES);
    const path = await writeTmpBytes("exact-limit.md", Buffer.from(content, "utf-8"));

    const result = await readFromFile(path);

    // Content round-trips correctly.
    expect(result).toHaveLength(MAX_FILE_BYTES);
    expect(result[0]).toBe("a");

    await unlink(path);
  });
});

// ---------------------------------------------------------------------------
// readFromStdin
// ---------------------------------------------------------------------------

describe("readFromStdin", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("FR: resolves with stream content when the stream emits data and ends", async () => {
    const stream = streamOf("# Hello");
    const result = await readFromStdin(stream);
    expect(result).toBe("# Hello");
  });

  it("FR: resolves with empty string when the stream ends immediately without data", async () => {
    const stream = Readable.from([]);
    const result = await readFromStdin(stream);
    expect(result).toBe("");
  });

  it("FR: accumulates multiple data chunks into a single string", async () => {
    const stream = Readable.from(["# Hello", "\n\nWorld"]);
    const result = await readFromStdin(stream);
    expect(result).toBe("# Hello\n\nWorld");
  });

  it("FR: rejects with a timeout error mentioning --file when no data arrives within 30 seconds", async () => {
    vi.useFakeTimers();

    const stream = hangingStream();
    const promise = readFromStdin(stream);

    // Register the rejection handler BEFORE advancing timers so the rejection
    // is never "unhandled" — then fire the timer.
    const assertion = expect(promise).rejects.toThrow("--file");
    await vi.advanceTimersByTimeAsync(30_000);
    await assertion;
  });

  it("FR: timeout error message mentions the 30-second wait duration", async () => {
    vi.useFakeTimers();

    const stream = hangingStream();
    const promise = readFromStdin(stream);

    const assertion = expect(promise).rejects.toThrow("30 seconds");
    await vi.advanceTimersByTimeAsync(30_000);
    await assertion;
  });

  it("FR: clears the timeout when the stream ends before 30 seconds", async () => {
    vi.useFakeTimers();

    // Use a manually controlled stream so we can emit events in sequence.
    const stream = new Readable({ read() {} });
    const promise = readFromStdin(stream);

    // Emit data and end well before the timeout.
    stream.push("# Hello");
    stream.push(null); // signals end-of-stream

    // Advance time past the 30-second mark — must NOT reject.
    await vi.advanceTimersByTimeAsync(30_000);

    const result = await promise;
    expect(result).toBe("# Hello");
  });

  it("FR: rejects with the stream error when the stream emits an error event", async () => {
    const stream = errorStream("stream exploded");
    await expect(readFromStdin(stream)).rejects.toThrow("stream exploded");
  });

  it("FR: clears the timeout when the stream errors before 30 seconds", async () => {
    vi.useFakeTimers();

    const stream = new Readable({ read() {} });
    const promise = readFromStdin(stream);

    // Register the rejection handler before emitting the error so the
    // rejection is not considered unhandled.
    const assertion = expect(promise).rejects.toThrow("early error");

    // Emit an error before the timeout fires.
    stream.emit("error", new Error("early error"));

    // Advance past the timeout — it must NOT fire a second rejection.
    await vi.advanceTimersByTimeAsync(30_000);

    await assertion;
  });
});
