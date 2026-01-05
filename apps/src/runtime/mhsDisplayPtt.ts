import { spawn } from "node:child_process";
import path from "node:path";
import type { AppConfig } from "@aceceed/shared";
import { createLogger } from "../common/logging.js";
import { EventBus } from "./eventBus.js";
import { findPyScript } from "../common/utils.js";

type DisplaySource = "mhs-display" | "whisplay";

export async function startMhsDisplayPtt(
  bus: EventBus,
  config: AppConfig,
  logger: ReturnType<typeof createLogger>,
  source: DisplaySource = "mhs-display"
): Promise<() => void> {
  const script = await findPyScript(
    path.resolve(process.cwd(), "scripts/mhs_display.py"),
    path.resolve(process.cwd(), "../scripts/mhs_display.py")
  );

  if (!script) {
    logger.warn("MHS display script not found, PTT disabled.");
    return () => {};
  }

  const child = spawn("python3", [script], { stdio: ["ignore", "pipe", "pipe"] });

  child.stdout.on("data", (data: Buffer) => {
    const message = data.toString().trim();
    if (message === "PTT_START") {
      bus.publish({ type: "ptt:start", source });
    } else if (message === "PTT_STOP") {
      bus.publish({ type: "ptt:stop", source });
    }
  });

  child.stderr.on("data", (data: Buffer) => {
    logger.warn({ output: data.toString().trim() }, "MHS display script stderr");
  });

  const stop = () => {
    child.kill("SIGINT");
  };

  logger.info({ source }, "Display PTT enabled.");
  return stop;
}
