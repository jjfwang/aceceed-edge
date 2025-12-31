import type { Logger } from "pino";
import type { LlmConfig } from "@aceceed/shared";
import type { ChatMessage, LlmClient } from "./base.js";

interface OpenAiResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export class OpenAiClient implements LlmClient {
  constructor(private config: LlmConfig, private logger: Logger) {}

  async generate(messages: ChatMessage[]): Promise<string> {
    const apiKey = process.env[this.config.cloud.apiKeyEnv];
    if (!apiKey) {
      throw new Error(`Missing API key in env ${this.config.cloud.apiKeyEnv}`);
    }

    const baseUrl = this.config.cloud.baseUrl ?? "https://api.openai.com/v1";
    const url = new URL("/chat/completions", baseUrl);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: this.config.cloud.model,
        temperature: this.config.local.temperature,
        max_tokens: 256,
        messages
      })
    });

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
  }
}
