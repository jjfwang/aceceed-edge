import { fileURLToPath } from "node:url";
import { readTextFile } from "./common/utils.js";
import { loadConfig } from "./common/config.js";
import { createLogger } from "./common/logging.js";
import { EventBus } from "./runtime/eventBus.js";
import { AudioInput } from "./audio/input.js";
import { AudioOutput } from "./audio/output.js";
import { WhisperCppStt } from "./audio/stt/whisperCpp.js";
import { PiperTts } from "./audio/tts/piper.js";
import { LocalLlamaCppClient } from "./llm/localLlamaCpp.js";
import { OpenAiClient } from "./llm/openaiApi.js";
import { Llm8850Client } from "./llm/llm8850Api.js";
import { TutorAgent } from "./agents/tutorAgent.js";
import { CoachAgent } from "./agents/coachAgent.js";
import { AgentRegistry } from "./agents/registry.js";
import { VisionCapture } from "./vision/capture.js";
import { SimpleActivityDetector } from "./vision/detectors/simpleActivity.js";
import { HailoStubDetector } from "./vision/detectors/hailoStub.js";
import { AppRuntime } from "./runtime/appRuntime.js";
import { startWhisplayPtt } from "./runtime/whisplayPtt.js";
import { startWhisplayDisplay } from "./runtime/whisplayDisplay.js";
import { createServer } from "./api/server.js";

function setupKeyboard(bus: EventBus, logger: ReturnType<typeof createLogger>) {
  if (!process.stdin.isTTY) {
    logger.warn("Keyboard PTT disabled: no TTY attached");
    return;
  }

  let active = false;
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on("data", (data) => {
    const key = data.toString();
    if (key === " ") {
      active = !active;
      bus.publish({ type: active ? "ptt:start" : "ptt:stop", source: "keyboard" });
    }
    if (key === "\u0003") {
      process.exit(0);
    }
  });

  logger.info("Keyboard PTT: press SPACE to start/stop recording");
}

const config = await loadConfig();
const logger = createLogger(config.logging);

const bus = new EventBus();
const audioInput = new AudioInput(config.audio, logger);
const audioOutput = new AudioOutput(config.audio, logger);
const stt = new WhisperCppStt(config.stt, logger);
const tts = new PiperTts(config.tts, logger);

const localBackend = config.llm.local.backend ?? "llama.cpp";
const llm =
  config.llm.mode === "cloud"
    ? new OpenAiClient(config.llm, logger)
    : localBackend === "llm8850"
      ? new Llm8850Client(config.llm, logger)
      : new LocalLlamaCppClient(config.llm, logger);

const promptUrl = new URL("./llm/prompts/systemPrompt.txt", import.meta.url);
const systemPrompt = await readTextFile(fileURLToPath(promptUrl));

const tutorAgent = new TutorAgent(llm, systemPrompt);
const coachAgent = new CoachAgent();
const enabledAgents = config.runtime.agents?.enabled ?? ["tutor"];
const registry = new AgentRegistry([tutorAgent, coachAgent], enabledAgents);

const vision = new VisionCapture(config.vision, logger);
const detectors = [new SimpleActivityDetector(), new HailoStubDetector()];

const runtime = new AppRuntime(
  config,
  logger,
  bus,
  audioInput,
  audioOutput,
  stt,
  tts,
  registry,
  vision,
  detectors
);

runtime.start();

if (config.runtime.pushToTalkMode === "keyboard") {
  setupKeyboard(bus, logger);
}

const server = createServer(config, runtime, bus);

try {
  await server.listen({ host: config.api.host, port: config.api.port });
  logger.info(`API listening on http://${config.api.host}:${config.api.port}`);

  let stopWhisplay: (() => void) | undefined;
  let stopDisplay: (() => void) | undefined;
  if (config.runtime.pushToTalkMode === "whisplay") {
    stopWhisplay = await startWhisplayPtt(bus, config, logger);
    stopDisplay = startWhisplayDisplay(bus, config, logger);
  }

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.info({ signal }, "Shutting down");
    try {
      stopWhisplay?.();
      stopDisplay?.();
      await server.close();
    } catch (err) {
      logger.error({ err }, "Shutdown failed");
    } finally {
      process.exit(0);
    }
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
} catch (err) {
  logger.error({ err }, "Failed to start API server");
  process.exit(1);
}
