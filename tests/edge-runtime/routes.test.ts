import { describe, it, expect, beforeEach, afterEach } from "vitest";
import pino from "pino";
import { createServer } from "../../apps/edge-runtime/src/api/server.js";
import { EventBus } from "../../apps/edge-runtime/src/runtime/eventBus.js";
import { AppRuntime } from "../../apps/edge-runtime/src/runtime/appRuntime.js";
import type { AppConfig } from "../../packages/shared/src/types.js";
import { AgentRegistry } from "../../apps/edge-runtime/src/agents/registry.js";
import { TutorAgent } from "../../apps/edge-runtime/src/agents/tutorAgent.js";

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
    local: {
      llamaServerUrl: "http://127.0.0.1:8080",
      ctx: 1024,
      temperature: 0.2
    },
    cloud: {
      provider: "openai",
      apiKeyEnv: "OPENAI_API_KEY",
      model: "gpt-4o-mini"
    }
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

function buildRuntime() {
  const logger = pino({ level: "silent" });
  const bus = new EventBus();
  const audioInput = { record: async () => "/tmp/unused.wav" };
  const stt = { transcribe: async () => "" };
  const tts = { synthesize: async () => "/tmp/unused.wav" };
  const audioOutput = { playWav: async () => undefined };
  const llm = { generate: async () => "" };
  const tutor = new TutorAgent(llm, "prompt");
  const registry = new AgentRegistry([tutor], ["tutor"]);
  const vision = { captureStill: async () => ({ image: Buffer.from("1234"), mimeType: "image/jpeg" }) };

  return new AppRuntime(
    config,
    logger,
    bus,
    audioInput,
    audioOutput,
    stt,
    tts,
    registry,
    vision,
    [],
    { retrieve: async () => [] },
    undefined
  );
}

describe("runtime service routes", () => {
  beforeEach(() => {
    process.env[config.llm.cloud.apiKeyEnv] = "test-key";
  });

  afterEach(() => {
    delete process.env[config.llm.cloud.apiKeyEnv];
  });

  it("exposes llm, stt, and tts services via API", async () => {
    const runtime = buildRuntime();
    const bus = new EventBus();
    const server = createServer(config, runtime, bus);
    await server.ready();

    const response = await server.inject({ method: "GET", url: "/v1/runtime/services" });
    expect(response.statusCode).toBe(200);
    const payload = response.json() as { services: Array<{ id: string; backend: string; ready: boolean }> };

    expect(payload.services).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "llm", backend: "local:llama.cpp", ready: true }),
        expect.objectContaining({ id: "stt", backend: "local:whispercpp", ready: true }),
        expect.objectContaining({ id: "tts", backend: "local:piper", ready: true })
      ])
    );

    await server.close();
  });

  it("passes agent overrides to PTT start", async () => {
    const bus = new EventBus();
    let captured: string | undefined;

    const runtime = {
      isPttActive: () => false,
      handlePttStart: async (_source: string, agentId?: string) => {
        captured = agentId;
        return { transcript: "hi", response: "ok" };
      },
      handlePttStop: () => undefined,
      captureWithDetectors: async () => ({ capture: Buffer.from(""), detectors: [] }),
      getServiceStatus: () => []
    } as unknown as AppRuntime;

    const server = createServer(config, runtime, bus);
    await server.ready();

    const response = await server.inject({
      method: "POST",
      url: "/v1/ptt/start",
      payload: { agent: "coach" }
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toBe("coach");

    await server.close();
  });
});
