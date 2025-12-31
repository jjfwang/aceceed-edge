import type { Agent, AgentInput, AgentOutput } from "./base.js";
import type { LlmClient } from "../llm/base.js";

export class TutorAgent implements Agent {
  id = "tutor";
  name = "Tutor";

  constructor(private llm: LlmClient, private systemPrompt: string) {}

  async handle(input: AgentInput): Promise<AgentOutput | null> {
    if (!input.transcript.trim()) {
      return null;
    }

    const response = await this.llm.generate([
      { role: "system", content: this.systemPrompt },
      { role: "user", content: input.transcript }
    ]);

    return { text: response };
  }
}
