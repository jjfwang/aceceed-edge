import type { Logger } from "pino";
import type { LlmConfig } from "@aceceed/shared";
import type { ChatMessage, LlmClient } from "./base.js";

interface Llm8850PollResponse {
  done?: boolean;
  response?: string;
}

function buildPrompt(messages: ChatMessage[]): { systemPrompt?: string; prompt: string } {
  const systemPrompt = messages.filter((msg) => msg.role === "system").map((msg) => msg.content).join("\n").trim();
  const dialogue = messages.filter((msg) => msg.role !== "system");
  const userMessages = dialogue.filter((msg) => msg.role === "user");
  const hasAssistant = dialogue.some((msg) => msg.role === "assistant");
  const prompt =
    userMessages.length === 1 && !hasAssistant
      ? userMessages[0].content.trim()
      : dialogue
          .map((msg) => {
            const label = msg.role === "assistant" ? "Assistant" : "User";
            return `${label}: ${msg.content}`;
          })
          .join("\n")
          .trim();

  return { systemPrompt: systemPrompt || undefined, prompt };
}

function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/<\/think>/g, "").trim();
}

export class Llm8850Client implements LlmClient {
  constructor(private config: LlmConfig, private logger: Logger) {}

  async generate(messages: ChatMessage[]): Promise<string> {
    const llmConfig = this.config.local.llm8850;
    if (!llmConfig?.host) {
      throw new Error("LLM-8850 host is not configured. Set llm.local.llm8850.host.");
    }

    const { systemPrompt, prompt } = buildPrompt(messages);
    if (!prompt) {
      return "";
    }

    const baseUrl = llmConfig.host;
    const temperature = llmConfig.temperature ?? this.config.local.temperature;
    const timeoutMs = llmConfig.requestTimeoutMs ?? 10000;
    const pollIntervalMs = llmConfig.pollIntervalMs ?? 200;
    const maxWaitMs = llmConfig.maxWaitMs ?? 60000;
    const enableThinking = llmConfig.enableThinking ?? true;
    const resetOnRequest = llmConfig.resetOnRequest ?? true;

    if (resetOnRequest && systemPrompt) {
      const resetPayload = {
        system_prompt: enableThinking ? systemPrompt : `${systemPrompt} /no_think`
      };
      await this.fetchJson(new URL("/api/reset", baseUrl), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resetPayload)
      }, timeoutMs);
    }

    const generatePayload: Record<string, unknown> = {
      prompt,
      temperature
    };
    if (llmConfig.topK !== undefined) {
      generatePayload["top-k"] = llmConfig.topK;
    }

    await this.fetchJson(new URL("/api/generate", baseUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(generatePayload)
    }, timeoutMs);

    const deadline = Date.now() + maxWaitMs;
    let responseText = "";

    while (Date.now() < deadline) {
      const data = await this.fetchJson<Llm8850PollResponse>(
        new URL("/api/generate_provider", baseUrl),
        { method: "GET" },
        timeoutMs
      );
      if (data.done) {
        responseText = data.response ?? "";
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    if (!responseText) {
      if (Date.now() >= deadline) {
        throw new Error("LLM-8850 response timed out.");
      }
      this.logger.warn("Empty response from LLM-8850");
      return "";
    }

    return enableThinking ? responseText.trim() : stripThinking(responseText);
  }

  private async fetchJson<T>(
    url: URL,
    init: RequestInit,
    timeoutMs: number
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`LLM-8850 API error: ${response.status} ${body}`);
      }

      try {
        return (await response.json()) as T;
      } catch {
        return {} as T;
      }
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof Error) {
        if (err.message.startsWith("LLM-8850 API error")) {
          throw err;
        }
        if (err.name === "AbortError") {
          throw new Error(`LLM-8850 request timed out after ${timeoutMs}ms`);
        }
      }
      throw new Error(`Unable to reach LLM-8850 at ${url.origin}. Is the service running?`);
    }
  }
}
