import { describe, it, expect, vi } from "vitest";
import { join, normalize } from "node:path";
import { createFolderWatcher } from "../../../src/infrastructure/watcher/folder-watcher.js";

function createMockWatch() {
  let capturedHandler: ((path: string) => void) | undefined;
  const closeFn = vi.fn().mockResolvedValue(undefined);

  const mockWatch = vi.fn().mockReturnValue({
    on: vi.fn().mockImplementation(function (this: unknown, event: string, handler: (path: string) => void) {
      if (event === "add") capturedHandler = handler;
      return this;
    }),
    close: closeFn,
  });

  return {
    mockWatch,
    closeFn,
    fireAdd: (path: string) => {
      if (!capturedHandler) throw new Error("No add handler captured");
      capturedHandler(path);
    },
  };
}

const INBOX = normalize("/inbox");

describe("createFolderWatcher", () => {
  it("calls onFile for .md files in inbox root", () => {
    const onFile = vi.fn();
    const { mockWatch, fireAdd } = createMockWatch();

    createFolderWatcher({ inboxPath: INBOX, onFile, watch: mockWatch });

    fireAdd(join(INBOX, "article.md"));

    expect(onFile).toHaveBeenCalledWith(join(INBOX, "article.md"));
  });

  it("ignores non-.md files", () => {
    const onFile = vi.fn();
    const { mockWatch, fireAdd } = createMockWatch();

    createFolderWatcher({ inboxPath: INBOX, onFile, watch: mockWatch });

    fireAdd(join(INBOX, "photo.jpg"));

    expect(onFile).not.toHaveBeenCalled();
  });

  it("ignores files in sent/ subdirectory", () => {
    const onFile = vi.fn();
    const { mockWatch, fireAdd } = createMockWatch();

    createFolderWatcher({ inboxPath: INBOX, onFile, watch: mockWatch });

    fireAdd(join(INBOX, "sent", "article.md"));

    expect(onFile).not.toHaveBeenCalled();
  });

  it("ignores files in error/ subdirectory", () => {
    const onFile = vi.fn();
    const { mockWatch, fireAdd } = createMockWatch();

    createFolderWatcher({ inboxPath: INBOX, onFile, watch: mockWatch });

    fireAdd(join(INBOX, "error", "article.md"));

    expect(onFile).not.toHaveBeenCalled();
  });

  it("close stops the watcher", async () => {
    const { mockWatch, closeFn } = createMockWatch();

    const watcher = createFolderWatcher({
      inboxPath: INBOX,
      onFile: vi.fn(),
      watch: mockWatch,
    });

    await watcher.close();

    expect(closeFn).toHaveBeenCalled();
  });

  it("passes correct chokidar options including ignored paths", () => {
    const { mockWatch } = createMockWatch();

    createFolderWatcher({
      inboxPath: INBOX,
      onFile: vi.fn(),
      watch: mockWatch,
    });

    expect(mockWatch).toHaveBeenCalledWith(
      INBOX,
      expect.objectContaining({
        depth: 0,
        awaitWriteFinish: expect.objectContaining({
          stabilityThreshold: 2000,
          pollInterval: 200,
        }),
      }),
    );

    const callArgs = mockWatch.mock.calls[0];
    expect(callArgs).toBeDefined();
    if (!callArgs) return;
    const options = callArgs[1] as { ignored?: string[] };
    expect(options.ignored).toContain(join(INBOX, "sent"));
    expect(options.ignored).toContain(join(INBOX, "error"));
  });
});
