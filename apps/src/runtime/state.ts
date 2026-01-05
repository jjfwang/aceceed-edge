import type { DetectorRunResult } from "@aceceed/shared";

export type EventSource = "api" | "keyboard" | "mhs-display" | "whisplay" | "system";

export type AppEvent =
  | { type: "ptt:start"; source: EventSource }
  | { type: "ptt:stop"; source: EventSource }
  | { type: "ptt:transcript"; text: string }
  | { type: "agent:response"; text: string }
  | { type: "tts:spoken"; text: string }
  | { type: "camera:capture"; source: EventSource; detectors: DetectorRunResult[] }
  | { type: "error"; message: string };
