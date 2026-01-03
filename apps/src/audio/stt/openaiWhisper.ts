import { promises as fs } from "node:fs";
import type { Logger } from "pino";
import type { SttConfig } from "@aceceed/shared";
import type { SttProvider } from "./base.js";

interface OpenAiTranscriptionResponse {
  text?: string;
}

export class OpenAiWhisperStt implements SttProvider {
  constructor(private config: SttConfig, private logger: Logger) {}

  async transcribe(audioPath: string): Promise<string> {
    const cloud = this.config.cloud;
    if (!cloud) {
      throw new Error("Cloud STT configured without provider details");
    }

    const apiKey = process.env[cloud.apiKeyEnv];
    if (!apiKey) {
      throw new Error(`Missing API key in env ${cloud.apiKeyEnv}`);
    }

    const baseUrl = cloud.baseUrl ?? "https://api.openai.com/v1";
    const url = new URL("/audio/transcriptions", baseUrl);
    const model = cloud.model ?? "whisper-1";
    const timeoutMs = 20000;
    const retries = 2;

    const audioBuffer = await fs.readFile(audioPath);

    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const form = new FormData();
        form.set("model", model);
        form.set("file", new Blob([audioBuffer], { type: "audio/wav" }), "audio.wav");

        const response = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: form,
          signal: controller.signal
        });

        clearTimeout(timer);

        if (!response.ok) {
          const body = await response.text();
          throw new Error(`OpenAI API error: ${response.status} ${body}`);
        }

        const data = (await response.json()) as OpenAiTranscriptionResponse;
        const transcript = data.text?.trim() ?? "";
        if (!transcript) {
          this.logger.warn("Empty transcript from OpenAI Whisper");
        }
        return transcript;
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

    throw lastError ?? new Error("OpenAI STT request failed");
  }
}
