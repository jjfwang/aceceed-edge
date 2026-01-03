export const pttStartResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string", enum: ["completed"] },
    transcript: { type: "string" },
    response: { type: "string" }
  },
  required: ["status", "transcript", "response"]
};

export const pttStartRequestSchema = {
  type: ["object", "null"],
  properties: {
    agent: { type: "string" }
  },
  additionalProperties: false
};

export const pttStopResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string", enum: ["stopped"] }
  },
  required: ["status"]
};

export const errorResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string", enum: ["error"] },
    message: { type: "string" }
  },
  required: ["status", "message"]
};

export const cameraResponseSchema = {
  type: "object",
  properties: {
    paperPresent: { type: "boolean" },
    motionScore: { type: "number" },
    imageBytes: { type: "number" },
    detectors: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          paperPresent: { type: "boolean" },
          motionScore: { type: "number" }
        },
        required: ["id", "paperPresent", "motionScore"]
      }
    }
  },
  required: ["paperPresent", "motionScore", "imageBytes", "detectors"]
};

export const runtimeServicesResponseSchema = {
  type: "object",
  properties: {
    services: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", enum: ["llm", "stt", "tts"] },
          backend: { type: "string" },
          ready: { type: "boolean" },
          details: { type: "string" }
        },
        required: ["id", "backend", "ready"]
      }
    }
  },
  required: ["services"]
};
