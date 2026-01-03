import { describe, it, expect } from "vitest";
import { createLogger } from "../../apps/edge-runtime/src/common/logging";

describe("Logging", () => {
  it("should create a logger with the specified level", () => {
    const logger = createLogger({ level: "debug" });
    expect(logger.level).toBe("debug");
  });

  it("should create a logger with the default level if none is specified", () => {
    const logger = createLogger({ level: "info" });
    expect(logger.level).toBe("info");
  });
});
