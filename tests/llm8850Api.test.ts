import { describe, it, expect, afterEach, vi } from "vitest";
import { Llm8850Client } from "../apps/src/llm/llm8850Api.js";
import type { LlmConfig } from "../../packages/shared/src/types.js";

const baseConfig: LlmConfig = {
  mode: "local",
  local: {
    backend: "llm8850",
    llamaServerUrl: "http://127.0.0.1:8080",
    ctx: 1024,
    temperature: 0.2,
    llm8850: {
      host: "http://127.0.0.1:8000",
      topK: 20,
      pollIntervalMs: 0,
      maxWaitMs: 1000,
      enableThinking: false,
      resetOnRequest: true
    }
  },
  cloud: {
    provider: "openai",
    apiKeyEnv: "OPENAI_API_KEY",
    model: "gpt-4o-mini"
  }
};

const logger = {
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn()
};

const originalFetch = global.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  // @ts-expect-error override global
  global.fetch = originalFetch;
});

describe("Llm8850Client", () => {
  it("resets, generates, polls, and strips thinking tags", async () => {
    let pollCount = 0;
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = input.toString();
      if (url.endsWith("/api/reset")) {
        return {
          ok: true,
          json: async () => ({}),
          text: async () => ""
        };
      }
      if (url.endsWith("/api/generate")) {
        return {
          ok: true,
          json: async () => ({}),
          text: async () => ""
        };
      }
      if (url.endsWith("/api/generate_provider")) {
        pollCount += 1;
        return {
          ok: true,
          json: async () =>
            pollCount < 2
              ? { done: false }
              : { done: true, response: "<think>hidden</think> hello " },
          text: async () => ""
        };
      }
      return { ok: false, status: 404, text: async () => "missing" };
    });

    // @ts-expect-error override global
    global.fetch = fetchMock;

    const client = new Llm8850Client(baseConfig, logger as unknown as Console);
    const response = await client.generate([
      { role: "system", content: "You are concise." },
      { role: "user", content: "Hi" }
    ]);

    expect(response).toBe("hello");

    const resetCall = fetchMock.mock.calls.find((call) => call[0].toString().endsWith("/api/reset"));
    const resetBody = JSON.parse((resetCall?.[1] as RequestInit).body as string);
    expect(resetBody.system_prompt).toContain("/no_think");

    const generateCall = fetchMock.mock.calls.find((call) => call[0].toString().endsWith("/api/generate"));
    const generateBody = JSON.parse((generateCall?.[1] as RequestInit).body as string);
    expect(generateBody["top-k"]).toBe(20);
  });
});
