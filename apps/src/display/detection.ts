import { promises as fs } from "node:fs";
import type { Logger } from "pino";

async function fileContains(path: string, keywords: string[]): Promise<boolean> {
  try {
    const content = await fs.readFile(path, "utf-8");
    return keywords.some((keyword) => content.toLowerCase().includes(keyword.toLowerCase()));
  } catch {
    return false;
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async function readTrimmed(path: string): Promise<string | undefined> {
  try {
    return (await fs.readFile(path, "utf-8")).trim();
  } catch {
    return undefined;
  }
}

export type DisplayBackend = "mhs-display" | "whisplay" | "hdmi" | "unknown";

export async function detectDisplay(
  logger: Logger,
  preferred: "auto" | DisplayBackend = "auto"
): Promise<DisplayBackend> {
  const fb1Name = await readTrimmed("/sys/class/graphics/fb1/name");
  const devTreeCompat = await readTrimmed("/proc/device-tree/compatible");

  const isWhisplay =
    (await exists("/dev/fb1")) &&
    (await fileContains("/sys/class/graphics/fb1/name", ["whisplay", "waveshare", "st7789", "ili9"]));
  const isMhs =
    (await exists("/dev/fb1")) &&
    (await fileContains("/sys/class/graphics/fb1/name", ["mhs", "ili9"])) &&
    !isWhisplay;

  if (preferred === "whisplay" && isWhisplay) {
    logger.info({ fb1Name, devTreeCompat }, "Detected Whisplay/Waveshare-style LCD");
    return "whisplay";
  }

  if (preferred === "mhs-display" && isMhs) {
    logger.info({ fb1Name, devTreeCompat }, "Detected MHS LCD framebuffer (fb1)");
    return "mhs-display";
  }

  if (preferred === "auto") {
    if (isWhisplay) {
      logger.info({ fb1Name, devTreeCompat }, "Detected Whisplay/Waveshare-style LCD");
      return "whisplay";
    }
    if (isMhs) {
      logger.info({ fb1Name, devTreeCompat }, "Detected MHS LCD framebuffer (fb1)");
      return "mhs-display";
    }
  }

  const drmPaths = [
    "/sys/class/drm/card0-HDMI-A-1/status",
    "/sys/class/drm/card1-HDMI-A-1/status",
    "/sys/class/drm/card0-DPI-1/status"
  ];
  for (const drmPath of drmPaths) {
    const status = await readTrimmed(drmPath);
    if (status?.toLowerCase() === "connected") {
      logger.info({ connector: drmPath }, "HDMI/DPI display detected");
      return "hdmi";
    }
  }

  if (process.env.DISPLAY) {
    logger.info({ display: process.env.DISPLAY }, "X/Wayland display detected via DISPLAY");
    return "hdmi";
  }

  logger.warn({ fb1Name, devTreeCompat }, "No display hardware detected; defaulting to headless");
  return "unknown";
}
