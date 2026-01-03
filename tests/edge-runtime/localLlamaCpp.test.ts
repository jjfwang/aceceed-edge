import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LocalLlamaCppClient } from "../../apps/edge-runtime/src/llm/localLlamaCpp";
import { LlmConfig, Config } from "@aceceed/shared";
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

describe("LocalLlamaCppClient", () => {
  let client: LocalLlamaCppClient;
  let llmConfig: LlmConfig;

  beforeEach(() => {
    llmConfig = baseConfig.llm;
    client = new LocalLlamaCppClient(llmConfig, logger);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return a generated message on successful response", async () => {
    const mockResponse = {
      choices: [{ message: { content: "  Hello, world!  " } }],
    };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });
    vi.stubGlobal("fetch", mockFetch);

    const messages = [{ role: "user", content: "Hi" }];
    const result = await client.generate(messages);

    expect(result).toBe("Hello, world!");
    expect(mockFetch).toHaveBeenCalledWith(
      new URL("/v1/chat/completions", llmConfig.local.llamaServerUrl),
      expect.any(Object)
    );
  });

  it("should throw an error on non-ok response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Internal Server Error"),
    });
    vi.stubGlobal("fetch", mockFetch);

    const messages = [{ role: "user", content: "Hi" }];
    await expect(client.generate(messages)).rejects.toThrow(
      "llama.cpp server error: 500 Internal Server Error"
    );
  });

  it("should throw an error on fetch network error", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.stubGlobal("fetch", mockFetch);

    const messages = [{ role: "user", content: "Hi" }];
    await expect(client.generate(messages)).rejects.toThrow(
      `Unable to reach llama-server at ${llmConfig.local.llamaServerUrl}. Start llama-server first.`
    );
  });

  it("should return an empty string if content is missing", async () => {
    const mockResponse = { choices: [{ message: {} }] };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });
    vi.stubGlobal("fetch", mockFetch);

    const messages = [{ role: "user", content: "Hi" }];
    const result = await client.generate(messages);

    expect(result).toBe("");
  });
});
