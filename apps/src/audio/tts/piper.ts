import { promises as fs } from "node:fs";
import type { Logger } from "pino";
import type { TtsConfig } from "@aceceed/shared";
import { runCommand, tempPath } from "../../common/utils.js";
import type { TtsProvider } from "./base.js";

function detectLanguageTag(text: string): string {
  if (/[\u4E00-\u9FFF]/.test(text)) {
    return "zh";
  }
  if (/[\u3040-\u30FF]/.test(text)) {
    return "ja";
  }
  if (/[\uAC00-\uD7AF]/.test(text)) {
    return "ko";
  }
  return "en";
}

function findVoice(
  voiceByLang: TtsConfig["piper"]["voiceByLang"] | undefined,
  language: string
): { voicePath: string; outputSampleRate?: number } | null {
  if (!voiceByLang) {
    return null;
  }
  const direct = voiceByLang[language];
  if (direct) {
    return direct;
  }
  const base = language.split("-")[0];
  if (base !== language && voiceByLang[base]) {
    return voiceByLang[base];
  }
  return null;
}

export class PiperTts implements TtsProvider {
  constructor(private config: TtsConfig, private logger: Logger) {}

  async synthesize(text: string): Promise<string> {
    const language = detectLanguageTag(text);
    const mappedVoice = findVoice(this.config.piper.voiceByLang, language);
    const useChinese = language === "zh";
    const voicePath = mappedVoice?.voicePath
      ?? (useChinese && this.config.piper.voicePathZh
        ? this.config.piper.voicePathZh
        : this.config.piper.voicePath);
    const outputSampleRate = mappedVoice?.outputSampleRate
      ?? (useChinese && this.config.piper.outputSampleRateZh
        ? this.config.piper.outputSampleRateZh
        : this.config.piper.outputSampleRate);
    if (useChinese && !mappedVoice && !this.config.piper.voicePathZh) {
      this.logger.warn("Chinese text detected but no Chinese Piper voice configured.");
    }
    const outputPath = tempPath("piper", ".wav");

    const args = [
      "--model",
      voicePath,
      "--output_file",
      outputPath,
      "--output_sample_rate",
      String(outputSampleRate)
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
    if (sampleRate !== outputSampleRate) {
      throw new Error(
        `Piper output sample rate ${sampleRate}Hz does not match configured ${outputSampleRate}Hz.`
      );
    }

    return outputPath;
  }
}
