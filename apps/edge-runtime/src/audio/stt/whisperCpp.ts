import { promises as fs } from "node:fs";
import type { Logger } from "pino";
import type { SttConfig } from "@aceceed/shared";
import { runCommand, safeUnlink, tempPath } from "../../common/utils.js";
import type { SttProvider } from "./base.js";

export class WhisperCppStt implements SttProvider {
  constructor(private config: SttConfig, private logger: Logger) {}

  async transcribe(audioPath: string): Promise<string> {
    const outPrefix = tempPath("whisper", "");
    const outputTxt = `${outPrefix}.txt`;

    const args = [
      "-m",
      this.config.whispercpp.modelPath,
      "-f",
      audioPath,
      "-otxt",
      "-of",
      outPrefix
    ];

    if (this.config.whispercpp.language) {
      args.push("-l", this.config.whispercpp.language);
    }

    try {
      await runCommand(this.config.whispercpp.binPath, args);
    } catch (err) {
      throw new Error(
        `whisper.cpp failed. Check binPath '${this.config.whispercpp.binPath}' and modelPath '${this.config.whispercpp.modelPath}'.`
      );
    }

    const text = await fs.readFile(outputTxt, "utf-8");
    await safeUnlink(outputTxt);

    const cleaned = text.replace(/\s+/g, " ").trim();
    if (!cleaned) {
      this.logger.warn("Empty transcript from whisper.cpp");
    }
    return cleaned;
  }
}
