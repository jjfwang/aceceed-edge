import { promises as fs } from "node:fs";
import type { Logger } from "pino";
import type { CameraCaptureResult, VisionConfig } from "@aceceed/shared";
import { runCommand, safeUnlink, tempPath } from "../common/utils.js";

export class VisionCapture {
  constructor(private config: VisionConfig, private logger: Logger) {}

  async captureStill(): Promise<CameraCaptureResult> {
    if (!this.config.enabled) {
      throw new Error("Vision is disabled");
    }

    if (this.config.capture.backend === "camera-service") {
      if (!this.config.capture.cameraServiceUrl) {
        throw new Error("cameraServiceUrl is required for camera-service backend");
      }
      const url = new URL("/capture", this.config.capture.cameraServiceUrl);
      const response = await fetch(url, { method: "POST" });
      if (!response.ok) {
        throw new Error(`Camera service error: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return {
        image: Buffer.from(arrayBuffer),
        mimeType: "image/jpeg"
      };
    }

    const outputPath = tempPath("camera", ".jpg");
    const baseArgs = ["--nopreview", "--timeout", "100", "--output", outputPath];
    const args = [...baseArgs, ...this.config.capture.stillArgs];

    const command =
      this.config.capture.backend === "rpicam-still" ? "rpicam-still" : "libcamera-still";

    try {
      await runCommand(command, args);
    } catch (err) {
      throw new Error(
        `Camera capture failed. Ensure '${command}' is installed and the camera is enabled.`
      );
    }

    const image = await fs.readFile(outputPath);
    await safeUnlink(outputPath);

    return {
      image,
      mimeType: "image/jpeg"
    };
  }
}
