import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { OpenAiClient } from "../../apps/edge-runtime/src/llm/openaiApi.js";
import type { LlmConfig } from "../../packages/shared/src/types.js";

const apiKeyEnv = "OPENAI_API_KEY";
const baseConfig: LlmConfig = {
  mode: "cloud",
  local: {
    llamaServerUrl: "http://localhost:9999",
    ctx: 1024,
    temperature: 0.2
  },
  cloud: {
    provider: "openai",
    apiKeyEnv,
    model: "gpt-test",
    baseUrl: "https://api.openai.com/v1",
    temperature: 0.7,
    maxTokens: 123,
    requestTimeoutMs: 5000
  }
};

describe("OpenAiClient", () => {
  const logger = {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  } as unknown as Console;

  beforeEach(() => {
    process.env[apiKeyEnv] = "test-key";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env[apiKeyEnv];
  });

  it("uses cloud-specific tuning and returns assistant content", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: " Hello world " } }] }),
      text: async () => ""
    });
    // @ts-expect-error override global
    global.fetch = fetchMock;

    const client = new OpenAiClient(baseConfig, logger);
    const response = await client.generate([{ role: "user", content: "hi" }]);

    expect(response).toBe("Hello world");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.temperature).toBe(0.7);
    expect(body.max_tokens).toBe(123);
    expect(body.model).toBe("gpt-test");
  });

  it("retries on failure and succeeds on later attempt", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "boom"
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        text: async () => "still bad"
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "Recovered" } }] }),
        text: async () => ""
      });
    // @ts-expect-error override global
    global.fetch = fetchMock;

    const client = new OpenAiClient(baseConfig, logger);
    const response = await client.generate([{ role: "user", content: "try" }]);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(response).toBe("Recovered");
  });
});
