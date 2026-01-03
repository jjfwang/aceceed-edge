import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createServer } from "../apps/src/api/server.js";
import { EventBus } from "../apps/src/runtime/eventBus.js";
import type { AppConfig } from "../../packages/shared/src/types.js";

const config: AppConfig = {
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
  vision: { enabled: false, capture: { backend: "rpicam-still", stillArgs: [] } },
  audio: {
    input: {
      backend: "arecord",
      device: "default",
      sampleRate: 16000,
      channels: 1,
      recordSeconds: 1,
      arecordPath: "arecord"
    },
    output: { backend: "aplay", device: "default", aplayPath: "aplay" }
  },
  runtime: { pushToTalkMode: "api", cameraIndicator: false, micIndicator: false },
  api: { host: "127.0.0.1", port: 8000 },
  logging: { level: "info" }
};

describe("API server", () => {
  const bus = new EventBus();
  const runtime = {
    isPttActive: vi.fn().mockReturnValue(false),
    handlePttStart: vi.fn().mockResolvedValue({ transcript: "hi", response: "ok" }),
    handlePttStop: vi.fn(),
    captureWithDetectors: vi.fn().mockResolvedValue({
      capture: Buffer.from(""),
      detectors: [{ id: "one", paperPresent: true, motionScore: 0.1 }]
    }),
    getServiceStatus: vi.fn().mockReturnValue([
      { id: "llm", backend: "local:llama.cpp", ready: true },
      { id: "stt", backend: "local:whispercpp", ready: true },
      { id: "tts", backend: "local:piper", ready: true }
    ])
  } as unknown as import("../apps/src/runtime/appRuntime.js").AppRuntime;

  let server: ReturnType<typeof createServer>;

  beforeEach(async () => {
    server = createServer(config, runtime, bus);
    await server.ready();
  });

  afterEach(async () => {
    await server.close();
  });

  it("starts PTT", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/v1/ptt/start",
      payload: { agent: "tutor" }
    });

    expect(response.statusCode).toBe(200);
    expect(runtime.handlePttStart).toHaveBeenCalledWith("api", "tutor");
  });

  it("stops PTT", async () => {
    runtime.isPttActive = vi.fn().mockReturnValue(true);
    const response = await server.inject({ method: "POST", url: "/v1/ptt/stop" });
    expect(response.statusCode).toBe(200);
    expect(runtime.handlePttStop).toHaveBeenCalled();
  });

  it("returns capture info", async () => {
    const response = await server.inject({ method: "POST", url: "/v1/camera/capture" });
    expect(response.statusCode).toBe(200);
    const payload = response.json() as { detectors: Array<{ id: string }> };
    expect(payload.detectors[0]?.id).toBe("one");
  });

  it("returns runtime services", async () => {
    const response = await server.inject({ method: "GET", url: "/v1/runtime/services" });
    expect(response.statusCode).toBe(200);
    const payload = response.json() as { services: Array<{ id: string; ready: boolean }> };
    expect(payload.services.some((service) => service.id === "llm")).toBe(true);
  });
});
