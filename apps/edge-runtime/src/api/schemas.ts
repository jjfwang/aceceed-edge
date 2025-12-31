export const pttResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" }
  }
};

export const cameraResponseSchema = {
  type: "object",
  properties: {
    paperPresent: { type: "boolean" },
    motionScore: { type: "number" },
    imageBytes: { type: "number" }
  }
};
