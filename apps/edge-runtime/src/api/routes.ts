import type { FastifyInstance } from "fastify";
import type { AppRuntime } from "../runtime/appRuntime.js";
import type { EventBus } from "../runtime/eventBus.js";
import { cameraResponseSchema, pttResponseSchema } from "./schemas.js";

export function registerRoutes(server: FastifyInstance, runtime: AppRuntime, bus: EventBus) {
  server.post(
    "/v1/ptt/start",
    {
      schema: { response: { 200: pttResponseSchema } }
    },
    async () => {
      bus.publish({ type: "ptt:start", source: "api" });
      return { status: "started" };
    }
  );

  server.post(
    "/v1/ptt/stop",
    {
      schema: { response: { 200: pttResponseSchema } }
    },
    async () => {
      bus.publish({ type: "ptt:stop", source: "api" });
      return { status: "stopped" };
    }
  );

  server.post(
    "/v1/camera/capture",
    {
      schema: { response: { 200: cameraResponseSchema } }
    },
    async () => {
      const result = await runtime.captureWithDetectors();
      return {
        paperPresent: result.detectors.paperPresent,
        motionScore: result.detectors.motionScore,
        imageBytes: result.capture.length
      };
    }
  );
}
