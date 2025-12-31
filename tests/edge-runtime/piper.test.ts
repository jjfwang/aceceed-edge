import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PiperTts } from "../../apps/edge-runtime/src/audio/tts/piper.js";
import type { TtsConfig } from "../../packages/shared/src/types.js";
import { promises as fs } from "node:fs";
import { runCommand } from "../../apps/edge-runtime/src/common/utils.js";

vi.mock("../../apps/edge-runtime/src/common/utils.js", () => {
  const runCommand = vi.fn(async () => ({ stdout: "", stderr: "" }));
  const tempPath = () => "/tmp/piper-test.wav";
  return { runCommand, tempPath };
});

const config: TtsConfig = {
  backend: "piper",
  piper: {
    binPath: "/usr/bin/piper",
    voicePath: "/models/voice.onnx",
    outputSampleRate: 22050
  }
};

function makeWav(sampleRate: number) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.write("WAVE", 8);
  header.writeUInt32LE(sampleRate, 24);
  return header;
}

describe("PiperTts", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes the configured sample rate and returns output path", async () => {
    const readSpy = vi.spyOn(fs, "readFile").mockResolvedValue(makeWav(22050) as unknown as Buffer);
    const tts = new PiperTts(config, console as unknown as Console);

    const output = await tts.synthesize("hello");

    expect(output).toBe("/tmp/piper-test.wav");
    expect(runCommand).toHaveBeenCalledWith(
      "/usr/bin/piper",
      [
        "--model",
        "/models/voice.onnx",
        "--output_file",
        "/tmp/piper-test.wav",
        "--output_sample_rate",
        "22050"
      ],
      { input: "hello" }
    );
    expect(readSpy).toHaveBeenCalledWith("/tmp/piper-test.wav");
  });

  it("throws when the WAV sample rate does not match configuration", async () => {
    vi.spyOn(fs, "readFile").mockResolvedValue(makeWav(16000) as unknown as Buffer);
    const tts = new PiperTts(config, console as unknown as Console);

    await expect(tts.synthesize("hello")).rejects.toThrow(
      "Piper output sample rate 16000Hz does not match configured 22050Hz."
    );
  });
});
