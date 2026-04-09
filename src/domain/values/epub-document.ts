import type { ImageStats } from "./image-stats.js";

export class EpubDocument {
  constructor(
    readonly title: string,
    readonly buffer: Buffer,
    readonly imageStats?: ImageStats,
  ) {}

  get sizeBytes(): number {
    return this.buffer.length;
  }
}
