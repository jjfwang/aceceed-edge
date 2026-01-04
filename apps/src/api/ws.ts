import type { FastifyInstance } from "fastify";
import type { EventBus } from "../runtime/eventBus.js";
import type { AppEvent } from "../runtime/state.js";

export function registerEventSocket(server: FastifyInstance, bus: EventBus) {
  server.get("/v1/events", { websocket: true }, (connection) => {
    const handler = (event: AppEvent) => {
      try {
        if (typeof connection.socket.send !== "function") {
          throw new Error("WebSocket send unavailable");
        }
        connection.socket.send(JSON.stringify(event));
      } catch {
        bus.off("event", handler);
      }
    };

    bus.subscribe(handler);

    const cleanup = () => {
      bus.off("event", handler);
    };

    connection.socket.on("close", cleanup);
    connection.socket.on("error", cleanup);
  });
}
