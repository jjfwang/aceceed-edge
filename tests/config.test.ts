import { describe, it, expect } from "vitest";
import { configSchema } from "../../packages/shared/src/configSchema.js";

describe("config schema", () => {
  it("accepts a minimal config", () => {
    const parsed = configSchema.parse({
      rag: {
        enabled: true,
        indexPath: "/data/rag.json",
        gradeBand: "primary",
        subjects: ["math"],
        maxChunks: 3
      },
      llm: {
        mode: "local",
        local: {
          llamaServerUrl: "http://127.0.0.1:8080",
          modelPath: "/models/llama.gguf",
          ctx: 2048,
          temperature: 0.2
        },
        cloud: {
          provider: "openai",
          apiKeyEnv: "OPENAI_API_KEY",
          model: "gpt-4o-mini"
        }
      },
      stt: {
        mode: "local",
        backend: "whispercpp",
        whispercpp: {
          binPath: "/usr/local/bin/whisper",
          modelPath: "/models/whisper.bin"
        }
      },
      tts: {
        mode: "local",
        backend: "piper",
        piper: {
          binPath: "/usr/bin/piper",
          voicePath: "/models/voice.onnx",
          outputSampleRate: 22050
        }
      },
      vision: {
        enabled: true,
        capture: {
          backend: "rpicam-still",
          stillArgs: []
        }
      },
      audio: {
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
      },
      runtime: {
        pushToTalkMode: "keyboard",
        cameraIndicator: true,
        micIndicator: true
      },
      api: {
        host: "127.0.0.1",
        port: 8000
      },
      logging: {
        level: "info"
      }
    });

    expect(parsed.llm.mode).toBe("local");
  });

  it("accepts LLM-8850 config settings", () => {
    const parsed = configSchema.parse({
      rag: {
        enabled: false,
        indexPath: "/data/rag.json",
        gradeBand: "secondary",
        subjects: ["science"],
        maxChunks: 2
      },
      llm: {
        mode: "local",
        local: {
          backend: "llm8850",
          llamaServerUrl: "http://127.0.0.1:8080",
          modelPath: "/models/llama.gguf",
          ctx: 2048,
          temperature: 0.2,
          llm8850: {
            host: "http://127.0.0.1:8000",
            topK: 20,
            enableThinking: false
          }
        },
        cloud: {
          provider: "openai",
          apiKeyEnv: "OPENAI_API_KEY",
          model: "gpt-4o-mini"
        }
      },
      stt: {
        mode: "local",
        backend: "whispercpp",
        whispercpp: {
          binPath: "/usr/local/bin/whisper",
          modelPath: "/models/whisper.bin"
        }
      },
      tts: {
        mode: "local",
        backend: "piper",
        piper: {
          binPath: "/usr/bin/piper",
          voicePath: "/models/voice.onnx",
          outputSampleRate: 22050
        }
      },
      vision: {
        enabled: true,
        capture: {
          backend: "rpicam-still",
          stillArgs: []
        }
      },
      audio: {
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
      },
      runtime: {
        pushToTalkMode: "keyboard",
        cameraIndicator: true,
        micIndicator: true
      },
      api: {
        host: "127.0.0.1",
        port: 8000
      },
      logging: {
        level: "info"
      }
    });

    expect(parsed.llm.local.backend).toBe("llm8850");
  });
});
