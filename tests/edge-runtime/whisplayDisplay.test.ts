import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { startWhisplayDisplay } from "../../apps/edge-runtime/src/runtime/whisplayDisplay";
import { EventBus } from "../../apps/edge-runtime/src/runtime/eventBus";
import { Config, AppConfig } from "@aceceed/shared";
import pino from "pino";
import { ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import { EventEmitter } from "node:events";

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

vi.mock("node:net", async (importOriginal) => {
    const original = await importOriginal();
    const Socket = vi.fn(() => new original.Socket());
    return {
        ...original,
        Socket,
    };
});


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

  beforeEach(() => {
    bus = new EventBus(logger);
    config = { ...baseConfig, from: "file" };
    mockChildProcess = new MockChildProcess();
    mockSocket = new MockSocket();
    vi.mocked(spawn).mockReturnValue(mockChildProcess as unknown as ChildProcess);
    vi.mocked(net.Socket).mockReturnValue(mockSocket as unknown as net.Socket);
    Object.defineProperty(process, "platform", {
        value: "linux",
    });
    vi.mocked(existsSync).mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should do nothing if not on linux", () => {
    Object.defineProperty(process, "platform", {
        value: "darwin",
    });
    const stop = startWhisplayDisplay(bus, config, logger);
    stop();
    expect(spawn).not.toHaveBeenCalled();
  });

  it("should do nothing if pushToTalkMode is not whisplay", () => {
    config.runtime.pushToTalkMode = "hold";
    const stop = startWhisplayDisplay(bus, config, logger);
    stop();
    expect(spawn).not.toHaveBeenCalled();
  });

  it("should do nothing if script not found", () => {
    vi.mocked(existsSync).mockReturnValue(false);
    const stop = startWhisplayDisplay(bus, config, logger);
    stop();
    expect(spawn).not.toHaveBeenCalled();
  });

  it("should spawn display script and connect socket", () => {
    startWhisplayDisplay(bus, config, logger);
    bus.publish({ type: "ptt:start", source: "whisplay" });
    expect(spawn).toHaveBeenCalledWith("python3", [expect.any(String)], expect.any(Object));
    expect(mockSocket.connect).toHaveBeenCalledWith(12345, "127.0.0.1");
  });

  it("should send events to socket", () => {
    startWhisplayDisplay(bus, config, logger);
    bus.publish({ type: "ptt:start", source: "whisplay" });
    expect(mockSocket.write).toHaveBeenCalledWith('{"status":"listening","text":""}\n');
  });

    it("should queue events if socket is not connected", () => {
        mockSocket.connect = vi.fn(); // prevent immediate connection
        startWhisplayDisplay(bus, config, logger);
        bus.publish({ type: "ptt:start", source: "whisplay" });
        expect(mockSocket.write).not.toHaveBeenCalled();
        
        mockSocket.emit("connect");

        expect(mockSocket.write).toHaveBeenCalledWith('{"status":"listening","text":""}\n');
    });

    it("should clean up resources on stop", () => {
        const stop = startWhisplayDisplay(bus, config, logger);
        bus.publish({ type: "ptt:start", source: "whisplay" }); // to spawn process and connect socket
        stop();
        expect(mockChildProcess.kill).toHaveBeenCalledWith("SIGTERM");
        expect(mockSocket.destroy).toHaveBeenCalled();
    });
});
