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

export async function startWhisplayPtt(
  bus: EventBus,
  config: AppConfig,
  logger: Logger
): Promise<() => void> {
  if (process.platform !== "linux") {
    logger.warn("Whisplay PTT is only supported on Linux.");
    return () => undefined;
  }

  let Gpio: GpioConstructor | undefined;
  try {
    const onoffModule = (await import("onoff")) as { Gpio?: GpioConstructor };
    Gpio = onoffModule.Gpio;
  } catch (err) {
    logger.warn({ err }, "Whisplay PTT unavailable: failed to load onoff.");
    return () => undefined;
  }

  if (!Gpio) {
    logger.warn("Whisplay PTT unavailable: onoff.Gpio not found.");
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

  let pressed = false;
  let toggled = false;

  let gpio: GpioHandle;
  try {
    gpio = new Gpio(bcmPin, "in", "both", { debounceTimeout: bounceMs, activeLow: false });
  } catch (err) {
    logger.warn({ err }, "Whisplay PTT failed to initialize GPIO.");
    return () => undefined;
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

  logger.info(
    { boardPin, bcmPin, mode, bounceMs },
    "Whisplay PTT listening on GPIO."
  );

  return () => {
    gpio.unwatchAll();
    gpio.unexport();
  };
}
