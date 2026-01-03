import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    pool: "forks",
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
    poolOptions: {
      forks: {
        isolate: false,
        singleFork: true
      }
    },
    coverage: {
      reporter: ["text", "lcov"],
      lines: 80,
      functions: 80,
      statements: 80,
      branches: 80
    }
  }
});
