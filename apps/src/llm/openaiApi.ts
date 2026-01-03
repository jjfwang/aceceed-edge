import type { Logger } from "pino";
import type { LlmConfig } from "@aceceed/shared";
import type { ChatMessage, LlmClient } from "./base.js";

interface OpenAiResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export class OpenAiClient implements LlmClient {
  constructor(private config: LlmConfig, private logger: Logger) {}

  async generate(messages: ChatMessage[]): Promise<string> {
    const temperature = this.config.cloud.temperature ?? this.config.local.temperature;
    const maxTokens = this.config.cloud.maxTokens ?? 256;
    const timeoutMs = this.config.cloud.requestTimeoutMs ?? 10000;
    const retries = 2;

    const apiKey = process.env[this.config.cloud.apiKeyEnv];
    if (!apiKey) {
      throw new Error(`Missing API key in env ${this.config.cloud.apiKeyEnv}`);
    }

    const baseUrl = this.config.cloud.baseUrl ?? "https://api.openai.com/v1";
    const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    const url = new URL("chat/completions", normalizedBase);

    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: this.config.cloud.model,
            temperature,
            max_tokens: maxTokens,
            messages
          }),
          signal: controller.signal
        });

        clearTimeout(timer);

        if (!response.ok) {
          const body = await response.text();
          throw new Error(`OpenAI API error: ${response.status} ${body}`);
        }

        const data = (await response.json()) as OpenAiResponse;
        const content = data.choices?.[0]?.message?.content?.trim();
        if (!content) {
          this.logger.warn({ data }, "Empty response from OpenAI-compatible API");
          return "";
        }
        return content;
      } catch (err) {
        clearTimeout(timer);
        lastError = err as Error;
        if (attempt === retries) {
          break;
        }
        const backoffMs = 200 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    throw lastError ?? new Error("OpenAI API request failed");
  }
}
