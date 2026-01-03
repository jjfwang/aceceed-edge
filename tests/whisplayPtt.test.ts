import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";
import type { AppConfig } from "@aceceed/shared";
import type { EventBus as EventBusType } from "../apps/src/runtime/eventBus.js";
import type { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { createTestLogger } from "./helpers/logger.js";

const mockSpawn = vi.fn();
const mockSpawnSync = vi.fn();

vi.mock("node:child_process", async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    spawn: mockSpawn,
    spawnSync: mockSpawnSync
  };
});

const mockGpio = {
  watch: vi.fn(),
  unwatchAll: vi.fn(),
  unexport: vi.fn()
};
const mockGpioCtor = vi.fn(() => mockGpio);

vi.mock("onoff", () => ({
  Gpio: mockGpioCtor,
  default: { Gpio: mockGpioCtor }
}));

let startWhisplayPtt: typeof import("../apps/src/runtime/whisplayPtt.js").startWhisplayPtt;
let EventBus: typeof import("../apps/src/runtime/eventBus.js").EventBus;

const logger = createTestLogger();
const hostPlatform = process.platform;
const itOnoff = hostPlatform === "linux" ? it : it.skip;

const baseConfig: AppConfig = {
  rag: {
    enabled: true,
    indexPath: "/tmp/rag.json",
    gradeBand: "primary",
    subjects: ["math"],
    maxChunks: 2
  },
  llm: {
    mode: "local",
    local: { llamaServerUrl: "http://127.0.0.1:8080", ctx: 1024, temperature: 0.2 },
    cloud: { provider: "openai", apiKeyEnv: "OPENAI_API_KEY", model: "gpt-4o-mini" }
  },
  stt: { mode: "local", backend: "whispercpp", whispercpp: { binPath: "whisper", modelPath: "model" } },
  tts: { mode: "local", backend: "piper", piper: { binPath: "piper", voicePath: "voice", outputSampleRate: 22050 } },
  vision: { enabled: true, capture: { backend: "rpicam-still", stillArgs: [] } },
  audio: {
    input: { backend: "arecord", device: "default", sampleRate: 16000, channels: 1, recordSeconds: 1, arecordPath: "arecord" },
    output: { backend: "aplay", device: "default", aplayPath: "aplay" }
  },
  runtime: {
    pushToTalkMode: "whisplay",
    cameraIndicator: false,
    micIndicator: false,
    whisplay: { buttonPin: 11, mode: "hold", bounceMs: 50 }
  },
  api: { host: "127.0.0.1", port: 8000 },
  logging: { level: "info" }
};

class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  killed = false;
  kill = vi.fn(() => {
    this.killed = true;
  });
}

describe("Whisplay PTT", () => {
  let bus: EventBusType;
  let config: AppConfig;
  let mockChildProcess: MockChildProcess;
  let stop: (() => void) | null = null;

  beforeAll(async () => {
    ({ startWhisplayPtt } = await import("../apps/src/runtime/whisplayPtt.js"));
    ({ EventBus } = await import("../apps/src/runtime/eventBus.js"));
  });

  beforeEach(() => {
    bus = new EventBus();
    config = structuredClone(baseConfig);
    mockChildProcess = new MockChildProcess();
    mockSpawn.mockReturnValue(mockChildProcess as unknown as ChildProcess);
    Object.defineProperty(process, "platform", {
      value: "linux"
    });
    mockGpioCtor.mockClear();
    mockGpio.watch.mockClear();
    mockGpio.unwatchAll.mockClear();
    mockGpio.unexport.mockClear();
    stop = null;
  });

  afterEach(() => {
    if (stop) {
      stop();
      stop = null;
    }
    vi.clearAllMocks();
  });

  it("should do nothing if not on linux", async () => {
    Object.defineProperty(process, "platform", {
      value: "darwin"
    });
    stop = await startWhisplayPtt(bus, config, logger);
    stop();
    stop = null;
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it("should try gpiomon first", async () => {
    mockSpawnSync.mockReturnValue({ error: undefined } as any);
    stop = await startWhisplayPtt(bus, config, logger);
    expect(mockSpawn).toHaveBeenCalledWith("gpiomon", expect.any(Array), expect.any(Object));
  });
  it("should publish ptt:start and ptt:stop on gpiomon events in hold mode", async () => {
    mockSpawnSync.mockReturnValue({ error: undefined } as any);
    config.runtime.whisplay!.bounceMs = 0;
    const publishSpy = vi.spyOn(bus, "publish");
    stop = await startWhisplayPtt(bus, config, logger);

    mockChildProcess.stdout.emit("data", "rising\n");
    expect(publishSpy).toHaveBeenCalledWith({ type: "ptt:start", source: "whisplay" });

    mockChildProcess.stdout.emit("data", "falling\n");
    expect(publishSpy).toHaveBeenCalledWith({ type: "ptt:stop", source: "whisplay" });
  });

  it("should publish ptt:start and ptt:stop on gpiomon events in toggle mode", async () => {
    mockSpawnSync.mockReturnValue({ error: undefined } as any);
    config.runtime.whisplay!.mode = "toggle";
    config.runtime.whisplay!.bounceMs = 0;
    const publishSpy = vi.spyOn(bus, "publish");
    stop = await startWhisplayPtt(bus, config, logger);

    mockChildProcess.stdout.emit("data", "rising\n");
    expect(publishSpy).toHaveBeenCalledWith({ type: "ptt:start", source: "whisplay" });

    mockChildProcess.stdout.emit("data", "rising\n");
    expect(publishSpy).toHaveBeenCalledWith({ type: "ptt:stop", source: "whisplay" });
  });

  it("should kill gpiomon process on stop", async () => {
    mockSpawnSync.mockReturnValue({ error: undefined } as any);
    stop = await startWhisplayPtt(bus, config, logger);
    stop();
    stop = null;
    expect(mockChildProcess.kill).toHaveBeenCalledWith("SIGTERM");
  });

  itOnoff("should fallback to onoff if gpiomon is not available", async () => {
    mockSpawnSync.mockReturnValue({
      error: Object.assign(new Error("ENOENT"), { code: "ENOENT" })
    } as any);
    const Gpio = await vi.importMock<typeof import("onoff")>("onoff");
    stop = await startWhisplayPtt(bus, config, logger);
    expect(Gpio.Gpio).toHaveBeenCalled();
  });

  itOnoff("should publish ptt:start and ptt:stop on onoff events in hold mode", async () => {
    mockSpawnSync.mockReturnValue({
      error: Object.assign(new Error("ENOENT"), { code: "ENOENT" })
    } as any);
    config.runtime.whisplay!.bounceMs = 0;
    const publishSpy = vi.spyOn(bus, "publish");
    stop = await startWhisplayPtt(bus, config, logger);

    const watchCallback = vi.mocked(mockGpio.watch).mock.calls[0][0];
    watchCallback(null, 1);
    expect(publishSpy).toHaveBeenCalledWith({ type: "ptt:start", source: "whisplay" });

    watchCallback(null, 0);
    expect(publishSpy).toHaveBeenCalledWith({ type: "ptt:stop", source: "whisplay" });
  });

  itOnoff("should clean up onoff resources on stop", async () => {
    mockSpawnSync.mockReturnValue({
      error: Object.assign(new Error("ENOENT"), { code: "ENOENT" })
    } as any);
    stop = await startWhisplayPtt(bus, config, logger);
    stop();
    stop = null;
    expect(mockGpio.unwatchAll).toHaveBeenCalled();
    expect(mockGpio.unexport).toHaveBeenCalled();
  });

  it("should log error on gpiomon error", async () => {
    mockSpawnSync.mockReturnValue({ error: undefined } as any);
    const loggerSpy = vi.spyOn(logger, "warn");
    stop = await startWhisplayPtt(bus, config, logger);
    mockChildProcess.emit("error", new Error("test error"));
    expect(loggerSpy).toHaveBeenCalledWith(
      { err: new Error("test error") },
      "Whisplay PTT gpiomon failed to start."
    );
  });
});
