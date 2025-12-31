import { promises as fs } from "node:fs";
import type { Logger } from "pino";
import type { TtsConfig } from "@aceceed/shared";
import { runCommand, tempPath } from "../../common/utils.js";
import type { TtsProvider } from "./base.js";

export class PiperTts implements TtsProvider {
  constructor(private config: TtsConfig, private logger: Logger) {}

  async synthesize(text: string): Promise<string> {
    const outputPath = tempPath("piper", ".wav");

    const args = [
      "--model",
      this.config.piper.voicePath,
      "--output_file",
      outputPath,
      "--output_sample_rate",
      String(this.config.piper.outputSampleRate)
    ];

    try {
      await runCommand(this.config.piper.binPath, args, { input: text });
    } catch (err) {
      throw new Error(
        `Piper failed. Check binPath '${this.config.piper.binPath}' and voicePath '${this.config.piper.voicePath}'.`
      );
    }

    const wavBuffer = await fs.readFile(outputPath);
    if (wavBuffer.length < 28) {
      throw new Error("Piper produced an invalid WAV file");
    }
    const sampleRate = wavBuffer.readUInt32LE(24);
    if (sampleRate !== this.config.piper.outputSampleRate) {
      throw new Error(
        `Piper output sample rate ${sampleRate}Hz does not match configured ${this.config.piper.outputSampleRate}Hz.`
      );
    }

    return outputPath;
  }
}
