import type { VisionDetector } from "./base.js";

export class HailoStubDetector implements VisionDetector {
  id = "hailo-stub";

  async detect(_image: Buffer) {
    return {
      paperPresent: false,
      motionScore: 0.0
    };
  }
}
