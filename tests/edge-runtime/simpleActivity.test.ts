import { describe, it, expect } from "vitest";
import { SimpleActivityDetector } from "../../apps/edge-runtime/src/vision/detectors/simpleActivity";

describe("SimpleActivityDetector", () => {
    it("should return paperPresent: true if image size is > 50KB", async () => {
        const detector = new SimpleActivityDetector();
        const image = Buffer.alloc(51 * 1024);
        const result = await detector.detect(image);
        expect(result.paperPresent).toBe(true);
    });

    it("should return paperPresent: false if image size is <= 50KB", async () => {
        const detector = new SimpleActivityDetector();
        const image = Buffer.alloc(50 * 1024);
        const result = await detector.detect(image);
        expect(result.paperPresent).toBe(false);
    });

    it("should return motionScore: 0.0", async () => {
        const detector = new SimpleActivityDetector();
        const image = Buffer.alloc(100 * 1024);
        const result = await detector.detect(image);
        expect(result.motionScore).toBe(0.0);
    });

    it("should have the correct id", () => {
        const detector = new SimpleActivityDetector();
        expect(detector.id).toBe("simple-activity");
    });
});
