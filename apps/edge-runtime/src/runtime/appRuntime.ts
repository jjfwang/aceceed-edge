import type { Logger } from "pino";
import type {
  AppConfig,
  DetectorResult,
  DetectorRunResult,
  PttResult,
  RuntimeServiceStatus
} from "@aceceed/shared";
import type { AudioInput } from "../audio/input.js";
import type { AudioOutput } from "../audio/output.js";
import type { SttProvider } from "../audio/stt/base.js";
import type { TtsProvider } from "../audio/tts/base.js";
import type { VisionCapture } from "../vision/capture.js";
import type { VisionDetector } from "../vision/detectors/base.js";
import type { EventBus } from "./eventBus.js";
import type { EventSource } from "./state.js";
import type { AgentRegistry } from "../agents/registry.js";
import { SafetyAgent } from "../agents/safetyAgent.js";
import { safeUnlink } from "../common/utils.js";
import type { AgentInput } from "../agents/base.js";

export class AppRuntime {
  private activePtt = false;
  private pttAbort?: AbortController;
  private safetyAgent = new SafetyAgent();

  constructor(
    private config: AppConfig,
    private logger: Logger,
    private bus: EventBus,
    private audioInput: Pick<AudioInput, "record">,
    private audioOutput: Pick<AudioOutput, "playWav">,
    private stt: SttProvider,
    private tts: TtsProvider,
    private agents: AgentRegistry,
    private vision: Pick<VisionCapture, "captureStill">,
    private detectors: VisionDetector[]
  ) {}

  start(): void {
    this.bus.subscribe((event) => {
      if (event.type === "ptt:start") {
        if (event.source !== "api") {
          void this.handlePttStart(event.source).catch((err) => {
            this.logger.error({ err }, "PTT flow failed");
          });
        }
      }

      if (event.type === "ptt:stop") {
        if (event.source !== "api") {
          this.handlePttStop();
        }
      }
    });
  }

  isPttActive(): boolean {
    return this.activePtt;
  }

  async handlePttStart(source: EventSource): Promise<PttResult | null> {
    if (this.activePtt) {
      const err = new Error("PTT already active");
      this.logger.warn(err.message);
      throw err;
    }

    this.activePtt = true;
    this.pttAbort = new AbortController();

    try {
      if (this.config.runtime.micIndicator) {
        this.logger.info({ source }, "Mic active");
      }

      const audioPath = await this.audioInput.record({
        durationSec: this.config.audio.input.recordSeconds,
        signal: this.pttAbort.signal
      });

      let transcript = "";
      try {
        transcript = await this.stt.transcribe(audioPath);
      } finally {
        await safeUnlink(audioPath);
      }
      this.bus.publish({ type: "ptt:transcript", text: transcript });

      const tutor = this.agents.get("tutor");
      if (!tutor) {
        throw new Error("Tutor agent not enabled");
      }

      const agentInput: AgentInput = { transcript };
      if (!transcript) {
        const fallback = this.safetyAgent.guard("I didn't catch that. Please try again.");
        this.bus.publish({ type: "agent:response", text: fallback });
        const speechPath = await this.tts.synthesize(fallback);
        try {
          await this.audioOutput.playWav(speechPath);
        } finally {
          await safeUnlink(speechPath);
        }
        return { transcript, response: fallback };
      }
      const agentOutput = await tutor.handle(agentInput);
      if (!agentOutput) {
        throw new Error("Tutor agent did not return output");
      }

      const guarded = this.safetyAgent.guard(agentOutput.text);
      this.bus.publish({ type: "agent:response", text: guarded });

      const speechPath = await this.tts.synthesize(guarded);
      try {
        await this.audioOutput.playWav(speechPath);
      } finally {
        await safeUnlink(speechPath);
      }
      this.bus.publish({ type: "tts:spoken", text: guarded });

      return { transcript, response: guarded };
    } catch (err) {
      this.logger.error({ err }, "PTT flow failed");
      this.bus.publish({ type: "error", message: (err as Error).message });
      throw err;
    } finally {
      this.activePtt = false;
      this.pttAbort = undefined;
    }
  }

  handlePttStop(): void {
    if (this.pttAbort) {
      this.pttAbort.abort();
      this.logger.info("PTT stop requested");
    }
  }

  async captureWithDetectors(
    source: EventSource = "system"
  ): Promise<{ capture: Buffer; detectors: DetectorRunResult[] }> {
    if (this.config.runtime.cameraIndicator) {
      this.logger.info("Camera active");
    }

    const capture = await this.vision.captureStill();
    const results: DetectorRunResult[] = [];

    for (const detector of this.detectors) {
      const result: DetectorResult = await detector.detect(capture.image);
      results.push({ id: detector.id, ...result });
    }

    this.bus.publish({
      type: "camera:capture",
      source,
      detectors: results
    });

    return { capture: capture.image, detectors: results };
  }

  getServiceStatus(): RuntimeServiceStatus[] {
    const llmBackend =
      this.config.llm.mode === "cloud"
        ? `cloud:${this.config.llm.cloud.provider}`
        : "local:llama.cpp";
    const llmHasKey =
      this.config.llm.mode === "cloud"
        ? Boolean(process.env[this.config.llm.cloud.apiKeyEnv])
        : true;

    const services: RuntimeServiceStatus[] = [
      {
        id: "llm",
        backend: llmBackend,
        ready: llmHasKey,
        details:
          this.config.llm.mode === "cloud" && !llmHasKey
            ? `Missing API key in env ${this.config.llm.cloud.apiKeyEnv}`
            : undefined
      },
      {
        id: "stt",
        backend: `${this.config.stt.mode}:${this.config.stt.backend}`,
        ready:
          this.config.stt.mode === "cloud"
            ? Boolean(this.config.stt.cloud?.apiKeyEnv && process.env[this.config.stt.cloud.apiKeyEnv])
            : Boolean(this.config.stt.whispercpp.binPath && this.config.stt.whispercpp.modelPath),
        details:
          this.config.stt.mode === "cloud"
            ? !this.config.stt.cloud
              ? "Cloud STT configured without provider details"
              : !this.config.stt.cloud.apiKeyEnv
                ? "Cloud STT apiKeyEnv is not configured"
                : !process.env[this.config.stt.cloud.apiKeyEnv]
                  ? `Missing API key in env ${this.config.stt.cloud.apiKeyEnv}`
                  : undefined
            : this.config.stt.backend === "whispercpp" &&
                (!this.config.stt.whispercpp.binPath || !this.config.stt.whispercpp.modelPath)
              ? "whisper.cpp binary or model path is not configured"
              : undefined
      },
      {
        id: "tts",
        backend: `${this.config.tts.mode}:${this.config.tts.backend}`,
        ready:
          this.config.tts.mode === "cloud"
            ? Boolean(this.config.tts.cloud?.apiKeyEnv && process.env[this.config.tts.cloud.apiKeyEnv])
            : Boolean(this.config.tts.piper.binPath && this.config.tts.piper.voicePath),
        details:
          this.config.tts.mode === "cloud"
            ? !this.config.tts.cloud
              ? "Cloud TTS configured without provider details"
              : !this.config.tts.cloud.apiKeyEnv
                ? "Cloud TTS apiKeyEnv is not configured"
                : !process.env[this.config.tts.cloud.apiKeyEnv]
                  ? `Missing API key in env ${this.config.tts.cloud.apiKeyEnv}`
                  : undefined
            : this.config.tts.backend === "piper" &&
                (!this.config.tts.piper.binPath || !this.config.tts.piper.voicePath)
              ? "Piper binary or voice path is not configured"
              : undefined
      }
    ];

    return services;
  }
}
