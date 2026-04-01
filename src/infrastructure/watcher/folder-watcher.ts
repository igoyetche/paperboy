import { dirname, extname, normalize, join } from "node:path";

interface ChokidarWatcher {
  on: (event: string, handler: (path: string) => void) => ChokidarWatcher;
  close: () => Promise<void>;
}

type WatchFn = (
  path: string,
  options: {
    depth: number;
    ignored: string[];
    awaitWriteFinish: { stabilityThreshold: number; pollInterval: number };
  },
) => ChokidarWatcher;

export interface FolderWatcherOptions {
  inboxPath: string;
  onFile: (filePath: string) => void;
  watch: WatchFn;
}

export interface FolderWatcher {
  close: () => Promise<void>;
}

/**
 * Creates a folder watcher that monitors an inbox directory for new .md files.
 * Implements the watch-folder feature (PB-009).
 *
 * Defense in depth: filters by extension and parent directory even though
 * chokidar is configured with depth: 0 and ignored subdirectories.
 */
export function createFolderWatcher(opts: FolderWatcherOptions): FolderWatcher {
  const { inboxPath, onFile, watch } = opts;
  const normalizedInbox = normalize(inboxPath);

  const watcher = watch(inboxPath, {
    depth: 0,
    ignored: [join(inboxPath, "sent"), join(inboxPath, "error")],
    awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 200 },
  });

  watcher.on("add", (filePath: string) => {
    const normalizedFile = normalize(filePath);

    // Defense in depth: only process .md files directly in inbox root
    if (extname(normalizedFile).toLowerCase() !== ".md") return;
    if (normalize(dirname(normalizedFile)) !== normalizedInbox) return;

    onFile(filePath);
  });

  return {
    close: () => watcher.close(),
  };
}
