import { promises as fs } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { configSchema } from "@aceceed/shared";
import type { AppConfig } from "@aceceed/shared";

const defaultConfigCandidates = [
  path.resolve(process.cwd(), "../../configs/default.yaml"),
  path.resolve(process.cwd(), "configs/default.yaml")
];

async function resolveConfigPath(): Promise<string> {
  const explicit = process.env.ACECEED_CONFIG;
  if (explicit) {
    return path.resolve(explicit);
  }

  for (const candidate of defaultConfigCandidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error("Config file not found. Set ACECEED_CONFIG or run from repo root.");
}

function applyEnvOverrides(config: AppConfig): AppConfig {
  const env = process.env;

  if (env.ACECEED_LLM_MODE) {
    config.llm.mode = env.ACECEED_LLM_MODE as AppConfig["llm"]["mode"];
  }

  if (env.ACECEED_LLM_CLOUD_MODEL) {
    config.llm.cloud.model = env.ACECEED_LLM_CLOUD_MODEL;
  }

  if (env.ACECEED_LLM_CLOUD_BASEURL) {
    config.llm.cloud.baseUrl = env.ACECEED_LLM_CLOUD_BASEURL;
  }

  if (env.ACECEED_LLM_CLOUD_TEMPERATURE) {
    const parsed = Number(env.ACECEED_LLM_CLOUD_TEMPERATURE);
    if (!Number.isNaN(parsed)) {
      config.llm.cloud.temperature = parsed;
    }
  }

  if (env.ACECEED_LLM_LOCAL_BACKEND) {
    config.llm.local.backend = env.ACECEED_LLM_LOCAL_BACKEND as AppConfig["llm"]["local"]["backend"];
  }

  if (env.ACECEED_LLAMA_SERVER_URL) {
    config.llm.local.llamaServerUrl = env.ACECEED_LLAMA_SERVER_URL;
  }

  if (env.ACECEED_LLAMA_MODEL_PATH) {
    config.llm.local.modelPath = env.ACECEED_LLAMA_MODEL_PATH;
  }

  if (env.ACECEED_LLM8850_HOST) {
    config.llm.local.llm8850 = {
      ...(config.llm.local.llm8850 ?? { host: env.ACECEED_LLM8850_HOST }),
      host: env.ACECEED_LLM8850_HOST
    };
  }

  if (env.ACECEED_STT_BIN) {
    config.stt.whispercpp.binPath = env.ACECEED_STT_BIN;
  }

  if (env.ACECEED_STT_MODEL) {
    config.stt.whispercpp.modelPath = env.ACECEED_STT_MODEL;
  }

  if (env.ACECEED_STT_LANGUAGE) {
    config.stt.whispercpp.language = env.ACECEED_STT_LANGUAGE;
  }

  if (env.ACECEED_TTS_BIN) {
    config.tts.piper.binPath = env.ACECEED_TTS_BIN;
  }

  if (env.ACECEED_TTS_VOICE) {
    config.tts.piper.voicePath = env.ACECEED_TTS_VOICE;
  }

  if (env.ACECEED_VISION_BACKEND) {
    config.vision.capture.backend =
      env.ACECEED_VISION_BACKEND as AppConfig["vision"]["capture"]["backend"];
  }

  if (env.ACECEED_API_PORT) {
    config.api.port = Number(env.ACECEED_API_PORT);
  }

  if (env.ACECEED_AUDIO_DEVICE) {
    config.audio.input.device = env.ACECEED_AUDIO_DEVICE;
    config.audio.output.device = env.ACECEED_AUDIO_DEVICE;
  }

  if (env.ACECEED_LOG_LEVEL) {
    config.logging.level = env.ACECEED_LOG_LEVEL as AppConfig["logging"]["level"];
  }

  if (env.ACECEED_RAG_INDEX) {
    config.rag.indexPath = env.ACECEED_RAG_INDEX;
  }

  if (env.ACECEED_RAG_GRADE) {
    config.rag.gradeBand = env.ACECEED_RAG_GRADE as AppConfig["rag"]["gradeBand"];
  }

  if (env.ACECEED_RAG_SUBJECTS) {
    config.rag.subjects = env.ACECEED_RAG_SUBJECTS.split(",").map((s) => s.trim()).filter(Boolean);
  }

  return config;
}

export async function loadConfig(): Promise<AppConfig> {
  const configPath = await resolveConfigPath();
  const raw = await fs.readFile(configPath, "utf-8");
  const parsed = YAML.parse(raw) as AppConfig;
  const withEnv = applyEnvOverrides(parsed);
  return configSchema.parse(withEnv);
}
