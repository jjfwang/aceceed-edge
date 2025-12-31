import type { VisionDetector } from "./base.js";

export class SimpleActivityDetector implements VisionDetector {
  id = "simple-activity";

  async detect(image: Buffer) {
    const sizeKb = image.length / 1024;
    return {
      paperPresent: sizeKb > 50,
      motionScore: 0.0
    };
  }
}
