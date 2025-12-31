export interface AgentInput {
  transcript: string;
}

export interface AgentOutput {
  text: string;
}

export interface Agent {
  id: string;
  name: string;
  handle(input: AgentInput): Promise<AgentOutput | null>;
}
