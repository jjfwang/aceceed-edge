import type { Logger } from "pino";
import type { AppConfig, DetectorResult, PttResult } from "@aceceed/shared";
import type { AudioInput } from "../audio/input.js";
import type { AudioOutput } from "../audio/output.js";
import type { SttProvider } from "../audio/stt/base.js";
import type { TtsProvider } from "../audio/tts/base.js";
import type { VisionCapture } from "../vision/capture.js";
import type { VisionDetector } from "../vision/detectors/base.js";
import type { EventBus } from "./eventBus.js";
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
        void this.handlePttStart(event.source);
      }

      if (event.type === "ptt:stop") {
        this.handlePttStop();
      }
    });
  }

  async handlePttStart(source: string): Promise<PttResult | null> {
    if (this.activePtt) {
      this.logger.warn("PTT already active");
      return null;
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
      return null;
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

  async captureWithDetectors(): Promise<{ capture: Buffer; detectors: DetectorResult }>{
    if (this.config.runtime.cameraIndicator) {
      this.logger.info("Camera active");
    }

    const capture = await this.vision.captureStill();
    let result: DetectorResult = { paperPresent: false, motionScore: 0 };

    if (this.detectors.length > 0) {
      result = await this.detectors[0].detect(capture.image);
    }

    return { capture: capture.image, detectors: result };
  }
}
