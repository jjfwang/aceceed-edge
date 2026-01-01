import { z } from "zod";

export const configSchema = z.object({
  llm: z.object({
    mode: z.enum(["local", "cloud"]),
    local: z.object({
      backend: z.enum(["llama.cpp", "llm8850"]).optional(),
      llamaServerUrl: z.string().url(),
      model: z.string().min(1).optional(),
      modelPath: z.string().optional(),
      ctx: z.number().int().positive(),
      temperature: z.number().min(0).max(1),
      llm8850: z
        .object({
          host: z.string().url(),
          temperature: z.number().min(0).max(1).optional(),
          topK: z.number().int().positive().optional(),
          requestTimeoutMs: z.number().int().positive().optional(),
          pollIntervalMs: z.number().int().min(0).optional(),
          maxWaitMs: z.number().int().positive().optional(),
          enableThinking: z.boolean().optional(),
          resetOnRequest: z.boolean().optional()
        })
        .optional()
    }),
    cloud: z.object({
      provider: z.enum(["openai"]),
      apiKeyEnv: z.string().min(1),
      model: z.string().min(1),
      baseUrl: z.string().url().optional(),
      temperature: z.number().min(0).max(1).optional(),
      maxTokens: z.number().int().positive().optional(),
      requestTimeoutMs: z.number().int().positive().optional()
    })
  }),
  stt: z.object({
    mode: z.enum(["local", "cloud"]),
    backend: z.enum(["whispercpp"]),
    whispercpp: z.object({
      binPath: z.string().min(1),
      modelPath: z.string().min(1),
      language: z.string().min(1).optional()
    }),
    cloud: z
      .object({
        provider: z.string().min(1),
        apiKeyEnv: z.string().min(1),
        baseUrl: z.string().url().optional(),
        model: z.string().min(1).optional()
      })
      .optional()
  }),
  tts: z.object({
    mode: z.enum(["local", "cloud"]),
    backend: z.enum(["piper"]),
    piper: z.object({
      binPath: z.string().min(1),
      voicePath: z.string().min(1),
      outputSampleRate: z.number().int().positive()
    }),
    cloud: z
      .object({
        provider: z.string().min(1),
        apiKeyEnv: z.string().min(1),
        baseUrl: z.string().url().optional(),
        voiceId: z.string().min(1).optional()
      })
      .optional()
  }),
  vision: z.object({
    enabled: z.boolean(),
    capture: z.object({
      backend: z.enum(["rpicam-still", "libcamera-still", "camera-service"]),
      stillArgs: z.array(z.string()),
      cameraServiceUrl: z.string().url().optional()
    })
  }),
  audio: z.object({
    input: z.object({
      backend: z.enum(["node-record-lpcm16", "arecord"]),
      device: z.string().min(1),
      sampleRate: z.number().int().positive(),
      channels: z.number().int().positive(),
      recordSeconds: z.number().int().positive(),
      arecordPath: z.string().min(1)
    }),
    output: z.object({
      backend: z.enum(["aplay"]),
      device: z.string().min(1),
      aplayPath: z.string().min(1)
    })
  }),
  runtime: z.object({
    pushToTalkMode: z.enum(["keyboard", "api", "whisplay"]),
    cameraIndicator: z.boolean(),
    micIndicator: z.boolean(),
    agents: z
      .object({
        enabled: z.array(z.string())
      })
      .optional(),
    whisplay: z
      .object({
        buttonPin: z.number().int().positive().optional(),
        bounceMs: z.number().int().positive().optional(),
        mode: z.enum(["hold", "toggle"]).optional()
      })
      .optional()
  }),
  api: z.object({
    host: z.string().min(1),
    port: z.number().int().positive()
  }),
  logging: z.object({
    level: z.enum(["debug", "info", "warn", "error"])
  })
});

export type ConfigSchema = z.infer<typeof configSchema>;
