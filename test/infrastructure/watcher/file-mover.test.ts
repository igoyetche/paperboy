import { describe, it, expect, vi } from "vitest";
import { join } from "node:path";
import { createFileMover, type FileMoverDeps } from "../../../src/infrastructure/watcher/file-mover.js";

function makeDeps(overrides?: Partial<FileMoverDeps>): FileMoverDeps {
  return {
    rename: vi.fn<(src: string, dest: string) => Promise<void>>().mockResolvedValue(undefined),
    writeFile: vi.fn<(path: string, content: string) => Promise<void>>().mockResolvedValue(undefined),
    mkdir: vi.fn<(path: string) => Promise<void>>().mockResolvedValue(undefined),
    exists: vi.fn<(path: string) => Promise<boolean>>().mockResolvedValue(false),
    ...overrides,
  };
}

const INBOX = join("/inbox");

describe("createFileMover", () => {
  describe("moveToSent", () => {
    it("creates sent dir and moves file", async () => {
      const deps = makeDeps();
      const mover = createFileMover(INBOX, deps);

      await mover.moveToSent(join(INBOX, "article.md"));

      expect(deps.mkdir).toHaveBeenCalledWith(join(INBOX, "sent"));
      expect(deps.rename).toHaveBeenCalledWith(
        join(INBOX, "article.md"),
        join(INBOX, "sent", "article.md"),
      );
    });

    it("appends timestamp when destination exists", async () => {
      const deps = makeDeps({
        exists: vi.fn<(path: string) => Promise<boolean>>()
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(false),
      });
      const mover = createFileMover(INBOX, deps);

      await mover.moveToSent(join(INBOX, "article.md"));

      const renameCall = vi.mocked(deps.rename).mock.calls[0];
      expect(renameCall).toBeDefined();
      if (!renameCall) throw new Error("expected rename to be called");
      expect(renameCall[1]).toContain("article-");
      expect(renameCall[1]).toMatch(/\.md$/);
    });
  });

  describe("moveToError", () => {
    it("creates error dir, moves file, and writes error file", async () => {
      const deps = makeDeps();
      const mover = createFileMover(INBOX, deps);

      await mover.moveToError(join(INBOX, "article.md"), "delivery", "SMTP timeout");

      expect(deps.mkdir).toHaveBeenCalledWith(join(INBOX, "error"));
      expect(deps.rename).toHaveBeenCalledWith(
        join(INBOX, "article.md"),
        join(INBOX, "error", "article.md"),
      );
      expect(deps.writeFile).toHaveBeenCalledWith(
        join(INBOX, "error", "article.error.txt"),
        expect.stringContaining("Error: delivery"),
      );
      expect(deps.writeFile).toHaveBeenCalledWith(
        join(INBOX, "error", "article.error.txt"),
        expect.stringContaining("Message: SMTP timeout"),
      );
    });

    it("appends timestamp when destination exists", async () => {
      const deps = makeDeps({
        exists: vi.fn<(path: string) => Promise<boolean>>()
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(false),
      });
      const mover = createFileMover(INBOX, deps);

      await mover.moveToError(join(INBOX, "article.md"), "delivery", "fail");

      const renameCall = vi.mocked(deps.rename).mock.calls[0];
      expect(renameCall).toBeDefined();
      if (!renameCall) throw new Error("expected rename to be called");
      expect(renameCall[1]).toContain("article-");
      expect(renameCall[1]).toMatch(/\.md$/);
    });

    it("writes error file with timestamp, kind, and message", async () => {
      const deps = makeDeps();
      const mover = createFileMover(INBOX, deps);

      await mover.moveToError(join(INBOX, "test.md"), "conversion", "Parse failed");

      const writeCall = vi.mocked(deps.writeFile).mock.calls[0];
      expect(writeCall).toBeDefined();
      if (!writeCall) throw new Error("expected writeFile to be called");
      const content = writeCall[1];
      expect(content).toContain("Timestamp:");
      expect(content).toContain("Error: conversion");
      expect(content).toContain("Message: Parse failed");
    });
  });
});
