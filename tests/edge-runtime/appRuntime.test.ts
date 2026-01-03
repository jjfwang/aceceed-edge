import { describe, it, expect } from "vitest";
import pino from "pino";
import { EventBus } from "../../apps/edge-runtime/src/runtime/eventBus.js";
import { AppRuntime } from "../../apps/edge-runtime/src/runtime/appRuntime.js";
import type { AppConfig } from "../../packages/shared/src/types.js";
import { AgentRegistry } from "../../apps/edge-runtime/src/agents/registry.js";
import { TutorAgent } from "../../apps/edge-runtime/src/agents/tutorAgent.js";
import type { VisionDetector } from "../../apps/edge-runtime/src/vision/detectors/base.js";

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
      [],
      { retrieve: async () => [] },
      undefined
    );

    const result = await runtime.handlePttStart("api");
    expect(result?.response).toContain("Try adding");
  });

  it("routes coaching intents to the coach agent", async () => {
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

    const stt = { transcribe: async () => "I need a study plan for math" };

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

    const tutor = { id: "tutor", name: "Tutor", handle: async () => ({ text: "tutor answer" }) };
    const coach = { id: "coach", name: "Coach", handle: async () => ({ text: "coach plan" }) };
    const registry = new AgentRegistry([tutor, coach], ["tutor", "coach"]);
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
      [],
      { retrieve: async () => [] },
      undefined
    );

    const result = await runtime.handlePttStart("api");
    expect(result?.response).toContain("coach plan");
  });

  it("honors explicit agent overrides", async () => {
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

    const stt = { transcribe: async () => "What is 2+2?" };

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

    const tutor = { id: "tutor", name: "Tutor", handle: async () => ({ text: "tutor answer" }) };
    const coach = { id: "coach", name: "Coach", handle: async () => ({ text: "coach answer" }) };
    const registry = new AgentRegistry([tutor, coach], ["tutor", "coach"]);
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
      [],
      { retrieve: async () => [] },
      undefined
    );

    const result = await runtime.handlePttStart("api", "coach");
    expect(result?.response).toContain("coach answer");
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
      [],
      { retrieve: async () => [] },
      undefined
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
      detectors,
      { retrieve: async () => [] },
      undefined
    );

    const result = await runtime.captureWithDetectors("api");
    expect(result.detectors).toHaveLength(2);
    expect(events).toContain("camera:capture");
  });

  it("publishes tts:spoken when transcript is empty", async () => {
    const logger = pino({ level: "silent" });
    const bus = new EventBus();
    const events: string[] = [];
    bus.subscribe((event) => {
      events.push(event.type);
    });

    const audioInput = {
      record: async () => {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const filePath = path.join("/tmp", `aceceed-test-${Date.now()}.wav`);
        await fs.writeFile(filePath, "test");
        return filePath;
      }
    };

    const stt = { transcribe: async () => "" };

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
    const tutor = { id: "tutor", name: "Tutor", handle: async () => ({ text: "unused" }) };
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
      [],
      { retrieve: async () => [] },
      undefined
    );

    await runtime.handlePttStart("api");
    expect(events).toContain("tts:spoken");
  });

  it("continues when a detector throws", async () => {
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

    const detectors: VisionDetector[] = [
      { id: "thrower", detect: async () => { throw new Error("boom"); } },
      { id: "ok", detect: async () => ({ paperPresent: true, motionScore: 0.3 }) }
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
      detectors,
      { retrieve: async () => [] },
      undefined
    );

    const result = await runtime.captureWithDetectors("api");
    expect(result.detectors).toHaveLength(2);
    expect(result.detectors[0]?.paperPresent).toBe(false);
  });

  it("reports llm, stt, and tts service readiness", () => {
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
      [],
      { retrieve: async () => [] },
      undefined
    );

    const services = runtime.getServiceStatus();
    expect(services).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "llm", backend: "local:llama.cpp", ready: true }),
        expect.objectContaining({ id: "stt", backend: "local:whispercpp", ready: true }),
        expect.objectContaining({ id: "tts", backend: "local:piper", ready: true })
      ])
    );
  });
});
