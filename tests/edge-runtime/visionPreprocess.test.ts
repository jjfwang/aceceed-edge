import { describe, it, expect } from "vitest";
import { passthrough } from "../../apps/edge-runtime/src/vision/preprocess";

describe("Vision Preprocess", () => {
  it("should return the same image that was passed in", () => {
    const image = Buffer.from("test");
    const result = passthrough(image);
    expect(result).toBe(image);
  });
});
