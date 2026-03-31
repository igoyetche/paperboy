/**
 * Shared dotenv loading logic used by cli-entry.ts and watch-entry.ts.
 *
 * CWD/.env is loaded first (dotenv default behaviour).
 * ~/.paperboy/.env is loaded as a fallback — values already set by the
 * first call are NOT overwritten (dotenv never overwrites existing vars).
 *
 * ADR #11: dotenv fallback warns on parse errors but not on ENOENT.
 */

import dotenv from "dotenv";
import { homedir } from "node:os";
import { join } from "node:path";

export function loadDotenv(
  warn: (message: string) => void = () => {},
): void {
  dotenv.config(); // CWD/.env — silently skips if absent

  const fallbackPath = join(homedir(), ".paperboy", ".env");
  const fallbackResult = dotenv.config({ path: fallbackPath });

  if (fallbackResult.error) {
    const code: unknown = "code" in fallbackResult.error
      ? fallbackResult.error["code"]
      : undefined;
    if (code !== "ENOENT") {
      warn(
        `Warning: could not parse ${fallbackPath}: ${fallbackResult.error.message}`,
      );
    }
  }
}
