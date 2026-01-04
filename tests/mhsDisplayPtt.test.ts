import { jest } from "@jest/globals";
import { Writable } from "node:stream";
import { AppConfig } from "@aceceed/shared";
import { EventBus } from "../apps/src/runtime/eventBus.js";
import { createLogger } from "../apps/src/common/logging.js";
import { startMhsDisplayPtt } from "../apps/src/runtime/mhsDisplayPtt.js";
import { findPyScript } from "../apps/src/common/utils.js";

// Mock the findPyScript function
jest.mock("../apps/src/common/utils.js", () => ({
  ...jest.requireActual("../apps/src/common/utils.js"),
  findPyScript: jest.fn(),
}));

// Mock the child_process module
jest.mock("node:child_process", () => ({
  ...jest.requireActual("node:child_process"),
  spawn: jest.fn(),
}));

const { spawn } = jest.requireMock("node:child_process");

describe("MHS Display PTT", () => {
  let bus: EventBus;
  let logger: ReturnType<typeof createLogger>;
  let config: AppConfig;
  let stop: () => void;

  beforeEach(() => {
    bus = new EventBus();
    logger = createLogger({ level: "error" }); // Silence logger during tests
    config = {
      runtime: {
        pushToTalkMode: "mhs-display",
      },
    } as AppConfig;
    (findPyScript as jest.Mock).mockResolvedValue("/fake/path/to/mhs_display.py");

    const mockChild = {
      stdout: new Writable({
        write(chunk, encoding, callback) {
          callback();
        },
      }),
      stderr: new Writable({
        write(chunk, encoding, callback) {
          callback();
        },
      }),
      kill: jest.fn(),
    };
    spawn.mockReturnValue(mockChild);
  });

  afterEach(() => {
    stop?.();
    jest.clearAllMocks();
  });

  it("should start and stop the MHS display script", async () => {
    stop = await startMhsDisplayPtt(bus, config, logger);
    expect(spawn).toHaveBeenCalledWith("python3", ["/fake/path/to/mhs_display.py"], expect.any(Object));
    stop();
    expect(spawn().kill).toHaveBeenCalledWith("SIGINT");
  });

  it("should publish ptt:start event on PTT_START message", async () => {
    const publishSpy = jest.spyOn(bus, "publish");
    stop = await startMhsDisplayPtt(bus, config, logger);

    const mockChild = spawn.mock.results[0].value;
    mockChild.stdout.emit("data", "PTT_START");

    expect(publishSpy).toHaveBeenCalledWith({ type: "ptt:start", source: "mhs-display" });
  });

  it("should publish ptt:stop event on PTT_STOP message", async () => {
    const publishSpy = jest.spyOn(bus, "publish");
    stop = await startMhsDisplayPtt(bus, config, logger);

    const mockChild = spawn.mock.results[0].value;
    mockChild.stdout.emit("data", "PTT_STOP");

    expect(publishSpy).toHaveBeenCalledWith({ type: "ptt:stop", source: "mhs-display" });
  });

  it("should do nothing if script is not found", async () => {
    (findPyScript as jest.Mock).mockResolvedValue(undefined);
    stop = await startMhsDisplayPtt(bus, config, logger);
    expect(spawn).not.toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    expect(stop).toEqual(expect.any(Function)); // should return a no-op function
  });
});
