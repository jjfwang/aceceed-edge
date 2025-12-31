import { spawn, spawnSync } from "node:child_process";
import type { Logger } from "pino";
import type { AppConfig } from "@aceceed/shared";
import type { EventBus } from "./eventBus.js";

type GpioHandle = {
  watch: (cb: (err: Error | null, value: number) => void) => void;
  unwatchAll: () => void;
  unexport: () => void;
};

type GpioConstructor = new (
  pin: number,
  direction: "in" | "out",
  edge?: "none" | "rising" | "falling" | "both",
  options?: { debounceTimeout?: number; activeLow?: boolean }
) => GpioHandle;

const boardToBcmMap: Record<number, number> = {
  3: 2,
  5: 3,
  7: 4,
  8: 14,
  10: 15,
  11: 17,
  12: 18,
  13: 27,
  15: 22,
  16: 23,
  18: 24,
  19: 10,
  21: 9,
  22: 25,
  23: 11,
  24: 8,
  26: 7,
  29: 5,
  31: 6,
  32: 12,
  33: 13,
  35: 19,
  36: 16,
  37: 26,
  38: 20,
  40: 21
};

function resolveBcmPin(boardPin: number, logger: Logger): number | null {
  const bcmPin = boardToBcmMap[boardPin];
  if (bcmPin !== undefined) {
    return bcmPin;
  }
  logger.warn({ boardPin }, "Unknown BOARD pin. Treating value as BCM pin.");
  return boardPin;
}

function canUseGpiomon(): boolean {
  const result = spawnSync("gpiomon", ["--help"], { stdio: "ignore" });
  if (!result.error) {
    return true;
  }
  return (result.error as NodeJS.ErrnoException).code !== "ENOENT";
}

function parseEdge(line: string): "rising" | "falling" | null {
  const upper = line.toUpperCase();
  if (upper.includes("RISING")) {
    return "rising";
  }
  if (upper.includes("FALLING")) {
    return "falling";
  }
  return null;
}

function startWhisplayPttWithGpiomon(
  bus: EventBus,
  logger: Logger,
  bcmPin: number,
  boardPin: number,
  mode: "hold" | "toggle",
  bounceMs: number
): (() => void) | null {
  if (!canUseGpiomon()) {
    return null;
  }

  const args = ["--rising-edge", "--falling-edge", "--num-events=0", "gpiochip0", String(bcmPin)];
  const child = spawn("gpiomon", args, { stdio: ["ignore", "pipe", "pipe"] });

  let pressed = false;
  let toggled = false;
  let lastEventMs = 0;
  let buffer = "";

  const handleEdge = (edge: "rising" | "falling") => {
    const now = Date.now();
    if (now - lastEventMs < bounceMs) {
      return;
    }
    lastEventMs = now;

    if (mode === "toggle") {
      if (edge === "rising") {
        toggled = !toggled;
        bus.publish({ type: toggled ? "ptt:start" : "ptt:stop", source: "whisplay" });
      }
      return;
    }

    if (edge === "rising" && !pressed) {
      pressed = true;
      bus.publish({ type: "ptt:start", source: "whisplay" });
      return;
    }

    if (edge === "falling" && pressed) {
      pressed = false;
      bus.publish({ type: "ptt:stop", source: "whisplay" });
    }
  };

  child.stdout?.on("data", (data) => {
    buffer += data.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const edge = parseEdge(line);
      if (edge) {
        handleEdge(edge);
      }
    }
  });

  child.stderr?.on("data", (data) => {
    const text = data.toString().trim();
    if (text) {
      logger.warn({ output: text }, "Whisplay PTT gpiomon stderr");
    }
  });

  child.on("error", (err) => {
    logger.warn({ err }, "Whisplay PTT gpiomon failed to start.");
  });

  child.on("exit", (code, signal) => {
    logger.warn({ code, signal }, "Whisplay PTT gpiomon exited.");
  });

  logger.info({ boardPin, bcmPin, mode, bounceMs }, "Whisplay PTT listening via gpiomon.");

  return () => {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  };
}

async function startWhisplayPttWithOnoff(
  bus: EventBus,
  logger: Logger,
  bcmPin: number,
  boardPin: number,
  mode: "hold" | "toggle",
  bounceMs: number
): Promise<(() => void) | null> {
  let Gpio: GpioConstructor | undefined;
  try {
    const onoffModule = (await import("onoff")) as { Gpio?: GpioConstructor };
    Gpio = onoffModule.Gpio;
  } catch (err) {
    logger.warn({ err }, "Whisplay PTT unavailable: failed to load onoff.");
    return null;
  }

  if (!Gpio) {
    logger.warn("Whisplay PTT unavailable: onoff.Gpio not found.");
    return null;
  }

  let pressed = false;
  let toggled = false;

  let gpio: GpioHandle;
  try {
    gpio = new Gpio(bcmPin, "in", "both", { debounceTimeout: bounceMs, activeLow: false });
  } catch (err) {
    logger.warn({ err }, "Whisplay PTT failed to initialize GPIO.");
    return null;
  }

  gpio.watch((err, value) => {
    if (err) {
      logger.warn({ err }, "Whisplay PTT GPIO error.");
      return;
    }

    if (mode === "toggle") {
      if (value === 1) {
        toggled = !toggled;
        bus.publish({ type: toggled ? "ptt:start" : "ptt:stop", source: "whisplay" });
      }
      return;
    }

    if (value === 1 && !pressed) {
      pressed = true;
      bus.publish({ type: "ptt:start", source: "whisplay" });
      return;
    }

    if (value === 0 && pressed) {
      pressed = false;
      bus.publish({ type: "ptt:stop", source: "whisplay" });
    }
  });

  logger.info({ boardPin, bcmPin, mode, bounceMs }, "Whisplay PTT listening via onoff.");

  return () => {
    gpio.unwatchAll();
    gpio.unexport();
  };
}

export async function startWhisplayPtt(
  bus: EventBus,
  config: AppConfig,
  logger: Logger
): Promise<() => void> {
  if (process.platform !== "linux") {
    logger.warn("Whisplay PTT is only supported on Linux.");
    return () => undefined;
  }

  const whisplay = config.runtime.whisplay;
  const boardPin = whisplay?.buttonPin ?? 11;
  const bcmPin = resolveBcmPin(boardPin, logger);
  if (!Number.isInteger(bcmPin) || bcmPin < 0) {
    logger.warn({ boardPin }, "Whisplay PTT disabled: invalid button pin.");
    return () => undefined;
  }

  const bounceMs = whisplay?.bounceMs ?? 50;
  const mode = whisplay?.mode ?? "hold";

  const gpiomonStop = startWhisplayPttWithGpiomon(
    bus,
    logger,
    bcmPin,
    boardPin,
    mode,
    bounceMs
  );
  if (gpiomonStop) {
    return gpiomonStop;
  }

  const onoffStop = await startWhisplayPttWithOnoff(
    bus,
    logger,
    bcmPin,
    boardPin,
    mode,
    bounceMs
  );
  if (onoffStop) {
    return onoffStop;
  }

  logger.warn("Whisplay PTT unavailable: no GPIO backend succeeded.");
  return () => undefined;
}
