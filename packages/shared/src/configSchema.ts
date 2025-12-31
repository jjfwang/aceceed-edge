import { z } from "zod";

export const configSchema = z.object({
  llm: z.object({
    mode: z.enum(["local", "cloud"]),
    local: z.object({
      llamaServerUrl: z.string().url(),
      modelPath: z.string().optional(),
      ctx: z.number().int().positive(),
      temperature: z.number().min(0).max(1)
    }),
    cloud: z.object({
      provider: z.enum(["openai"]),
      apiKeyEnv: z.string().min(1),
      model: z.string().min(1),
      baseUrl: z.string().url().optional()
    })
  }),
  stt: z.object({
    backend: z.enum(["whispercpp"]),
    whispercpp: z.object({
      binPath: z.string().min(1),
      modelPath: z.string().min(1)
    })
  }),
  tts: z.object({
    backend: z.enum(["piper"]),
    piper: z.object({
      binPath: z.string().min(1),
      voicePath: z.string().min(1),
      outputSampleRate: z.number().int().positive()
    })
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
    pushToTalkMode: z.enum(["keyboard", "api"]),
    cameraIndicator: z.boolean(),
    micIndicator: z.boolean(),
    agents: z
      .object({
        enabled: z.array(z.string())
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
