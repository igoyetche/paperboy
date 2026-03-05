import { describe, it, expect, vi } from "vitest";
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
  it("logs delivery attempt at info level with device name", () => {
    const pino = mockPinoLogger();
    const logger = createDeliveryLogger(pino);
    logger.deliveryAttempt("My Book", "epub", "personal");
    expect(pino.info).toHaveBeenCalledWith(
      { title: "My Book", format: "epub", deviceName: "personal" },
      "Delivery attempt started",
    );
  });

  it("logs delivery success at info level with size and device name", () => {
    const pino = mockPinoLogger();
    const logger = createDeliveryLogger(pino);
    logger.deliverySuccess("My Book", "epub", 48210, "personal");
    expect(pino.info).toHaveBeenCalledWith(
      { title: "My Book", format: "epub", sizeBytes: 48210, deviceName: "personal" },
      "Delivery succeeded",
    );
  });

  it("logs delivery failure at error level with device name", () => {
    const pino = mockPinoLogger();
    const logger = createDeliveryLogger(pino);
    logger.deliveryFailure("My Book", "delivery", "SMTP auth failed", "personal");
    expect(pino.error).toHaveBeenCalledWith(
      { title: "My Book", errorKind: "delivery", errorMessage: "SMTP auth failed", deviceName: "personal" },
      "Delivery failed",
    );
  });
});
