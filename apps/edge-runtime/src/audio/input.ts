import { once } from "node:events";
import { promises as fs } from "node:fs";
import type { Logger } from "pino";
import type { AudioConfig } from "@aceceed/shared";
import { runCommand, sleep, tempPath } from "../common/utils.js";

interface RecordOptions {
  signal?: AbortSignal;
  durationSec: number;
}

function pcmToWav(pcm: Buffer, sampleRate: number, channels: number): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * channels * 2;
  const blockAlign = channels * 2;

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}

export class AudioInput {
  constructor(private config: AudioConfig, private logger: Logger) {}

  async record({ signal, durationSec }: RecordOptions): Promise<string> {
    if (this.config.input.backend === "node-record-lpcm16") {
      try {
        const recordModule = await import("node-record-lpcm16");
        const recordExport = (recordModule.default ?? recordModule) as
          | ((options: Record<string, unknown>) => { stream: () => NodeJS.ReadableStream; stop: () => void })
          | { record: (options: Record<string, unknown>) => { stream: () => NodeJS.ReadableStream; stop: () => void } };

        const recordFn = typeof recordExport === "function" ? recordExport : recordExport.record;

        const recording = recordFn({
          sampleRate: this.config.input.sampleRate,
          channels: this.config.input.channels,
          device: this.config.input.device,
          recordProgram: "arecord",
          threshold: 0
        });

        const chunks: Buffer[] = [];
        const stream = recording.stream();
        stream.on("data", (data: Buffer) => chunks.push(data));

        const stop = async () => {
          recording.stop();
          await once(stream, "close").catch(() => undefined);
        };

        let aborted = false;
        const abortPromise = new Promise<void>((resolve) => {
          if (!signal) {
            return;
          }
          if (signal.aborted) {
            aborted = true;
            resolve();
            return;
          }
          signal.addEventListener("abort", () => {
            aborted = true;
            void stop();
            resolve();
          });
        });

        await Promise.race([sleep(durationSec * 1000), abortPromise]);
        await stop();

        if (aborted) {
          throw new Error("Recording aborted");
        }

        const pcm = Buffer.concat(chunks);
        const wav = pcmToWav(pcm, this.config.input.sampleRate, this.config.input.channels);
        const outPath = tempPath("aceceed-ptt", ".wav");
        await fs.writeFile(outPath, wav);
        return outPath;
      } catch (err) {
        this.logger.warn({ err }, "node-record-lpcm16 failed, falling back to arecord");
      }
    }

    const outPath = tempPath("aceceed-ptt", ".wav");
    try {
      await runCommand(
        this.config.input.arecordPath,
        [
          "-D",
          this.config.input.device,
          "-f",
          "S16_LE",
          "-r",
          String(this.config.input.sampleRate),
          "-c",
          String(this.config.input.channels),
          "-d",
          String(durationSec),
          "-t",
          "wav",
          outPath
        ],
        { signal }
      );
    } catch (err) {
      throw new Error(`Audio capture failed. Check input device '${this.config.input.device}'.`);
    }

    return outPath;
  }
}
