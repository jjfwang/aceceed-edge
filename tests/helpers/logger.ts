import { vi } from "vitest";
import type { Logger } from "pino";

export function createTestLogger(): Logger {
  return {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn()
  } as unknown as Logger;
}
