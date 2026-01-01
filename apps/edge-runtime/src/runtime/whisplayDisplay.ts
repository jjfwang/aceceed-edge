import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
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
  let client: net.Socket | undefined;

  const spawnDisplay = () => {
    const child = spawn("python3", [scriptPath], {
      stdio: ["pipe", "ignore", "pipe"],
      env: {
        ...process.env,
        PYTHONNOUSERSITE: "1",
        WHISPLAY_SOCKET: "1",
        WHISPLAY_HOST: "127.0.0.1",
        WHISPLAY_PORT: "12345",
        WHISPLAY_SKIP_BUTTON: "1",
        WHISPLAY_BRIGHTNESS: "60"
      }
    });
    child.stderr?.on("data", (data) => {
      const output = data.toString().trim();
      if (output) {
        logger.warn({ output }, "Whisplay display error");
      }
    });
    child.on("exit", () => {
      if (current === child) {
        current = undefined;
      }
    });
    return child;
  };

  const connectClient = () => {
    if (client && !client.destroyed) {
      return client;
    }
    client = new net.Socket();
    client.on("error", (err) => {
      logger.warn({ err }, "Whisplay display socket error");
      client?.destroy();
      client = undefined;
    });
    client.connect(12345, "127.0.0.1");
    return client;
  };

  const render = (status: string | null, text: string) => {
    const sanitized = text.replace(/\s+/g, " ").trim();
    if (!sanitized && !status) {
      return;
    }

    if (!current || current.killed) {
      current = spawnDisplay();
    }

    const socket = connectClient();
    const payload = JSON.stringify({ status: status ?? undefined, text: sanitized });
    socket.write(`${payload}\n`);
  };

  const handler = (event: AppEvent) => {
    if (event.type === "ptt:start") {
      render("Listening...", "");
      return;
    }
    if (event.type === "ptt:stop") {
      render("Processing...", "");
      return;
    }
    if (event.type === "agent:response") {
      render("Responding...", event.text);
      return;
    }
    if (event.type === "error") {
      render("Error", event.message);
    }
  };

  bus.on("event", handler);
  logger.info({ scriptPath }, "Whisplay display enabled.");

  return () => {
    bus.off("event", handler);
    if (current && !current.killed) {
      current.kill("SIGTERM");
    }
    if (client && !client.destroyed) {
      client.destroy();
      client = undefined;
    }
  };
}
