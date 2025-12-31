import type { Agent, AgentInput, AgentOutput } from "./base.js";

export class CoachAgent implements Agent {
  id = "coach";
  name = "Coach";

  async handle(_input: AgentInput): Promise<AgentOutput | null> {
    return null;
  }
}
