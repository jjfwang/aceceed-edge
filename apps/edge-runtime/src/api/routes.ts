import type { FastifyInstance } from "fastify";
import type { AppRuntime } from "../runtime/appRuntime.js";
import type { EventBus } from "../runtime/eventBus.js";
import {
  cameraResponseSchema,
  errorResponseSchema,
  pttStartRequestSchema,
  runtimeServicesResponseSchema,
  pttStartResponseSchema,
  pttStopResponseSchema
} from "./schemas.js";

export function registerRoutes(server: FastifyInstance, runtime: AppRuntime, bus: EventBus) {
  server.post(
    "/v1/ptt/start",
    {
      schema: {
        body: pttStartRequestSchema,
        response: { 200: pttStartResponseSchema, 409: errorResponseSchema, 500: errorResponseSchema }
      }
    },
    async (req, reply) => {
      if (runtime.isPttActive()) {
        return reply.code(409).send({ status: "error", message: "PTT already active" });
      }
      try {
        const requestedAgent = (req.body as { agent?: string } | undefined)?.agent;
        bus.publish({ type: "ptt:start", source: "api" });
        const result = await runtime.handlePttStart("api", requestedAgent);
        return {
          status: "completed",
          transcript: result?.transcript ?? "",
          response: result?.response ?? ""
        };
      } catch (err) {
        return reply
          .code(500)
          .send({ status: "error", message: (err as Error).message ?? "PTT failed" });
      }
    }
  );

  server.post(
    "/v1/ptt/stop",
    {
      schema: { response: { 200: pttStopResponseSchema, 409: errorResponseSchema } }
    },
    async (_req, reply) => {
      if (!runtime.isPttActive()) {
        return reply.code(409).send({ status: "error", message: "No active PTT session" });
      }
      bus.publish({ type: "ptt:stop", source: "api" });
      runtime.handlePttStop();
      return { status: "stopped" };
    }
  );

  server.post(
    "/v1/camera/capture",
    {
      schema: { response: { 200: cameraResponseSchema } }
    },
    async () => {
      const result = await runtime.captureWithDetectors("api");
      const motionScore =
        result.detectors.length > 0
          ? Math.max(...result.detectors.map((detector) => detector.motionScore))
          : 0;
      return {
        paperPresent: result.detectors.some((detector) => detector.paperPresent),
        motionScore,
        imageBytes: result.capture.length,
        detectors: result.detectors
      };
    }
  );

  server.get(
    "/v1/runtime/services",
    {
      schema: { response: { 200: runtimeServicesResponseSchema } }
    },
    async () => {
      return { services: runtime.getServiceStatus() };
    }
  );
}
