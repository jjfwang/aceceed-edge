import { describe, it, expect, vi, beforeEach } from "vitest";
import { promises as fs } from "node:fs";
import type { SttConfig } from "../../packages/shared/src/types.js";

vi.mock("../apps/src/common/utils.js", () => {
  const runCommand = vi.fn(async () => ({ stdout: "", stderr: "" }));
  const tempPath = () => "/tmp/whisper-output";
  const safeUnlink = vi.fn(async () => {});
  return { runCommand, tempPath, safeUnlink };
});

const { WhisperCppStt } = await import("../apps/src/audio/stt/whisperCpp.js");
const { runCommand } = await import("../apps/src/common/utils.js");

const baseConfig: SttConfig = {
  mode: "local",
  backend: "whispercpp",
  whispercpp: {
    binPath: "/usr/local/bin/whisper",
    modelPath: "/models/whisper.bin",
    language: "en"
  }
};

describe("WhisperCppStt", () => {
  const logger = {
    warn: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs whisper.cpp and cleans transcript", async () => {
    vi.spyOn(fs, "readFile").mockResolvedValue("  hello   world \n" as any);
    const stt = new WhisperCppStt(baseConfig, logger as unknown as Console);

    const text = await stt.transcribe("/tmp/audio.wav");

    expect(text).toBe("hello world");
    expect(runCommand).toHaveBeenCalledWith(
      "/usr/local/bin/whisper",
      [
        "-m",
        "/models/whisper.bin",
        "-f",
        "/tmp/audio.wav",
        "-otxt",
        "-of",
        "/tmp/whisper-output",
        "-l",
        "en"
      ]
    );
  });

  it("throws when whisper.cpp fails", async () => {
    vi.mocked(runCommand).mockRejectedValueOnce(new Error("boom"));
    const stt = new WhisperCppStt(baseConfig, logger as unknown as Console);

    await expect(stt.transcribe("/tmp/audio.wav")).rejects.toThrow(
      "whisper.cpp failed. Check binPath '/usr/local/bin/whisper' and modelPath '/models/whisper.bin'."
    );
  });
});
