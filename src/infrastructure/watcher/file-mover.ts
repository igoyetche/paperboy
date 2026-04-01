// Implements FR-9 (watch folder): move processed files to sent/ or error/ subdirectories
import { basename, join, extname } from "node:path";

/** Injected I/O dependencies for testability. */
export interface FileMoverDeps {
  rename: (src: string, dest: string) => Promise<void>;
  writeFile: (path: string, content: string) => Promise<void>;
  mkdir: (path: string) => Promise<void>;
  exists: (path: string) => Promise<boolean>;
}

/** Moves a processed inbox file to the appropriate outcome directory. */
export interface FileMover {
  /** Moves the file to the inbox's `sent/` subdirectory. Returns the final destination path. */
  moveToSent: (filePath: string) => Promise<string>;
  /**
   * Moves the file to the inbox's `error/` subdirectory and writes a companion
   * `<name>.error.txt` file describing the failure. Returns the final destination path.
   */
  moveToError: (filePath: string, errorKind: string, errorMessage: string) => Promise<string>;
}

/**
 * Returns a deduplicated destination path. If the candidate path already exists,
 * appends the current epoch timestamp before the extension.
 */
async function deduplicatePath(
  dir: string,
  name: string,
  ext: string,
  exists: (path: string) => Promise<boolean>,
): Promise<string> {
  const candidate = join(dir, `${name}${ext}`);
  if (!(await exists(candidate))) return candidate;
  return join(dir, `${name}-${Date.now()}${ext}`);
}

/**
 * Creates a FileMover that targets `<inboxPath>/sent` and `<inboxPath>/error`.
 *
 * Implements FR-9: post-processing file disposition.
 */
export function createFileMover(inboxPath: string, deps: FileMoverDeps): FileMover {
  const sentDir = join(inboxPath, "sent");
  const errorDir = join(inboxPath, "error");

  return {
    async moveToSent(filePath: string): Promise<string> {
      await deps.mkdir(sentDir);
      const file = basename(filePath);
      const ext = extname(file);
      const name = ext.length > 0 ? file.slice(0, -ext.length) : file;
      const dest = await deduplicatePath(sentDir, name, ext, deps.exists);
      await deps.rename(filePath, dest);
      return dest;
    },

    async moveToError(filePath: string, errorKind: string, errorMessage: string): Promise<string> {
      await deps.mkdir(errorDir);
      const file = basename(filePath);
      const ext = extname(file);
      const name = ext.length > 0 ? file.slice(0, -ext.length) : file;
      const dest = await deduplicatePath(errorDir, name, ext, deps.exists);
      await deps.rename(filePath, dest);

      const errorFileName = `${basename(dest, ext)}.error.txt`;
      const errorFilePath = join(errorDir, errorFileName);
      const errorContent =
        [
          `Timestamp: ${new Date().toISOString()}`,
          `Error: ${errorKind}`,
          `Message: ${errorMessage}`,
        ].join("\n") + "\n";
      await deps.writeFile(errorFilePath, errorContent);

      return dest;
    },
  };
}
