import { describe, it, expect, vi } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

import {
  readTextFile,
  runCommand,
  safeUnlink,
  sleep,
  tempPath
} from "../apps/src/common/utils.js";

describe("utils", () => {
  it("creates temp paths with prefix and extension", () => {
    const filePath = tempPath("aceceed-test", ".txt");
    expect(filePath).toContain(os.tmpdir());
    expect(filePath).toContain("aceceed-test-");
    expect(filePath.endsWith(".txt")).toBe(true);
  });

  it("reads text files and safely unlinks", async () => {
    const filePath = path.join(os.tmpdir(), `aceceed-utils-${Date.now()}.txt`);
    await fs.writeFile(filePath, "hello");

    const content = await readTextFile(filePath);
    expect(content).toBe("hello");

    await safeUnlink(filePath);
    await expect(fs.stat(filePath)).rejects.toThrow();

    await expect(safeUnlink(filePath)).resolves.toBeUndefined();
  });

  it("runs commands and captures stdout/stderr", async () => {
    const result = await runCommand(process.execPath, [
      "-e",
      "process.stdout.write('ok'); process.stderr.write('err');"
    ]);
    expect(result.stdout).toBe("ok");
    expect(result.stderr).toBe("err");
  });

  it("throws a friendly error when command is missing", async () => {
    await expect(runCommand("definitely-not-a-real-command", [])).rejects.toThrow(
      "Command not found"
    );
  });

  it("sleep resolves after timeout", async () => {
    vi.useFakeTimers();
    const promise = sleep(10);
    vi.advanceTimersByTime(10);
    await promise;
    vi.useRealTimers();
  });
});
