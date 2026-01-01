export type LlmMode = "local" | "cloud";
export type LlmProvider = "openai";
export type LlmLocalBackend = "llama.cpp" | "llm8850";

export interface Llm8850Config {
  host: string;
  temperature?: number;
  topK?: number;
  requestTimeoutMs?: number;
  pollIntervalMs?: number;
  maxWaitMs?: number;
  enableThinking?: boolean;
  resetOnRequest?: boolean;
}

export interface LlmLocalConfig {
  backend?: LlmLocalBackend;
  llamaServerUrl: string;
  model?: string;
  modelPath?: string;
  ctx: number;
  temperature: number;
  llm8850?: Llm8850Config;
}

export interface LlmCloudConfig {
  provider: LlmProvider;
  apiKeyEnv: string;
  model: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  requestTimeoutMs?: number;
}

export interface LlmConfig {
  mode: LlmMode;
  local: LlmLocalConfig;
  cloud: LlmCloudConfig;
}

export type SttMode = "local" | "cloud";

export interface SttCloudConfig {
  provider: string;
  apiKeyEnv: string;
  baseUrl?: string;
  model?: string;
}

export interface SttConfig {
  mode: SttMode;
  backend: "whispercpp";
  whispercpp: {
    binPath: string;
    modelPath: string;
    language?: string;
  };
  cloud?: SttCloudConfig;
}

export type TtsMode = "local" | "cloud";

export interface TtsCloudConfig {
  provider: string;
  apiKeyEnv: string;
  baseUrl?: string;
  voiceId?: string;
}

export interface TtsConfig {
  mode: TtsMode;
  backend: "piper";
  piper: {
    binPath: string;
    voicePath: string;
    outputSampleRate: number;
    voicePathZh?: string;
    outputSampleRateZh?: number;
  };
  cloud?: TtsCloudConfig;
}

export interface VisionConfig {
  enabled: boolean;
  capture: {
    backend: "rpicam-still" | "libcamera-still" | "camera-service";
    stillArgs: string[];
    cameraServiceUrl?: string;
  };
}

export interface AudioConfig {
  input: {
    backend: "node-record-lpcm16" | "arecord";
    device: string;
    sampleRate: number;
    channels: number;
    recordSeconds: number;
    arecordPath: string;
  };
  output: {
    backend: "aplay";
    device: string;
    aplayPath: string;
  };
}

export interface RuntimeConfig {
  pushToTalkMode: "keyboard" | "api" | "whisplay";
  cameraIndicator: boolean;
  micIndicator: boolean;
  agents?: {
    enabled: string[];
  };
  whisplay?: {
    buttonPin?: number;
    bounceMs?: number;
    mode?: "hold" | "toggle";
  };
}

export interface ApiConfig {
  host: string;
  port: number;
}

export interface LoggingConfig {
  level: "debug" | "info" | "warn" | "error";
}

export type RuntimeServiceId = "llm" | "stt" | "tts";

export interface RuntimeServiceStatus {
  id: RuntimeServiceId;
  backend: string;
  ready: boolean;
  details?: string;
}

export interface AppConfig {
  llm: LlmConfig;
  stt: SttConfig;
  tts: TtsConfig;
  vision: VisionConfig;
  audio: AudioConfig;
  runtime: RuntimeConfig;
  api: ApiConfig;
  logging: LoggingConfig;
}

export interface CameraCaptureResult {
  image: Buffer;
  mimeType: string;
}

export interface DetectorResult {
  paperPresent: boolean;
  motionScore: number;
}

export interface DetectorRunResult extends DetectorResult {
  id: string;
}

export interface PttResult {
  transcript: string;
  response: string;
}
