import type { GradeBand, RagChunk } from "@aceceed/shared";

export interface AgentInput {
  transcript: string;
  ragChunks?: RagChunk[];
  ocrText?: string | null;
  gradeBand?: GradeBand;
  subjects?: string[];
}

export interface AgentOutput {
  text: string;
}

export interface Agent {
  id: string;
  name: string;
  handle(input: AgentInput): Promise<AgentOutput | null>;
}
