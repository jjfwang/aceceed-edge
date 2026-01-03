import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import type { VisionConfig } from "../../packages/shared/src/types.js";

vi.mock("../apps/src/common/utils.js", () => {
  const runCommand = vi.fn(async () => ({ stdout: "", stderr: "" }));
  const tempPath = () => "/tmp/camera.jpg";
  const safeUnlink = vi.fn(async () => {});
  return { runCommand, tempPath, safeUnlink };
});

const { VisionCapture } = await import("../apps/src/vision/capture.js");
const { runCommand } = await import("../apps/src/common/utils.js");

const baseConfig: VisionConfig = {
  enabled: true,
  capture: {
    backend: "rpicam-still",
    stillArgs: []
  }
};

describe("VisionCapture", () => {
  const logger = {
    warn: vi.fn()
  };
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // @ts-expect-error restore global
    global.fetch = originalFetch;
  });

  it("throws when vision is disabled", async () => {
    const config = { ...baseConfig, enabled: false };
    const capture = new VisionCapture(config, logger as unknown as Console);

    await expect(capture.captureStill()).rejects.toThrow("Vision is disabled");
  });

  it("throws when camera-service url is missing", async () => {
    const config: VisionConfig = {
      enabled: true,
      capture: {
        backend: "camera-service",
        stillArgs: []
      }
    };
    const capture = new VisionCapture(config, logger as unknown as Console);

    await expect(capture.captureStill()).rejects.toThrow(
      "cameraServiceUrl is required for camera-service backend"
    );
  });

  it("captures via camera-service backend", async () => {
    // @ts-expect-error override global
    global.fetch = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer
    }));

    const config: VisionConfig = {
      enabled: true,
      capture: {
        backend: "camera-service",
        stillArgs: [],
        cameraServiceUrl: "http://127.0.0.1:9000"
      }
    };

    const capture = new VisionCapture(config, logger as unknown as Console);
    const result = await capture.captureStill();

    expect(result.mimeType).toBe("image/jpeg");
    expect(result.image.length).toBe(3);
  });

  it("captures via rpicam-still backend", async () => {
    vi.spyOn(fs, "readFile").mockResolvedValue(Buffer.from([1, 2, 3]));
    const capture = new VisionCapture(baseConfig, logger as unknown as Console);

    const result = await capture.captureStill();

    expect(runCommand).toHaveBeenCalledWith("rpicam-still", [
      "--nopreview",
      "--timeout",
      "100",
      "--output",
      "/tmp/camera.jpg"
    ]);
    expect(result.mimeType).toBe("image/jpeg");
  });
});
