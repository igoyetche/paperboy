import pino from "pino";
import type { Logger } from "pino";
import type { DeliveryLogger } from "../domain/ports.js";
import type { ImageProcessorLogger } from "./converter/image-processor.js";
import type { ImageStats } from "../domain/values/image-stats.js";

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

export function createImageProcessorLogger(logger: Logger): ImageProcessorLogger {
  return {
    imageDownloadStart(url: string): void {
      logger.debug({ url }, "Image download starting");
    },
    imageDownloadSuccess(
      url: string,
      format: string,
      sizeBytes: number,
      durationMs: number,
    ): void {
      logger.debug(
        { url, format, sizeBytes, durationMs },
        "Image download succeeded",
      );
    },
    imageDownloadFailure(url: string, reason: string): void {
      logger.warn({ url, reason }, "Image download failed");
    },
    imageFormatConverted(url: string, from: string, to: string): void {
      logger.debug({ url, from, to }, "Image format converted");
    },
    imageSkipped(url: string, reason: string): void {
      logger.warn({ url, reason }, "Image skipped");
    },
    imageSummary(stats: ImageStats): void {
      logger.info(
        stats,
        "Image processing complete",
      );
    },
  };
}
