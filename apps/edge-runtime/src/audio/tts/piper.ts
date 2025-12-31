import type { Logger } from "pino";
import type { TtsConfig } from "@aceceed/shared";
import { runCommand, tempPath } from "../../common/utils.js";
import type { TtsProvider } from "./base.js";

export class PiperTts implements TtsProvider {
  constructor(private config: TtsConfig, private logger: Logger) {}

  async synthesize(text: string): Promise<string> {
    const outputPath = tempPath("piper", ".wav");

    try {
      await runCommand(
        this.config.piper.binPath,
        ["--model", this.config.piper.voicePath, "--output_file", outputPath],
        { input: text }
      );
    } catch (err) {
      throw new Error(
        `Piper failed. Check binPath '${this.config.piper.binPath}' and voicePath '${this.config.piper.voicePath}'.`
      );
    }

    return outputPath;
  }
}
