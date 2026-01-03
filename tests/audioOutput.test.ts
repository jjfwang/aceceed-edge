import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AudioConfig } from "../../packages/shared/src/types.js";

vi.mock("../apps/src/common/utils.js", () => {
  const runCommand = vi.fn(async () => ({ stdout: "", stderr: "" }));
  return { runCommand };
});

const { AudioOutput } = await import("../apps/src/audio/output.js");
const { runCommand } = await import("../apps/src/common/utils.js");

const baseConfig: AudioConfig = {
  input: {
    backend: "arecord",
    device: "default",
    sampleRate: 16000,
    channels: 1,
    recordSeconds: 4,
    arecordPath: "arecord"
  },
  output: {
    backend: "aplay",
    device: "default",
    aplayPath: "aplay"
  }
};

describe("AudioOutput", () => {
  const logger = {
    warn: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips playback when backend is unsupported", async () => {
    const config = {
      ...baseConfig,
      output: {
        ...baseConfig.output,
        backend: "noop"
      }
    } as AudioConfig;

    const output = new AudioOutput(config, logger as unknown as Console);
    await output.playWav("/tmp/test.wav");

    expect(logger.warn).toHaveBeenCalled();
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("runs aplay when backend is configured", async () => {
    const output = new AudioOutput(baseConfig, logger as unknown as Console);
    await output.playWav("/tmp/test.wav");

    expect(runCommand).toHaveBeenCalledWith("aplay", [
      "-D",
      "default",
      "/tmp/test.wav"
    ]);
  });

  it("throws a friendly error on playback failure", async () => {
    vi.mocked(runCommand).mockRejectedValueOnce(new Error("boom"));
    const output = new AudioOutput(baseConfig, logger as unknown as Console);

    await expect(output.playWav("/tmp/test.wav")).rejects.toThrow(
      "Audio playback failed. Check output device 'default'."
    );
  });
});
