import type { Logger } from "pino";
import type { AudioConfig } from "@aceceed/shared";
import { runCommand } from "../common/utils.js";
import { discoverOutputDevice } from "./deviceDiscovery.js";

export class AudioOutput {
  private resolvedDevice?: Promise<string>;

  constructor(private config: AudioConfig, private logger: Logger) {}

  private async getDevice(): Promise<string> {
    if (this.config.output.device) {
      return this.config.output.device;
    }

    if (!this.resolvedDevice) {
      this.resolvedDevice = discoverOutputDevice(this.logger, this.config.output.aplayPath);
    }

    return this.resolvedDevice;
  }

  async playWav(filePath: string): Promise<void> {
    const backend = this.config.output.backend === "auto" ? "aplay" : this.config.output.backend;
    const device = await this.getDevice();

    if (backend !== "aplay" || !device) {
      this.logger.warn("Unsupported output backend or device missing, skipping playback");
      return;
    }

    try {
      await runCommand(this.config.output.aplayPath, ["-D", device, filePath]);
    } catch (err) {
      const details = err instanceof Error ? err.message : String(err);
      throw new Error(`Audio playback failed. Check output device '${device}'. ${details}`);
    }
  }
}
