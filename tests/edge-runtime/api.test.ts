import { describe, it, expect, vi, beforeEach } from "vitest";
import { createServer } from "../../apps/edge-runtime/src/api/server";
import { AppRuntime } from "../../apps/edge-runtime/src/runtime/appRuntime";
import { EventBus } from "../../apps/edge-runtime/src/runtime/eventBus";
import { Config, AppConfig } from "@aceceed/shared";
import pino from "pino";

const logger = pino({ level: "silent" });

const baseConfig: Config = {
  version: 1,
  runtime: {
    app: "default",
    logLevel: "silent",
    detectorTimeoutMs: 1000,
    pushToTalkMode: "hold",
    agents: {
      default: "tutor",
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

describe("API Server", () => {
  let server: ReturnType<typeof createServer>;
  let runtime: AppRuntime;
  let bus: EventBus;

  beforeEach(() => {
    const config: AppConfig = { ...baseConfig, from: "file" };
    bus = new EventBus(logger);
    runtime = new AppRuntime(config, bus, logger);
    server = createServer(config, runtime, bus);
  });

  describe("POST /v1/ptt/start", () => {
    it("should start PTT and return results", async () => {
      vi.spyOn(runtime, "isPttActive").mockReturnValue(false);
      vi.spyOn(runtime, "handlePttStart").mockResolvedValue({
        transcript: "hello",
        response: "world",
      });

      const response = await server.inject({
        method: "POST",
        url: "/v1/ptt/start",
        payload: { agent: "tutor" },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        status: "completed",
        transcript: "hello",
        response: "world",
      });
    });

    it("should return 409 if PTT is already active", async () => {
      vi.spyOn(runtime, "isPttActive").mockReturnValue(true);

      const response = await server.inject({
        method: "POST",
        url: "/v1/ptt/start",
      });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({
        status: "error",
        message: "PTT already active",
      });
    });

    it("should return 500 if runtime throws an error", async () => {
        vi.spyOn(runtime, "isPttActive").mockReturnValue(false);
        vi.spyOn(runtime, "handlePttStart").mockRejectedValue(new Error("Test error"));
  
        const response = await server.inject({
          method: "POST",
          url: "/v1/ptt/start",
        });
  
        expect(response.statusCode).toBe(500);
        expect(response.json()).toEqual({
          status: "error",
          message: "Test error",
        });
      });
  });

  describe("POST /v1/ptt/stop", () => {
    it("should stop PTT", async () => {
        vi.spyOn(runtime, "isPttActive").mockReturnValue(true);
        const handlePttStopSpy = vi.spyOn(runtime, "handlePttStop");

        const response = await server.inject({
            method: "POST",
            url: "/v1/ptt/stop",
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({ status: "stopped" });
        expect(handlePttStopSpy).toHaveBeenCalled();
    });

    it("should return 409 if PTT is not active", async () => {
        vi.spyOn(runtime, "isPttActive").mockReturnValue(false);

        const response = await server.inject({
            method: "POST",
            url: "/v1/ptt/stop",
        });

        expect(response.statusCode).toBe(409);
        expect(response.json()).toEqual({
            status: "error",
            message: "No active PTT session",
        });
    });
  });
  
  describe("POST /v1/camera/capture", () => {
    it("should return capture results", async () => {
        vi.spyOn(runtime, "captureWithDetectors").mockResolvedValue({
            capture: Buffer.from("image"),
            detectors: [{
                detectorName: "paper",
                paperPresent: true,
                motionScore: 0.5,
            }]
        });

        const response = await server.inject({
            method: "POST",
            url: "/v1/camera/capture",
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            paperPresent: true,
            motionScore: 0.5,
            imageBytes: 5,
            detectors: [{
                detectorName: "paper",
                paperPresent: true,
                motionScore: 0.5,
            }]
        });
    });
  });

  describe("GET /v1/runtime/services", () => {
    it("should return service status", async () => {
        vi.spyOn(runtime, "getServiceStatus").mockReturnValue([{ service: "test", status: "ok" }]);

        const response = await server.inject({
            method: "GET",
            url: "/v1/runtime/services",
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            services: [{ service: "test", status: "ok" }],
        });
    });
  });
});
