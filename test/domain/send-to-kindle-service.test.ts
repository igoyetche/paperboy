import { describe, it, expect, vi } from "vitest";
import { SendToKindleService } from "../../src/domain/send-to-kindle-service.js";
import { Title } from "../../src/domain/values/title.js";
import { Author } from "../../src/domain/values/author.js";
import { MarkdownContent } from "../../src/domain/values/markdown-content.js";
import { EpubDocument } from "../../src/domain/values/epub-document.js";
import {
  ConversionError,
  DeliveryError,
  ok,
  err,
} from "../../src/domain/errors.js";
import type {
  ContentConverter,
  DocumentMailer,
  DeliveryLogger,
} from "../../src/domain/ports.js";

function makeTitle(value: string) {
  const result = Title.create(value);
  if (!result.ok) throw new Error("bad test setup");
  return result.value;
}

function makeAuthor(value: string) {
  const result = Author.create(value);
  if (!result.ok) throw new Error("bad test setup");
  return result.value;
}

function makeContent(value: string) {
  const result = MarkdownContent.create(value);
  if (!result.ok) throw new Error("bad test setup");
  return result.value;
}

function fakeLogger(): DeliveryLogger {
  return {
    deliveryAttempt: vi.fn(),
    deliverySuccess: vi.fn(),
    deliveryFailure: vi.fn(),
  };
}

describe("SendToKindleService", () => {
  it("converts then delivers on happy path", async () => {
    const epub = new EpubDocument("Test", Buffer.from("epub-data"));
    const converter: ContentConverter = {
      toEpub: vi.fn().mockResolvedValue(ok(epub)),
    };
    const mailer: DocumentMailer = {
      send: vi.fn().mockResolvedValue(ok(undefined)),
    };
    const logger = fakeLogger();
    const service = new SendToKindleService(converter, mailer, logger);

    const title = makeTitle("Test");
    const content = makeContent("# Hello");
    const author = makeAuthor("Claude");

    const result = await service.execute(title, content, author);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe("Test");
      expect(result.value.sizeBytes).toBe(epub.sizeBytes);
    }
    expect(converter.toEpub).toHaveBeenCalledWith(title, content, author);
    expect(mailer.send).toHaveBeenCalledWith(epub);
  });

  it("returns conversion error without calling mailer", async () => {
    const conversionError = new ConversionError("EPUB gen failed");
    const converter: ContentConverter = {
      toEpub: vi.fn().mockResolvedValue(err(conversionError)),
    };
    const mailer: DocumentMailer = {
      send: vi.fn(),
    };
    const logger = fakeLogger();
    const service = new SendToKindleService(converter, mailer, logger);

    const result = await service.execute(
      makeTitle("Test"),
      makeContent("# Hello"),
      makeAuthor("Claude"),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("conversion");
    }
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it("returns delivery error when mailer fails", async () => {
    const epub = new EpubDocument("Test", Buffer.from("epub-data"));
    const converter: ContentConverter = {
      toEpub: vi.fn().mockResolvedValue(ok(epub)),
    };
    const deliveryError = new DeliveryError("auth", "SMTP auth failed");
    const mailer: DocumentMailer = {
      send: vi.fn().mockResolvedValue(err(deliveryError)),
    };
    const logger = fakeLogger();
    const service = new SendToKindleService(converter, mailer, logger);

    const result = await service.execute(
      makeTitle("Test"),
      makeContent("# Hello"),
      makeAuthor("Claude"),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("delivery");
    }
  });

  it("logs attempt, success on happy path", async () => {
    const epub = new EpubDocument("Test", Buffer.from("epub-data"));
    const converter: ContentConverter = {
      toEpub: vi.fn().mockResolvedValue(ok(epub)),
    };
    const mailer: DocumentMailer = {
      send: vi.fn().mockResolvedValue(ok(undefined)),
    };
    const logger = fakeLogger();
    const service = new SendToKindleService(converter, mailer, logger);

    await service.execute(
      makeTitle("Test"),
      makeContent("# Hello"),
      makeAuthor("Claude"),
    );

    expect(logger.deliveryAttempt).toHaveBeenCalledWith("Test", "epub");
    expect(logger.deliverySuccess).toHaveBeenCalledWith(
      "Test",
      "epub",
      epub.sizeBytes,
    );
  });

  it("logs attempt, failure on error", async () => {
    const conversionError = new ConversionError("EPUB gen failed");
    const converter: ContentConverter = {
      toEpub: vi.fn().mockResolvedValue(err(conversionError)),
    };
    const mailer: DocumentMailer = { send: vi.fn() };
    const logger = fakeLogger();
    const service = new SendToKindleService(converter, mailer, logger);

    await service.execute(
      makeTitle("Test"),
      makeContent("# Hello"),
      makeAuthor("Claude"),
    );

    expect(logger.deliveryAttempt).toHaveBeenCalled();
    expect(logger.deliveryFailure).toHaveBeenCalledWith(
      "Test",
      "conversion",
      "EPUB gen failed",
    );
  });
});
