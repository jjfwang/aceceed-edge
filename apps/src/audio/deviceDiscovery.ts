import type { Logger } from "pino";
import { runCommand } from "../common/utils.js";

interface CardDevice {
  id: string;
  description: string;
  isHdmi: boolean;
  isUsb: boolean;
}

function parseCardDeviceList(output: string): CardDevice[] {
  const matches = Array.from(
    output.matchAll(/card\s+(\d+):\s*([^\n,]+).*?device\s+(\d+)/gim)
  );

  return matches.map((match) => {
    const [, card, desc, device] = match;
    const description = desc.trim();
    const label = description.toLowerCase();
    return {
      id: `plughw:${card},${device}`,
      description,
      isHdmi: label.includes("hdmi"),
      isUsb: label.includes("usb")
    };
  });
}

function pickBestDevice(devices: CardDevice[], opts: { allowHdmi: boolean }): CardDevice | undefined {
  const nonHdmi = devices.filter((d) => opts.allowHdmi || !d.isHdmi);
  const candidates = nonHdmi.length > 0 ? nonHdmi : devices;

  const usbPreferred = candidates.filter((d) => d.isUsb);
  if (usbPreferred.length > 0) {
    return usbPreferred[0];
  }

  return candidates[0];
}

export async function discoverInputDevice(logger: Logger, arecordPath: string): Promise<string> {
  try {
    const { stdout, stderr } = await runCommand(arecordPath, ["-l"]);
    const devices = parseCardDeviceList(stdout || stderr);
    const pick = pickBestDevice(devices, { allowHdmi: false });
    if (pick) {
      logger.info({ device: pick.id, description: pick.description }, "Discovered audio input device");
      return pick.id;
    }
  } catch (err) {
    logger.warn({ err }, "Failed to probe input devices with arecord");
  }

  logger.warn("Falling back to default audio input device");
  return "default";
}

export async function discoverOutputDevice(logger: Logger, aplayPath: string): Promise<string> {
  try {
    const { stdout, stderr } = await runCommand(aplayPath, ["-l"]);
    const devices = parseCardDeviceList(stdout || stderr);
    const pick = pickBestDevice(devices, { allowHdmi: true });
    if (pick) {
      logger.info({ device: pick.id, description: pick.description }, "Discovered audio output device");
      return pick.id;
    }
  } catch (err) {
    logger.warn({ err }, "Failed to probe output devices with aplay");
  }

  logger.warn("Falling back to default audio output device");
  return "default";
}
