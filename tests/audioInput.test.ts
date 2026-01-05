import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { promises as fs } from "node:fs";
import type { AudioConfig } from "../../packages/shared/src/types.js";

const isLinux = process.platform === "linux";
const describeLinux = isLinux ? describe : describe.skip;

process.env.ACECEED_DISABLE_NODE_RECORD = "1";

vi.mock("node-record-lpcm16", () => {
  class SimpleEmitter {
    private listeners: Record<string, Array<(...args: any[]) => void>> = {};

    on(event: string, handler: (...args: any[]) => void) {
      this.listeners[event] = this.listeners[event] ?? [];
      this.listeners[event].push(handler);
      return this;
    }

    once(event: string, handler: (...args: any[]) => void) {
      const wrapper = (...args: any[]) => {
        this.off(event, wrapper);
        handler(...args);
      };
      return this.on(event, wrapper);
    }

    off(event: string, handler: (...args: any[]) => void) {
      const current = this.listeners[event] ?? [];
      this.listeners[event] = current.filter((item) => item !== handler);
      return this;
    }

    emit(event: string, ...args: any[]) {
      const handlers = this.listeners[event] ?? [];
      handlers.slice().forEach((handler) => handler(...args));
      return handlers.length > 0;
    }
  }

  return {
    default: () => {
      const emitter = new SimpleEmitter();
      return {
        stream: () => emitter,
        stop: () => {
          emitter.emit("data", Buffer.from([1, 2, 3, 4]));
          emitter.emit("close");
        }
      };
    }
  };
}, { virtual: true });

vi.mock("../apps/src/common/utils.js", () => {
  const runCommand = vi.fn(async () => ({ stdout: "", stderr: "" }));
  const tempPath = () => "/tmp/aceceed-input.wav";
  const sleep = vi.fn(async () => {});
  return { runCommand, tempPath, sleep };
});
vi.mock("../apps/src/audio/deviceDiscovery.js", () => {
  const discoverInputDevice = vi.fn(async () => "plughw:1,0");
  const discoverOutputDevice = vi.fn();
  return { discoverInputDevice, discoverOutputDevice };
});

let AudioInput: typeof import("../apps/src/audio/input.js").AudioInput;
let runCommand: typeof import("../apps/src/common/utils.js").runCommand;
let discoverInputDevice: typeof import("../apps/src/audio/deviceDiscovery.js").discoverInputDevice;

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

describeLinux("AudioInput", () => {
  const logger = {
    warn: vi.fn()
  };

  beforeAll(async () => {
    if (!isLinux) {
      return;
    }
    ({ AudioInput } = await import("../apps/src/audio/input.js"));
    ({ runCommand } = await import("../apps/src/common/utils.js"));
    ({ discoverInputDevice } = await import("../apps/src/audio/deviceDiscovery.js"));
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records using arecord backend", async () => {
    const input = new AudioInput(baseConfig, logger as unknown as Console);
    const outputPath = await input.record({ durationSec: 1 });

    expect(outputPath).toBe("/tmp/aceceed-input.wav");
    expect(runCommand).toHaveBeenCalledWith(
      "arecord",
      [
        "-D",
        "default",
        "-f",
        "S16_LE",
        "-r",
        "16000",
        "-c",
        "1",
        "-d",
        "1",
        "-t",
        "wav",
        "/tmp/aceceed-input.wav"
      ],
      { signal: undefined }
    );
  });

  it("returns a partial capture when aborted but file exists", async () => {
    vi.mocked(runCommand).mockRejectedValueOnce(new Error("fail"));
    const statSpy = vi.spyOn(fs, "stat").mockResolvedValue({ size: 100 } as any);

    const controller = new AbortController();
    controller.abort();

    const input = new AudioInput(baseConfig, logger as unknown as Console);
    const outputPath = await input.record({ durationSec: 1, signal: controller.signal });

    expect(outputPath).toBe("/tmp/aceceed-input.wav");
    expect(statSpy).toHaveBeenCalledWith("/tmp/aceceed-input.wav");
  });

  it("falls back to arecord when node-record-lpcm16 is disabled", async () => {
    const config = {
      ...baseConfig,
      input: {
        ...baseConfig.input,
        backend: "node-record-lpcm16"
      }
    } as AudioConfig;

    const input = new AudioInput(config, logger as unknown as Console);
    const outputPath = await input.record({ durationSec: 1 });

    expect(outputPath).toBe("/tmp/aceceed-input.wav");
    expect(runCommand).toHaveBeenCalled();
  });

  it("discovering input device works when none provided", async () => {
    const config = {
      ...baseConfig,
      input: {
        backend: "arecord",
        sampleRate: 16000,
        channels: 1,
        recordSeconds: 4,
        arecordPath: "arecord"
      }
    } as AudioConfig;

    const input = new AudioInput(config, logger as unknown as Console);
    await input.record({ durationSec: 1 });

    expect(discoverInputDevice).toHaveBeenCalled();
  });
});
