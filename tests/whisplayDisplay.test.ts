import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { startWhisplayDisplay } from "../apps/src/runtime/whisplayDisplay.js";
import { EventBus } from "../apps/src/runtime/eventBus.js";
import type { AppConfig } from "@aceceed/shared";
import { ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import * as net from "node:net";
import { EventEmitter } from "node:events";
import { createTestLogger } from "./helpers/logger.js";

vi.mock("node:child_process", async (importOriginal) => {
    const original = await importOriginal();
    return {
        ...original,
        spawn: vi.fn(),
    };
});

vi.mock("node:fs", async (importOriginal) => {
    const original = await importOriginal();
    return {
        ...original,
        existsSync: vi.fn(),
    };
});

vi.mock("node:net", () => {
  const Socket = vi.fn();
  return {
    Socket,
    default: { Socket }
  };
});


const logger = createTestLogger();

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

class MockSocket extends EventEmitter {
    write = vi.fn();
    connect = vi.fn((port, host, cb) => {
        if(cb) cb();
        this.emit("connect");
    });
    destroy = vi.fn();
    destroyed = false;
}

class MockChildProcess extends EventEmitter {
    stdout = new EventEmitter();
    stderr = new EventEmitter();
    killed = false;
    kill = vi.fn(() => {
        this.killed = true;
    });
}

describe("Whisplay Display", () => {
  let bus: EventBus;
  let config: AppConfig;
  let mockChildProcess: MockChildProcess;
  let mockSocket: MockSocket;
  let stop: (() => void) | null = null;

  beforeEach(() => {
    bus = new EventBus();
    config = structuredClone(baseConfig);
    mockChildProcess = new MockChildProcess();
    mockSocket = new MockSocket();
    vi.mocked(spawn).mockReturnValue(mockChildProcess as unknown as ChildProcess);
    vi.mocked(net.Socket).mockReturnValue(mockSocket as unknown as net.Socket);
    Object.defineProperty(process, "platform", {
        value: "linux",
    });
    vi.mocked(existsSync).mockReturnValue(true);
    stop = null;
  });

  afterEach(() => {
    if (stop) {
      stop();
      stop = null;
    }
    vi.restoreAllMocks();
  });

  it("should do nothing if not on linux", () => {
    Object.defineProperty(process, "platform", {
        value: "darwin",
    });
    stop = startWhisplayDisplay(bus, config, logger);
    stop();
    stop = null;
    expect(spawn).not.toHaveBeenCalled();
  });

  it("should do nothing if pushToTalkMode is not whisplay", () => {
    config.runtime.pushToTalkMode = "keyboard";
    stop = startWhisplayDisplay(bus, config, logger);
    stop();
    stop = null;
    expect(spawn).not.toHaveBeenCalled();
  });

  it("should do nothing if script not found", () => {
    vi.mocked(existsSync).mockReturnValue(false);
    stop = startWhisplayDisplay(bus, config, logger);
    stop();
    stop = null;
    expect(spawn).not.toHaveBeenCalled();
  });

  it("should spawn display script and connect socket", () => {
    stop = startWhisplayDisplay(bus, config, logger);
    bus.publish({ type: "ptt:start", source: "whisplay" });
    expect(spawn).toHaveBeenCalledWith("python3", [expect.any(String)], expect.any(Object));
    expect(mockSocket.connect).toHaveBeenCalledWith(12345, "127.0.0.1");
  });

  it("should send events to socket", () => {
    stop = startWhisplayDisplay(bus, config, logger);
    bus.publish({ type: "ptt:start", source: "whisplay" });
    expect(mockSocket.write).toHaveBeenCalledWith('{"status":"listening","text":""}\n');
  });

    it("should queue events if socket is not connected", () => {
        mockSocket.connect = vi.fn(); // prevent immediate connection
        stop = startWhisplayDisplay(bus, config, logger);
        bus.publish({ type: "ptt:start", source: "whisplay" });
        expect(mockSocket.write).not.toHaveBeenCalled();
        
        mockSocket.emit("connect");

        expect(mockSocket.write).toHaveBeenCalledWith('{"status":"listening","text":""}\n');
    });

    it("should clean up resources on stop", () => {
        stop = startWhisplayDisplay(bus, config, logger);
        bus.publish({ type: "ptt:start", source: "whisplay" }); // to spawn process and connect socket
        stop();
        stop = null;
        expect(mockChildProcess.kill).toHaveBeenCalledWith("SIGTERM");
        expect(mockSocket.destroy).toHaveBeenCalled();
    });
});
