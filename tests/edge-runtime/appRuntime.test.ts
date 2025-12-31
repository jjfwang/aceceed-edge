import { describe, it, expect } from "vitest";
import pino from "pino";
import { EventBus } from "../../apps/edge-runtime/src/runtime/eventBus.js";
import { AppRuntime } from "../../apps/edge-runtime/src/runtime/appRuntime.js";
import type { AppConfig } from "../../packages/shared/src/types.js";
import { AgentRegistry } from "../../apps/edge-runtime/src/agents/registry.js";
import { TutorAgent } from "../../apps/edge-runtime/src/agents/tutorAgent.js";
import type { VisionDetector } from "../../apps/edge-runtime/src/vision/detectors/base.js";

const config: AppConfig = {
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
  stt: { backend: "whispercpp", whispercpp: { binPath: "whisper", modelPath: "model" } },
  tts: { backend: "piper", piper: { binPath: "piper", voicePath: "voice", outputSampleRate: 22050 } },
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

describe("AppRuntime", () => {
  it("runs a minimal PTT flow", async () => {
    const logger = pino({ level: "silent" });
    const bus = new EventBus();

    const audioInput = {
      record: async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const filePath = path.join("/tmp", `aceceed-test-${Date.now()}.wav`);
        await fs.writeFile(filePath, "test");
        return filePath;
      }
    };

    const stt = { transcribe: async () => "what is 2+2" };

    const tts = {
      synthesize: async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const filePath = path.join("/tmp", `aceceed-test-tts-${Date.now()}.wav`);
        await fs.writeFile(filePath, "test");
        return filePath;
      }
    };

    const audioOutput = { playWav: async () => undefined };

    const llm = { generate: async () => "Try adding two and two." };
    const tutor = new TutorAgent(llm, "prompt");
    const registry = new AgentRegistry([tutor], ["tutor"]);
    const vision = { captureStill: async () => ({ image: Buffer.from(""), mimeType: "image/jpeg" }) };

    const runtime = new AppRuntime(
      config,
      logger,
      bus,
      audioInput,
      audioOutput,
      stt,
      tts,
      registry,
      vision,
      []
    );

    const result = await runtime.handlePttStart("api");
    expect(result?.response).toContain("Try adding");
  });

  it("rejects concurrent PTT starts", async () => {
    const logger = pino({ level: "silent" });
    const bus = new EventBus();

    const audioInput = {
      record: async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const filePath = path.join("/tmp", `aceceed-test-${Date.now()}.wav`);
        await fs.writeFile(filePath, "test");
        await new Promise((resolve) => setTimeout(resolve, 50));
        return filePath;
      }
    };

    const stt = { transcribe: async () => "what is 2+2" };

    const tts = {
      synthesize: async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const filePath = path.join("/tmp", `aceceed-test-tts-${Date.now()}.wav`);
        await fs.writeFile(filePath, "test");
        return filePath;
      }
    };

    const audioOutput = { playWav: async () => undefined };

    const llm = { generate: async () => "Try adding two and two." };
    const tutor = new TutorAgent(llm, "prompt");
    const registry = new AgentRegistry([tutor], ["tutor"]);
    const vision = { captureStill: async () => ({ image: Buffer.from(""), mimeType: "image/jpeg" }) };

    const runtime = new AppRuntime(
      config,
      logger,
      bus,
      audioInput,
      audioOutput,
      stt,
      tts,
      registry,
      vision,
      []
    );

    const first = runtime.handlePttStart("api");
    const second = runtime.handlePttStart("api");

    await expect(second).rejects.toThrow("PTT already active");
    await first;
  });

  it("runs all detectors and publishes capture events", async () => {
    const logger = pino({ level: "silent" });
    const bus = new EventBus();
    const events: string[] = [];
    bus.subscribe((event) => {
      events.push(event.type);
    });

    const audioInput = { record: async () => "/tmp/unused.wav" };
    const stt = { transcribe: async () => "" };
    const tts = { synthesize: async () => "/tmp/unused.wav" };
    const audioOutput = { playWav: async () => undefined };
    const llm = { generate: async () => "" };
    const tutor = new TutorAgent(llm, "prompt");
    const registry = new AgentRegistry([tutor], ["tutor"]);

    const vision = { captureStill: async () => ({ image: Buffer.from("1234"), mimeType: "image/jpeg" }) };

    const detectors: VisionDetector[] = [
      { id: "one", detect: async () => ({ paperPresent: true, motionScore: 0.1 }) },
      { id: "two", detect: async () => ({ paperPresent: false, motionScore: 0.2 }) }
    ];

    const runtime = new AppRuntime(
      config,
      logger,
      bus,
      audioInput,
      audioOutput,
      stt,
      tts,
      registry,
      vision,
      detectors
    );

    const result = await runtime.captureWithDetectors("api");
    expect(result.detectors).toHaveLength(2);
    expect(events).toContain("camera:capture");
  });
});
