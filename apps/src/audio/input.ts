import { promises as fs } from "node:fs";
import type { Logger } from "pino";
import type { AudioConfig } from "@aceceed/shared";
import { runCommand, sleep, tempPath } from "../common/utils.js";
import { discoverInputDevice } from "./deviceDiscovery.js";

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
  private resolvedDevice?: Promise<string>;

  constructor(private config: AudioConfig, private logger: Logger) {}

  private async getDevice(): Promise<string> {
    if (this.config.input.device) {
      return this.config.input.device;
    }

    if (!this.resolvedDevice) {
      this.resolvedDevice = discoverInputDevice(this.logger, this.config.input.arecordPath);
    }

    return this.resolvedDevice;
  }

  async record({ signal, durationSec }: RecordOptions): Promise<string> {
    const backend = this.config.input.backend === "auto" ? "node-record-lpcm16" : this.config.input.backend;
    const device = await this.getDevice();
    const nodeRecorderDisabled = process.env.ACECEED_DISABLE_NODE_RECORD === "1";

    if (backend === "node-record-lpcm16" && !nodeRecorderDisabled) {
      try {
        const recordModule = await import("node-record-lpcm16");
        const recordExport = (recordModule.default ?? recordModule) as
          | ((options: Record<string, unknown>) => { stream: () => NodeJS.ReadableStream; stop: () => void })
          | { record: (options: Record<string, unknown>) => { stream: () => NodeJS.ReadableStream; stop: () => void } };

        const recordFn = typeof recordExport === "function" ? recordExport : recordExport.record;

        const options: Record<string, unknown> = {
          sampleRate: this.config.input.sampleRate,
          channels: this.config.input.channels,
          device,
          recordProgram: "arecord",
          threshold: 0
        };

        const recording = recordFn(options);

        const chunks: Buffer[] = [];
        let streamError: Error | null = null;
        if (typeof (recording as { on?: (event: string, handler: (err: unknown) => void) => void }).on === "function") {
          (recording as { on: (event: string, handler: (err: unknown) => void) => void }).on(
            "error",
            (err: unknown) => {
              streamError = err as Error;
            }
          );
        }
        const stream = recording.stream();
        stream.on("data", (data: Buffer) => chunks.push(data));
        stream.on("error", (err) => {
          streamError = err as Error;
        });

        const waitForStreamEnd = () =>
          new Promise<void>((resolve) => {
            let settled = false;
            const finish = () => {
              if (settled) {
                return;
              }
              settled = true;
              resolve();
            };

            if (typeof stream.once === "function") {
              stream.once("close", finish);
              stream.once("end", finish);
              stream.once("error", finish);
              return;
            }

            if (typeof stream.on === "function") {
              stream.on("close", finish);
              stream.on("end", finish);
              stream.on("error", finish);
              return;
            }

            resolve();
          });

        const stop = async () => {
          const closed = waitForStreamEnd();
          recording.stop();
          await Promise.race([closed, sleep(500)]);
          if (typeof (stream as { destroy?: () => void }).destroy === "function") {
            (stream as { destroy: () => void }).destroy();
          }
          if (streamError) {
            throw streamError;
          }
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

        const pcm = Buffer.concat(chunks);
        if (aborted && pcm.length === 0) {
          throw new Error("Recording aborted");
        }
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
          device,
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
      if (signal?.aborted) {
        try {
          const stat = await fs.stat(outPath);
          if (stat.size > 44) {
            return outPath;
          }
        } catch {
          // Ignore and surface the original error below.
        }
      }
      throw new Error(`Audio capture failed. Check input device '${device}'.`);
    }

    return outPath;
  }
}
