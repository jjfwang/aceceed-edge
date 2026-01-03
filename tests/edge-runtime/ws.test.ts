import { describe, it, expect, vi, beforeEach } from "vitest";
import { FastifyInstance } from "fastify";
import { EventBus } from "../../apps/edge-runtime/src/runtime/eventBus";
import { registerEventSocket } from "../../apps/edge-runtime/src/api/ws";
import { AppEvent } from "../../apps/edge-runtime/src/runtime/state";

describe("WebSocket API", () => {
  let server: FastifyInstance;
  let bus: EventBus;
  let connection: any;
  let handler: (event: AppEvent) => void;

  beforeEach(() => {
    bus = new EventBus(console as any);
    connection = {
      socket: {
        send: vi.fn(),
        on: vi.fn((event, cb) => {
          if (event === "close") {
            cb();
          }
        }),
      },
    };
    server = {
      get: vi.fn((path, options, callback) => {
        if (callback) {
          callback(connection);
        }
      }),
    } as any;
  });

  it("should register a websocket handler on /v1/events", () => {
    registerEventSocket(server, bus);
    expect(server.get).toHaveBeenCalledWith(
      "/v1/events",
      { websocket: true },
      expect.any(Function)
    );
  });

  it("should subscribe to the event bus on new connection", () => {
    const subscribeSpy = vi.spyOn(bus, "subscribe");
    registerEventSocket(server, bus);
    expect(subscribeSpy).toHaveBeenCalled();
  });

  it("should send event to client when event is published", () => {
    const event: AppEvent = { type: "ptt:start", source: "test" as any };
    vi.spyOn(bus, "subscribe").mockImplementation((cb) => {
      handler = cb;
    });

    registerEventSocket(server, bus);
    handler(event);

    expect(connection.socket.send).toHaveBeenCalledWith(JSON.stringify(event));
  });

  it("should unsubscribe from event bus on connection close", () => {
    const offSpy = vi.spyOn(bus, "off");
    registerEventSocket(server, bus);
    expect(offSpy).toHaveBeenCalledWith("event", expect.any(Function));
  });
});
