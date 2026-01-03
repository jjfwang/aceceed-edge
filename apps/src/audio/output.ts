import type { Logger } from "pino";
import type { AudioConfig } from "@aceceed/shared";
import { runCommand } from "../common/utils.js";

export class AudioOutput {
  constructor(private config: AudioConfig, private logger: Logger) {}

  async playWav(filePath: string): Promise<void> {
    if (this.config.output.backend !== "aplay") {
      this.logger.warn("Unsupported output backend, skipping playback");
      return;
    }

    try {
      await runCommand(this.config.output.aplayPath, [
        "-D",
        this.config.output.device,
        filePath
      ]);
    } catch (err) {
      const details = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Audio playback failed. Check output device '${this.config.output.device}'. ${details}`
      );
    }
  }
}
