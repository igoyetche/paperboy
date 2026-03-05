import pino from "pino";
import type { Logger } from "pino";
import type { DeliveryLogger } from "../domain/ports.js";

export function createPinoLogger(level: string): Logger {
  // Write to stderr — stdout is reserved for JSON-RPC when using stdio transport
  return pino({ level }, pino.destination(2));
}

export function createDeliveryLogger(logger: Logger): DeliveryLogger {
  return {
    deliveryAttempt(title: string, format: string, deviceName: string): void {
      logger.info({ title, format, deviceName }, "Delivery attempt started");
    },
    deliverySuccess(
      title: string,
      format: string,
      sizeBytes: number,
      deviceName: string,
    ): void {
      logger.info({ title, format, sizeBytes, deviceName }, "Delivery succeeded");
    },
    deliveryFailure(
      title: string,
      errorKind: string,
      errorMessage: string,
      deviceName: string,
    ): void {
      logger.error(
        { title, errorKind, errorMessage, deviceName },
        "Delivery failed",
      );
    },
  };
}
