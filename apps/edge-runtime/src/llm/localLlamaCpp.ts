import type { Logger } from "pino";
import type { LlmConfig } from "@aceceed/shared";
import type { ChatMessage, LlmClient } from "./base.js";

interface LlamaResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export class LocalLlamaCppClient implements LlmClient {
  constructor(private config: LlmConfig, private logger: Logger) {}

  async generate(messages: ChatMessage[]): Promise<string> {
    const url = new URL("/v1/chat/completions", this.config.local.llamaServerUrl);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "local",
          temperature: this.config.local.temperature,
          max_tokens: 256,
          messages
        })
      });
    } catch (err) {
      throw new Error(
        `Unable to reach llama-server at ${this.config.local.llamaServerUrl}. Start llama-server first.`
      );
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`llama.cpp server error: ${response.status} ${body}`);
    }

    const data = (await response.json()) as LlamaResponse;
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      this.logger.warn({ data }, "Empty response from llama.cpp");
      return "";
    }
    return content;
  }
}
