import { promises as fs } from "node:fs";
import type { Logger } from "pino";
import type { TtsConfig } from "@aceceed/shared";
import { tempPath } from "../../common/utils.js";
import type { TtsProvider } from "./base.js";

export class OpenAiTts implements TtsProvider {
  constructor(private config: TtsConfig, private logger: Logger) {}

  async synthesize(text: string): Promise<string> {
    const cloud = this.config.cloud;
    if (!cloud) {
      throw new Error("Cloud TTS configured without provider details");
    }

    const apiKey = process.env[cloud.apiKeyEnv];
    if (!apiKey) {
      throw new Error(`Missing API key in env ${cloud.apiKeyEnv}`);
    }

    const baseUrl = cloud.baseUrl ?? "https://api.openai.com/v1";
    const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    const url = new URL("audio/speech", normalizedBase);
    const model = cloud.model ?? "tts-1";
    const voice = cloud.voiceId ?? "alloy";
    const timeoutMs = 20000;
    const retries = 2;

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
            model,
            voice,
            input: text,
            response_format: "wav"
          }),
          signal: controller.signal
        });

        clearTimeout(timer);

        if (!response.ok) {
          const body = await response.text();
          throw new Error(`OpenAI API error: ${response.status} ${body}`);
        }

        const audio = Buffer.from(await response.arrayBuffer());
        if (audio.length === 0) {
          this.logger.warn("Empty audio response from OpenAI TTS");
        }

        const outputPath = tempPath("openai-tts", ".wav");
        await fs.writeFile(outputPath, audio);
        return outputPath;
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

    throw lastError ?? new Error("OpenAI TTS request failed");
  }
}
