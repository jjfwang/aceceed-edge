import type { Logger } from "pino";
import type { VisionConfig } from "@aceceed/shared";

const defaultTimeoutMs = 3000;

export class VisionOcr {
  constructor(private config: VisionConfig["ocr"], private logger: Logger) {}

  async run(image: Buffer): Promise<string | null> {
    if (!this.config?.enabled) {
      return null;
    }

    if (this.config.mockText) {
      return this.config.mockText;
    }

    if (!this.config.serviceUrl) {
      this.logger.warn("OCR is enabled but no serviceUrl is configured.");
      return null;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs ?? defaultTimeoutMs);

    try {
      const response = await fetch(this.config.serviceUrl, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: image,
        signal: controller.signal
      });

      if (!response.ok) {
        this.logger.warn({ status: response.status }, "OCR service returned non-200");
        return null;
      }

      const data = (await response.json()) as { text?: string };
      return data.text ?? null;
    } catch (err) {
      this.logger.warn({ err }, "OCR request failed");
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}
