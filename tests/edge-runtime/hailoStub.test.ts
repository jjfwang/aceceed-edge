import { describe, it, expect } from "vitest";
import { HailoStubDetector } from "../../apps/edge-runtime/src/vision/detectors/hailoStub";

describe("HailoStubDetector", () => {
    it("should return the expected values", async () => {
        const detector = new HailoStubDetector();
        const result = await detector.detect(Buffer.from("test"));
        expect(result).toEqual({
            paperPresent: false,
            motionScore: 0.0,
        });
    });

    it("should have the correct id", () => {
        const detector = new HailoStubDetector();
        expect(detector.id).toBe("hailo-stub");
    });
});
