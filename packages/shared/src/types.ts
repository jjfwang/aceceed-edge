export type LlmMode = "local" | "cloud";
export type LlmProvider = "openai";

export interface LlmLocalConfig {
  llamaServerUrl: string;
  modelPath?: string;
  ctx: number;
  temperature: number;
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

export interface SttConfig {
  backend: "whispercpp";
  whispercpp: {
    binPath: string;
    modelPath: string;
  };
}

export interface TtsConfig {
  backend: "piper";
  piper: {
    binPath: string;
    voicePath: string;
    outputSampleRate: number;
  };
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
  pushToTalkMode: "keyboard" | "api";
  cameraIndicator: boolean;
  micIndicator: boolean;
  agents?: {
    enabled: string[];
  };
}

export interface ApiConfig {
  host: string;
  port: number;
}

export interface LoggingConfig {
  level: "debug" | "info" | "warn" | "error";
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
