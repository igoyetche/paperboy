import { describe, it, expect, beforeAll } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";

const execFileAsync = promisify(execFile);

const CLI_PATH = resolve("dist/cli-entry.js");
const NODE_PATH = process.execPath;

/**
 * Runs the CLI binary as a child process with a clean environment
 * (no inherited env vars that could satisfy config loading).
 */
async function runCli(
  args: string[],
): Promise<{ exitCode: number; stderr: string }> {
  try {
    const result = await execFileAsync(NODE_PATH, [CLI_PATH, ...args], {
      // Provide a minimal environment with no SMTP/Kindle config.
      // USERPROFILE and HOME are set to a nonexistent path so that
      // ~/.paperboy/.env fallback is not found, ensuring config fails.
      env: {
        PATH: process.env["PATH"] ?? "",
        USERPROFILE: "C:\\nonexistent\\isolated-test-home",
        HOME: "/nonexistent/isolated-test-home",
      },
      timeout: 10_000,
    });
    return { exitCode: 0, stderr: result.stderr };
  } catch (error: unknown) {
    if (error === null || typeof error !== "object") {
      return { exitCode: 1, stderr: "" };
    }
    const obj = error;
    const exitCode = "code" in obj && typeof obj["code"] === "number"
      ? obj["code"]
      : 1;
    const stderr = "stderr" in obj && typeof obj["stderr"] === "string"
      ? obj["stderr"]
      : "";
    return { exitCode, stderr };
  }
}

/**
 * Runs the CLI binary with custom environment variables merged into
 * the isolated environment.
 */
async function runCliWithEnv(
  args: string[],
  env: Record<string, string>,
): Promise<{ exitCode: number; stderr: string }> {
  try {
    const result = await execFileAsync(NODE_PATH, [CLI_PATH, ...args], {
      // Merge custom env with isolated base environment.
      env: {
        PATH: process.env["PATH"] ?? "",
        USERPROFILE: "C:\\nonexistent\\isolated-test-home",
        HOME: "/nonexistent/isolated-test-home",
        ...env,
      },
      timeout: 10_000,
    });
    return { exitCode: 0, stderr: result.stderr };
  } catch (error: unknown) {
    if (error === null || typeof error !== "object") {
      return { exitCode: 1, stderr: "" };
    }
    const obj = error;
    const exitCode = "code" in obj && typeof obj["code"] === "number"
      ? obj["code"]
      : 1;
    const stderr = "stderr" in obj && typeof obj["stderr"] === "string"
      ? obj["stderr"]
      : "";
    return { exitCode, stderr };
  }
}

describe("CLI binary integration", () => {
  beforeAll(async () => {
    // Verify the build exists — tests require `npm run build` first
    const { existsSync } = await import("node:fs");
    if (!existsSync(CLI_PATH)) {
      throw new Error(
        `Built CLI not found at ${CLI_PATH}. Run 'npm run build' before integration tests.`,
      );
    }
  });

  it("exits 0 and prints usage text when --help is passed", async () => {
    const { exitCode, stderr } = await runCli(["--help"]);

    expect(exitCode).toBe(0);
    expect(stderr).toContain("paperboy");
    expect(stderr).toContain("--title");
    expect(stderr).toContain("--file");
  });

  it("exits 0 and prints version when --version is passed", async () => {
    const { exitCode, stderr } = await runCli(["--version"]);

    expect(exitCode).toBe(0);
    expect(stderr).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("delegates watch --help and exits 0", async () => {
    const { exitCode, stderr } = await runCli(["watch", "--help"]);

    expect(exitCode).toBe(0);
    expect(stderr).toContain("paperboy watch");
    expect(stderr).toContain("WATCH_FOLDER");
  });

  it(
    "exits 4 when watch is run with invalid configuration",
    async () => {
      const env = { ...process.env, KINDLE_DEVICES: "invalid-format" };
      const { exitCode, stderr } = await runCliWithEnv(["watch"], env);

      expect(exitCode).toBe(4);
      expect(stderr).toContain("Configuration error");
    },
    { timeout: 15_000 },
  );

  it("exits 4 with config error when KINDLE_DEVICES is invalid", async () => {
    // Set an invalid KINDLE_DEVICES format (missing colon) to trigger config error
    const env = { ...process.env, KINDLE_DEVICES: "invalid-no-colon" };
    const { exitCode, stderr } = await runCliWithEnv(
      ["--title", "Test", "--file", "nonexistent.md"],
      env,
    );

    expect(exitCode).toBe(4);
    expect(stderr).toContain("Configuration error");
  });
});
