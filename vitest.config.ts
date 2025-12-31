import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      reporter: ["text", "lcov"],
      lines: 80,
      functions: 80,
      statements: 80,
      branches: 80
    }
  }
});
