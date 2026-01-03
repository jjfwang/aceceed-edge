import pino from "pino";
import type { LoggingConfig } from "@aceceed/shared";

export function createLogger(config: LoggingConfig) {
  return pino({ level: config.level });
}
