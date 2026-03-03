import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDeliveryLogger } from "../../src/infrastructure/logger.js";
import type { Logger } from "pino";

function mockPinoLogger(): Logger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  } as unknown as Logger;
}

describe("createDeliveryLogger", () => {
  it("logs delivery attempt at info level", () => {
    const pino = mockPinoLogger();
    const logger = createDeliveryLogger(pino);
    logger.deliveryAttempt("My Book", "epub");
    expect(pino.info).toHaveBeenCalledWith(
      { title: "My Book", format: "epub" },
      "Delivery attempt started",
    );
  });

  it("logs delivery success at info level with size", () => {
    const pino = mockPinoLogger();
    const logger = createDeliveryLogger(pino);
    logger.deliverySuccess("My Book", "epub", 48210);
    expect(pino.info).toHaveBeenCalledWith(
      { title: "My Book", format: "epub", sizeBytes: 48210 },
      "Delivery succeeded",
    );
  });

  it("logs delivery failure at error level", () => {
    const pino = mockPinoLogger();
    const logger = createDeliveryLogger(pino);
    logger.deliveryFailure("My Book", "delivery", "SMTP auth failed");
    expect(pino.error).toHaveBeenCalledWith(
      { title: "My Book", errorKind: "delivery", errorMessage: "SMTP auth failed" },
      "Delivery failed",
    );
  });
});
