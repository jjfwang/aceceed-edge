import type { DetectorResult } from "@aceceed/shared";

export interface VisionDetector {
  id: string;
  detect(image: Buffer): Promise<DetectorResult>;
}
