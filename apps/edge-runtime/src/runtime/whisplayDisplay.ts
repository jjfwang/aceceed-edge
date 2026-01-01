import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import type { Logger } from "pino";
import type { AppConfig } from "@aceceed/shared";
import type { EventBus } from "./eventBus.js";
import type { AppEvent } from "./state.js";

const scriptCandidates = [
  path.resolve(process.cwd(), "scripts/whisplay_display.py"),
  path.resolve(process.cwd(), "../../scripts/whisplay_display.py")
];

function resolveScriptPath(): string | null {
  for (const candidate of scriptCandidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

export function startWhisplayDisplay(
  bus: EventBus,
  config: AppConfig,
  logger: Logger
): () => void {
  if (process.platform !== "linux") {
    return () => undefined;
  }

  if (config.runtime.pushToTalkMode !== "whisplay") {
    return () => undefined;
  }

  const scriptPath = resolveScriptPath();
  if (!scriptPath) {
    logger.warn("Whisplay display script not found.");
    return () => undefined;
  }

  let current: ReturnType<typeof spawn> | undefined;

  const render = (text: string) => {
    if (!text.trim()) {
      return;
    }

    if (current && !current.killed) {
      current.kill("SIGTERM");
    }

    const child = spawn("python3", [scriptPath], { stdio: ["pipe", "ignore", "pipe"] });
    child.stdin?.write(text);
    child.stdin?.end();
    child.stderr?.on("data", (data) => {
      const output = data.toString().trim();
      if (output) {
        logger.warn({ output }, "Whisplay display error");
      }
    });
    current = child;
  };

  const handler = (event: AppEvent) => {
    if (event.type === "agent:response") {
      render(event.text);
    }
  };

  bus.on("event", handler);
  logger.info({ scriptPath }, "Whisplay display enabled.");

  return () => {
    bus.off("event", handler);
    if (current && !current.killed) {
      current.kill("SIGTERM");
    }
  };
}
