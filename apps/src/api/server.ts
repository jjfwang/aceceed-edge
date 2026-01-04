import fastify from "fastify";
import websocket from "@fastify/websocket";
import type { AppConfig } from "@aceceed/shared";
import type { EventBus } from "../runtime/eventBus.js";
import type { AppRuntime } from "../runtime/appRuntime.js";
import { registerRoutes } from "./routes.js";
import { registerEventSocket } from "./ws.js";
import { registerUiRoutes } from "./ui.js";

export function createServer(config: AppConfig, runtime: AppRuntime, bus: EventBus) {
  const server = fastify({ logger: false });

  server.register(websocket);

  registerUiRoutes(server, config);
  registerRoutes(server, runtime, bus);
  registerEventSocket(server, bus);

  return server;
}
