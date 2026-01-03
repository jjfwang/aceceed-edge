import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { startWhisplayPtt } from "../../apps/edge-runtime/src/runtime/whisplayPtt";
import { EventBus } from "../../apps/edge-runtime/src/runtime/eventBus";
import { Config, AppConfig } from "@aceceed/shared";
import pino from "pino";
import { ChildProcess, spawn, spawnSync } from "node:child_process";
import { EventEmitter } from "node:events";

vi.mock("node:child_process", async (importOriginal) => {
    const original = await importOriginal();
    return {
        ...original,
        spawn: vi.fn(),
        spawnSync: vi.fn(),
    };
});

const mockGpio = {
    watch: vi.fn(),
    unwatchAll: vi.fn(),
    unexport: vi.fn(),
};

vi.mock("onoff", () => ({
    Gpio: vi.fn(() => mockGpio),
}));


const logger = pino({ level: "silent" });

const baseConfig: Config = {
  version: 1,
  runtime: {
    app: "default",
    logLevel: "silent",
    detectorTimeoutMs: 1000,
    pushToTalkMode: "whisplay",
    agents: {
      default: "tutor",
    },
    whisplay: {
      buttonPin: 11,
      mode: "hold",
      bounceMs: 50,
    },
  },
  api: {
    port: 8000,
  },
  llm: {
    default: "local",
    local: {
      backend: "llama.cpp",
      llamaServerUrl: "http://localhost:8080",
      temperature: 0.7,
    },
  },
  stt: {
    default: "whisper.cpp",
    whispercpp: {
      modelPath: "/dev/null",
      language: "en",
    },
  },
  tts: {
    default: "piper",
    piper: {
      voicePath: "/dev/null",
    },
  },
  vision: {
    default: "simple",
    capture: {
      device: "v4l2",
    },
  },
  audio: {
    input: {
      device: "default",
    },
    output: {
      device: "default",
    },
  },
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
  let bus: EventBus;
  let config: AppConfig;
  let mockChildProcess: MockChildProcess;

  beforeEach(() => {
    bus = new EventBus(logger);
    config = { ...baseConfig, from: "file" };
    mockChildProcess = new MockChildProcess();
    vi.mocked(spawn).mockReturnValue(mockChildProcess as unknown as ChildProcess);
    Object.defineProperty(process, "platform", {
        value: "linux",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should do nothing if not on linux", async () => {
    Object.defineProperty(process, "platform", {
        value: "darwin",
    });
    const stop = await startWhisplayPtt(bus, config, logger);
    stop();
    expect(spawn).not.toHaveBeenCalled();
  });

  it("should try gpiomon first", async () => {
    vi.mocked(spawnSync).mockReturnValue({ error: undefined } as any);
    await startWhisplayPtt(bus, config, logger);
    expect(spawn).toHaveBeenCalledWith("gpiomon", expect.any(Array), expect.any(Object));
  });
  
it("should publish ptt:start and ptt:stop on gpiomon events in hold mode", async () => {
    vi.mocked(spawnSync).mockReturnValue({ error: undefined } as any);
    const publishSpy = vi.spyOn(bus, "publish");
    await startWhisplayPtt(bus, config, logger);

    mockChildProcess.stdout.emit("data", "rising\n");
    expect(publishSpy).toHaveBeenCalledWith({ type: "ptt:start", source: "whisplay" });

    mockChildProcess.stdout.emit("data", "falling\n");
    expect(publishSpy).toHaveBeenCalledWith({ type: "ptt:stop", source: "whisplay" });
  });

  it("should publish ptt:start and ptt:stop on gpiomon events in toggle mode", async () => {
    vi.mocked(spawnSync).mockReturnValue({ error: undefined } as any);
    config.runtime.whisplay!.mode = "toggle";
    const publishSpy = vi.spyOn(bus, "publish");
    await startWhisplayPtt(bus, config, logger);

    mockChildProcess.stdout.emit("data", "rising\n");
    expect(publishSpy).toHaveBeenCalledWith({ type: "ptt:start", source: "whisplay" });

    mockChildProcess.stdout.emit("data", "rising\n");
    expect(publishSpy).toHaveBeenCalledWith({ type: "ptt:stop", source: "whisplay" });
  });

  it("should kill gpiomon process on stop", async () => {
    vi.mocked(spawnSync).mockReturnValue({ error: undefined } as any);
    const stop = await startWhisplayPtt(bus, config, logger);
    stop();
    expect(mockChildProcess.kill).toHaveBeenCalledWith("SIGTERM");
  });

  it("should fallback to onoff if gpiomon is not available", async () => {
    vi.mocked(spawnSync).mockReturnValue({ error: new Error("ENOENT") } as any);
    const Gpio = await import("onoff");
    await startWhisplayPtt(bus, config, logger);
    expect(Gpio.Gpio).toHaveBeenCalled();
  });

  it("should publish ptt:start and ptt:stop on onoff events in hold mode", async () => {
    vi.mocked(spawnSync).mockReturnValue({ error: new Error("ENOENT") } as any);
    const publishSpy = vi.spyOn(bus, "publish");
    await startWhisplayPtt(bus, config, logger);

    const watchCallback = vi.mocked(mockGpio.watch).mock.calls[0][0];
    watchCallback(null, 1);
    expect(publishSpy).toHaveBeenCalledWith({ type: "ptt:start", source: "whisplay" });

    watchCallback(null, 0);
    expect(publishSpy).toHaveBeenCalledWith({ type: "ptt:stop", source: "whisplay" });
  });

    it("should clean up onoff resources on stop", async () => {
        vi.mocked(spawnSync).mockReturnValue({ error: new Error("ENOENT") } as any);
        const stop = await startWhisplayPtt(bus, config, logger);
        stop();
        expect(mockGpio.unwatchAll).toHaveBeenCalled();
        expect(mockGpio.unexport).toHaveBeenCalled();
    });

    it("should log error on gpiomon error", async () => {
        vi.mocked(spawnSync).mockReturnValue({ error: undefined } as any);
        const loggerSpy = vi.spyOn(logger, "warn");
        await startWhisplayPtt(bus, config, logger);
        mockChildProcess.emit("error", new Error("test error"));
        expect(loggerSpy).toHaveBeenCalledWith({ err: new Error("test error") }, "Whisplay PTT gpiomon failed to start.");
    });
});
