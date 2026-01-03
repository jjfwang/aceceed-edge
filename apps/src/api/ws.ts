import type { FastifyInstance } from "fastify";
import type { EventBus } from "../runtime/eventBus.js";
import type { AppEvent } from "../runtime/state.js";

export function registerEventSocket(server: FastifyInstance, bus: EventBus) {
  server.get("/v1/events", { websocket: true }, (connection) => {
    const handler = (event: AppEvent) => {
      connection.socket.send(JSON.stringify(event));
    };

    bus.subscribe(handler);

    connection.socket.on("close", () => {
      bus.off("event", handler);
    });
  });
}
