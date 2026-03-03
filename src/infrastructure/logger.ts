import pino from "pino";
import type { Logger } from "pino";
import type { DeliveryLogger } from "../domain/ports.js";

export function createPinoLogger(level: string): Logger {
  return pino({ level });
}

export function createDeliveryLogger(logger: Logger): DeliveryLogger {
  return {
    deliveryAttempt(title: string, format: string): void {
      logger.info({ title, format }, "Delivery attempt started");
    },
    deliverySuccess(title: string, format: string, sizeBytes: number): void {
      logger.info({ title, format, sizeBytes }, "Delivery succeeded");
    },
    deliveryFailure(
      title: string,
      errorKind: string,
      errorMessage: string,
    ): void {
      logger.error(
        { title, errorKind, errorMessage },
        "Delivery failed",
      );
    },
  };
}
