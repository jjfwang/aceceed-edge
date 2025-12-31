export const pttStartResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string", enum: ["completed"] },
    transcript: { type: "string" },
    response: { type: "string" }
  },
  required: ["status", "transcript", "response"]
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
